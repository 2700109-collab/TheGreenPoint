/**
 * EntityEmptyState — Contextual empty state component.
 *
 * Displays a centered icon + heading + description + optional CTA
 * when an entity list has no data. Per FrontEnd.md §1.9 + §2.13.
 */

import type { CSSProperties } from 'react';
import { neutral, text as textTokens, typeScale, fontFamily } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EntityEmptyStateProps {
  /** Lucide icon or custom SVG */
  icon: React.ReactNode;
  /** Heading text */
  heading: string;
  /** Description text */
  description: string;
  /** Primary action button */
  action?: React.ReactNode;
  /** Secondary action (e.g., "Learn more" link) */
  secondaryAction?: React.ReactNode;
  /** Heading level for semantic HTML (default: 3) */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Compact mode for inline empty states (e.g., within cards) */
  compact?: boolean;
  /** Additional class */
  className?: string;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerBase: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '48px 24px',
  fontFamily: fontFamily.body,
};

const compactContainer: CSSProperties = {
  ...containerBase,
  padding: '24px 16px',
};

const iconStyle: CSSProperties = {
  color: neutral[400],
  width: 48,
  height: 48,
  marginBottom: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const compactIconStyle: CSSProperties = {
  color: neutral[400],
  width: 24,
  height: 24,
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const headingStyle: CSSProperties = {
  fontSize: typeScale['heading-3'].fontSize,
  fontWeight: typeScale['heading-3'].fontWeight,
  lineHeight: typeScale['heading-3'].lineHeight,
  color: textTokens.primary,
  margin: '0 0 8px',
};

const compactHeadingStyle: CSSProperties = {
  fontSize: typeScale['heading-5'].fontSize,
  fontWeight: typeScale['heading-5'].fontWeight,
  lineHeight: typeScale['heading-5'].lineHeight,
  color: textTokens.primary,
  margin: '0 0 4px',
};

const descriptionStyle: CSSProperties = {
  fontSize: typeScale['body'].fontSize,
  fontWeight: typeScale['body'].fontWeight,
  lineHeight: typeScale['body'].lineHeight,
  color: textTokens.secondary,
  maxWidth: 400,
  margin: '0 0 24px',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EntityEmptyState({
  icon,
  heading,
  description,
  action,
  secondaryAction,
  headingLevel = 3,
  compact = false,
  className,
}: EntityEmptyStateProps) {
  const HeadingTag = `h${headingLevel}` as React.ElementType;
  return (
    <div
      role="status"
      aria-label={`No data: ${heading}`}
      className={className}
      style={compact ? compactContainer : containerBase}
    >
      {/* Icon */}
      <div style={compact ? compactIconStyle : iconStyle}>{icon}</div>

      {/* Heading */}
      <HeadingTag style={compact ? compactHeadingStyle : headingStyle}>{heading}</HeadingTag>

      {/* Description — hidden in compact mode */}
      {!compact && <p style={descriptionStyle}>{description}</p>}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div style={actionsStyle}>
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
