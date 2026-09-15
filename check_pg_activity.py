import os
from dotenv import load_dotenv
import psycopg

load_dotenv()
dsn = os.getenv("DATABASE_URL")

with psycopg.connect(dsn) as cx:
    with cx.cursor() as cur:
        cur.execute("""
            SELECT pid, state, query, wait_event_type, wait_event
            FROM pg_stat_activity
            WHERE pid <> pg_backend_pid();
        """)
        for row in cur.fetchall():
            print(row)
