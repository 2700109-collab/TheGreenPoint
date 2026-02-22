import type { NctsIconProps } from './types';
import { getIconPx } from './types';

/** Stylized 5-point cannabis leaf — logo and plant type indicators */
export function CannabisLeaf({ size = 'md', ...props }: NctsIconProps) {
  const px = getIconPx(size);
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round"
         strokeLinejoin="round" {...props}>
      <path d="M12 22V12" />
      <path d="M12 12C12 12 7 10 4 6c3 0 5.5 1 8 6" />
      <path d="M12 12C12 12 17 10 20 6c-3 0-5.5 1-8 6" />
      <path d="M12 12C12 12 9 7 12 2c3 5 0 10 0 10" />
      <path d="M12 12C12 12 6.5 8 3 10c2 2 5 2.5 9 2" />
      <path d="M12 12C12 12 17.5 8 21 10c-2 2-5 2.5-9 2" />
    </svg>
  );
}
