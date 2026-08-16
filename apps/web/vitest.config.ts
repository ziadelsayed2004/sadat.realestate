import { fileURLToPath } from 'node:url';
import path from 'node:path';
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
    environment: 'jsdom',
    setupFiles: ['./src/features/testing/setup.ts'],
    include: ['./tests/**/*.vitest.test.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
    reporters: ['default']
  }
});
