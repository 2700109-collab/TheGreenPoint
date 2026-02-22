import type { NctsIconProps } from './types';
import { getIconPx } from './types';

/** Official RSA coat of arms (24px optimized) — government masthead */
export function SaCoatOfArms({ size = 'md', ...props }: NctsIconProps) {
  const px = getIconPx(size);
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round"
         strokeLinejoin="round" {...props}>
      <path d="M12 2L6 6v4c0 5 3 9 6 11 3-2 6-6 6-11V6l-6-4z" />
      <path d="M12 8v4" />
      <path d="M10 10h4" />
      <path d="M9 14c1.5 1 4.5 1 6 0" />
      <path d="M4 18h16" />
      <path d="M7 18l-2 3h14l-2-3" />
    </svg>
  );
}
