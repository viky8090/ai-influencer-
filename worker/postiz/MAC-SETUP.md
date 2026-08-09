# Mac mini setup, start to finish

Beginner-facing walkthrough for running the Postiz server that powers
Vymotion's `/publish` page on a Mac mini. `README.md` is the terse reference;
`ORACLE-SETUP.md` covers a Linux VM instead (keep it for a future move).

**What you're building:** the Postiz stack running in Docker on your Mac mini,
reachable from the internet at `https://postiz.vymotion.org` through a
Cloudflare tunnel. It holds your social account connections and fires your
scheduled posts.

**Cost:** nothing.

**The one rule:** scheduled posts only fire while the Mac is awake and Docker
is running. Part 7 makes that reliable — don't skip it.

---

## Part 1 · Fill in the R2 credentials (do this on Windows, first)

The bootstrap refuses to run until this is done, because Postiz would start
fine and then fail on every single media upload — a confusing thing to debug
later.

1. Cloudflare dashboard → **R2** → **Manage API Tokens** → **Create API Token**.
2. Permission **Object Read & Write**, scoped to the **`vymotion-postiz`**
   bucket only.
3. Open `worker/postiz/postiz.env` and replace the two placeholders:
   ```
   CLOUDFLARE_ACCESS_KEY=<Access Key ID>
   CLOUDFLARE_SECRET_ACCESS_KEY=<Secret Access Key>
   ```

The bucket itself already exists with public access enabled — you only need
the token.

---

## Part 2 · Install Docker Desktop on the Mac

