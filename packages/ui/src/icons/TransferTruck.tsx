import type { NctsIconProps } from './types';
import { getIconPx } from './types';

/** Cargo truck with cannabis leaf on side — transfer tracking */
export function TransferTruck({ size = 'md', ...props }: NctsIconProps) {
  const px = getIconPx(size);
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round"
         strokeLinejoin="round" {...props}>
      <rect x="1" y="6" width="14" height="10" rx="1" />
      <path d="M15 10h4l3 4v2h-7V10z" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M7 10c0 0 1-2 1-2s1 2 1 2" />
      <path d="M8 10v-1" />
    </svg>
  );
}
