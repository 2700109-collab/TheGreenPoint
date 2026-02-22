/**
 * StatusBadge — Domain-aware status indicator with filled / outlined / dot variants.
 *
 * Covers all NCTS domain enums: Plant, Transfer, Permit, Compliance,
 * Lab-Result, and Facility statuses. Per FrontEnd.md §2.4.
 */

import type { CSSProperties } from 'react';
import {
  Sprout,
  Leaf,
  Flower,
  Check,
  Trash2,
  AlertTriangle,
  FileEdit,
  ArrowRight,
  Truck,
  Navigation,
  PackageCheck,
  ShieldCheck,
  XCircle,
  Ban,
  Clock,
  CheckCircle,
  Pause,
  ShieldOff,
  AlertCircle,
  XOctagon,
  X,
  HelpCircle,
  Loader2,
  Circle,
} from 'lucide-react';
import { text as textTokens, fontFamily } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlantStatus = 'seed' | 'seedling' | 'vegetative' | 'flowering' | 'harvested' | 'destroyed' | 'quarantined';
export type TransferStatus = 'draft' | 'initiated' | 'dispatched' | 'in_transit' | 'received' | 'verified' | 'rejected' | 'cancelled';
export type PermitStatus = 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';
export type ComplianceLevel = 'compliant' | 'minor_issues' | 'major_issues' | 'critical' | 'suspended';
export type LabResultStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'inconclusive';
export type FacilityStatus = 'active' | 'inactive' | 'suspended' | 'pending_approval';
export type HarvestStatus = 'completed' | 'drying' | 'processing' | 'pending' | 'in_progress';
export type SaleStatus = 'completed' | 'pending' | 'invoiced' | 'dispatched' | 'void' | 'draft';

export type StatusType =
  | PlantStatus
  | TransferStatus
  | PermitStatus
  | ComplianceLevel
  | LabResultStatus
  | FacilityStatus
  | HarvestStatus
  | SaleStatus;

