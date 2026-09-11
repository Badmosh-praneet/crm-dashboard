"""Fallback data provider when PostgreSQL is offline or unconfigured."""
from __future__ import annotations

from typing import Any
from .data_bundle import DATA


def get_snapshot() -> dict[str, Any]:
    return DATA


def get_kpi() -> dict[str, Any]:
    return get_snapshot().get("kpi", {
        "period": "AUG2026",
        "enquiries": 367,
        "qualified": 361,
        "test_drives": 128.0,
        "bookings": 42,
        "retails": 18,
        "enquiry_to_booking_pct": 11.4,
        "booking_to_retail_pct": 42.9,
        "free_stock": 69,
        "allotted_stock": 20,
        "stock_over_90_days": 20,
        "backorders": 11,
        "bookings_missing_crm_entry": 15,
        "booking_amount_collected": 943001.0,
        "avg_allotment_tat_days": 3.5,
    })


def get_funnel() -> dict[str, Any]:
    snap = get_snapshot()
    funnel = snap.get("funnel", {})
    targets = snap.get("targets", {})
    return {
        "period": funnel.get("period", "AUG2026"),
        "stages": [
            {"stage": "Enquiries",   "value": funnel.get("enquiries", 367),   "target": targets.get("leads_target", 450)},
            {"stage": "Qualified",   "value": funnel.get("qualified", 361),   "target": None},
            {"stage": "Test drives", "value": funnel.get("test_drives", 128), "target": targets.get("td_target", 300)},
            {"stage": "Bookings",    "value": funnel.get("bookings", 42),    "target": targets.get("booking_target", 84)},
            {"stage": "Retails",     "value": funnel.get("retails", 18),     "target": targets.get("retail_target", 66)},
        ],
    }


def get_leaderboard() -> list[dict[str, Any]]:
    return get_snapshot().get("board", [])


def get_scorecards(row_kind: str | None = None) -> list[dict[str, Any]]:
    snap = get_snapshot()
    board = snap.get("board", [])
    teams = snap.get("teams", [])
    all_rows = []
    for b in board:
        r = dict(b)
        r["row_kind"] = "CONSULTANT"
        all_rows.append(r)
    for t in teams:
        r = dict(t)
        r["row_kind"] = "TEAM_TOTAL"
        all_rows.append(r)
    if row_kind:
        return [r for r in all_rows if r.get("row_kind") == row_kind]
    return all_rows


def get_leads_sourcewise() -> list[dict[str, Any]]:
    return get_snapshot().get("sources", [])


def get_models_position() -> list[dict[str, Any]]:
    return get_snapshot().get("models", [])


def get_models_demand() -> list[dict[str, Any]]:
    return get_snapshot().get("demand", [])


def get_stock_ageing() -> list[dict[str, Any]]:
    return get_snapshot().get("ageing", [])


def get_backorders() -> list[dict[str, Any]]:
    return get_snapshot().get("backorders", [])


def get_attachments() -> dict[str, Any]:
    return get_snapshot().get("attach", {
        "registrations": 18,
        "financed": 13,
        "insured": 13,
        "extended_warranty": 1,
        "service_value_package": 1,
        "corporate": 6,
        "finance_pct": 72.2,
        "insurance_pct": 72.2,
    })


def get_commitments() -> list[dict[str, Any]]:
    return get_snapshot().get("commit", [])


def get_data_quality() -> list[dict[str, Any]]:
    return get_snapshot().get("dq", [])


def get_meta() -> dict[str, Any]:
    snap = get_snapshot()
    return {
        "latest_load": snap.get("meta", {
            "source_file": "DSR August 2026.xlsx",
            "file_modified": "2026-09-08T13:14:37",
            "finished_at": "2026-09-10T17:04:44",
        }),
        "period": snap.get("period", {
            "label": "AUG2026",
            "period_start": "2026-08-01",
            "period_end": "2026-08-31",
        }),
    }


def get_action_list() -> dict[str, Any]:
    snap = get_snapshot()
    return {
        "stock_past_retail_deadline": snap.get("deadline", []),
        "ageing_over_90_days": [
            d for d in snap.get("deadline", []) if d.get("stock_aging_days", 0) > 90
        ],
        "backorders": snap.get("backorders", []),
        "bookings_missing_crm_entry": snap.get("nocrm", []),
    }


def get_periods() -> list[dict[str, Any]]:
    return [{
        "label": "AUG2026",
        "is_active": True,
        "period_start": "2026-08-01",
        "period_end": "2026-08-31",
        "working_days": 26,
        "bookings": 42,
        "retails": 18,
    }]


def get_entry_options() -> dict[str, Any]:
    snap = get_snapshot()
    board = snap.get("board", [])
    avail = snap.get("avail", [])
    consultants = sorted({r.get("consultant") for r in board if r.get("consultant")})
    models = sorted({r.get("model") for r in avail if r.get("model")})
    variants = []
    seen = set()
    for r in avail:
        key = (r.get("model"), r.get("variant"))
        if key not in seen and r.get("model") and r.get("variant"):
            seen.add(key)
            variants.append({
                "model": r.get("model"),
                "variant": r.get("variant"),
                "transmission": r.get("transmission"),
                "long_model_text": f"{r.get('model')} {r.get('variant')}",
            })
    colours = sorted({r.get("colour") for r in avail if r.get("colour")})
    return {
        "consultants": consultants,
        "sources": ["CRM", "TELE", "WALKIN", "DIGITAL", "REFERENCE", "WORKSHOP REFERRAL", "SHOWROOM REFERRAL"],
        "models": models,
        "variants": variants,
        "colours": colours,
        "fulfilment_statuses": ["BOOKED", "NO_STOCK", "ALLOTED", "RETAILED", "CANCELLED"],
        "open_bookings": [],
        "free_chassis": [],
    }


def get_bookings(limit: int = 40) -> list[dict[str, Any]]:
    snap = get_snapshot()
    nocrm = snap.get("nocrm", [])
    res = []
    for i, b in enumerate(nocrm[:limit], start=1):
        res.append({
            "booking_id": i,
            "customer_name": b.get("customer_name"),
            "model": b.get("model"),
            "variant": b.get("variant"),
            "colour": b.get("colour", "Candy White"),
            "consultant": b.get("consultant"),
            "booking_date": b.get("booking_date"),
            "fulfilment_status": "BOOKED",
            "crm_entry_done": False,
            "booking_amount": 25000,
            "source_sheet": "DSR August 2026",
            "is_current_period": True,
        })
    return res
