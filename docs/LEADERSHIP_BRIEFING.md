# SWAYAM Plus Internship Platform — Leadership Briefing Pointers

**One-line summary:**
A standalone internship marketplace connecting students, employers, and platform admins — built to be visually and structurally consistent with the SWAYAM Plus portal, with auth designed as a swappable module for future unified SSO.

**Problem it solves:**
- Students face fragmented internship discovery and low visibility to employers
- Employers (especially MSMEs) struggle to find and evaluate early-career talent
- No existing system gives admins/policymakers visibility into participation, demand, or outcomes

**Student features:**
- OTP-based registration (no password) with a completeness-gated profile (name, education, resume, skills) required before applying — ensures every application is actually reviewable
- Browse/search/filter internships by category, location, work mode, and skill tags
- Apply with a cover note; track status end-to-end (applied → shortlisted → interviewing → offered/rejected)
- Personal dashboard: application counts, in-progress count, offers, recent activity
- Withdraw an active application; save/bookmark listings; calendar/share integration
- "Can't find what you're looking for?" — logs unmet demand for a category as a signal to admin

**Employer features:**
- OTP-based registration with organization profile + verification document upload, gated by admin approval before posting is allowed
- Full internship lifecycle: create (as draft) → publish → close → reopen, plus edit and hard-delete (delete blocked once there are applicants, with a confirm-before-you-proceed prompt on both close and delete)
- Rich listing fields: skills, eligibility, perks, responsibilities, stipend range, duration, deadline (capped at 90 days out)
- Review applicants, move them through status stages, with automatic email notifications to students
- Employer dashboard: internships posted, applications received, awaiting-review count, verification status

**Admin features:**
- Platform dashboard: student/employer/internship/application totals, 7-day sign-up trend, status breakdowns, actionable "needs your attention" queue
- Approve/reject employer verification with document review
- Full searchable, paginated visibility into all internships and all students platform-wide
- Review logged internship-demand requests (unmet student demand by category)
- Platform-wide settings: employer registration open/closed, email notifications on/off (with SMTP provider swap-in — ZeptoMail, SES, etc.)

**Tech stack:**
- Backend: Bun runtime + NestJS 11 + Sequelize 7 + PostgreSQL
- Frontend: Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- Auth: OTP-based, isolated behind a swap boundary for future unified SSO
- File storage: local disk or Cloudflare R2 (S3-compatible), swappable via config, no code change
- Email: SMTP, provider-agnostic

**Engineering rigor (worth a slide of its own):**
- API versioning (`/api/v1`), auto-generated OpenAPI/Swagger docs, health-check endpoint for orchestration
- Global input validation and a consistent error-response shape across the whole API
- Pagination + search on every admin/list endpoint — built for scale, not just a demo
- DB indexing and connection pooling sized via config
- Security hardening: fixed an IDOR (unauthorized access to draft listings) and a password-hash leak found during audit; server-side file-type allowlisting; ownership checks on every mutating and single-object-read endpoint
- Config-driven throughout — no hardcoded secrets, limits, or environment-specific values

**Current status:**
- Milestone 1 (MVP) complete against the full product roadmap, including its own stated success criteria
- Verified via both automated and live browser-driven QA across all three roles
- Living requirements-spec + gap-analysis document tracks exactly what's built vs. pending for future milestones (intelligent matching, employability scoring, DigiLocker integration, AI-assisted features)
