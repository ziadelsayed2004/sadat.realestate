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
    sourcemap: true,
    ...(isSsrBuild ? {} : {
      chunkSizeWarningLimit: 650,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            const normalizedId = id.replaceAll('\\\\', '/');
            if (normalizedId.includes('/node_modules/react/') || normalizedId.includes('/node_modules/react-dom/')) return 'vendor-react';
            if (normalizedId.includes('/node_modules/zod/')) return 'vendor-validation';
            if (normalizedId.includes('/src/features/admin')) return 'feature-admin';
            if (normalizedId.includes('/src/features/admin_')) return 'feature-admin-operations';
            if (normalizedId.includes('/src/features/provider_property')) return 'feature-provider-property';
            if (normalizedId.includes('/src/features/provider')) return 'feature-provider';
            if (normalizedId.includes('/src/features/seeker')) return 'feature-seeker';
            if (normalizedId.includes('/src/features/public') || normalizedId.includes('/src/features/content') || normalizedId.includes('/src/features/community')) return 'feature-public';
            return undefined;
          }
        }
      }
    })
  }
}));
