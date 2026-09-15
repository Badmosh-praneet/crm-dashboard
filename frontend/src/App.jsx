import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Way1ActionBar from './components/Way1ActionBar';
import HeroMetric from './components/HeroMetric';
import KpiTiles from './components/KpiTiles';
import SalesFunnel from './components/SalesFunnel';
import Leaderboard from './components/Leaderboard';
import StockAndModels from './components/StockAndModels';
import DataTables from './components/DataTables';
import EntryDrawer from './components/EntryDrawer';
import ExcelUploadModal from './components/ExcelUploadModal';
import ToastContainer from './components/ToastContainer';
import Visualizations from './components/Visualizations';
import Analytics from './components/Analytics';
import { fetchDashboardData, activatePeriod } from './api/client';
import { setupLiveEvents } from './api/liveEvents';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveStatus, setLiveStatus] = useState({ state: 'off', text: 'connecting' });

  // UI States
  const [theme, setTheme] = useState(() => localStorage.getItem('dsr.theme') || 'light');
  const [showTables, setShowTables] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('booking');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Toast Helper
  const addToast = useCallback((message, { bad = false } = {}) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, bad }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  // Theme synchronization
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('dsr.theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Whether a load has ever succeeded, and whether one is in flight. Both are
  // refs rather than state on purpose: loadData must keep a stable identity, or
  // the effect below re-runs on every fetch.
  const hasLoadedRef = useRef(false);
  const inFlightRef = useRef(false);

  // Data fetching
  const loadData = useCallback(async (quiet = false) => {
    // A change event, the heartbeat and a tab focus can all land together, and
    // one pass is fifteen requests against a database a round trip away. Without
    // this guard they queue up behind the browser's per-host connection limit
    // until fetches start timing out.
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!quiet) setIsRefreshing(true);
    try {
      const res = await fetchDashboardData();
      setData(res);
      hasLoadedRef.current = true;
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      if (!hasLoadedRef.current) setError(err.message || 'Failed to connect to CRM API');
      addToast(`Refresh failed: ${err.message}`, { bad: true });
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast]);

  // Initial fetch and SSE event wiring. loadData is stable, so this runs once -
  // when it also depended on `data` the effect re-ran after every fetch, which
  // reloaded the dashboard in a loop and tore the event stream down with it.
  useEffect(() => {
    loadData();

    const cleanup = setupLiveEvents(
      () => loadData(true),
      (state, text) => setLiveStatus({ state, text })
    );

    return cleanup;
  }, [loadData]);

  // Handle active period change
  const handlePeriodChange = async (newPeriod) => {
    try {
      await activatePeriod(newPeriod);
      addToast(`Activated month: ${newPeriod}`);
      await loadData();
    } catch (err) {
      addToast(`Could not switch month: ${err.message}`, { bad: true });
    }
  };

  const handleOpenDrawer = (tab = 'booking') => {
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  if (loading && !data) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        gap: '12px',
        color: 'var(--ink-muted)',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--s1)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{ fontWeight: '600', fontSize: '15px' }}>Loading Volkswagen Elite Motors Dashboard...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="wrap">
        <div className="panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h2>Could not connect to CRM API</h2>
          <p style={{ color: 'var(--ink-muted)', margin: '8px 0 20px' }}>{error}</p>
          <button className="primary" onClick={() => loadData()}>Retry Connection</button>
        </div>
      </div>
    );
  }

  const activePeriodObj = data?.periods?.find(p => p.is_active) || data?.periods?.[0] || {};

  return (
    <div className="wrap">
      <Header
        periods={data?.periods || []}
        activePeriod={activePeriodObj.label || ''}
        onPeriodChange={handlePeriodChange}
        liveStatus={liveStatus}
        showTables={showTables}
        onToggleTables={() => setShowTables(prev => !prev)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Way 1 Action Bar */}
      <Way1ActionBar
        onOpenDrawer={handleOpenDrawer}
        onOpenUpload={() => setUploadModalOpen(true)}
        onRefresh={() => {
          addToast('Pulling live updates from Supabase...');
          loadData();
        }}
        isRefreshing={isRefreshing}
      />

      {/* Main KPI Hero & Tiles */}
      <HeroMetric kpi={data?.kpi || {}} />
      <KpiTiles kpi={data?.kpi || {}} />

      {/* Visualizations */}
      <Visualizations sources={data?.sources || []} models={data?.models || []} />

      {/* Funnel & Leaderboard Grid */}
      <div className="grid-2">
        <SalesFunnel funnel={data?.funnel || {}} />
        <Leaderboard board={data?.board || []} />
      </div>

      {/* Pace, ageing, conversion, backorders, attachments, data quality */}
      <Analytics
        orderbook={data?.orderbook || []}
        commitments={data?.commitments || []}
        ageing={data?.ageing || []}
        backorders={data?.backorders || []}
        scorecards={data?.scorecards || []}
        attachments={data?.attachments || null}
        dataQuality={data?.dataQuality || []}
        kpi={data?.kpi || {}}
      />

      {/* Models & Inventory Ageing */}
      <StockAndModels
        models={data?.models || []}
        ageing={data?.ageing || []}
        activity={data?.activity || []}
      />

      {/* Optional Full Data Tables View */}
      {showTables && (
        <DataTables
          orderbook={data?.orderbook || []}
          sources={data?.sources || []}
          backorders={data?.backorders || []}
        />
      )}

      {/* Dealership Dual-Channel Footer */}
      <footer style={{
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '1px solid var(--grid)',
        fontSize: '12px',
        color: 'var(--ink-muted)',
        lineHeight: '1.6',
      }}>
        <b>Dual Database Update Channels</b> &mdash;{' '}
        <b>Way 1:</b> Built-in Web Dashboard forms (+ New Booking, + New Lead, + Test Drive, + Allotment / Delivery, Upload Excel) save straight into your Supabase database in the cloud.{' '}
        &bull;{' '}
        <b>Way 2:</b> Direct cloud editing via Supabase Studio (Table Editor: insert row or edit cells). All changes immediately sync and recalculate dashboard figures in real time.
      </footer>

      {/* Slide-out Entry Drawer */}
      <EntryDrawer
        isOpen={drawerOpen}
        activeTab={drawerTab}
        onClose={() => setDrawerOpen(false)}
        options={data?.options || {}}
        activePeriod={activePeriodObj}
        onSaved={(msg) => {
          addToast(msg);
          loadData(true);
        }}
      />

      {/* Drag & Drop Excel Upload Modal */}
      <ExcelUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={(msg) => {
          addToast(msg);
          loadData(true);
        }}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
