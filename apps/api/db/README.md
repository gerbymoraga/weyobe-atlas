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

## Note

The API can also auto-create tables on startup (`create_all`). Prefer running `schema.sql` once so enums/indexes match production.
