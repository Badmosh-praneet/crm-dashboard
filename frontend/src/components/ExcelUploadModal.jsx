import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { uploadReportFile } from '../api/client';

export default function ExcelUploadModal({ isOpen, onClose, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [period, setPeriod] = useState('');
  const [uploader, setUploader] = useState('Reporting Agent');
  const [tableType, setTableType] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const getFormatBadge = (name) => {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (['xlsx', 'xlsm', 'xls'].includes(ext)) {
      return { label: 'Excel Workbook', bg: 'var(--s3-light)', color: 'var(--good-text)', icon: FileSpreadsheet };
    }
    if (['csv'].includes(ext)) {
      return { label: 'CSV Spreadsheet', bg: 'var(--s1-light)', color: 'var(--s1)', icon: FileSpreadsheet };
    }
    if (['txt', 'tsv'].includes(ext)) {
      return { label: 'Text / Delimited Report', bg: 'var(--surface-sub)', color: 'var(--ink-2)', icon: FileText };
    }
    return null;
  };

  const validateAndSetFile = (f) => {
    if (f.name.match(/\.xlsx?$|\.xlsm$|\.csv$|\.txt$|\.tsv$/i)) {
      setFile(f);
      setError(null);
    } else {
      setError('Please select a valid report file (.xlsx, .xlsm, .csv, or .txt).');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await uploadReportFile(file, period, uploader, tableType);
      setResult(data);
      onUploadComplete(`Ingested '${data.filename}' into Supabase for ${data.period}!`, data);
    } catch (err) {
      setError(err.message || 'Ingestion failed');
    } finally {
      setLoading(false);
    }
  };

  const badge = file ? getFormatBadge(file.name) : null;
  const BadgeIcon = badge?.icon || FileSpreadsheet;

  return (
    <div className="drawer-scrim" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        maxWidth: '540px',
        width: '100%',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'popIn 0.2s ease',
      }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--grid)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700' }}>📥 Ingest DSR Report (Excel, CSV, TXT)</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--ink-muted)' }}>
              Bulk-loads bookings, vehicle stock, enquiries, and targets into Supabase.
            </p>
          </div>
          <button onClick={onClose} style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--s1)' : 'var(--axis)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '28px 16px',
              textAlign: 'center',
              background: dragOver ? 'var(--s1-light)' : 'var(--surface-sub)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <BadgeIcon size={36} style={{ color: file ? 'var(--s1)' : 'var(--ink-muted)', marginBottom: '8px' }} />
            <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
              {file ? file.name : 'Drop report file here, or browse'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
              {file
                ? `${(file.size / 1024).toFixed(1)} KB`
                : 'Supports Excel (.xlsx, .xlsm), CSV (.csv), and Text (.txt, .tsv)'}
            </div>

            {badge && (
              <div style={{ marginTop: '10px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  background: badge.bg,
                  color: badge.color,
                }}>
                  {badge.label}
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm,.xls,.csv,.txt,.tsv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className="row-2">
            <label className="field" style={{ margin: 0 }}>
              <span>Target Data Type</span>
              <select value={tableType} onChange={e => setTableType(e.target.value)}>
                <option value="auto">Auto-Detect (Recommended)</option>
                <option value="booking">Bookings / Order Book</option>
                <option value="lead">Leads / Enquiries</option>
                <option value="vehicle">Vehicles / Stock Inventory</option>
              </select>
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span>Reporting Period</span>
              <input
                value={period}
                onChange={e => setPeriod(e.target.value)}
                placeholder="Auto-detect (e.g. AUG2026, SEP2026)"
              />
            </label>
          </div>

          <label className="field" style={{ margin: 0 }}>
            <span>Uploaded By</span>
            <input
              value={uploader}
              onChange={e => setUploader(e.target.value)}
            />
          </label>

          {loading && (
            <div style={{
              background: 'var(--surface-sub)',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '13px',
            }}>
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--s1)' }} />
              <div>
                <div style={{ fontWeight: '600' }}>Ingesting report and updating Supabase database...</div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                  Parsing columns, normalizing dimensions, and calculating live metrics.
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background: 'var(--critical-light)',
              border: '1px solid var(--critical)',
              borderRadius: '8px',
              padding: '12px 14px',
              color: 'var(--critical)',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div style={{
              background: 'var(--s3-light)',
              border: '1px solid var(--s3)',
              borderRadius: '8px',
              padding: '14px',
              fontSize: '12.5px',
            }}>
              <div style={{ fontWeight: '700', color: 'var(--good-text)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <CheckCircle2 size={16} />
                <span>Successfully Ingested {result.filename} ({result.period})!</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {Object.entries(result.counts || {}).map(([tbl, cnt]) => (
                  <div key={tbl} style={{ background: 'var(--surface)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <b>{cnt}</b> <span style={{ color: 'var(--ink-muted)' }}>{tbl}s</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--grid)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          background: 'var(--surface-sub)',
        }}>
          <button onClick={onClose} disabled={loading}>
            Close
          </button>
          <button
            className="primary"
            onClick={handleUpload}
            disabled={!file || loading}
            style={{ background: 'var(--s3)', borderColor: 'var(--s3)' }}
          >
            <UploadCloud size={15} />
            <span>{loading ? 'Ingesting...' : 'Ingest into Dashboard'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
