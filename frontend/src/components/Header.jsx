import React from 'react';
import { Sun, Moon, Table, RefreshCw, Database } from 'lucide-react';

export default function Header({
  periods = [],
  activePeriod = '',
  onPeriodChange,
  liveStatus = { state: 'off', text: 'connecting' },
  showTables,
  onToggleTables,
  theme,
  onToggleTheme,
}) {
  const activeObj = periods.find(p => p.label === activePeriod) || {};

  return (
    <header style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: '22px',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <span style={{
            background: 'var(--s1)',
            color: '#fff',
            fontWeight: '800',
            fontSize: '13px',
            padding: '3px 8px',
            borderRadius: '6px',
            letterSpacing: '0.05em',
          }}>VW</span>
          <h1 style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0 }}>
            Volkswagen Elite Motors &mdash; Daily Sales Report
          </h1>
        </div>
        <div style={{ color: 'var(--ink-2)', fontSize: '13px' }}>
          {activeObj.label ? (
            <span>
              Month: <b>{activeObj.label}</b> ({activeObj.period_start} to {activeObj.period_end}) &bull; Hosur Road, Bengaluru
            </span>
          ) : 'Loading period...'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={activePeriod}
          onChange={e => onPeriodChange(e.target.value)}
          title="Switch reporting month"
          style={{ fontWeight: '600', padding: '6px 12px' }}
        >
          {periods.map(p => (
            <option key={p.label} value={p.label}>
              {p.label} {p.is_active ? '· Active' : ''}
            </option>
          ))}
        </select>

        <span
          className="live-badge"
          title="Direct connection to Supabase PostgreSQL database"
        >
          <span className={`live-dot ${liveStatus.state === 'down' ? 'down' : ''}`} />
          <Database size={13} style={{ color: 'var(--ink-muted)' }} />
          <span>{liveStatus.text}</span>
        </span>

        <button
          onClick={onToggleTables}
          aria-pressed={showTables}
          title="Toggle comprehensive data tables"
          style={{
            background: showTables ? 'var(--surface-sub)' : 'transparent',
            borderColor: showTables ? 'var(--axis)' : 'var(--border)',
          }}
        >
          <Table size={14} />
          <span>{showTables ? 'Hide data tables' : 'Show data tables'}</span>
        </button>

        <button
          onClick={onToggleTheme}
          title="Toggle Dark / Light theme"
          style={{ padding: '7px 10px' }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
