/**
 * transliteration.ts — Client-side helper for phonetic transliteration.
 * Calls the app's own /api/transliterate proxy (never the third-party
 * endpoint directly). Returns an empty list on any failure so callers
 * can silently fall back to plain Latin input.
 */

// Keep in sync with ALLOWED_LANG_CODES in src/server/transliterateProxy.ts
// and the language table in the implementation plan.
export type TransliterationLang =
  | 'am-t-i0-und'
  | 'ar-t-i0-und'
  | 'be-t-i0-und'
  | 'bn-t-i0-und'
  | 'bg-t-i0-und'
  | 'yue-hant-t-i0-und'
  | 'zh-t-i0-pinyin'
  | 'zh-hant-t-i0-pinyin'
  | 'el-t-i0-und'
  | 'gu-t-i0-und'
  | 'he-t-i0-und'
  | 'hi-t-i0-und'
  | 'kn-t-i0-und'
  | 'ml-t-i0-und'
  | 'mr-t-i0-und'
  | 'ne-t-i0-und'
  | 'or-t-i0-und'
  | 'fa-t-i0-und'
  | 'pa-t-i0-und'
  | 'ru-t-i0-und'
  | 'sa-t-i0-und'
  | 'sr-t-i0-und'
  | 'si-t-i0-und'
  | 'ta-t-i0-und'
  | 'te-t-i0-und'
  | 'th-t-i0-und'
  | 'ti-t-i0-und'
  | 'uk-t-i0-und'
  | 'ur-t-i0-und';

const REQUEST_TIMEOUT_MS = 1500;

export async function transliterate(
  word: string,
  lang: TransliterationLang,
): Promise<string[]> {
  if (!word || !navigator.onLine) {
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `/api/transliterate?text=${encodeURIComponent(word)}&lang=${lang}&num=5`;
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as { candidates?: string[] };
    return data.candidates ?? [];
  } catch {
    // Network error, timeout, offline, malformed response — fail silent.
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
