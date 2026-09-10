"""Database access for the DSR dashboard."""

from __future__ import annotations

import os
from typing import Any

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

DSN = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@127.0.0.1:5432/elite_dsr",
)

# Every query in this app runs against the dsr schema, so the search path is set
# once on connection rather than repeated in each statement.
pool = ConnectionPool(
    DSN,
    min_size=1,
    max_size=8,
    open=False,
    kwargs={"row_factory": dict_row, "options": "-c search_path=dsr,public"},
)


def fetch_all(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    with pool.connection() as cx:
        return cx.execute(sql, params).fetchall()


def fetch_one(sql: str, params: tuple = ()) -> dict[str, Any] | None:
    with pool.connection() as cx:
        return cx.execute(sql, params).fetchone()


def filtered(base: str, filters: list[tuple[str, Any]], tail: str = "") -> tuple[str, tuple]:
    """
    Build a query from optional filters, dropping the ones that were not supplied.

    Each filter is a (sql_fragment, value) pair; a fragment may use %s more than
    once and the value is repeated to match. This is preferred over the
    `WHERE (%s IS NULL OR col = %s)` idiom: Postgres cannot infer a type for a
    parameter whose only use is `IS NULL`, and rejects the statement outright.

        sql, params = filtered(
            "SELECT * FROM v_stock",
            [("model ILIKE %s", model)],
            "ORDER BY stock_aging_days DESC NULLS LAST",
        )
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
