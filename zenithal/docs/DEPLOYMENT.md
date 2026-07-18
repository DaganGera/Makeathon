# Zenithal — Deployment

Two very different meanings of "deploy" are covered here. Pick the one you need.

1. **[Demo access for judges](#1-demo-access-for-judges-what-is-live-right-now)** — a temporary public link so
   judges can open the dashboard on their own device tomorrow. Free, no signup, nothing to maintain
   afterward. **This is what's running right now.**
2. **[Real production deployment](#2-real-production-deployment-post-hackathon)** — an always-on server with a
   real domain, HTTPS, and hardening, for after the event.

---

## 1. Demo access for judges (what is live right now)

**How it works:** [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/)
punch a temporary public HTTPS URL through to a `localhost` port — no account, no signup, no server
rental, nothing left running after you close the window. Two tunnels are used: one for the backend API,
one for the built dashboard (which is configured, at build time, to call the first tunnel's URL instead
of `127.0.0.1`).

### Currently live

| | |
|---|---|
| **Share this with judges** | `https://mug-mit-roommates-glasgow.trycloudflare.com` |
| Backend (API/WS), for reference | `https://civil-grown-burke-thru.trycloudflare.com` |

Verified end-to-end just now: dashboard loads over the tunnel, direct-navigating to `/dashboard` works
(SPA routing), a live URL scan through the tunneled API returns a correct verdict, and the WebSocket
live-feed connection upgrades successfully over `wss://`.

### One important fact about quick tunnels

Cloudflare's own terms: *"these account-less Tunnels have no uptime guarantee."* In practice they're
solid for a demo, but **the URL changes every single time the tunnel process restarts**, and **closing
any of the 4 PowerShell windows this opened kills that piece.** Don't close them until judging is done.

### If a window gets closed / the link dies

Re-run the one-command script from the repo root:
```powershell
powershell -ExecutionPolicy Bypass -File deploy_demo_tunnel.ps1
```
It restarts the backend, opens both tunnels fresh, rebuilds the dashboard pointed at the new backend
URL, and prints a new link to share. Takes about a minute. **Do this once, right before you actually walk
up to present** — don't leave it running unattended for hours beforehand, since a fresher tunnel is a
more reliable one.

### What that script actually does (so you're not surprised)

1. Starts the FastAPI backend on `:8000` and waits for `/api/v1/health` to go green.
2. Opens a Cloudflare quick tunnel to `:8000` → gets a public backend URL.
3. Writes that URL into `dashboard/.env.production` (as `VITE_API_URL` / `VITE_WS_URL`) and runs
   `npm run build` — the dashboard bundle is now hardcoded to call the public backend, not `localhost`.
4. Serves the built `dist/` folder statically on `:4173` (`npx serve -s dist` — `-s` means single-page-app
   mode, so refreshing on `/dashboard` or `/login` doesn't 404).
5. Opens a second quick tunnel to `:4173` → that's the link you share.

`cloudflared.exe` lives in `tools/` (gitignored, ~55MB — the script downloads it once if missing).

### Sanity-check before you walk on stage

```bash
curl -s https://<your-dashboard-tunnel-url>/                                    # should be 200
curl -s https://<your-backend-tunnel-url>/api/v1/health                          # should show all models "loaded"/"active"
python demo/simulate_attack.py --base https://<your-backend-tunnel-url> --speed 0.3
```
That last one populates the feed/map with a live-looking demo burst before anyone opens the link.

---

## 2. Real production deployment (post-hackathon)

Everything below is already built and opt-in — see **`docs/PRODUCTION.md`** for the full reference
(env vars, Redis cache, Sentry, scaling recipe). Summary of the path from "runs on my laptop" to
"always-on with a real domain":

### Step 1 — Pick a host
A small VPS (Hetzner, DigitalOcean, a $5–6/mo droplet) is the simplest fit — this is a single-box
FastAPI + SQLite/Postgres + static-frontend app, not a service that needs a managed platform.

### Step 2 — Containerize
```bash
docker compose up --build      # backend :8000, dashboard :8080 (see docker-compose.yml)
```

### Step 3 — Swap SQLite → Postgres, add Redis (optional but recommended past demo scale)
```bash
DATABASE_URL=postgresql+asyncpg://user:pass@db-host:5432/zenithal
REDIS_URL=redis://redis-host:6379/0
```
No code changes needed — both are opt-in via env vars (SQLAlchemy async + a Redis-or-in-process cache
that never errors if Redis is absent).

### Step 4 — Turn on auth (off by default for demo reliability)
```bash
REQUIRE_API_KEY=true
API_KEYS=key-for-alice,key-for-bob
```
Dashboard read-only endpoints stay open so the UI works without a key; `/analyze/*` and `/ip/*` require
`X-API-Key`.

### Step 5 — Real domain + HTTPS
Terminate TLS at a reverse proxy in front of the app, not in Python:
```
zenithal.example.com {
    reverse_proxy /api/*  backend:8000
    reverse_proxy         dashboard:80
}
```
(Caddy example — auto-HTTPS. nginx + certbot works identically.)

### Step 6 — Alerts + error monitoring (optional)
```bash
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...   # or Telegram
SENTRY_DSN=https://...ingest.sentry.io/...
```

### Step 7 — Keep the threat feeds current
The scheduled task is already set up locally (`backend/scheduled_update.ps1`, Windows Task Scheduler,
daily 03:00) — replicate as a cron job on the real server:
```
0 3 * * * cd /app/backend && python training/update_feeds.py
```

### Scaling past a single box
Stateless engines + the batch endpoint (`POST /api/v1/analyze/urls`, up to 1000 URLs/call) mean this
scales horizontally: run several `uvicorn`/`gunicorn` workers behind a load balancer, point them all at
the same Postgres + Redis. For very large async bulk jobs, push URLs onto a Celery/RQ queue and have
workers call `url_engine.analyze()` directly — the detection code is already queue-ready, no rewrite
needed.

**Full reference:** `docs/PRODUCTION.md` (every env var, Docker Compose file, and the full scaling recipe).
