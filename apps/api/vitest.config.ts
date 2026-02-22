import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    root: resolve(__dirname),
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.module.ts',
        'src/main.ts',
        'src/**/index.ts',
        'src/**/*.dto.ts',
      ],
    },
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@ncts/database': resolve(__dirname, '../../packages/database/src'),
      '@ncts/shared-types': resolve(__dirname, '../../packages/shared-types/src'),
      '@ncts/audit-lib': resolve(__dirname, '../../packages/audit-lib/src'),
      '@test': resolve(__dirname, 'test'),
    },
  },
});
