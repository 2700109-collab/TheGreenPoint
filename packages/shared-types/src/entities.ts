// ============================================================================
// Domain Entity Interfaces
// ============================================================================

import type {
  UserRole,
  PlantState,
  BatchType,
  TransferStatus,
  PermitType,
  PermitStatus,
  LabResultStatus,
  ComplianceStatus,
  AuditAction,
  Province,
  FacilityType,
} from './enums';

/** Base entity with common audit fields */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** Multi-tenant entity — scoped to a tenant */
export interface TenantScopedEntity extends BaseEntity {
  tenantId: string;
}

/** Tenant (licensed operator organization) */
export interface Tenant extends BaseEntity {
  name: string;
  tradingName: string;
  registrationNumber: string; // CIPC registration
  taxNumber: string | null; // SARS tax number
  bbbeeLevel: number | null; // B-BBEE level (1-8)
  contactEmail: string;
  contactPhone: string | null;
  province: Province;
  address: string;
  complianceStatus: ComplianceStatus;
  isActive: boolean;
}

/** User within the system */
export interface User extends BaseEntity {
  cognitoId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string | null; // null for regulators
  isActive: boolean;
  lastLoginAt: string | null;
}

/** Regulatory permit */
export interface Permit extends TenantScopedEntity {
  permitType: PermitType;
  permitNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  status: PermitStatus;
  conditions: string | null;
  facilityId: string;
}

/** Licensed facility with geospatial boundary */
export interface Facility extends TenantScopedEntity {
  name: string;
  facilityType: FacilityType;
  province: Province;
  address: string;
  /** GeoJSON Polygon for facility boundary */
  boundary: GeoJsonPolygon | null;
  /** GPS coordinates (centroid) */
  latitude: number;
  longitude: number;
  isActive: boolean;
}

/** Growing zone within a facility */
export interface Zone extends TenantScopedEntity {
  facilityId: string;
  name: string;
  capacity: number; // max plants
  currentCount: number;
  isActive: boolean;
}

/** Cannabis strain / cultivar */
export interface Strain extends BaseEntity {
  name: string;
  type: 'sativa' | 'indica' | 'hybrid' | 'ruderalis';
  thcRange: string | null; // e.g., "15-22%"
  cbdRange: string | null; // e.g., "0.5-1.2%"
  floweringWeeks: number | null;
  description: string | null;
}

/** Individual tracked plant */
export interface Plant extends TenantScopedEntity {
  trackingId: string; // NCTS-ZA-2026-000001
  strainId: string;
  facilityId: string;
  zoneId: string;
  state: PlantState;
  plantedDate: string;
  harvestedDate: string | null;
  destroyedDate: string | null;
  destroyedReason: string | null;
  motherPlantId: string | null; // for clones
  batchId: string | null;
}

/** Batch of harvested or processed product */
export interface Batch extends TenantScopedEntity {
  batchNumber: string;
  batchType: BatchType;
  strainId: string;
  facilityId: string;
  plantCount: number;
  wetWeightGrams: number | null;
  dryWeightGrams: number | null;
  processedWeightGrams: number | null;
  labResultId: string | null;
  parentBatchId: string | null; // for processed batches derived from harvest
  createdDate: string;
}

/** Harvest event */
export interface Harvest extends TenantScopedEntity {
  batchId: string;
  facilityId: string;
  harvestDate: string;
  wetWeightGrams: number;
  dryWeightGrams: number | null;
  plantIds: string[];
  notes: string | null;
}

/** Certificate of Analysis (lab test results) */
export interface LabResult extends TenantScopedEntity {
  labName: string;
  labAccreditationNumber: string;
  testDate: string;
  status: LabResultStatus;
  /** Cannabinoid profile */
  thcPercent: number;
  cbdPercent: number;
  cbnPercent: number | null;
  cbgPercent: number | null;
  totalCannabinoidsPercent: number;
  /** Contaminant screening */
  pesticidesPass: boolean;
  heavyMetalsPass: boolean;
  microbialsPass: boolean;
  mycotoxinsPass: boolean;
  /** Terpene profile (top terpenes as key-value) */
  terpeneProfile: Record<string, number> | null;
  /** Moisture content % */
  moisturePercent: number | null;
  certificateUrl: string | null; // S3 URL to PDF
}

/** Digital transfer manifest */
export interface Transfer extends TenantScopedEntity {
  transferNumber: string;
  senderTenantId: string;
  senderFacilityId: string;
  receiverTenantId: string;
  receiverFacilityId: string;
  status: TransferStatus;
  initiatedAt: string;
  deliveredAt: string | null;
  completedAt: string | null;
  vehicleRegistration: string | null;
  driverName: string | null;
  driverIdNumber: string | null;
  notes: string | null;
  items: TransferItem[];
}

/** Individual item within a transfer */
export interface TransferItem {
  id: string;
  transferId: string;
  batchId: string;
  quantityGrams: number;
  receivedQuantityGrams: number | null;
}

/** Retail sale event */
export interface Sale extends TenantScopedEntity {
  saleNumber: string;
  batchId: string;
  facilityId: string;
  quantityGrams: number;
  priceZar: number;
  saleDate: string;
  customerVerified: boolean;
}

/** Append-only audit event (hash-chained) */
export interface AuditEvent {
  id: string;
  sequenceNumber: number;
  entityType: string;
  entityId: string;
  action: AuditAction;
  actorId: string;
  actorRole: UserRole;
  tenantId: string | null;
  payload: Record<string, unknown>;
  previousHash: string;
  eventHash: string;
  ipAddress: string | null;
  userAgent: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  createdAt: string;
}

// GeoJSON type for facility boundaries
export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}
