/**
 * StatCard — KPI card with trend, sparkline, and icon. Per FrontEnd.md §2.7.
 */

import type { CSSProperties } from 'react';
import { Card, Skeleton } from 'antd';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { shadows, radius, fontFamily, typeScale, text as textTokens } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrendDirection = 'up' | 'down' | 'flat';

export interface StatCardProps {
  /** KPI label */
  label: string;
  /** Formatted value string */
  value: string;
  /** Value prefix (e.g., "R" for Rand) */
  prefix?: string;
  /** Value suffix (e.g., "kg") */
  suffix?: string;
  /** Trend direction */
  trend?: TrendDirection;
  /** Change percentage (e.g., 12.5) */
  changePercent?: number;
  /** Period label for change (e.g., "vs last month") */
  changePeriod?: string;
  /** Sparkline data (last 7 data points) */
  sparkline?: number[];
  /** Subtitle/description */
  subtitle?: string;
  /** Icon */
  icon?: React.ReactNode;
  /** Icon background color */
  iconBgColor?: string;
  /** Loading state */
  loading?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional class */
  className?: string;
}

// ---------------------------------------------------------------------------
// Trend colors
// ---------------------------------------------------------------------------

const TREND_COLORS: Record<TrendDirection, string> = {
  up: '#389E0D',
  down: '#CF1322',
  flat: '#8C8C8C',
};

const TREND_ICONS: Record<TrendDirection, React.FC<{ size: number }>> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

// ---------------------------------------------------------------------------
// Mini Sparkline (pure CSS / lightweight SVG)
// ---------------------------------------------------------------------------

function MiniSparkline({ data }: { data: number[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 2,
        height: 24,
        marginTop: 8,
      }}
      aria-hidden="true"
    >
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            minWidth: 4,
            maxWidth: 12,
            height: `${Math.max(4, ((v - min) / range) * 100)}%`,
            backgroundColor: '#007A4D',
            borderRadius: 2,
            opacity: 0.6 + (i / data.length) * 0.4,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatCard({
  label,
  value,
  prefix,
  suffix,
  trend,
  changePercent,
  changePeriod,
  sparkline,
  subtitle,
  icon,
  iconBgColor = '#E6F5EF',
  loading = false,
  onClick,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <Card
        className={className}
        style={{ boxShadow: shadows.sm, borderRadius: radius.lg }}
      >
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    );
  }

  const trendLabel =
    trend && changePercent != null
      ? `${trend === 'up' ? 'Increased' : trend === 'down' ? 'Decreased' : 'No change'} by ${changePercent}%${changePeriod ? ` compared to ${changePeriod}` : ''}`
      : undefined;

  const TrendIcon = trend ? TREND_ICONS[trend] : null;
  const trendColor = trend ? TREND_COLORS[trend] : undefined;

  const containerStyle: CSSProperties = {
    boxShadow: shadows.sm,
    borderRadius: radius.lg,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'box-shadow 200ms, transform 200ms',
  };

  return (
    <Card
      className={className}
      style={containerStyle}
      hoverable={!!onClick}
      onClick={onClick}
      role={onClick ? 'link' : 'region'}
      aria-label={`${label}: ${prefix ?? ''}${value}${suffix ?? ''}`}
    >
      {/* Icon bubble */}
      {icon && (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: iconBgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          {icon}
        </div>
      )}

      {/* Label  (overline) */}
      <div
        style={{
          fontSize: typeScale.overline.fontSize,
          fontWeight: typeScale.overline.fontWeight,
          lineHeight: typeScale.overline.lineHeight,
          letterSpacing: typeScale.overline.letterSpacing,
          textTransform: 'uppercase' as const,
          color: textTokens.secondary,
          fontFamily: fontFamily.body,
          marginBottom: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{label}</span>

        {/* Trend indicator */}
        {trend && changePercent != null && (
          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: trendColor }}
            aria-label={trendLabel}
          >
            {TrendIcon && <TrendIcon size={14} />}
            <span style={{ fontSize: 12, fontWeight: 600 }}>{changePercent}%</span>
          </span>
        )}
      </div>

      {/* Value  (heading-1) */}
      <div
        style={{
          fontSize: typeScale['heading-1'].fontSize,
          fontWeight: typeScale['heading-1'].fontWeight,
          lineHeight: typeScale['heading-1'].lineHeight,
          color: textTokens.primary,
          fontFamily: fontFamily.body,
        }}
      >
        {prefix && <span style={{ fontSize: typeScale['heading-3'].fontSize }}>{prefix}</span>}
        {value}
        {suffix && (
          <span style={{ fontSize: typeScale['heading-3'].fontSize, marginLeft: 4 }}>{suffix}</span>
        )}
      </div>

      {/* Change period */}
      {changePeriod && (
        <div style={{ fontSize: 12, color: textTokens.tertiary, marginTop: 2 }}>
          {changePeriod}
        </div>
      )}

      {/* Sparkline */}
      {sparkline && sparkline.length > 0 && <MiniSparkline data={sparkline} />}

      {/* Subtitle (caption) */}
      {subtitle && (
        <div
          style={{
            fontSize: typeScale.caption.fontSize,
            fontWeight: typeScale.caption.fontWeight,
            lineHeight: typeScale.caption.lineHeight,
            color: textTokens.tertiary,
            fontFamily: fontFamily.body,
            marginTop: 8,
          }}
        >
          {subtitle}
        </div>
      )}
    </Card>
  );
}
