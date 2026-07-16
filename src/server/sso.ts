/**
 * sso.ts — SSO middleware
 *
 * Verifies the `amruta_sso` cookie (HMAC-SHA256).
 * Token format: `username|expires|sig` (URL-encoded)
 *
 * See PLAN.md section 1.3
 */

import type { Request, Response, NextFunction } from 'express';

const COOKIE_NAME = 'amruta_sso';
const LOGIN_URL =
  'https://www.amruta.org/wp-login.php?redirect_to=https://transcribe.amruta.org/';

/** Paths that bypass SSO (PWA assets, favicons) */
const PUBLIC_PATHS = new Set([
  '/manifest.json',
  '/manifest.webmanifest',
  '/service-worker.js',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon.png',
  '/favicon-192.png',
  '/favicon-1024.png',
  '/transcribe-screenshot-1024.jpg',
  '/transcribe-screenshot-org-3600.jpg',
]);

/**
 * Per-language locale files (public/locales/{code}.ini) and the language
 * manifest live under this prefix. There's one file per language rather
 * than a single combined data.ini, so we allow the whole directory
 * instead of listing every language code here individually.
 */
const PUBLIC_PATH_PREFIXES = ['/locales/'];

function hexToBytes(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

async function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    return await crypto.subtle.verify(
      'HMAC',
      key,
      hexToBytes(signature),
      new TextEncoder().encode(payload),
    );
  } catch {
    return false;
  }
}

export async function ssoMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Bypass SSO in development mode (as per PLAN.md R9)
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.SKIP_SSO === 'true'
  ) {
    next();
    return;
  }

  if (
    PUBLIC_PATHS.has(req.path) ||
    PUBLIC_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix))
  ) {
    next();
    return;
  }

  const handleUnauthorized = () => {
    if (req.path.startsWith('/api/')) {
      res.status(401).json({ error: 'Unauthorized', loginUrl: LOGIN_URL });
    } else {
      res.redirect(LOGIN_URL);
    }
  };

  const cookieHeader = req.headers.cookie ?? '';
  const match = cookieHeader.match(
    new RegExp(`(^|;\\s*)${COOKIE_NAME}=([^;]+)`),
  );
  const ssoCookie = match ? match[2] : null;

  if (!ssoCookie) {
    return handleUnauthorized();
  }

  const parts = decodeURIComponent(ssoCookie).split('|');
  if (parts.length !== 3) {
    return handleUnauthorized();
  }

  const [username, expiresStr, signature] = parts;
  if (!username || !expiresStr || !signature) {
    return handleUnauthorized();
  }

  const expires = parseInt(expiresStr, 10);
  if (isNaN(expires) || expires <= Math.floor(Date.now() / 1000)) {
    return handleUnauthorized();
  }

  const secret = process.env.SSO_SALT;
  if (!secret) {
    console.error('SSO_SALT environment variable is not set');
    return handleUnauthorized();
  }

  const payload = `${username}|${expires}`;
  const valid = await verifySignature(payload, signature, secret);

  if (!valid) {
    return handleUnauthorized();
  }

  next();
}
