# Deploying to a Vultr VPS (IP-only, plain systemd — no Docker, no domain)

Target: Ubuntu 22.04/24.04 on Vultr, reachable at `http://<VPS_IP>` with no
domain yet. Backend and frontend run as native systemd services; Postgres
runs natively; nginx reverse-proxies both on port 80.

Run every command below **on the VPS**, over SSH. Replace `<VPS_IP>` with
your instance's public IP throughout. Commands assume you're logged in as
`root` (Vultr's default) — prefix with `sudo` if you're on a non-root user
instead.

---

## 0. Known, deliberate tradeoffs for this demo deploy

Read this before you start — these are intentional shortcuts for a demo,
not oversights:

- **No HTTPS / no domain.** Everything is plain `http://<VPS_IP>`. Auth
  cookies aren't marked `Secure`, so this only works over HTTP — don't add
  a domain + Let's Encrypt without also revisiting `lib/auth.tsx`'s cookie
  flags. See "Adding a domain + HTTPS later" at the bottom.
- **Backend `NODE_ENV=development` on purpose.** No SMTP provider is
  configured, so OTPs have nowhere to go except the API response (dev-mode
  behavior — see `backend/src/modules/auth/auth.service.ts`'s `isDev()`
  gate). Flipping to `NODE_ENV=production` without configuring real SMTP
  would silently break every student/employer OTP login, since the OTP
  would only reach the server's console log. Keep this in mind: **anyone
  who can see network traffic to this box can see OTPs in plaintext API
  responses.** Fine for a controlled demo link shared with specific
  people; not something to leave running as a public, indefinitely-lived
  URL. Configure real SMTP + flip to production before this becomes
  anything more than a demo (see bottom section).
- **Single instance, local file storage.** Resumes/verification docs sit on
  this one VPS's disk (`STORAGE_DRIVER=local`). Fine for a demo; won't
  survive a redeploy to a new instance or a move to multiple instances —
  switch to `STORAGE_DRIVER=r2` first if that's coming soon.
- **Sequelize `sync()`, not migrations.** The backend creates/updates
  tables automatically on boot (same as your local dev setup) — there's no
  migration history. Fine here; a real production cutover should introduce
  proper migrations first (tracked as a known gap in
  `docs/DATABASE_OVERHAUL_AUDIT.md`).

---

## 1. Base packages

```bash
apt update && apt upgrade -y
apt install -y git curl build-essential ca-certificates ufw
```

## 2. PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl enable --now postgresql

# Pick a real password here — you'll paste it into backend/.env in step 6.
sudo -u postgres psql <<'SQL'
CREATE DATABASE swayamplus_internship;
CREATE USER swayamplus_app WITH PASSWORD 'CHANGE_ME_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE swayamplus_internship TO swayamplus_app;
\c swayamplus_internship
GRANT ALL ON SCHEMA public TO swayamplus_app;
SQL
```

## 3. A dedicated non-root service user + Bun

Running the app as its own user (not root) is the one bit of hardening
worth doing even for a demo.

```bash
adduser --disabled-password --gecos "" swayamplus

# Install Bun as that user (not root) — the systemd units below point at
# /home/swayamplus/.bun/bin/bun.
su - swayamplus -c "curl -fsSL https://bun.sh/install | bash"
su - swayamplus -c "/home/swayamplus/.bun/bin/bun --version"   # sanity check
```

## 4. Get the code onto the box

```bash
mkdir -p /opt/swayamplus-internship
chown swayamplus:swayamplus /opt/swayamplus-internship
su - swayamplus -c "git clone https://github.com/Prasanna-Lynkstr/swayamplus-internshipportal.git /opt/swayamplus-internship"
```

> **Before this step**, make sure everything you want in the demo is
> actually committed and pushed to `origin/main` — `git clone` only pulls
> what's on the remote, not uncommitted local changes from your dev
> machine. If you're not sure, check `git status` / `git log
> origin/main..HEAD` locally first.

## 5. Install dependencies

```bash
su - swayamplus -c "cd /opt/swayamplus-internship/backend && /home/swayamplus/.bun/bin/bun install"
su - swayamplus -c "cd /opt/swayamplus-internship/frontend && /home/swayamplus/.bun/bin/bun install"
```

## 6. Backend `.env`

```bash
cp /opt/swayamplus-internship/backend/.env.example /opt/swayamplus-internship/backend/.env
chown swayamplus:swayamplus /opt/swayamplus-internship/backend/.env
```

Edit `/opt/swayamplus-internship/backend/.env` (`nano` or your editor of
choice) and set at minimum:

```ini
NODE_ENV=development          # see §0 above for why this stays 'development'

DB_HOST=localhost
DB_PORT=5432
DB_NAME=swayamplus_internship
DB_USER=swayamplus_app
DB_PASSWORD=CHANGE_ME_DB_PASSWORD    # same password from step 2

JWT_SECRET=                   # generate below, paste the output here
CORS_ORIGIN=http://<VPS_IP>

ADMIN_EMAIL=admin@swayamplus.gov.in
ADMIN_PASSWORD=CHANGE_ME_ADMIN_PASSWORD   # don't leave the repo's dev default
```

Generate a real JWT secret rather than leaving the placeholder:

```bash
openssl rand -hex 32
```

Everything else in `.env.example` (OTP limits, pagination, checklist
provider, SMTP) can stay at its documented default for a demo.

## 7. Frontend `.env.local` + build

```bash
cat > /opt/swayamplus-internship/frontend/.env.local <<'EOF'
NEXT_PUBLIC_API_URL=http://<VPS_IP>/api/v1
EOF
chown swayamplus:swayamplus /opt/swayamplus-internship/frontend/.env.local

su - swayamplus -c "cd /opt/swayamplus-internship/frontend && /home/swayamplus/.bun/bin/bun run build"
```

`NEXT_PUBLIC_*` vars are baked into the client bundle at build time — if
you ever change the IP (or move to a domain later), you must rebuild, not
just restart.

## 8. Start the backend, then seed

The backend creates/updates every table on boot (Sequelize `sync()`), so
start it once before seeding — seeding against a database with no tables
yet will fail with "relation does not exist."

```bash
cp /opt/swayamplus-internship/deploy/systemd/swayamplus-backend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now swayamplus-backend

# Confirm it booted clean and connected to Postgres:
systemctl status swayamplus-backend --no-pager
journalctl -u swayamplus-backend -n 50 --no-pager   # look for "Connected to Postgres and synced models"
curl -s http://localhost:4000/health
```

Now seed:

```bash
# Admin account (email+password login — required, not OTP)
su - swayamplus -c "cd /opt/swayamplus-internship/backend && /home/swayamplus/.bun/bin/bun run seed:admin"

# Demo data: ~14 employers (spanning pending/approved/rejected), ~50
# students, ~35 internships, ~130 applications across every status, plus a
# handful of internship requests. Safe to re-run — it no-ops if demo data
# already exists; pass --reset to wipe and reseed.
su - swayamplus -c "cd /opt/swayamplus-internship/backend && /home/swayamplus/.bun/bin/bun run seed:demo"
```

## 9. Start the frontend

```bash
cp /opt/swayamplus-internship/deploy/systemd/swayamplus-frontend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now swayamplus-frontend

systemctl status swayamplus-frontend --no-pager
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
```

## 10. nginx

```bash
apt install -y nginx
cp /opt/swayamplus-internship/deploy/nginx/swayamplus.conf /etc/nginx/sites-available/swayamplus
ln -sf /etc/nginx/sites-available/swayamplus /etc/nginx/sites-enabled/swayamplus
rm -f /etc/nginx/sites-enabled/default

nginx -t          # must print "syntax is ok" / "test is successful"
systemctl enable --now nginx
systemctl reload nginx
```

## 11. Firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw --force enable
ufw status
```

## 12. Verify

```bash
curl -s http://localhost/health          # backend health, via nginx
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/            # frontend, via nginx
```

Then from your own machine: open `http://<VPS_IP>` in a browser. Log in
to `/admin/login` with the admin email/password from step 6 and confirm
the dashboard shows the seeded students/employers/internships/applications
counts and the activity timeline chart.

---

## Redeploying after a code change

```bash
su - swayamplus -c "cd /opt/swayamplus-internship && git pull"
su - swayamplus -c "cd /opt/swayamplus-internship/backend && /home/swayamplus/.bun/bin/bun install"
su - swayamplus -c "cd /opt/swayamplus-internship/frontend && /home/swayamplus/.bun/bin/bun install && /home/swayamplus/.bun/bin/bun run build"
systemctl restart swayamplus-backend
systemctl restart swayamplus-frontend
```

**One-time, for the internship-uuid change:** `sequelize.sync({ alter })` only
runs outside production (see `src/database/sequelize.provider.ts`), so it
will never add the new `internships.uuid` column on this server on its own.
Run the migration script once, after `bun install` and before restarting
`swayamplus-backend`:

```bash
su - swayamplus -c "cd /opt/swayamplus-internship/backend && /home/swayamplus/.bun/bin/bun run migrate:internship-uuid"
```

Safe to re-run — every step is idempotent.

## Resetting demo data (e.g. before a fresh demo)

```bash
su - swayamplus -c "cd /opt/swayamplus-internship/backend && /home/swayamplus/.bun/bin/bun run seed:demo --reset"
```

This only touches accounts under `@demo.swayamplus.test` — it never
touches the admin account or anything created through real OTP sign-ups.

---

## Adding a domain + HTTPS later

Once you point a domain at `<VPS_IP>`:

1. Update `server_name _;` in `/etc/nginx/sites-available/swayamplus` to
   your real domain.
2. `apt install -y certbot python3-certbot-nginx && certbot --nginx -d
   yourdomain.example.com` — certbot rewrites the nginx config to add a
   `listen 443 ssl` block and redirect HTTP → HTTPS.
3. Update `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to
   `https://yourdomain.example.com/api/v1`, update `CORS_ORIGIN` in
   `backend/.env` to `https://yourdomain.example.com`, then rebuild the
   frontend and restart both services (see "Redeploying" above).
4. Revisit `lib/auth.tsx`'s cookie flags — add `Secure` now that you're on
   HTTPS.
5. Before calling this production rather than a demo: configure real SMTP
   in `backend/.env` (see the `.env.example` comments for the ZeptoMail/any-
   SMTP-provider example), flip `NODE_ENV=production`, and re-test the
   student/employer OTP flows end to end — that flip silently breaks OTP
   delivery if SMTP isn't actually wired up first.

---

## Troubleshooting

- **`bun run build` (frontend) gets killed / "Killed" with no other error.**
  Usually an out-of-memory `next build` on a 1GB-RAM Vultr plan. Add swap
  before retrying:
  ```bash
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ```
- **`seed:admin`/`seed:demo` fail with `relation "users" does not exist`.**
  The backend hasn't booted yet (it's what creates the tables). Do step 8's
  `systemctl enable --now swayamplus-backend` first, confirm `journalctl -u
  swayamplus-backend` shows "Connected to Postgres and synced models," then
  re-run the seed commands.
- **Backend fails to start with a Postgres auth error.** Double-check
  `DB_PASSWORD` in `backend/.env` matches what you set in step 2, and that
  `DB_USER=swayamplus_app` (not `postgres`) — the app user was granted
  privileges on the `swayamplus_internship` database specifically, not
  superuser access.
- **`nginx -t` fails after copying the config.** Make sure you removed
  `/etc/nginx/sites-enabled/default` (a stock Ubuntu nginx install ships a
  default site listening on port 80 too, which conflicts).
- **Frontend loads but every API call fails / shows a network error.**
  Almost always a stale build: `NEXT_PUBLIC_API_URL` is baked in at build
  time, so if you typo'd the IP in step 7 you must fix `.env.local` and
  `bun run build` again — restarting the service alone won't pick it up.
- **You changed `.env` but nothing changed.** `systemctl restart
  swayamplus-backend` — `EnvironmentFile` is only read on start, not
  hot-reloaded.
