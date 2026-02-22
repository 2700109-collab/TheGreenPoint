/**
 * TrackingId — Monospace tracking identifier with copy, prefix icon, and link support.
 *
 * Per FrontEnd.md §2.5.
 */

import { useState, useCallback, type CSSProperties } from 'react';
import { message, Tooltip } from 'antd';
import {
  Copy,
  CheckCheck,
  Sprout,
  Truck,
  Wheat,
  ShoppingCart,
  Building2,
  FlaskConical,
} from 'lucide-react';
import { neutral, fontFamily } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrackingIdSize = 'sm' | 'md' | 'lg';

export interface TrackingIdProps {
  /** The tracking ID string (e.g., "PLT-20250106-ABC") */
  id: string;
  /** Size variant */
  size?: TrackingIdSize;
  /** Show copy button */
  copyable?: boolean;
  /** Show type prefix icon */
  showTypeIcon?: boolean;
  /** Navigate to entity detail on click */
  linkTo?: string;
  /** Truncate middle for long IDs on mobile */
  truncate?: boolean;
  /** Additional class */
  className?: string;
}

// ---------------------------------------------------------------------------
// Prefix → Icon map
// ---------------------------------------------------------------------------

const ENTITY_ICONS: Record<string, React.FC<{ size: number }>> = {
  PLT: Sprout,
  TRF: Truck,
  HRV: Wheat,
  SAL: ShoppingCart,
  FAC: Building2,
  LAB: FlaskConical,
};

function getEntityIcon(id: string): React.FC<{ size: number }> | null {
  const prefix = id.split('-')[0]?.toUpperCase();
  return prefix ? (ENTITY_ICONS[prefix] ?? null) : null;
}

// ---------------------------------------------------------------------------
// Size tokens  (§2.5 Size table)
// ---------------------------------------------------------------------------

interface SizeMeta {
  fontSize: number;
  paddingH: number;
  paddingV: number;
  iconSize: number;
}

const SIZE_MAP: Record<TrackingIdSize, SizeMeta> = {
  sm: { fontSize: 12, paddingH: 6, paddingV: 2, iconSize: 12 },
  md: { fontSize: 14, paddingH: 8, paddingV: 4, iconSize: 14 },
  lg: { fontSize: 16, paddingH: 12, paddingV: 6, iconSize: 16 },
};

// ---------------------------------------------------------------------------
// Truncation helper
// ---------------------------------------------------------------------------

function truncateId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 4)}…${id.slice(-3)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TrackingId({
  id,
  size = 'md',
  copyable = true,
  showTypeIcon = false,
  linkTo,
  truncate = false,
  className,
}: TrackingIdProps) {
  const [copied, setCopied] = useState(false);
  const sz = SIZE_MAP[size];
  const PrefixIcon = showTypeIcon ? getEntityIcon(id) : null;

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(id);
        setCopied(true);
        message.success('Tracking ID copied');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        message.error('Failed to copy');
      }
    },
    [id],
  );

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: fontFamily.mono,
    fontSize: sz.fontSize,
    letterSpacing: '0.02em',
    padding: `${sz.paddingV}px ${sz.paddingH}px`,
    backgroundColor: neutral[100],
    borderRadius: 4,
    color: neutral[800],
    textDecoration: 'none',
    cursor: linkTo ? 'pointer' : 'default',
    whiteSpace: 'nowrap',
    lineHeight: 1.4,
  };

  const displayText = truncate ? truncateId(id) : id;

  const content = (
    <>
      {PrefixIcon && <PrefixIcon size={sz.iconSize} />}
      <span>{displayText}</span>
      {copyable && (
        <>
          <button
            onClick={handleCopy}
            aria-label={`Copy tracking ID ${id} to clipboard`}
            style={{
              background: 'none',
              border: 'none',
              padding: 2,
              cursor: 'pointer',
              color: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              opacity: 0.5,
              transition: 'opacity 150ms',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.5'; }}
          >
            {copied ? <CheckCheck size={sz.iconSize} /> : <Copy size={sz.iconSize} />}
          </button>
          {/* Visually-hidden live region for screen-reader copy announcement */}
          <span
            aria-live="polite"
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            {copied ? 'Copied' : ''}
          </span>
        </>
      )}
    </>
  );

  const wrapper = truncate ? (
    <Tooltip title={id}>{linkTo ? (
      <a href={linkTo} className={className} style={containerStyle}>{content}</a>
    ) : (
      <span className={className} style={containerStyle}>{content}</span>
    )}</Tooltip>
  ) : linkTo ? (
    <a href={linkTo} className={className} style={containerStyle}>{content}</a>
  ) : (
    <span className={className} style={containerStyle}>{content}</span>
  );

  return wrapper;
}
