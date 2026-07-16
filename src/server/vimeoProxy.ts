/**
 * vimeoProxy.ts — Vimeo video download proxy
 *
 * Fetches highest-quality download link from Vimeo API and streams to client.
 * Token is kept server-side (never exposed to browser).
 */

import type { Request, Response } from 'express';

const VIMEO_API_BASE = 'https://api.vimeo.com';

function extractVideoId(url: string): string | null {
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

    const sorted = [...files].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
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
    console.error('Vimeo proxy error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
