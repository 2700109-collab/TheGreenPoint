import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
  formatWeight,
  formatGPS,
} from '../formatters';

// ── formatNumber ─────────────────────────────────────────────
describe('formatNumber', () => {
  it('formats integers with locale grouping', () => {
    const result = formatNumber(1234567);
    // en-ZA uses non-breaking space as grouping separator
    expect(result.replace(/\s/g, ' ')).toContain('1');
    expect(result.replace(/\s/g, ' ')).toContain('234');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats negative numbers', () => {
    const result = formatNumber(-42);
    expect(result).toContain('42');
  });

  it('formats decimals', () => {
    const result = formatNumber(3.14);
    expect(result).toContain('3');
    expect(result).toContain('14');
  });
});

// ── formatCurrency ───────────────────────────────────────────
describe('formatCurrency', () => {
  it('formats as South African Rand', () => {
    const result = formatCurrency(1500);
    // Should contain ZAR or R symbol and the number
    expect(result).toMatch(/R|ZAR/);
    expect(result.replace(/\s/g, '')).toContain('1');
    expect(result.replace(/\s/g, '')).toContain('500');
  });

  it('formats zero as currency', () => {
    const result = formatCurrency(0);
    expect(result).toMatch(/R|ZAR/);
    expect(result).toContain('0');
  });

  it('includes decimals', () => {
    const result = formatCurrency(99.99);
    expect(result).toContain('99');
  });
});

// ── formatDate ───────────────────────────────────────────────
describe('formatDate', () => {
  it('formats a Date object', () => {
    const result = formatDate(new Date('2025-06-15T00:00:00Z'));
    expect(result).toContain('2025');
    expect(result).toContain('Jun');
  });

  it('formats an ISO string', () => {
    const result = formatDate('2025-01-01T12:00:00Z');
    expect(result).toContain('2025');
    expect(result).toContain('Jan');
  });
});

// ── formatDateTime ───────────────────────────────────────────
describe('formatDateTime', () => {
  it('includes both date and time components', () => {
    const result = formatDateTime('2025-06-15T14:30:00Z');
    expect(result).toContain('2025');
    expect(result).toContain('Jun');
    // Should have time component
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

// ── formatPhone ──────────────────────────────────────────────
describe('formatPhone', () => {
  it('formats a 10-digit SA number with leading 0', () => {
    expect(formatPhone('0821234567')).toBe('+27 82 123 4567');
  });

  it('formats a number with +27 prefix', () => {
    expect(formatPhone('+27821234567')).toBe('+27 82 123 4567');
  });

  it('formats a number with 27 prefix (no +)', () => {
    expect(formatPhone('27821234567')).toBe('+27 82 123 4567');
  });

  it('returns original string if digits count is unexpected', () => {
    expect(formatPhone('12345')).toBe('12345');
  });

  it('strips non-digit characters', () => {
    expect(formatPhone('082-123-4567')).toBe('+27 82 123 4567');
    expect(formatPhone('(082) 123 4567')).toBe('+27 82 123 4567');
  });
});

// ── formatWeight ─────────────────────────────────────────────
describe('formatWeight', () => {
  it('formats grams under 1000 as grams', () => {
    expect(formatWeight(500)).toBe('500.0 g');
  });

  it('auto-converts to kg when ≥ 1000 g', () => {
    expect(formatWeight(1500)).toBe('1.50 kg');
  });

  it('formats exactly 1000 g as kg', () => {
    expect(formatWeight(1000)).toBe('1.00 kg');
  });

  it('respects explicit unit override — force grams', () => {
    expect(formatWeight(2000, 'g')).toBe('2000.0 g');
  });

  it('respects explicit unit override — force kg', () => {
    expect(formatWeight(500, 'kg')).toBe('0.50 kg');
  });

  it('handles zero', () => {
    expect(formatWeight(0)).toBe('0.0 g');
  });

  it('handles fractional grams', () => {
    expect(formatWeight(0.5)).toBe('0.5 g');
  });
});

// ── formatGPS ────────────────────────────────────────────────
describe('formatGPS', () => {
  it('formats Cape Town coordinates correctly', () => {
    // Cape Town: -33.9249, 18.4241
    const result = formatGPS(-33.9249, 18.4241);
    expect(result).toContain('S');
    expect(result).toContain('E');
    expect(result).toContain('33°');
    expect(result).toContain('18°');
  });

  it('formats Johannesburg coordinates', () => {
    // Johannesburg: -26.2041, 28.0473
    const result = formatGPS(-26.2041, 28.0473);
    expect(result).toContain('S');
    expect(result).toContain('E');
    expect(result).toContain('26°');
    expect(result).toContain('28°');
  });

  it('uses N for positive latitude', () => {
    const result = formatGPS(10.0, 20.0);
    expect(result).toContain('N');
    expect(result).toContain('E');
  });

  it('uses W for negative longitude', () => {
    const result = formatGPS(-30.0, -10.0);
    expect(result).toContain('S');
    expect(result).toContain('W');
  });

  it('output matches DMS format pattern', () => {
    const result = formatGPS(-33.9249, 18.4241);
    // Expected pattern: S XX°XX'XX.X" E XX°XX'XX.X"
    expect(result).toMatch(/[NS]\s\d+°\d{2}'\d+\.\d+"\s[EW]\s\d+°\d{2}'\d+\.\d+"/);
  });
});
