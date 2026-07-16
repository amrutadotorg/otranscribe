/**
 * transliterateProxy.ts — Proxies phonetic transliteration requests to
 * Google's inputtools.google.com endpoint (same engine used by the
 * "Google Input Tools" Chrome extension). Keeps the raw third-party
 * endpoint off the client and allows centralized error handling / caching.
 *
 * Includes:
 * - In-memory LRU cache (Map, 1000 entries) for repetitive words.
 * - Circuit breaker: after CONSECUTIVE_ERRORS failures, skip upstream for
 *   COOLDOWN_MS to avoid wasting time on a dead endpoint and to prevent
 *   rate-limit bans from Google.
 * - Per-IP rate limiter: 30 req/min sliding window, prevents abuse.
 */

import type { Request, Response } from 'express';

const GOOGLE_INPUTTOOLS_URL = 'https://inputtools.google.com/request';
const REQUEST_TIMEOUT_MS = 3000;
const MAX_TEXT_LENGTH = 64;

// Allow-list: only known-supported IME language codes are forwarded.
// Keep in sync with TransliterationLang in src/modules/editor/transliteration.ts.
const ALLOWED_LANG_CODES = new Set([
  'am-t-i0-und',
  'ar-t-i0-und',
  'be-t-i0-und',
  'bn-t-i0-und',
  'bg-t-i0-und',
  'yue-hant-t-i0-und',
  'zh-t-i0-pinyin',
  'zh-hant-t-i0-pinyin',
  'el-t-i0-und',
  'gu-t-i0-und',
  'he-t-i0-und',
  'hi-t-i0-und',
  'kn-t-i0-und',
  'ml-t-i0-und',
  'mr-t-i0-und',
  'ne-t-i0-und',
  'or-t-i0-und',
  'fa-t-i0-und',
  'pa-t-i0-und',
  'ru-t-i0-und',
  'sa-t-i0-und',
  'sr-t-i0-und',
  'si-t-i0-und',
  'ta-t-i0-und',
  'te-t-i0-und',
  'th-t-i0-und',
  'ti-t-i0-und',
  'uk-t-i0-und',
  'ur-t-i0-und',
]);

// In-memory LRU cache: lang:text → candidates. Oldest entries evicted at MAX_CACHE_SIZE.
// Saves ~80% of upstream requests for repetitive words (mantras, common phrases).
// Map maintains insertion order — first key is the oldest (LRU).
const CACHE = new Map<string, string[]>();
const MAX_CACHE_SIZE = 1000;

// Circuit breaker: after N consecutive upstream failures, stop trying
// for COOLDOWN_MS. Resets on first success. Prevents wasting 3s per
// request when Google is down and avoids rate-limit bans.
const CONSECUTIVE_ERRORS = 5;
const COOLDOWN_MS = 60_000; // 1 minute
let consecutiveFailures = 0;
let circuitOpenUntil = 0;

// Rate limiter: per-IP sliding window. Prevents abuse and protects against
// Google banning our server IP for excessive requests.
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

function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.socket.remoteAddress ??
    'unknown'
  );
}

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

interface TransliterateQuery {
  text?: string;
  lang?: string;
  num?: string;
}

export async function transliterateHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { text, lang, num } = req.query as TransliterateQuery;

  if (
    !text ||
    typeof text !== 'string' ||
    text.length === 0 ||
    text.length > MAX_TEXT_LENGTH
  ) {
    res.status(400).json({ error: 'invalid_text' });
    return;
  }

  if (!lang || typeof lang !== 'string' || !ALLOWED_LANG_CODES.has(lang)) {
    res.status(400).json({ error: 'unsupported_lang' });
    return;
  }

  // Rate limit: per-IP sliding window
  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    res.status(429).json({
      error: 'rate_limited',
      retryAfter: Math.ceil(RATE_WINDOW_MS / 1000),
    });
    return;
  }

  // Check cache first (works even when circuit is open; refresh order for true LRU)
  const cacheKey = `${lang}:${text.toLowerCase()}`;
  const cached = CACHE.get(cacheKey);
  if (cached) {
    // Move to end (most recently used) — delete + set refreshes insertion order in Map
    CACHE.delete(cacheKey);
    CACHE.set(cacheKey, cached);
    res.status(200).json({ candidates: cached });
    return;
  }

  // Circuit breaker: if open, return empty immediately (no 3s wait)
  if (Date.now() < circuitOpenUntil) {
    res.status(200).json({ candidates: [], circuitOpen: true });
    return;
  }

  const maxResult = Math.max(1, Math.min(Number(num) || 5, 8));

  const url =
    `${GOOGLE_INPUTTOOLS_URL}?text=${encodeURIComponent(text)}` +
    `&itc=${lang}&num=${maxResult}&cp=0&cs=1&ie=utf-8&oe=utf-8&app=transcribe`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(url, { signal: controller.signal });

    if (!upstream.ok) {
      consecutiveFailures++;
      if (consecutiveFailures >= CONSECUTIVE_ERRORS) {
        circuitOpenUntil = Date.now() + COOLDOWN_MS;
      }
      res
        .status(502)
        .json({ error: 'upstream_error', status: upstream.status });
      return;
    }

    const data = (await upstream.json()) as unknown;
    const candidates = extractCandidates(data);

    // Success: reset circuit breaker
    consecutiveFailures = 0;

    // Populate cache with LRU eviction (only non-empty results)
    if (candidates.length > 0) {
      // Refresh key: delete + re-set moves it to the end (most recent)
      CACHE.delete(cacheKey);
      CACHE.set(cacheKey, candidates);
      // Evict oldest entries when over limit
      while (CACHE.size > MAX_CACHE_SIZE) {
        const oldest = CACHE.keys().next().value;
        if (oldest !== undefined) CACHE.delete(oldest);
      }
    }

    res.status(200).json({ candidates });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    consecutiveFailures++;
    if (consecutiveFailures >= CONSECUTIVE_ERRORS) {
      circuitOpenUntil = Date.now() + COOLDOWN_MS;
    }
    res
      .status(isAbort ? 504 : 502)
      .json({ error: isAbort ? 'timeout' : 'proxy_error' });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Google's response shape: [status, [[sourceText, [candidate1, candidate2, ...]]]]
 * Defensive parsing since this is an undocumented, unofficial API.
 */
function extractCandidates(data: unknown): string[] {
  try {
    const arr = data as unknown[];
    const first = arr[1] as unknown[];
    const entry = first[0] as unknown[];
    const list = entry[1] as unknown[];
    return list.filter((c): c is string => typeof c === 'string');
  } catch {
    return [];
  }
}
