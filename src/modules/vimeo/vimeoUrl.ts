/**
 * vimeoUrl.ts — Shared Vimeo URL parsing and validation
 *
 * Single source of truth for extracting Vimeo video IDs from URLs.
 * Used by client-side cache (vimeoCache.ts) and URL validation (useVimeo.ts).
 * The server has its own copy (vimeoProxy.ts) because it runs in a separate runtime.
 */

/**
 * Extract a Vimeo video ID from a URL.
 * Returns the numeric ID string, or null if the URL does not match any known Vimeo format.
 */
export function parseVimeoId(url: string): string | null {
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

/**
 * Validate a Vimeo URL for the URL input modal.
 * Returns null if valid, or a translated error message if invalid.
 */
export function validateVimeoUrl(
  url: string,
  t: (key: string) => string,
): string | null {
  return parseVimeoId(url) ? null : t('error-vimeo-url');
}
