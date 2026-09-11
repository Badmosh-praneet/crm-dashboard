"""Database access for the DSR dashboard."""

from __future__ import annotations

import logging
import os
from typing import Any

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

log = logging.getLogger("dsr.db")

DSN = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@127.0.0.1:5432/elite_dsr",
)
if DSN.startswith("postgres://"):
    DSN = "postgresql://" + DSN[len("postgres://"):]

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


def check_db() -> bool:
    global _db_ready
    try:
        with pool.connection(timeout=2.0) as cx:
            cx.execute("SELECT 1")
            _db_ready = True
            return True
    except Exception:
        _db_ready = False
        return False


def is_db_ready() -> bool:
    return _db_ready


def fetch_all(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    with pool.connection(timeout=3.0) as cx:
        return cx.execute(sql, params).fetchall()


def fetch_one(sql: str, params: tuple = ()) -> dict[str, Any] | None:
    with pool.connection(timeout=3.0) as cx:
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
