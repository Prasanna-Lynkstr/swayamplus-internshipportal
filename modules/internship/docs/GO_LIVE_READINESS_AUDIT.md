# Go-Live Readiness Audit — Usability & Scale

Date: 2026-08-18. Scope: what's pending before onboarding real students and
employers, with a specific focus on usability polish and on scalability at
500+ internship listings / 10,000 students. Method: the existing internal
audits (`AUDIT_REPORT.md`, `UX_AUDIT.md`, `V1_RELEASE_SPEC.md`,
`DATABASE_OVERHAUL_AUDIT.md` — all committed at HEAD, `4d22523`, so treated
as current, not stale) plus fresh, hands-on verification against the actual
source for every scalability claim below (grep/read, not assumption) and
against the live VPS demo deployment for the production-config findings.

**Bottom line:** the product surface (roles, EOI onboarding, moderation,
discovery, applications, notes, checklist) is genuinely complete and
already verified end-to-end per the existing docs. What's pending clusters
into three buckets, none of which need a redesign — all are wiring/config
fixes: (1) a couple of real scalability bottlenecks that are fine today but
will not survive 10,000 students, (2) production-config items that are
fine for a demo but actively unsafe for real user data, and (3) a known,
already-catalogued usability punch list.

---

## 1. Scalability — verified against source, target: 500+ listings / 10,000 students

### 1a. Employer-facing candidate endpoints load the entire student table into process memory — the standout finding at this scale

`CandidatesService.findAll` (browse candidates, `GET /candidates`) and
`findRecommendedForInternship` (`GET /internships/:id/recommended-candidates`)
both do:

```js
const rows = await this.studentModel.findAll({
  where: { discoverableToEmployers: true },
  include: [{ model: this.userModel, as: 'user', ... }],
});
```

— no SQL `limit`/`offset`. Every discoverable student (up to all 10,000),
joined with `User`, is pulled into memory, then filtered against
preferences, scored (`scoreStudentMatch`), sorted, and *only then* paginated
in JavaScript. This runs **on every single request**, from every employer,
every time they open a listing's "Recommended candidates" panel or browse
candidates directly.

The code already knows this is a tradeoff — the comment above it reads
*"fine at this codebase's scale... revisit if volume changes"*. That
threshold is exactly what "10,000 students" crosses.

Two compounding costs, not just one:
- **Per-request cost:** fetching + JSON-deserializing + scoring ~10K rows on
  every call is real CPU and memory, repeated per employer per listing.
- **Cross-request cost:** Bun/Node's JS execution is single-threaded — the
  synchronous scoring/sorting loop over 10K objects blocks the event loop
  for its duration, delaying *every other concurrent request* on the
  process, not just the requesting employer's. At 500 employers each
  checking candidates for their own listings, this compounds into a real
  shared-latency problem, not an isolated slow endpoint.

**Fix direction (moderate effort, no redesign):** push the `discoverable`
+ category/mode/employmentType filtering into SQL (this needs either a
join against `StudentPreference` or a denormalized summary column, since
today's in-memory filter exists specifically because there's no direct
association to query through); cap the base scan with a sane upper bound
or an "active in the last N days" pre-filter before scoring; keep the
final score-based sort in-memory only over the already-filtered, already-
capped set.

### 1b. The browse page's relevance sort has the same shape — lower urgency, same fix needed eventually

`InternshipsService.findPublished`'s `sort=relevance` branch (the *default*
sort for any logged-in student with skills or preferences set) loads every
*matching* internship — not capped — before scoring and slicing in memory.
At 500 total listings this is a trivial cost today (500 rows, one scoring
pass), not an active concern. Flagging only because it's the identical
pattern to 1a and will need the identical fix if listing volume grows well
past the 500–1,000 range — worth fixing both at once rather than
revisiting this file twice.

### 1c. Specified infrastructure — caching, rate limiting, background jobs — was never actually installed

The build brief (`frontend/CLAUDE.md`, Non-functional Requirements §B/§C)
calls for Redis-backed caching on hot public reads, `@nestjs/throttler`
globally (Redis-backed, stricter on OTP endpoints), and BullMQ for
background email/notification work. None of these exist — confirmed via
`package.json` (no `redis`, `ioredis`, `bullmq`, `@nestjs/throttler`,
`@nestjs/schedule`) and a repo-wide grep for their usage (zero hits
anywhere in `src/`).

