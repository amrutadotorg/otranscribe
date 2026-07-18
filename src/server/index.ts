/**
 * index.ts — Express server entry point
 *
 * Serves the Vite-built SPA with SSO middleware and Vimeo proxy.
 */

import express from 'express';
import path from 'node:path';
import { ssoMiddleware } from './sso.js';
import { vimeoDownloadHandler } from './vimeoProxy.js';
import { transliterateHandler } from './transliterateProxy.js';

// Load .env if present. Unlike dotenv/config, loadEnvFile throws when the
// file doesn't exist — that's fine in environments where env vars are
// injected directly by the container/host instead of a .env file.
try {
  process.loadEnvFile();
} catch {
  // No .env file — assume env vars are already set in the environment.
}

const __dirname = import.meta.dirname;

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// SSO middleware — applied to all routes
app.use(ssoMiddleware);

// Vimeo download proxy
app.get('/api/vimeo/download', vimeoDownloadHandler);

// Transliteration proxy (phonetic input)
app.get('/api/transliterate', transliterateHandler);

const distDir = path.join(__dirname, '../dist');

// 1. Hashed assets — serve with long-lived immutable cache
app.use(
  '/assets',
  express.static(path.join(distDir, 'assets'), {
    maxAge: '1y',
    immutable: true,
  }),
);

// 2. Locale files (no hash in name, must always be fresh)
app.use(
  '/locales',
  express.static(path.join(distDir, 'locales'), {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-cache');
    },
  }),
);

// 3. All other static files (HTML, SW, webmanifest, favicons, icons)
app.use(
  express.static(distDir, {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-cache');
    },
  }),
);

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('/{*splat}', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Transcribe for Amruta.org server running on port ${PORT}`);
});
