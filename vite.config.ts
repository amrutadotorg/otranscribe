import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Exclude HTML from SW cache — SSO middleware must run
        navigateFallbackDenylist: [/^\//],
        runtimeCaching: [
          {
            // Matches per-language files, e.g. /locales/pl.ini
            urlPattern: /\.ini$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'l10n-cache',
            },
          },
          {
            // The language list at /locales/manifest.json doesn't end in
            // .ini, so it needs its own rule to land in the same cache.
            urlPattern: /\/locales\/manifest\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'l10n-cache',
            },
          },
          {
            urlPattern: /\.(png|jpg|gif|svg|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: 'Transcribe for Amruta.org',
        short_name: 'Transcribe',
        description: 'A free tool to make transcription easier',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2c6fad',
        icons: [
          { src: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/favicon-1024.png', sizes: '1024x1024', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Silence chunk size warning — TipTap is large but loaded once
    chunkSizeWarningLimit: 1000,
  },
  // Tell Vite these Node.js modules are never used in browser code
  // They come from indirect deps like source-map-js inside sanitize-html
  optimizeDeps: {
    exclude: ['source-map-js'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
});
