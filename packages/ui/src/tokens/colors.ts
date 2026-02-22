/**
 * NCTS Design Tokens — Color Palette
 *
 * Full color palette with primary/secondary/accent shades,
 * semantic colors, neutrals, surface colors, and text colors.
 */

// ---------------------------------------------------------------------------
// Primary — Deep Blue (#1B3A5C)
// ---------------------------------------------------------------------------
export const primary = {
  50: '#E8EDF3',
  100: '#C5D2E1',
  200: '#9FB3CC',
  300: '#7994B6',
  400: '#5C7DA5',
  500: '#1B3A5C',
  600: '#173253',
  700: '#122847',
  800: '#0E1E38',
  900: '#091428',
} as const;

// ---------------------------------------------------------------------------
// Secondary — SA Green (#007A4D)
// ---------------------------------------------------------------------------
export const secondary = {
  50: '#E6F5EF',
  100: '#B3E2D0',
  200: '#80CEAF',
  300: '#4DBA8E',
  400: '#26AB77',
  500: '#007A4D',
  600: '#006E45',
  700: '#005E3B',
  800: '#004E31',
  900: '#003822',
} as const;

// ---------------------------------------------------------------------------
// Accent — Gold (#FFB81C)
// ---------------------------------------------------------------------------
export const accent = {
  50: '#FFF8E6',
  100: '#FFECB3',
  200: '#FFE080',
  300: '#FFD44D',
  400: '#FFCC33',
  500: '#FFB81C',
  600: '#E6A619',
  700: '#996E00',
  800: '#7A5800',
  900: '#5C4200',
} as const;

// ---------------------------------------------------------------------------
// Semantic — Contextual feedback colors
// ---------------------------------------------------------------------------
export const semantic = {
  success: { bg: '#F6FFED', border: '#B7EB8F', text: '#389E0D' },
  warning: { bg: '#FFFBE6', border: '#FFE58F', text: '#996E00' },
  error:   { bg: '#FFF2F0', border: '#FFCCC7', text: '#CF1322' },
  info:    { bg: '#E6F4FF', border: '#91CAFF', text: '#0958D9' },
} as const;

// ---------------------------------------------------------------------------
// Neutrals — Gray scale
// ---------------------------------------------------------------------------
export const neutral = {
  50: '#FAFAFA',
  100: '#F5F5F5',
  200: '#E8E8E8',
  300: '#D9D9D9',
  400: '#BFBFBF',
  500: '#8C8C8C',
  600: '#595959',
  700: '#434343',
  800: '#262626',
  900: '#141414',
} as const;

// ---------------------------------------------------------------------------
// Surface — Background / container colors
// ---------------------------------------------------------------------------
export const surface = {
  background: '#FAFAFA',
  card: '#FFFFFF',
  elevated: '#FFFFFF',
  sidebar: '#001529',
  masthead: '#1B3A5C',
} as const;

// ---------------------------------------------------------------------------
// Text — Foreground / typography colors
// ---------------------------------------------------------------------------
export const text = {
  primary: '#262626',
  secondary: '#595959',
  tertiary: '#8C8C8C',
  disabled: '#BFBFBF',
  inverse: '#FFFFFF',
  link: '#0958D9',
  linkHover: '#003EB3',
} as const;
