#!/usr/bin/env node
/**
 * Generate PWA icon PNGs from the SVG source.
 *
 * Prerequisites: npm install -g sharp-cli  OR  pnpm add -D sharp
 *
 * Usage:
 *   node scripts/generate-icons.mjs
 *
 * This reads apps/portal/public/icons/icon.svg and outputs PNGs at
 * all sizes referenced in the manifest.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ICONS_DIR = join(ROOT, 'apps', 'portal', 'public', 'icons');
const SVG_PATH = join(ICONS_DIR, 'icon.svg');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error(
      'Error: sharp is required to generate PNG icons.\n' +
      'Install it with: pnpm add -D sharp\n' +
      'Then re-run this script.'
    );
    process.exit(1);
  }

  const svgBuffer = readFileSync(SVG_PATH);
  mkdirSync(ICONS_DIR, { recursive: true });

  for (const size of SIZES) {
    const outputPath = join(ICONS_DIR, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  ✓ ${size}x${size} → ${outputPath}`);
  }

  console.log(`\nDone! ${SIZES.length} icons generated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
