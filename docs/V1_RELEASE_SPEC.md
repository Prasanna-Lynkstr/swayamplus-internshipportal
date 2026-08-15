# Internship Platform — Detailed Spec for First Release (v1)

Status: **grounded in the actual codebase as of 2026-08-14** (commit `91eb806`).
This document takes the "Internship Platform — Product Spec (v1 Discussion
Draft)" shared for the feature/flow-freeze discussion and, section by
section, states what's actually built, what's genuinely missing, and a
recommended resolution for every open question (OQ). It supersedes that
draft as the working reference for what "first release" means — the
discussion draft stays the record of intent; this is the record of state.

Related docs: `docs/AUDIT_REPORT.md` (the drift audit + refactor that built
most of what's described as "Built" below), `docs/REQUIREMENTS_SPEC.md`
(gap-analysis of the original standalone MVP, still accurate for what
predates this spec), `docs/SWAYAM_PLUS_INTEGRATION_SPEC.md` (the *separate*
question of how this module gets embedded into SwayamPlus core — out of
scope for "first release" as a standalone platform, see §0 below).

**Status legend:** ✅ Built & verified · 🔧 Partially built (gap noted) ·
⛔ Not built — pending decision or implementation.

---

## 0. Scope of "first release"

This spec describes v1 as a **standalone platform** (its own auth, its own
employer identity) — same framing as the current codebase and the original
MVP. The SwayamPlus-embedding questions (SSO, shared partner schema,
skills-taxonomy linkage) are real but belong to
`docs/SWAYAM_PLUS_INTEGRATION_SPEC.md`'s timeline, not this release. Where an
OQ below is actually an integration-boundary question (OQ-1, OQ-6, OQ-10,
OQ-13, OQ-14), this doc says so explicitly and defers to that spec rather
than inventing a standalone-only answer that would be thrown away later.

---

## 1. Overview — status: ✅ architecturally in place

Employer-as-Partner-category and EOI→approval is built exactly as described:
single EOI submission → one-step admin approve/reject → automatic
profile/company-page availability on approval. See §4.

## 2. User Roles — status: ✅ built, single-login employer confirmed

`User` (1) —(1) `Employer`/`Student` — one login per employer, schema doesn't
prevent adding multi-user employer accounts later (it's a straightforward
join-table addition, not a rearchitecture) but nothing built toward it now,
consistent with §11's "multi-user employer logins" being explicitly deferred.

## 3. Student Journey

### 3.1 Day-1 Register Interest — ✅ built

- `POST /interest-registrations` — **public, unauthenticated** (deliberately
  the only unauthenticated write in the API).
- Fields: `fullName`, `email`, `phone?`, `areaOfInterest?`, `notes?`.
- `GET /admin/interest-registrations` — admin-only, paginated/filterable read.
- No workflow/status attached (by design — it's a demand signal, not a
  pipeline). Wired into the logged-out landing page.
- **Gap vs. discussion draft:** the draft frames this as capturing "type,
  location, mode" preferences specifically. Built fields are looser
  (`areaOfInterest` free text + `notes` free text) rather than structured
  type/location/mode selectors. **Recommendation:** keep as free text for v1 —
  this is a pre-account signal from an anonymous visitor, structuring it adds
  form friction for a "lightweight" feature with no stated consumer (nothing
  reads these fields to drive matching yet). Revisit only if the admin
  reviewing this data specifically asks for structured filtering.

### 3.2 Internship Profile Fields

| Field | Status | Notes |
|---|---|---|
| Resume/CV upload (PDF, max 5MB) | 🔧 | `POST /students/me/resume` exists via `StorageService`; **file-type/size enforcement not confirmed in this pass** — verify `MAX_UPLOAD_SIZE_MB` (env, currently `10`, not `5`) is actually applied to this endpoint and that non-PDF uploads are rejected. Bring `MAX_UPLOAD_SIZE_MB` in line with the spec's 5MB or confirm 10MB is the intended override. |
| First name, last name | ⛔ | Model has a single `fullName: string`. **Recommendation:** keep single `fullName` for v1 — splitting is a pure UI/display concern with no functional dependency anywhere in the spec (no field consumes first/last separately); only revisit if a downstream system (e.g. certificates, formal comms) needs the split. |
| Email, mobile (OTP verification) | 🔧 | Email OTP is fully built (`RequestOtpDto`/`VerifyOtpDto`, both `@IsEmail`). **Mobile/phone OTP does not exist** — `Student.phone` is a free-text, unverified field today. This is a real gap against §3.4/OQ-11 if mobile verification is meant to gate anything. |
| Gender (optional) | ⛔ | Not on `Student` model. Straightforward additive column. |
| Location (current city) | ✅ | `Student.city`. |
| Institution/college name | ✅ | `Student.collegeName`. |
| Course/degree and year of study | ✅ | `Student.course`, `Student.graduationYear`. |
| Skills (multi-select/tags) | ✅ (tags only) | `Student.skills: string[]`, free-form tags today — no taxonomy source wired in. See OQ-13/14. |
| Prior internship/work experience (optional) | ⛔ | Not modeled anywhere. |
| Differently-abled (optional) | ⛔ | Not modeled. |
| Terms & Conditions acceptance | ⛔ | No acceptance flag/timestamp field anywhere in `User`/`Student`. **Flagging as higher priority than the other ⛔ rows** — a government-platform launch typically wants this recorded (with timestamp) for compliance, not just a client-side checkbox with nothing persisted. |

### 3.3 Internship Preferences — ✅ built as `student_preferences`

`StudentPreference` (1:1 with `Student`), `GET`/`PATCH /students/me/preferences`:
`preferredCategories[]`, `preferredLocations[]`, `preferredModes[]`
(remote/onsite/hybrid, multi-select), `preferredEmploymentTypes[]`
(full-time/part-time), `paidPreference` (paid/unpaid/either),
`rolesOfInterest[]` (free text), `availability` (free text, deliberately not
a strict date range). Row is created empty alongside the student profile —
a profile is usable with zero preferences set. Matches the draft's §3.3
field list exactly.

### 3.4 Verification — 🔧 email only, see OQ-10/OQ-11 below

---

## 4. Employer Journey — ✅ built (EOI refactor complete)

### 4.1 Onboarding Category

Standalone-platform equivalent exists (`Employer` linked 1:1 to a `User`);
the actual "new category under existing Partners, other-category-partners
can also flag as employer" framing only makes sense once this runs inside
SwayamPlus's real partner schema — **this is OQ-6, an integration-boundary
question, not something to build a fake version of in the standalone app.**

### 4.2 EOI & Approval — ✅ built exactly as specced

`RegisterEmployerDto`: `organizationName`, `reasonForEoi`, `cin?`,
`headcount?`, `linkedinBusinessPage?`, `internshipTypesExpected?[]` (closed
category taxonomy), `website?`, `hqCity?`, `industryTags?[]`. Certificate of
Incorporation uploads via the same submission flow (`certificateOfIncorporationUrl`
on the model). Single admin decision: `verificationStatus` is
`pending | approved | rejected` — the old 4th value (`suspended`) was
deliberately dropped since the spec describes EOI-approval as the *only*
gate, no further due-diligence step. If a genuine need to suspend an already-
approved employer shows up post-launch, that's a new, explicit decision to
re-add — not a silent carryover.

### 4.3 Employer Profile / Company Page — ✅ profile; 🔧 company page

Profile auto-creates on approval (`autoApproveEmployers` toggle also exists
for the "skip the human gate entirely" case). **"Company page lists all
internship postings from that employer" — no dedicated public-facing company
page route exists.** Today, an internship's employer is visible on the
internship detail page, but there's no `/employers/:id` page aggregating all
of one employer's listings. **This is a real gap for first release** if the
company-page concept is meant to be a distinct, linkable page (not just
inline employer info per listing).

---

## 5. Internship Posting

### 5.1 Fields

| Field group | Status | Notes |
|---|---|---|
| Title, employer (auto-linked), location, mode, type (FT/PT) | ✅ | `title`, `employerId` (auto from auth), `location`, `mode` (remote/onsite/hybrid), `employmentType` (full-time/part-time). |
| Duration, working days/hours | ✅ | `durationWeeks`, `workingDays`, `scheduleType` (flexible/fixed). |
| Stipend | ✅ | `stipendMin`/`stipendMax` — "paid" is derived from these being set, not a separate flag (matches the original MVP's judgment call, carried forward). |
| Number of openings | ✅ | `openings`. |
| Apply-by date | 🔧 | `applicationDeadline` exists and (per §5.3) should be checked at apply-time. **Auto-close on deadline is not built** — no scheduler/cron infrastructure exists in this codebase at all (confirmed: zero `@nestjs/schedule` or cron usage). Today closure is manual only (`PATCH /internships/:id/close`). See §5.3 gap below. |
| Education level (UG/PG/other) | ⛔ | Not modeled. `eligibility` is a free-text string array today. |
| Stream (Engineering/Management/Arts.../Law/Medical) | ⛔ | Not modeled as a structured field — would live in `eligibility` as free text at best. |
| Fresher / experience required | ⛔ | Not modeled. |
| Description, responsibilities, requirements/skills | ✅ | `description`, `responsibilities[]`, `skillTags[]` (doubles as "requirements/skills"). |

**Gap worth flagging as a real decision, not just a TODO:** the three
eligibility sub-fields (education level, stream, fresher/experience) are
currently flattened into one free-text `eligibility[]` array carried over
from the original MVP. The discussion draft calls these out as distinct,
structured fields — likely because they're meant to drive **hard filters**
on the student side (§6.1 says hard filters are "from stated preferences,"
but eligibility is posting-side criteria a student should presumably also be
filterable/matchable against). **Recommendation:** structure these three as
real columns (`educationLevel: enum`, `stream: enum`, `experienceRequired:
boolean`) before first release if they're meant to feed discovery filtering;
if they're purely informational display text, free-text `eligibility` is
fine as-is and this becomes a non-issue. This should be resolved in the
freeze discussion, not assumed either way.

### 5.2 AI-Generated Applicant Checklist — ✅ built

`Internship.checklistItems: string[]` (LLM-generated from the description,
employer-editable before publish), `POST /internships/checklist/generate`.
Config-driven provider swap (`CHECKLIST_PROVIDER=heuristic|anthropic`,
`heuristic` needs no external dependency and is the safe default; `anthropic`
falls back to heuristic on any failure). Student self-rates each item at
apply time, snapshotted on `InternshipApplication.checklistResponses` (not
re-derived later, so edits to the posting's checklist after a student applied
don't retroactively change what they answered). **OQ-9 (does this feed
automated scoring) is genuinely open — see below; today it's read-only
display to the employer, no scoring logic exists.**

### 5.3 Closure & Expiry — 🔧 partial

Manual close (`PATCH /internships/:id/close`) and `openings` are both built.
**Automatic closure on `applicationDeadline`, and "employer can extend the
deadline," are not built** — there's no scheduled job to flip `status` at
deadline, and no dedicated "extend deadline" endpoint (an employer could
presumably `PATCH` the deadline field directly via the general update
endpoint, but that's not the same as a purpose-built extend action with its
own audit trail). **This needs one of:** (a) a lightweight scheduler
(`@nestjs/schedule`, one cron job checking overdue `published` rows), or (b)
enforce the deadline only at apply-time (reject new applications past
deadline, leave `status` as `published` until someone looks at it) and treat
"auto-close" as a nice-to-have deferred past v1. **Recommend (b) for first
release** — it's a one-line guard in `ApplicationsService.apply()`, avoids
introducing new job infrastructure this codebase doesn't have yet, and the
DB-overhaul audit already flagged "no queue, no scheduler" as pre-existing
missing infrastructure, not something to bolt on under this feature.

### 5.4 Moderation — ⛔ not built

Zero code exists for this (confirmed by repo-wide grep for "moderat"* —
no hits). `PlatformSetting` is a **global singleton**
(`employerRegistrationOpen`, `autoApproveEmployers`,
`emailNotificationsEnabled`) — there is no per-employer moderation flag, and
no review-queue concept for postings (an internship goes `draft → published`
directly via `PATCH /internships/:id/publish`, with no gate in between).
**This is a genuine build item for first release**, not a refinement of
something partial:
- Add `Employer.moderationMode: 'auto_publish' | 'review'` (default
  `auto_publish`, per OQ-17's already-resolved default).
- When `review`, `PATCH /internships/:id/publish` should move the posting to
  a pending-review state instead of `published` directly, and add an
  admin-facing approve/reject action (mirrors the existing employer-EOI
  approval pattern — same shape, new resource).
- Surface the per-employer toggle on the admin employer-detail view.

---

## 6. Discovery & Application (Student Side)

### 6.1 Search & Quick-Match Logic — 🔧 hard filters done; soft ranking missing

Hard filters (location, category, mode, employmentType) and quick-filter
chips: ✅ built, confirmed in `internships.service.ts` and the frontend
`FilterBar`. **Soft ranking (skill-overlap count, then recency) is not
built** — `sort` today is one explicit, mutually-exclusive criterion
(`newest | stipend_high | deadline_soon`), not a blended relevance score.
This is real, in-scope work for first release (rule-based, no external
vendor involved) — recommend adding a `relevance` sort option, computed as
(count of `Student.skills ∩ Internship.skillTags`, tie-broken by
`createdAt DESC`), used as the **default** sort whenever a student is
authenticated and has skills set; the three existing explicit sorts remain
available as user-chosen overrides.

### 6.2 Apply Flow — ✅ built

`POST /internships/:id/apply` (`coverNote` + `checklistResponses`),
`GET /internships/:id/my-application`, `GET /applications/me` (paginated),
`PATCH /applications/:id/withdraw`. No cap on multiple applications
(confirmed — no per-student application-count limit anywhere in
`ApplicationsService`). Matches the draft as-is.

---

## 7. Employer — Application Management — ✅ mostly built

`GET /internships/:id/applications` (paginated, filterable),
`PATCH /applications/:id/status` (`applied | shortlisted | interviewing |
offered | rejected | withdrawn` — six values, a superset of the draft's
"shortlist/reject/on-hold," effectively resolving OQ-15 already: `interviewing`
covers the "interview scheduled" case the OQ asked about; there is no distinct
`on-hold` value today — **recommend confirming `interviewing` +
`shortlisted` cover the intended granularity, or add `on_hold` explicitly if
"paused, not yet interviewing" is a status employers actually need to set
apart from those two.**

`POST`/`GET /applications/:id/notes` — multi-entry, timestamped,
ownership-checked (employer-own-listing or admin only), append-only (no
edit/delete, by design — a review history should stay a history). Matches
the draft exactly. **AI scoring against checklist (OQ-9) does not exist** —
`checklistResponses` are stored and displayed, never scored/ranked.

---

## 8. Trust & Safety — ✅ matches draft (no in-platform tooling, by design)

No reporting/flagging endpoint exists — matches the draft's explicit v1
non-goal. No fee-disclaimer messaging surfaced yet in the frontend copy;
this is a copy/content addition (posting-form + internship-detail-page static
text), not a backend change — cheap to add before launch, doesn't need a
technical decision.

---

## 9. Notifications — 🔧 partial

Built: application-status-change email, employer-verification-decision
(EOI approve/reject) email — both gated by `SMTP_HOST` config **and** the
`platform_settings.emailNotificationsEnabled` toggle, console-log stub in
dev. **Not built:** weekly digest (OQ-8), posting-expiry notice, and the
full trigger×recipient×channel matrix (OQ-16) — WhatsApp channel doesn't
exist at all (email-only today). **Recommendation for first release:** ship
with the two existing email triggers only; treat the digest and full matrix
as explicitly deferred-but-tracked (not silently dropped) — they depend on
OQ-8's answer (common vs. personalized) which is itself gated on whether
§6.1's ranking/preferences work is far enough along to personalize against.

---

## 10. Admin & Reporting — 🔧 partial

Existing admin dashboard (`AdminService` stats + the 6 frontend screens) is
confirmed appropriately thin per the earlier audit — settings, pending-
employer queue, listings/students/requests lists, basic counts. **A real
reporting/analytics dashboard (applications-per-internship, employer-activity,
funnel metrics) does not exist beyond basic counts** — this is explicitly
"confirmed required" in the draft (§10) with KPIs still TBD. Needs its own
scoping pass (which KPIs, what date-range/export needs) before it's
buildable — flagging as a first-release requirement that isn't scoped enough
yet to size.

---

## 11. Explicitly Out of Scope (v1) — unchanged, confirmed clean

Re-verified via the earlier audit's repo-wide grep sweep: **zero** wired-in
code for any of these. Carrying the list forward as-is:
- Platform-mediated stipend/payment disbursal
- In-platform reporting/flagging tool
- Employer reviews/ratings by students
- True ML-based recommendation/matching engine
- Multi-user employer logins

---

## 12. Consolidated Open Questions — recommended resolutions

| # | Recommendation for the freeze discussion |
|---|---|
| OQ-1 | **Integration-boundary question, not a first-release one.** Standalone v1 keeps its own email-OTP registration (already built); this gets replaced wholesale per `SWAYAM_PLUS_INTEGRATION_SPEC.md` §4 when embedded. Don't build a second parallel registration path now. |
| OQ-2 | No eligibility/experience gate on *creating* a profile exists or is proposed — recommend none for v1 (any student can create a profile); eligibility only gates specific *postings* (§5.1). |
| OQ-3 | Already resolved (per draft) and built exactly as specced — see §4.2. |
| OQ-6 | Integration-boundary question (needs SwayamPlus's actual partner schema, not visible yet) — see `SWAYAM_PLUS_INTEGRATION_SPEC.md` §6. Not blocking for standalone v1. |
| OQ-7 | Recommend **defer past v1**, consistent with §11's existing deferral — no moderation/verification design exists for this and it's explicitly out of scope already. |
| OQ-8 | Recommend **common (non-personalized) digest for v1** — personalization depends on the §6.1 ranking work landing first; a common digest is a one-query email job, buildable independently and immediately. Marketing/recently-onboarded-employer content: recommend a small fixed section at the bottom, admin-curated, not auto-generated. |
| OQ-9 | Recommend **manual-read-only for v1** — no scoring logic exists, and scoring "against a checklist" needs a defined weighting scheme that isn't specified anywhere in the draft. Ship the checklist as employer-facing display only; revisit scoring once there's real usage data on how employers actually read it. |
| OQ-10 | Integration-boundary question — standalone v1 has its own email-OTP (mobile OTP not yet built at all, see §3.2 gap). Needs SwayamPlus's actual verification mechanism to answer for real; don't guess at a "reuse" now. |
| OQ-11 | Recommend **mandatory for v1** (consistent with the fact that OTP-gated registration is already how the built flow works — there's no code path to create a profile without verifying first). No "verified badge" UI exists; recommend skipping the badge (verification is a gate, not a signal, when it's universally required). |
| OQ-12 | Recommend **file-type + size only for v1** (already the intended scope of `StorageService`) — content-quality validation (blank/image-only PDF detection) needs a third-party check and isn't cheap to add; treat as a fast-follow, not launch-blocking. |
| OQ-13 / OQ-14 | Integration-boundary questions — standalone v1's `Student.skills` stays free-text tags (already built). Do not build a fake taxonomy integration now; this is real work that depends entirely on My Skills Plus's actual API, which isn't accessible yet per the integration spec's blocking item list. |
| OQ-15 | Partially answered by what's already built — six statuses exist, a superset of shortlist/reject. Recommend confirming whether `interviewing` alone covers "interview scheduled" or a distinct `on_hold` is still wanted (see §7). |
| OQ-16 | Recommend scoping to the two already-built triggers for v1 launch (application-status-change, EOI-decision) and treating the full matrix + WhatsApp channel as a fast-follow — building "the full matrix" isn't sizeable until OQ-8's digest decision and the digest cadence are both settled. |
| OQ-17 | Already resolved (per draft) — auto-publish default. **Not yet built** (§5.4) — this is the one still-open item from the "resolved" list that needs actual implementation before launch. |

---

## 13. Definition of Done — first release punch list

Ordered roughly by what blocks what, not by effort:

1. **Per-employer moderation gate** (§5.4) — genuinely unbuilt, not a refinement. Needed before any employer that isn't fully trusted goes live.
2. **Soft ranking / relevance sort** (§6.1) — in-scope, rule-based, no vendor dependency; blocks the "quick-match" framing of the discovery page from being true.
3. **Terms & Conditions acceptance flag** (§3.2) — compliance-shaped, cheap, should not ship without it on a government platform.
4. **Deadline enforcement decision** (§5.3) — pick apply-time-only enforcement (recommended) vs. building scheduler infra; either way, *some* enforcement should exist before launch (today, nothing stops an application after the stated deadline).
5. **Company page route** (§4.3) — if "company page" is meant to be a real linkable surface rather than inline employer info per listing.
6. **Eligibility structuring decision** (§5.1) — resolve whether education-level/stream/experience need to be real filterable columns or stay free text; this changes both the posting form and (if filterable) the discovery hard-filter set.
7. **Resume validation confirmation** (§3.2) — confirm 5MB/PDF-only is actually enforced, not just documented as intended.
8. Everything else in this doc marked ⛔/🔧 that isn't in the six items above is recommended as an explicit, tracked deferral (OQ-7, OQ-9 scoring, OQ-12 content validation, mobile OTP, gender/differently-abled/experience fields, full notification matrix, reporting dashboard) — not launch-blocking, but should be named in the freeze discussion as "deferred," not silently dropped.

---

## 14. Build Plan — 3 Phases (decisions locked 2026-08-14)

Four scope-changing decisions were resolved for this build plan:

- **Deadline enforcement:** apply-time guard only — reject new applications once `applicationDeadline` has passed. No scheduler/cron infra introduced.
- **Eligibility fields:** structured as real columns (`educationLevel`, `stream`, `experienceRequired`), not left as free text — these feed discovery hard-filters in Phase 3, not just display.
- **Moderation:** explicit admin approve/reject per posting when an employer is in `review` mode, mirroring the existing EOI-approval pattern (same shape, new resource, full audit trail).
- **Company page:** open/published postings only, not full history.

### Phase 0 — Admin-configurable taxonomies (precedes Phase 1)

Audit (2026-08-14) found 10 hardcoded enum-like fields, duplicated across
backend models/DTOs and frontend types/option-lists (`INTERNSHIP_CATEGORIES`
alone is manually kept in sync between `backend/src/common/constants/categories.ts`
and `frontend/lib/categories.ts`). These split into two kinds:

- **Content taxonomies** — `Internship.category`, `mode`, `employmentType`,
  `scheduleType`, `StudentPreference.paidPreference`. No code branches on
  specific values; safe and useful to make admin-managed.
- **Workflow state machines** — `User.role`, `Employer.verificationStatus`,
  `Internship.status`, `InternshipApplication.status`, internship sort keys.
  Code branches on the exact string for each (guards, visibility rules, SQL
  order clauses) — **decision: leave these hardcoded.** Admin already
  controls them correctly via existing transition actions (approve/reject,
  publish/close, status-update); a free-text config UI over a state machine
  would let an admin add a value with no corresponding code path.

**Scope (decided):** the 5 content taxonomies only.

| Item | Work |
|---|---|
| `taxonomy_values` table | `listKey`, `value`, `label`, `sortOrder`, `isActive` (soft-retire, never hard-delete — existing rows may reference a retired value). Backfill from today's hardcoded lists. |
| Column type change | `Internship.category/mode/employmentType/scheduleType`, `StudentPreference.paidPreference` move from Postgres `ENUM` to `STRING`, validated at the app layer against active `taxonomy_values` rows instead of hardcoded `@IsIn([...])`. Done as a clean one-time change (no migrations framework exists yet, no real production data at stake pre-launch), not a reversible migration. |
| `GET /taxonomies/:listKey` | Public, unauthenticated (dropdowns need it before login, same as today's `GET /internships/categories`). |
| `POST`/`PATCH /admin/taxonomies/:listKey` | Admin-only CRUD over values. |
| `/admin/settings/taxonomies` | New admin screen — add/rename/reorder/retire values per list. |
| Frontend cleanup | Delete `frontend/lib/categories.ts`'s hardcoded `INTERNSHIP_CATEGORIES` array and the hardcoded `<option>` lists in `FilterBar.tsx`, `InternshipForm.tsx`, `InternshipCard.tsx`, and the other 5 flagged pages — all source from `GET /taxonomies/:listKey` instead. Icon/pastel-color helper functions stay, keyed off fetched values. |

### Phase 1 — Foundation & quick wins

Independent, low-risk, no schema decisions pending. Ship together.

| Item | Work |
|---|---|
| T&C acceptance | Add `acceptedTermsAt: Date \| null` to `Student` (and `Employer`, if EOI submission should also require it — confirm at implementation time whether employers need their own acceptance or student-only is sufficient for v1). Registration-completion endpoints reject if unset; frontend checkbox sets it on submit. |
| Resume upload validation | Confirm `POST /students/me/resume` actually enforces PDF-only + size cap today (not yet verified in this codebase). Align `MAX_UPLOAD_SIZE_MB` to 5 per the discussion draft, or explicitly confirm 10MB stays and update the spec doc to match — don't leave the two disagreeing. |
| Deadline enforcement | One guard clause in `ApplicationsService.apply()`: reject with a clear error if `internship.applicationDeadline < now`. No new infrastructure. |

### Phase 2 — Structural build ✅ done (2026-08-14)

Touches data model, posting form, and admin/employer surfaces.

| Item | Work | Status |
|---|---|---|
| Per-employer moderation gate | `Employer.moderationMode: 'auto_publish' \| 'review'` (default `auto_publish`, per OQ-17). When `review`, `PATCH /internships/:id/publish` moves the posting to a new `pending_review` status instead of `published`. `PATCH /admin/internships/:id/moderate` approves (→ `published`) or rejects (→ `draft`, so the employer can edit and resubmit) — same pattern as `PATCH /admin/employers/:id/verify`. `PATCH /admin/employers/:id/moderation` sets the per-employer mode, surfaced on the admin employers page (now a full list with a status filter, not just the pending queue) and a "postings need review" badge; employer dashboard shows a "pending review" status badge and relabels the publish button ("Submit for review") when in review mode. | ✅ Built & verified live (create → publish → pending_review → admin approve → published) |
| Eligibility structuring | Added `educationLevel: 'UG' \| 'PG' \| 'Other'`, `stream` (Engineering/Management/Arts/Commerce/Science/Law/Medical/Other), `experienceRequired: boolean` to `Internship` — code-level enums (not admin-managed taxonomies, unlike category/mode/etc.), required on new postings via `CreateInternshipDto`. `eligibility[]` **kept** as supplementary freeform notes rather than retired — still optional, still useful for nuance the three structured axes don't capture. Wired into the posting form and the internship detail page's Eligibility card. | ✅ Built & verified |
| Company page | `GET /employers/:id/public` (narrow whitelist, 404s unless the employer is approved — doesn't confirm existence of unapproved/rejected employers) plus an `employerId` filter added to `GET /internships` (still forced to `status=published` — open postings only, per the earlier decision). New `/employers/:id` route; employer name on `InternshipCard` and the internship detail page now links there. | ✅ Built & verified |

### Phase 3 — Discovery quality ✅ done (2026-08-14)

Depends on Phase 2's eligibility fields landing first (structured fields feed the filter set built here).

| Item | Work | Status |
|---|---|---|
| Soft ranking / relevance sort | New `sort=relevance` option: score = count of `Student.skills ∩ Internship.skillTags` (case-insensitive), tie-broken by `createdAt DESC`. `GET /internships` switched from `@Public()` to `OptionalJwtAuthGuard` (still reachable anonymously, but auth-aware) so the backend can look up the requester's skills when present. Default sort whenever a student is authenticated and has `skills` set; the three existing explicit sorts remain as overrides, plus students/anonymous visitors with no skills fall through to the unchanged `newest` default. Computed in application code (not a raw SQL jsonb-intersection query) — a deliberate call given the current listing volume; noted inline as the thing to revisit if that volume changes. | ✅ Built & verified live — a student given skills matching an older listing correctly ranked it above newer non-matching ones |
| Eligibility hard-filters | Added `educationLevel`/`stream`/`experienceRequired` to the discovery query params, `FilterBar`, `CategoryPills`, and `Pagination`'s href builders (all three needed updating so filter state survives category clicks and page navigation). | ✅ Built & verified |
| Regression pass | Typechecked both apps clean; re-verified the full moderation gate, company page, and T&C/deadline flows still work after the sort/filter changes; confirmed the browse page's server-side fetch now forwards the student's auth token (`getServerAuthToken()`) so relevance ranking actually activates for logged-in visitors, not just direct API calls. | ✅ Done |

**Not scheduled in any phase above (explicit, tracked deferrals — see §13.8):** mobile OTP, gender/differently-abled/prior-experience student fields, AI-checklist automated scoring (OQ-9), resume content-quality validation (OQ-12), full notification matrix + WhatsApp channel (OQ-16), reporting/analytics dashboard (§10).

---

**Build plan status: all 4 phases (0–3) complete and verified against the live backend/frontend as of 2026-08-14.** What's left of v1 is exactly the deferred list above — named and tracked, not silently dropped — plus the two integration-boundary questions (SwayamPlus SSO, My Skills Plus taxonomy linkage) that belong to `docs/SWAYAM_PLUS_INTEGRATION_SPEC.md`'s timeline, not this standalone release.
