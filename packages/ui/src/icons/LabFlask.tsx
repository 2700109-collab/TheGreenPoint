import type { NctsIconProps } from './types';
import { getIconPx } from './types';

/** Erlenmeyer flask with liquid level indicator — lab testing */
export function LabFlask({ size = 'md', ...props }: NctsIconProps) {
  const px = getIconPx(size);
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round"
         strokeLinejoin="round" {...props}>
      <path d="M9 3h6" />
      <path d="M10 3v7.4L5 19a1 1 0 0 0 .85 1.5h12.3A1 1 0 0 0 19 19l-5-8.6V3" />
      <path d="M7 16h10" />
    </svg>
  );
}
