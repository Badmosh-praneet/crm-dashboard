"""
Volkswagen Elite Motors - DSR dashboard and API.

    python run.py                       # http://127.0.0.1:8000

Two groups of endpoints share one query layer:

  /api/*     everything the dashboard draws
  /agent/*   the narrow, stable surface the service and client agents call as tools

The /agent routes are deliberately small and answer one question each, because a
tool that returns a whole table forces the model to do the filtering.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import fallback
from .db import check_db, fetch_all, fetch_one, filtered, pool
from .entry import router as entry_router
from .events import broker

log = logging.getLogger("dsr.main")

STATIC = Path(__file__).resolve().parent / "static"
if not STATIC.exists():
    STATIC = Path(__file__).resolve().parent.parent / "public"


@asynccontextmanager
async def lifespan(app: FastAPI):
    is_vercel = bool(os.environ.get("VERCEL"))
    try:
        pool.open()
        if not is_vercel and os.environ.get("DATABASE_URL"):
            pool.wait(timeout=3.0)
            check_db()
    except Exception as exc:
        log.warning("Database connection pool not ready: %s", exc)

    # The change listener SSE thread runs on persistent hosts, not serverless environments
    if not is_vercel and os.environ.get("DATABASE_URL"):
        try:
            await broker.start()
        except Exception as exc:
            log.warning("Change broker not started: %s", exc)

    yield

    if not is_vercel and os.environ.get("DATABASE_URL"):
        try:
            await broker.stop()
        except Exception:
            pass
    try:
        pool.close()
    except Exception:
        pass


app = FastAPI(
    title="Volkswagen Elite Motors - DSR API",
    version="1.0.0",
    lifespan=lifespan,
    description=(
        "Read API over the Daily Sales Report database for Volkswagen Elite Motors, "
        "Hosur Road, Bengaluru. Stock, enquiries, the order book, consultant "
        "scorecards and fulfilment, loaded from the DSR workbook.\n\n"
        "`/agent/*` is the tool surface for the dealership's service and client agents.\n\n"
        "The database is read **and written** here: `/api/leads`, `/api/bookings`, "
        "`/api/test-drives`, `/api/vehicles`, `/api/allotments` and "
        "`/api/registrations` accept new records, and every open dashboard is "
        "pushed an update over `/api/events` the moment one lands."
    ),
)

# Everything that writes, plus the change stream.
app.include_router(entry_router)


# =====================================================================
# Dashboard data
# =====================================================================

@app.get("/api/kpi", tags=["dashboard"])
def kpi():
    """Headline numbers for the current period."""
    try:
        row = fetch_one("SELECT * FROM v_daily_kpi")
        if row:
            return row
    except Exception:
        pass
    return fallback.get_kpi()


@app.get("/api/funnel", tags=["dashboard"])
def funnel():
    """Enquiry to retail funnel, with the target for each stage where one is set."""
    try:
        stages = fetch_one("SELECT * FROM v_sales_funnel")
        targets = fetch_one("""
            SELECT leads_target, td_target, booking_target, retail_target
            FROM v_consultant_scorecard WHERE row_kind = 'GRAND_TOTAL'
        """) or {}
        if stages:
            return {
                "period": stages["period"],
                "stages": [
                    {"stage": "Enquiries",   "value": stages["enquiries"],   "target": targets.get("leads_target")},
                    {"stage": "Qualified",   "value": stages["qualified"],   "target": None},
                    {"stage": "Test drives", "value": stages["test_drives"], "target": targets.get("td_target")},
                    {"stage": "Bookings",    "value": stages["bookings"],    "target": targets.get("booking_target")},
                    {"stage": "Retails",     "value": stages["retails"],     "target": targets.get("retail_target")},
                ],
            }
    except Exception:
        pass
    return fallback.get_funnel()


@app.get("/api/leaderboard", tags=["dashboard"])
def leaderboard():
    """Consultants ranked by their gap to booking target."""
    try:
        res = fetch_all("SELECT * FROM v_consultant_leaderboard")
        if res:
            return res
    except Exception:
        pass
    return fallback.get_leaderboard()


@app.get("/api/scorecards", tags=["dashboard"])
def scorecards(row_kind: str | None = Query(None, pattern="^(CONSULTANT|TEAM_TOTAL|GRAND_TOTAL|OTHER)$")):
    try:
        if row_kind:
            res = fetch_all("SELECT * FROM v_consultant_scorecard WHERE row_kind = %s", (row_kind,))
        else:
            res = fetch_all("SELECT * FROM v_consultant_scorecard")
        if res:
            return res
    except Exception:
        pass
    return fallback.get_scorecards(row_kind)


@app.get("/api/stock", tags=["dashboard"])
def stock(status: str | None = None, model: str | None = None):
    try:
        return fetch_all(*filtered(
            "SELECT * FROM v_stock",
            [("stock_status::text = upper(%s)", status),
             ("model ILIKE %s", model)],
            "ORDER BY stock_aging_days DESC NULLS LAST",
        ))
    except Exception:
        return []


@app.get("/api/stock/availability", tags=["dashboard"])
def stock_availability():
    try:
        res = fetch_all("""
            SELECT * FROM v_stock_availability
            ORDER BY model, variant, colour
        """)
        if res:
            return res
    except Exception:
        pass
    return fallback.get_snapshot().get("avail", [])


@app.get("/api/stock/ageing", tags=["dashboard"])
def stock_ageing():
    try:
        res = fetch_all("""
            SELECT * FROM v_stock_ageing
            ORDER BY model,
                     array_position(ARRAY['0-30','31-60','61-90','91-180','180+','unknown'],
                                    ageing_bucket)
        """)
        if res:
            return res
    except Exception:
        pass
    return fallback.get_stock_ageing()


@app.get("/api/models/position", tags=["dashboard"])
def model_position():
    try:
        res = fetch_all("SELECT * FROM v_model_position ORDER BY total_stock DESC, model")
        if res:
            return res
    except Exception:
        pass
    return fallback.get_models_position()


@app.get("/api/models/demand", tags=["dashboard"])
def model_demand():
    try:
        res = fetch_all("SELECT * FROM v_model_demand ORDER BY enquiries DESC")
        if res:
            return res
    except Exception:
        pass
    return fallback.get_models_demand()


@app.get("/api/leads/sourcewise", tags=["dashboard"])
def leads_sourcewise():
    try:
        res = fetch_all("SELECT * FROM v_leads_sourcewise ORDER BY leads DESC")
        if res:
            return res
    except Exception:
        pass
    return fallback.get_leads_sourcewise()


@app.get("/api/bookings", tags=["dashboard"])
def bookings(
    current_only: bool = True,
    status: str | None = None,
    consultant: str | None = None,
    limit: int = Query(200, le=1000),
):
    try:
        sql, params = filtered(
            "SELECT * FROM v_bookings",
            [("is_current_period", True if current_only else None),
             ("fulfilment_status::text = %s", status),
             ("consultant ILIKE %s", consultant)],
            "ORDER BY booking_date DESC NULLS LAST LIMIT %s",
        )
        res = fetch_all(sql, params + (limit,))
        if res:
            return res
    except Exception:
        pass
    return fallback.get_bookings(limit)


@app.get("/api/backorders", tags=["dashboard"])
def backorders():
    """Orders with no car against them, longest wait first."""
    try:
        res = fetch_all("SELECT * FROM v_backorders ORDER BY days_waiting DESC NULLS LAST")
        if res:
            return res
    except Exception:
        pass
    return fallback.get_backorders()


@app.get("/api/attachments", tags=["dashboard"])
def attachments():
    try:
        res = fetch_one("SELECT * FROM v_attachment_rates")
        if res:
            return res
    except Exception:
        pass
    return fallback.get_attachments()


@app.get("/api/commitments", tags=["dashboard"])
def commitments():
    try:
        res = fetch_all("""
            SELECT * FROM v_booking_commitments
            ORDER BY consultant_label,
                     array_position(ARRAY['TILL 12TH','13 TO 19','20 TO 26'], window_label)
        """)
        if res:
            return res
    except Exception:
        pass
    return fallback.get_commitments()


@app.get("/api/data-quality", tags=["dashboard"])
def data_quality():
    """
    Disagreements between the workbook's tabs, found during the load.
    """
    try:
        res = fetch_all("""
            SELECT * FROM v_data_quality
            ORDER BY array_position(ARRAY['high','medium','low'], severity)
        """)
        if res:
            return res
    except Exception:
        pass
    return fallback.get_data_quality()


@app.get("/api/meta", tags=["dashboard"])
def meta():
    """Provenance: which workbook this data came from and when it was loaded."""
    try:
        run = fetch_one("""
            SELECT source_file, file_modified, finished_at, row_counts, notes
            FROM etl_run ORDER BY run_id DESC LIMIT 1
        """)
        period = fetch_one("SELECT label, period_start, period_end FROM dim_period LIMIT 1")
        if run:
            return {"latest_load": run, "period": period}
    except Exception:
        pass
    return fallback.get_meta()


# =====================================================================
# Agent tool surface
# =====================================================================

@app.get("/agent/availability", tags=["agent: client"])
def agent_availability(
    model: str | None = Query(None, description="Model or family, e.g. Virtus, Taigun"),
    variant: str | None = Query(None, description="Trim, e.g. GT Line AT"),
    colour: str | None = Query(None, description="Colour name, e.g. Candy White"),
):
    """
    Is a car available right now? Substring matching on each field, so a customer's
    loose phrasing ("a white Virtus") still resolves.
    """
    try:
        return fetch_all(*filtered(
            "SELECT * FROM agent_vehicle_availability",
            [("(model ILIKE '%%' || %s || '%%' OR model_family ILIKE '%%' || %s || '%%')", model),
             ("variant ILIKE '%%' || %s || '%%'", variant),
             ("colour ILIKE '%%' || %s || '%%'", colour)],
            "ORDER BY model, variant, colour",
        ))
    except Exception:
        avail = fallback.get_snapshot().get("avail", [])
        res = []
        for a in avail:
            if model and model.lower() not in (a.get("model") or "").lower():
                continue
            if variant and variant.lower() not in (a.get("variant") or "").lower():
                continue
            if colour and colour.lower() not in (a.get("colour") or "").lower():
                continue
            res.append(a)
        return res


@app.get("/agent/order-status", tags=["agent: client"])
def agent_order_status(
    name: str | None = Query(None, description="Customer name, full or partial"),
    mobile: str | None = Query(None, description="10-digit mobile number"),
):
    if not name and not mobile:
        raise HTTPException(400, "pass either name or mobile")
    try:
        return fetch_all(*filtered(
            "SELECT * FROM agent_order_status",
            [("customer_name ILIKE '%%' || %s || '%%'", name),
             ("mobile = %s", mobile)],
            "ORDER BY booking_date DESC NULLS LAST",
        ))
    except Exception:
        backorders = fallback.get_backorders()
        res = []
        for b in backorders:
            if name and name.lower() in (b.get("customer_name") or "").lower():
                res.append(b)
            elif mobile and mobile in (b.get("mobile") or ""):
                res.append(b)
        return res


@app.get("/agent/model-catalogue", tags=["agent: client"])
def agent_model_catalogue():
    """Models and trims the dealership actually transacts, with live free stock."""
    try:
        return fetch_all("""
            SELECT m.name AS model, m.family, m.is_cbu,
                   dv.name AS variant, dv.transmission, dv.long_model_text,
                   count(v.vehicle_id) FILTER (WHERE v.stock_status = 'FREESTOCK') AS free_units
            FROM dim_model m
            JOIN dim_variant dv ON dv.model_id = m.model_id
            LEFT JOIN vehicle v ON v.variant_id = dv.variant_id
            GROUP BY m.name, m.family, m.is_cbu, dv.name, dv.transmission, dv.long_model_text
            ORDER BY m.name, dv.name
        """)
    except Exception:
        avail = fallback.get_snapshot().get("avail", [])
        return avail


@app.get("/agent/snapshot", tags=["agent: service"])
def agent_snapshot():
    """One call that answers "how is the dealership doing this month?"."""
    try:
        res = fetch_one("SELECT * FROM agent_dealership_snapshot")
        if res:
            return res
    except Exception:
        pass
    kpi = fallback.get_kpi()
    return kpi


@app.get("/agent/consultant", tags=["agent: service"])
def agent_consultant(name: str = Query(..., description="Consultant name, full or partial")):
    """A single consultant's scorecard against target."""
    try:
        rows = fetch_all("""
            SELECT * FROM v_consultant_scorecard
            WHERE row_kind = 'CONSULTANT' AND consultant ILIKE '%%' || %s || '%%'
        """, (name,))
        if rows:
            return rows
    except Exception:
        pass
    board = fallback.get_leaderboard()
    matched = [r for r in board if name.lower() in (r.get("consultant") or "").lower()]
    if not matched:
        raise HTTPException(404, f"no consultant matching {name!r}")
    return matched


