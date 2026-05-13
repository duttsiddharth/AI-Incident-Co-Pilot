/**
 * vite.config.ts
 *
 * WHY VITE:
 * - CRA/CRACO cold build: ~45s. Vite: ~3s.
 * - Native ESM in dev — no bundle overhead during development.
 * - Path aliases (@/) work out of the box without ejecting.
 * - GitHub Pages deployment: set base to repo name for GH Pages,
 *   leave as '/' for Render. Controlled via VITE_ROUTER_BASENAME.
 *
 * RENDER COMPATIBILITY:
 * - `build.outDir: 'build'` preserves Render's existing static serve config.
 * - No server-side rendering — pure SPA, same as CRA output.
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    resolve: {
      alias: {
        // '@/components/...' instead of '../../components/...'
        '@': path.resolve(__dirname, './src'),
      },
    },

    build: {
      outDir: 'build',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          // Separate vendor chunks — recharts, radix, etc. cached separately
          manualChunks: {
            vendor:   ['react', 'react-dom', 'react-router-dom'],
            charts:   ['recharts'],
            radix:    Object.keys(require('./package.json').dependencies)
                        .filter((k) => k.startsWith('@radix-ui')),
            pdf:      ['jspdf'],
          },
        },
      },
    },

    server: {
      port: 3000,
      proxy: {
        // Dev proxy to FastAPI — avoids CORS in local dev
        '/api': {
          target: env.VITE_BACKEND_URL ?? 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },

    // GitHub Pages base path
    base: env.VITE_BASE_PATH ?? '/',
  };
});
