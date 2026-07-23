#!/usr/bin/env python3
"""Apply shared + per-member seed SQL using DATABASE_URL (asyncpg).

Usage (from apps/api with venv active):
  python scripts/seed_db.py              # catalog + member data
  python scripts/seed_db.py --catalog    # events / resources only
  python scripts/seed_db.py --members    # kit / bookings / CORE / apps only
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

import asyncpg

ROOT = Path(__file__).resolve().parents[3]  # ATLAS/
DB_DIR = ROOT / "apps" / "api" / "db"
SEED_CATALOG = DB_DIR / "seed.sql"
SEED_MEMBER = DB_DIR / "seed_member.sql"
ENV_FILE = ROOT / ".env"


def load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


def normalize_url(url: str) -> str:
    for prefix in ("postgresql+asyncpg://", "postgres+asyncpg://"):
        if url.startswith(prefix):
            return "postgresql://" + url[len(prefix) :]
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://") :]
    return url


def statements_from_sql(sql: str) -> list[str]:
    kept: list[str] = []
    for line in sql.splitlines():
        if line.lstrip().startswith("--"):
            continue
        kept.append(line)
    text = "\n".join(kept)
    out: list[str] = []
    for part in text.split(";"):
        stmt = part.strip()
        if not stmt:
            continue
        upper = stmt.upper()
        if upper in ("BEGIN", "COMMIT"):
            continue
        out.append(stmt)
    return out


async def apply_file(conn: asyncpg.Connection, path: Path) -> None:
    statements = statements_from_sql(path.read_text(encoding="utf-8"))
    print(f"==> {path.relative_to(ROOT)} ({len(statements)} statements)")
    async with conn.transaction():
        for stmt in statements:
            if stmt.lstrip().upper().startswith("SELECT"):
                continue
            await conn.execute(stmt)


async def run(url: str, files: list[Path]) -> list[asyncpg.Record]:
    conn = await asyncpg.connect(url)
    try:
        for path in files:
            if not path.is_file():
                raise FileNotFoundError(path)
            await apply_file(conn, path)
        return await conn.fetch(
            """
            SELECT 'events' AS kind, COUNT(*)::text AS n FROM events
            UNION ALL SELECT 'event_addons', COUNT(*)::text FROM event_addons
            UNION ALL SELECT 'resources', COUNT(*)::text FROM resources
            UNION ALL SELECT 'members', COUNT(*)::text FROM members
            UNION ALL SELECT 'kit_shipments', COUNT(*)::text FROM kit_shipments
            UNION ALL SELECT 'bookings', COUNT(*)::text FROM bookings
            UNION ALL SELECT 'core_checkins', COUNT(*)::text FROM core_checkins
            UNION ALL SELECT 'expedition_applications', COUNT(*)::text FROM expedition_applications
            UNION ALL SELECT 'subscriptions', COUNT(*)::text FROM subscriptions
            """
        )
    finally:
        await conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed ATLAS shared + member demo data")
    parser.add_argument("--catalog", action="store_true", help="Only events/addons/resources")
    parser.add_argument("--members", action="store_true", help="Only per-member rows")
    args = parser.parse_args()

    load_dotenv(ENV_FILE)
    raw = os.environ.get("DATABASE_URL", "").strip()
    if not raw:
        print("ERROR: DATABASE_URL is not set (check repo-root .env)", file=sys.stderr)
        raise SystemExit(1)

    if args.catalog and not args.members:
        files = [SEED_CATALOG]
    elif args.members and not args.catalog:
        files = [SEED_MEMBER]
    else:
        files = [SEED_CATALOG, SEED_MEMBER]

    url = normalize_url(raw)
    try:
        rows = asyncio.run(run(url, files))
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: seed failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

    for row in rows:
        print(f"    {row['kind']}: {row['n']}")
    print("==> Seed complete")
    print("    Atlas Superadmin: jpsison@weyobe.com (any password in scaffold auth)")
    print("    Open /admin after login for master-record settings")


if __name__ == "__main__":
    main()
