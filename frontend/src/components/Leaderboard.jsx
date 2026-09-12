import React from 'react';
import { Trophy, Award, Medal } from 'lucide-react';
import { n0, pct } from '../api/client';

export default function Leaderboard({ board = [] }) {
  // Sort by actual bookings achieved descending, then retails
  const sorted = [...board].sort((a, b) => {
    const bBk = Number(b.booking_achieved ?? b.bookings ?? 0);
    const aBk = Number(a.booking_achieved ?? a.bookings ?? 0);
    if (bBk !== aBk) return bBk - aBk;
    return Number(b.retail_achieved ?? b.retails ?? 0) - Number(a.retail_achieved ?? a.retails ?? 0);
  });

  // Calculate totals
  const totalBookings = sorted.reduce((sum, c) => sum + Number(c.booking_achieved ?? c.bookings ?? 0), 0);
  const totalTarget = sorted.reduce((sum, c) => sum + Number(c.booking_target ?? c.target ?? 0), 0);
  const totalRetails = sorted.reduce((sum, c) => sum + Number(c.retail_achieved ?? c.retails ?? 0), 0);
  const totalAch = totalTarget > 0 ? (totalBookings / totalTarget) * 100 : null;

  const getRankBadge = (idx) => {
    if (idx === 0) return <span style={{ color: '#eab308' }} title="Top Performer"><Trophy size={16} /></span>;
    if (idx === 1) return <span style={{ color: '#94a3b8' }} title="2nd Place"><Medal size={16} /></span>;
    if (idx === 2) return <span style={{ color: '#b45309' }} title="3rd Place"><Award size={16} /></span>;
    return <span style={{ color: 'var(--ink-muted)', fontSize: '12px', fontWeight: '600' }}>#{idx + 1}</span>;
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Consultant Leaderboard</h2>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
            Live performance tracking by sales consultant
          </div>
        </div>
        <Trophy size={18} style={{ color: 'var(--ink-muted)' }} />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: '48px', textAlign: 'center' }}>Rank</th>
              <th>Consultant</th>
              <th>Team</th>
              <th className="num">Bookings</th>
              <th className="num">Target</th>
              <th className="num">Ach %</th>
              <th className="num">Retails</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length > 0 ? (
              sorted.map((c, idx) => {
                const bk = Number(c.booking_achieved ?? c.bookings ?? 0);
                const tgt = Number(c.booking_target ?? c.target ?? 0);
                const ach = c.booking_vs_target_pct != null
                  ? Number(c.booking_vs_target_pct)
                  : (tgt > 0 ? (bk / tgt) * 100 : null);
                const rt = Number(c.retail_achieved ?? c.retails ?? 0);
                const rtTgt = Number(c.retail_target ?? 0);

                return (
                  <tr key={c.consultant || idx}>
                    <td style={{ textAlign: 'center' }}>{getRankBadge(idx)}</td>
                    <td style={{ fontWeight: '600' }}>{c.consultant}</td>
                    <td style={{ color: 'var(--ink-muted)' }}>{c.team || 'Sales'}</td>
                    <td className="num" style={{ fontWeight: '700', color: 'var(--s1)' }}>{n0(bk)}</td>
                    <td className="num" style={{ color: 'var(--ink-muted)' }}>{tgt > 0 ? n0(tgt) : '–'}</td>
                    <td className="num" style={{
                      fontWeight: '600',
                      color: ach >= 75 ? 'var(--good)' : ach >= 50 ? 'var(--warning)' : 'var(--ink-2)',
                    }}>
                      {ach != null ? pct(ach) : '–'}
                    </td>
                    <td className="num" style={{ fontWeight: '600' }}>
                      {n0(rt)}
                      {rtTgt > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 'normal', marginLeft: '4px' }}>
                          / {n0(rtTgt)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-muted)', padding: '24px' }}>
                  No consultant activity found for this period.
                </td>
              </tr>
            )}
          </tbody>
          {sorted.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--axis)', fontWeight: '700', background: 'var(--surface-sub)' }}>
                <td colSpan={3} style={{ padding: '8px 10px' }}>Dealership Total</td>
                <td className="num" style={{ color: 'var(--s1)' }}>{n0(totalBookings)}</td>
                <td className="num" style={{ color: 'var(--ink-muted)' }}>{n0(totalTarget)}</td>
                <td className="num" style={{ color: 'var(--good)' }}>{totalAch != null ? pct(totalAch) : '–'}</td>
                <td className="num">{n0(totalRetails)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
