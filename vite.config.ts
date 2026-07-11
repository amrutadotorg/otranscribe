import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Exclude HTML from SW cache — SSO middleware must run (PLAN.md R4)
        navigateFallbackDenylist: [/^\//],
        runtimeCaching: [
          {
            urlPattern: /\.ini$/,
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
        name: 'oTranscribe',
        short_name: 'oTranscribe',
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
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
})
