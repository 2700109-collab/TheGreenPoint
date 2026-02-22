/**
 * SyncStatus — Displays current sync state with icon, text, and optional retry.
 *
 * Per FrontEnd.md §2.17.
 */

import { useEffect, type CSSProperties } from 'react';
import { Button, Tooltip, Badge } from 'antd';
import { CheckCircle, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { fontFamily } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncState = 'synced' | 'syncing' | 'pending' | 'error';

export interface SyncStatusProps {
  /** Current synchronisation state */
  state: SyncState;
  /** Number of pending items (displayed for syncing / pending states) */
  pendingCount?: number;
  /** Callback when user clicks "Retry" in error state */
  onRetry?: () => void;
  /** Compact mode — icon + badge only, tooltip reveals full text */
  compact?: boolean;
  /** Additional class */
  className?: string;
}

// ---------------------------------------------------------------------------
// Keyframes — global style injection (spin animation)
// ---------------------------------------------------------------------------

const SYNC_STYLE_ID = 'ncts-sync-keyframes';

const syncKeyframes = `
@keyframes ncts-sync-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

function useSyncKeyframes() {
  useEffect(() => {
    if (document.getElementById(SYNC_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = SYNC_STYLE_ID;
    style.textContent = syncKeyframes;
    document.head.appendChild(style);
  }, []);
}

// ---------------------------------------------------------------------------
// State configuration map
// ---------------------------------------------------------------------------

interface StateConfig {
  color: string;
  icon: typeof CheckCircle;
  label: (count: number) => string;
  spinning: boolean;
}

const STATE_MAP: Record<SyncState, StateConfig> = {
  synced: {
    color: '#007A4D',
    icon: CheckCircle,
    label: () => 'All synced',
    spinning: false,
  },
  syncing: {
    color: '#0958D9',
    icon: RefreshCw,
    label: (c) => `Syncing${c > 0 ? ` ${c}` : ''}…`,
    spinning: true,
  },
  pending: {
    color: '#D48806',
    icon: Clock,
    label: (c) => `${c > 0 ? c : ''} pending`.trim(),
    spinning: false,
  },
  error: {
    color: '#CF1322',
    icon: AlertCircle,
    label: () => 'Sync failed',
    spinning: false,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SyncStatus({
  state,
  pendingCount = 0,
  onRetry,
  compact = false,
  className,
}: SyncStatusProps) {
  useSyncKeyframes();

  const config = STATE_MAP[state];
  const Icon = config.icon;
  const labelText = config.label(pendingCount);

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: config.color,
    whiteSpace: 'nowrap',
  };

  const iconStyle: CSSProperties = config.spinning
    ? { animation: 'ncts-sync-spin 1s linear infinite', flexShrink: 0 }
    : { flexShrink: 0 };

  const iconElement = <Icon size={16} style={iconStyle} />;

  // Compact mode ─ icon + badge, tooltip with full text
  if (compact) {
    const badgeCount = state === 'syncing' || state === 'pending' ? pendingCount : 0;

    return (
      <Tooltip title={labelText}>
        <span
          className={className}
          style={containerStyle}
          aria-live="polite"
          aria-label={labelText}
        >
          {badgeCount > 0 ? (
            <Badge
              count={badgeCount}
              size="small"
              color={config.color}
              offset={[-2, 2]}
            >
              {iconElement}
            </Badge>
          ) : (
            iconElement
          )}
        </span>
      </Tooltip>
    );
  }

  // Full mode ─ icon + text + optional retry
  return (
    <span className={className} style={containerStyle} aria-live="polite">
      {iconElement}
      <span>{labelText}</span>
      {state === 'error' && onRetry && (
        <Button
          type="link"
          size="small"
          onClick={onRetry}
          style={{
            padding: 0,
            height: 'auto',
            fontSize: 13,
            color: config.color,
          }}
        >
          Retry
        </Button>
      )}
    </span>
  );
}
