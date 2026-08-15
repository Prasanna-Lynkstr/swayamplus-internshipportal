# Link Internship — SWAYAM Plus Module Integration Spec (v1 Draft)

Status: **draft — contains open TBDs**, pending (a) SwayamPlus core codebase/
environment access and (b) skill-ontology API vendor details. Do not start
implementation against the sections marked TBD until those land; everything
else is a firm enough direction to start scaffolding against.

This spec supersedes the "standalone" framing in `README.md` and
`frontend/CLAUDE.md` (both written when there was no SwayamPlus codebase to
integrate with). It does not replace `docs/REQUIREMENTS_SPEC.md` — that
gap-analysis of the standalone MVP is still accurate for what's *built*;
this doc is about how that functionality gets carried into SwayamPlus proper
and what's new for v1.

---

## 1. Objective

Ship "Link Internship" as a menu item inside SwayamPlus that loads an
internship marketplace module. Existing SwayamPlus students log in through
SwayamPlus itself and are dropped into a "complete your profile" step for
internship-specific fields the first time they use the module. New users
who arrive via the module are created as SwayamPlus students first, then
get an internship profile layered on top. The module is built **as part of
SwayamPlus core** (same repo/branch, same deploy) but is **developed and
maintained by a separate tech team**, so the module boundary needs to be
real, not just organizational.

## 2. V1 Scope

In scope:
- Student registration/login via SwayamPlus identity (no separate OTP flow
  for students who already have a SwayamPlus account)
- Corporate (employer) registration — new to SwayamPlus, admin-verified
  before posting, same governance shape as the existing `employers` module
- Internship listings (browse/search/filter/apply) — carried over from the
  existing MVP
- Resume parsing to extract skills and internship interests (via a
  third-party parsing API — vendor TBD)
- Skill-ontology-based evaluation: a numeric match score, visible to both
  student and corporate, computed from parsed skills against a
  per-internship required-skill set via an external ontology API (vendor
  TBD)
- Per-internship configurable evaluation: whether evaluation is required at
  all, and which ontology/skill-set applies, set at posting time (exact
  admin-floor policy — §11, TBD)
- Matching: recommended internships for students, recommended candidates
  for corporates — computed as a **batch job**, not real-time (§9)

Out of scope for v1 (carried over from the original MVP's non-goals, still
holds): Institution/University role, credit-bearing internship workflows,
certification/DigiLocker, outcome tracking, SMS notifications, AI-generated
JD/resume review.

## 3. Architecture & Module Boundary

**Decision: embedded module in the SwayamPlus monorepo**, own top-level
directory (e.g. `/modules/internship` or wherever SwayamPlus's existing
convention puts feature areas — confirm on access), routed under
`/internship` or similar and surfaced via the new "Link Internship" nav
item. One branch, one build, one deploy — not a separately deployed service
behind a gateway, and not a micro-frontend/iframe.

**TBD, blocking, pending core access:**
- **SwayamPlus's actual stack.** "Embedded" is written above on the
  assumption the module's code runs *inside* SwayamPlus's own build. If
  SwayamPlus is not a Node/Next stack, "embedded module" needs a fallback
  definition — e.g. the existing Bun/NestJS/Next codebase runs as a
  sub-app within the same monorepo with its own build step, reverse-proxied
  under one path, rather than literally sharing SwayamPlus's runtime. This
  changes how much of the current `backend/`/`frontend/` code is reusable
  as-is vs. needs re-implementation in SwayamPlus's native stack. **Do not
  assume either answer until the codebase is visible.**
- Where in SwayamPlus's existing app shell the "Link Internship" menu item
  and route actually get wired in (nav config location, permission/role
  gating mechanism already used for other menu items).

**Ownership boundary:** dedicated module folder + `CODEOWNERS` entry
routing any PR touching that folder to the internship team, inside the
shared branch. Both teams share CI; the internship team does not get an
independent deploy cadence in v1 (open question if that's acceptable —
flag if SwayamPlus core team disagrees).

## 4. Identity & Auth Integration

**Decision: SwayamPlus issues an SSO token (JWT/OAuth); this module
validates it.** This maps directly onto the swap boundary already built
into the standalone MVP (`AuthService.requestOtp`/`verifyOtp` in
`backend/src/modules/auth/`) — that boundary was deliberately built to be
replaced by exactly this kind of integration, so the OTP-specific internals
get removed, not the interface around them.

Flow for v1:
1. Student clicks "Link Internship" inside SwayamPlus, already authenticated
   there.
2. SwayamPlus's own SSO issues/forwards a token asserting the student's
   core identity (claims needed: at minimum a stable internal student ID,
   name, email — exact claim shape TBD pending access).
3. Module validates the token, looks up (or creates, see §5) the linked
   internship-profile record.
4. If the internship profile is incomplete (missing resume/skills/etc.),
   redirect to the profile-completion step before allowing browse/apply.

