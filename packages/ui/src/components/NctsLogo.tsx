/**
 * NctsLogo — SVG shield icon + "NCTS" text with size and inverted variants.
 *
 * Replaces the emoji "🌿 NCTS" placeholder. Per FrontEnd.md §2.6.
 */

import type { CSSProperties } from 'react';
import { NctsShield } from '../icons';
import { fontFamily, text as textTokens } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

export interface NctsLogoProps {
  /** Size variant */
  size?: LogoSize;
  /** Show text alongside icon */
  showText?: boolean;
  /** Dark mode (white text) */
  inverted?: boolean;
  /** Additional class */
  className?: string;
}

// ---------------------------------------------------------------------------
// Size Tokens  (§2.6 Size table)
// ---------------------------------------------------------------------------

interface SizeMeta {
  icon: number;
  title: number;
  subtitle: number | null; // null = hidden
}

const SIZE_MAP: Record<LogoSize, SizeMeta> = {
  sm: { icon: 24, title: 14, subtitle: null },
  md: { icon: 32, title: 18, subtitle: 11 },
  lg: { icon: 48, title: 24, subtitle: 14 },
  xl: { icon: 72, title: 36, subtitle: 16 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NctsLogo({
  size = 'md',
  showText = true,
  inverted = false,
  className,
}: NctsLogoProps) {
  const sz = SIZE_MAP[size];

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: size === 'xl' ? 16 : size === 'lg' ? 12 : 8,
  };

  const titleColor = inverted ? '#fff' : textTokens.primary;
  const subtitleColor = inverted ? 'rgba(255,255,255,0.75)' : textTokens.secondary;

  return (
    <div
      className={className}
      style={containerStyle}
      role="img"
      aria-label="NCTS - National Cannabis Tracking System"
    >
      {/* Shield SVG icon */}
      <NctsShield
        style={{ width: sz.icon, height: sz.icon, flexShrink: 0 }}
        role="img"
        aria-hidden={showText ? 'true' : undefined}
        aria-label={!showText ? 'NCTS - National Cannabis Tracking System' : undefined}
      />

      {/* Text block */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span
            style={{
              fontSize: sz.title,
              fontWeight: 700,
              fontFamily: fontFamily.body,
              color: titleColor,
              letterSpacing: size === 'xl' ? '0.04em' : '0.02em',
            }}
          >
            NCTS
          </span>
          {sz.subtitle && (
            <span
              style={{
                fontSize: sz.subtitle,
                fontWeight: 400,
                fontFamily: fontFamily.body,
                color: subtitleColor,
              }}
            >
              National Cannabis Tracking System
            </span>
          )}
        </div>
      )}
    </div>
  );
}
