import { useEffect } from 'react';

/**
 * Announce route changes to screen readers via a live region.
 * Call this from each app's layout, passing the current pathname.
 *
 * Requires a hidden div with id="route-announcer" in the DOM:
 * <div id="route-announcer" role="status" aria-live="assertive" aria-atomic="true" className="sr-only" />
 */
export function useRouteAnnouncement(pathname: string) {
  useEffect(() => {
    const pageTitle = document.title;
    const announcer = document.getElementById('route-announcer');
    if (announcer) {
      announcer.textContent = '';
      // Brief delay for screen reader to detect the change
      requestAnimationFrame(() => {
        announcer.textContent = `Navigated to ${pageTitle}`;
      });
    }
  }, [pathname]);
}
