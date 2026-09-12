import React from 'react';
import { PlusCircle, UserPlus, Compass, KeyRound, UploadCloud, RefreshCw, Sparkles } from 'lucide-react';

export default function Way1ActionBar({
  onOpenDrawer,
  onOpenUpload,
  onRefresh,
  isRefreshing,
}) {
  return (
    <div className="way1-bar">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="way1-badge-pill">
            <Sparkles size={12} /> Way 1: Web Dashboard Direct Entry
          </span>
          <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>&bull; Cloud Database Synced</span>
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--ink-2)' }}>
          Submit new records below &mdash; saves straight into <b>Supabase</b> in the cloud &amp; recalculates dashboard metrics instantly.
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <button
          className="w1-btn primary-btn"
          onClick={() => onOpenDrawer('booking')}
          title="Create a new customer vehicle booking"
        >
          <PlusCircle size={15} />
          <span>New Booking</span>
        </button>

        <button
          className="w1-btn"
          onClick={() => onOpenDrawer('lead')}
          title="Log a customer enquiry (walk-in, tele, digital, CRM)"
        >
          <UserPlus size={15} />
          <span>New Lead</span>
        </button>

        <button
          className="w1-btn"
          onClick={() => onOpenDrawer('testdrive')}
          title="Log a customer vehicle test drive"
        >
          <Compass size={15} />
          <span>Test Drive</span>
        </button>

        <button
          className="w1-btn"
          onClick={() => onOpenDrawer('allotment')}
          title="Allot a free vehicle chassis from stock to an open booking"
        >
          <KeyRound size={15} />
          <span>Allotment / Delivery</span>
        </button>

        <button
          className="w1-btn excel-btn"
          onClick={onOpenUpload}
          title="Upload or drag-and-drop monthly DSR Excel workbook (.xlsx / .xlsm)"
        >
          <UploadCloud size={15} />
          <span>Upload Excel</span>
        </button>

        <button
          className="w1-btn"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Pull latest live figures from Supabase"
          style={{ background: 'transparent' }}
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
