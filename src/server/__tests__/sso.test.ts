/**
 * sso.test.ts — Unit tests for SSO middleware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ssoMiddleware } from '../sso';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

// Polyfill web crypto since Vitest environment might not have it exposed the same way
if (!globalThis.crypto) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.crypto = crypto.webcrypto as any;
}

function mockReq(path: string, cookieHeader?: string): Request {
  return {
    path,
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  } as unknown as Request;
}

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    redirect: vi.fn(),
  } as unknown as Response;
}

async function createValidCookie(
  username: string,
  expires: number,
  secret: string,
) {
  const payload = `${username}|${expires}`;
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuffer = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  );
  const sigHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `amruta_sso=${encodeURIComponent(`${username}|${expires}|${sigHex}`)}`;
}

describe('ssoMiddleware', () => {
  const FAKE_SECRET = 'test-secret';
  let next: NextFunction;

  beforeEach(() => {
    process.env.SSO_SALT = FAKE_SECRET;
    process.env.NODE_ENV = 'production';
    next = vi.fn();
  });

  afterEach(() => {
    delete process.env.SSO_SALT;
    process.env.NODE_ENV = 'test';
    vi.restoreAllMocks();
  });

  it('bypasses SSO in development', async () => {
    process.env.NODE_ENV = 'development';
    const req = mockReq('/api/secure');
    const res = mockRes();
    await ssoMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('bypasses public paths', async () => {
    const req = mockReq('/manifest.json');
    const res = mockRes();
    await ssoMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('bypasses locale prefixes', async () => {
    const req = mockReq('/locales/en-US.ini');
    const res = mockRes();
    await ssoMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('redirects to login when no cookie is present (HTML)', async () => {
    const req = mockReq('/');
    const res = mockRes();
    await ssoMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining('wp-login.php'),
    );
  });

  it('returns 401 when no cookie is present (API)', async () => {
    const req = mockReq('/api/vimeo/download');
    const res = mockRes();
    await ssoMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Unauthorized' }),
    );
  });

  it('rejects invalid signature', async () => {
    const cookie = `amruta_sso=${encodeURIComponent('user|9999999999|bad-signature')}`;
    const req = mockReq('/', cookie);
    const res = mockRes();
    await ssoMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalled();
  });

  it('rejects expired cookie', async () => {
    const expires = Math.floor(Date.now() / 1000) - 100; // 100 seconds ago
    const cookie = await createValidCookie('user', expires, FAKE_SECRET);
    const req = mockReq('/', cookie);
    const res = mockRes();
    await ssoMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalled();
  });

  it('allows valid cookie', async () => {
    const expires = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const cookie = await createValidCookie('user', expires, FAKE_SECRET);
    const req = mockReq('/', cookie);
    const res = mockRes();
    await ssoMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('returns 401 if SSO_SALT is missing', async () => {
    delete process.env.SSO_SALT;
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const cookie = await createValidCookie('user', expires, FAKE_SECRET);
    const req = mockReq('/api/data', cookie);
    const res = mockRes();

    // Silence console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await ssoMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);

    consoleSpy.mockRestore();
  });
});
