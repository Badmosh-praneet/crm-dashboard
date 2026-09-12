import React from 'react';

export default function ToastContainer({ toasts = [] }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-box">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.bad ? 'bad' : ''}`}>
          <span className="toast-dot" />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
