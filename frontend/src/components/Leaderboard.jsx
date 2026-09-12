import React from 'react';
import { Trophy, Award, Medal } from 'lucide-react';
import { n0, pct } from '../api/client';

export default function Leaderboard({ board = [] }) {
  // Sort by bookings descending
  const sorted = [...board].sort((a, b) => (b.bookings || 0) - (a.bookings || 0));

  const getRankBadge = (idx) => {
    if (idx === 0) return <span style={{ color: '#eab308' }} title="Top Performer"><Trophy size={16} /></span>;
    if (idx === 1) return <span style={{ color: '#94a3b8' }}><Medal size={16} /></span>;
    if (idx === 2) return <span style={{ color: '#b45309' }}><Award size={16} /></span>;
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
                const bk = Number(c.bookings || 0);
                const tgt = Number(c.booking_target || c.target || 0);
                const ach = tgt > 0 ? (bk / tgt) * 100 : null;

                return (
                  <tr key={c.consultant || idx}>
                    <td style={{ textAlign: 'center' }}>{getRankBadge(idx)}</td>
                    <td style={{ fontWeight: '600' }}>{c.consultant}</td>
                    <td style={{ color: 'var(--ink-muted)' }}>{c.team || 'Sales'}</td>
                    <td className="num" style={{ fontWeight: '700', color: 'var(--s1)' }}>{n0(bk)}</td>
                    <td className="num" style={{ color: 'var(--ink-muted)' }}>{tgt > 0 ? n0(tgt) : '–'}</td>
                    <td className="num" style={{
                      fontWeight: '600',
                      color: ach >= 100 ? 'var(--good)' : ach >= 75 ? 'var(--warning)' : 'var(--ink-2)',
                    }}>
                      {ach != null ? pct(ach) : '–'}
                    </td>
                    <td className="num" style={{ fontWeight: '600' }}>{n0(c.retails || 0)}</td>
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
        </table>
      </div>
    </div>
  );
}
