#!/usr/bin/env bash
# Restart ATLAS API (uvicorn) and rebuild/reload the web UI (nginx).
#
# Usage (on the droplet):
#   chmod +x deploy/restart.sh
#   ./deploy/restart.sh
#
# Optional:
#   ./deploy/restart.sh --api-only
#   ./deploy/restart.sh --web-only

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"
API_HOST="${API_HOST:-127.0.0.1}"
API_PORT="${API_PORT:-8000}"
API_LOG="${API_LOG:-/tmp/atlas-api.log}"
WEB_LOG="${WEB_LOG:-/tmp/atlas-web-build.log}"

# If you copy dist to a public dir (recommended), set this; leave empty to serve dist in-place
PUBLIC_WEB_ROOT="${PUBLIC_WEB_ROOT:-}"

MODE="${1:-all}"

restart_api() {
  echo "==> Stopping API on :$API_PORT (if running)"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${API_PORT}/tcp" 2>/dev/null || true
  else
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
  fi
  sleep 1

  if [[ ! -x "$API_DIR/.venv/bin/uvicorn" ]]; then
    echo "ERROR: missing $API_DIR/.venv — create venv and pip install -r requirements.txt"
    exit 1
  fi

  echo "==> Starting API → http://${API_HOST}:${API_PORT}"
  cd "$API_DIR"
  nohup "$API_DIR/.venv/bin/uvicorn" app.main:app \
    --host "$API_HOST" \
    --port "$API_PORT" \
    >"$API_LOG" 2>&1 &

  sleep 1
  if curl -sf "http://${API_HOST}:${API_PORT}/health" >/dev/null; then
    echo "    API health OK"
  else
    echo "    WARNING: API did not respond on /health — check $API_LOG"
    tail -n 40 "$API_LOG" || true
    exit 1
  fi
}

restart_web() {
  echo "==> Building web UI"
  cd "$WEB_DIR"

  if [[ ! -f .env ]]; then
    echo "ERROR: missing $WEB_DIR/.env (need VITE_API_URL=/api and Supabase keys)"
    exit 1
  fi

  if ! grep -q 'VITE_API_URL=/api' .env; then
    echo "WARNING: VITE_API_URL should be /api for nginx — current .env:"
    grep VITE_API_URL .env || true
  fi

  npm ci >>"$WEB_LOG" 2>&1
  # Force production API base (never bake localhost into the bundle)
  VITE_API_URL=/api npm run build >>"$WEB_LOG" 2>&1

  if [[ ! -f "$WEB_DIR/dist/index.html" ]]; then
    echo "ERROR: build failed — no dist/index.html (see $WEB_LOG)"
    tail -n 40 "$WEB_LOG" || true
    exit 1
  fi

  if grep -Rql 'localhost:8000' "$WEB_DIR/dist" 2>/dev/null; then
    echo "ERROR: dist still contains localhost:8000 — fix .env and rebuild"
    exit 1
  fi

  # Keep nginx-readable perms when serving from home dir
  chmod -R a+rX "$WEB_DIR/dist" 2>/dev/null || true

  if [[ -n "$PUBLIC_WEB_ROOT" ]]; then
    echo "==> Syncing dist → $PUBLIC_WEB_ROOT"
    sudo mkdir -p "$PUBLIC_WEB_ROOT"
    sudo rsync -a --delete "$WEB_DIR/dist/" "$PUBLIC_WEB_ROOT/"
  fi

  echo "==> Reloading nginx"
  if sudo nginx -t; then
    sudo systemctl reload nginx
  else
    echo "ERROR: nginx config test failed"
    exit 1
  fi

  echo "    Web build OK → $WEB_DIR/dist"
}

case "$MODE" in
  all|"")
    restart_api
    restart_web
    ;;
  --api-only|api)
    restart_api
    ;;
  --web-only|web)
    restart_web
    ;;
  -h|--help)
    echo "Usage: $0 [--api-only|--web-only]"
    exit 0
    ;;
  *)
    echo "Unknown option: $MODE"
    echo "Usage: $0 [--api-only|--web-only]"
    exit 1
    ;;
esac

echo "==> Done"
echo "    App:  http://167.172.135.40/"
echo "    API:  http://167.172.135.40/api/health"
echo "    Docs: http://167.172.135.40/api/docs"
