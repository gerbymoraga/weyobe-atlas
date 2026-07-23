#!/usr/bin/env bash
# Pull latest main and rebuild/restart ATLAS on the droplet.
# Called by GitHub Actions (or run manually on the server).
#
# Usage (on the droplet, from repo root):
#   chmod +x deploy/remote-deploy.sh
#   ./deploy/remote-deploy.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/apps/api"
BRANCH="${DEPLOY_BRANCH:-main}"
REMOTE="${DEPLOY_REMOTE:-origin}"

cd "$ROOT"

echo "==> Deploying ATLAS from ${REMOTE}/${BRANCH}"
echo "    cwd: $ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "WARNING: working tree has local changes (shown below)."
  git status --short
  echo "         Continuing with fetch + ff-only merge; .env files are ignored."
fi

echo "==> Fetching ${REMOTE}/${BRANCH}"
git fetch "$REMOTE" "$BRANCH"

echo "==> Fast-forward to ${REMOTE}/${BRANCH}"
git merge --ff-only "${REMOTE}/${BRANCH}"

echo "==> Ensuring deploy scripts are executable"
chmod +x "$ROOT/deploy/"*.sh 2>/dev/null || true

if [[ -x "$API_DIR/.venv/bin/pip" ]]; then
  echo "==> Syncing API Python deps"
  "$API_DIR/.venv/bin/pip" install -r "$API_DIR/requirements.txt" -q
else
  echo "ERROR: missing $API_DIR/.venv — create it once:"
  echo "  cd $API_DIR && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi

echo "==> Rebuild web + restart API"
"$ROOT/deploy/restart.sh"

echo "==> Deploy complete"
git log -1 --oneline
