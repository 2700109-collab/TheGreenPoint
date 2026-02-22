/**
 * ComplianceScore — Circular compliance gauge with traffic-light coloring.
 * Per FrontEnd.md §2.12.
 */

import type { CSSProperties } from 'react';
import { Progress } from 'antd';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fontFamily, text } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComplianceScoreProps {
  /** Compliance score 0-100 */
  score: number;
  /** Ring size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Previous score for trend calculation */
  previousScore?: number;
  /** Override label below ring */
  label?: string;
  /** Show traffic-light coloring (default true) */
  showTrafficLight?: boolean;
  /** Additional CSS class */
  className?: string;
}

// ---------------------------------------------------------------------------
// Size tokens: [diameter, fontSize, strokeWidth]
// ---------------------------------------------------------------------------

const SIZE_MAP: Record<'sm' | 'md' | 'lg', { diameter: number; fontSize: number; strokeWidth: number }> = {
  sm: { diameter: 60, fontSize: 16, strokeWidth: 4 },
  md: { diameter: 120, fontSize: 28, strokeWidth: 6 },
  lg: { diameter: 180, fontSize: 40, strokeWidth: 8 },
};

// ---------------------------------------------------------------------------
// Traffic-light helpers
// ---------------------------------------------------------------------------

function getTrafficColor(score: number): string {
  if (score >= 95) return '#007A4D';
  if (score >= 80) return '#D48806';
  return '#CF1322';
}

function getAutoLabel(score: number): string {
  if (score >= 95) return 'Compliant';
  if (score >= 80) return 'Needs Attention';
  return 'Critical';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ComplianceScore({
  score,
  size = 'md',
  previousScore,
  label,
  showTrafficLight = true,
  className,
}: ComplianceScoreProps) {
  const { diameter, fontSize, strokeWidth } = SIZE_MAP[size];
  const clampedScore = Math.max(0, Math.min(100, score));
  const resolvedLabel = label ?? getAutoLabel(clampedScore);
  const color = showTrafficLight ? getTrafficColor(clampedScore) : undefined;

  // Trend
  const delta = previousScore != null ? clampedScore - previousScore : null;
  const trendIconSize = size === 'sm' ? 10 : size === 'md' ? 14 : 18;

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: size === 'sm' ? 4 : 8,
    fontFamily: fontFamily.body,
  };

  const labelStyle: CSSProperties = {
    fontSize: size === 'sm' ? 10 : size === 'md' ? 13 : 16,
    fontWeight: 600,
    color: color ?? text.secondary,
    lineHeight: 1.2,
    textAlign: 'center',
  };

  const trendStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    fontSize: size === 'sm' ? 10 : size === 'md' ? 12 : 14,
    fontWeight: 500,
    color: delta != null && delta > 0 ? '#007A4D' : delta != null && delta < 0 ? '#CF1322' : text.secondary,
  };

  return (
    <div
      className={className}
      role="meter"
      aria-valuenow={clampedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Compliance score: ${clampedScore} percent, ${resolvedLabel}`}
      style={containerStyle}
    >
      <Progress
        type="circle"
        percent={clampedScore}
        size={diameter}
        strokeWidth={strokeWidth}
        strokeColor={color}
        format={(val) => (
          <span
            style={{
              fontSize,
              fontWeight: 700,
              color: color ?? text.primary,
              fontFamily: fontFamily.body,
            }}
          >
            {val}
          </span>
        )}
      />

      <span style={labelStyle}>{resolvedLabel}</span>

      {delta != null && (
        <span style={trendStyle}>
          {delta > 0 && <TrendingUp size={trendIconSize} />}
          {delta < 0 && <TrendingDown size={trendIconSize} />}
          {delta === 0 && <Minus size={trendIconSize} />}
          <span>{delta > 0 ? '+' : ''}{delta}</span>
        </span>
      )}
    </div>
  );
}
