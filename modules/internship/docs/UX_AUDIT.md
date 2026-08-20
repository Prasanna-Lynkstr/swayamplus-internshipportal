# UX Audit — Student, Employer, Admin

Date: 2026-08-14. Method: code-grounded cognitive walkthrough (three parallel
reviews — student journey, employer journey, admin + cross-cutting) tracing
each page as the named persona would actually experience it, not a visual
screenshot pass. Every High-severity finding below was spot-verified against
the live source after the reviews came back, not taken on faith.

**Scope:** all 19 pages in `frontend/app/**/page.tsx`.

---

## Fixed during this audit

**Students could never complete their profile or apply to anything.**
`app/register/student/page.tsx` had no Terms & Conditions checkbox — the
backend's `acceptedTermsAt` gate (added in Phase 1) was wired end-to-end
except for the one control that actually sets it. Every student's
`missingFields` permanently included "Terms & Conditions acceptance" with no
way to clear it, so `isStudentProfileComplete()` never returned true and
`POST /internships/:id/apply` was unreachable for every student on the
platform. The employer registration page already had the correct pattern
(checkbox → disabled-until-checked submit → "Accepted on {date}" readout);
this was ported over verbatim and verified (typecheck clean, page compiles,
submit now sends `acceptTerms: true`). This was the single most severe
finding across all three reviews — a real regression, not a preference.

---

## Top priority — fix next

Ordered by how much real friction/breakage each causes, folding in the most
load-bearing finding from each review:

1. **Employer Certificate-of-Incorporation upload is still a raw, unstyled
   `<input type="file">`** (`app/register/employer/page.tsx:277`) — the exact
   pattern the student resume upload had *before* it was redesigned into a
   hidden input + styled "Choose file" button. The two onboarding flows now
   visibly disagree with each other. Apply the same pattern here.
2. **A posting stuck in `pending_review` has zero explanatory copy or
   actions** on the employer dashboard (`app/employer/dashboard/page.tsx`) —
   draft/published/closed all get action buttons, pending_review gets only a
   badge. Add a line of copy ("Awaiting admin review…") and consider a
   withdraw-to-draft action.
3. **`moderationMode` is never surfaced as its own fact** on the employer
   dashboard — the only signal is the Publish button quietly saying "Submit
   for review" instead of "Publish," easy to miss the first time. Add an
   explicit badge/line when `moderationMode === 'review'`.
4. **Admin's pending-internship queue shows the raw `pending_review` enum**
   (`app/admin/internships/page.tsx:128` — `{internship.status}` with no
   label map) while the employer dashboard already has a `STATUS_LABEL` map
   producing "pending review" for the identical value. Reuse that map.
5. **No confirmation on Approve/Reject anywhere in admin** (employers,
   internships) or on **rejecting an applicant** on the employer dashboard —
   all fire immediately on click with no undo, while the app already has a
   `ConfirmToast` pattern used elsewhere for destructive actions (close/delete
   a listing). Reuse it for at least Reject actions.
6. **Footer "Support"/"Legal" links are dead** (`components/layout/Footer.tsx`
   → `/#faq`, `/#contact`, `/#terms`, `/#privacy` — confirmed only `id="about"`
   exists anywhere on the landing page). Either build the anchors or point
   these links somewhere real.
7. **Nav says "Student login" / "Employer login," the destination page says
   "Student registration"** (`components/layout/NavPill.tsx:114,120` vs.
   `app/register/student/page.tsx:242`) — same flow, inconsistent promise.
   Pick one term.
8. **Employer applicant list has no pagination UI** despite the endpoint
   being paginated (`app/employer/dashboard/page.tsx` `ApplicantsPanel` reads
   only `.items`, discards `total`/`totalPages`) — any listing with more than
   one page of applicants silently hides the rest.
9. **`autoApproveEmployers` has no admin UI toggle** at all (confirmed: zero
   references in `app/admin/settings/page.tsx`) despite being a real,
   already-built backend setting — only reachable via a raw API call today.
