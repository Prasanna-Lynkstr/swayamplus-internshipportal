# Database Overhaul — Audit & Cutover Report

Date: 2026-08-14
Status: new database created and wired up; **schema/model redesign not started** — waiting on the new spec.

## 1. What changed today

| Item | Before | After |
|---|---|---|
| Postgres databases on this machine | `swayamplus_internship` | `swayamplus_internship` (untouched) **+** `swayamplus_internship_v2` (new, empty) |
| `backend/.env` `DB_NAME` | `swayamplus_internship` | `swayamplus_internship_v2` |
| `backend/.env.example` `DB_NAME` | `swayamplus_internship` | `swayamplus_internship_v2`, with a comment pointing at this doc |

Steps taken:
1. `createdb -O augustinprasanna swayamplus_internship_v2` — new empty database, same owner role as the original.
2. Switched `backend/.env` (local, gitignored — not committed) to `DB_NAME=swayamplus_internship_v2`.
3. Booted the backend once against the new database. `sequelize.sync({ alter: true })` ran and created the **current** (pre-overhaul) schema — all 8 tables (`users`, `otp_codes`, `students`, `employers`, `platform_settings`, `internships`, `internship_applications`, `internship_requests`) — with 0 rows.
4. Verified the original database is untouched: `swayamplus_internship` still has 34 `users` rows and 14 `internships` rows.

**Net effect:** the app now runs against a blank slate that happens to have today's schema stamped into it (because you asked to cut over immediately, before the new models exist). The old database is fully intact, unmodified, and not referenced by any code path — it's a pure reference copy until you decide what to do with it (archive, drop, or keep as a migration source for specific data like verified employers).

## 2. Audit of the current backend/DB (pre-overhaul)

Stack: NestJS 11 + `@sequelize/core` **7.0.0-alpha.48** (pre-release, not a stable major) + `pg` on Postgres, running on Bun. Frontend is Next.js, talking to the API over REST.

Findings, ranked by relevance to "no technical debt" for the rebuild:

1. **No migrations at all.** Schema is managed entirely by `sequelize.sync({ alter: ... })` (`backend/src/database/sequelize.provider.ts:34`), with a comment acknowledging it: *"No migrations for this MVP — sync brings the schema up to date directly."* This is fine for a throwaway MVP; it is not fine for anything you intend to run in production or evolve incrementally, because:
   - `alter: true` infers schema diffs from decorators and can silently do the wrong thing (drop/retype a column) on ambiguous changes.
   - There's no ordered, reviewable history of schema changes, no down-migration, and no way to know what a given deployed environment's schema actually looks like without introspecting it live.
   - **Recommendation:** for the overhaul, adopt real migrations (Sequelize's own migration runner, or Umzug directly since `@sequelize/core` v7 doesn't ship a CLI yet) from the first model. Models describe the shape; migrations are the audit trail of how you got there.

2. **Sequelize v7 is alpha.** `7.0.0-alpha.48` is a pre-release of a major rewrite (decorator-based, different API surface from v6). Fine to keep using if you've already built expertise in it, but it's worth a deliberate decision rather than inertia — alpha packages can introduce breaking changes between patch releases, and the ecosystem (docs, Stack Overflow, third-party tooling) is thin. Flagging so it's a conscious choice for the rebuild, not a carryover default.

3. **Identity model doesn't match where the spec is going.** `docs/SWAYAM_PLUS_INTEGRATION_SPEC.md` (draft, currently untracked in git) describes students authenticating through SwayamPlus itself, with no separate OTP flow for existing SwayamPlus users. The current schema's `users` + `otp_codes` tables assume this app owns identity end-to-end. Whatever new spec you pass next will very likely need a different `users` shape (federated/linked identity, SwayamPlus user ID as a foreign reference, OTP only for the "new user via module" path) — this is exactly the kind of schema change that would be dangerous to `alter: true` in place, and is a good reason the fresh database matters.

4. **New domain concepts have no schema yet.** The integration spec's v1 scope (resume parsing → extracted skills, skill-ontology match scoring, per-internship evaluation config, batch-computed recommendations) has zero representation in the current 8 models. None of this is "modify an existing table" — it's new tables and likely a new async job/worker concern (batch matching), which the current codebase has no infrastructure for (no queue, no scheduler).

5. **Local file storage won't survive a real cutover.** `STORAGE_DRIVER=local` writes resumes/verification docs to `backend/uploads/` on disk (already gitignored). If the overhaul changes deploy topology at all (multi-instance, containerized, SwayamPlus's own infra), this needs to move to `r2` (already supported, just unconfigured) or whatever SwayamPlus standardizes on — worth deciding early since it touches the `Student`/`Employer` models' file-reference columns.

6. **Env validation is solid and should be kept.** `backend/src/config/env.validation.ts` fails startup loudly on missing/malformed config via Joi — this is the opposite of tech debt, keep this pattern for whatever new env vars the overhaul introduces (ontology API keys, resume-parsing vendor creds, SwayamPlus SSO config, etc.).

7. **Admin seeding is a one-off script, not idempotent migration data.** `backend/scripts/seed-admin.ts` creates the admin user directly against models. Fine to keep as a pattern, but if identity moves to SwayamPlus (see #3), this script's entire premise (local admin credentials in `.env`) may not apply — re-evaluate once the new spec defines how admin/staff accounts work.

## 3. Recommended sequence for the actual overhaul (once the new spec lands)

1. **Design new models against the new spec from scratch** — don't patch the existing 8 models. Given the identity and domain shifts above, patching would just relocate the technical debt rather than remove it.
2. **Stand up migrations before the first model lands** (Umzug or Sequelize's migration runner) — every schema change from here on goes through a migration file, `sync()`/`alter` gets removed from `sequelize.provider.ts` entirely.
3. **Drop and recreate `swayamplus_internship_v2`** right before building the real schema, so it's not carrying today's stamped-in old-schema tables — that sync run was only useful as a connectivity/cutover smoke test, not a schema you want to build on top of.
   ```
   dropdb swayamplus_internship_v2 && createdb -O augustinprasanna swayamplus_internship_v2
   ```
4. **Decide the fate of `swayamplus_internship`** (the original) explicitly: archive via `pg_dump`, keep running read-only for reference during the transition, or drop once you've extracted anything worth carrying forward (e.g. verified employer records, if the new spec wants to preserve them). Don't let "leave it as-is for later reference" silently become "nobody ever revisits it."
5. **Re-run the same audit questions** (migrations, storage driver, identity source, job/queue infra) against the actual new spec once it arrives — this report is a snapshot of pre-overhaul state, not a design for the new one.

## 4. Open items for the next spec pass

When you pass the new spec, the audit should specifically resolve:
- Final identity model (federated SwayamPlus auth vs. local) and what happens to `users`/`otp_codes`.
- Whether resume parsing + skill ontology are synchronous (request/response to a vendor API) or need a persisted job table + worker.
- Storage driver decision (`local` vs `r2`) before any file-bearing model is written.
- Migration tooling choice (Umzug vs. waiting for `@sequelize/core` v7 stable tooling vs. dropping to v6).
