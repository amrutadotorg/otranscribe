/**
 * transliterateProxy.test.ts — Unit tests for transliterate proxy
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transliterateHandler } from '../transliterateProxy';
import type { Request, Response } from 'express';

function mockReq(
  query: Record<string, string> = {},
  ip: string = '127.0.0.1',
): Request {
  return { query, ip } as unknown as Request;
}

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function mockFetchSequence(...responses: unknown[]) {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const resp = responses[callIndex]
      ? responses[callIndex++]
      : responses[responses.length - 1];
    return Promise.resolve(resp);
  });
}

describe('transliterateHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns 400 for missing text', async () => {
    const res = mockRes();
    await transliterateHandler(mockReq({ lang: 'sa-t-i0-und' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'invalid_text' });
  });

  it('returns 400 for text exceeding MAX_TEXT_LENGTH', async () => {
    const res = mockRes();
    await transliterateHandler(
      mockReq({ text: 'a'.repeat(65), lang: 'sa-t-i0-und' }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'invalid_text' });
  });

  it('returns 400 for unsupported language code', async () => {
    const res = mockRes();
    await transliterateHandler(
      mockReq({ text: 'test', lang: 'xx-invalid' }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'unsupported_lang' });
  });

  it('proxies request to Google Input Tools and caches result', async () => {
    const fakeData = ['SUCCESS', [['test', ['test1', 'test2']]]];
    globalThis.fetch = mockFetchSequence({
      ok: true,
      json: async () => fakeData,
    });

    const res = mockRes();
    await transliterateHandler(
      mockReq({ text: 'test_new', lang: 'sa-t-i0-und', num: '2' }),
      res,
    );

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ candidates: ['test1', 'test2'] });

    // Subsequent request for same word should hit cache (no fetch)
    const res2 = mockRes();
    await transliterateHandler(
      mockReq({ text: 'test_new', lang: 'sa-t-i0-und', num: '2' }),
      res2,
    );

    expect(globalThis.fetch).toHaveBeenCalledTimes(1); // Still 1
    expect(res2.status).toHaveBeenCalledWith(200);
    expect(res2.json).toHaveBeenCalledWith({ candidates: ['test1', 'test2'] });
  });

  it('rate limits after 30 requests from same IP', async () => {
    globalThis.fetch = mockFetchSequence({
      ok: true,
      json: async () => ['SUCCESS', [['req', ['res']]]],
    });

    const req = mockReq({ text: 'unique', lang: 'sa-t-i0-und' }, '10.0.0.1');

    // Make 30 valid requests
    for (let i = 0; i < 30; i++) {
      // Modify text slightly to avoid hitting the exact same cache key and testing circuit breaker instead
      req.query = { text: `unique${i}`, lang: 'sa-t-i0-und' };
      const loopRes = mockRes();
      await transliterateHandler(req, loopRes);
      expect(loopRes.status).toHaveBeenCalledWith(200);
    }

    // 31st request should be rate limited
    const limitRes = mockRes();
    await transliterateHandler(req, limitRes);
    expect(limitRes.status).toHaveBeenCalledWith(429);
    expect(limitRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'rate_limited' }),
    );

    // Advancing time by 61 seconds should reset rate limit
    vi.advanceTimersByTime(61000);
    const retryRes = mockRes();
    await transliterateHandler(req, retryRes);
    expect(retryRes.status).toHaveBeenCalledWith(200);
  });
});
