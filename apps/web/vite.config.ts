import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ isSsrBuild }) => ({
  root: appRoot,
  appType: 'custom',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  ssr: {
    noExternal: ['@sadat-real-estate/contracts']
  },
  build: {
    outDir: path.resolve(appRoot, isSsrBuild ? 'dist/server' : 'dist/client'),
    emptyOutDir: true,
    manifest: !isSsrBuild,
    sourcemap: true
  }
}));