**TBD, blocking:** exact SSO mechanism (JWT signature/JWKS, OAuth
authorization code flow, or an internal session-forwarding scheme SwayamPlus
already uses for other modules), and the token's claim shape.

**Admin note carried over:** admin accounts stay out of this SSO flow —
same as the existing MVP, admin is provisioned out-of-band and is a separate
concern from student/corporate identity.

## 5. Data Model & Profile Architecture

Internship-specific data (resume, extracted skills, preferences,
evaluation scores, applications, listings) lives in **this module's own
database/schema**, not in SwayamPlus core's student tables. A student's
core SwayamPlus account is the system of record for identity; this module
never writes back to it.

**Linking key: SwayamPlus's internal user/student ID** (not email) —
decided specifically because email can change or may not be guaranteed
unique/stable in SwayamPlus. Concretely: replace the current standalone
MVP's `users.identifier` (email-based) model with a `users` table keyed on
`(swayamplus_student_id, role)` for students, while corporates (who have no
SwayamPlus account) keep an internship-module-local identity.

New-user path: if a student token arrives with no existing linked profile,
create the internship-module's `Student` shell row against that
SwayamPlus ID (mirrors the existing MVP's "auto-create empty Student row on
first auth" pattern — see
`docs/REQUIREMENTS_SPEC.md`'s note on `isStudentProfileComplete()`), then
route to profile completion.

**TBD:** exact SwayamPlus student ID field/type (integer PK, UUID, etc.) —
confirm once the token claim shape and/or core schema is visible. Table
design should use a generic external-ID column now so this is a
config/type change, not a rearchitecture, once confirmed.

## 6. Corporate (Employer) Registration

No existing "corporate/organization" concept has been confirmed in
SwayamPlus (unconfirmed — **TBD**, ask once access lands whether any
partner-institution/organization account type already exists that could be
reused instead of building this from scratch). Absent that, this reuses the
existing MVP's `employers` module near-verbatim: self-registration, org
profile, verification-document upload, admin approval gate before posting.
Corporates are **not** SwayamPlus accounts — they're net-new to the
platform, so they keep an independent (email or OTP-based, TBD which)
registration flow rather than SSO.

## 7. Resume Parsing

**Decision: third-party parsing API** (vendor not yet named — treat as a
swap boundary, same pattern as OTP/SMTP/storage in the current codebase: a
`ResumeParsingService` interface with one real implementation behind
config, so swapping vendors later is a contained change).

Output consumed downstream: extracted skills (mapped to the ontology
vendor's taxonomy where possible — see §8) and any stated internship
interests/domains. Student can review/edit extracted skills before they're
used for evaluation or matching — parsing is an assist, not a silent
authority, consistent with the existing MVP's principle of keeping
self-declared data editable.

**TBD:** vendor selection; fallback behavior when parsing fails or returns
nothing (manual entry as primary path is the safe default until decided
otherwise).

## 8. Skill Ontology Integration & Evaluation

**Vendor: TBD** — user has one in mind, details pending. Design the
integration as a config-driven swap boundary (`SkillOntologyService`
interface) exactly like the resume parser, so the specific vendor's API
shape doesn't leak into the rest of the module.

**Decided:** evaluation produces a **numeric match score**, visible to both
the student and the corporate, rather than a bare pass/fail. Per-internship
config (set at posting time) controls:
- whether evaluation is required at all for that listing
- which ontology/skill-set applies
- (implied, not yet confirmed — see TBD below) a minimum score threshold to
  be allowed to apply, if the corporate wants a hard gate rather than just a
  visible score

**TBD, high-impact on cost/architecture:**
- **Scoring cache/timing.** Given the confirmed scale (~50k students, 500
  corporates by Q4 2026), scoring must **not** be a live per-application
  ontology-API call — that doesn't survive the request volume or the
  vendor's likely rate limits. Default direction pending confirmation:
  compute/cache a student's ontology-normalized skill vector once per
  profile (re-run on resume/skills update), then score-against-a-listing is
  a local computation (vector/set comparison), not a fresh external call.
  Confirm this against the actual vendor's API design once known — some
  ontology APIs charge/rate-limit per normalization call, not per
  comparison, which would make this cheap; others may require the
  comparison itself to hit their API.
- Whether a corporate can opt out of evaluation entirely, or whether admin
  enforces a floor (e.g., required above some stipend/openings threshold)
  to prevent low-quality mass applications on a government platform.

## 9. Matching & Recommendations

**Decision: batch job**, not real-time — consistent with both the
confirmed scale and the evaluation-caching direction above. A scheduled job
(cadence TBD — nightly is the default assumption until load-tested)
computes:
- recommended internships per student (ranked by cached skill-match score,
  plus any preference fields — see below)
- recommended candidates per corporate, per active listing

**TBD:** whether v1 matching uses skill-score alone, or also needs the
student preference fields (preferred location/mode/duration/domain) that
were speced in the original roadmap's Milestone 2 but never built. If
preferences are in scope, they need to be added to the profile-completion
form now, since matching can't use fields that don't exist. Recommend
resolving this before the profile-completion form (§5) is finalized, since
it's a form-scope question, not just a matching-algorithm one.

## 10. Reuse of the Existing Standalone MVP

The current `backend/`/`frontend/` in this repo is the reference
implementation for most of v1's non-new functionality, built specifically
with a swappable auth boundary in anticipation of this integration
(see `README.md`'s "Auth/SSO swap-in point" section). Expected carry-over,
pending the stack question in §3:

| Existing module | v1 disposition |
|---|---|
| `internships`, `applications` | Carry over largely as-is |
| `students` | Carry over; remove OTP-specific fields, add SwayamPlus linking ID (§5) |
| `employers` | Carry over largely as-is (§6) |
| `admin`, `platform-settings` | Carry over as-is |
| `auth` | Replace OTP internals with SSO-token validation (§4); interface shape stays |
| `storage`, `notifications` | Carry over as-is |
| *(new)* resume parsing | New module, third-party-API-backed (§7) |
| *(new)* skill ontology / evaluation | New module, vendor-backed (§8) |
| *(new)* matching/recommendations | New module, batch job (§9) |

## 11. Non-Functional Requirements

Inherits the existing NFR baseline in `frontend/CLAUDE.md` (config
discipline, pagination, rate limiting, IDOR checks, encrypted-at-rest
secrets, etc.) — those weren't fully closed even for the standalone MVP
(see `docs/REQUIREMENTS_SPEC.md` §7: no rate limiting/Redis yet, no
refresh-token rotation) and must be closed before this carries real
SwayamPlus student/corporate data.

**New for this integration:**
- **Scale target: ~50,000 students, ~500 corporates** by Q4 2026 launch.
  This is the basis for the batch-matching and cached-scoring decisions
  above — any synchronous, per-request external-API design should be
  treated as a red flag against this target.
- **Timeline: Q4 2026.**

**TBD:**
- DPDP Act / data-localization / GIGW accessibility requirements specific
  to this deployment, beyond the existing NFR doc.
- Concrete concurrent-request/QPS target (50k/500 are account counts, not
  a load profile — a load test still needs an assumed peak-concurrency
  number, e.g. around a listing-publish or application-deadline event).

## 12. Governance & Team Ownership

- Module folder + `CODEOWNERS` inside the shared SwayamPlus branch (§3).
- Internship team owns everything under the module directory; SwayamPlus
  core team owns the SSO/identity contract (§4) and the nav/menu wiring
  point.
- **TBD:** deploy cadence — v1 assumption is the module ships on
  SwayamPlus's normal release train, not independently. Flag if the
  internship team needs faster iteration than that allows.

## 13. Consolidated Open Questions (TBD)

Blocking design work (need answers before implementation starts):
1. SwayamPlus core codebase/environment access — requested, not yet granted.
2. SwayamPlus's actual tech stack (determines what "embedded module" means
   concretely — §3).
3. SSO token mechanism and claim shape (§4).
4. Confirmed SwayamPlus student ID field/type for the linking key (§5).
5. Skill-ontology API vendor — name, auth model, rate limits, cost
   structure, taxonomy/response shape (§8).
6. Resume-parsing API vendor selection (§7).

Non-blocking but needed before finalizing scope/forms:
7. Does SwayamPlus already have any organization/institution account type
   reusable for "Corporate" (§6)?
8. Are student preference fields (location/mode/duration/domain) in v1
   scope for matching, or skill-score-only for now (§9)?
9. Can a corporate opt out of evaluation entirely, or is there an
   admin-enforced floor (§8)?
10. DPDP/data-localization/GIGW accessibility constraints (§11).
11. Peak-concurrency/QPS target to load-test against (§11).
12. Deploy cadence expectations for the internship team (§12).

## 14. Suggested Phasing

1. **Discovery** — get core access (Q1 above), confirm stack, SSO
   mechanism, and student ID shape. Nothing past this point should be built
   against guesses.
2. **Module scaffolding** — stand up the embedded module skeleton in the
   SwayamPlus branch, wire the "Link Internship" nav item and route, land
   the `CODEOWNERS` boundary.
3. **Auth cutover** — replace OTP internals with SSO-token validation;
   profile-completion redirect for incomplete internship profiles.
4. **Core carry-over** — port listings/applications/employers/admin from
   the standalone MVP with the new linking-key data model.
5. **Resume parsing + evaluation** — land both swap-boundary services
   once vendors are confirmed; ship per-internship evaluation config.
6. **Matching** — batch job, recommendation surfaces on both student and
   corporate sides.
7. **Hardening** — close the outstanding NFR gaps (§11) and run load
   test + VAPT/ZAP baseline against the confirmed scale target before
   launch.
