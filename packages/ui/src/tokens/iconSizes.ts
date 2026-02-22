/**
 * NCTS Icon Size Tokens — per FrontEnd.md §0.9
 */

export const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export type IconSize = keyof typeof iconSizes;
