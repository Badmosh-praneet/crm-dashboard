"""
One-step Cloud Database Initializer for Volkswagen Elite Motors DSR Dashboard.

Usage:
    python tools/setup_cloud_db.py "postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require"
or:
    set DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require
    python tools/setup_cloud_db.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg

ROOT = Path(__file__).resolve().parent.parent


def main():
    if len(sys.argv) > 1:
        dsn = sys.argv[1].strip()
    else:
        dsn = os.environ.get("DATABASE_URL", "").strip()

    if not dsn or "127.0.0.1" in dsn or "localhost" in dsn:
        print("Error: Please provide a valid cloud PostgreSQL connection string.")
        print('Example: python tools/setup_cloud_db.py "postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require"')
        sys.exit(1)

    if dsn.startswith("postgres://"):
        dsn = "postgresql://" + dsn[len("postgres://"):]

    print(f"Connecting to database: {dsn.split('@')[-1]}...")
    try:
        with psycopg.connect(dsn, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT version();")
                ver = cur.fetchone()[0]
                print(f"Connected successfully: {ver[:40]}...")

                print("1/4 Applying db/schema.sql (18 tables & dimensions)...")
                schema_sql = (ROOT / "db" / "schema.sql").read_text(encoding="utf-8")
                cur.execute(schema_sql)

                print("2/4 Applying db/triggers.sql (real-time notification triggers)...")
                triggers_sql = (ROOT / "db" / "triggers.sql").read_text(encoding="utf-8")
                cur.execute(triggers_sql)

        os.environ["DATABASE_URL"] = dsn

        print("3/4 Running ETL to load DSR August 2026 workbook into PostgreSQL...")
        from etl.load_dsr import main as run_etl
        run_etl()

        with psycopg.connect(dsn, autocommit=True) as conn:
            with conn.cursor() as cur:
                print("4/4 Applying db/views.sql (21 analytical views)...")
                views_sql = (ROOT / "db" / "views.sql").read_text(encoding="utf-8")
                cur.execute(views_sql)

                cur.execute("SELECT count(*) FROM dsr.vehicle;")
                count = cur.fetchone()[0]
                print(f"\nAll set! Database initialized with {count} vehicles.")
                print("\nNext step: Add this DATABASE_URL to your Vercel Project Settings:")
                print("  Vercel Dashboard -> Project -> Settings -> Environment Variables")
                print("  Key: DATABASE_URL")
                print(f"  Value: {dsn}")

    except Exception as exc:
        print(f"Error initializing database: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
