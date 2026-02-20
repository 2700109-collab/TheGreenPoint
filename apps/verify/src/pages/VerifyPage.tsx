import { useParams } from 'react-router-dom';
import { useVerifyProduct } from '@ncts/api-client';

export default function VerifyPage() {
  const { trackingId } = useParams<{ trackingId: string }>();
  const { data, isLoading, error } = useVerifyProduct(trackingId ?? '');

  if (isLoading) {
    return (
      <div className="verify-card" style={{ textAlign: 'center', padding: 48 }}>
        <p style={{ fontSize: 18 }}>Verifying product...</p>
        <p style={{ color: '#64748b', marginTop: 8 }}>Checking {trackingId}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="verify-card" style={{ textAlign: 'center', padding: 48 }}>
        <div className="verify-status fail">Product Not Found</div>
        <p style={{ marginTop: 16, color: '#64748b' }}>
          Tracking ID <strong className="tracking-id">{trackingId}</strong> was not found in the NCTS database.
          This product may be unlicensed or counterfeit.
        </p>
      </div>
    );
  }

  const labStatus = data.labResult?.status ?? 'unknown';

  return (
    <div>
      <div className="verify-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className={`verify-status ${labStatus === 'pass' ? 'pass' : 'fail'}`}>
            {labStatus === 'pass' ? '✅ Verified — Lab Tested & Passed' : '⚠️ Verification Issue'}
          </div>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">Tracking ID</div>
            <div className="info-value tracking-id">{data.trackingId}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Product</div>
            <div className="info-value">{data.productName}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Strain</div>
            <div className="info-value">{data.strain}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Licensed Operator</div>
            <div className="info-value">{data.operatorName}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Batch Number</div>
            <div className="info-value tracking-id">{data.batchNumber}</div>
          </div>
          {data.labResult && (
            <>
              <div className="info-item">
                <div className="info-label">Lab</div>
                <div className="info-value">{data.labResult.labName}</div>
              </div>
              <div className="info-item">
                <div className="info-label">THC</div>
                <div className="info-value">{data.labResult.thcPercent}%</div>
              </div>
              <div className="info-item">
                <div className="info-label">CBD</div>
                <div className="info-value">{data.labResult.cbdPercent}%</div>
              </div>
            </>
          )}
        </div>

        {data.chainOfCustody.length > 0 && (
          <div className="chain-of-custody">
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>Chain of Custody</h3>
            {data.chainOfCustody.map((step, i) => (
              <div key={i} className="custody-step">
                <span>{step.from}</span>
                <span className="custody-arrow">→</span>
                <span>{step.to}</span>
                <span className="custody-date">{step.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#94a3b8' }}>
        Verified at {new Date(data.verifiedAt).toLocaleString()} — NCTS Republic of South Africa
      </p>
    </div>
  );
}