10. **`InternshipCard`'s employer name is a styled `<p>` with an onClick, not
    a real link or button** (`components/internships/InternshipCard.tsx:57-66`)
    — not keyboard-focusable, no `role`/`href`. A keyboard or screen-reader
    user cannot reach the company page from a listing card at all.

---

## Student journey

Reviewed: landing page, `/register/student` (OTP + profile + preferences),
`/internships` browse, `/internships/[id]` detail + apply, `/applications`,
`/student/dashboard`, `/employers/[id]` company page.

### Critical / High
- **T&C checkbox missing** — see "Fixed during this audit" above.
- **Apply-gate message is generic, not the real missing-fields list**
  (`app/internships/[id]/page.tsx:244-251`) — static "name, contact details,
  and resume" copy regardless of what's actually missing, while
  `student/dashboard/page.tsx:60-75` already renders the real `missingFields`
  array as badges. Reuse that pattern here.
- **Withdraw fires with zero confirmation, but it's permanent** —
  `applications.service.ts`'s `apply()` blocks re-applying to the same
  internship regardless of the existing row's status, so a misclicked
  withdraw forfeits that internship forever. Add the same `ConfirmToast`
  pattern the employer dashboard already uses for its own destructive actions.
- **Employer name on `InternshipCard` isn't keyboard-reachable** — see
  priority list #10 above.

### Medium
- **FilterBar has grown to 9 controls** (type, location, category, mode,
  education level, stream, experience, sort, search) with no grouping —
  consider a "More filters" disclosure for the three newest/most niche ones.
- **New eligibility fields are filterable but never shown on the card
  itself** — a student filtering by "PG + Engineering" gets filtered results
  with no visual confirmation of why each one matched.
- **Eligibility card on the detail page mixes structured badges and
  freeform notes with identical styling**, no separating label — reads as
  undifferentiated pill soup once an employer's added a few freeform tags.
- **"Freshers welcome" badge always renders as a default**, presenting a
  claim the employer may never have deliberately made — consider only
  showing it once the employer has actually engaged with the field, or a
  more neutral default wording.
- **No pagination on `/applications`** despite the endpoint being paginated
  — older applications silently disappear past page 1 with no indication.
- **A student's own cover note and checklist self-ratings are never shown
  back to them anywhere** — no way to recall what was submitted before an
  interview.
- **No student-oriented CTA in the landing-page hero** — both CTAs
  ("Browse all internships," "Post an internship") skip straight past
  inviting a first-time student to register.

### Low
- No real "Resend OTP" — only "Use a different email" (restarts the whole
  flow). Also see cross-cutting note on OTP below.
- "Profile saved!" shows unconditionally on any successful PATCH, even one
  that saved nothing meaningful, and no `required` attributes on any field.
- "Days left" urgency styling is inconsistent between the list card (always
  bold orange) and the detail page (greys out unless ≤5 days left).
- `employers/[id]` fetches `logoUrl` but never renders it — always shows the
  initial-letter avatar; also no back-link to the listing the student came
  from.
- Day-1 "Register Interest" form sits at the very bottom of a long landing
  page despite being designed as a lightweight, low-friction feature.
- A logged-in student still sees "Post an internship" as a homepage CTA.

---

## Employer journey

Reviewed: `/register/employer` (OTP + EOI form), `/employer/dashboard`,
`/employer/post` + `/employer/post/[id]`, `/employers/[id]` (own company page).

### High
- **Certificate-of-Incorporation upload is a raw unstyled file input** — see
  priority list #1.
- **Pending-review postings have no actions or copy** — see priority #2.
- **`moderationMode` never surfaced as its own fact** — see priority #3.
- **Applicant list has no pagination UI** — see priority #8.
- **`educationLevel`/`stream` free-text `eligibility` field overlap is
  unexplained** (`InternshipForm.tsx`) — the pre-existing freeform
  "Eligibility (comma-separated)" field's placeholder text
  ("Undergraduate, Postgraduate, Engineering Students") now literally
  duplicates the new structured Education level / Stream dropdowns directly
  below it. Re-label the freeform field ("Additional eligibility notes")
  and add one line distinguishing it from the structured fields.
