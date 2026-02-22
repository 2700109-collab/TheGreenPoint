// ============================================================================
// Data Transfer Objects (DTOs) — shared between frontend and backend
// ============================================================================

import type {
  PlantState,
  Province,
  FacilityType,
} from './enums';

// ---------- Pagination & Filtering ----------

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ---------- Facility DTOs ----------

export interface CreateFacilityDto {
  name: string;
  facilityType: FacilityType;
  province: Province;
  address: string;
  latitude: number;
  longitude: number;
  boundary?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface UpdateFacilityDto {
  name?: string;
  address?: string;
  boundary?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  isActive?: boolean;
}

// ---------- Plant DTOs ----------

export interface CreatePlantDto {
  strainId: string;
  facilityId: string;
  zoneId: string;
  plantedDate: string;
  motherPlantId?: string;
}

export interface BatchCreatePlantsDto {
  plants: CreatePlantDto[];
}

export interface UpdatePlantStateDto {
  state: PlantState;
  reason?: string; // required for 'destroyed'
}

export interface PlantFilterDto extends PaginationParams {
  state?: PlantState;
  strainId?: string;
  facilityId?: string;
  zoneId?: string;
  plantedAfter?: string;
  plantedBefore?: string;
}

// ---------- Harvest DTOs ----------

export interface CreateHarvestDto {
  facilityId: string;
  plantIds: string[];
  harvestDate: string;
  wetWeightGrams: number;
  dryWeightGrams?: number;
  notes?: string;
}

// ---------- Lab Result DTOs ----------

export interface CreateLabResultDto {
  batchId: string;
  labName: string;
  labAccreditationNumber: string;
  testDate: string;
  thcPercent: number;
  cbdPercent: number;
  cbnPercent?: number;
  cbgPercent?: number;
  totalCannabinoidsPercent: number;
  pesticidesPass: boolean;
  heavyMetalsPass: boolean;
  microbialsPass: boolean;
  mycotoxinsPass: boolean;
  terpeneProfile?: Record<string, number>;
  moisturePercent?: number;
}

// ---------- Transfer DTOs ----------

export interface CreateTransferDto {
  receiverTenantId: string;
  receiverFacilityId: string;
  senderFacilityId: string;
  vehicleRegistration?: string;
  driverName?: string;
  driverIdNumber?: string;
  notes?: string;
  items: {
    batchId: string;
    quantityGrams: number;
  }[];
}

export interface AcceptTransferDto {
  items: {
    transferItemId: string;
    receivedQuantityGrams: number;
  }[];
  notes?: string;
}

export interface RejectTransferDto {
  reason: string;
}

// ---------- Sale DTOs ----------

export interface CreateSaleDto {
  batchId: string;
  facilityId: string;
  quantityGrams: number;
  priceZar: number;
  saleDate: string;
  customerVerified: boolean;
}

// ---------- Auth DTOs ----------

export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface CurrentUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string | null;
  permissions: string[];
}

// ---------- Dashboard DTOs ----------

export interface RegulatoryDashboardDto {
  totalOperators: number;
  totalPlants: number;
  totalFacilities: number;
  activePermits: number;
  complianceRate: number;
  pendingInspections: number;
  flaggedOperators: number;
  recentActivity: DashboardActivityItem[];
}

export interface DashboardActivityItem {
  id: string;
  type: string;
  description: string;
  operatorName: string;
  timestamp: string;
}

// ---------- Verification DTOs ----------

export interface ProductVerificationDto {
  valid: boolean;
  trackingId: string;
  productName: string;
  strain: string;
  operatorName: string;
  batchNumber: string;
  entityType?: string;
  labResult: {
    status: string;
    thcPercent: number;
    cbdPercent: number;
    testDate: string;
    labName: string;
    /** Section 7.5 — Enhanced lab safety results (optional for backward compat) */
    pesticidesPass?: boolean;
    heavyMetalsPass?: boolean;
    microbialsPass?: boolean;
    mycotoxinsPass?: boolean;
  } | null;
  chainOfCustody: {
    from: string;
    to: string;
    date: string;
  }[];
  verifiedAt: string;
}
