import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const [trackingId, setTrackingId] = useState('');
  const navigate = useNavigate();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingId.trim()) navigate(`/verify/${trackingId.trim()}`);
  };

  return (
    <div className="verify-layout">
      <div className="verify-header">
        <span className="verify-header-logo">🌿 NCTS — National Cannabis Tracking System</span>
      </div>
      <div className="verify-content">
        <div className="verify-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A2332', marginBottom: 8 }}>
            Verify Your Product
          </h1>
          <p style={{ color: '#5A6B7F', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
            Enter the tracking ID from your cannabis product label to verify its authenticity,
            lab testing results, and chain of custody.
          </p>

          <form onSubmit={handleVerify}>
            <input
              type="text"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="e.g. NCTS-ZA-2026-000001"
              style={{
                width: '100%',
                padding: '14px 18px',
                fontSize: 16,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                border: '2px solid #E2E8F0',
                borderRadius: 12,
                outline: 'none',
                textAlign: 'center',
                transition: 'border-color 0.15s',
                marginBottom: 16,
              }}
              onFocus={(e) => e.target.style.borderColor = '#003B5C'}
              onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
            />
            <button
              type="submit"
              disabled={!trackingId.trim()}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: 15,
                fontWeight: 600,
                background: trackingId.trim() ? '#003B5C' : '#E2E8F0',
                color: trackingId.trim() ? '#FFFFFF' : '#A0A8B4',
                border: 'none',
                borderRadius: 12,
                cursor: trackingId.trim() ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
              }}
            >
              Verify Product
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/login" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>
            ← Operator / Government Login
          </a>
        </div>

        <div style={{ textAlign: 'center', marginTop: 32, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
          Republic of South Africa — National Cannabis Tracking System
        </div>
      </div>
    </div>
  );
}
