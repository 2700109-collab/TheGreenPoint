import React, { useMemo } from 'react';
import { fontFamily, typeScale, text } from '../tokens';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface AppBreadcrumbsProps {
  /** Items override. If not provided, auto-generated from current route */
  items?: BreadcrumbItem[];
  /** Custom separator */
  separator?: React.ReactNode;
  /** Additional class */
  className?: string;
}

// ---------------------------------------------------------------------------
// Route-segment → readable label mapping for auto-generation (§2.15)
// ---------------------------------------------------------------------------

const SEGMENT_LABELS: Record<string, string> = {
  plants: 'Plant Management',
  transfers: 'Transfers',
  outgoing: 'Outgoing Transfers',
  incoming: 'Incoming Transfers',
  facilities: 'Facilities',
  harvests: 'Harvests',
  sales: 'Sales',
  'lab-results': 'Lab Results',
  permits: 'Permits',
  operators: 'Operators',
  dashboard: 'Dashboard',
  settings: 'Settings',
  profile: 'Profile',
  inspections: 'Inspections',
  compliance: 'Compliance',
  reports: 'Reports',
  users: 'Users',
  verification: 'Verification',
};

function titleCase(segment: string): string {
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return [{ label: 'Home' }];

  const items: BreadcrumbItem[] = [{ label: 'Home', path: '/' }];
  let accumulated = '';
  segments.forEach((seg, idx) => {
    accumulated += `/${seg}`;
    const label = SEGMENT_LABELS[seg] ?? titleCase(seg);
    const isLast = idx === segments.length - 1;
    items.push({ label, path: isLast ? undefined : accumulated });
  });
  return items;
}

const bodySm = typeScale['body-sm'];

const navStyle: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: bodySm.fontSize,
  fontWeight: bodySm.fontWeight,
  lineHeight: bodySm.lineHeight,
  letterSpacing: bodySm.letterSpacing,
};

const listStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  listStyle: 'none',
  margin: 0,
  padding: 0,
  flexWrap: 'wrap',
};

const separatorStyle: React.CSSProperties = {
  margin: '0 6px',
  color: text.tertiary,
  userSelect: 'none',
};

const linkStyle: React.CSSProperties = {
  color: text.link,
  textDecoration: 'none',
};

const currentStyle: React.CSSProperties = {
  fontWeight: 600,
  color: text.primary,
};

export const AppBreadcrumbs: React.FC<AppBreadcrumbsProps> = ({
  items: itemsProp,
  separator = '/',
  className,
}) => {
  // Auto-generate breadcrumbs from current pathname when items not provided
  const autoItems = useMemo(
    () => (itemsProp ? undefined : buildBreadcrumbsFromPath(window.location.pathname)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [itemsProp],
  );
  const items = itemsProp ?? autoItems ?? [];

  return (
  <nav aria-label="Breadcrumb" style={navStyle} className={className}>
    <ol style={listStyle}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <li key={index} style={{ display: 'flex', alignItems: 'center' }}>
            {index > 0 && (
              <span aria-hidden="true" style={separatorStyle}>
                {separator}
              </span>
            )}
            {isLast || !item.path ? (
              <span aria-current={isLast ? 'page' : undefined} style={currentStyle}>
                {item.label}
              </span>
            ) : (
              <a href={item.path} style={linkStyle}>
                {item.label}
              </a>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
  );
};
