# Task: Build the SWAYAM Plus Internship Platform — MVP

## Objective
Build a standalone, production-ready MVP internship platform:
- Students register, build a profile, discover internships, and apply
- Employers register, get admin-verified, and post internships
- Admin governs the platform: approves employers, monitors activity

This is a standalone build for now (no existing SWAYAM Plus codebase to
integrate with), but it must be visually indistinguishable from
https://swayamplus.education.gov.in/, and its auth layer must be built as a
contained, swappable piece — sign-on for the whole SWAYAM Plus portal will
be unified later (likely a shared SSO across all modules), so don't
architect this module's auth as if it's permanent.

## Stack (fixed — do not substitute)
- Backend: Bun + NestJS 11 + Sequelize 7 + PostgreSQL
- Frontend: Next.js 16 (App Router) + React 19 + Tailwind CSS 4

## Roles
Exactly three. Do not add an Institution/University role, a matching-score
engine, credit-bearing-internship workflows, or anything from a later-phase
ecosystem roadmap — those belong to a broader, separate initiative and are
explicitly out of scope for this MVP.
- **Student** — discovers and applies to internships
- **Employer** — posts internships, reviews applicants (verified by admin first)
- **Admin** — approves/rejects employers, monitors the platform

---

---

## Non-functional requirements — read before writing any code
This platform will go through VAPT (vulnerability assessment / penetration
testing) before launch and needs to hold up under high concurrent load. The
standards below apply to every step in this document, not just one module —
treat them as gating requirements, not nice-to-haves.

### A. No hardcoding — configuration discipline
- Every environment-specific value (DB credentials, JWT secret, OTP
  expiry/throttle limits, pagination page size, CORS allowlist, file-upload
  size limits, base URLs) comes from environment variables, never a literal
  in source. Validate them at boot with a schema (`@nestjs/config` +
  `Joi.object({...})` or a class-validator `EnvironmentVariables` class) so
  the app fails fast on startup with a clear error if something required is
  missing — don't let a missing var surface as a runtime 500 later.
- No magic numbers scattered through services (OTP length, expiry minutes,
  max attempts, throttle windows, JWT TTL) — pull them from a single typed
  config object injected via `ConfigService`, with sane defaults documented
  in `.env.example`.
- The internship **category taxonomy** from Step 4a should NOT be a
  hardcoded array in source. Seed it as a `categories` table (id, label,
  icon key, active boolean, sortOrder) via a migration, expose
  `GET /categories` (public, cacheable), and give admin a way to add/
  deactivate categories later without a code deploy. Same principle for any
  other "fixed list" a real admin might reasonably need to change (industry
  tags, skill taxonomy if it grows) — DB-backed and admin-editable beats a
  hardcoded enum, even if the seed data starts identical.
- Frontend: no hardcoded API base URL — `NEXT_PUBLIC_API_URL` only — and no
  hardcoded copy that should come from config/taxonomy (e.g. don't hardcode
  category chip labels in a component when they should be fetched from
  `/categories`).

### B. Scalability
- **Stateless backend.** No in-memory session or OTP storage — a second
  backend instance behind a load balancer must work correctly. Store OTPs
  and rate-limit counters in Postgres or Redis, not process memory.
- **Redis** for: OTP throttle counters, rate limiting (see Security below),
  and a cache for hot public reads — published-internship listings,
  `/employers/registration-status`, `/categories`. Cache with a short TTL
  (e.g. 30–60s) and invalidate on writes (publish/close an internship,
  toggle registration) rather than relying on TTL alone for correctness-
  sensitive data like the registration toggle.
- **Pagination everywhere.** No endpoint returns an unbounded array —
  `GET /internships`, `/internships/mine`, `/internships/:id/applications`,
  `/admin/employers/pending`, `/applications/me` all take `page`/`pageSize`
  (with an enforced max page size) and return `{ items, total, page,
  pageSize }`. This is as much a DoS-prevention measure as a UX one.
- **DB indexing.** Add explicit indexes on every foreign key, on
  `internships.status` + `internships.category` + `internships.mode`
  (composite, since browse filtering hits all three), on
  `internship_applications.status`, and on `otp_codes.identifier`. Confirm
  with `EXPLAIN ANALYZE` on the browse query once seed data exists at
  realistic volume (seed a few thousand rows for this check, not just 5).
