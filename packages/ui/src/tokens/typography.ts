/**
 * NCTS Design Tokens — Typography
 *
 * Font families and a type-scale covering headings, body, captions, and mono.
 * All values match FrontEnd.md §0.2 specification exactly.
 */

// ---------------------------------------------------------------------------
// Font families — exact fallback stacks per spec
// ---------------------------------------------------------------------------
export const fontFamily = {
  body: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
} as const;

// ---------------------------------------------------------------------------
// Type scale — values from FrontEnd.md §0.2 table
// ---------------------------------------------------------------------------
interface TypeStyle {
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly lineHeight: number;
  readonly letterSpacing: string;
}

export const typeScale = {
  'heading-1': { fontSize: 32, fontWeight: 700, lineHeight: 1.25,  letterSpacing: '-0.02em' },
  'heading-2': { fontSize: 24, fontWeight: 600, lineHeight: 1.33,  letterSpacing: '-0.01em' },
  'heading-3': { fontSize: 20, fontWeight: 600, lineHeight: 1.4,   letterSpacing: '0' },
  'heading-4': { fontSize: 16, fontWeight: 600, lineHeight: 1.5,   letterSpacing: '0' },
  'heading-5': { fontSize: 14, fontWeight: 600, lineHeight: 1.57,  letterSpacing: '0.01em' },
  'body-lg':   { fontSize: 16, fontWeight: 400, lineHeight: 1.5,   letterSpacing: '0' },
  'body':      { fontSize: 14, fontWeight: 400, lineHeight: 1.57,  letterSpacing: '0' },
  'body-sm':   { fontSize: 12, fontWeight: 400, lineHeight: 1.67,  letterSpacing: '0.01em' },
  'caption':   { fontSize: 12, fontWeight: 500, lineHeight: 1.33,  letterSpacing: '0.02em' },
  'overline':  { fontSize: 11, fontWeight: 600, lineHeight: 1.45,  letterSpacing: '0.08em' },
  'mono-lg':   { fontSize: 16, fontWeight: 500, lineHeight: 1.5,   letterSpacing: '0.02em' },
  'mono':      { fontSize: 14, fontWeight: 400, lineHeight: 1.57,  letterSpacing: '0.02em' },
  'mono-sm':   { fontSize: 12, fontWeight: 400, lineHeight: 1.5,   letterSpacing: '0.02em' },
} as const satisfies Record<string, TypeStyle>;
