/**
 * vimeoProxy.test.ts — Unit tests for Vimeo download proxy
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractVideoId, vimeoDownloadHandler } from '../vimeoProxy';
import type { Request, Response } from 'express';

describe('extractVideoId', () => {
  it('extracts ID from standard vimeo.com URL', () => {
    expect(extractVideoId('https://vimeo.com/904370970')).toBe('904370970');
  });

  it('extracts ID from vimeo.com URL with title', () => {
    expect(extractVideoId('https://vimeo.com/904370970/some-video-title')).toBe(
      '904370970',
    );
  });

  it('extracts ID from player.vimeo.com URL', () => {
    expect(extractVideoId('https://player.vimeo.com/video/904370970')).toBe(
      '904370970',
    );
  });

  it('returns null for invalid URL', () => {
    expect(extractVideoId('https://youtube.com/watch?v=abc')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractVideoId('')).toBeNull();
  });
});

function mockReq(query: Record<string, string> = {}): Request {
  return { query } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    write: vi.fn(),
    end: vi.fn(),
    headersSent: false,
  } as unknown as Response;
  return res;
}

function mockFetchSequence(...responses: unknown[]) {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const resp = responses[callIndex++] as {
      ok: boolean;
      status?: number;
      text?: () => Promise<string>;
      json?: () => Promise<unknown>;
      headers?: { get: (h: string) => string | null };
      body?: {
        getReader: () => {
          read: () => Promise<{ done: boolean; value?: Uint8Array }>;
        };
      };
    };
    return Promise.resolve(resp);
  });
}

describe('vimeoDownloadHandler', () => {
  const FAKE_TOKEN = 'test-token';
  const VIDEO_ID = '904370970';

  beforeEach(() => {
    process.env.VIMEO_ACCESS_TOKEN = FAKE_TOKEN;
  });

  afterEach(() => {
    delete process.env.VIMEO_ACCESS_TOKEN;
    vi.restoreAllMocks();
  });

  it('returns 500 when VIMEO_ACCESS_TOKEN is missing', async () => {
    delete process.env.VIMEO_ACCESS_TOKEN;
    const res = mockRes();
    await vimeoDownloadHandler(mockReq({ url: 'https://vimeo.com/123' }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 400 when url param is missing', async () => {
    const res = mockRes();
    await vimeoDownloadHandler(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for invalid Vimeo URL', async () => {
    const res = mockRes();
    await vimeoDownloadHandler(
      mockReq({ url: 'https://youtube.com/watch?v=abc' }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('selects lowest resolution file', async () => {
    const metaRes = {
      ok: true,
      json: async () => ({
        name: 'Test Video',
        download: [
          {
            link: 'https://example.com/1080.mp4',
            width: 1920,
            type: 'video/mp4',
          },
          {
            link: 'https://example.com/720.mp4',
            width: 1280,
            type: 'video/mp4',
          },
          {
            link: 'https://example.com/480.mp4',
            width: 854,
            type: 'video/mp4',
          },
        ],
      }),
    };

    const videoChunk = new Uint8Array([1, 2, 3]);
    const downloadRes = {
      ok: true,
      headers: { get: () => '3' },
      body: {
        getReader: () => {
          let called = false;
          return {
            read: async () => {
              if (!called) {
                called = true;
                return { done: false, value: videoChunk };
              }
              return { done: true };
            },
          };
        },
      },
    };

    globalThis.fetch = mockFetchSequence(metaRes, downloadRes);

    const res = mockRes();
    await vimeoDownloadHandler(
      mockReq({ url: `https://vimeo.com/${VIDEO_ID}` }),
      res,
    );

    // Should have called fetch twice: metadata + download
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    // First call should be the Vimeo API for metadata
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      `https://api.vimeo.com/videos/${VIDEO_ID}?fields=download,name`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${FAKE_TOKEN}`,
        }),
      }),
    );

    // Second call should be to the lowest-res file (480.mp4)
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      'https://example.com/480.mp4',
    );

    // Response headers should be set
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'video/mp4');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('Test%20Video'),
    );
  });

  it('returns 404 when no downloadable files', async () => {
    const metaRes = {
      ok: true,
      json: async () => ({
        name: 'No Downloads',
        download: [],
      }),
    };

    globalThis.fetch = mockFetchSequence(metaRes);

    const res = mockRes();
    await vimeoDownloadHandler(
      mockReq({ url: `https://vimeo.com/${VIDEO_ID}` }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 502 when upstream download fails', async () => {
    const metaRes = {
      ok: true,
      json: async () => ({
        name: 'Failing Video',
        download: [
          {
            link: 'https://example.com/video.mp4',
            width: 854,
            type: 'video/mp4',
          },
        ],
      }),
    };

    const failRes = {
      ok: false,
      status: 503,
    };

    globalThis.fetch = mockFetchSequence(metaRes, failRes);

    const res = mockRes();
    await vimeoDownloadHandler(
      mockReq({ url: `https://vimeo.com/${VIDEO_ID}` }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('returns error status when Vimeo API returns non-ok', async () => {
    const metaRes = {
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    };

    globalThis.fetch = mockFetchSequence(metaRes);

    const res = mockRes();
    await vimeoDownloadHandler(
      mockReq({ url: `https://vimeo.com/${VIDEO_ID}` }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'vimeo' }),
    );
  });

  it('rate limits after 30 requests from same IP', async () => {
    // Mock fetch to succeed
    const metaRes = {
      ok: true,
      json: async () => ({
        name: 'Test',
        download: [{ link: 'http://test', width: 100 }],
      }),
    };
    const downloadRes = {
      ok: true,
      headers: { get: () => '3' },
      body: { getReader: () => ({ read: async () => ({ done: true }) }) },
    };
    globalThis.fetch = mockFetchSequence(metaRes, downloadRes);

    const req = mockReq({ url: `https://vimeo.com/${VIDEO_ID}` });
    Object.defineProperty(req, 'ip', { value: '10.0.0.2', writable: true });

    // Make 30 valid requests
    for (let i = 0; i < 30; i++) {
      globalThis.fetch = mockFetchSequence(metaRes, downloadRes);
      const loopRes = mockRes();
      await vimeoDownloadHandler(req, loopRes);
      expect(loopRes.status).not.toHaveBeenCalledWith(429);
    }

    // 31st request should be rate limited
    const limitRes = mockRes();
    await vimeoDownloadHandler(req, limitRes);
    expect(limitRes.status).toHaveBeenCalledWith(429);
    expect(limitRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'rate_limited' }),
    );
  });
});
