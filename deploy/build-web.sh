#!/usr/bin/env bash
# Build web + ensure API can be restarted. Run on the droplet from repo root.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
API="$ROOT/apps/api"

echo "==> Building web (VITE_API_URL should be /api)"
cd "$WEB"
npm ci
npm run build

echo "==> Web build ready at $WEB/dist"
echo "==> Reload nginx if config changed: sudo nginx -t && sudo systemctl reload nginx"
echo "==> Restart API if needed:"
echo "    cd $API && source .venv/bin/activate && uvicorn app.main:app --host 127.0.0.1 --port 8000"
