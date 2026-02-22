import { useState, useEffect } from 'react';

const CONSENT_KEY = 'ncts-cookie-consent';

/** Stored consent record written to localStorage. */
export interface ConsentRecord {
  timestamp: string;
  accepted: boolean;
  categories: string[];
}

/**
 * POPIA-compliant cookie consent banner.
 * Only essential cookies are used (auth, session, language).
 * Renders a fixed banner at bottom of page until dismissed.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  const storeConsent = (accepted: boolean) => {
    const record: ConsentRecord = {
      timestamp: new Date().toISOString(),
      accepted,
      categories: accepted ? ['essential'] : [],
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="banner"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: '#1B3A5C',
        color: 'white',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        flexWrap: 'wrap',
        fontSize: 14,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <span>
        🍪 This system uses essential cookies for authentication and security. No tracking cookies
        are used.
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => storeConsent(true)}
          style={{
            padding: '6px 20px',
            background: '#FFB81C',
            color: '#1B3A5C',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Accept Essential Cookies
        </button>
        <button
          onClick={() => storeConsent(false)}
          style={{
            padding: '6px 20px',
            background: 'transparent',
            color: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: 6,
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Decline Non-Essential
        </button>
        <a
          href="/privacy"
          style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: 13,
            textDecoration: 'underline',
            alignSelf: 'center',
          }}
        >
          Privacy Policy
        </a>
      </div>
    </div>
  );
}
