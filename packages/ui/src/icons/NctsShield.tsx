import type { NctsIconProps } from './types';
import { getIconPx } from './types';

/** Shield with cannabis leaf + tracking lines — NCTS brand icon */
export function NctsShield({ size = 'md', ...props }: NctsIconProps) {
  const px = getIconPx(size);
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round"
         strokeLinejoin="round" {...props}>
      <path d="M12 2L4 6v5c0 5.5 3.4 10.3 8 12 4.6-1.7 8-6.5 8-12V6l-8-4z" />
      <path d="M12 8v5" />
      <path d="M12 11c0 0-2-1.5-3-3 2 .5 3 1.5 3 3" />
      <path d="M12 11c0 0 2-1.5 3-3-2 .5-3 1.5-3 3" />
      <path d="M8 16h8" />
      <path d="M9 18h6" />
    </svg>
  );
}
