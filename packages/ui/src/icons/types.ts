/**
 * NCTS Custom Icons — Shared type for all SVG icon components.
 * Matches Lucide's 24×24 grid, 2px stroke, rounded caps per FrontEnd.md §0.9.
 */
import type { SVGProps } from 'react';
import { iconSizes, type IconSize } from '../tokens/iconSizes';

export interface NctsIconProps extends SVGProps<SVGSVGElement> {
  /** Icon size preset — sm (16), md (20), lg (24), xl (32) */
  size?: IconSize;
}

export function getIconPx(size: IconSize = 'md'): number {
  return iconSizes[size];
}
