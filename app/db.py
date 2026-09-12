"""Database access for the DSR dashboard."""

from __future__ import annotations

import logging
import os
import time
from typing import Any

from dotenv import load_dotenv

load_dotenv()

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

log = logging.getLogger("dsr.db")

_raw_dsn = os.environ.get("DATABASE_URL", "")
if _raw_dsn.startswith("postgres://"):
    _raw_dsn = "postgresql://" + _raw_dsn[len("postgres://"):]

DSN = _raw_dsn or "postgresql://postgres:postgres@127.0.0.1:5432/elite_dsr"

# Every query in this app runs against the dsr schema, so the search path is set
# once on connection rather than repeated in each statement.
# min_size=0 ensures we do not block or fail on startup if the database is unconfigured.
pool = ConnectionPool(
    DSN,
    min_size=0,
    max_size=8,
    open=False,
    kwargs={"row_factory": dict_row, "options": "-c search_path=dsr,public"},
)

_db_ready: bool = False
_last_check_time: float = 0.0


def has_database() -> bool:
    """Return True only if a valid non-local DATABASE_URL was supplied in environment."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        return False
    # If running in Vercel and URL points to 127.0.0.1 or localhost, no local database exists!
    if os.environ.get("VERCEL") and ("127.0.0.1" in url or "localhost" in url):
        return False
    return True


def ensure_pool_open() -> None:
    """Ensure connection pool is opened."""
    try:
        if getattr(pool, "closed", True):
            pool.open()
    except Exception as exc:
        log.warning("Could not open database pool: %s", exc)


def is_db_ready() -> bool:
    """Fast check with 30s failure caching so requests never hang on unreachable DB."""
    global _db_ready, _last_check_time
    if not has_database():
        return False
    now = time.time()
    if not _db_ready and (now - _last_check_time) < 30.0:
        return False
    _last_check_time = now
    try:
        ensure_pool_open()
        with pool.connection(timeout=10.0) as cx:
            cx.execute("SELECT 1")
            _db_ready = True
            return True
    except Exception as exc:
        log.warning("Database ping failed: %s", exc)
        _db_ready = False
        return False


def check_db() -> bool:
    return is_db_ready()


def fetch_all(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    ensure_pool_open()
    with pool.connection(timeout=10.0) as cx:
        return cx.execute(sql, params).fetchall()


def fetch_one(sql: str, params: tuple = ()) -> dict[str, Any] | None:
    ensure_pool_open()
    with pool.connection(timeout=10.0) as cx:
        return cx.execute(sql, params).fetchone()


def filtered(base: str, filters: list[tuple[str, Any]], tail: str = "") -> tuple[str, tuple]:
    """
    Build a query from optional filters, dropping the ones that were not supplied.
    """
    conditions: list[str] = []
    params: list[Any] = []
    for fragment, value in filters:
        if value is None:
            continue
        conditions.append(fragment)
        params.extend([value] * fragment.count("%s"))
    clause = " WHERE " + " AND ".join(conditions) if conditions else ""
    return f"{base}{clause} {tail}".strip(), tuple(params)
