#!/usr/bin/env bash
# Vymotion → Postiz stack bootstrap. Works on macOS (Docker Desktop) and
# Ubuntu/Debian arm64|amd64 (Docker Engine).
#
# macOS — run from this directory in Terminal:
#   bash bootstrap.sh
#
# Linux VM — copy the three files up first, then run:
#   scp worker/postiz/{postiz.env,docker-compose.override.yaml,bootstrap.sh} ubuntu@<ip>:~/
#   ssh ubuntu@<ip> 'bash ~/bootstrap.sh'
#
# Idempotent — safe to re-run. Does NOT touch cloudflared (see MAC-SETUP.md §4).
set -euo pipefail

STACK_DIR="$HOME/postiz"
say() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()  { printf '  \033[32mok\033[0m   %s\n' "$*"; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

# Portable "version A >= version B" — avoids `sort -V`, which BSD/macOS sort
# has not always supported.
ver_ge() {
  [ "$(awk -v a="$1" -v b="$2" 'BEGIN{
    na=split(a,x,"."); nb=split(b,y,".");
    n=(na>nb?na:nb);
    for(i=1;i<=n;i++){ai=(i<=na?x[i]+0:0); bi=(i<=nb?y[i]+0:0);
      if(ai>bi){print 1;exit} if(ai<bi){print 0;exit}}
    print 1}')" = "1" ]
}

OS="$(uname -s)"

# ── 0. Locate the config files ──────────────────────────────────────────
# macOS runs in-place from the repo; the Linux VM path has them in $HOME.
if [ -f "./postiz.env" ] && [ -f "./docker-compose.override.yaml" ]; then
  SRC="$(pwd)"
elif [ -f "$HOME/postiz.env" ] && [ -f "$HOME/docker-compose.override.yaml" ]; then
  SRC="$HOME"
else
  die "can't find postiz.env and docker-compose.override.yaml (looked in . and \$HOME)"
fi
say "Using config from $SRC"

if grep -q 'CHANGE_ME' "$SRC/postiz.env"; then
  die "postiz.env still has CHANGE_ME placeholders (the two R2 credentials). Fill them in first — \
Postiz would start fine but every media upload would fail."
fi

# ── 1. Docker ───────────────────────────────────────────────────────────
DOCKER="docker"
case "$OS" in
  Darwin)
    command -v docker >/dev/null 2>&1 || die "Docker Desktop isn't installed. \
Get it from https://www.docker.com/products/docker-desktop/ (Apple Silicon build), then re-run."
    docker info >/dev/null 2>&1 || die "Docker Desktop isn't running. Open it from Applications, \
wait for the whale icon to stop animating, then re-run."

    # Docker Desktop runs the stack inside a VM whose RAM is capped in
    # Settings → Resources. The default is often too small for this stack.
    MEM_B="$(docker info --format '{{.MemTotal}}' 2>/dev/null || echo 0)"
    MEM_G=$(( MEM_B / 1024 / 1024 / 1024 ))
    if [ "$MEM_G" -lt 7 ]; then
      die "Docker only has ${MEM_G}GB of RAM; this stack needs ~8GB. \
Raise it in Docker Desktop → Settings → Resources → Memory (10-12GB on a 16GB Mac), Apply & Restart, then re-run."
    fi
    ok "Docker has ${MEM_G}GB RAM available"
    ;;
  Linux)
    if command -v docker >/dev/null 2>&1; then
      ok "Docker already installed"
    else
      say "Installing Docker"
      curl -fsSL https://get.docker.com | sudo sh
      sudo usermod -aG docker "$USER"   # effective next login; we use sudo below
    fi
    DOCKER="sudo docker"
    ;;
  *) die "unsupported OS: $OS" ;;
esac

# The override file uses the `!override` YAML tag. On older Compose that tag is
# ignored, the upstream 0.0.0.0:4007 binding survives, and the host ends up
# publicly exposed — so refuse to continue rather than fail open.
CV="$($DOCKER compose version --short 2>/dev/null || echo 0)"
ver_ge "$CV" "2.24.4" || die "Docker Compose $CV is too old; need >= 2.24.4 for the '!override' tag."
ok "Docker Compose $CV"

