/**
 * DataFreshness — Timestamp display with refresh, live, and stale states.
 *
 * Per FrontEnd.md §2.8.
 */

import { useState, useEffect, type CSSProperties } from 'react';
import { Button, Tooltip } from 'antd';
import { RefreshCw } from 'lucide-react';
import { fontFamily, text as textTokens } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DataFreshnessProps {
  /** Last updated timestamp (ISO string or Date) */
  lastUpdated: string | Date;
  /** Whether data is refreshing */
  isRefreshing?: boolean;
  /** Refresh handler */
  onRefresh?: () => void;
  /** Show live "pulse" dot for real-time data */
  isLive?: boolean;
  /** Compact mode (icon + relative time only) */
  compact?: boolean;
  /** Additional class */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const WARNING_COLOR = '#D48806';

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isStale(date: Date): boolean {
  return Date.now() - date.getTime() > STALE_THRESHOLD_MS;
}

// ---------------------------------------------------------------------------
// Pulse dot for live mode
// ---------------------------------------------------------------------------

const FRESHNESS_STYLE_ID = 'ncts-data-freshness-keyframes';

const freshnessKeyframes = `
@keyframes ncts-pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes ncts-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

/** Inject pulse + spin keyframes once globally. */
function useFreshnessKeyframes() {
  useEffect(() => {
    if (document.getElementById(FRESHNESS_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = FRESHNESS_STYLE_ID;
    style.textContent = freshnessKeyframes;
    document.head.appendChild(style);
    // No cleanup — global keyframes are harmless to leave in DOM.
  }, []);
}

function LiveDot() {
  return (
    <span
      aria-label="Data is updating in real-time"
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: '#389E0D',
        display: 'inline-block',
        animation: 'ncts-pulse 2s ease-in-out infinite',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataFreshness({
  lastUpdated,
  isRefreshing = false,
  onRefresh,
  isLive = false,
  compact = false,
  className,
}: DataFreshnessProps) {
  useFreshnessKeyframes();
  const date = lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated);
  const [relText, setRelText] = useState(() => relativeTime(date));

  // Tick relative time every 15 seconds
  useEffect(() => {
    setRelText(relativeTime(date));
    const id = setInterval(() => setRelText(relativeTime(date)), 15_000);
    return () => clearInterval(id);
  }, [date.getTime()]);

  const stale = isStale(date);

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: stale ? WARNING_COLOR : textTokens.tertiary,
    whiteSpace: 'nowrap',
  };

  const refreshAriaLabel = `Refresh data, last updated ${relText}`;

  const refreshIcon = (
    <RefreshCw
      size={14}
      style={{
        animation: isRefreshing ? 'ncts-spin 1s linear infinite' : 'none',
      }}
    />
  );

  if (isLive) {
    return (
      <span className={className} style={containerStyle}>
        <LiveDot />
        <span>Live</span>
      </span>
    );
  }

  if (isRefreshing) {
    return (
      <span className={className} style={containerStyle} aria-live="polite">
        {refreshIcon}
        <span>Updating…</span>
      </span>
    );
  }

  if (compact) {
    return (
      <Tooltip title={`Last updated: ${date.toLocaleString()}`}>
        <span className={className} style={containerStyle}>
          {onRefresh ? (
            <Button
              type="text"
              size="small"
              icon={refreshIcon}
              onClick={onRefresh}
              aria-label={refreshAriaLabel}
              style={{ padding: 0, height: 'auto', color: 'inherit' }}
            />
          ) : (
            refreshIcon
          )}
          <span>{relText}</span>
        </span>
      </Tooltip>
    );
  }

  return (
    <span className={className} style={containerStyle}>
      <span aria-live="polite">Updated {relText}</span>
      {onRefresh && (
        <Button
          type="text"
          size="small"
          icon={refreshIcon}
          onClick={onRefresh}
          aria-label={refreshAriaLabel}
          style={{ padding: 0, height: 'auto', color: 'inherit' }}
        />
      )}
    </span>
  );
}