- **Connection pooling.** Configure Sequelize's pool (`max`, `min`, `idle`,
  `acquire`) explicitly via env vars sized to the deployment target, not
  left at library defaults — undersized pools are a common concurrency
  bottleneck under load.
- **File storage.** Resumes and employer verification documents go to
  object storage (S3-compatible — MinIO locally, real S3/equivalent in
  deployment) via a signed-upload or signed-URL flow, never local disk —
  local disk breaks horizontal scaling the moment there's a second instance.
- **Background work off the request path.** OTP "sending" and email
  notifications (Step 5) go through a queue (BullMQ + Redis) rather than
  running inline in the HTTP handler, so a slow downstream provider never
  blocks the request thread. This also gives retry-with-backoff for free.
- **Health checks.** Expose `GET /health` (DB reachable, Redis reachable)
  for the load balancer / orchestrator, and implement graceful shutdown
  (drain in-flight requests, close DB/Redis connections) on SIGTERM.
- **Frontend caching.** Use Next.js's built-in caching/ISR for genuinely
  public, slow-changing data (the categories list, the landing page); don't
  cache anything reflecting a specific user's state (dashboards,
  applications).
- **Load-testing target.** Before calling this done, run a load test (k6 or
  Artillery) against `/internships` browse and `/auth/otp/*` at a
  concurrency the deployment is actually expected to see — if that number
  isn't specified yet, default to a 5,000-concurrent-user / ~50 req/s
  sustained profile as a baseline and report actual p50/p95/p99 latency and
  error rate, rather than asserting "it scales" without a number attached.

### C. Security — VAPT readiness (OWASP-aligned)
- **AuthN/AuthZ.** JWT access tokens should be short-lived (e.g. 15–30 min)
  with a refresh-token rotation flow, not one long-lived token. Store the
  access token in memory and the refresh token in an **httpOnly, Secure,
  SameSite=strict cookie** — not `localStorage` — since `localStorage` is
  readable by any injected script and is a standard XSS-to-account-takeover
  path a pentest will flag. This is a change from the token-in-localStorage
  pattern used in earlier scaffolding for this project; update it.