@app.get("/agent/action-list", tags=["agent: service"])
def agent_action_list():
    """
    What needs chasing today, in one payload: stock at risk, orders with no car,
    deals missing from the CRM.
    """
    try:
        return {
            "stock_past_retail_deadline": fetch_all("""
                SELECT chassis_number, model, variant, colour,
                       stock_aging_days, nadcon_retail_date
                FROM v_stock
                WHERE stock_status = 'FREESTOCK' AND nadcon_retail_date < CURRENT_DATE
                ORDER BY nadcon_retail_date
            """),
            "ageing_over_90_days": fetch_all("""
                SELECT chassis_number, model, variant, colour, stock_aging_days
                FROM v_stock
                WHERE stock_status = 'FREESTOCK' AND stock_aging_days > 90
                ORDER BY stock_aging_days DESC
            """),
            "backorders": fetch_all("""
                SELECT customer_name, consultant, model, variant, colour,
                       days_waiting, matching_free_units
                FROM v_backorders ORDER BY days_waiting DESC NULLS LAST
            """),
            "bookings_missing_crm_entry": fetch_all("""
                SELECT customer_name, consultant, model, variant, booking_date
                FROM v_bookings
                WHERE is_current_period AND crm_entry_done IS FALSE
                ORDER BY booking_date
            """),
        }
    except Exception:
        return fallback.get_action_list()


# =====================================================================
# Static dashboard
# =====================================================================

if STATIC.exists():
    app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/", include_in_schema=False)
def dashboard():
    index_file = STATIC / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "Volkswagen Elite Motors CRM API is running."}


@app.get("/snapshot", include_in_schema=False)
def snapshot_page():
    snap_file = STATIC / "snapshot.html"
    if snap_file.exists():
        return FileResponse(snap_file)
    return FileResponse(STATIC / "index.html")


@app.get("/health", tags=["system"])
def health():
    db_status = "connected" if check_db() else "fallback_snapshot"
    return {
        "status": "ok",
        "database": db_status,
        "environment": "vercel" if os.environ.get("VERCEL") else "local",
    }
