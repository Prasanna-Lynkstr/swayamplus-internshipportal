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
