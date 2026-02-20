import { useParams } from 'react-router-dom';

export default function VerifyPage() {
  const { trackingId } = useParams<{ trackingId: string }>();

  // TODO: Phase 4 — replace with real API call via TanStack Query
  const mockData = {
    trackingId: trackingId || 'NCTS-ZA-2026-000001',
    productName: 'Durban Poison Flower — 3.5g',
    strain: 'Durban Poison',
    operatorName: 'GreenFields Cultivation (Pty) Ltd',
    batchNumber: 'BATCH-2026-000089',
    labResult: {
      status: 'pass' as const,
      thcPercent: 18.5,
      cbdPercent: 0.8,
      testDate: '2026-02-15',
      labName: 'SA Cannabis Testing Laboratory',
    },
    chainOfCustody: [
      { from: 'GreenFields Cultivation', to: 'SA Cannabis Labs', date: '2026-02-10' },
      { from: 'SA Cannabis Labs', to: 'GreenFields Cultivation', date: '2026-02-15' },
      { from: 'GreenFields Cultivation', to: 'Cape Cannabis Dispensary', date: '2026-02-18' },
    ],
    verifiedAt: new Date().toISOString(),
  };

  return (
    <div>
      <div className="verify-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className={`verify-status ${mockData.labResult.status}`}>
            ✅ Verified — {mockData.labResult.status === 'pass' ? 'Lab Tested & Passed' : 'FAILED'}
          </div>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">Tracking ID</div>
            <div className="info-value tracking-id">{mockData.trackingId}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Product</div>
            <div className="info-value">{mockData.productName}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Strain</div>
            <div className="info-value">{mockData.strain}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Licensed Operator</div>
            <div className="info-value">{mockData.operatorName}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Batch Number</div>
            <div className="info-value tracking-id">{mockData.batchNumber}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Lab</div>
            <div className="info-value">{mockData.labResult.labName}</div>
          </div>
          <div className="info-item">
            <div className="info-label">THC</div>
            <div className="info-value">{mockData.labResult.thcPercent}%</div>
          </div>
          <div className="info-item">
            <div className="info-label">CBD</div>
            <div className="info-value">{mockData.labResult.cbdPercent}%</div>
          </div>
        </div>

        <div className="chain-of-custody">
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>Chain of Custody</h3>
          {mockData.chainOfCustody.map((step, i) => (
            <div key={i} className="custody-step">
              <span>{step.from}</span>
              <span className="custody-arrow">→</span>
              <span>{step.to}</span>
              <span className="custody-date">{step.date}</span>
            </div>
          ))}
        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#94a3b8' }}>
        Verified at {new Date(mockData.verifiedAt).toLocaleString()} — NCTS Republic of South Africa
      </p>
    </div>
  );
}
