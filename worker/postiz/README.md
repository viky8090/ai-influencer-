# Postiz deployment runbook (Vymotion social publishing backend)

Vymotion's social publishing (PRD N13, §12.8) is powered by a **self-hosted,
unmodified** [Postiz](https://github.com/gitroomhq/postiz-app) instance
(AGPL-3.0). The Worker talks to it only over the Public API
(`/api/public/v1/*`); users never see Postiz. **Never patch the image** —
config/env only — or the AGPL requires publishing the fork.

## What runs where

- **Postiz** (Docker: app + PostgreSQL + Redis + Temporal + Elasticsearch) →
  an Oracle Cloud **Always Free** Ampere A1 VM, exposed at
  `https://postiz.vymotion.org` through a `cloudflared` tunnel.
- **Vymotion Worker** → calls it with the `POSTIZ_API_KEY` secret;
  base URL in `wrangler.toml` `POSTIZ_API_BASE` (already set).

Every image in the stack (postiz-app, postgres, redis, elasticsearch 7.17,
all three temporal images) publishes **arm64**, so Ampere A1 is fully supported.

## Files in this directory

| File | Goes where | Tracked? |
|---|---|---|
| `postiz.env.example` | template | yes |
| `postiz.env` | the VM, as `<compose-dir>/.env` | **no** — gitignored, real secrets |
| `docker-compose.override.yaml` | the VM, next to the upstream compose file | yes |

## 1. Provision the VM (Oracle Cloud console)

Compute → Instances → Create:

- **Shape:** `VM.Standard.A1.Flex`, **4 OCPU / 24 GB RAM** — the entire Always
  Free ARM allotment. The stack idles around 6–8 GB, so don't go below 12 GB.
- **Image:** Canonical Ubuntu 24.04 (**aarch64** build).
- **Boot volume:** 100 GB (Always Free covers 200 GB total block storage).
- **SSH:** upload your public key; save the private key.

> **"Out of host capacity"** is the normal first response for A1 — the free ARM
> pool is heavily contested. Retry across each availability domain, and retry
> over hours; it is a capacity error, not a misconfiguration. Nothing below
> depends on which AD you land in.

You do **not** need to open any VCN ingress rule beyond the default SSH. The
tunnel in step 4 is outbound-only, which is also why the Oracle Ubuntu image's
restrictive default `iptables` rules never come into play.

## 2. Install Docker + one kernel setting

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # then log out and back in
```

Elasticsearch 7.17 refuses to start on the default map count. Set it before
first boot of the stack, or `temporal-elasticsearch` crash-loops with
`max virtual memory areas vm.max_map_count [65530] is too low`:

```bash
echo 'vm.max_map_count=262144' | sudo tee /etc/sysctl.d/99-elasticsearch.conf
sudo sysctl --system
```

Docker Compose must be **≥ 2.24.4** — the override file uses the `!override`
YAML tag. `docker compose version` to confirm (get.docker.com ships current).

## 3. Get the stack + Vymotion config

```bash
git clone https://github.com/gitroomhq/postiz-docker-compose ~/postiz
cd ~/postiz
```

The canonical `docker-compose.yaml` and the Temporal `dynamicconfig` live in
that repo. **Do not copy a snapshot** — services and images change between
releases, and leaving it pristine keeps `git pull` upgrades clean.

Copy both Vymotion files from this directory onto the VM:

```bash
# from your machine
scp worker/postiz/docker-compose.override.yaml ubuntu@<vm-ip>:~/postiz/
scp worker/postiz/postiz.env                   ubuntu@<vm-ip>:~/postiz/.env
```

Note the rename: `postiz.env` **must** land as `.env`, because Compose reads
that filename for the `${VAR}` interpolation the override file relies on.

> **Why an override file rather than `env_file:`** — the upstream compose
> declares an inline `environment:` block, and in Compose `environment:`
> beats `env_file:`. Adding `env_file:` alone silently drops `MAIN_URL`,
> `JWT_SECRET`, `DATABASE_URL`, `STORAGE_PROVIDER`, `API_LIMIT` and the rest,
> leaving the container on `localhost:4007` with local-disk storage. The
> override sets `environment:` directly, which does win. This is configuration,
> not a patch — the AGPL boundary is unaffected.

Before starting, fill in the two R2 credential placeholders in `.env`
(`CLOUDFLARE_ACCESS_KEY`, `CLOUDFLARE_SECRET_ACCESS_KEY`) — see step 6.
Then:

```bash
docker compose config | head -40   # sanity: MAIN_URL must read https://postiz.vymotion.org
docker compose up -d
docker compose ps
```

Postiz listens on `127.0.0.1:4007` only. Temporal UI is on `127.0.0.1:8080` —
never expose it.

## 4. Public HTTPS via cloudflared (required for social OAuth callbacks)

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

cloudflared tunnel login                              # opens a browser link; pick vymotion.org
cloudflared tunnel create postiz                      # note the tunnel UUID
cloudflared tunnel route dns postiz postiz.vymotion.org   # creates the proxied CNAME
```

`/etc/cloudflared/config.yml`:

```yaml
tunnel: postiz
credentials-file: /home/ubuntu/.cloudflared/<TUNNEL-UUID>.json
ingress:
  - hostname: postiz.vymotion.org
    service: http://localhost:4007
  - service: http_status:404
```

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
curl -sI https://postiz.vymotion.org | head -1   # expect 200
```

TLS terminates at Cloudflare; the VM keeps zero public inbound ports.

## 5. First-run setup (Postiz UI)

1. Open `https://postiz.vymotion.org`, register the **admin account**
   (vikranty301@gmail.com). This is the ONE organization all Vymotion
   channels live in.
2. Set `DISABLE_REGISTRATION=true` in `.env`, then
   `docker compose up -d` — nobody else must be able to sign up.
3. **Settings → Developers → Public API** → generate the API key, then from
   the repo root on your machine:
   ```bash
   cd worker && npx wrangler secret put POSTIZ_API_KEY
   ```
4. Sanity check:
   ```bash
   curl -H "Authorization: <key>" https://postiz.vymotion.org/api/public/v1/integrations
   ```
   → `[]` (200). Vymotion's `/publish` page flips from "almost ready" to the
   calendar as soon as this key exists — no redeploy needed, the Worker reads
   the secret at request time.

## 6. Storage — Cloudflare R2 (bucket already created)

`vymotion-postiz` exists with public access enabled at
`https://pub-bb7fd3e938d7464d82d568f802023406.r2.dev` (already in `.env` as
`CLOUDFLARE_BUCKET_URL`). It is deliberately public because social platforms
fetch media from it server-side; it only ever holds media being published.

Still needed: an **R2 API token** (dashboard → R2 → Manage API Tokens →
Object Read & Write, scoped to `vymotion-postiz`). Put its Access Key ID and
Secret Access Key into `.env` as `CLOUDFLARE_ACCESS_KEY` /
`CLOUDFLARE_SECRET_ACCESS_KEY`. Keep it separate from `vymotion-assets`.

## 7. Platform developer apps (v1 quick wins)

Add each credential to `.env` and `docker compose up -d`. Callback URLs are
`https://postiz.vymotion.org/api/integrations/social/<provider>` — check each
provider page at https://docs.postiz.com/providers for the exact value.

| Platform | Where | Env vars | Review time |
|---|---|---|---|
| X | developer.x.com (free tier OK to start) | `X_API_KEY`, `X_API_SECRET` | instant |
| LinkedIn | developer.linkedin.com app | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | ~1 day |
| Bluesky | none (AT-proto app password) | — | instant |
| Mastodon | none (per-instance OAuth) | `MASTODON_URL` (default instance) | instant |
| Pinterest | developers.pinterest.com app | `PINTEREST_CLIENT_ID`, `PINTEREST_CLIENT_SECRET` | trial instant |

**Phase D (later):** Meta app (Instagram, Facebook, Threads), TikTok, YouTube —
each needs the platform's app review (weeks). Once the env vars land, the
platforms appear in Vymotion automatically; zero Worker changes. Note that
Bluesky and Mastodon need credential forms Postiz only offers in its own UI,
so they are not in the Worker's `CONNECTABLE` list for v1.

## 8. Operations

- **Upgrade:** `git pull` in `~/postiz`, then `docker compose pull && docker compose up -d`.
  The override file and `.env` are untracked by that repo, so they survive.
  Read release notes — v2.11→v2.12 required a Temporal migration.
- **Backups:** the Postgres volume holds channels + OAuth tokens + schedules.
  `docker exec postiz-postgres pg_dump -U postiz-user postiz-db-local > backup.sql` (cron it).
- **Rate limit:** `API_LIMIT=600` (per hour, instance-wide) so the Worker
  never sees 429s.
- **Health:** `curl https://postiz.vymotion.org/api/public/v1/integrations` from
  anywhere; `docker compose ps` on the VM.
- **Oracle idle reclaim:** Always Free compute can be reclaimed when idle. This
  stack keeps steady CPU/network, which normally avoids it, but keep the
  Postgres backup off-box regardless.
