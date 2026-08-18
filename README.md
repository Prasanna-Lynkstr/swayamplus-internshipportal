# SWAYAM Plus — Internship Module

This repo is restructured under `modules/internship/` so it can be dropped
in-place into the SwayamPlus core monorepo (see
`modules/internship/docs/SWAYAM_PLUS_INTEGRATION_SPEC.md` for the full
integration plan and open questions).

Until that merge happens, this is still run and developed as a standalone
app from within `modules/internship/`:

- `modules/internship/backend` — NestJS/Bun API
- `modules/internship/frontend` — Next.js app
- `modules/internship/docs` — specs, audits, integration plan
- `modules/internship/deploy` — standalone VPS deploy (systemd/nginx) for
  the current demo; not part of what carries over to SwayamPlus

See `modules/internship/README.md` for setup/run instructions.
