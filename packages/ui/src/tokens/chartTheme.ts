/**
 * NCTS Chart Theme — color palette and font configuration
 * for @ant-design/charts (built on AntV G2).
 *
 * Usage in apps:
 *   import { G2 } from '@ant-design/charts';
 *   import { nctsChartTheme } from '@ncts/ui';
 *   G2.registerTheme('ncts', nctsChartTheme);
 */
export const nctsChartTheme = {
  defaultColor: '#1B3A5C',
  colors10: [
    '#1B3A5C', // Primary blue
    '#007A4D', // Secondary green
    '#FFB81C', // Accent gold
    '#DE3831', // Error red
    '#2196F3', // Info blue
    '#9C27B0', // Purple
    '#FF9800', // Orange
    '#795548', // Brown
    '#607D8B', // Grey-blue
    '#E91E63', // Pink
  ],
  colors20: [
    '#1B3A5C', '#007A4D', '#FFB81C', '#DE3831', '#2196F3',
    '#9C27B0', '#FF9800', '#795548', '#607D8B', '#E91E63',
    '#3F51B5', '#00BCD4', '#CDDC39', '#FF5722', '#009688',
    '#673AB7', '#FFC107', '#8BC34A', '#F44336', '#03A9F4',
  ],
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  /** Column/bar chart defaults */
  columnWidthRatio: 0.6,
  /** Axis label style */
  axisLabelFillColor: '#64748b',
  axisLabelFontSize: 12,
  /** Legend styles */
  legendItemNameFillColor: '#334155',
  legendItemNameFontSize: 13,

  /** Background */
  backgroundColor: '#FFFFFF',

  /** Grid & axis lines */
  gridLineColor: '#E8E8E8',
  axisLineColor: '#D9D9D9',

  /** Tooltip */
  tooltipBackground: '#1A1A1A',
  tooltipTextColor: '#FFFFFF',
  tooltipBorderRadius: 4,
};

/**
 * Register the NCTS chart theme with G2 v5 (used internally by @ant-design/charts v2).
 *
 * G2 v5 uses `register('theme.name', themeFunction)` and
 * `register('palette.name', paletteFunction)` instead of `registerTheme`.
 *
 * @example
 * ```ts
 * import { G2 } from '@ant-design/charts';
 * import { registerNctsChartTheme } from '@ncts/ui';
 *
 * registerNctsChartTheme(G2);
 *
 * // Then use in any chart component:
 * // <Line theme="ncts" ... />
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerNctsChartTheme(G2: { register: (...args: any[]) => void }) {
  // Register the NCTS categorical palettes
  G2.register('palette.nctsCategory10', () => ({
    type: 'cat' as const,
    colors: nctsChartTheme.colors10,
  }));
  G2.register('palette.nctsCategory20', () => ({
    type: 'cat' as const,
    colors: nctsChartTheme.colors20,
  }));

  // Register the full theme function (extends G2 classic theme defaults)
  G2.register('theme.ncts', () => ({
    color: nctsChartTheme.defaultColor,
    category10: 'nctsCategory10',
    category20: 'nctsCategory20',
  }));
}

/** Convenience palette for manually picking chart colors */
export const CHART_COLORS = nctsChartTheme.colors10;
