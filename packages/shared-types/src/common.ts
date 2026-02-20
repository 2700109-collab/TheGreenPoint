// ============================================================================
// Common utility types and constants
// ============================================================================

/** Standard API error response */
export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: Record<string, string[]>;
  timestamp: string;
  path: string;
  requestId: string;
}

/** Health check response */
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  timestamp: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    eventBridge: 'up' | 'down';
  };
}

/** NCTS Tracking ID format */
export const TRACKING_ID_PREFIX = 'NCTS-ZA';
export const TRACKING_ID_REGEX = /^NCTS-ZA-\d{4}-\d{6}$/;

/** SA coordinate bounds for GPS validation */
export const SA_BOUNDS = {
  latMin: -35.0, // southernmost
  latMax: -22.0, // northernmost
  lonMin: 16.0, // westernmost
  lonMax: 33.0, // easternmost
} as const;

/** Cannabis regulatory thresholds (configurable, these are defaults) */
export const DEFAULT_THRESHOLDS = {
  /** Max THC % for hemp classification (DALRRD) */
  hempThcMaxPercent: 0.2,
  /** Max pesticide residue ppb */
  pesticideMaxPpb: 100,
  /** Max heavy metals ppm */
  heavyMetalsMaxPpm: 0.5,
  /** Max moisture % for storage */
  moistureMaxPercent: 15,
} as const;

/** Supported locale codes for i18n */
export const SUPPORTED_LOCALES = [
  'en-ZA', // English (default)
  'af-ZA', // Afrikaans
  'zu-ZA', // isiZulu
  'xh-ZA', // isiXhosa
  'st-ZA', // Sesotho
  'tn-ZA', // Setswana
  'ts-ZA', // Xitsonga
  've-ZA', // Tshivenda
  'nr-ZA', // isiNdebele
  'ss-ZA', // siSwati
  'nso-ZA', // Sepedi
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
