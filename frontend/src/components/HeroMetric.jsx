import React from 'react';
import { Target, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { n0, pct } from '../api/client';

export default function HeroMetric({ kpi = {} }) {
  const bookings = Number(kpi.bookings || 0);
  const target = Number(kpi.booking_target || kpi.target || 84);
  const ratio = target > 0 ? (bookings / target) * 100 : 0;
  const shortfall = Math.max(0, target - bookings);

  // Meter color severity based on achievement
  const getMeterColor = (p) => {
    if (p >= 95) return 'var(--good)';
    if (p >= 75) return 'var(--warning)';
    if (p >= 50) return 'var(--serious)';
    return 'var(--s1)';
  };

  return (
    <div className="panel" style={{
      marginBottom: '18px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '24px',
      alignItems: 'center',
      borderLeft: '4px solid var(--s1)',
    }}>
      <div>
        <div style={{
          fontSize: '12px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--ink-muted)',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <Target size={14} style={{ color: 'var(--s1)' }} />
          <span>Bookings This Month</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '54px', fontWeight: '800', lineHeight: 1, letterSpacing: '-0.03em' }}>
            {n0(bookings)}
          </span>
          <span style={{ fontSize: '18px', color: 'var(--ink-muted)', fontWeight: '500' }}>
            / {n0(target)} target
          </span>
        </div>
      </div>

      <div style={{ flex: '1 1 320px', minWidth: '240px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
          <span style={{ fontWeight: '600', color: 'var(--ink-2)' }}>
            Target Achievement: <b>{pct(ratio)}</b>
          </span>
          <span style={{ color: shortfall > 0 ? 'var(--serious)' : 'var(--good)', fontWeight: '600' }}>
            {shortfall > 0 ? `${n0(shortfall)} units to goal` : '✓ Goal Achieved'}
          </span>
        </div>
        <div style={{
          height: '12px',
          background: 'var(--sunken)',
          borderRadius: '999px',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, Math.max(2, ratio))}%`,
            background: getMeterColor(ratio),
            borderRadius: '999px',
            transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }} />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--ink-muted)',
          marginTop: '6px',
        }}>
          <span>0</span>
          <span>Target: {n0(target)}</span>
        </div>
      </div>
    </div>
  );
}