1. Download from <https://www.docker.com/products/docker-desktop/> — pick the
   **Apple Silicon** build (Intel build if it's an older Intel mini).
2. Install, open it, and wait for the whale icon in the menu bar to stop animating.
3. **Settings → Resources → Memory:** raise to **10 GB**. The default is too
   small for this stack and it will thrash. Click **Apply & Restart**.
4. **Settings → General:** tick **Start Docker Desktop when you sign in**.

Also make sure the developer tools are present — run this in **Terminal**
(Applications → Utilities → Terminal). If macOS offers to install command line
tools, accept:

```bash
git --version
```

---

## Part 3 · Get the files onto the Mac

Three files need to reach the Mac. Make a folder for them first:

```bash
mkdir -p ~/postiz-config && cd ~/postiz-config
```

**The two safe files** — `docker-compose.override.yaml` and `bootstrap.sh` —
contain no secrets, so move them however is easiest: USB stick, Google Drive,
email to yourself. Put both in `~/postiz-config/`.

**The secrets file** — do *not* put this one in cloud storage or email. Type
this on the Mac to open a blank file:

```bash
nano ~/postiz-config/postiz.env
```

Then on Windows open `worker/postiz/postiz.env`, select all, copy — and paste
into the Terminal window (**⌘V**). Save with **Ctrl+O**, **Enter**, then exit
with **Ctrl+X**.

Check all three arrived:

```bash
ls -l ~/postiz-config
```

---

## Part 4 · Run the installer

```bash
cd ~/postiz-config && bash bootstrap.sh
```

It checks Docker's memory, fixes the Elasticsearch kernel setting, fetches the
Postiz stack into `~/postiz`, validates the merged config, and starts
everything. First run downloads several GB — expect a few minutes. Safe to
re-run if it's interrupted.

Success looks like `==> Postiz is up.` followed by a table of running
containers. Confirm in a browser on the Mac: <http://localhost:4007> shows the
Postiz login page.

> It deliberately refuses to start if the config didn't merge correctly — in
> particular if port 4007 would be published more than once, which is the
> failure mode that would expose the instance to your whole network.

---

## Part 5 · Put it on the internet (cloudflared tunnel)

This gives `postiz.vymotion.org` a real HTTPS address without opening any port
on your router. Social platforms need it for their OAuth callbacks.

If you don't have Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then:

```bash
brew install cloudflared
cloudflared tunnel login
```

That opens your browser — sign in to Cloudflare and pick **vymotion.org**. Back
in Terminal:

```bash
cloudflared tunnel create postiz          # prints a UUID — copy it
cloudflared tunnel route dns postiz postiz.vymotion.org
```

Create the config file:

```bash
nano ~/.cloudflared/config.yml
```

Paste this, replacing both `<UUID>` and `<your-mac-username>` (run `whoami` if
unsure):

```yaml
tunnel: <UUID>
credentials-file: /Users/<your-mac-username>/.cloudflared/<UUID>.json
ingress:
  - hostname: postiz.vymotion.org
    service: http://localhost:4007
  - service: http_status:404
```

Save (**Ctrl+O**, **Enter**, **Ctrl+X**), then install it as a background
service so it survives reboots:

```bash
sudo cloudflared service install
```

Check from any device: <https://postiz.vymotion.org> should load the Postiz
login page.

---

## Part 6 · Create the admin account and the API key

1. Open <https://postiz.vymotion.org> and **register** with
   `vikranty301@gmail.com`. This single account owns every channel Vymotion
   connects.
2. Lock the door behind you:
   ```bash
   cd ~/postiz
   sed -i '' 's/^DISABLE_REGISTRATION=.*/DISABLE_REGISTRATION=true/' .env
   docker compose up -d
   ```
3. In Postiz: **Settings → Developers → Public API** → generate a key, copy it.
4. Back on **Windows**, hand it to the Worker:
   ```powershell
   cd worker
   npx wrangler secret put POSTIZ_API_KEY
   ```
   Paste the key when prompted.

Verify:

```bash
curl -H "Authorization: <your-key>" https://postiz.vymotion.org/api/public/v1/integrations
```

`[]` with a 200 means everything is wired.

---

## Part 7 · Keep it running

Scheduled posts need the Mac awake and Docker running.

**System Settings → Energy:**
- **Prevent automatic sleeping when the display is off** — on
- **Start up automatically after a power failure** — on
- **Wake for network access** — on

Docker Desktop is already set to start at login (Part 2), and every container
uses `restart: always`, so a reboot brings the whole stack back by itself.

One caveat specific to Docker Desktop: if you fully **Quit** Docker Desktop,
the `vm.max_map_count` fix resets and Elasticsearch may fail on next start.
Just re-run `bash ~/postiz-config/bootstrap.sh` — it re-applies it.

---

## Part 8 · Confirm it works in Vymotion

Open <https://vymotion.org/publish> signed in on a paid plan. The
"Publishing is almost ready" panel should be replaced by the calendar, with a
**Connect** button in the Channels rail. No redeploy needed — the Worker reads
the secret on each request.

Nothing appears in the connect picker until at least one platform's developer
app credentials are in `.env` — see `README.md` §7. Bluesky and Mastodon are
near-instant, X is quick, LinkedIn about a day; Instagram, TikTok and YouTube
each need platform review and take weeks.

---

## If something breaks

In `~/postiz`:

```bash
docker compose ps                                  # what's running
docker compose logs --tail=80 postiz               # app logs
docker compose logs --tail=40 temporal-elasticsearch
docker compose restart postiz
```

- **Elasticsearch keeps restarting** → re-run `bash ~/postiz-config/bootstrap.sh`.
- **Containers keep dying / Mac is sluggish** → Docker memory is too low.
  Settings → Resources → Memory → 10 GB → Apply & Restart.
- **Postiz can't reach the database** → `POSTGRES_PASSWORD` and the password
  inside `DATABASE_URL` disagree. They must match exactly.
- **`postiz.vymotion.org` won't resolve** → `sudo launchctl list | grep cloudflared`
  to check the service, or run `cloudflared tunnel run postiz` in the foreground
  to see live errors.
- **Vymotion still says "almost ready"** → `POSTIZ_API_KEY` isn't set or is
  wrong. Re-run the Part 6 curl to confirm the key works.
