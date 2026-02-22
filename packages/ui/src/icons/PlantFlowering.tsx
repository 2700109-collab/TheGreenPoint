import type { NctsIconProps } from './types';
import { getIconPx } from './types';

/** Plant with buds — flowering stage */
export function PlantFlowering({ size = 'md', ...props }: NctsIconProps) {
  const px = getIconPx(size);
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round"
         strokeLinejoin="round" {...props}>
      <path d="M12 22V8" />
      <path d="M12 14C12 14 7 12 5 8c4 1 7 3 7 6" />
      <path d="M12 14C12 14 17 12 19 8c-4 1-7 3-7 6" />
      <path d="M12 10C12 10 9 7 9 4c2 1 3 3 3 6" />
      <path d="M12 10C12 10 15 7 15 4c-2 1-3 3-3 6" />
      <circle cx="10" cy="6" r="1.5" />
      <circle cx="14" cy="7" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <path d="M7 22h10" />
    </svg>
  );
}
