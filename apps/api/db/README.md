# Database schema

Canonical SQL: [`schema.sql`](./schema.sql)

## Apply on Supabase (recommended if you don’t have local Postgres)

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** → New query
3. Paste the contents of `schema.sql` → **Run**
4. Copy connection settings into `d:\www\ATLAS\.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...   # Project Settings → API → JWT Secret
```

Use the **Database** password from project settings. Prefer the connection string under **Project Settings → Database**; swap the scheme to `postgresql+asyncpg://` for the FastAPI app.

## Apply on local Postgres

```powershell
# example with psql
psql -U atlas -d atlas -f apps\api\db\schema.sql
```

Or with Docker Compose (after `docker compose up -d`):

```powershell
Get-Content apps\api\db\schema.sql | docker compose exec -T db psql -U atlas -d atlas
```

## Sample / shared catalog seed

Shared content for **all members** (not per-user):

- `events` + `event_addons` → Expeditions page
- `resources` → Resource Library + dashboard highlights

File: [`seed.sql`](./seed.sql) — idempotent (fixed UUIDs, safe to re-run; does not reset `seats_taken`).

### Per-member demo data

File: [`seed_member.sql`](./seed_member.sql) — backfills **every existing member** plus a demo account:

| Area | Table | What members can do in the app |
|---|---|---|
| My Kit | `kit_shipments` | **Read only** (ops/admin updates status) |
| Expeditions booked | `bookings` | **Create** via book flow |
| CORE | `core_checkins` | **Create** new check-ins (append-only) |
| Expedition apply | `expedition_applications` | **Create** application |
| Profile | `members` | **Update** name via `PATCH /me` |
| Billing row | `subscriptions` | Stripe-driven later (seed inserts a placeholder) |

There are **no member delete endpoints** yet. Re-running seed does not wipe user-created rows.

Demo login after member seed: `jpsison@weyobe.com` (**Atlas Superadmin**, `is_admin=true`) — open `/admin` for master records.
Also seeds/updates other members from `seed_member.sql` (e.g. `rey@weyobe.com`). Scaffold auth accepts any password for known emails.

### Supabase SQL Editor

1. Open **SQL Editor** → New query  
2. Run `seed.sql`, then `seed_member.sql`

### Local Docker Postgres

```powershell
Get-Content apps\api\db\seed.sql | docker compose exec -T db psql -U atlas -d atlas
Get-Content apps\api\db\seed_member.sql | docker compose exec -T db psql -U atlas -d atlas
```

### Python helper (uses repo-root `.env` `DATABASE_URL`)

```powershell
cd apps\api
.\.venv\Scripts\python.exe scripts\seed_db.py           # catalog + members
.\.venv\Scripts\python.exe scripts\seed_db.py --catalog # shared only
.\.venv\Scripts\python.exe scripts\seed_db.py --members # per-user only
```

Or with `psql` (swap `postgresql+asyncpg://` → `postgresql://` in the URL):

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/db/seed.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/db/seed_member.sql
```

## Note

The API can also auto-create tables on startup (`create_all`). Prefer running `schema.sql` once so enums/indexes match production.
