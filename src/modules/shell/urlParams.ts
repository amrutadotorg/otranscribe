/**
 * urlParams.ts — Helpers for reading deep-link URL parameters on startup.
 *
 * Reads `?video_url=` and validates it against a strict YouTube URL whitelist
 * before returning it to the caller.  Any value that does not match the
 * whitelist is silently discarded to prevent open-redirect / SSRF abuse.
 */

/** Accepted YouTube URL patterns (anchored to the start of the string). */
const YOUTUBE_PATTERNS: RegExp[] = [
  /^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=[\w-]+/,
  /^https?:\/\/youtu\.be\/[\w-]+/,
  /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
  /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/,
];

/**
 * Returns true if `url` is a recognised YouTube URL.
 * Only URLs matching the whitelist above pass — all others are rejected.
 */
function isValidYouTubeUrl(url: string): boolean {
  return YOUTUBE_PATTERNS.some((p) => p.test(url));
}

/**
 * Reads the `?video_url=` query parameter from the current page URL.
 *
 * Returns the validated YouTube URL string, or `null` if the parameter is
 * absent, empty, or does not pass the YouTube URL whitelist check.
 */
export function getVideoUrlParam(): string | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('video_url');
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  return isValidYouTubeUrl(trimmed) ? trimmed : null;
}
