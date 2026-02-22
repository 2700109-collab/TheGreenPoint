import type { NctsIconProps } from './types';
import { getIconPx } from './types';

/** Tied plant material bundle — harvest stage */
export function HarvestBundle({ size = 'md', ...props }: NctsIconProps) {
  const px = getIconPx(size);
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round"
         strokeLinejoin="round" {...props}>
      <path d="M8 4c0 0 2 3 4 3s4-3 4-3" />
      <path d="M7 8h10" />
      <rect x="8" y="8" width="8" height="12" rx="1" />
      <path d="M8 12h8" />
      <path d="M8 16h8" />
      <path d="M10 20h4v2h-4z" />
    </svg>
  );
}