- **`educationLevel`/`stream` silently default to the first enum value**
  via a `useEffect` the employer never consciously interacts with — since
  these now feed real discovery filters, an unnoticed default posting is
  invisible to students filtering correctly. Default to an explicit
  "Not specified" choice instead of a real value, or require an active pick.
- **`logoUrl` is fully dead end-to-end** — fetched and typed, but there is no
  upload UI anywhere in the app to set it, and the one page that could
  display it (`employers/[id]`) doesn't read it either. Either wire up a real
  upload path or drop the field from scope until there is one.

### Medium
- Certificate-of-Incorporation's sibling field `reasonForEoi` uses a raw
  `<textarea>` instead of the shared `Textarea` component — same drift risk
  as the file input.
- No visual distinction between required and optional EOI fields.
- No confirmation before an employer rejects an applicant (only Close/Delete
  get `ConfirmToast` treatment today).
- The applicant status `<select>` always resets to a blank placeholder
  after firing rather than reflecting the just-set value — the `Badge` next
  to it is the only persistent record, which reads as a bug on first glance.
- Delete only appears when an internship has zero applicants, with zero
  explanation when it's missing — show a disabled button with a tooltip
  instead of hiding it silently.
- The 21-field `InternshipForm` is one flat ungrouped grid with no section
  headers — was manageable at 18 fields, three more pushes it further into
  "wall of inputs."
- "Generate from description" is disabled below 20 characters with no
  visible explanation for why the button won't respond.
- No error-scroll-to-field on submit failure — the single error message
  renders at the very bottom of a long form.

### Low
- No indication on the EOI page of *why* an employer was rejected, or what
  to do next.
- The T&C checkbox's "already accepted, locked" visual state is subtle
  (just a greyed checked box) — consider an inline "(already accepted)" note.
- ApplicantNotes' add-note input uses a third ad hoc styling string instead
  of the shared `Input` component.
- No "Cancel"/back-to-dashboard link on the post or edit forms.
- Editing a live (`published`/`pending_review`) posting gives no feedback
  about what happens to its status on save.

---

## Admin experience

Reviewed: login, dashboard, employers, internships, settings, taxonomies,
students, requests, interest-registrations, and the `AdminTabs` nav.

### High
- **`autoApproveEmployers` has no UI toggle** — see priority #9.
- **No confirmation on employer/internship Approve/Reject or the
  moderation-mode toggle** — see priority #5.
- **Raw `pending_review` enum shown on the internships queue** — see
  priority #4.
- **`AdminTabs` has no wrap/scroll handling for 8 tabs** including two long
  labels ("Interest registrations," "Internship requests") — the primary
  admin nav will overflow or force page-level horizontal scroll on a narrow
  viewport.

### Medium
- Rejecting an employer is a dead end in the UI — no re-approve action is
  shown for already-rejected rows, only for pending/approved.
- No link from the pending-internships queue to the full posting — an admin
  is asked to moderate content (description, responsibilities, checklist)
  they can't actually read without leaving the page or guessing.
- Taxonomy label renaming uses a native `window.prompt()` — unstyled, poor
  on mobile, gives no validation guidance.
- "Internship requests" and "Interest registrations" tabs sit adjacent with
  near-identical wording despite being deliberately distinct concepts —
  real risk of clicking the wrong one.

### Low
- No reason/note captured when an admin rejects an employer, for their own
  future reference.
- Status filter on the employers page orders "All" last instead of first.
- The taxonomy "machine value" field gives no hint that it's permanent and
  unique once created (confirmed backend-side).
- "Needs your attention" dashboard cards render even at zero count, reading
  as a false-positive nudge.
- Settings/Taxonomies sit as flat, equal-weight tabs alongside operational
  ones as the admin surface grows — may want grouping later.

---

## Cross-cutting

- **Nav copy says "login," destination pages say "registration"** — see
  priority #7.
- **Dead footer anchor links** (`/#faq`, `/#contact`, `/#terms`, `/#privacy`)
  — see priority #6.
- **Dark-mode toggle and "EN" language button in `NavPill` are fully inert**
  — no effect on click, the dark-mode one only self-documented as cosmetic
  via a hover `title` most users never see. A control that visibly does
  nothing breaks trust in every other control's affordance; implement or
  remove both.
