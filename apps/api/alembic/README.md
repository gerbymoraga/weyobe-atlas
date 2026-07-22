# Alembic

Local bootstrap currently uses `Base.metadata.create_all` on API startup.

Before pilot launch:
1. `cd apps/api && alembic init alembic`
2. Point `sqlalchemy.url` at `DATABASE_URL`
3. Autogenerate revisions from `app.models`
4. Remove create_all from lifespan
