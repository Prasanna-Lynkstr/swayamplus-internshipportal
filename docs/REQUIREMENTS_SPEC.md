# SWAYAM Plus Internship Platform — Requirements Spec & Implementation Gap Analysis

Source: product roadmap (Problem Statement → Milestone 9) provided 2026-08-05.
This doc restates that roadmap as a requirements spec and maps every requirement
against the actual codebase (`backend/`, `frontend/`) as it exists today, with
file-level evidence — not a status guess.

**Legend:** ✅ Done &nbsp;·&nbsp; 🟡 Partial / mismatched &nbsp;·&nbsp; ❌ Not built

---

## 0. Where the platform stands, in one paragraph

**Milestone 1 (MVP) is now fully complete**, both its stated success criteria
(verified employer creates an internship, verified student discovers and
applies, employer reviews applicants, admin approves employers) and every
item on its fuller feature checklist: admin can view all internships and all
students (`/admin/internships`, `/admin/students`), search matches skill tags
as well as title/description, the work-mode filter is wired end-to-end, and
email notifications send for real via SMTP (any provider — ZeptoMail, SES,
etc.) with a runtime admin toggle to pause delivery without an env change.
Beyond Milestone 1, small pieces of Milestone 2/3 exist
ahead of schedule (saved internships, category filters), but Milestones 3–9
(matching, employer talent pipeline, dashboards, outcome tracking,
certification, DigiLocker, AI) are entirely unbuilt. Separately, a security/
scalability hardening pass (not part of this product roadmap, driven by
`frontend/CLAUDE.md`'s non-functional requirements) closed several real gaps
this session — API versioning, DTO validation, pagination, DB indexing/
pooling, an IDOR fix, and a `passwordHash`-leak fix — but rate limiting,
Redis, and refresh-token rotation from that same effort are still open.

---

## 1. Milestone 1 — MVP Launch: Internship Discovery & Applications

### Centralized Internship Marketplace

| Requirement | Status | Evidence |
|---|---|---|
| Internship listings | ✅ | `frontend/app/internships/page.tsx`; `GET /internships` |
| Internship detail page | ✅ | `frontend/app/internships/[id]/page.tsx` |
| Search internships | ✅ | `internships.service.ts` — `q` now also matches `skillTags` (cast to text, `ILIKE`) alongside `title`/`description`. Verified: searching "Figma" returns the UI/UX listing even though "Figma" only appears in its skill tags, not title/description. *(Fixed 2026-08-05.)* |
| Filter: Domain | ✅ | `category` query param, closed enum |
| Filter: Location | ✅ | `location` query param |
| Filter: Work mode | ✅ | Backend already supported `mode`; frontend `FilterBar.tsx` now has a "Any work mode / Remote / Onsite / Hybrid" dropdown wired into `FILTER_KEYS`, the browse page's `searchParams` type, and both `CategoryPills`/`Pagination`'s href-builders so the filter survives category clicks and pagination. Verified live: `?mode=remote` filters correctly and persists through navigation. *(Fixed 2026-08-05 — an earlier pass of this doc marked this ✅ without checking the frontend.)* |
| Apply to internship | ✅ | `POST /internships/:id/apply`, ownership + duplicate-apply guarded |

### Verified Student Profiles

| Requirement | Status | Evidence |
|---|---|---|
| Student registration | ✅ | OTP-based, `POST /auth/otp/request` \| `verify` |
| Email OTP verification | ✅ | `auth.service.ts` — 6-digit code, hashed, TTL + attempt-limit enforced |
| Basic profile | ✅ | `Student` model: fullName, phone, collegeName, course, graduationYear, city |
| Resume upload | ✅ | `POST /students/me/resume`, MIME-allowlisted (PDF/DOC/DOCX) |
| Skills capture | ✅ | `skills: string[]` (jsonb) |
| LinkedIn profile link | ✅ | `linkedinUrl` field |
| View applied internships | ✅ | `GET /applications/me` → `frontend/app/applications/page.tsx` |
| Basic email notifications | ✅ | `notifications.service.ts` sends via SMTP (any provider — ZeptoMail, SES, etc., configured through `SMTP_*` env vars) when configured, falling back to a console-log stub otherwise. Also gated by a runtime admin toggle (`platform_settings.emailNotificationsEnabled`, surfaced on `/admin/employers`) so email can be paused without an env change. Verified: toggling on/off changes the fallback-log reason correctly, and the toggle itself is confirmed working end-to-end in the browser. *(Fixed 2026-08-05.)* |

### Verified Employer Ecosystem

| Requirement | Status | Evidence |
|---|---|---|
| Employer registration | ✅ | OTP-based, same flow as student |
| Organization profile | ✅ | `Employer` model: organizationName, cin, gst, website, hqCity, industryTags |
| Verification document upload | ✅ | `POST /employers/me/verification-document`, MIME-allowlisted (PDF/JPEG/PNG) |
| Super Admin approval flow | ✅ | `GET /admin/employers/pending` → `PATCH /admin/employers/:id/verify` |
| Verified employer status | ✅ | `verificationStatus: pending\|approved\|rejected\|suspended`; posting an internship requires `approved` (`internships.service.ts` — `if (employer.verificationStatus !== 'approved') throw ...`) |

### Internship Recruitment Workflow

| Requirement | Status | Evidence |
|---|---|---|
| Create internship | ✅ | `POST /internships` (employer, verified-only) |
| Edit internship | ✅ | `PATCH /internships/:id` (owner-only) |
| Close internship | ✅ | `PATCH /internships/:id/close` |
| View applicants | ✅ | `GET /internships/:id/applications` (owner-only, paginated) |

### Internship Entity

| Field | Status |
|---|---|
| Title, Description | ✅ |
| Skills (`skillTags`) | ✅ |
| Location | ✅ |
| Work mode | ✅ |
| Duration (`durationWeeks`) | ✅ |
| Stipend (`stipendMin`/`stipendMax`) | ✅ |
| Number of openings | ✅ |
| Application deadline | ✅ |

### Super Admin

| Requirement | Status | Evidence |
|---|---|---|
| Verify employers | ✅ | see above |
| View active internships | ✅ | `GET /admin/internships` (paginated, optional `status` filter, includes employer name + verification status) → `frontend/app/admin/internships/page.tsx`. *(Fixed 2026-08-05.)* |
| View registered students | ✅ | `GET /admin/students` (paginated, `passwordHash`-safe via `USER_ASSOCIATION_SAFE`) → `frontend/app/admin/students/page.tsx`. *(Fixed 2026-08-05.)* |

### Milestone 1 — stated Success Criteria (from the roadmap, checked literally)

| Criterion | Met? |
|---|---|
| Verified employer can create an internship | ✅ |
| Verified student can discover and apply | ✅ |
| Employer can review applicants | ✅ |
| Super Admin can approve employers | ✅ |

**All four pass.** The two admin-visibility gaps and the notification stub are
real gaps against the fuller Milestone 1 feature list, but not against the
milestone's own bar for "done."

---

## 2. Milestone 2 — Profile Enrichment & Application Tracking

| Requirement | Status | Evidence |
|---|---|---|
| Certifications | ❌ | Not a field on `Student` (confirmed by full model read: fullName/phone/collegeName/course/graduationYear/city/skills/resumeUrl/linkedinUrl only) |
| Projects | ❌ | Not a field on `Student` |
| Portfolio links | ❌ | Not a field on `Student` |
| Internship preferences (domain/role/location/mode/duration) | ❌ | No such fields anywhere on `Student` or elsewhere |
| Application status tracking | 🟡 | Exists but with a **different vocabulary** than specified. Current: `applied \| shortlisted \| interviewing \| offered \| rejected \| withdrawn`. Roadmap wants: `Applied, Under Review, Shortlisted, Rejected, Offer Extended, Accepted`. Rough mapping: `interviewing`≈"Under Review", `offered`≈"Offer Extended" — but there's no terminal **"Accepted"** state (an offer currently has no student-side accept/decline action), and `withdrawn` exists but isn't in the roadmap's list. This needs a product decision, not just a rename. |
| Saved internships | ✅ *(ahead of schedule)* | `frontend/lib/useSavedInternships.ts` — real, working, `localStorage`-backed per-browser bookmark list. No backend model, so it doesn't sync across devices — worth deciding if that's acceptable long-term or needs a `GET/POST /students/me/saved-internships` endpoint. |
| Saved searches | ❌ | No evidence of this anywhere |
| Application notifications | 🟡 | Wired to the right event (status change) but same console-stub limitation as above |
| Status change notifications | 🟡 | Same as above |

---

## 3. Milestone 3 — Intelligent Matching & Employer Talent Pipeline

| Requirement | Status |
|---|---|
| Rule-based matching (skills/qualification/location/mode/preferences/availability) | ❌ Not built |
| Employer candidate search | ❌ No `GET /students`-style browse endpoint for employers; confirmed via full read of `students.controller.ts` and `employers.controller.ts` |
| Candidate filtering / shortlisting / saved candidate pools | ❌ Not built |
| Recommended internships / recommended candidates | ❌ Not built |

This entire milestone is greenfield — nothing here depends on undoing prior
work, but it does depend on Milestone 2's preference fields existing first
(rule-based matching needs student preferences to match against).

---

## 4. Milestone 4 — Governance, Notifications & Lifecycle Management

| Requirement | Status | Evidence |
|---|---|---|
| SMS notifications | ❌ | Zero SMS provider integration; only a comment noting it as a future TODO (`auth.service.ts`) |
| Reminder notifications | ❌ | Not built |
| Internship lifecycle: Draft/Active/Closed/Expired | 🟡 | Current enum is `draft \| published \| closed \| archived` (`archived`, not `expired`). No auto-transition job exists — the "N days left" deadline display is a **pure frontend calculation** (`daysLeft()` in the detail page), it never flips the backend `status`. A closed deadline does not stop new applications automatically today unless an employer manually closes the listing. |
| Employer: archive internships | ❌ | The `archived` status value exists in the DB enum, but no controller route sets it — only `/publish` and `/close` exist. This is dead schema, not a working feature. |
| Employer: close internships | ✅ | `PATCH /internships/:id/close` |
| Super Admin: force-close / archive / moderate | ❌ | Not built (no admin-scoped internship mutation endpoints at all, per Milestone 1's gap above) |
| Compliance: consent, declaration, terms acceptance | ❌ | Zero hits anywhere in either registration flow |

---

## 5. Milestone 5 — Insights & Workforce Intelligence

| Requirement | Status |
|---|---|
| Platform dashboard (totals: students, employers, internships, applications) | ✅ `GET /admin/dashboard` (totals + status breakdowns + 7-day sign-up trend) → `/admin/dashboard`, now the default admin landing page after login. No reporting *filters* (by employer/industry/district) yet — see the row below. *(Fixed 2026-08-05.)* |
| Reporting filters (employer/industry/district/institution/mode) | ❌ Not built |
| Employer dashboard (funnel, sourcing insights) | 🟡 `GET /employers/me/dashboard` now surfaces internships-by-status, total applications, and "awaiting review" count as metric cards above the existing listing on `/employer/dashboard` — real aggregation, not yet a full conversion funnel (applied→shortlisted→offered rates) or sourcing-channel insights. *(Fixed 2026-08-05.)* |

---

## 6. Milestones 6–9 — Outcome Tracking, DigiLocker, Employability Engine, AI

All four milestones are **entirely unbuilt** — confirmed by direct grep,
zero hits for: internship start/completion tracking, feedback capture,
certificate generation/verification, DigiLocker, skill graph/employability
scoring, or any AI-assisted feature (resume review, JD generation, candidate
ranking, AI matching). Nothing here is a "partial" — it's all future work.

---

## 7. Cross-cutting: things this roadmap doesn't mention, but matter

These come from a separate document (`frontend/CLAUDE.md`'s non-functional
requirements section) and from features that exist in the codebase without
appearing in the product roadmap at all. Flagging them here so they don't
get lost between the two specs.

- **New 2026-08-05: complete-profile users skip straight to their dashboard.**
  `/register/student` and `/register/employer` previously always rendered
  the profile form after OTP verification (or on any visit while already
  logged in), even for a user who'd completed their profile in a prior
  session — a pointless extra click for every returning login. Both pages
  now check `profileComplete` from `GET /students/me` / `GET /employers/me`
  right after auth resolves and `router.replace()` straight to
  `/student/dashboard` / `/employer/dashboard` when it's already true,
  showing a brief "Loading…" instead of flashing the form first. An
  incomplete profile still lands on the form exactly as before. Verified
  four cases in the browser: complete-profile student/employer logins both
  redirect to their dashboard; a fresh incomplete-profile login still shows
  the form; and an already-authenticated complete-profile user directly
  revisiting `/register/student` also redirects rather than getting stuck
  on the form.
- **New 2026-08-05: application deadline capped at 90 days out.** A new
  reusable `@MaxDaysFromNow(90)` class-validator decorator
  (`common/decorators/max-days-from-now.decorator.ts`) on
  `CreateInternshipDto.applicationDeadline` — carries over to
  `UpdateInternshipDto` automatically since `PartialType` copies all
  class-validator metadata generically (confirmed by reading
  `@nestjs/mapped-types`'s source, not assumed), so both create and edit are
  covered by one decorator. Frontend gets a matching `max` attribute on the
  date picker plus a "Up to 90 days from today." hint, so the common case
  never round-trips to the server at all. Verified the boundary precisely:
  60 days out succeeds, exactly 90 days succeeds, 91 days and 120 days both
  reject with a clear message — on both `POST /internships` and
  `PATCH /internships/:id`. The validator message was also cleaned up to
  read "Application deadline can't be more than 90 days from today"
  instead of leaking the raw `applicationDeadline` camelCase field name to
  the user.
- **New 2026-08-05: employer internship edit/delete.** `/employer/dashboard`
  (nav label renamed "Dashboard", was "My internships") now has an "Edit"
  link per listing (`/employer/post/[id]`, sharing the same form component
  as create via a new `InternshipForm`) and a "Delete" button — **shown only
  when `applicationsCount === 0`** — that opens a bottom-of-screen confirm
  toast ("Permanently delete ... ? This can't be undone.") before actually
  calling the new `DELETE /internships/:id`. Backend hard-deletes the row
  (not a status change) but 409s with a clear message if it has ANY
  applicants, even if the frontend gate were somehow bypassed — defense in
  depth, not just a UI-level check. `GET /internships/mine` now also returns
  a per-item `applicationsCount` (grouped-count query, no N+1) so the
  frontend never has to guess. Verified end-to-end: an internship with
  applicants correctly shows no Delete button and the API independently
  rejects a direct delete attempt (409); an internship with zero applicants
  can be edited (pre-filled form, saves via PATCH) and deleted (toast
  confirm → Cancel keeps it, confirming actually removes it, verified via a
  follow-up 404). "Close" now goes through the same confirm-toast pattern
  (orange, not red — closing is reversible, unlike delete) instead of firing
  immediately, and a closed listing gets a "Reopen" button — both close and
  reopen just call the existing `/publish`/`/close` endpoints, no new
  backend surface needed since `publish()` already sets status to
  `published` unconditionally regardless of the prior state. Verified:
  clicking Close shows the confirm toast without closing anything until
  confirmed, Cancel leaves it published, confirming closes it and a Reopen
  button appears, and Reopen correctly restores it to published with Close
  available again.
- **New 2026-08-05: student dashboard + profile-completeness gates on both
  dashboards.** `/student/dashboard` is a new page (application-status
  metrics + a recent-applications preview), and the nav's student link now
  points there instead of straight to `/applications` (which still exists
  as the full, withdrawable list). Both `/student/dashboard` and
  `/employer/dashboard` check the respective profile completeness
  (`isStudentProfileComplete`/`isEmployerProfileComplete` — org name, city,
  and verification document required for employers, mirroring the form's
  own `required` fields) and, if incomplete, show an inline "Complete your
  profile" card listing exactly which fields are missing, rather than
  silently redirecting to the profile page. That redirect-based first
  version was corrected the same day after user feedback: landing on the
  profile page with no explanation was confusing when, say, only the
  resume was missing and every other field was already filled in. Both
  `getMissingStudentProfileFields()`/`getMissingEmployerProfileFields()`
  return the specific missing-field list (not just a boolean), surfaced via
  `GET /students/me` / `GET /employers/me`'s new `missingFields` array.
  Verified end-to-end for all four combinations (complete/incomplete ×
  student/employer) via curl and a full browser pass, including the exact
  reported scenario (only the resume missing) — the dashboard URL now stays
  put and shows precisely `Resume` (or `Verification document` for the
  employer case) as the one missing item.
- **Real bug fixed 2026-08-05: students could apply with a completely empty
  profile.** A `Student` row is auto-created empty at OTP verification
  (before the profile form is ever seen), and `POST /internships/:id/apply`
  only checked that the row *existed*, not that it was filled in — so a
  brand-new student could apply immediately with no name, phone, college,
  resume, or skills, leaving employers with "Unnamed student" and nothing to
  evaluate. Fixed with a shared `isStudentProfileComplete()` check (name,
  phone, college, course, graduation year, city, resume, and ≥1 skill all
  required — user's explicit call, the strictest of three options offered):
  enforced server-side in `apply()` (403 if incomplete) and surfaced
  proactively on the internship detail page (a "Complete your profile before
  applying" prompt replaces the apply form/CTA for incomplete profiles,
  same pattern as the earlier "already applied" gate). `GET /students/me`
  now also returns a `profileComplete` boolean. Verified end-to-end via curl
  (blocked → filled everything but resume → still blocked → added resume →
  succeeds) and a full browser pass (fresh student registration → detail
  page shows the gate → completes profile → gate lifts, apply form appears).
- **Admin console scale-readiness fixed 2026-08-05.** All four admin list
  surfaces (`/admin/employers` pending queue, `/admin/internships`,
  `/admin/students`, `/admin/requests`) are now backend-paginated *and*
  frontend-wired with working Prev/Next controls — `/admin/employers` and
  `/admin/requests` previously had zero pagination UI despite the backend
  supporting it, meaning anything past the first page (`DEFAULT_PAGE_SIZE=12`)
  was silently unreachable. All four now also have a debounced text search
  (org name/email, internship title/employer, student name/college/email,
  request domain/student email respectively), verified against real data via
  curl and a full browser pass.
- **`internship-requests` feature exists but isn't in this roadmap.** A
  student can ask admin to add an internship category that doesn't exist yet
  (`POST /internship-requests`, `GET /admin/internship-requests`). It's fully
  built and working, but has no home in Milestones 1–9 — worth deciding if
  it's a permanent feature (and should get a milestone line) or a one-off
  that should be retired.
- **Auth is still a single 7-day JWT in a non-httpOnly cookie**
  (`JWT_EXPIRES_IN=7d`, `sp_token` cookie) — no refresh-token rotation.
  This is an open item from an earlier security remediation pass (Phase 4 of
  that plan), not something Milestones 1–9 ask for directly, but it's a real
  gap before any production launch.
- **No rate limiting, no Redis.** `@nestjs/throttler` isn't installed;
  OTP request/verify limits are enforced with in-DB counters only — fine for
  a single instance, not for the multi-instance scale the NFR doc calls for.
- **Category taxonomy is still a hardcoded array**
  (`backend/src/common/constants/categories.ts`), not the DB-backed,
  admin-editable table the NFR doc calls for — also an open item from that
  same earlier remediation plan (its Phase 3), not this roadmap.
- **Already done, not asked for by this roadmap, but load-bearing:** API
  versioning (`/api/v1`), global exception filter, Swagger docs, `/health`
  check + graceful shutdown, DB connection pooling + indexes, pagination on
  every list endpoint, server-side file-type allowlisting, an IDOR fix on
  `GET /internships/:id`, and a `passwordHash`-leak fix on two admin
  endpoints. These came out of a security/scalability audit this session,
  not the product roadmap — worth keeping visible so future roadmap
  planning doesn't accidentally re-discover them as "gaps."

---

## 8. Suggested near-term priority order

Milestone 1 is complete. The highest-leverage next steps, cheap and
unblocking later milestones:

1. **Decide the application-status vocabulary now**, before Milestone 2 work
   starts on top of it — changing an enum after employers/students have live
   data is more expensive later.
2. **Student preference fields** (Milestone 2) before starting Milestone 3's
   rule-based matching, since matching has nothing to match against without
   them.
3. Address the cross-cutting security items (§7) before any environment
   beyond local/dev — rate limiting and refresh-token rotation in particular,
   since OTP endpoints and long-lived tokens are the two most obvious
   pentest findings.
4. **Get real SMTP credentials into `.env`** (`SMTP_HOST`/`SMTP_USER`/
   `SMTP_PASSWORD`/`SMTP_FROM`) — the notification system is fully built and
   tested against the console-log fallback, but nobody has actually received
   a real email yet since no live provider credentials have been configured.
