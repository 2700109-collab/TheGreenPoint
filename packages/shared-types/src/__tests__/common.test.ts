import { describe, it, expect } from 'vitest';
import {
  TRACKING_ID_PREFIX,
  TRACKING_ID_REGEX,
  SA_BOUNDS,
  DEFAULT_THRESHOLDS,
  SUPPORTED_LOCALES,
} from '../common';
import {
  UserRole,
  PlantState,
  BatchType,
  TransferStatus,
  PermitType,
  PermitStatus,
  LabResultStatus,
  ComplianceStatus,
  Province,
  FacilityType,
} from '../enums';

// ── TRACKING_ID_REGEX ────────────────────────────────────────
describe('TRACKING_ID_REGEX', () => {
  it('matches valid tracking IDs', () => {
    expect(TRACKING_ID_REGEX.test('NCTS-ZA-2025-000001')).toBe(true);
    expect(TRACKING_ID_REGEX.test('NCTS-ZA-2026-123456')).toBe(true);
    expect(TRACKING_ID_REGEX.test('NCTS-ZA-9999-999999')).toBe(true);
  });

  it('rejects IDs with wrong prefix', () => {
    expect(TRACKING_ID_REGEX.test('XCTS-ZA-2025-000001')).toBe(false);
    expect(TRACKING_ID_REGEX.test('NCTS-US-2025-000001')).toBe(false);
  });

  it('rejects IDs with wrong digit counts', () => {
    expect(TRACKING_ID_REGEX.test('NCTS-ZA-25-000001')).toBe(false); // 2-digit year
    expect(TRACKING_ID_REGEX.test('NCTS-ZA-2025-0001')).toBe(false); // 4-digit seq
    expect(TRACKING_ID_REGEX.test('NCTS-ZA-2025-0000001')).toBe(false); // 7-digit seq
  });

  it('rejects empty string', () => {
    expect(TRACKING_ID_REGEX.test('')).toBe(false);
  });

  it('rejects partial matches (no extra chars)', () => {
    expect(TRACKING_ID_REGEX.test('prefix-NCTS-ZA-2025-000001')).toBe(false);
    expect(TRACKING_ID_REGEX.test('NCTS-ZA-2025-000001-suffix')).toBe(false);
  });
});

// ── TRACKING_ID_PREFIX ───────────────────────────────────────
describe('TRACKING_ID_PREFIX', () => {
  it('equals NCTS-ZA', () => {
    expect(TRACKING_ID_PREFIX).toBe('NCTS-ZA');
  });
});

// ── SA_BOUNDS ────────────────────────────────────────────────
describe('SA_BOUNDS', () => {
  it('has correct latitude range for South Africa', () => {
    expect(SA_BOUNDS.latMin).toBeLessThan(SA_BOUNDS.latMax);
    expect(SA_BOUNDS.latMin).toBeCloseTo(-35.0);
    expect(SA_BOUNDS.latMax).toBeCloseTo(-22.0);
  });

  it('has correct longitude range for South Africa', () => {
    expect(SA_BOUNDS.lonMin).toBeLessThan(SA_BOUNDS.lonMax);
    expect(SA_BOUNDS.lonMin).toBeCloseTo(16.0);
    expect(SA_BOUNDS.lonMax).toBeCloseTo(33.0);
  });

  it('includes Cape Town (-33.92, 18.42)', () => {
    expect(-33.92).toBeGreaterThanOrEqual(SA_BOUNDS.latMin);
    expect(-33.92).toBeLessThanOrEqual(SA_BOUNDS.latMax);
    expect(18.42).toBeGreaterThanOrEqual(SA_BOUNDS.lonMin);
    expect(18.42).toBeLessThanOrEqual(SA_BOUNDS.lonMax);
  });

  it('includes Johannesburg (-26.20, 28.05)', () => {
    expect(-26.2).toBeGreaterThanOrEqual(SA_BOUNDS.latMin);
    expect(-26.2).toBeLessThanOrEqual(SA_BOUNDS.latMax);
    expect(28.05).toBeGreaterThanOrEqual(SA_BOUNDS.lonMin);
    expect(28.05).toBeLessThanOrEqual(SA_BOUNDS.lonMax);
  });

  it('excludes Nairobi (-1.29, 36.82)', () => {
    expect(-1.29).toBeGreaterThan(SA_BOUNDS.latMax); // outside
  });
});

