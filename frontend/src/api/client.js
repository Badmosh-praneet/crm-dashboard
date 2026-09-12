/**
 * API client for Volkswagen Elite Motors CRM Dashboard.
 * Connects to FastAPI backend and Supabase cloud database.
 */

export async function api(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function sendJson(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data && data.detail;
    const msg = Array.isArray(detail)
      ? detail.map(d => `${(d.loc || []).slice(1).join(".")}: ${d.msg}`).join("\n")
      : (detail || `${res.status} ${res.statusText}`);
    throw new Error(msg);
  }
  return data;
}

export async function fetchDashboardData() {
  try {
    const [
      kpi, funnel, board, sources, models, ageing, backorders,
      periods, options, activity, orderbook
    ] = await Promise.all([
      api("/api/kpi"),
      api("/api/funnel"),
      api("/api/leaderboard"),
      api("/api/leads/sourcewise"),
      api("/api/models/position"),
      api("/api/stock/ageing"),
      api("/api/backorders"),
      api("/api/periods"),
      api("/api/entry-options"),
      api("/api/recent-activity?limit=15"),
      api("/api/bookings?limit=50"),
    ]);

    // Enrich KPI with targets from funnel stages if not directly set
    const targetsByStage = {};
    (funnel?.stages || []).forEach(s => {
      if (s.stage && s.target != null) targetsByStage[s.stage] = s.target;
    });

    const enrichedKpi = {
      ...kpi,
      booking_target: kpi.booking_target ?? targetsByStage["Bookings"] ?? 84,
      retail_target: kpi.retail_target ?? targetsByStage["Retails"] ?? 66,
      leads_target: kpi.leads_target ?? targetsByStage["Enquiries"] ?? 450,
      td_target: kpi.td_target ?? targetsByStage["Test drives"] ?? 300,
    };

    return {
      kpi: enrichedKpi, funnel, board, sources, models, ageing, backorders,
      periods, options, activity, orderbook,
      isLive: true,
    };
  } catch (err) {
    console.warn("Live API fetch error, checking snapshot fallback:", err);
    // Offline snapshot fallback
    const snap = await fetch("/snapshot_data.json").then(r => r.json()).catch(() => null);
    if (!snap) throw err;
    return {
      kpi: {
        bookings: snap.funnel?.bookings || 42,
        booking_target: snap.targets?.booking_target || 84,
        enquiries: snap.funnel?.enquiries || 367,
        leads_target: snap.targets?.leads_target || 450,
        retails: snap.funnel?.retails || 18,
        retail_target: snap.targets?.retail_target || 66,
        test_drives: snap.funnel?.test_drives || 128,
        td_target: snap.targets?.td_target || 300,
        free_stock: 69,
        stock_over_90_days: 20,
        backorders: 11,
        bookings_missing_crm_entry: 15,
        booking_amount_collected: 943001,
      },
      funnel: {
        period: snap.funnel?.period || "AUG2026",
        stages: [
          { stage: "Enquiries", value: snap.funnel?.enquiries || 367, target: snap.targets?.leads_target || 450 },
          { stage: "Qualified", value: snap.funnel?.qualified || 361, target: null },
          { stage: "Test drives", value: snap.funnel?.test_drives || 128, target: snap.targets?.td_target || 300 },
          { stage: "Bookings", value: snap.funnel?.bookings || 42, target: snap.targets?.booking_target || 84 },
          { stage: "Retails", value: snap.funnel?.retails || 18, target: snap.targets?.retail_target || 66 },
        ],
      },
      board: snap.board || [],
      sources: snap.sources || [],
      models: snap.models || [],
      ageing: snap.ageing || [],
      backorders: snap.backorders || [],
      periods: [{ label: "AUG2026", is_active: true, period_start: "2026-08-01", period_end: "2026-08-31" }],
      options: { consultants: [], models: [], sources: [], colours: [], open_bookings: [], free_chassis: [] },
      activity: [],
      orderbook: [],
      isLive: false,
    };
  }
}

export async function uploadExcelWorkbook(file, period, uploadedBy) {
  const formData = new FormData();
  formData.append("file", file);
  if (period) formData.append("period", period);
  if (uploadedBy) formData.append("uploaded_by", uploadedBy);

  const res = await fetch("/api/upload-dsr", {
    method: "POST",
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Excel upload failed");
  }
  return data;
}

export async function activatePeriod(label) {
  return sendJson("POST", `/api/period/${encodeURIComponent(label)}/activate`);
}

/* ---- Formatting Helpers ---- */
export const n0 = v => (v == null ? "–" : Number(v).toLocaleString("en-IN"));
export const pct = v => (v == null ? "–" : Number(v).toFixed(1) + "%");

export function money(v) {
  if (v == null) return "–";
  const num = Number(v);
  if (num >= 1e7) return "₹" + (num / 1e7).toFixed(2) + " Cr";
  if (num >= 1e5) return "₹" + (num / 1e5).toFixed(2) + " L";
  return "₹" + num.toLocaleString("en-IN");
}

export function dt(s) {
  if (!s) return "–";
  return new Date(s).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