export type BadgeVariant = 'filled' | 'outlined' | 'dot';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface StatusBadgeProps {
  status: StatusType;
  /** Optional domain context for accessible label (e.g., "Plant", "Transfer") */
  domain?: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  showIcon?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Color Map  (§2.4 Color Mapping table)
// ---------------------------------------------------------------------------

interface StatusMeta {
  color: string;
  bg: string;
  icon: React.FC<{ size: number }>;
}

const STATUS_MAP: Record<string, StatusMeta> = {
  // Plant
  seed:         { color: '#8C8C8C', bg: '#F5F5F5', icon: Circle },
  seedling:     { color: '#389E0D', bg: '#F6FFED', icon: Sprout },
  vegetative:   { color: '#007A4D', bg: '#E6F5EF', icon: Leaf },
  flowering:    { color: '#D48806', bg: '#FFFBE6', icon: Flower },
  harvested:    { color: '#0958D9', bg: '#E6F4FF', icon: Check },
  destroyed:    { color: '#8C8C8C', bg: '#F5F5F5', icon: Trash2 },
  quarantined:  { color: '#CF1322', bg: '#FFF2F0', icon: AlertTriangle },

  // Transfer
  draft:        { color: '#8C8C8C', bg: '#F5F5F5', icon: FileEdit },
  initiated:    { color: '#0958D9', bg: '#E6F4FF', icon: ArrowRight },
  dispatched:   { color: '#D48806', bg: '#FFFBE6', icon: Truck },
  in_transit:   { color: '#D48806', bg: '#FFFBE6', icon: Navigation },
  received:     { color: '#389E0D', bg: '#F6FFED', icon: PackageCheck },
  verified:     { color: '#007A4D', bg: '#E6F5EF', icon: ShieldCheck },
  rejected:     { color: '#CF1322', bg: '#FFF2F0', icon: XCircle },
  cancelled:    { color: '#8C8C8C', bg: '#F5F5F5', icon: Ban },

  // Permit
  pending:      { color: '#D48806', bg: '#FFFBE6', icon: Clock },
  active:       { color: '#007A4D', bg: '#E6F5EF', icon: CheckCircle },
  suspended:    { color: '#CF1322', bg: '#FFF2F0', icon: Pause },
  revoked:      { color: '#CF1322', bg: '#FFF2F0', icon: ShieldOff },
  expired:      { color: '#8C8C8C', bg: '#F5F5F5', icon: AlertCircle },

  // Compliance
  compliant:    { color: '#007A4D', bg: '#E6F5EF', icon: ShieldCheck },
  minor_issues: { color: '#D48806', bg: '#FFFBE6', icon: AlertTriangle },
  major_issues: { color: '#CF1322', bg: '#FFF2F0', icon: AlertCircle },
  critical:     { color: '#CF1322', bg: '#FFF2F0', icon: XOctagon },

  // Lab result
  in_progress:  { color: '#0958D9', bg: '#E6F4FF', icon: Loader2 },
  passed:       { color: '#389E0D', bg: '#F6FFED', icon: Check },
  failed:       { color: '#CF1322', bg: '#FFF2F0', icon: X },
  inconclusive: { color: '#D48806', bg: '#FFFBE6', icon: HelpCircle },

  // Facility
  inactive:         { color: '#8C8C8C', bg: '#F5F5F5', icon: Circle },
  pending_approval: { color: '#D48806', bg: '#FFFBE6', icon: Clock },

  // Harvest
  completed:    { color: '#007A4D', bg: '#E6F5EF', icon: CheckCircle },
  drying:       { color: '#D48806', bg: '#FFFBE6', icon: Clock },
  processing:   { color: '#0958D9', bg: '#E6F4FF', icon: Loader2 },

  // Sale
  invoiced:     { color: '#0958D9', bg: '#E6F4FF', icon: FileEdit },
  dispatched_sale: { color: '#D48806', bg: '#FFFBE6', icon: Truck },
  void:         { color: '#CF1322', bg: '#FFF2F0', icon: XCircle },
};

// Fallback for any unrecognized status
const FALLBACK: StatusMeta = { color: '#8C8C8C', bg: '#F5F5F5', icon: Circle };

// ---------------------------------------------------------------------------
// Domain inference map – maps each status to its primary NCTS domain.
// Used for domain-scoped aria-labels per §2.4 Accessibility.
// ---------------------------------------------------------------------------

const STATUS_DOMAIN: Record<string, string> = {
  // Plant
  seed: 'Plant', seedling: 'Plant', vegetative: 'Plant', flowering: 'Plant',
  harvested: 'Plant', destroyed: 'Plant', quarantined: 'Plant',
  // Transfer
  draft: 'Transfer', initiated: 'Transfer', dispatched: 'Transfer',
  in_transit: 'Transfer', received: 'Transfer', verified: 'Transfer',
  rejected: 'Transfer', cancelled: 'Transfer',
  // Permit
  pending: 'Permit', active: 'Permit', suspended: 'Permit',
  revoked: 'Permit', expired: 'Permit',
  // Compliance
  compliant: 'Compliance', minor_issues: 'Compliance',
  major_issues: 'Compliance', critical: 'Compliance',
  // Lab result
  in_progress: 'Lab result', passed: 'Lab result',
  failed: 'Lab result', inconclusive: 'Lab result',
  // Facility
  inactive: 'Facility', pending_approval: 'Facility',
  // Harvest
  completed: 'Harvest', drying: 'Harvest', processing: 'Harvest',
  // Sale
  invoiced: 'Sale', void: 'Sale',
};

// ---------------------------------------------------------------------------
// Size Tokens  (§2.4 Size Tokens table)
// ---------------------------------------------------------------------------

interface SizeMeta {
  fontSize: number;
  paddingH: number;
  paddingV: number;
  height: number;
  dotSize: number;
  iconSize: number;
}

const SIZE_MAP: Record<BadgeSize, SizeMeta> = {
  sm: { fontSize: 11, paddingH: 8, paddingV: 4, height: 20, dotSize: 6, iconSize: 12 },
  md: { fontSize: 12, paddingH: 10, paddingV: 4, height: 24, dotSize: 8, iconSize: 14 },
  lg: { fontSize: 14, paddingH: 12, paddingV: 6, height: 28, dotSize: 10, iconSize: 16 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatusBadge({
  status,
  domain,
  variant = 'filled',
  size = 'md',
  showIcon = false,
  className,
}: StatusBadgeProps) {
  const meta = STATUS_MAP[status] ?? FALLBACK;
  const sz = SIZE_MAP[size];
  const label = formatLabel(status);
  const domainLabel = domain ?? STATUS_DOMAIN[status] ?? 'Status';
  const IconComponent = meta.icon;

  // --- Style by variant ---------------------------------------------------

  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: sz.height,
    padding: `${sz.paddingV}px ${sz.paddingH}px`,
    borderRadius: 999,
    fontSize: sz.fontSize,
    fontWeight: 500,
    fontFamily: fontFamily.body,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  };

  let style: CSSProperties;

  if (variant === 'filled') {
    style = {
      ...base,
      backgroundColor: meta.bg,
      color: meta.color,
    };
  } else if (variant === 'outlined') {
    style = {
      ...base,
      backgroundColor: '#fff',
      color: meta.color,
      border: `1px solid ${meta.color}`,
    };
  } else {
    // dot
    style = {
      ...base,
      backgroundColor: 'transparent',
      color: textTokens.primary,
      padding: `${sz.paddingV}px 0`,
    };
  }

  return (
    <span
      role="status"
      aria-label={`${domainLabel} status: ${label}`}
      className={className}
      style={style}
    >
      {/* Dot */}
      {variant === 'dot' && (
        <span
          style={{
            width: sz.dotSize,
            height: sz.dotSize,
            borderRadius: '50%',
            backgroundColor: meta.color,
            flexShrink: 0,
          }}
        />
      )}

      {/* Icon (non-dot variants only) */}
      {showIcon && variant !== 'dot' && (
        <IconComponent size={sz.iconSize} />
      )}

      {/* Text label */}
      <span>{label}</span>
    </span>
  );
}
