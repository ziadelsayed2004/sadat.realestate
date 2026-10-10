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
            if (normalizedId.includes('/src/features/localization/copy-catalog') || normalizedId.includes('/src/features/localization/messages/')) return 'locale-copy';
            if (normalizedId.includes('/src/features/admin_user_guide')) return 'feature-user-guide';
            if (normalizedId.includes('/src/features/admin/audit-presentation') || normalizedId.includes('/src/features/admin/notifications-audit-copy') || normalizedId.includes('/src/features/admin/audit-changes') || normalizedId.includes('/src/features/admin_rbac/permission-label')) return 'feature-admin-audit-copy';
            if (normalizedId.includes('/src/features/admin_settings/copy') || normalizedId.includes('/src/features/admin_settings/help')) return 'feature-admin-settings-copy';
            if (normalizedId.includes('/src/features/admin_properties/video') || normalizedId.includes('/src/features/admin_properties/photo')) return 'feature-admin-property-media';
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
