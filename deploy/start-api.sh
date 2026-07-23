#!/usr/bin/env bash
# ATLAS API process for PM2.
# Usage:
#   chmod +x deploy/start-api.sh
#   pm2 start deploy/start-api.sh --name atlas-api
#   pm2 save && pm2 startup

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/apps/api"
HOST="${API_HOST:-127.0.0.1}"
PORT="${API_PORT:-8000}"

cd "$API_DIR"

if [[ ! -x "$API_DIR/.venv/bin/uvicorn" ]]; then
  echo "ERROR: missing $API_DIR/.venv — run:"
  echo "  cd $API_DIR && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi

# Load repo-root .env if present (DATABASE_URL, CORS, Stripe, etc.)
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

exec "$API_DIR/.venv/bin/uvicorn" app.main:app \
  --host "$HOST" \
  --port "$PORT" \
  --proxy-headers \
  --forwarded-allow-ips="127.0.0.1"
