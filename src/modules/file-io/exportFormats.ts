/**
 * exportFormats.ts — Pure export functions for OTR content
 *
 * Formats: Markdown, Plain Text, .otr JSON
 * No side effects, no DOM access — testable pure functions.
 *
 * See PLAN.md section 1.2 Table F
 */

import TurndownService from 'turndown';

import { serializeToOtr, type SerializeOptions } from './otrFormat';

const turndownService = new TurndownService();

// ─── Timestamp injection ───────────────────────────────────────────────────

/**
 * Format seconds → "MM:SS" or "H:MM:SS" string for inline text export.
 */
function formatSecondsForExport(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  const base = `${mm}:${ss}`;
  return h > 0 ? `${h}:${base}` : base;
}

/**
 * Replace all <span class="timestamp" data-timestamp="…"> elements
 * with inline text `[MM:SS] ` so that exported text includes time markers.
 */
function injectTimestamps(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  div
    .querySelectorAll<HTMLElement>('.timestamp[data-timestamp]')
    .forEach((el) => {
      const raw = parseFloat(el.getAttribute('data-timestamp') ?? '0');
      const text = formatSecondsForExport(raw);
      el.replaceWith(document.createTextNode(`[${text}] `));
    });
  return div.innerHTML;
}

// ─── HTML sanitization helpers ─────────────────────────────────────────────



/**
 * Sanitize to minimal tags for plain text export (strips all tags).
 */
function sanitizeForPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  // Replace block-level elements with newlines
  div.querySelectorAll('p, br, h1, h2, h3, li').forEach((el) => {
    el.before(document.createTextNode('\n'));
  });
  return div.textContent?.trim() ?? '';
}

/**
 * Sanitize to minimal tags for Markdown export.
 */
function sanitizeForMarkdown(html: string): string {
  // Keep only inline formatting tags; remove all attributes
  const ALLOWED_MD = new Set(['p', 'em', 'strong', 'i', 'b', 'br']);
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('*').forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_MD.has(tag)) {
      // Unwrap: replace element with its children
      el.replaceWith(...Array.from(el.childNodes));
    } else {
      // Strip all attributes
      Array.from(el.attributes).forEach((a) => el.removeAttribute(a.name));
    }
  });
  return div.innerHTML;
}

// ─── Filename helpers ──────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  if (!name) return '';
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
}

export function generateFilename(
  mediaName?: string,
  t?: (key: string) => string,
): string {
  const date = new Date().toUTCString();
  if (mediaName) {
    return sanitizeFilename(mediaName) + ' ' + date;
  }
  return (t ? t('export-default-filename') : 'transcript') + ' ' + date;
}

// ─── Export format functions ────────────────────────────────────────────────

type ExportOptions = Record<string, never>;

/** Convert editor HTML to Markdown string */
export function exportToMarkdown(
  html: string,
  _opts: ExportOptions = {},
): string {
  const withTs = injectTimestamps(html);
  const clean = sanitizeForMarkdown(withTs);
  const md = turndownService.turndown(clean);
  return md.replace(/\t/gm, '');
}

/** Convert editor HTML to plain text string */
export function exportToPlainText(
  html: string,
  _opts: ExportOptions = {},
): string {
  const withTs = injectTimestamps(html);
  const clean = sanitizeForPlainText(withTs);
  const md = turndownService.turndown(clean);
  return md.replace(/\t/gm, '');
}

/** Convert editor HTML + player state to .otr JSON string */
export function exportToOtr(opts: SerializeOptions): string {
  return serializeToOtr(opts);
}


// ─── Download trigger ──────────────────────────────────────────────────────

/** Trigger a file download in the browser */
export function downloadFile(
  content: string,
  filename: string,
  mimeType = 'text/plain',
): void {
  const blob = new Blob([content], { type: mimeType });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(href);
}
