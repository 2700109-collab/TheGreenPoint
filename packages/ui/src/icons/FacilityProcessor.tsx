import type { NctsIconProps } from './types';
import { getIconPx } from './types';

/** Factory building with gear — processing facility */
export function FacilityProcessor({ size = 'md', ...props }: NctsIconProps) {
  const px = getIconPx(size);
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round"
         strokeLinejoin="round" {...props}>
      <path d="M2 20V8l5-3v5l5-3v5l5-3v8" />
      <path d="M2 20h20" />
      <rect x="17" y="10" width="5" height="10" />
      <circle cx="19.5" cy="7" r="2.5" />
      <path d="M19.5 4.5v-1M19.5 10.5v-1M17 7h-1M23 7h-1" />
    </svg>
  );
}
