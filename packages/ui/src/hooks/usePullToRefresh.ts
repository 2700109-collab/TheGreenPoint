import { useRef, useState, useCallback, useEffect } from 'react';

const PULL_THRESHOLD = 60;

export interface PullToRefreshResult {
  /** True while the onRefresh callback is executing. */
  isRefreshing: boolean;
  /** Current pull distance in pixels (0 when not pulling). */
  pullDistance: number;
  /** Spread these props onto the scrollable container element. */
  bind: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

/**
 * Pull-to-refresh hook.
 * When the user pulls down more than 60 px and releases, `onRefresh` is invoked.
 *
 * @example
 * ```tsx
 * const { isRefreshing, pullDistance, bind } = usePullToRefresh({ onRefresh: fetchData });
 * return <div {...bind}>…</div>;
 * ```
 */
export function usePullToRefresh(opts: {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
}): PullToRefreshResult {
  const threshold = opts.threshold ?? PULL_THRESHOLD;
  const startY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Store mutable refs to avoid stale closures in touch handlers
  const pullDistanceRef = useRef(pullDistance);
  const isRefreshingRef = useRef(isRefreshing);
  const onRefreshRef = useRef(opts.onRefresh);

  // Keep refs in sync
  useEffect(() => { pullDistanceRef.current = pullDistance; }, [pullDistance]);
  useEffect(() => { isRefreshingRef.current = isRefreshing; }, [isRefreshing]);
  useEffect(() => { onRefreshRef.current = opts.onRefresh; }, [opts.onRefresh]);

  // Reset pull state when refreshing finishes
  useEffect(() => {
    if (!isRefreshing) {
      setPullDistance(0);
    }
  }, [isRefreshing]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only activate when the container is scrolled to the top
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop <= 0 && e.touches.length > 0) {
      startY.current = e.touches[0]!.clientY;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null || isRefreshingRef.current || e.touches.length === 0) return;
    const delta = e.touches[0]!.clientY - startY.current;
    if (delta > 0) {
      setPullDistance(delta);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (startY.current === null) return;
    if (pullDistanceRef.current >= threshold && !isRefreshingRef.current) {
      setIsRefreshing(true);
      const result = onRefreshRef.current();
      if (result && typeof (result as Promise<void>).then === 'function') {
        (result as Promise<void>).finally(() => setIsRefreshing(false));
      } else {
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
    startY.current = null;
  }, [threshold]);

  return {
    isRefreshing,
    pullDistance,
    bind: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
