/**
 * otrFormat.ts — Parser and serializer for .otr file format
 *
 * Supports:
 *  - v1 (original, no version field): timestamps as seconds or "MM:SS" strings
 *  - Future v2: media as object (planned)
 */

import type { OtrFileV1, OtrDocument, MediaDetails } from '../../types/otr';

// ─── Timestamp conversion ──────────────────────────────────────────────────

/**
 * Convert a legacy "MM:SS" or "H:MM:SS" timestamp string to seconds.
 * Backwards compatible with old .otr files.
 */
export function convertTimestampToSeconds(hms: string): number {
  const parts = hms.split(':');
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  }
  return Number(parts[0]) * 60 + Number(parts[1]);
}

/**
 * Normalise data-timestamp attribute value to seconds (number).
 * Handles both legacy string format "MM:SS" and modern numeric format.
 */
export function normaliseTimestamp(value: string | number): number {
  if (typeof value === 'number') return value;
  // Legacy: "2:03" style
  if (value.indexOf(':') > -1) return convertTimestampToSeconds(value);
  // Numeric string like "123.45"
  return parseFloat(value);
}

// ─── HTML pre-processing ───────────────────────────────────────────────────

/**
 * Pre-process HTML from an .otr file for ingestion by TipTap.
 * - Normalises data-timestamp attributes to numeric seconds
 * - Strips contenteditable attributes (TipTap manages this)
 */
export function preprocessOtrHtml(html: string): string {
  // Use DOMParser to reliably manipulate HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');

  // Normalise all timestamp spans
  doc
    .querySelectorAll<HTMLElement>('.timestamp[data-timestamp]')
    .forEach((el) => {
      const raw = el.getAttribute('data-timestamp') ?? '';
      const seconds = normaliseTimestamp(raw);
      el.setAttribute('data-timestamp', String(seconds));
      // Remove contenteditable attribute — TipTap TimestampNode handles this
      el.removeAttribute('contenteditable');
    });

  return doc.body.innerHTML;
}

// ─── Parse .otr file ───────────────────────────────────────────────────────

/**
 * Parse a raw .otr file string into a typed OtrDocument.
 * Throws if the JSON is invalid or missing required fields.
 */
export function parseOtrFile(
  raw: string,
  t?: (key: string) => string,
): OtrDocument {
  let parsed: OtrFileV1;
  try {
    parsed = JSON.parse(raw) as OtrFileV1;
  } catch {
    throw new Error(
      t ? t('error-invalid-otr') : 'Not a valid Transcribe (.otr) file.',
    );
  }

  if (typeof parsed.text !== 'string') {
    throw new Error(
      t
        ? t('error-missing-text-otr')
        : 'Invalid .otr file: missing "text" field.',
    );
  }

  const html = preprocessOtrHtml(parsed.text);

  const mediaDetails: MediaDetails = {
    name: parsed.media ?? '',
    source: parsed['media-source'] ?? undefined,
  };

  return {
    html,
    mediaDetails,
    mediaTime: parsed['media-time'] ?? 0,
  };
}

// ─── Serialize to .otr ─────────────────────────────────────────────────────

export interface SerializeOptions {
  html: string;
  mediaName: string;
  mediaSource?: string;
  mediaTime?: number;
}

/**
 * Serialize editor content to a .otr v1 file JSON string.
 * Format is kept backward-compatible with original oTranscribe.
 */
export function serializeToOtr(opts: SerializeOptions): string {
  const result: OtrFileV1 = {
    text: opts.html,
    media: opts.mediaName,
    'media-source': opts.mediaSource ?? '',
    'media-time': opts.mediaTime ?? 0,
  };
  return JSON.stringify(result);
}