- **"Admin sign-in" is nested inside the Footer's "For Employers" column** —
  reads as a mis-filed leftover from the earlier "For Institutions" relabel.
- **No real OTP resend** anywhere `OtpFlow` is used (student or employer) —
  only "use a different email," which restarts the whole flow; no
  attempts-remaining/cooldown feedback despite server-side limits existing.
- **`STATUS_TONE`/status-label maps are copy-pasted across 3+ files**
  (`applications`, `student/dashboard`, `employer/dashboard`, `admin/internships`)
  with at least one (`admin/internships`) missing the label mapping the
  others have — a real drift risk any time a new status value is added.
- Loading/empty/error state copy and styling **is** consistent across the
  admin/employer pages checked — confirmed as a non-issue, not a finding.
- `FilterBar`'s 10 controls do wrap correctly on mobile — confirmed as a
  non-issue, unlike `AdminTabs`.

---

## Suggested next steps

1. Ship the priority-list-of-10 above first — none of them need a design
   pass, they're either missing wiring for something that already exists
   elsewhere in the app (confirmation dialogs, status label maps, pagination
   UI) or a straight port of a pattern already built for the other persona
   (file-upload button, T&C checkbox — the latter now done).
2. Resolve the `eligibility` free-text vs. structured-fields overlap on the
   posting form — this is a real product decision (supplementary notes vs.
   redundant duplicate), not just copy, and it's actively confusing for
   every employer posting from now on.
3. Decide `logoUrl`'s fate — build the upload path or drop it from the
   public company page's implied feature set.
4. Treat the inert nav controls (dark mode, language) as a should-fix before
   any visible launch — they're small, but a fake-functional control is
   worse for trust than no control at all.

---

## Fresher feedback — student module (2026-08-20)

Method: informal usability feedback collected from a group of fresher
students trying the platform, reconciled against the live source (this is a
feedback triage, not a fresh code walkthrough — see the Aug 14 audit above
for that).

### Already built, but not landing as discoverable
- **"Add a Save/Bookmark option"** — this already exists:
  `ShareSaveActions.tsx` renders a ★/☆ toggle on every listing (via
  `useSavedInternships`), and there's a dedicated `/internships/bookmarked`
  page. Freshers asking for it anyway is a discoverability problem, not a
  missing feature — the icon-only star sitting in a corner of the card
  isn't reading as "save this." Consider a text label (at least on the
  detail page's action row) or a first-run tooltip, rather than building a
  duplicate feature.
- **"Application status tracker"** — status is already tracked and shown
  (`/applications`, `student/dashboard`) via the `STATUS_TONE`/label badges
  the Aug 14 audit already flagged as copy-pasted across files. What's
  missing isn't the data, it's a clearer visual (e.g. a stepper: Applied →
  Shortlisted → Interviewing → Offered) instead of a single badge — a
  design task, not a new backend capability.
