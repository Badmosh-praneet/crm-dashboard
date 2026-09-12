import React from 'react';
import { Car, Layers, History } from 'lucide-react';
import { n0, dt } from '../api/client';

export default function StockAndModels({ models = [], ageing = [], activity = [] }) {
  // Aggregate inventory ageing buckets across all models
  const b0_30 = ageing.filter(a => a.ageing_bucket === '0-30').reduce((s, a) => s + Number(a.units || 0), 0);
  const b31_60 = ageing.filter(a => a.ageing_bucket === '31-60').reduce((s, a) => s + Number(a.units || 0), 0);
  const b61_90 = ageing.filter(a => a.ageing_bucket === '61-90').reduce((s, a) => s + Number(a.units || 0), 0);
  const b90_plus = ageing.filter(a => a.ageing_bucket === '91-180' || a.ageing_bucket === '180+').reduce((s, a) => s + Number(a.units || 0), 0);

  const bucketCards = [
    { label: '0–30 Days', count: b0_30, sub: 'Fresh Stock', color: 'var(--good)' },
    { label: '31–60 Days', count: b31_60, sub: 'Healthy Turn', color: 'var(--s1)' },
    { label: '61–90 Days', count: b61_90, sub: 'Watchlist', color: 'var(--warning)' },
    { label: '>90 Days', count: b90_plus, sub: 'Interest Cost', color: 'var(--critical)' },
  ];

  // Group ageing by model for the breakdown view
  const byModel = {};
  ageing.forEach(a => {
    const m = a.model || 'Unknown';
    if (!byModel[m]) {
      byModel[m] = { '0-30': 0, '31-60': 0, '61-90': 0, '>90': 0, total: 0 };
    }
    const u = Number(a.units || 0);
    const b = a.ageing_bucket;
    if (b === '0-30') byModel[m]['0-30'] += u;
    else if (b === '31-60') byModel[m]['31-60'] += u;
    else if (b === '61-90') byModel[m]['61-90'] += u;
    else byModel[m]['>90'] += u;
    byModel[m].total += u;
  });
  const modelAgeingList = Object.entries(byModel)
    .map(([model, data]) => ({ model, ...data }))
    .sort((a, b) => b.total - a.total);

  // Totals for Model Performance
  const totBookings = models.reduce((s, m) => s + Number(m.bookings_this_period ?? m.bookings ?? 0), 0);
  const totRetails = models.reduce((s, m) => s + Number(m.registered ?? m.retails ?? 0), 0);
  const totFree = models.reduce((s, m) => s + Number(m.free_stock ?? 0), 0);
  const totStock = models.reduce((s, m) => s + Number(m.total_stock ?? ((m.free_stock || 0) + (m.allotted_stock || 0))), 0);

  return (
    <div className="grid-2">
      {/* Model Performance */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Model Performance &amp; Inventory</h2>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
              Bookings and free stock breakdown by vehicle model
            </div>
          </div>
          <Car size={18} style={{ color: 'var(--ink-muted)' }} />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th className="num">Bookings</th>
                <th className="num">Retails</th>
                <th className="num">Free Stock</th>
                <th className="num">Total Stock</th>
              </tr>
            </thead>
            <tbody>
              {models.length > 0 ? (
                models.map((m, idx) => {
                  const bk = Number(m.bookings_this_period ?? m.bookings ?? 0);
                  const rt = Number(m.registered ?? m.retails ?? 0);
                  const free = Number(m.free_stock ?? 0);
                  const total = Number(m.total_stock ?? ((m.free_stock || 0) + (m.allotted_stock || 0)));

                  return (
                    <tr key={m.model || idx}>
                      <td style={{ fontWeight: '600' }}>{m.model}</td>
                      <td className="num" style={{ fontWeight: '700', color: 'var(--s1)' }}>
                        {n0(bk)}
                      </td>
                      <td className="num" style={{ fontWeight: '600' }}>{n0(rt)}</td>
                      <td className="num" style={{ fontWeight: '600', color: 'var(--good-text)' }}>
                        {n0(free)}
                      </td>
                      <td className="num" style={{ color: 'var(--ink-muted)' }}>
                        {n0(total)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
                    No model data available.
                  </td>
                </tr>
              )}
            </tbody>
            {models.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--axis)', fontWeight: '700', background: 'var(--surface-sub)' }}>
                  <td style={{ padding: '8px 10px' }}>Total Ground Position</td>
                  <td className="num" style={{ color: 'var(--s1)' }}>{n0(totBookings)}</td>
                  <td className="num">{n0(totRetails)}</td>
                  <td className="num" style={{ color: 'var(--good-text)' }}>{n0(totFree)}</td>
                  <td className="num" style={{ color: 'var(--ink-muted)' }}>{n0(totStock)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Stock Ageing & Recent Cloud Activity */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <div className="panel-head" style={{ marginBottom: '10px' }}>
            <div>
              <h2>Inventory Ageing Distribution</h2>
              <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                Days on floor since Volkswagen billing date
              </div>
            </div>
            <Layers size={18} style={{ color: 'var(--ink-muted)' }} />
          </div>

          {/* 4 Summary Bucket Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {bucketCards.map((b, idx) => (
              <div key={b.label} style={{
                background: 'var(--surface-sub)',
                borderRadius: '8px',
                padding: '12px 10px',
                textAlign: 'center',
                borderTop: `3px solid ${b.color}`,
              }}>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: '600' }}>
                  {b.label}
                </div>
                <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '4px', color: b.color }}>
                  {n0(b.count)}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                  {b.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Model Breakdown */}
          {modelAgeingList.length > 0 && (
            <div style={{ marginTop: '14px', borderTop: '1px solid var(--grid)', paddingTop: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                Model Ageing Breakdown (Units)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                {modelAgeingList.map(item => (
                  <div key={item.model} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: 'var(--surface-sub)',
                  }}>
                    <span style={{ fontWeight: '600' }}>{item.model}</span>
                    <div style={{ display: 'flex', gap: '12px', color: 'var(--ink-2)', fontSize: '11.5px' }}>
                      <span title="0-30 Days">0-30d: <b>{item['0-30']}</b></span>
                      <span title="31-60 Days">31-60d: <b>{item['31-60']}</b></span>
                      <span title="61-90 Days">61-90d: <b>{item['61-90']}</b></span>
                      <span title="Over 90 Days" style={{ color: item['>90'] > 0 ? 'var(--critical)' : 'inherit' }}>
                        &gt;90d: <b>{item['>90']}</b>
                      </span>
                      <span style={{ fontWeight: '700', borderLeft: '1px solid var(--border)', paddingLeft: '8px' }}>
                        Total: {item.total}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Cloud Activity Feed */}
        <div style={{ flex: 1, borderTop: '1px solid var(--grid)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <History size={15} style={{ color: 'var(--s1)' }} />
            <h3 style={{ margin: 0, fontSize: '13px' }}>Recent Cloud Database Activity</h3>
          </div>

          <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activity.length > 0 ? (
              activity.slice(0, 5).map((act, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'var(--surface-sub)',
                  borderRadius: '6px',
                }}>
                  <span>
                    <b>+{act.kind || 'entry'}</b>: {act.who || 'Record'}
                  </span>
                  <span style={{ color: 'var(--ink-muted)' }}>
                    {dt(act.loaded_at)} {act.entered_by ? `· by ${act.entered_by}` : ''}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--ink-muted)' }}>
                New entries saved via Way 1 or Way 2 will appear here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
