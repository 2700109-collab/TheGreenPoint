import type { NctsIconProps } from './types';
import { getIconPx } from './types';

/** Greenhouse outline with cannabis leaf — cultivation facility */
export function FacilityFarm({ size = 'md', ...props }: NctsIconProps) {
  const px = getIconPx(size);
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round"
         strokeLinejoin="round" {...props}>
      <path d="M3 21V10l9-7 9 7v11" />
      <path d="M3 21h18" />
      <path d="M9 21v-6h6v6" />
      <path d="M12 10c0 0-1 2-1 2s1 2 1 2" />
      <path d="M12 10c0 0 1 2 1 2s-1 2-1 2" />
      <path d="M12 10v-1" />
    </svg>
  );
}
