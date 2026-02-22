/**
 * NCTS Design Tokens — Motion / Animation
 * Values from FrontEnd.md §0.6
 */

/** Durations in milliseconds */
export const duration = {
  fast:   150,
  normal: 250,
  slow:   400,
} as const;

/** Easing curves — per spec §0.6 */
export const easing = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  enter:   'cubic-bezier(0, 0, 0.2, 1)',
  exit:    'cubic-bezier(0.4, 0, 1, 1)',
} as const;

/** CSS media-query string for reduced-motion preference */
export const reducedMotion = '@media (prefers-reduced-motion: reduce)' as const;