- **"Better filtering/sorting"** — `FilterBar` already has 9 controls
  including sort; this duplicates the Aug 14 audit's #103 finding
  ("FilterBar has grown to 9 controls... consider a 'More filters'
  disclosure"). No new action beyond what's already queued.

### Confirmed genuine gap
- **No start/end date on an internship** — confirmed in the data model
  (`durationWeeks` and `applicationDeadline` exist; there is no `startDate`/
  `endDate` field anywhere in `lib/types.ts` or the backend modules). The
  detail page already renders responsibilities (`responsibilities[]`) and
  working hours (`workingDays` + `scheduleType`), contrary to what some of
  this feedback implies — but it genuinely cannot show a start/end date
  because the platform never captures one. If this is worth adding, it's a
  schema change (new fields on `internships`, exposed on the employer post
  form and the detail page's "Additional Information" grid), not a
  frontend-only fix.

### Visual inconsistencies — confirmed and fixed (2026-08-20 follow-up)
Ran both servers locally and screenshotted the actual rendered pages
(landing, `/internships`, `/internships/browse`, an internship detail page,
and — logged in as a seeded demo student — `/student/dashboard` and
`/applications`) rather than guessing from source alone. All three findings
below were fixed the same day and re-verified against a fresh screenshot
after the fix (typecheck clean, no other pages touched).

1. **Three of six sidebar filter groups render as empty, right above the
   toggle switches — this is almost certainly what read as "spacing/
   alignment issues with toggle buttons."** `FilterSidebar.tsx`: Category
   (line 306), Work mode (339), and Type (357) are `<details ... open>` —
   expanded by default, content visible. Education level (374), Stream
   (390), and **Minimum stipend (418)** — the section that sits *directly
   above* the `Paid only` / `Freshers welcome` switches — are plain
   `<details>` with no `open`, i.e. collapsed by default. Every one of
   these `<summary>` elements also has `[&::-webkit-details-marker]:hidden`
   plus `list-none`, which strips the native disclosure triangle in every
   browser — so a collapsed section gives zero visual cue it's expandable.
   Screenshotted result: "EDUCATION LEVEL", "STREAM", and "MINIMUM STIPEND"
   render as bare headings with nothing underneath, immediately followed by
   the two switches — reads exactly like broken/missing filter content
   sitting right next to the toggles, not three sections that just need a
   click. **Fixed:** added a shared `ChevronIcon` (rotates via
   `group-open:rotate-180`) to all six `<summary>` elements, so every
   filter group — open or collapsed — now shows an explicit expand/collapse
   affordance instead of silently hiding the marker.

2. **Skill-tag pills are a hand-rolled span that drifted from the shared
   `Badge` component sitting one row above them — this is the "bold and
   clearly visible on one line, lighter/faded on the next" complaint.**
   On every browse-page row (`InternshipListRow.tsx:68-89`) and on the
   card's "Matches your skills" line (`InternshipCard.tsx:65-72`), the
   category/"Actively hiring"/"New" tags use `<Badge>` — `text-xs font-bold`
   on a colored tone (`text-sp-orange-ink` on `bg-sp-orange-soft`, etc. —
   `Badge.tsx:5-10`). The skill-tag row directly beneath them
   (`InternshipListRow.tsx:78-88`) is a raw `<span>`, not `<Badge>`:
   `text-[11px] font-semibold text-sp-ink-3` on plain `bg-sp-bg-sunken`.
   Same rounded-pill shape, same row-of-tags affordance, but one step down
   in size, weight, and a visibly lighter gray ink token — with no label
   distinguishing "these are categories" from "these are skills." This
   same `bg-sp-bg-sunken` + `text-sp-ink-3` combination (vs. Badge's
   `text-sp-ink-2` for its neutral tone) recurs in
   `CandidateListRow.tsx:67`, `RegistrationProgress.tsx:19`, and
   `InternshipForm.tsx:339` — it's a systemic drift, not a one-off typo, but
   those three are outside the student browse/detail surfaces this feedback
   round covered, so they were left alone for now. **Fixed** (student
   surfaces only): `InternshipListRow.tsx`'s skill tags now render through
   `<Badge tone="neutral">` instead of the bespoke span — same size/weight/
   color as the category pill directly above it. `InternshipCard.tsx`'s
   "Matches your skills" row already used `<Badge tone="good">` and needed
   no change.

3. **Application status is shown two different ways on two adjacent
   pages for the exact same data.** `/student/dashboard`'s "Recent
   applications" card shows only a single colored text badge (e.g.
   "shortlisted"). `/applications` (`ApplicationTracker`-style rows) shows
   a full 4-step dot-and-connector progress tracker (Applied → Shortlisted
   → Interviewing → Offered) with completed steps in bold navy and
   remaining steps grayed out. Confirmed live, side by side, for the same
   two seeded applications. This isn't a bug in either page alone, but the
   inconsistency between them is likely part of what reads as "some text
   bold and visible, some faded." **Fixed:** the dashboard's "Recent
   applications" card now reuses `ApplicationStepper` for any non-terminal
   application (matching `/applications`'s own `isTerminal` check), falling
   back to the plain status `Badge` only for `rejected`/`withdrawn`, same as
   the applications page.

### Net-new, not previously captured
- Internship descriptions could state day-to-day expectations more
  plainly — even though `responsibilities[]` renders today, employers may
  be leaving it thin/generic. This is a content-quality problem on the
  employer-posting side, not a missing UI element; consider adding
  guidance/placeholder text on the employer post form's Responsibilities
  field nudging toward specifics (a "what will they actually do each day"
  hint), rather than a student-side platform change.

---

## Fresher/tester feedback round 2 (2026-08-20)

### "Smart Internship Match Score" suggestion — built (2026-08-20)
A fresher suggested ranking internships by how well they match a student's
skills, education, location, work mode, and stipend expectations. Checked
against the backend rather than treating this as net-new:
`match-score.util.ts`'s `scoreStudentMatch()` already does exactly this —
it scores skill overlap plus `StudentPreference` fields (category, mode,
employment type, paid/unpaid, location substring match), and
`InternshipsService.findPublished` already defaults sort to `'relevance'`
using that score whenever a student has skills or any preference set
(`internships.service.ts:237-240`), which is what powers both the
`/internships/browse` default ordering and the dashboard's "Recommended for
you" rail. `matchedSkillTags()` also already surfaces *why* a listing
matched, as the "Matches your skills: …" chip row on `InternshipCard`.
Two real gaps were identified against what was asked for, and both are now
closed:

1. **No numeric stipend-expectation field — fixed.** Added
   `StudentPreference.minExpectedStipend` (nullable integer, rupees/month;
   migration: `migrate-add-min-expected-stipend.ts`), validated in
   `UpdateStudentPreferencesDto` (`@IsInt() @Min(0)`, with `@IsOptional()`
   also accepting an explicit `null` to clear it). It uses the same
   "at least ₹X" floor semantics as the browse page's own stipend filter
   (`meetsStipendFloor()` in `match-score.util.ts`, shared by both
   `scoreStudentMatch` — so it now affects sort order too — and the new
   `computeMatchPercent`). The `STIPEND_PRESETS` list was moved from
   `FilterSidebar.tsx` into `lib/internshipFilters.ts` so the filter and the
   preferences form share the exact same ₹2,000+/5,000+/10,000+/15,000+
   vocabulary instead of drifting. UI: a new "Minimum expected stipend"
   select on `PreferencesCard`, next to Paid/unpaid.
2. **The score itself was invisible — fixed.** Added `computeMatchPercent()`
   — same weighted dimensions as `scoreStudentMatch`, but normalized 0-100
   against only the dimensions a student has actually set (an unset
   preference, or a listing with zero skill tags, is excluded from the
   denominator rather than counted as a miss — a student who's only filled
   in skills isn't punished down to a low score for never touching
   location/mode prefs). Returns `null` — not 0 — when there's no basis to
   score at all, mirroring the existing 0-100-or-null convention already
   used by the employer-side checklist match score
   (`checklist-match.util.ts`). Exposed as `matchPercent` on every
   `/internships` list item. UI: a new `MatchScoreBadge` (tiered — green
   ≥70%, orange ≥40%, gray below, nothing when `null`) on both
   `InternshipCard` and the browse page's `InternshipListRow`, next to the
   category/eligibility badges.

Verified end-to-end against the running app, not just typechecked: set
`minExpectedStipend` via `PATCH /students/me/preferences` for a seeded
demo student, confirmed it persisted and round-tripped through the
preferences form UI, and confirmed `/internships` returned varying
`matchPercent` values (correctly `null`-free once skills/preferences were
set) with the badge rendering at the expected tier on the live browse page.

### Scope note on the accompanying 26-section QA report
A much larger generic QA report was also submitted, written against a full
multi-course "SWAYAM Plus" learning portal (course catalogue, UGC credit
validation, partner-hosted courses and redirects, payments/enrollment,
events, multilingual course content, certificates-on-completion). **That
product doesn't exist in this repo.** Per `frontend/CLAUDE.md`'s scope,
this build is internship-only — three roles (student/employer/admin), no
course catalogue, no payments, no external partner redirects, no events
section, and the "EN" language toggle is already flagged elsewhere in this
doc as decoratively inert. Sections 3, 5, 6, 12, 13, 14, and most of 15 in
that report describe surfaces that would need to be built from scratch as
a different, much larger product, not bugs in what's shipped today.

The parts of that report that *do* map onto this codebase were spot-checked
rather than assumed:
- **Deadline enforcement and duplicate-application blocking are already
  server-side, not just client-side UX** — `applications.service.ts:97`
  (`ForbiddenException` past the deadline) and `:104` (`ConflictException`
  on a repeat apply), both with specific, non-generic messages.
- **Resume/verification-document uploads already enforce a server-side MIME
  allowlist** (`file-filter.util.ts`), not an extension check — covers the
  report's "invalid document upload" scenario.
- **Empty search/filter results already exceed the report's own suggested
  bar.** `/internships/browse` doesn't show a bare "no results" — it falls
  back to a broader same-category (or newest) result set plus a "request an
  internship we don't have" form (`app/internships/browse/page.tsx:62-69`).
- Items from the report that genuinely apply here and are already tracked
  elsewhere in this doc, not re-litigated: no real OTP resend (Cross-cutting
  section), employer-name keyboard-accessibility gap (priority list #10),
  no pagination on `/applications` (Student journey, Medium).
- Not independently verified this round (would need dedicated passes, not
  assumed from a code read): multi-network/load performance, screen-reader
  behavior beyond the one keyboard-focus gap already found, and session-
  expiry/concurrent-session behavior.

---

## Fresher feedback round 3 — live demo, intern-demo.lynkstr.com (2026-08-20)

Positive feedback on filtering, sort-by-stipend/deadline (both already
covered above), and specifically called out the "submit a request" feature
as a differentiator — confirmed real: `RequestInternshipForm` posts to
`/internship-requests` when a student can't find a category they want,
surfaced both inline on `/internships/browse` and in its empty-state
fallback (`app/internships/browse/page.tsx:205,234`). Two flagged issues,
checked against the live site rather than assumed:

- **"Some buttons and links could benefit from clearer labeling"** — too
  vague to map to one spot with confidence, but this restates ground
  already covered earlier in this doc rather than surfacing something new:
  nav says "login," destination pages say "registration" (Cross-cutting);
  dead footer `/#faq`/`/#contact`/`/#terms`/`/#privacy` links (priority #6);
  inert dark-mode/language controls (Cross-cutting); "Post an internship"
  shown to already-logged-in students (Student journey, Low). Not
  re-added as new findings.
- **"A few pages take slightly longer to load"** — checked raw response
  time against the live URL directly (`curl -w time_total`): homepage,
  `/internships`, `/internships/browse`, an internship detail page, and the
  `/api/v1/internships` endpoint itself all returned in well under 150ms
  from here, so this isn't backend/DB latency. The more likely explanation
  is client-side: `/student/dashboard` is a `'use client'` page with **two
  sequential round trips** before it renders anything real —
  `app/student/dashboard/page.tsx:69-77` fetches `/students/me` alone in
  its own `useEffect`, and the second `useEffect` (`:79-98`) explicitly
  waits for that to resolve (`missingFields !== null` gate) before firing
  its `Promise.all` of three more endpoints (dashboard stats, applications,
  recommended internships) — on top of `useSavedInternships`/
  `useSavedSearches` each firing their own independent fetch on mount. On a
  fast connection (like this check) that's invisible; on a slower mobile
  connection it compounds into a real, noticeable delay before the
  dashboard shows anything but a loading state. **Fixed:** collapsed the two
  `useEffect`s into one — the `/students/me` call and the `Promise.all` of
  the other three now fire together instead of the second waiting on the
  first (`app/student/dashboard/page.tsx:69-98`). The "complete your
  profile" branch still renders as soon as `/students/me` alone resolves
  (unchanged behavior/speed for that path); the profile-complete path now
  starts all four requests concurrently instead of paying two sequential
  round trips. Verified live: captured `Network.requestWillBeSent` timing
  via CDP before/after — all four `/api/v1/...` calls (plus
  `/saved-searches/me`) now fire within the same ~1ms window instead of a
  visible first-batch/second-batch gap, and both the complete-profile and
  incomplete-profile dashboard states still render correctly.
