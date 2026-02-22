import { useEffect } from 'react';

/**
 * Set the document title with NCTS suffix.
 * @example useDocumentTitle('Plant Management') → "Plant Management — NCTS"
 */
export function useDocumentTitle(title: string, suffix = 'NCTS'): void {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — ${suffix}` : suffix;
    return () => {
      document.title = prev;
    };
  }, [title, suffix]);
}
