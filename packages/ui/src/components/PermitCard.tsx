/**
 * PermitCard — Permit summary card with color-coded type accent bar.
 *
 * Per FrontEnd.md §2.11.
 */

import { type CSSProperties, useState, useMemo } from 'react';
import { Card } from 'antd';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { fontFamily, typeScale, text as textTokens, shadows, radius } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PermitStatus = 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';

export type PermitType = 'cultivation' | 'processing' | 'distribution' | 'retail' | 'research';

export interface PermitCardProps {
  permitNumber: string;
  type: PermitType;
  status: PermitStatus;
  operatorName: string;
  issuedDate: string | Date;
  expiryDate: string | Date;
  conditionsCount?: number;
  daysToExpiry?: number;
  onClick?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<PermitType, string> = {
  cultivation: '#007A4D',
  processing: '#0958D9',
  distribution: '#D48806',
  retail: '#722ED1',
  research: '#13A8A8',
};

const TYPE_LABELS: Record<PermitType, string> = {
  cultivation: 'CULTIVATION PERMIT',
  processing: 'PROCESSING PERMIT',
  distribution: 'DISTRIBUTION PERMIT',
  retail: 'RETAIL PERMIT',
  research: 'RESEARCH PERMIT',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatDate(value: string | Date): string {
  const d = toDate(value);
  return d.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function computeDaysToExpiry(expiryDate: string | Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = toDate(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryColor(days: number): string | undefined {
  if (days < 30) return '#CF1322';
  if (days < 90) return '#D48806';
  return undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PermitCard({
  permitNumber,
  type,
  status,
  operatorName,
  issuedDate,
  expiryDate,
  conditionsCount,
  daysToExpiry: daysToExpiryProp,
  onClick,
  className,
}: PermitCardProps) {
  const [hovered, setHovered] = useState(false);

  const accentColor = TYPE_COLORS[type];
  const days = daysToExpiryProp ?? computeDaysToExpiry(expiryDate);
  const expiryColor = getExpiryColor(days);

  const ariaLabel = useMemo(() => {
    const parts = [
      `${TYPE_LABELS[type]}: ${permitNumber}`,
      `Status: ${status}`,
      `Operator: ${operatorName}`,
      `Issued: ${formatDate(issuedDate)}`,
      `Expires: ${formatDate(expiryDate)}`,
      `${days} days to expiry`,
    ];
    if (conditionsCount !== undefined && conditionsCount > 0) {
      parts.push(`${conditionsCount} condition${conditionsCount === 1 ? '' : 's'}`);
    }
    return parts.join('. ');
  }, [permitNumber, type, status, operatorName, issuedDate, expiryDate, days, conditionsCount]);

  const cardStyle: CSSProperties = {
    position: 'relative',
    borderRadius: radius.lg,
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    boxShadow: hovered && onClick ? shadows.md : shadows.sm,
    transform: hovered && onClick ? 'translateY(-2px)' : 'none',
  };

  const accentBarStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 4,
    backgroundColor: accentColor,
    borderRadius: `${radius.lg}px 0 0 ${radius.lg}px`,
  };

  const bodyStyle: CSSProperties = {
    padding: '16px 16px 16px 20px',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  };

  const overlineStyle: CSSProperties = {
    ...typeScale.overline,
    fontFamily: fontFamily.body,
    color: accentColor,
    textTransform: 'uppercase',
    margin: 0,
  };

  const permitNumberStyle: CSSProperties = {
    ...typeScale['mono'],
    fontFamily: fontFamily.mono,
    color: textTokens.primary,
    margin: '4px 0 0 0',
  };

  const operatorStyle: CSSProperties = {
    ...typeScale['body'],
    fontFamily: fontFamily.body,
    color: textTokens.secondary,
    margin: '8px 0 0 0',
  };

  const datesRowStyle: CSSProperties = {
    display: 'flex',
    gap: 16,
    marginTop: 12,
  };

  const dateLabelStyle: CSSProperties = {
    ...typeScale['body-sm'],
    fontFamily: fontFamily.body,
    color: textTokens.tertiary,
    margin: 0,
  };

  const dateValueStyle: CSSProperties = {
    ...typeScale['body-sm'],
    fontFamily: fontFamily.body,
    fontWeight: 500,
    color: textTokens.primary,
    margin: '2px 0 0 0',
  };

  const footerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid #F0F0F0',
  };

  const expiryBadgeStyle: CSSProperties = {
    ...typeScale['body-sm'],
    fontFamily: fontFamily.body,
    fontWeight: 600,
    color: expiryColor ?? textTokens.tertiary,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  const conditionsStyle: CSSProperties = {
    ...typeScale['body-sm'],
    fontFamily: fontFamily.body,
    color: '#D48806',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  return (
    <Card
      role="article"
      aria-label={ariaLabel}
      className={className}
      style={cardStyle}
      bodyStyle={bodyStyle}
      bordered
      hoverable={false}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left color accent bar */}
      <div style={accentBarStyle} aria-hidden="true" />

      {/* Header: overline + status badge */}
      <div style={headerStyle}>
        <div>
          <p style={overlineStyle}>{TYPE_LABELS[type]}</p>
          <p style={permitNumberStyle}>{permitNumber}</p>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      {/* Operator name */}
      <p style={operatorStyle}>{operatorName}</p>

      {/* Issue + expiry dates */}
      <div style={datesRowStyle}>
        <div>
          <p style={dateLabelStyle}>Issued</p>
          <p style={dateValueStyle}>{formatDate(issuedDate)}</p>
        </div>
        <div>
          <p style={dateLabelStyle}>Expires</p>
          <p style={{ ...dateValueStyle, color: expiryColor ?? textTokens.primary }}>
            {formatDate(expiryDate)}
          </p>
        </div>
      </div>

      {/* Footer: expiry warning + conditions + arrow */}
      <div style={footerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Expiry warning */}
          <span style={expiryBadgeStyle}>
            {days} day{days === 1 ? '' : 's'} remaining
          </span>

          {/* Conditions count */}
          {conditionsCount !== undefined && conditionsCount > 0 && (
            <span style={conditionsStyle}>
              <AlertTriangle size={14} />
              {conditionsCount} condition{conditionsCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {onClick && (
          <ArrowRight
            size={16}
            color={textTokens.tertiary}
            style={{ flexShrink: 0 }}
            aria-hidden="true"
          />
        )}
      </div>
    </Card>
  );
}
