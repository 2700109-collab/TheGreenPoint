import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const [trackingId, setTrackingId] = useState('');
  const navigate = useNavigate();

  const handleVerify = () => {
    if (trackingId.trim()) {
      navigate(`/verify/${encodeURIComponent(trackingId.trim())}`);
    }
  };

  return (
    <div className="search-box">
      <h1>🔍 Verify Cannabis Product</h1>
      <p>
        Enter a product tracking ID or scan a QR code to verify that a cannabis
        product is legally licensed, tested, and safe.
      </p>
      <div className="search-input">
        <input
          type="text"
          placeholder="NCTS-ZA-2026-000001"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
        />
        <button onClick={handleVerify}>Verify</button>
      </div>
    </div>
  );
}
