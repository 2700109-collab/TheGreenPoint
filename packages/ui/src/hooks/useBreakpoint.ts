import { useState, useEffect, useMemo } from 'react';

const BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

const ORDERED: Breakpoint[] = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'];

interface BreakpointResult {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Returns the current active breakpoint and boolean helpers.
 * Uses matchMedia for efficient, resize-event-free detection.
 */
export function useBreakpoint(): BreakpointResult {
  const queries = useMemo(() => {
    return ORDERED.map((key) => ({
      key,
      mql: window.matchMedia(`(min-width: ${BREAKPOINTS[key]}px)`),
    }));
  }, []);

  const getCurrent = (): Breakpoint => {
    for (const { key, mql } of queries) {
      if (mql.matches) return key;
    }
    return 'xs';
  };

  const [breakpoint, setBreakpoint] = useState<Breakpoint>(getCurrent);

  useEffect(() => {
    const handler = () => {
      setBreakpoint(getCurrent());
    };

    for (const { mql } of queries) {
      mql.addEventListener('change', handler);
    }

    // Sync on mount in case SSR value differs
    handler();

    return () => {
      for (const { mql } of queries) {
        mql.removeEventListener('change', handler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries]);

  return {
    breakpoint,
    isMobile: BREAKPOINTS[breakpoint] < BREAKPOINTS.md,
    isTablet: BREAKPOINTS[breakpoint] >= BREAKPOINTS.md && BREAKPOINTS[breakpoint] < BREAKPOINTS.lg,
    isDesktop: BREAKPOINTS[breakpoint] >= BREAKPOINTS.lg,
  };
}
