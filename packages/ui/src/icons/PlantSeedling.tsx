import type { NctsIconProps } from './types';
import { getIconPx } from './types';

/** Small sprouting plant — seedling lifecycle stage */
export function PlantSeedling({ size = 'md', ...props }: NctsIconProps) {
  const px = getIconPx(size);
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round"
         strokeLinejoin="round" {...props}>
      <path d="M12 22V10" />
      <path d="M12 10C12 10 8 8 6 4c4 1 6 3 6 6" />
      <path d="M12 10C12 10 16 8 18 4c-4 1-6 3-6 6" />
      <path d="M8 22h8" />
    </svg>
  );
}
