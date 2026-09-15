import React, { useState } from 'react';
import { Search, FileSpreadsheet } from 'lucide-react';
import { n0, money, dt, pct } from '../api/client';

export default function DataTables({ orderbook = [], sources = [], backorders = [] }) {
  const [tab, setTab] = useState('bookings');
  const [query, setQuery] = useState('');

  const filteredBookings = orderbook.filter(b => {
    const q = query.toLowerCase();
    return (
      (b.customer_name || '').toLowerCase().includes(q) ||
      (b.consultant || '').toLowerCase().includes(q) ||
      (b.model || '').toLowerCase().includes(q) ||
      (b.fulfilment_status || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="panel" style={{ marginTop: '20px', border: '1px solid var(--axis)' }}>
      <div className="panel-head" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileSpreadsheet size={18} style={{ color: 'var(--s1)' }} />
          <h2>Detailed CRM Data Tables</h2>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--surface-sub)',
            borderRadius: '6px',
            padding: '4px 10px',
            border: '1px solid var(--border)',
          }}>
            <Search size={14} style={{ color: 'var(--ink-muted)' }} />
            <input
              type="text"
              placeholder="Search records..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '2px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className={tab === 'bookings' ? 'primary' : ''}
              onClick={() => setTab('bookings')}
            >
              Order Book ({orderbook.length})
            </button>
            <button
              className={tab === 'sources' ? 'primary' : ''}
              onClick={() => setTab('sources')}
            >
              Lead Sources ({sources.length})
            </button>
            <button
              className={tab === 'backorders' ? 'primary' : ''}
              onClick={() => setTab('backorders')}
            >
              Backorders ({backorders.length})
            </button>
          </div>
        </div>
      </div>

      {tab === 'bookings' && (
        <div className="table-wrap" style={{ maxHeight: '420px' }}>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Consultant</th>
                <th>Model</th>
                <th>Variant / Colour</th>
                <th>Status</th>
                <th>Date</th>
                <th className="num">Deposit ₹</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length > 0 ? (
                filteredBookings.map((b, i) => (
                  <tr key={b.booking_id || i}>
                    <td style={{ fontWeight: '600' }}>{b.customer_name}</td>
                    <td>{b.consultant || '–'}</td>
                    <td style={{ fontWeight: '500' }}>{b.model}</td>
                    <td style={{ color: 'var(--ink-muted)' }}>
                      {b.variant ? b.variant : ''} {b.colour ? `· ${b.colour}` : ''}
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: b.fulfilment_status === 'BOOKED' ? 'var(--s1-light)' : 'var(--surface-sub)',
                        color: b.fulfilment_status === 'BOOKED' ? 'var(--s1)' : 'var(--ink-2)',
                      }}>
                        {b.fulfilment_status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--ink-muted)' }}>{dt(b.booking_date)}</td>
                    <td className="num" style={{ fontWeight: '600' }}>
                      {b.booking_amount ? money(b.booking_amount) : '–'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-muted)', padding: '24px' }}>
                    No bookings found matching "{query}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sources' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Channel / Source</th>
                <th>Type</th>
                <th className="num">Enquiries</th>
                <th className="num">Qualified</th>
                <th className="num">Qualified %</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s, i) => (
                <tr key={s.source || i}>
                  <td style={{ fontWeight: '600' }}>{s.source}</td>
                  <td style={{ color: 'var(--ink-muted)' }}>{s.channel || 'Direct'}</td>
                  <td className="num">{n0(s.leads ?? s.enquiries ?? 0)}</td>
                  <td className="num">{n0(s.qualified ?? 0)}</td>
                  <td className="num" style={{ fontWeight: '600', color: 'var(--good)' }}>
                    {pct(s.qualified_pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'backorders' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Model</th>
                <th>Variant</th>
                <th>Colour</th>
                <th>Consultant</th>
                <th>Days Waiting</th>
              </tr>
            </thead>
            <tbody>
              {backorders.length > 0 ? (
                backorders.map((bo, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: '600' }}>{bo.customer_name}</td>
                    <td>{bo.model}</td>
                    <td>{bo.variant}</td>
                    <td>{bo.colour}</td>
                    <td>{bo.consultant}</td>
                    <td style={{ color: 'var(--critical)', fontWeight: '600' }}>
                      {bo.days_waiting ? `${bo.days_waiting} d` : '–'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-muted)', padding: '20px' }}>
                    No active backorders currently unfulfilled.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
