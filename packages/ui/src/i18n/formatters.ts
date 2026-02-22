export const formatNumber = (value: number, locale = 'en-ZA') =>
  new Intl.NumberFormat(locale).format(value);

export const formatCurrency = (value: number, locale = 'en-ZA') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: 'ZAR' }).format(value);

export const formatDate = (date: Date | string, locale = 'en-ZA') =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(date));

export const formatDateTime = (date: Date | string, locale = 'en-ZA') =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(date),
  );

export const formatRelativeTime = (date: Date | string, locale = 'en-ZA'): string => {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffMs = Date.now() - new Date(date).getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);

  if (Math.abs(diffSec) < 60) return rtf.format(-diffSec, 'second');
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, 'minute');
  if (Math.abs(diffHr) < 24) return rtf.format(-diffHr, 'hour');
  return rtf.format(-diffDay, 'day');
};

// ---- SA-specific formatters ----

/**
 * Format a South African phone number as +27 XX XXX XXXX.
 * Accepts numbers with or without the leading 0 / +27 prefix.
 */
export const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  // Strip leading 27 (country code) or leading 0
  const local = digits.startsWith('27')
    ? digits.slice(2)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits;
  if (local.length !== 9) return phone; // cannot format – return as-is
  return `+27 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
};

/**
 * Format a weight value.
 * When no `unit` is specified, values ≥ 1000 g are auto-converted to kg.
 */
export const formatWeight = (grams: number, unit?: 'g' | 'kg'): string => {
  if (unit === 'kg' || (!unit && grams >= 1000)) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${grams.toFixed(1)} g`;
};

/** Convert a decimal-degree value to DMS (degrees, minutes, seconds). */
function toDMS(dd: number): { d: number; m: number; s: number } {
  const abs = Math.abs(dd);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return { d, m, s };
}

/**
 * Format GPS coordinates in South African DMS style:
 * `S XX°XX'XX.X" E XX°XX'XX.X"`
 */
export const formatGPS = (lat: number, lng: number): string => {
  const latDMS = toDMS(lat);
  const lngDMS = toDMS(lng);
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  const fmt = (dms: { d: number; m: number; s: number }, dir: string) =>
    `${dir} ${dms.d}°${String(dms.m).padStart(2, '0')}'${dms.s.toFixed(1)}"`;
  return `${fmt(latDMS, latDir)} ${fmt(lngDMS, lngDir)}`;
};
