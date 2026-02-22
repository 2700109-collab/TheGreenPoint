/**
 * NCTS Design Tokens — CSS Custom Properties
 *
 * Generates a `:root` CSS string from all token objects so tokens
 * can be consumed outside of React / TypeScript (e.g. in plain CSS,
 * Storybook decorators, or third-party widgets).
 *
 * Usage:
 *   import { cssTokens } from '@ncts/ui/tokens/cssProperties';
 *   // inject via <style>{cssTokens}</style> or a CSSStyleSheet
 *
 * RC13 — FrontEnd.md §0 compliance.
 */

import { primary, secondary, accent, semantic, neutral, surface, text } from './colors';
import { fontFamily, typeScale } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';
import { duration, easing } from './motion';
import { breakpoints } from './breakpoints';
import { zIndex } from './zIndex';
import { iconSizes } from './iconSizes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a flat key-value map into CSS custom property lines */
function mapToCss(prefix: string, obj: Record<string, string | number>): string[] {
  return Object.entries(obj).map(
    ([key, value]) => {
      const unit = typeof value === 'number' && !String(key).includes('Weight') && !String(key).includes('Height') && !String(key).includes('index')
        ? 'px'
        : '';
      return `  --ncts-${prefix}-${key}: ${value}${unit};`;
    },
  );
}

/** Convert a nested semantic-like map */
function nestedToCss(prefix: string, obj: Record<string, Record<string, string | number>>): string[] {
  const lines: string[] = [];
  for (const [groupKey, group] of Object.entries(obj)) {
    for (const [prop, value] of Object.entries(group)) {
      lines.push(`  --ncts-${prefix}-${groupKey}-${prop}: ${value};`);
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Build CSS string
// ---------------------------------------------------------------------------

const colorLines = [
  '  /* ---- Colors: Primary ---- */',
  ...mapToCss('color-primary', primary as unknown as Record<string, string>),
  '',
  '  /* ---- Colors: Secondary ---- */',
  ...mapToCss('color-secondary', secondary as unknown as Record<string, string>),
  '',
  '  /* ---- Colors: Accent ---- */',
  ...mapToCss('color-accent', accent as unknown as Record<string, string>),
  '',
  '  /* ---- Colors: Semantic ---- */',
  ...nestedToCss('color-semantic', semantic as unknown as Record<string, Record<string, string>>),
  '',
  '  /* ---- Colors: Neutral ---- */',
  ...mapToCss('color-neutral', neutral as unknown as Record<string, string>),
  '',
  '  /* ---- Colors: Surface ---- */',
  ...mapToCss('color-surface', surface as unknown as Record<string, string>),
  '',
  '  /* ---- Colors: Text ---- */',
  ...mapToCss('color-text', text as unknown as Record<string, string>),
];

const typographyLines = [
  '  /* ---- Typography: Families ---- */',
  `  --ncts-font-body: ${fontFamily.body};`,
  `  --ncts-font-mono: ${fontFamily.mono};`,
  '',
  '  /* ---- Typography: Type Scale ---- */',
  ...Object.entries(typeScale).flatMap(([name, style]) => [
    `  --ncts-type-${name}-size: ${style.fontSize}px;`,
    `  --ncts-type-${name}-weight: ${style.fontWeight};`,
    `  --ncts-type-${name}-leading: ${style.lineHeight};`,
    `  --ncts-type-${name}-tracking: ${style.letterSpacing};`,
  ]),
];

const spacingLines = [
  '  /* ---- Spacing ---- */',
  ...Object.entries(spacing).map(([key, val]) => `  --ncts-spacing-${key}: ${val}px;`),
];

const radiusLines = [
  '  /* ---- Border Radius ---- */',
  ...Object.entries(radius).map(([key, val]) =>
    `  --ncts-radius-${key}: ${val === 9999 ? '9999px' : `${val}px`};`,
  ),
];

const shadowLines = [
  '  /* ---- Shadows ---- */',
  ...Object.entries(shadows).map(([key, val]) => `  --ncts-shadow-${key}: ${val};`),
];

const motionLines = [
  '  /* ---- Motion ---- */',
  ...Object.entries(duration).map(([key, val]) => `  --ncts-duration-${key}: ${val}ms;`),
  ...Object.entries(easing).map(([key, val]) => `  --ncts-easing-${key}: ${val};`),
];

const breakpointLines = [
  '  /* ---- Breakpoints ---- */',
  ...Object.entries(breakpoints).map(([key, val]) => `  --ncts-breakpoint-${key}: ${val}px;`),
];

const zIndexLines = [
  '  /* ---- Z-Index ---- */',
  ...Object.entries(zIndex).map(([key, val]) => `  --ncts-z-${key}: ${val};`),
];

const iconLines = [
  '  /* ---- Icon Sizes ---- */',
  ...Object.entries(iconSizes).map(([key, val]) => `  --ncts-icon-${key}: ${val}px;`),
];

/** Complete `:root` CSS block with all NCTS tokens as custom properties */
export const cssTokens = [
  ':root {',
  ...colorLines,
  '',
  ...typographyLines,
  '',
  ...spacingLines,
  '',
  ...radiusLines,
  '',
  ...shadowLines,
  '',
  ...motionLines,
  '',
  ...breakpointLines,
  '',
  ...zIndexLines,
  '',
  ...iconLines,
  '}',
].join('\n');
