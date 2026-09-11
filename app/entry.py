"""
Data-entry and live-stream routes.

Split out from main.py so the read API stays easy to scan: everything that
changes the database, plus the event stream the dashboard listens on, lives here
and is mounted onto the app as a router.

Names are resolved to dimension rows on the way in (see app/write.py), so a
consultant, model, trim, colour or source that has not been seen before is
created rather than rejected. Every row is stamped origin = 'MANUAL' so the next
workbook reload leaves it alone.
"""

from __future__ import annotations

import os
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from psycopg.errors import IntegrityError

from . import fallback
from .db import fetch_all, pool
from .events import broker
from etl.dimensions import activate_period
from .write import (AllotmentIn, BookingIn, BookingPatch, LeadIn, RegistrationIn,
                    TestDriveIn, VehicleIn, create_allotment, create_booking,
                    create_lead, create_registration, create_test_drive,
                    delete_row, update_booking, upsert_vehicle)

router = APIRouter()


# =====================================================================
# Live change stream
# =====================================================================

@router.get("/api/events", tags=["live"], include_in_schema=False)
async def events():
    """
    Server-sent events: one `change` frame whenever the database moves.

    The dashboard subscribes here instead of polling, so it updates within about
    half a second of any write - including writes that did not come from the
    dashboard, because the notification is raised by a database trigger rather
    than by this process.
    """
    if os.environ.get("VERCEL"):
        async def vercel_stream():
            yield 'event: ready\ndata: {"connected": false, "serverless": true}\n\n'
        return StreamingResponse(
            vercel_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache"},
        )

    return StreamingResponse(
        broker.stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",      # stops nginx buffering the stream
        },
    )


@router.get("/api/live-status", tags=["live"])
def live_status():
    """Whether the listener is attached, and how many dashboards are watching."""
    if os.environ.get("VERCEL"):
        return {"connected": False, "serverless": True, "subscribers": 0, "events_seen": 0, "last_error": None}
    return broker.status


# =====================================================================
# Writes
# =====================================================================

