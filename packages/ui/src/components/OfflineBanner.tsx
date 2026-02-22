/**
 * OfflineBanner — Yellow warning bar shown when the browser is offline.
 *
 * Per FrontEnd.md §2.16.
 */

import { useState, useEffect, type CSSProperties } from 'react';
import { WifiOff } from 'lucide-react';
import { fontFamily, text as textTokens, semantic, duration, easing } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OfflineBannerProps {
  /** Number of changes waiting to sync */
  pendingSyncCount?: number;
  /** Additional class */
  className?: string;
}

// ---------------------------------------------------------------------------
// Hook — listen to online / offline events
// ---------------------------------------------------------------------------

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BANNER_BG = '#FFFBE6';
const BANNER_BORDER = '#FFE58F';
const BANNER_TEXT = semantic.warning.text;

const bannerStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '8px 16px',
  backgroundColor: BANNER_BG,
  borderBottom: `1px solid ${BANNER_BORDER}`,
  fontFamily: fontFamily.body,
  fontSize: 14,
  color: BANNER_TEXT,
  overflow: 'hidden',
  transition: `max-height ${duration.normal}ms ${easing.enter}, opacity ${duration.normal}ms ${easing.enter}, padding ${duration.normal}ms ${easing.enter}`,
};

const hiddenStyle: CSSProperties = {
  ...bannerStyle,
  maxHeight: 0,
  opacity: 0,
  padding: '0 16px',
  borderBottom: 'none',
};

const visibleStyle: CSSProperties = {
  ...bannerStyle,
  maxHeight: 60,
  opacity: 1,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OfflineBanner({
  pendingSyncCount = 0,
  className,
}: OfflineBannerProps) {
  const online = useOnlineStatus();

  const style = online ? hiddenStyle : visibleStyle;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={className}
      style={style}
    >
      {!online && (
        <>
          <WifiOff size={16} style={{ flexShrink: 0 }} />
          <span>
            You're offline — changes will sync when reconnected
            {pendingSyncCount > 0 && (
              <span style={{ color: textTokens.secondary, marginLeft: 4 }}>
                ({pendingSyncCount} pending change{pendingSyncCount !== 1 ? 's' : ''})
              </span>
            )}
          </span>
        </>
      )}
    </div>
  );
}
