# ATLAS — Member Portal

Membership community for dental professionals — *Adventure Beyond Dentistry*.

Member-facing web portal (`app.youratlashq.com`) for the October pilot.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Tailwind (Vite PWA) |
| Backend | Python + FastAPI |
| Database / Auth | Postgres via Supabase |
| Payments | Stripe Billing + Checkout |
| Email | Resend (swap to Postmark if preferred) |

## Repo layout

```
ATLAS/
├── apps/
│   ├── web/          # Member portal (React)
│   └── api/          # FastAPI backend
├── docs/             # Specs & handoff notes
├── docker-compose.yml
└── .env.example
```

Quick start
---

### 1. Environment

```bash
cp .env.example .env
# Fill in Supabase, Stripe, and email keys
```

### 2. Database schema

Apply `apps/api/db/schema.sql` once (Supabase SQL Editor or local `psql`).  
See `apps/api/db/README.md`.

### 2b. Sample data (catalog + per-member)

```bash
# Supabase: run apps/api/db/seed.sql then seed_member.sql in SQL Editor
# or locally:
cd apps/api && python scripts/seed_db.py
```

Safe to re-run. Seeds shared expeditions/library **and** kit, bookings, CORE, and applications for every member (plus `demo@youratlashq.com`).

### 3. Database (local Postgres, optional)

```bash
docker compose up -d
```

### 3. API

```bash
cd apps/api
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 4. Web

```bash
cd apps/web
npm install
npm run dev
```

App: http://localhost:5173

## Phasing (pilot)

1. **Phase 1** — auth, Navigator + Stripe, events + booking tier logic, membership, emails, kit via admin updates
2. **Phase 2** — Expedition apply → approve → annual billing, library, CORE, dashboard polish
3. **Phase 3** — carrier tracking, challenges/giveaways, R2/Archie, native eval

See `docs/BUILD_SPEC.md` for full requirements. UX source of truth: `docs/atlas-portal.html` (add prototype when available).
