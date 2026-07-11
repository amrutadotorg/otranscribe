/**
 * index.ts — Express server entry point
 *
 * Serves the Vite-built SPA with SSO middleware and Vimeo proxy.
 * See PLAN.md sections 1.3, 2.7
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ssoMiddleware } from './sso.js';
import { vimeoDownloadHandler } from './vimeoProxy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// SSO middleware — applied to all routes
app.use(ssoMiddleware);

// Vimeo download proxy
app.get('/api/vimeo/download', vimeoDownloadHandler);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`oTranscribe server running on port ${PORT}`);
});
