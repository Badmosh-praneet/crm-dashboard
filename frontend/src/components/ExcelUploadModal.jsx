import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { uploadExcelWorkbook } from '../api/client';

export default function ExcelUploadModal({ isOpen, onClose, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [period, setPeriod] = useState('');
  const [uploader, setUploader] = useState('Reporting Agent');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      const f = e.dataTransfer.files[0];
      if (f.name.match(/\.xlsx?$|\.xlsm$/i)) {
        setFile(f);
        setError(null);
      } else {
        setError('Please select a valid Excel workbook (.xlsx or .xlsm).');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await uploadExcelWorkbook(file, period, uploader);
      setResult(data);
      onUploadComplete(`Ingested '${data.filename}' into Supabase for ${data.period}!`, data);
    } catch (err) {
      setError(err.message || 'Ingestion failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer-scrim" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        maxWidth: '520px',
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
            <h2 style={{ fontSize: '16px', fontWeight: '700' }}>📥 Ingest Monthly DSR Excel Workbook</h2>
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
              padding: '30px 16px',
              textAlign: 'center',
              background: dragOver ? 'var(--s1-light)' : 'var(--surface-sub)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <FileSpreadsheet size={36} style={{ color: file ? 'var(--s3)' : 'var(--ink-muted)', marginBottom: '8px' }} />
            <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
              {file ? file.name : 'Drop DSR Excel file here, or browse'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
              {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports .xlsx and .xlsm files (e.g. DSR August 2026.xlsx)'}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className="row-2">
            <label className="field" style={{ margin: 0 }}>
              <span>Reporting Period <em>(Optional)</em></span>
              <input
                value={period}
                onChange={e => setPeriod(e.target.value)}
                placeholder="Auto-detect (e.g. AUG2026)"
              />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span>Uploaded By</span>
              <input
                value={uploader}
                onChange={e => setUploader(e.target.value)}
              />
            </label>
          </div>

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
                <div style={{ fontWeight: '600' }}>Ingesting workbook and updating Supabase database...</div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                  Calculating dimensions, vehicle stock status, and consultant targets.
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