def _commit(fn, *args):
    """Run one writer inside a transaction and turn its errors into HTTP codes."""
    try:
        with pool.connection(timeout=3.0) as cx:
            with cx.transaction():
                return fn(cx, *args)
    except PermissionError as exc:
        raise HTTPException(409, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except IntegrityError as exc:
        # Unique and foreign-key violations are the caller's problem, not a 500.
        raise HTTPException(409, str(exc).strip().splitlines()[0]) from exc
    except Exception as exc:
        raise HTTPException(
            503,
            f"Database operation unavailable: {exc}. Please configure a PostgreSQL DATABASE_URL in Vercel."
        ) from exc


@router.post("/api/leads", status_code=201, tags=["entry"])
def add_lead(body: LeadIn):
    return _commit(create_lead, body)


@router.post("/api/bookings", status_code=201, tags=["entry"])
def add_booking(body: BookingIn):
    return _commit(create_booking, body)


@router.patch("/api/bookings/{booking_id}", tags=["entry"])
def patch_booking(booking_id: int, body: BookingPatch):
    return _commit(update_booking, booking_id, body)


@router.post("/api/test-drives", status_code=201, tags=["entry"])
def add_test_drive(body: TestDriveIn):
    return _commit(create_test_drive, body)


@router.post("/api/vehicles", status_code=201, tags=["entry"])
def add_vehicle(body: VehicleIn):
    return _commit(upsert_vehicle, body)


@router.post("/api/allotments", status_code=201, tags=["entry"])
def add_allotment(body: AllotmentIn):
    return _commit(create_allotment, body)


@router.post("/api/registrations", status_code=201, tags=["entry"])
def add_registration(body: RegistrationIn):
    return _commit(create_registration, body)


@router.delete("/api/entries/{table}/{row_id}", status_code=200, tags=["entry"])
def delete_entry(table: str, row_id: int):
    return _commit(delete_row, table, row_id)


# =====================================================================
# Dropdowns and datalists for the entry drawer
# =====================================================================

@router.get("/api/entry-options", tags=["entry"])
def entry_options():
    try:
        return {
            "consultants": [r["display_name"] for r in fetch_all(
                "SELECT display_name FROM dim_consultant WHERE is_active "
                "ORDER BY display_name")],
            "sources": [r["name"] for r in fetch_all(
                "SELECT name FROM dim_lead_source ORDER BY name")],
            "models": [r["name"] for r in fetch_all(
                "SELECT name FROM dim_model ORDER BY name")],
            "variants": fetch_all(
                "SELECT m.name AS model, v.name AS variant, v.long_model_text "
                "FROM dim_variant v JOIN dim_model m USING (model_id) "
                "ORDER BY m.name, v.name"),
            "colours": [r["name"] for r in fetch_all(
                "SELECT name FROM dim_colour ORDER BY name")],
            "fulfilment_statuses": ["BOOKED", "NO_STOCK", "ALLOTED",
                                    "RETAILED", "CANCELLED"],
            "open_bookings": fetch_all("""
                SELECT b.booking_id, b.customer_name, m.name AS model,
                       dv.name AS variant, c.display_name AS consultant
                FROM booking b
                LEFT JOIN dim_model m      ON m.model_id = b.model_id
                LEFT JOIN dim_variant dv   ON dv.variant_id = b.variant_id
                LEFT JOIN dim_consultant c ON c.consultant_id = b.consultant_id
                WHERE b.fulfilment_status IN ('BOOKED', 'NO_STOCK')
                ORDER BY b.booking_date DESC NULLS LAST
                LIMIT 200
            """),
            "free_chassis": fetch_all("""
                SELECT chassis_number, model, variant, colour, stock_aging_days
                FROM v_stock WHERE stock_status = 'FREESTOCK'
                ORDER BY stock_aging_days DESC NULLS LAST
            """),
        }
    except Exception:
        return fallback.get_entry_options()


@router.get("/api/recent-activity", tags=["entry"])
def recent_activity(limit: int = Query(25, le=100)):
    try:
        return fetch_all("""
            SELECT 'booking' AS kind, booking_id AS id, customer_name AS who,
                   loaded_at, entered_by
              FROM booking WHERE origin = 'MANUAL'
            UNION ALL
            SELECT 'lead', lead_id, lead_name, loaded_at, entered_by
              FROM lead WHERE origin = 'MANUAL'
            UNION ALL
            SELECT 'test drive', test_drive_id, lead_name, loaded_at, entered_by
              FROM test_drive WHERE origin = 'MANUAL'
            UNION ALL
            SELECT 'allotment', allotment_id, customer_name, loaded_at, entered_by
              FROM allotment WHERE origin = 'MANUAL'
            UNION ALL
            SELECT 'registration', registration_id, customer_name, loaded_at, entered_by
              FROM registration WHERE origin = 'MANUAL'
            UNION ALL
            SELECT 'vehicle', vehicle_id, chassis_number, loaded_at, entered_by
              FROM vehicle WHERE origin = 'MANUAL'
            ORDER BY loaded_at DESC
            LIMIT %s
        """, (limit,))
    except Exception:
        return []


# =====================================================================
# Reporting period
# =====================================================================

@router.get("/api/periods", tags=["entry"])
def periods():
    try:
        res = fetch_all("""
            SELECT p.label, p.period_start, p.period_end, p.is_active,
                   (SELECT count(*) FROM lead l    WHERE l.period_id = p.period_id) AS leads,
                   (SELECT count(*) FROM booking b WHERE b.period_id = p.period_id) AS bookings
            FROM dim_period p
            ORDER BY p.period_start DESC
        """)
        if res:
            return res
    except Exception:
        pass
    return fallback.get_periods()


@router.post("/api/period/{label}/activate", tags=["entry"])
def set_active_period(label: str):
    return _commit(activate_period, label)
