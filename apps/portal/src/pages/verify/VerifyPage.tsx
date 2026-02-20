import { useParams, Link } from 'react-router-dom';
import { useVerifyProduct } from '@ncts/api-client';
import { useState } from 'react';

function ReportButton({ trackingId }: { trackingId: string }) {
  const [show, setShow] = useState(false);
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  if (done) return (
    <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: 14, marginTop: 20, textAlign: 'center' }}>
      <p style={{ color: '#059669', fontWeight: 600, margin: 0 }}>✓ Report submitted. Thank you.</p>
    </div>
  );

  if (!show) return (
    <button onClick={() => setShow(true)} style={{
      display: 'block', margin: '20px auto 0', padding: '10px 20px', background: '#FEF2F2', color: '#DC2626',
      border: '1px solid #FECACA', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500,
    }}>🚩 Report Suspicious Product</button>
  );

  const submit = async () => {
    setSending(true);
    try { await fetch(`/api/v1/verify/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trackingId, reason }) }); } catch {}
    setSending(false); setDone(true);
  };

  return (
    <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: 16, marginTop: 20 }}>
      <p style={{ fontWeight: 600, marginBottom: 8 }}>Report Suspicious Product</p>
      <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Describe why you believe this product is suspicious..."
        style={{ width: '100%', minHeight: 70, padding: 10, border: '1px solid #D1D5DB', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
        <button onClick={() => setShow(false)} style={{ padding: '6px 14px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
        <button onClick={submit} disabled={!reason.trim() || sending}
          style={{ padding: '6px 14px', background: reason.trim() ? '#DC2626' : '#E5E7EB', color: reason.trim() ? '#FFF' : '#9CA3AF', border: 'none', borderRadius: 6, cursor: reason.trim() ? 'pointer' : 'not-allowed', fontWeight: 500 }}>
          {sending ? 'Sending...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  const { trackingId } = useParams<{ trackingId: string }>();
  const { data, isLoading, error } = useVerifyProduct(trackingId ?? '');

  if (isLoading) return (
    <div className="verify-layout">
      <div className="verify-header"><span className="verify-header-logo">🌿 NCTS Verify</span></div>
      <div className="verify-content">
        <div className="verify-card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ fontSize: 16, fontWeight: 500 }}>Verifying product...</p>
          <p style={{ color: '#5A6B7F', marginTop: 4, fontFamily: 'monospace', fontSize: 13 }}>{trackingId}</p>
        </div>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="verify-layout">
      <div className="verify-header"><span className="verify-header-logo">🌿 NCTS Verify</span></div>
      <div className="verify-content">
        <div className="verify-card" style={{ textAlign: 'center' }}>
          <div className="verify-status fail">❌ Product Not Found</div>
          <p style={{ marginTop: 16, color: '#5A6B7F', lineHeight: 1.6 }}>
            Tracking ID <strong className="tracking-id">{trackingId}</strong> was not found.<br />
            This product may be unlicensed or counterfeit.
          </p>
          <ReportButton trackingId={trackingId ?? 'unknown'} />
          <Link to="/verify" style={{ display: 'inline-block', marginTop: 20, color: '#003B5C', fontSize: 13 }}>← Try another</Link>
        </div>
      </div>
    </div>
  );

  const labStatus = data.labResult?.status ?? 'unknown';

  return (
    <div className="verify-layout">
      <div className="verify-header"><span className="verify-header-logo">🌿 NCTS Verify</span></div>
      <div className="verify-content">
        <div className="verify-card">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div className={`verify-status ${labStatus === 'pass' ? 'pass' : 'fail'}`}>
              {labStatus === 'pass' ? '✅ Verified — Lab Tested & Passed' : '⚠️ Verification Issue'}
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item"><div className="info-label">Tracking ID</div><div className="info-value tracking-id">{data.trackingId}</div></div>
            <div className="info-item"><div className="info-label">Product</div><div className="info-value">{data.productName}</div></div>
            <div className="info-item"><div className="info-label">Strain</div><div className="info-value">{data.strain}</div></div>
            <div className="info-item"><div className="info-label">Operator</div><div className="info-value">{data.operatorName}</div></div>
            <div className="info-item"><div className="info-label">Batch</div><div className="info-value tracking-id">{data.batchNumber}</div></div>
            {data.labResult && <>
              <div className="info-item"><div className="info-label">Lab</div><div className="info-value">{data.labResult.labName}</div></div>
              <div className="info-item"><div className="info-label">THC</div><div className="info-value">{data.labResult.thcPercent}%</div></div>
              <div className="info-item"><div className="info-label">CBD</div><div className="info-value">{data.labResult.cbdPercent}%</div></div>
            </>}
          </div>

          {data.chainOfCustody.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Chain of Custody</div>
              {data.chainOfCustody.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #F0F2F5', fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{step.from}</span>
                  <span style={{ color: '#A0A8B4' }}>→</span>
                  <span style={{ fontWeight: 500 }}>{step.to}</span>
                  <span style={{ marginLeft: 'auto', color: '#5A6B7F', fontSize: 12 }}>{step.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          Verified at {new Date(data.verifiedAt).toLocaleString()} — NCTS Republic of South Africa
        </p>
        <ReportButton trackingId={data.trackingId} />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/verify" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>← Verify another product</Link>
        </div>
      </div>
    </div>
  );
}
