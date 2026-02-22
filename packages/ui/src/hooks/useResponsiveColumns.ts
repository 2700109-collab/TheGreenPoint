import { useMemo } from 'react';
import type { ColumnType } from 'antd/es/table';
import { useBreakpoint } from './useBreakpoint';

/** A column with an optional responsive priority (lower = higher priority / always shown). */
export interface ResponsiveColumnDef<T> extends ColumnType<T> {
  /**
   * Numeric priority controlling visibility at smaller breakpoints.
   * Lower numbers are shown first. Columns without a priority are always visible.
   */
  responsivePriority?: number;
}

// Maximum priority thresholds per breakpoint tier.
const PRIORITY_LIMITS: Record<string, number> = {
  xs: 1,
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
  xxl: Infinity,
};

/**
 * Filters a ProTable / antd Table column array based on the current breakpoint.
 * Lower-priority columns (higher `responsivePriority` number) are hidden first on
 * smaller screens.
 *
 * @param columns The full column definitions with optional `responsivePriority`.
 * @returns Filtered columns appropriate for the current viewport.
 */
export function useResponsiveColumns<T>(
  columns: ResponsiveColumnDef<T>[],
): ColumnType<T>[] {
  const { breakpoint } = useBreakpoint();

  return useMemo(() => {
    const maxPriority = PRIORITY_LIMITS[breakpoint] ?? Infinity;
    return columns.filter((col) => {
      if (col.responsivePriority == null) return true;
      return col.responsivePriority <= maxPriority;
    });
  }, [columns, breakpoint]);
}
