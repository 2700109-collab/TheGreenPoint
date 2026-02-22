// NOTE: Install deps if switching to i18next later:
//   pnpm add i18next react-i18next i18next-browser-languagedetector
// This file initializes a lightweight i18n system for the NCTS system.
// For now, only English is implemented; Afrikaans, Zulu, Xhosa etc. are planned.

import en from './locales/en.json';

type TranslationKey = string;
type Locale = 'en';

const translations: Record<Locale, Record<string, unknown>> = { en };
let currentLocale: Locale = 'en';

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Resolve a dot-path key from the translation map.
 * Returns the string value or `undefined` if not found.
 */
function resolve(key: string): string | undefined {
  const parts = key.split('.');
  let result: unknown = translations[currentLocale];
  for (const part of parts) {
    if (result && typeof result === 'object' && part in result) {
      result = (result as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof result === 'string' ? result : undefined;
}

/**
 * Get a translation by dot-path with optional interpolation and pluralisation.
 *
 * **Interpolation** – `{{variable}}` placeholders are replaced by matching
 * values from the `params` object.
 *   e.g. `t('footer.copyright', { year: 2024 })`
 *
 * **Plurals** – When `params` contains a numeric `count` property the
 * function will look up `<key>_one` (count === 1) or `<key>_other`.
 *   e.g. `t('plants.count', { count: 5 })` → resolves `plants.count_other`
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  let template: string | undefined;

  // Plural resolution
  if (params && typeof params.count === 'number') {
    const suffix = params.count === 1 ? '_one' : '_other';
    template = resolve(`${key}${suffix}`);
  }

  // Fallback to exact key
  if (template === undefined) {
    template = resolve(key);
  }

  if (template === undefined) {
    return key; // fallback to raw key
  }

  // Interpolation: replace every {{var}} with the matching param value
  if (params) {
    template = template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
      name in params ? String(params[name]) : `{{${name}}}`,
    );
  }

  return template;
}