- **Ownership checks stay on every mutating endpoint AND every single-object
  read endpoint** — a pentest will specifically probe for IDOR (e.g. can
  student A fetch/withdraw student B's application by guessing an ID; can
  employer A see employer B's applicant list). Every `findOne`-by-id path
  needs the same ownership check as the write paths, not just writes.
- **Input validation on every endpoint**, not just the obvious ones — every
  DTO uses `class-validator` decorators, with `whitelist: true` and
  `forbidNonWhitelisted: true` on the global `ValidationPipe`, so unexpected
  fields are rejected outright, not silently ignored or persisted.
- **Rate limiting globally**, not just on OTP — apply `@nestjs/throttler`
  (Redis-backed store so it works across multiple instances) at a sane
  default for all endpoints, with a stricter override on `/auth/otp/request`
  and `/auth/otp/verify` — this is the highest-value brute-force target on
  the whole app, since a 6-digit OTP is only as safe as its attempt-and-
  request throttling.
- **File upload hardening** (resume, verification document): enforce a
  server-side MIME-type allowlist (not just checking the file extension), a
  max file size, and store with a randomized filename — never trust or
  reuse the client-supplied filename. Serve uploaded files via signed,
  time-limited URLs rather than a public static path.
- **Injection.** Sequelize's parameterized queries cover SQL injection by
  default as long as no raw string-concatenated queries are written; if a
  raw query is ever unavoidable, use bind parameters, never string
  interpolation. Sanitize/escape any user-supplied text that could later be
  rendered as HTML (internship descriptions, cover notes) — React's default
  escaping covers this as long as `dangerouslySetInnerHTML` is never used on
  user content.
- **Security headers.** Apply `helmet()` on the NestJS app (CSP,
  X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
  Strict-Transport-Security once served over HTTPS).
- **CORS.** Explicit origin allowlist from an env var, never `*`, especially
  once cookies are involved (required for `credentials: true` requests).
- **Secrets.** JWT signing secret, DB credentials, Redis credentials, and
  any future email/SMS provider keys come from environment variables / a
  secrets manager, never committed to the repo — `.env` stays gitignored,
  only `.env.example` (with placeholder values) is committed.
- **Least-privilege DB user.** The application's Postgres role should have
  only the grants it needs (no superuser); migrations run with a separate,
  more-privileged role in CI/deploy rather than the runtime role.
- **Audit logging.** Log auth events (OTP requests/verifies, admin logins)
  and all admin actions (employer/category approve-reject, registration
  toggle) with actor, action, target, and timestamp — but never log OTP
  codes, tokens, or full document contents. Structure logs (JSON) so
  they're queryable in whatever log aggregation the deployment uses.
- **Dependency scanning.** Run `npm audit`/equivalent (or Snyk/Dependabot)
  in CI and fail the build on high/critical findings — "used a component
  with a known vulnerability" is a standard OWASP/VAPT finding.
- **No verbose error leakage.** No stack traces or internal error details
  in API responses in production — use a global exception filter that
  returns a generic message plus an internal error ID, and logs the detail
  server-side only. This is an easy first finding for a pentester if missed.

### D. Architecture & design principles
- Keep the controller → service → Sequelize-model layering strict —
  controllers stay thin (auth/validation/delegation only), business logic
  and ownership checks live in services, so both are independently
  testable.
- DTOs for both input *and* output — never return a raw Sequelize model
  instance from a controller (it can leak `passwordHash`, internal ids, or
  fields you didn't mean to expose). Use a response DTO/serializer per
  entity.
- A global exception filter for a consistent error response shape across
  the whole API (`{ statusCode, message, errorId }`), instead of each
  controller inventing its own error format.
- API versioning from day one — prefix routes with `/api/v1` — since this
  is expected to scale and evolve, retrofitting versioning later is
  painful.
- Auto-generate an OpenAPI/Swagger doc from the existing decorators
  (`@nestjs/swagger`) — useful both for the eventual VAPT team (they'll want
  an endpoint inventory) and for frontend/backend contract clarity.
- Twelve-factor discipline generally: config in the environment (Section A),
  stateless processes (Section B), dev/prod parity (same build artifact
  promoted through environments, not rebuilt per-environment).

### E. Testing & CI gates
- Unit tests for every service's business logic (ownership checks, OTP
  validation, registration-toggle enforcement) and integration tests for
  controllers hitting a real (test) Postgres instance — don't rely on
  manual click-through verification alone for something headed into VAPT.
- A CI pipeline that runs on every PR: lint, unit + integration tests,
  `npm audit`, and a build — merge is blocked on any of these failing.
- Add an OWASP ZAP baseline scan (or equivalent) against a running instance
  as part of pre-release checks, in addition to whatever formal VAPT the
  security team runs separately — catch the easy findings before they do.

---

## Step 0 — Design system (do this before writing any UI)
A screenshot of the live homepage has been reviewed. Use this as the
starting token set, then fetch https://swayamplus.education.gov.in/ and its
`_next/static/css/*.css` bundles yourself to confirm exact values and fill
in anything not visible in the screenshot (exact font name/webfont file,
hover states, spacing scale, mobile breakpoints). Don't ship guessed values
where the real CSS is checkable.

Observed tokens — encode as CSS variables in `frontend/app/globals.css` plus
a Tailwind theme extension:
- `--sp-orange` `#F0791E` — top announcement bar, primary CTA buttons (`rounded-full`)
- `--sp-green` `#1F6E3E` — nav bar background (pill-shaped container, dark green, white/light-green text)
- `--sp-blue` `#2451D6` — "SWAYAM Plus" wordmark and link accents
- `--sp-navy` `#141A2E` — headline text, near-black but not pure black
- `--sp-gray` `#4B5563` — body copy
- Hero background: soft diagonal gradient, cream/white at top-left fading to peach at bottom
- Feature cards: 4-up grid, `rounded-2xl`, distinct pastel fill per card (pale yellow / peach / lavender / mint), bold icon + heading + small gray subtext
- Nav bar: single pill (`rounded-full`, dark green) containing nav links, a pill search input (darker green, magnifying icon), language toggle "EN" (pill), dark-mode toggle (circle, moon icon), profile avatar (circle, colored initial)
- Header row above nav: MoE emblem + "MINISTRY OF EDUCATION" wordmark (left), "SWAYAM Plus" logo with orange superscript "+" (center), IIT Madras seal (right), white background
- Buttons: fully rounded (`rounded-full`), bold label, orange fill + white text primary / white-outline secondary, trailing arrow icon on primary CTAs
- Trust/stat badge: white pill, icon + bold number + label, sits above the H1
- Typeface reads as rounded/geometric sans, not a system font — confirm the actual `@font-face`/Google Font name from the CSS; don't substitute a guess (e.g. Poppins/Nunito) without confirming

Also check https://swayamplus.education.gov.in/login and
https://swayamplus.education.gov.in/catalog for form-input styling and any
card/badge patterns reusable for internship listings. Reuse the real
header/nav/footer structure verbatim (logo lockup, pill nav, "Made in
Bharat" footer badge) so this reads as part of the same portal, adapting
only page content (internships instead of courses). For assets you can't
pull (official logo files, exact webfont), leave a clearly marked
placeholder (`/* TODO: replace with official MoE logo asset */`) rather than
fabricating one.

---

## Step 1 — Auth: OTP-based (temporary, contained)
Students and employers authenticate via OTP, not passwords — this whole
module's sign-on will likely be replaced by a unified SWAYAM Plus SSO later,
so keep it isolated behind a clean service interface
(`AuthService.requestOtp` / `AuthService.verifyOtp`) so swapping it out is a
contained change, not a rewrite.

```
POST /auth/otp/request   { identifier: string (email), role: 'student' | 'employer' }
  - generates a 6-digit numeric OTP
  - stores a hash of it against (identifier, role) with a 10-minute expiry
  - no real email provider for MVP: log the OTP to the server console, and
    also return it in the response ONLY when NODE_ENV !== 'production' —
    mark this clearly as a dev stub to replace with a real sender (SES/SMTP/
    etc.) before any shared or production environment
  - basic throttle: reject with 429 if more than 5 requests for the same
    identifier within 10 minutes

POST /auth/otp/verify    { identifier, otp, role }
  - correct + unexpired + unconsumed OTP -> mark consumed, then:
    - if no User exists for (identifier, role), create one, plus an empty
      Student or Employer profile row as appropriate
    - issue a JWT: { sub: userId, identifier, role }
  - wrong OTP, expired OTP, or already-consumed OTP -> 401
  - cap verify attempts per OTP (e.g. 5) to blunt brute-forcing a 6-digit code
```

**Admin is the one exception** — no self-serve OTP or registration. Seed a
single admin account with email + password via a script
(`scripts/seed-admin.ts`), same pattern as a normal credential login, since
admins are provisioned out-of-band, not self-registered.

---

## Step 2 — Data model (Sequelize)
```
users               identifier (email), role: student|employer|admin,
                     passwordHash (admin only, nullable otherwise), isActive

otp_codes           identifier, role, codeHash, expiresAt, consumedAt, attempts

students            userId, fullName, phone, collegeName, course,
                     graduationYear, city, skills[] (jsonb), resumeUrl,
                     linkedinUrl

employers            userId, organizationName, cin, gst, website, logoUrl,
                     hqCity, industryTags[] (jsonb),
                     verificationDocumentUrl,
                     verificationStatus: pending|approved|rejected|suspended

platform_settings    singleton row (id=1): employerRegistrationOpen (bool,
                     default true), autoApproveEmployers (bool, default false)

internships          employerId, title, description, skillTags[] (jsonb),
                     category (string, validated against a fixed taxonomy —
                     see Step 4a — e.g. "Software Development", "Digital
                     Marketing"; drives the browse-page category chips),
                     mode: remote|onsite|hybrid, location, durationWeeks,
                     stipendMin, stipendMax (both 0/null = unpaid — derive a
                     `paid` boolean from this, don't store it separately),
                     workingDays (int, default 5), scheduleType:
                     flexible|fixed, responsibilities[] (jsonb string array),
                     perks[] (jsonb string array), eligibility[] (jsonb
                     string array — e.g. "Undergraduate", "Postgraduate",
                     "Engineering Students"), openings, applicationDeadline,
                     status: draft|published|closed|archived

internship_applications  internshipId, studentId, coverNote,
                     status: applied|shortlisted|interviewing|offered|rejected|withdrawn
```
Ownership rules to enforce in the service layer on every mutating endpoint:
a student can only see/withdraw their own applications; an employer can only
edit its own listings and view applicants to its own listings.

---

## Step 3 — API surface
```
POST   /auth/otp/request
POST   /auth/otp/verify

GET    /employers/registration-status          (public — drives the frontend toggle state)
POST   /employers/register                      (blocked with 403 if registration is closed)
GET    /employers/me
PATCH  /employers/me
POST   /employers/me/verification-document       (file upload; store, save URL on the employer record)

GET    /admin/settings
PATCH  /admin/settings                           (toggle employerRegistrationOpen / autoApproveEmployers)
GET    /admin/employers/pending
PATCH  /admin/employers/:id/verify               (approved | rejected | suspended)

GET    /students/me
PATCH  /students/me

POST   /internships                              (employer, verified only)
GET    /internships                              (public browse — filters: location, category, mode, q)
GET    /internships/mine                         (employer)
GET    /internships/:id
PATCH  /internships/:id
PATCH  /internships/:id/publish
PATCH  /internships/:id/close

POST   /internships/:id/apply                    (student)
GET    /applications/me                          (student)
PATCH  /applications/:id/withdraw                (student)
GET    /internships/:id/applications              (employer, own listing only)
PATCH  /applications/:id/status                  (employer)
```

---

## Step 4 — Frontend pages (Next.js App Router)
```
/                              landing — mirror the real site's hero / stat-counter / how-it-works pattern, adapted to internships
/internships                   browse/search — see Step 4a for the detailed layout
/internships/[id]              detail + apply — see Step 4a for the detailed layout
/register/student              OTP request -> "enter the code we sent" -> profile form (resume, skills, LinkedIn, college)
/register/employer             OTP request -> verify -> org profile form + verification-document upload; show a "registration closed" state (matching site copy tone) when /employers/registration-status is false
/employer/dashboard            employer's listings, publish/close actions, applicant counts
/employer/post                 post a specific internship — form now includes category (dropdown from the fixed taxonomy), workingDays, scheduleType, responsibilities[], perks[], and eligibility[] alongside the original fields
/admin/employers               registration toggle + pending verification queue (approve/reject with reason)
```
Registration/login is OTP everywhere except the admin login (separate,
non-public route with email+password). No password fields for student or
employer flows. Match the real site's header/nav/footer, container widths,
and button/card visual language on every page, not just the landing page.

## Step 4a — Browse and detail page, reference layout
Reference screenshots of a comparable internship marketplace (Unstop) were
reviewed for information architecture — reproduce the *structure*, not the
visual style: everything below still uses SWAYAM Plus tokens from Step 0
(orange/green pills, pastel cards, rounded-full buttons), not Unstop's blue.

**`/internships` (browse):**
- H1 with a live count, e.g. "{N}+ Internships on SWAYAM Plus" — pull N from
  the published-listing count, don't hardcode it — with a one-line subtitle
  ("Paid, remote & campus internships for students and freshers").
- A horizontally-scrollable row of category chips (icon + label, soft
  pastel-tint rounded box, cycling through the 4 card colors from Step 0),
  built from the fixed category taxonomy below. Clicking a chip filters the
  list by that category; one chip is active (white bg, like the nav's Home
  pill) at a time.
- A filter bar: `Filters` (with an active-count badge), `Type` (full-time/
  part-time), `Location`, `Category`, `Sort By` — each a pill-shaped
  dropdown trigger consistent with the site's button language.
- Listing cards, each showing: title (bold), employer name, a meta row with
  small icons (experience-required, full/part-time, work mode), a line of
  skill-tag chips, a row of pill tags (category + eligibility, e.g.
  "Software Development", "Undergraduate", "Postgraduate", with a "+N more"
  overflow chip), and a footer row with posted date + "N days left" on the
  left and share/save icons on the right — plus a stipend badge (mint-green
  pill, e.g. "₹10K/month") or an "Unpaid" label if `paid` is false.
- Skip: a "Featured/promoted listings" sidebar and any referral/growth
  banners — those are ad-like patterns from a private-sector aggregator and
  don't belong on a government portal MVP.

**`/internships/[id]` (detail):**
- Header card: work-mode tag (e.g. "🏠 Work from Home"), title, employer
  name, an openings count, category/skill tag pills, and icon actions
  (bookmark/save, add-to-calendar, share).
- A sticky sidebar card with: a "N Days Left" ribbon (orange accent) when a
  deadline is set, a short encouraging line, the primary CTA button ("Apply
  Now", SWAYAM orange pill, full width), and an applied-count line (e.g.
  "24 applied") pulled from the real application count for that listing —
  don't fabricate this number.
- Below the header, a single **Details** section (this MVP does not need
  Unstop's separate Compensation/Reviews/FAQ tabs — see "explicitly
  deferred" below) containing:
  - **Eligibility** — render the `eligibility[]` tags
  - **Responsibilities** — render `responsibilities[]` as a bullet list
  - **Additional Information** — a small card grid, one card each for:
    Internship Duration (durationWeeks, displayed in months where it divides
    cleanly, e.g. "2 months"), Internship Type (Paid/Unpaid, from the
    derived `paid` boolean, showing the stipend range if paid), Work Detail
    (workingDays + scheduleType, e.g. "5 Days" / "Flexible Work Hours"),
    Type/Timing (mode + full/part time), and Perks (render `perks[]`).
- The apply form (cover note + submit) sits at the bottom of the Details
  section, same as before.

**Explicitly deferred (do not build for this MVP):** a Compensation tab,
Reviews/ratings with a "write a review" flow, an FAQs & Discussions tab with
question submission, and a "raise a complaint / report an issue" flow.
These require moderation and review-abuse handling that's out of scope for
4 weeks. Structure the detail page as a simple single-column layout so a
tabbed version can be added later without a rewrite.

**Category taxonomy** (seed as a backend constant, used for both the chip
row and the `category` field's validation — extend the list if needed, but
keep it a closed set rather than free text, since it drives the filter UI):
Data Analysis, Data Science, Software Development, Web Development,
Digital Marketing, UI/UX Design, HR, Content Writing, Sales & Business
Development, Finance & Accounting, Operations, Other.

---

## Step 5 — Notifications
Email only for MVP: notify a student when their application status changes,
notify an employer when their verification is approved/rejected. Stub the
actual send the same way as OTP — log to console, clearly marked
`// TODO: replace with real email provider` — unless a real provider is
wired via env vars.

---

## Step 6 — Verify
0. Before functional verification: confirm the Non-functional requirements
   section is actually satisfied, not just described — env-var validation
   fails fast on a missing var, pagination is enforced on every list
   endpoint, rate limiting is active on `/auth/otp/*`, `helmet()` and an
   explicit CORS allowlist are wired in, and the JWT/refresh-token flow uses
   an httpOnly cookie rather than `localStorage`.
1. `bun install` in both `backend/` and `frontend/`; resolve any peer-dependency friction from these recent majors (NestJS 11 / Sequelize 7 / Next 16 / React 19) rather than silently downgrading.
2. Boot Postgres, run the backend, confirm `GET /api/employers/registration-status` responds.
3. Run the OTP flow end-to-end for a student and for an employer — confirm the dev-mode OTP is visible (console or response) and that verify issues a working JWT.
4. Seed the admin account and log in with email+password.
5. Full flow: student registers (OTP) → completes profile → employer registers (OTP) → uploads verification document → admin approves → employer posts + publishes an internship → student browses/filters and applies → employer reviews the applicant and updates status → student sees the status change (and, if wired, a notification log entry).
6. Toggle employer registration off as admin, confirm `/register/employer` reflects the closed state.
7. Screenshot the landing page next to the real swayamplus.education.gov.in landing page and confirm the visual match (colors, type, spacing, header/nav/footer) before calling this done.
8. Run the load test and OWASP ZAP baseline scan called for in the
   Non-functional requirements section and capture the results (latency
   percentiles, error rate, scan findings) as artifacts — not just a verbal
   "it works."

## Deliverable
Working `backend/` and `frontend/` projects, a top-level `README.md` with
run instructions and role summary, an OpenAPI/Swagger doc for the API, a
short "stubbed for later" note covering: real OTP delivery provider, real
email provider, and the intended swap-in point for unified SWAYAM Plus SSO —
and the load-test / ZAP-scan results from Step 6 as a starting point for the
formal VAPT engagement, so this isn't security-reviewed for the first time
by an external team with no prior signal.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
