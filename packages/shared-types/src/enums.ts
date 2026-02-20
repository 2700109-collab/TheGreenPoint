// ============================================================================
// Domain Enumerations
// ============================================================================

/** Roles within the NCTS platform */
export enum UserRole {
  /** SAHPRA, DALRRD, DTIC, SARS officials */
  REGULATOR = 'regulator',
  /** Field inspectors */
  INSPECTOR = 'inspector',
  /** Licensed operator — admin */
  OPERATOR_ADMIN = 'operator_admin',
  /** Licensed operator — staff */
  OPERATOR_STAFF = 'operator_staff',
  /** Accredited laboratory technician */
  LAB_TECHNICIAN = 'lab_technician',
  /** Public verification user */
  PUBLIC = 'public',
}

/** Plant lifecycle states */
export enum PlantState {
  SEED = 'seed',
  SEEDLING = 'seedling',
  VEGETATIVE = 'vegetative',
  FLOWERING = 'flowering',
  HARVESTED = 'harvested',
  DESTROYED = 'destroyed',
}

/** Batch types */
export enum BatchType {
  HARVEST = 'harvest',
  PROCESSED = 'processed',
  PACKAGED = 'packaged',
}

/** Transfer status */
export enum TransferStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

/** Permit types issued by SA regulatory bodies */
export enum PermitType {
  /** SAHPRA Section 22A — cultivation for medicinal/research */
  SAHPRA_22A = 'sahpra_22a',
  /** SAHPRA Section 22C — manufacture/distribution */
  SAHPRA_22C = 'sahpra_22c',
  /** DALRRD hemp cultivation permit */
  DALRRD_HEMP = 'dalrrd_hemp',
  /** DTIC industrial hemp processing */
  DTIC_PROCESSING = 'dtic_processing',
}

/** Permit status */
export enum PermitStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

/** Lab test result status */
export enum LabResultStatus {
  PENDING = 'pending',
  PASS = 'pass',
  FAIL = 'fail',
  CONDITIONAL = 'conditional',
}

/** Compliance status for operators */
export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  WARNING = 'warning',
  NON_COMPLIANT = 'non_compliant',
  UNDER_REVIEW = 'under_review',
}

/** Audit event actions */
export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  STATE_CHANGE = 'state_change',
  TRANSFER_INITIATE = 'transfer_initiate',
  TRANSFER_ACCEPT = 'transfer_accept',
  TRANSFER_REJECT = 'transfer_reject',
  LAB_SUBMIT = 'lab_submit',
  INSPECTION_CREATE = 'inspection_create',
  INSPECTION_COMPLETE = 'inspection_complete',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

/** South African provinces */
export enum Province {
  EASTERN_CAPE = 'EC',
  FREE_STATE = 'FS',
  GAUTENG = 'GP',
  KWAZULU_NATAL = 'KZN',
  LIMPOPO = 'LP',
  MPUMALANGA = 'MP',
  NORTH_WEST = 'NW',
  NORTHERN_CAPE = 'NC',
  WESTERN_CAPE = 'WC',
}

/** Facility types */
export enum FacilityType {
  CULTIVATION = 'cultivation',
  PROCESSING = 'processing',
  DISTRIBUTION = 'distribution',
  RETAIL = 'retail',
  LABORATORY = 'laboratory',
}