// ── DEFAULT_THRESHOLDS ───────────────────────────────────────
describe('DEFAULT_THRESHOLDS', () => {
  it('has hemp THC max at 0.2%', () => {
    expect(DEFAULT_THRESHOLDS.hempThcMaxPercent).toBe(0.2);
  });

  it('has all expected threshold keys', () => {
    expect(DEFAULT_THRESHOLDS).toHaveProperty('hempThcMaxPercent');
    expect(DEFAULT_THRESHOLDS).toHaveProperty('pesticideMaxPpb');
    expect(DEFAULT_THRESHOLDS).toHaveProperty('heavyMetalsMaxPpm');
    expect(DEFAULT_THRESHOLDS).toHaveProperty('moistureMaxPercent');
  });

  it('thresholds are positive numbers', () => {
    expect(DEFAULT_THRESHOLDS.hempThcMaxPercent).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS.pesticideMaxPpb).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS.heavyMetalsMaxPpm).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS.moistureMaxPercent).toBeGreaterThan(0);
  });
});

// ── SUPPORTED_LOCALES ────────────────────────────────────────
describe('SUPPORTED_LOCALES', () => {
  it('includes en-ZA as the first locale', () => {
    expect(SUPPORTED_LOCALES[0]).toBe('en-ZA');
  });

  it('contains all 11 official SA languages', () => {
    expect(SUPPORTED_LOCALES).toHaveLength(11);
  });

  it('all locales follow xx-ZA pattern', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(locale).toMatch(/^[a-z]{2,3}-ZA$/);
    }
  });
});

// ── Enums ────────────────────────────────────────────────────
describe('Enums', () => {
  it('UserRole has expected values', () => {
    expect(UserRole.SUPER_ADMIN).toBe('super_admin');
    expect(UserRole.REGULATOR).toBe('regulator');
    expect(UserRole.PUBLIC).toBe('public');
  });

  it('PlantState has the full lifecycle', () => {
    const states = Object.values(PlantState);
    expect(states).toContain('seed');
    expect(states).toContain('seedling');
    expect(states).toContain('vegetative');
    expect(states).toContain('flowering');
    expect(states).toContain('harvested');
    expect(states).toContain('destroyed');
    expect(states).toHaveLength(6);
  });

  it('BatchType has 3 types', () => {
    expect(Object.values(BatchType)).toHaveLength(3);
  });

  it('TransferStatus has correct flow states', () => {
    const statuses = Object.values(TransferStatus);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('in_transit');
    expect(statuses).toContain('delivered');
    expect(statuses).toContain('accepted');
    expect(statuses).toContain('rejected');
    expect(statuses).toContain('cancelled');
  });

  it('Province has all 9 SA provinces', () => {
    expect(Object.values(Province)).toHaveLength(9);
    expect(Province.WESTERN_CAPE).toBe('WC');
    expect(Province.GAUTENG).toBe('GP');
    expect(Province.KWAZULU_NATAL).toBe('KZN');
  });

  it('FacilityType covers supply chain stages', () => {
    const types = Object.values(FacilityType);
    expect(types).toContain('cultivation');
    expect(types).toContain('processing');
    expect(types).toContain('distribution');
    expect(types).toContain('retail');
    expect(types).toContain('laboratory');
  });

  it('PermitType includes SA regulatory permits', () => {
    expect(PermitType.SAHPRA_22A).toBe('sahpra_22a');
    expect(PermitType.DALRRD_HEMP).toBe('dalrrd_hemp');
  });

  it('LabResultStatus has 4 statuses', () => {
    expect(Object.values(LabResultStatus)).toHaveLength(4);
    expect(LabResultStatus.PASS).toBe('pass');
    expect(LabResultStatus.FAIL).toBe('fail');
  });

  it('ComplianceStatus has 4 levels', () => {
    expect(Object.values(ComplianceStatus)).toHaveLength(4);
  });
});