Concretely, at 10,000 students / 500 listings:
- **No caching** — `GET /internships` and `GET /internships/categories`
  (hit on every browse-page load, by every visitor, logged in or not) round-
  trip Postgres every time, despite being the platform's hottest, least-
  personalized reads. A 30–60s cache would remove the bulk of this traffic
  from the DB entirely.
- **No rate limiting anywhere, on any endpoint.** `AuthService`'s DB-backed
  OTP attempt/expiry counters only cap brute-forcing *one identifier's* OTP
  (5 requests / 10 min, 5 verify attempts) — nothing stops a burst across
  many different identifiers, or hammering any other endpoint at all. This
  is both a self-inflicted scale risk (one buggy frontend retry loop or one
  scraper) and a real security gap the moment this is publicly reachable
  with real users.
- **Outbound email runs inline** in the request/response cycle
  (`notifications.service.ts`) — a slow or unreachable SMTP provider blocks
  that HTTP handler rather than failing into a retry queue in the
  background.

None of these three need Redis specifically to start — `@nestjs/throttler`
works with an in-memory store on a single instance (which this still is,
see 1e), and a simple in-process TTL cache covers the read-caching case
without introducing new infrastructure. Redis becomes necessary the moment
there's a second instance; not before.

### 1d. Schema is managed by `sequelize.sync({alter})`, not migrations — an operational cliff at exactly the go-live moment

`sync({ alter: true })` only runs when `NODE_ENV !== 'production'`
(`sequelize.provider.ts`) — confirmed this is *why* schema drift has been
self-healing on every restart throughout this session's VPS work, and why
we still hit a hard failure today (`migrate:internship-uuid` had to be run
by hand before the backend would boot at all — `alter` can add a nullable
column but can't safely force `NOT NULL` onto a populated table).

The moment `NODE_ENV` flips to `production` — which is also required to
stop leaking OTPs (see 2a) — `alter` stops running entirely, permanently.
From that point, **every future model change needs its own hand-written
migration script** (the `migrate:*` scripts already in `package.json` are
exactly this pattern). This isn't a stress-test-scale concern (500
listings/10K rows is trivial for Postgres to `ALTER TABLE` against) — it's
a process risk that lands precisely at the go-live transition, when it's
easiest to forget.

