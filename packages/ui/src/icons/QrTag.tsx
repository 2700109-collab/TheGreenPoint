import type { NctsIconProps } from './types';
import { getIconPx } from './types';

/** Luggage-tag-style QR code label — QR tracking tags */
export function QrTag({ size = 'md', ...props }: NctsIconProps) {
  const px = getIconPx(size);
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round"
         strokeLinejoin="round" {...props}>
      <rect x="4" y="4" width="16" height="18" rx="2" />
      <path d="M12 2v4" />
      <rect x="7" y="8" width="4" height="4" />
      <rect x="13" y="8" width="4" height="4" />
      <rect x="7" y="14" width="4" height="4" />
      <path d="M13 14h4v2h-2v2h-2v-4z" />
    </svg>
  );
}