# ── 2. Kernel setting for Elasticsearch 7.17 ────────────────────────────
# Without this, temporal-elasticsearch crash-loops on:
#   max virtual memory areas vm.max_map_count [65530] is too low
# Read through a container so this reports the value Elasticsearch will actually
# see — on macOS that's Docker Desktop's Linux VM, not the Mac kernel. /proc is
# used directly rather than `sysctl`, which is a busybox applet that may be absent.
read_mmc() { $DOCKER run --rm alpine cat /proc/sys/vm/max_map_count 2>/dev/null | tr -d '\r' || echo 0; }

MMC="$(read_mmc)"
if [ "${MMC:-0}" -lt 262144 ]; then
  say "Raising vm.max_map_count for Elasticsearch (currently ${MMC:-unknown})"
  if [ "$OS" = "Linux" ]; then
    echo 'vm.max_map_count=262144' | sudo tee /etc/sysctl.d/99-elasticsearch.conf >/dev/null
    sudo sysctl --system >/dev/null
  else
    # Docker Desktop's VM has no persistent sysctl.d, so set it live. This resets
    # if you fully quit Docker Desktop — re-run this script if ES starts failing.
    $DOCKER run --rm --privileged alpine sh -c 'echo 262144 > /proc/sys/vm/max_map_count'
  fi
  MMC="$(read_mmc)"
  [ "${MMC:-0}" -ge 262144 ] || die "could not raise vm.max_map_count (still ${MMC:-unknown}); \
Elasticsearch will crash-loop. On macOS try fully restarting Docker Desktop and re-running."
fi
ok "vm.max_map_count = $MMC"

# ── 3. Upstream stack ───────────────────────────────────────────────────
if [ -d "$STACK_DIR/.git" ]; then
  say "Updating existing stack in $STACK_DIR"
  git -C "$STACK_DIR" pull --ff-only
else
  say "Cloning postiz-docker-compose into $STACK_DIR"
  git clone https://github.com/gitroomhq/postiz-docker-compose "$STACK_DIR"
fi

# ── 4. Vymotion config ──────────────────────────────────────────────────
# postiz.env MUST land as .env — Compose reads that filename for the ${VAR}
# interpolation the override file depends on.
say "Installing Vymotion config"
install -m 600 "$SRC/postiz.env" "$STACK_DIR/.env"
install -m 644 "$SRC/docker-compose.override.yaml" "$STACK_DIR/docker-compose.override.yaml"

cd "$STACK_DIR"

# ── 5. Verify the merge before starting anything ────────────────────────
say "Validating merged config"
MERGED="$($DOCKER compose config)"

check() {
  printf '%s' "$MERGED" | grep -qE "$2" || die "config check failed: $1 — the override did not apply."
  ok "$1"
}
check "MAIN_URL points at postiz.vymotion.org" 'MAIN_URL: https://postiz\.vymotion\.org'
check "storage provider is cloudflare (not local)" 'STORAGE_PROVIDER: cloudflare'
check "API_LIMIT raised to 600"                    'API_LIMIT: "600"'

# Guard the exposure bug specifically: exactly one published 4007, on loopback.
if [ "$(printf '%s' "$MERGED" | grep -c 'published: "4007"')" -ne 1 ]; then
  die "port 4007 is published more than once — '!override' did not take effect. \
Refusing to start with a publicly exposed instance."
fi
ok "port 4007 bound once, loopback only"

# ── 6. Up ───────────────────────────────────────────────────────────────
say "Starting the stack (first run pulls several GB — a few minutes)"
$DOCKER compose pull
$DOCKER compose up -d

say "Waiting for Postiz to answer on 127.0.0.1:4007"
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null --max-time 5 http://127.0.0.1:4007/ 2>/dev/null; then
    say "Postiz is up."
    $DOCKER compose ps
    printf '\nNext: install the cloudflared tunnel, then register the admin account.\n'
    exit 0
  fi
  sleep 10
done

printf '\n\033[1;33mPostiz did not answer within 10 minutes.\033[0m Check logs with:\n'
printf '  cd %s && %s compose ps\n' "$STACK_DIR" "$DOCKER"
printf '  cd %s && %s compose logs --tail=80 postiz\n' "$STACK_DIR" "$DOCKER"
printf '  cd %s && %s compose logs --tail=40 temporal-elasticsearch\n' "$STACK_DIR" "$DOCKER"
exit 1