**Before flipping `NODE_ENV=production`:** run every existing `migrate:*`
script once against the real production DB (even ones that seem to have
self-healed via `alter` so far — confirm, don't assume), and seriously
consider adopting a real migration tool (Umzug — already recommended in
`DATABASE_OVERHAUL_AUDIT.md`) so this doesn't depend on someone remembering
to hand-write a script for every future change.

### 1e. Single instance, single process, local disk, pool of 10 — adequate for launch, no headroom

One Bun process (backend), one Next.js process (frontend), `STORAGE_DRIVER=local`
for resumes/verification docs, Postgres pool capped at `DB_POOL_MAX=10`.
This is not a "won't work" finding — 10,000 *registered* students rarely
means 10,000 *concurrent* requests — but there's no fallback and no burst
headroom: a marketing push, an SMS blast, or an admin bulk operation all
funnel through the same one process and the same 10 DB connections.
`DB_POOL_MAX`/`DB_POOL_ACQUIRE_MS` are config-only, cheap to raise ahead of
a known-traffic event. Local file storage is already flagged in
`deploy/README.md` as not surviving a redeploy or a move to a second
instance — worth actually switching to `STORAGE_DRIVER=r2` (already built,
just unconfigured) before real applicants' resumes and verification
documents are what's at stake, not demo data.

---

## 2. Production-config / security — must resolve before real user data, not launch-scale issues

### 2a. OTPs are currently returned in plaintext in the API response

The VPS demo deliberately runs `NODE_ENV=development` (documented tradeoff
in `deploy/README.md`) because no SMTP provider is configured —
`AuthService`'s dev-mode gate puts the OTP directly in the HTTP response
body whenever `NODE_ENV !== 'production'`. Fine for an internal demo;
**disqualifying for real students/employers** — anyone able to see the
network response (devtools, a proxy, a shared network) sees their OTP.
**This alone blocks real-user onboarding** until real SMTP is configured
and `NODE_ENV=production` is set — see 1d for what else that flip requires.

### 2b. 7-day, non-httpOnly, non-Secure JWT cookie, no refresh rotation

`sp_token`: `SameSite=Lax` only, no `httpOnly`, no `Secure`, 7-day expiry,
no refresh-token rotation (`frontend/lib/auth.tsx`, `JWT_EXPIRES_IN=7d`).
Already tracked internally (`AUDIT_REPORT.md`) as a pre-existing gap
outside any single feature's scope — but it's exactly what a pentest flags
immediately: any XSS anywhere in the app becomes a 7-day account
takeover, not a page defacement. Worth fixing before real resumes,
verification documents, and contact details are the thing at risk.

### 2c. No rate limiting (repeated from 1c) is a security gap as much as a scale one — the OTP endpoints specifically need it before real users arrive.

---

## 3. Usability — known punch list (from `UX_AUDIT.md`, current at HEAD)

Not re-litigated here in full — see that doc for complete detail — but
worth surfacing the ordered top 10 as part of this go-live view, since none
of them need a design pass, only wiring:

1. Employer Certificate-of-Incorporation upload is a raw unstyled file
   input — port the already-built styled pattern from student resume
   upload.
2. A posting stuck in `pending_review` has no explanatory copy/actions on
   the employer dashboard.
3. `moderationMode` is never surfaced as its own fact to the employer.
4. Admin's pending-internship queue shows the raw `pending_review` enum
   instead of a friendly label (the map already exists elsewhere).
5. No confirmation on Approve/Reject (employers, internships) or on
   rejecting an applicant — the app already has a `ConfirmToast` pattern
   used elsewhere; just needs reuse.
6. Dead footer Support/Legal links (`/#faq`, `/#contact`, etc.).
7. Nav says "login," destination page says "registration" — same flow,
   inconsistent term.
8. Employer applicant list has no pagination UI despite the endpoint being
   paginated — anything past page 1 is silently hidden.
9. `autoApproveEmployers` has no admin UI toggle despite being a real,
   already-built backend setting.
10. `InternshipCard`'s employer name is an unfocusable `<p>`, not a real
    link — unreachable by keyboard/screen reader.

(The single most severe UX finding — students unable to ever complete
their profile or apply, due to a missing T&C checkbox — was already found
and fixed as part of that same audit pass.)

---

## 4. Recommended punch list before real students/employers, ordered by how blocking each is

1. **Configure real SMTP, then flip `NODE_ENV=production`** — config-only,
   no code change, but nothing else here matters if OTPs are still
   leaking in plaintext (2a). Do the migration-script sweep (1d) as part of
   this same step, since it's the same flip that disables `alter`.
2. **Add `@nestjs/throttler`** globally (in-memory store is fine at one
   instance), with a stricter limit on `/auth/otp/*` — closes 1c/2c
   together, is a contained, well-scoped change.
3. **Fix the candidate-list / recommended-candidates full-table-scan
   pattern** (1a) before it's carrying 10,000 real students — this is the
   one item that gets *harder* to fix later, since it compounds with real
   usage instead of staying static like a config flag.
4. **httpOnly + Secure JWT cookie, refresh-token rotation** (2b) — before
   real resumes/verification docs/contact info are what an XSS could
   expose.
5. **Decide file storage** — switch to `STORAGE_DRIVER=r2` (1e) before real
   applicant documents accumulate somewhere that doesn't survive a
   redeploy.
6. **Ship the UX top-10** (§3) — all wiring, no design work, and several
   (pagination gaps, missing confirmations) get worse, not better, with
   real usage volume.
7. **Add hot-read caching** for `/internships` browse + `/internships/categories`
   (1c) — not blocking at 500 listings, but cheap, and removes the bulk of
   read traffic from Postgres before it's actually needed.
8. **Relevance-sort in-memory pattern** (1b) — not urgent at 500 listings;
   revisit alongside item 3 if/when listing volume grows well past that.
