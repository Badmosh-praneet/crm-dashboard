import React from 'react';
import { Car, Layers, History } from 'lucide-react';
import { n0, dt } from '../api/client';

export default function StockAndModels({ models = [], ageing = [], activity = [] }) {
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
              </tr>
            </thead>
            <tbody>
              {models.length > 0 ? (
                models.map((m, idx) => (
                  <tr key={m.model || idx}>
                    <td style={{ fontWeight: '600' }}>{m.model}</td>
                    <td className="num" style={{ fontWeight: '700', color: 'var(--s1)' }}>
                      {n0(m.bookings || 0)}
                    </td>
                    <td className="num">{n0(m.retails || 0)}</td>
                    <td className="num" style={{ fontWeight: '600', color: 'var(--good-text)' }}>
                      {n0(m.free_stock || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
                    No model data available.
                  </td>
                </tr>
              )}
            </tbody>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {ageing.length > 0 ? (
              ageing.map((b, idx) => (
                <div key={b.bucket || idx} style={{
                  background: 'var(--surface-sub)',
                  borderRadius: '8px',
                  padding: '12px 10px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: '600' }}>
                    {b.bucket}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '4px', color: idx === 3 ? 'var(--critical)' : 'var(--ink)' }}>
                    {n0(b.count || 0)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: 'span 4', textAlign: 'center', color: 'var(--ink-muted)', padding: '10px' }}>
                Stock aging data loaded from database.
              </div>
            )}
          </div>
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
