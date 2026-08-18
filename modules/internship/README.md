# SWAYAM Plus Internship Platform (MVP)

A standalone internship platform for the SWAYAM Plus portal: students discover and
apply to internships, employers post them after admin verification, and admins
govern the platform. Visually matched to
[swayamplus.education.gov.in](https://swayamplus.education.gov.in/) (colors, type,
header/nav/footer structure verified against the live site's CSS bundles — see
`frontend/app/globals.css` for the sourced tokens).

## Stack

- **Backend**: Bun + NestJS 11 + Sequelize 7 (`@sequelize/core` + `@sequelize/postgres`
  — the actively-maintained scoped v7 packages; the legacy `sequelize` npm package's
  own v7 alpha branch has been dormant since 2022) + PostgreSQL
- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS 4

## Roles

- **Student** — registers via OTP, builds a profile (resume, skills, college),
  browses/filters internships, applies, tracks application status.
- **Employer** — registers via OTP, submits an org profile + verification document,
  waits for admin approval, then posts/publishes internships and reviews applicants.
- **Admin** — seeded out-of-band (email + password, not OTP). Approves/rejects/
  suspends employers, toggles platform-wide settings (registration open/closed,
  auto-approve).

## Running it locally

### 1. Database

```bash
psql -c "CREATE DATABASE swayamplus_internship;"
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # edit DB_USER/DB_PASSWORD/ADMIN_* for your local Postgres
bun install
bun run seed:admin      # creates the admin account from ADMIN_EMAIL/ADMIN_PASSWORD
bun run start:dev       # http://localhost:4000/api
```

### 3. Frontend

```bash
cd frontend
bun install
bun run dev              # http://localhost:3000
```

`frontend/.env.local` already points `NEXT_PUBLIC_API_URL` at
`http://localhost:4000/api`.

### 4. Try it

- Student: `/register/student` → OTP (printed to the backend console, and returned
  in the response body outside production) → complete profile → `/internships`.
- Employer: `/register/employer` → OTP → org profile + verification document upload
  → wait for admin approval.
- Admin: `/admin/login` (the seeded email/password) → `/admin/employers` → approve →
  toggle registration open/closed from the same page.
- Once approved, the employer can post + publish from `/employer/post` and
  `/employer/dashboard`; students can apply from an internship's detail page and
  track status at `/applications`.

## API surface

See `backend/src/modules/*` — one module per resource (`auth`, `students`,
`employers`, `admin`, `platform-settings`, `internships`, `applications`,
`internship-requests`, `notifications`), matching the endpoints in the original
spec. All mutating endpoints enforce ownership in the service layer (a student
only ever touches their own applications; an employer only ever touches their
own listings/applicants).

`GET /internships` is paginated for scale — it returns
`{ items, total, page, pageSize, totalPages }` rather than a bare array, and
accepts `page`, `pageSize` (max 100), `category`, `employmentType`, and `sort`
(`newest` | `stipend_high` | `deadline_soon`) query params alongside the
existing filters. `GET /internships/categories` returns `[{ category, count }]`
for the full closed taxonomy (`backend/src/common/constants/categories.ts`,
mirrored in `frontend/lib/categories.ts`) — including zero-count categories —
to drive the browse-page chip row and the post-internship form's dropdown.

An internship's `category` is a closed enum (not free text); `skillTags`,
`responsibilities`, `perks`, and `eligibility` remain free-text string arrays.
A "paid" internship is derived from `stipendMin`/`stipendMax` being set rather
than stored as its own column.

### Judgment calls worth knowing about

- **`employmentType` (full-time/part-time)** — referenced throughout the
  browse/detail page spec (filter bar, card meta row, "Type/Timing" info card)
  but not listed as its own field in the original data-model spec. Added it as
  a real column rather than reusing `mode` (remote/onsite/hybrid), since the
  two are independent dimensions.
- **Share / Save / Add-to-calendar icons** on cards and the detail page are
  real, working features scoped to what's actually buildable without new
  backend surface: share uses the Web Share API (falling back to a clipboard
  copy), save is a `localStorage`-backed per-browser bookmark list
  (`frontend/lib/useSavedInternships.ts`), and the calendar icon opens a
  prefilled Google Calendar event for the application deadline. None of these
  are decorative no-ops.
- **The "Filters" pill** in the filter bar shows the active-filter count and
  doubles as a real "clear all" action, rather than opening a separate
  slide-out panel duplicating the adjacent dropdowns.
- Compensation tab, reviews/ratings, FAQs & Discussions, and a
  report-an-issue flow are explicitly out of scope for this MVP (they need
  moderation/abuse-handling beyond a 4-week build) — the detail page is a
  single scrolling section specifically so a tabbed version can be added
  later without a rewrite.

## Stubbed for later

These are intentionally minimal for the MVP and are the first things to replace
before this module runs anywhere beyond local/dev:

- **OTP delivery** — `backend/src/modules/auth/auth.service.ts` logs the OTP to the
  console and returns it in the response when `NODE_ENV !== 'production'`. Replace
  with a real provider (SES, SMTP, Twilio, etc.) behind the same
  `AuthService.requestOtp` method.
- **Email notifications** — `backend/src/modules/notifications/notifications.service.ts`
  sends real email via SMTP (any standard provider — ZeptoMail, SES, Mailgun,
  Postmark, etc.) once `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM` are
  set in `.env` (see `.env.example` for ZeptoMail-flavored example values).
  Falls back to a console-log stub when `SMTP_HOST` is empty. Also gated by
  the "Email notifications" toggle on `/admin/employers`
  (`platform_settings.emailNotificationsEnabled`) — an admin can pause all
  outbound email at runtime without touching env vars or redeploying; both
  the env config and the toggle must be on for a real send to happen.
- **File storage** — resumes and employer verification documents go through a
  `StorageService` swap boundary (`backend/src/modules/storage/`), toggled by the
  `STORAGE_DRIVER` env var: `local` (default) writes to disk under
  `backend/uploads/`; `r2` uploads to Cloudflare R2 via its S3-compatible API (set
  `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` /
  `R2_PUBLIC_URL`). No controller/service code changes needed to switch — `local`
  is still the right default for a single-instance dev/demo deploy; switch to `r2`
  once files need to survive across instances or redeploys.
- **Auth/SSO swap-in point** — the entire OTP flow is isolated behind
  `AuthService.requestOtp` / `AuthService.verifyOtp` (plus the admin's separate
  `adminLogin`) in `backend/src/modules/auth/`. Every other module only depends on
  `JwtAuthGuard` / `RolesGuard` and the `{ sub, identifier, role }` JWT payload
  shape. When SWAYAM Plus unifies sign-on across modules, swap the internals of
  `AuthModule` (and the two OTP-driven frontend pages,
  `frontend/app/register/student` and `frontend/app/register/employer`) — no other
  module should need to change.

## Notes on the stack choices

- Sequelize 7 is still alpha (`7.0.0-alpha.48` as of this build) — the models in
  `backend/src/database/models/` use its class + decorator API
  (`@sequelize/core/decorators-legacy`). A custom `DatabaseModule` wires it into
  Nest's DI directly (`backend/src/database/`) rather than depending on
  `@nestjs/sequelize`, which targets `sequelize-typescript` and may lag behind the
  v7 rewrite.
- TypeScript resolved to its latest major (7.x, the Go-ported compiler) via `bun
  install`; both projects run through Bun's/Next's own transpilers rather than
  `tsc`, so this only affects the optional `bun run typecheck` script, not runtime
  behavior.
- Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` — see
  `frontend/proxy.ts` (UX-only route gating; the backend guards are the real
  authorization boundary).
