# Oracle Cloud setup, start to finish

Beginner-facing walkthrough for standing up the Postiz server that powers
Vymotion's `/publish` page. `README.md` is the terse reference; this is the
click-by-click version.

**What you're building:** one small Linux server, running free forever on
Oracle's "Always Free" tier, reachable at `https://postiz.vymotion.org`. It
holds your social account connections and fires your scheduled posts.

**Cost:** nothing. Oracle asks for a card at signup to verify you're a real
person (expect a temporary ~$1 authorization that reverses). The shape used
here is Always Free — it does not expire after the trial.

**Time:** ~30 min of clicking, plus however long the install takes.

---

## Part 1 · Create the Oracle account

1. Go to <https://www.oracle.com/cloud/free/> → **Start for free**.
2. Enter email, verify it, fill in name/address, verify by card.
3. **Choose your home region carefully — it is permanent and cannot be changed
   later.** Pick the one geographically closest to you. If you later hit
   persistent capacity errors (Part 2), a different region is the fix, and
   that means a new account — so it is worth a moment's thought now.
4. Wait for the "your account is ready" email (usually minutes).

> You start on a 30-day trial with $300 of credits. Ignore the credits. Everything
> below is Always Free and keeps running after the trial ends.

---

## Part 2 · Create the server

From the console (<https://cloud.oracle.com>):

1. Hamburger menu (top-left) → **Compute** → **Instances** → **Create instance**.
2. **Name:** `postiz`.
3. **Image and shape** → **Edit**:
   - **Change shape** → **Ampere** → `VM.Standard.A1.Flex`
   - Set **OCPUs = 4**, **Memory = 24 GB**
   - Confirm the **"Always Free eligible"** badge is showing. This is the whole
     free ARM allowance — 4 OCPU and 24 GB across all your A1 instances.
   - **Change image** → **Canonical Ubuntu** → **24.04**. (Once the A1 shape is
     selected, Oracle only offers the correct `aarch64` builds.)
4. **Networking:** leave the defaults — it creates a VCN for you. Make sure
   **Assign a public IPv4 address** is **Yes**.
5. **Add SSH keys:** choose **Generate a key pair for me**, then click
   **Save private key** *and* **Save public key**. Put the private key somewhere
   you'll remember, e.g. `C:\Users\<you>\.ssh\postiz.key`.
   **Without the private key you cannot get into the server.**
6. **Boot volume:** tick *Specify a custom boot volume size* → **100** GB.
   (Always Free covers 200 GB total; staying at 100 leaves headroom.)
7. **Create.** Wait for the tile to go orange → green (**RUNNING**), then copy
   the **Public IP address**.

### If you see "Out of host capacity"

Very common, and not your fault — the free ARM pool is heavily contested.

- Retry the create. It often succeeds within a few attempts.
- Try a different **availability domain** (AD-1 / AD-2 / AD-3) if your region has more than one.
- Otherwise retry periodically over a day or two.

You do **not** need to open any firewall or VCN ingress rule. The tunnel in
Part 5 is outbound-only, so the server never exposes a public port.

---

## Part 3 · Connect to the server

Open **PowerShell** on your machine.

Windows refuses to use a private key that other accounts can read, so lock it
down first (one time only):

```powershell
icacls "$env:USERPROFILE\.ssh\postiz.key" /inheritance:r /grant:r "$($env:USERNAME):R"
```

Then connect (replace with your real IP):

```powershell
ssh -i "$env:USERPROFILE\.ssh\postiz.key" ubuntu@<PUBLIC-IP>
```

Say `yes` to the fingerprint prompt. A prompt like `ubuntu@postiz:~$` means
you're in. `exit` returns you to your own machine.

> Stuck at "Connection timed out"? The instance is usually still booting — wait
> a minute and retry. `Permission denied (publickey)` means the wrong key path
> or the wrong username (it must be `ubuntu` for the Ubuntu image).

---

## Part 4 · Install everything

Two files carry your configuration up to the server, then one script does the
rest. Run these **from your own machine** (PowerShell, in the repo root):

```powershell
scp -i "$env:USERPROFILE\.ssh\postiz.key" worker/postiz/postiz.env ubuntu@<PUBLIC-IP>:~/postiz.env
scp -i "$env:USERPROFILE\.ssh\postiz.key" worker/postiz/docker-compose.override.yaml ubuntu@<PUBLIC-IP>:~/
scp -i "$env:USERPROFILE\.ssh\postiz.key" worker/postiz/bootstrap.sh ubuntu@<PUBLIC-IP>:~/
```

> Before this: `postiz.env` still has two `CHANGE_ME` placeholders for the R2
> storage credentials. Fill them in first — see **Part 7**. The script refuses
> to run while they're there, because Postiz would start but every media upload
> would fail.

Then run the installer:

```powershell
ssh -i "$env:USERPROFILE\.ssh\postiz.key" ubuntu@<PUBLIC-IP> "bash ~/bootstrap.sh"
```

It installs Docker, applies the Elasticsearch kernel setting, fetches the
Postiz stack, validates the merged config, and starts everything. First run
pulls several GB — expect a few minutes. It's safe to re-run if interrupted.

Success looks like `==> Postiz is up.` followed by a table of running containers.

---

## Part 5 · Put it on the internet (cloudflared tunnel)

This gives `postiz.vymotion.org` a real HTTPS address without opening a single
port. Social platforms need it for their OAuth callbacks.

SSH into the server, then:

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

cloudflared tunnel login
```

That prints a URL. Open it in your browser, sign in to Cloudflare, and pick
**vymotion.org**. Back on the server:

```bash
cloudflared tunnel create postiz          # prints a UUID — copy it
cloudflared tunnel route dns postiz postiz.vymotion.org
```

Create `/etc/cloudflared/config.yml` (paste the UUID where shown):

```bash
sudo mkdir -p /etc/cloudflared
sudo tee /etc/cloudflared/config.yml >/dev/null <<'EOF'
tunnel: postiz
credentials-file: /home/ubuntu/.cloudflared/PASTE-UUID-HERE.json
ingress:
  - hostname: postiz.vymotion.org
    service: http://localhost:4007
  - service: http_status:404
EOF
sudo nano /etc/cloudflared/config.yml     # replace PASTE-UUID-HERE
```

Start it:

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Check from anywhere: <https://postiz.vymotion.org> should load the Postiz
login page.

---

## Part 6 · Create the admin account and the API key

1. Open <https://postiz.vymotion.org> and **register** with
   `vikranty301@gmail.com`. This single account owns every channel Vymotion
   connects.
2. Lock the door behind you — on the server:
   ```bash
   cd ~/postiz
   sed -i 's/^DISABLE_REGISTRATION=.*/DISABLE_REGISTRATION=true/' .env
   sudo docker compose up -d
   ```
3. In Postiz: **Settings → Developers → Public API** → generate a key, copy it.
4. On your own machine, hand it to the Worker:
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

## Part 7 · R2 storage credentials

Needed in Part 4. The bucket `vymotion-postiz` already exists with public
access enabled — you only need an access token for it.

1. Cloudflare dashboard → **R2** → **Manage API Tokens** → **Create API Token**.
2. Permission **Object Read & Write**, scoped to the **`vymotion-postiz`** bucket only.
3. Copy the **Access Key ID** and **Secret Access Key** into `worker/postiz/postiz.env`:
   ```
   CLOUDFLARE_ACCESS_KEY=<access key id>
   CLOUDFLARE_SECRET_ACCESS_KEY=<secret access key>
   ```

That file is gitignored — it holds real secrets and must never be committed.

---

## Part 8 · Confirm it works in Vymotion

Open <https://vymotion.org/publish> signed in on a paid plan. The
"Publishing is almost ready" panel should be replaced by the calendar, with a
**Connect** button in the Channels rail. No redeploy is needed — the Worker
reads the secret on each request.

Nothing will appear in the connect picker until at least one platform's
developer app credentials are in `.env` — see `README.md` §7. Bluesky and
Mastodon are the fastest to get working; X is next; Instagram, TikTok and
YouTube each need platform app review and take weeks.

---

## If something breaks

On the server, in `~/postiz`:

```bash
sudo docker compose ps                                  # what's running
sudo docker compose logs --tail=80 postiz               # app logs
sudo docker compose logs --tail=40 temporal-elasticsearch
sudo docker compose restart postiz
```

- **Elasticsearch keeps restarting** → the `vm.max_map_count` setting didn't
  apply. Re-run `bootstrap.sh`.
- **Postiz can't reach the database** → `POSTGRES_PASSWORD` and the password
  inside `DATABASE_URL` disagree. They must match exactly.
- **`postiz.vymotion.org` won't resolve** → `sudo systemctl status cloudflared`.
- **Vymotion still says "almost ready"** → `POSTIZ_API_KEY` isn't set, or the
  key is wrong. Re-run the Part 6 curl to confirm the key works.
