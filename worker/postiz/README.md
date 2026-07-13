# Postiz deployment runbook (Vymotion social publishing backend)

Vymotion's social publishing (PRD N13, §12.8) is powered by a **self-hosted,
unmodified** [Postiz](https://github.com/gitroomhq/postiz-app) instance
(AGPL-3.0). The Worker talks to it only over the Public API
(`/api/public/v1/*`); users never see Postiz. **Never patch the image** —
config/env only — or the AGPL requires publishing the fork.

## What runs where

- **Postiz** (Docker: app + PostgreSQL + Redis + Temporal) → the owner's server,
  reachable at `https://postiz.vymotion.org`.
- **Vymotion Worker** → calls it with the `POSTIZ_API_KEY` secret;
  base URL in `wrangler.toml` `POSTIZ_API_BASE`.

## 1. Install (on the server)

```bash
git clone https://github.com/gitroomhq/postiz-docker-compose
cd postiz-docker-compose
# The canonical docker-compose.yaml + Temporal dynamicconfig live in that repo.
# Do NOT copy a snapshot — services/images change between releases.
```

Copy `postiz.env.example` from this directory to the server as `postiz.env`
and fill in real values, then in `docker-compose.yaml` point the postiz
service at it (Option B from the docs — env file mounted in /config):

```yaml
services:
  postiz:
    env_file:
      - ./postiz.env
```

Start it: `docker compose up -d`. Frontend on port 4007 (mapped from 5000),
Temporal UI on 8080 (do NOT expose 8080 publicly).

## 2. Public HTTPS (required for social OAuth callbacks)

Point Cloudflare DNS `postiz.vymotion.org` at the server (proxied, TLS via
Cloudflare) with a reverse proxy on the server forwarding :443 → :4007 —
or, if the server has no open ports, use a `cloudflared` tunnel:

```bash
cloudflared tunnel create postiz
cloudflared tunnel route dns postiz postiz.vymotion.org
# config: ingress postiz.vymotion.org → http://localhost:4007
```

`MAIN_URL`/`FRONTEND_URL` = `https://postiz.vymotion.org`,
`NEXT_PUBLIC_BACKEND_URL` = `https://postiz.vymotion.org/api`.
Changed a variable? `docker compose down && docker compose up -d`.

## 3. First-run setup (Postiz UI)

1. Open `https://postiz.vymotion.org`, register the **admin account**
   (vikranty301@gmail.com). This is the ONE organization all Vymotion
   channels live in.
2. Set `DISABLE_REGISTRATION: 'true'` in postiz.env and recreate the
   container — nobody else must be able to sign up.
3. **Settings → Developers → Public API** → generate the API key, then:
   `cd worker && npx wrangler secret put POSTIZ_API_KEY`
4. Sanity check:
   `curl -H "Authorization: <key>" https://postiz.vymotion.org/api/public/v1/integrations`
   → `[]` (200).

## 4. Platform developer apps (v1 quick wins)

Add each credential to postiz.env and recreate. Callback URLs are
`https://postiz.vymotion.org/api/integrations/social/<provider>` — check each
provider page at https://docs.postiz.com/providers for the exact value.

| Platform | Where | Env vars | Review time |
|---|---|---|---|
| X | developer.x.com (free tier OK to start) | `X_API_KEY`, `X_API_SECRET` | instant |
| LinkedIn | developer.linkedin.com app | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | ~1 day |
| Bluesky | none (AT-proto app password) | — | instant |
| Mastodon | none (per-instance OAuth) | `MASTODON_URL` (default instance) | instant |
| Pinterest | developers.pinterest.com app | `PINTEREST_CLIENT_ID`, `PINTEREST_CLIENT_SECRET` | trial instant |

**Phase D (later):** Meta app (Instagram `INSTAGRAM_APP_ID/SECRET`, Facebook
`FACEBOOK_APP_ID/SECRET`, Threads `THREADS_APP_ID/SECRET`), TikTok
(`TIKTOK_CLIENT_ID/SECRET`), YouTube (`YOUTUBE_CLIENT_ID/SECRET`) — each needs
the platform's app review (weeks). Once the env vars land, the platforms appear
in Vymotion automatically; zero Worker changes.

## 5. Storage — Cloudflare R2

Postiz stores uploaded media in R2 (S3-compatible). Create a **separate**
bucket `vymotion-postiz` (do not reuse `vymotion-assets`) on the wrangler
account (`vikranty301@gmail.com`, account `d4e482d6…`), make an R2 API token
(Object Read & Write scoped to that bucket), and enable public access
(r2.dev or custom domain) — `CLOUDFLARE_BUCKET_URL` must be the **public**
base URL because social platforms fetch media from it.

## 6. Operations

- **Upgrade:** `git pull` in postiz-docker-compose, `docker compose pull && docker compose up -d`.
  Read release notes — v2.11→v2.12 required a Temporal migration.
- **Backups:** the Postgres volume holds channels + OAuth tokens + schedules.
  `docker exec postiz-postgres pg_dump -U postiz-user postiz-db-local > backup.sql` (cron it).
- **Rate limit:** `API_LIMIT: 600` (per hour, instance-wide) so the Worker
  never sees 429s.
- **Health:** `curl https://postiz.vymotion.org/api/public/v1/integrations` from
  anywhere; `docker compose ps` on the server.
