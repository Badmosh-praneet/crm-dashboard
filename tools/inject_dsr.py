"""
Volkswagen Elite Motors - Automated DSR Ingestion Pipeline Tool

Used by reporting agents and automated jobs to inject DSR Excel workbooks
into the CRM dashboard and PostgreSQL database.

Usage:
    python tools/inject_dsr.py "DSR August 2026.xlsx"
    python tools/inject_dsr.py "DSR August 2026.xlsx" --url https://your-crm.vercel.app --agent "Auto-Bot"
    python tools/inject_dsr.py "DSR August 2026.xlsx" --direct
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def main():
    parser = argparse.ArgumentParser(description="Inject DSR Excel workbook into the CRM Dashboard.")
    parser.add_argument("file", help="Path to .xlsx or .xlsm file to inject")
    parser.add_argument(
        "--url",
        default=os.environ.get("CRM_URL", "http://127.0.0.1:8000"),
        help="Base URL of CRM Dashboard (default: http://127.0.0.1:8000)",
    )
    parser.add_argument(
        "--agent",
        default="Reporting Agent",
        help="Name of reporting agent or manager injecting the file",
    )
    parser.add_argument(
        "--period",
        default=None,
        help="Optional period code (e.g. AUG2026, SEP2026)",
    )
    parser.add_argument(
        "--direct",
        action="store_true",
        help="Force direct database ETL injection instead of HTTP endpoint",
    )

    args = parser.parse_args()
    file_path = Path(args.file)
    if not file_path.exists():
        file_path = ROOT / args.file
    if not file_path.exists():
        print(f"Error: File not found: {args.file}")
        sys.exit(1)

    print(f"==================================================")
    print(f" DSR Workbook Ingestion Pipeline")
    print(f" File:   {file_path.name} ({file_path.stat().st_size:,} bytes)")
    print(f" Agent:  {args.agent}")
    print(f"==================================================")

    if not args.direct:
        upload_endpoint = f"{args.url.rstrip('/')}/api/upload-dsr"
        print(f"Connecting to dashboard API: {upload_endpoint}...")
        try:
            with open(file_path, "rb") as f:
                data = {"uploaded_by": args.agent}
                if args.period:
                    data["period"] = args.period
                files = {
                    "file": (
                        file_path.name,
                        f,
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    )
                }
                res = requests.post(upload_endpoint, data=data, files=files, timeout=90)

            if res.status_code == 200:
                body = res.json()
                print("\nInjection Successful!")
                print(f"Status:      {body.get('status')}")
                print(f"Message:     {body.get('message')}")
                print(f"Period:      {body.get('period')} ({body.get('period_range')})")
                print(f"Environment: {body.get('environment')}")
                print("\nRecords Ingested:")
                counts = body.get("counts", {})
                for k, v in counts.items():
                    print(f"  - {k:<25}: {v:>6}")
                return
            else:
                print(f"API returned status {res.status_code}: {res.text}")
                print("Falling back to direct database injection...")
        except requests.exceptions.RequestException as req_err:
            print(f"Could not connect to {args.url}: {req_err}")
            print("Falling back to direct database injection...")

    # Direct database injection fallback
    print("\nRunning direct database ETL ingestion...")
    dsn = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:5432/elite_dsr")
    if dsn.startswith("postgres://"):
        dsn = "postgresql://" + dsn[len("postgres://"):]

    try:
        import openpyxl
        import psycopg
        from etl.load_dsr import Loader
        from app.entry import _resolve_period

        period_label, start_d, end_d = _resolve_period(args.period, file_path.name)
        with open(file_path, "rb") as f:
            wb = openpyxl.load_workbook(f, data_only=True)

        with psycopg.connect(dsn, autocommit=True) as cx:
            loader = Loader(cx, wb, period_label, start_d, end_d)
            counts = loader.run()
            cx.execute(
                """
                INSERT INTO etl_run (source_file, file_modified, finished_at, row_counts, notes)
                VALUES (%s, now(), now(), %s, %s)
            """,
                (file_path.name, json.dumps(counts), f"Direct CLI by {args.agent}"),
            )

        print("\nDirect Ingestion Successful!")
        print(f"Period: {period_label} ({start_d} to {end_d})")
        print("\nRecords Ingested:")
        for k, v in counts.items():
            print(f"  - {k:<25}: {v:>6}")

    except Exception as exc:
        print(f"Direct ingestion failed: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
