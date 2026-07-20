/**
 * vimeoProxy.ts — Vimeo video download proxy
 *
 * Fetches lowest-quality download link from Vimeo API (to save bandwidth) and streams to client.
 * Token is kept server-side (never exposed to browser).
 */

import type { Request, Response } from 'express';

const VIMEO_API_BASE = 'https://api.vimeo.com';

// Rate limiter: per-IP sliding window. Prevents abuse.
const RATE_LIMIT = 30; // max requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute
const rateHits = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup: remove expired entries every 5 minutes to prevent
// unbounded Map growth from many unique IPs.
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateHits) {
    if (now > entry.resetAt) rateHits.delete(ip);
  }
}, 5 * 60_000).unref();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateHits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)(?:\/\S*)?$/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

interface VimeoDownloadFile {
  link?: string;
  width?: number;
  type?: string;
}

interface VimeoVideoMeta {
  download?: VimeoDownloadFile[];
  name?: string;
}

export async function vimeoDownloadHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'Vimeo token not configured' });
    return;
  }

  // Rate limit: per-IP sliding window
  const clientIp = req.ip || 'unknown';
  if (!checkRateLimit(clientIp)) {
    res.status(429).json({
      error: 'rate_limited',
      retryAfter: Math.ceil(RATE_WINDOW_MS / 1000),
    });
    return;
  }

  const videoUrl = req.query.url as string | undefined;
  if (!videoUrl) {
    res.status(400).json({ error: "Missing 'url' query parameter" });
    return;
  }

  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    res.status(400).json({ error: 'Could not extract video ID from URL' });
    return;
  }

  try {
    const metaRes = await fetch(
      `${VIMEO_API_BASE}/videos/${videoId}?fields=download,name`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!metaRes.ok) {
      const detail = await metaRes.text();
      res
        .status(metaRes.status)
        .json({ error: 'vimeo', status: metaRes.status, detail });
      return;
    }

    const meta = (await metaRes.json()) as VimeoVideoMeta;
    const files = meta.download ?? [];

    const sorted = [...files].sort(
      (a, b) => (a.width ?? 99999) - (b.width ?? 99999),
    );
    const file = sorted[0];

    if (!file?.link) {
      res.status(404).json({ error: 'No downloadable file available' });
      return;
    }

    const upstream = await fetch(file.link);
    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ error: 'Failed to download from Vimeo' });
      return;
    }

    const filename = `${meta.name ?? videoId}.mp4`;
    const contentLength = upstream.headers.get('content-length');

    res.setHeader('Content-Type', file.type ?? 'video/mp4');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    const reader = upstream.body.getReader();
    const pump = async (): Promise<void> => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    };
    pump().catch(() => res.end());
  } catch (err) {
    console.error('[vimeo-proxy] Vimeo proxy error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
