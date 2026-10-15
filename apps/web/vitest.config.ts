import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { availableParallelism } from 'node:os';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const appRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: appRoot,
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  ssr: {
    noExternal: ['@sadat-real-estate/contracts']
  },
  test: {
    // Bound jsdom workers on high-core developer machines to avoid CPU/memory
    // contention exhausting individual test deadlines during the full suite.
    maxWorkers: Math.min(4, availableParallelism()),
    environment: 'jsdom',
    setupFiles: ['./src/features/testing/setup.ts'],
    include: ['./tests/**/*.vitest.test.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
    reporters: ['default']
  }
});
