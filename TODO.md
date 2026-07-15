# Plan wdrożenia: fonetyczne wpisywanie (transliteracja) w oTranscribe

**Cel:** dodać opcjonalną funkcję wpisywania fonetycznego (łacińskie litery → Devanagari/inne skrypty), analogiczną do rozszerzenia Google Input Tools, wbudowaną bezpośrednio w edytor TipTap projektu `otranscribe`. Wykorzystuje bezpośrednie zapytania `fetch()` do `inputtools.google.com/request` (ten sam silnik co rozszerzenie Chrome), przepuszczone przez własny serwer proxy (wzorzec identyczny jak istniejący `vimeoProxy.ts`).

Ten dokument jest przeznaczony do wykonania przez agenta AI (np. Claude Code) pracującego na repo `amrutadotorg/otranscribe`. Zawiera kolejność kroków, konkretne propozycje kodu i kryteria akceptacji zgodne z `AGENTS.md`/regułami projektu.

## Status implementacji

| Faza       | Status | Opis                                                           |
| ---------- | ------ | -------------------------------------------------------------- |
| Faza 0     | ⏳     | Branch + instalacja zależności                                 |
| Faza 1     | ⏳     | Serwer: endpoint proxy                                         |
| Faza 2     | ⏳     | Klient: moduł transliteracji (fetch wrapper)                   |
| Faza 3     | ⏳     | Integracja z edytorem TipTap (input rule na spację)            |
| Faza 4     | ⏳     | Ustawienia (typ, defaulty, UI w SettingsPanel)                 |
| **Faza 5** | **✅** | **i18n (nowe klucze tłumaczeń) — zaimplementowano 2026-07-15** |
| Faza 6     | ⏳     | Testy jednostkowe + e2e                                        |
| Faza 7     | ⏳     | Weryfikacja (lint/tsc/test/e2e/knip)                           |
| Faza 8     | ⏳     | Commit + push                                                  |

### Zrealizowano w Fazie 5

- Dodano 26 kluczy i18n do `_english.ini` (1 główny + 25 nazw języków)
- Dodano tłumaczenia do 28 plików `.ini` (wszystkie obsługiwane języki)
- Uruchomiono `npm run build:locale` — wygenerowano `public/data.ini` (323.1 KB)
- Wszystkie 28 języków mają klucze `settings-phonetic-*`

---

## 0. Założenia i decyzje projektowe

| Decyzja                       | Wybór                                                                                                                               | Uzasadnienie                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Gdzie woła się zewnętrzne API | **Serwer (Express proxy)**, nie klient                                                                                              | Unika ryzyka CORS, ukrywa surowy endpoint, umożliwia cache/rate-limit — zgodnie z istniejącym wzorcem `vimeoProxy.ts` |
| Zachowanie offline (PWA)      | Funkcja **wyłącza się automatycznie**, gdy `navigator.onLine === false`                                                             | Projekt jest offline-first, nie można blokować edytora brakiem sieci                                                  |
| Moment transliteracji         | Po wpisaniu spacji/interpunkcji (jak w oryginalnym rozszerzeniu), nie na każdy znak                                                 | Unika nadmiaru zapytań sieciowych                                                                                     |
| MVP: wybór spośród kandydatów | **Nie w pierwszej iteracji** — automatycznie wstawiany pierwszy kandydat                                                            | Ogranicza zakres; dropdown wyboru to Faza 2 (opcjonalna)                                                              |
| Języki na start               | Pełna lista wspierana przez `inputtools.google.com` (29 języków, patrz tabela niżej) — domyślnie ustawiony `sa-t-i0-und` (sanskryt) | Skoro API i tak wspiera wszystkie, nie ma powodu sztucznie zawężać wyboru w UI do dwóch języków                       |
| Zależności npm                | **Brak nowych** — serwer woła `fetch()` bezpośrednio na Google API                                                                  | `google-input-tool` wymaga polyfilla `XMLHttpRequest` w Node i nie dodaje wartości ponad surowy `fetch`               |

### Pełna lista wspieranych języków (`inputtools.google.com`)

| Język                         | Kod                   |
| ----------------------------- | --------------------- |
| Amharic                       | `am-t-i0-und`         |
| Arabic                        | `ar-t-i0-und`         |
| Belarusian                    | `be-t-i0-und`         |
| Bengali                       | `bn-t-i0-und`         |
| Bulgarian                     | `bg-t-i0-und`         |
| Chinese (Hong Kong)           | `yue-hant-t-i0-und`   |
| Chinese (Simplified, China)   | `zh-t-i0-pinyin`      |
| Chinese (Traditional, Taiwan) | `zh-hant-t-i0-pinyin` |
| Greek                         | `el-t-i0-und`         |
| Gujarati                      | `gu-t-i0-und`         |
| Hebrew                        | `he-t-i0-und`         |
| Hindi                         | `hi-t-i0-und`         |
| Kannada                       | `kn-t-i0-und`         |
| Malayalam                     | `ml-t-i0-und`         |
| Marathi                       | `mr-t-i0-und`         |
| Nepali                        | `ne-t-i0-und`         |
| Oriya                         | `or-t-i0-und`         |
| Persian                       | `fa-t-i0-und`         |
| Punjabi                       | `pa-t-i0-und`         |
| Russian                       | `ru-t-i0-und`         |
| Sanskrit                      | `sa-t-i0-und`         |
| Serbian                       | `sr-t-i0-und`         |
| Sinhalese                     | `si-t-i0-und`         |
| Tamil                         | `ta-t-i0-und`         |
| Telugu                        | `te-t-i0-und`         |
| Thai                          | `th-t-i0-und`         |
| Tigrinya                      | `ti-t-i0-und`         |
| Ukrainian                     | `uk-t-i0-und`         |
| Urdu                          | `ur-t-i0-und`         |

Ta tabela jest jedynym źródłem prawdy dla `ALLOWED_LANG_CODES` (serwer), `TransliterationLang` (klient) i listy `<option>` w ustawieniach (Faza 4) oraz kluczy i18n (Faza 5) — patrz aktualizacje niżej. **Łącznie 29 języków + angielski (en-US) = 30 obsługiwanych języków.**

**Ryzyko do zaakceptowania świadomie (nie do rozwiązania kodem):** `inputtools.google.com` to nieoficjalne, niedokumentowane API Google. Brak SLA — może przestać działać lub zacząć być blokowane bez ostrzeżenia. Traktować funkcję jako _best-effort enhancement_, nigdy jako krytyczną ścieżkę.

---

## 1. Kolejność faz (dla agenta)

```
Faza 0 — branch + instalacja zależności
Faza 1 — serwer: endpoint proxy
Faza 2 — klient: moduł transliteracji (fetch wrapper)
Faza 3 — integracja z edytorem TipTap (input rule na spację)
Faza 4 — ustawienia (typ, defaulty, UI w SettingsPanel)
Faza 5 — i18n (nowe klucze tłumaczeń)
Faza 6 — testy jednostkowe + e2e
Faza 7 — weryfikacja (lint/tsc/test/e2e/knip)
Faza 8 — commit + push
```

Agent powinien wykonywać fazy sekwencyjnie i **zatrzymać się i zaraportować**, jeśli którykolwiek z poniższych punktów wymaga decyzji człowieka (oznaczone 🔴).

---

## Faza 0 — Przygotowanie

```bash
git checkout -b feat/phonetic-input
```

Zero nowych zależności npm — serwer składa URL i woła `fetch()` bezpośrednio na `inputtools.google.com/request`, replikując ten sam wzorzec zapytania. Biblioteka `google-input-tool` nie jest potrzebna (wymaga polyfilla `XMLHttpRequest` w Node, a jej API nie dodaje wartości ponad surowy `fetch`).

---

## Faza 1 — Serwer: endpoint proxy

Nowy plik `src/server/transliterateProxy.ts`, wzorowany na istniejącym `vimeoProxy.ts`:

```ts
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
  req: Request<unknown, unknown, unknown, TransliterateQuery>,
  res: Response,
): Promise<void> {
  const { text, lang, num } = req.query;

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
    `&itc=${lang}&num=${maxResult}&cp=0&cs=1&ie=utf-8&oe=utf-8&app=otranscribe`;

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
```

**Tech debt — cache key nie uwzględnia `num`:** Dziś klient zawsze woła z `num=5`, więc to nieszkodliwe. Ale dropdown kandydatów (TODO_2.md, sekcja A) najpewniej będzie chciał różnych `num` dla różnych kontekstów UI — wtedy cache może po cichu serwować np. 1 kandydata zapisanego wcześniej zamiast pełnych 5. Przy implementacji sekcji A w TODO_2.md zmienić klucz na `${lang}:${num}:${text}`.

**Tech debt — walidacja Punjabi (✅ ROZSTRZYGNIĘTE):** Kod `pu-t-i0-und` z README `google-input-tool` był nieprawidłowy — API zwraca `INVALID_INPUT_METHOD_NAME`. Prawidłowy kod to `pa-t-i0-und` (ISO 639-1: `pa`), potwierdzony testem ręcznym i skryptem `scripts/test-transliterate-client.mjs`. Kod został poprawiony we wszystkich miejscach.

Podpięcie w `src/server/index.ts` (dopisać obok istniejących tras, np. obok montowania `vimeoProxy`):

```ts
import { transliterateHandler } from './transliterateProxy';
// ...
app.get('/api/transliterate', transliterateHandler);
```

✅ **Rozstrzygnięte:** Dockerfile używa `node:24-slim` (Node 24) — natywny `fetch` jest dostępny od Node 18, polyfill nie jest potrzebny.

---

## Faza 2 — Klient: moduł transliteracji

Nowy plik `src/modules/editor/transliteration.ts`:

```ts
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
```

**Test jednostkowy** `src/modules/editor/__tests__/transliteration.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transliterate } from '../transliteration';

describe('transliterate', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns candidates on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ candidates: ['नमस्ते'] }),
      }),
    );

    const result = await transliterate('namaste', 'sa-t-i0-und');
    expect(result).toEqual(['नमस्ते']);
  });

  it('returns empty array when offline', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const result = await transliterate('namaste', 'sa-t-i0-und');
    expect(result).toEqual([]);
  });

  it('returns empty array on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const result = await transliterate('namaste', 'sa-t-i0-und');
    expect(result).toEqual([]);
  });

  it('returns empty array on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const result = await transliterate('namaste', 'sa-t-i0-und');
    expect(result).toEqual([]);
  });
});
```

---

## Faza 3 — Integracja z edytorem TipTap

Podejście: własne rozszerzenie TipTap przechwytujące spację, pobierające ostatnie „słowo" łacińskie przed kursorem i podmieniające je na pierwszego kandydata. **Optymistyczna spacja** — spacja wstawiana natychmiast, transliteracja w tle. **Race condition**: każde oczekujące zastąpienie dostaje własny `Mapping` z ProseMirror, akumulujący transakcje dopóki callback API nie wróci — dzięki temu podmiana wcześniejszego słowa (inna długość znaków) poprawnie przesuwa zapamiętaną pozycję kolejnego oczekującego słowa.

Nowy plik `src/modules/editor/PhoneticInputExtension.ts`:

```ts
/**
 * PhoneticInputExtension.ts — TipTap extension that intercepts the
 * Space key, takes the Latin word immediately before the cursor, and
 * replaces it with the top transliteration candidate in the background.
 * Mirrors the "commit on space" behavior of the Google Input Tools extension.
 *
 * Uses a getter pattern for config so the extension always reads the
 * latest settings without needing editor re-creation.
 *
 * CONCURRENCY: multiple words can be "in flight" at once when typing
 * fast (e.g. dictating a mantra). Each pending replacement tracks its
 * own ProseMirror Mapping, updated on every transaction, so an earlier
 * word resolving AFTER a later one (or vice versa) still lands at the
 * correct — remapped — position instead of a stale integer offset.
 */

import { Extension } from '@tiptap/core';
import { Mapping } from '@tiptap/pm/transform';
import { transliterate, type TransliterationLang } from './transliteration';

const LATIN_WORD_PATTERN = /[A-Za-z]+$/;
// Keep in sync with MAX_TEXT_LENGTH in src/server/transliterateProxy.ts —
// otherwise long compound words get silently truncated before the API call.
const WORD_LOOKBACK = 64;

export interface PhoneticInputConfig {
  enabled: boolean;
  lang: TransliterationLang;
}

export interface PhoneticInputOptions {
  /** Getter that returns current settings — avoids editor re-creation on config change. */
  getConfig: () => PhoneticInputConfig;
}

interface PendingReplacement {
  mapping: Mapping;
}

export const PhoneticInputExtension = Extension.create<PhoneticInputOptions>({
  name: 'phoneticInput',

  addOptions() {
    return {
      getConfig: () => ({
        enabled: false,
        lang: 'sa-t-i0-und' as TransliterationLang,
      }),
    };
  },

  addStorage() {
    return {
      pending: [] as PendingReplacement[],
      txHandler: null as (() => void) | null,
    };
  },

  onCreate() {
    const handler = ({
      transaction,
    }: {
      transaction: { docChanged: boolean; mapping: Mapping };
    }) => {
      if (!transaction.docChanged) return;
      const pending = this.storage.pending as PendingReplacement[];
      for (const p of pending) {
        p.mapping.appendMapping(transaction.mapping);
      }
    };
    this.storage.txHandler = handler;
    this.editor.on('transaction', handler);
  },

  onDestroy() {
    if (this.storage.txHandler) {
      this.editor.off('transaction', this.storage.txHandler);
    }
  },

  addKeyboardShortcuts() {
    return {
      Space: () => {
        const config = this.options.getConfig();
        if (!config.enabled) return false;

        const { state } = this.editor;
        const { from } = state.selection;

        // If user has a non-empty selection, let TipTap handle it normally.
        // Replacing a selection with transliteration is confusing UX.
        if (!state.selection.empty) return false;

        const textBefore = state.doc.textBetween(
          Math.max(0, from - WORD_LOOKBACK),
          from,
          '\n',
        );
        const match = textBefore.match(LATIN_WORD_PATTERN);

        if (!match) return false; // no Latin word — let TipTap insert space normally

        const word = match[0];
        const wordStart = from - word.length;
        const wordEnd = from;

        // Register this replacement as pending BEFORE the async call so
        // the transaction handler above starts tracking drift immediately.
        const pending: PendingReplacement = { mapping: new Mapping() };
        const pendingList = this.storage.pending as PendingReplacement[];
        pendingList.push(pending);

        const removeFromPending = () => {
          const idx = pendingList.indexOf(pending);
          if (idx !== -1) pendingList.splice(idx, 1);
        };

        void transliterate(word, config.lang).then((candidates) => {
          if (candidates.length === 0) {
            removeFromPending();
            return;
          }
          const replacement = candidates[0];

          // Remap the ORIGINAL [wordStart, wordEnd) range through every
          // transaction that happened while we were waiting for the API —
          // including replacements of other pending words.
          //
          // IMPORTANT: both biases are -1. assoc=-1 for wordEnd ensures
          // the range boundary stays BEFORE any insertion at that exact
          // position (e.g. the space TipTap inserts). Without this,
          // mappedTo would land after the space, making currentText include
          // it and the equality check would always fail silently.
          const mappedFrom = pending.mapping.map(wordStart, -1);
          const mappedTo = pending.mapping.map(wordEnd, -1);

          removeFromPending();

          // Guard: editor may have been destroyed while we waited
          if (this.editor.isDestroyed) return;
          if (mappedFrom >= mappedTo) return; // range collapsed (e.g. user deleted it)

          const currentText = this.editor.state.doc.textBetween(
            mappedFrom,
            mappedTo,
            '\n',
          );

          if (currentText === word) {
            this.editor
              .chain()
              .insertContentAt({ from: mappedFrom, to: mappedTo }, replacement)
              .run();
          }
        });

        // Return false: let TipTap insert the space immediately.
        // No lag, no swallowed keypress.
        return false;
      },
    };
  },
});
```

Integracja w `src/modules/editor/Editor.tsx` — dodać do listy rozszerzeń TipTap, z getterem przekazującym aktualne ustawienia.

**Uwaga:** `Editor` otrzymuje `settings` jako **prop** (nie korzysta z `useSettings()`). Pusta tablica `deps` — edytor tworzy się raz, bez rekreacji:

```tsx
import { PhoneticInputExtension } from './PhoneticInputExtension';

// ...w komponencie, w useEditor extensions:
const editor = useEditor(
  {
    extensions: [
      // ...istniejące rozszerzenia (StarterKit, Underline, TimestampNode, TimestampExtension)
      PhoneticInputExtension.configure({
        getConfig: () => ({
          enabled: settings.phoneticInput.enabled,
          lang: settings.phoneticInput.lang,
        }),
      }),
    ],
    // ...
  },
  [],
); // PUSTA TABLICA — edytor nigdy nie jest rekreowany.
```

**Dlaczego getter zamiast `deps` rekreacji:**

- Rekreacja edytora (`deps` ≠ `[]`) niszczy historię Undo/Redo i resetuje focus.
- Getter czyta `settings` z closure — zawsze najświeższe wartości, bez kosztów rekreacji.
- `useEditor` z pustymi deps = edytor tworzy się jeden raz, rozszerzenie czyta config przy każdym wciśnięciu spacji.

**Optymistyczna spacja (brak lagów):**

- Spacja wstawiana natychmiast (`return false`) — brak opóźnienia w UI.
- Transliteracja w tle — jeśli API odpowie za 500ms, podmiana nastąpi bez wiedzy użytkownika.
- Walidacja przed podmianą — jeśli użytkownik skasował słowo w międzyczasie, podmiana nie nastąpi.

**Race condition — ProseMirror Mapping:**

- Każde oczekujące zastąpienie ma własny `Mapping` (z `@tiptap/pm/transform`).
- Handler `transaction` w `onCreate` dopisuje każdą transakcję do mappingu _każdego_ wciąż oczekującego elementu.
- Gdy callback API wróci — `mapping.map(wordStart)` zwraca przesuniętą pozycję, uwzględniając podmiany innych słów.
- `onDestroy` odrejestrowuje listener — brak wycieku pamięci.

**Bez dropdownu w MVP** — jeśli w Fazie 2 (rozszerzenie funkcji) potrzebny wybór spośród kandydatów, dodać osobny komponent popover analogiczny do istniejących (`Tooltip.tsx` jako wzorzec), zasilany pełną listą `candidates` zamiast tylko `candidates[0]`.

---

## Faza 3b — Wspólne metadane języków (unika duplikacji przy 25 pozycjach)

Nowy plik `src/modules/editor/transliterationLanguages.ts` — jedno źródło prawdy dla UI (select w `SettingsPanel`) i dla kluczy i18n, żeby nie trzeba było ręcznie pisać 29 `<option>` i 29 wpisów w `.ini`:

```ts
/**
 * transliterationLanguages.ts — Metadata for all languages supported by
 * the phonetic input feature. Single source of truth for the settings
 * dropdown and the corresponding i18n keys.
 */

import type { TransliterationLang } from './transliteration';

export interface TransliterationLanguageMeta {
  code: TransliterationLang;
  /** i18n key, e.g. 'settings-phonetic-lang-hindi' */
  i18nKey: string;
}

export const TRANSLITERATION_LANGUAGES: TransliterationLanguageMeta[] = [
  { code: 'am-t-i0-und', i18nKey: 'settings-phonetic-lang-amharic' },
  { code: 'ar-t-i0-und', i18nKey: 'settings-phonetic-lang-arabic' },
  { code: 'be-t-i0-und', i18nKey: 'settings-phonetic-lang-belarusian' },
  { code: 'bn-t-i0-und', i18nKey: 'settings-phonetic-lang-bengali' },
  { code: 'bg-t-i0-und', i18nKey: 'settings-phonetic-lang-bulgarian' },
  { code: 'yue-hant-t-i0-und', i18nKey: 'settings-phonetic-lang-chinese-hk' },
  {
    code: 'zh-t-i0-pinyin',
    i18nKey: 'settings-phonetic-lang-chinese-simplified',
  },
  {
    code: 'zh-hant-t-i0-pinyin',
    i18nKey: 'settings-phonetic-lang-chinese-traditional',
  },
  { code: 'el-t-i0-und', i18nKey: 'settings-phonetic-lang-greek' },
  { code: 'gu-t-i0-und', i18nKey: 'settings-phonetic-lang-gujarati' },
  { code: 'he-t-i0-und', i18nKey: 'settings-phonetic-lang-hebrew' },
  { code: 'hi-t-i0-und', i18nKey: 'settings-phonetic-lang-hindi' },
  { code: 'kn-t-i0-und', i18nKey: 'settings-phonetic-lang-kannada' },
  { code: 'ml-t-i0-und', i18nKey: 'settings-phonetic-lang-malayalam' },
  { code: 'mr-t-i0-und', i18nKey: 'settings-phonetic-lang-marathi' },
  { code: 'ne-t-i0-und', i18nKey: 'settings-phonetic-lang-nepali' },
  { code: 'or-t-i0-und', i18nKey: 'settings-phonetic-lang-oriya' },
  { code: 'fa-t-i0-und', i18nKey: 'settings-phonetic-lang-persian' },
  { code: 'pa-t-i0-und', i18nKey: 'settings-phonetic-lang-punjabi' },
  { code: 'ru-t-i0-und', i18nKey: 'settings-phonetic-lang-russian' },
  { code: 'sa-t-i0-und', i18nKey: 'settings-phonetic-lang-sanskrit' },
  { code: 'sr-t-i0-und', i18nKey: 'settings-phonetic-lang-serbian' },
  { code: 'si-t-i0-und', i18nKey: 'settings-phonetic-lang-sinhalese' },
  { code: 'ta-t-i0-und', i18nKey: 'settings-phonetic-lang-tamil' },
  { code: 'te-t-i0-und', i18nKey: 'settings-phonetic-lang-telugu' },
  { code: 'th-t-i0-und', i18nKey: 'settings-phonetic-lang-thai' },
  { code: 'ti-t-i0-und', i18nKey: 'settings-phonetic-lang-tigrinya' },
  { code: 'uk-t-i0-und', i18nKey: 'settings-phonetic-lang-ukrainian' },
  { code: 'ur-t-i0-und', i18nKey: 'settings-phonetic-lang-urdu' },
];
```

Ten plik importują: `SettingsPanel.tsx` (Faza 4, generowanie `<option>` w pętli) oraz skrypt/checklist w Fazie 5 (generowanie kluczy `.ini`).

🟡 **Do rozważenia przez człowieka (nie blokuje implementacji):** 29 języków w jednym płaskim select może być nieporęczne w UI — alternatywa to pogrupowanie (np. „Indyjskie", „Słowiańskie", „Inne") albo ograniczenie domyślnie widocznej listy do kilku najczęściej używanych + „pokaż więcej". Plan zakłada prosty płaski select jako MVP — zmiana na pogrupowaną listę to kosmetyka w Fazie 4.

---

## Faza 4 — Ustawienia

`src/types/settings.d.ts` — dopisać do `AppSettings`:

```ts
// Note: .d.ts files are ambient declarations — cannot use `import` statements.
// Use `import()` type syntax to reference TransliterationLang from the module.
interface PhoneticInputSettings {
  enabled: boolean;
  lang: import('../modules/editor/transliteration').TransliterationLang;
}

interface AppSettings {
  // ...istniejące pola
  phoneticInput: PhoneticInputSettings;
}
```

`src/modules/settings/defaults.ts` — dopisać do domyślnych wartości:

```ts
export const DEFAULT_SETTINGS: AppSettings = {
  // ...istniejące defaulty
  phoneticInput: {
    enabled: false,
    lang: 'sa-t-i0-und',
  },
};
```

`src/components/SettingsPanel.tsx` — dopisać sekcję (zgodnie z konwencją BEM klas i `useTranslation`).

**Uwaga:** `SettingsPanel` otrzymuje `settings` i `onUpdate` jako **props** (nie korzysta z `useSettings()` — hook ten jest używany w komponencie nadrzędnym). Użyć `onUpdate` z props:

```tsx
// Import na górze pliku:
import { TRANSLITERATION_LANGUAGES } from '../modules/editor/transliterationLanguages';
import type { TransliterationLang } from '../modules/editor/transliteration';

// Wewnątrz komponentu, w sekcji "Editor" (obok istniejącego pauseOnTyping), dodać:

<LabelRow label={t('settings-phonetic-input-enabled')}>
  <input
    type="checkbox"
    checked={settings.phoneticInput.enabled}
    onChange={(e) =>
      onUpdate({
        phoneticInput: { ...settings.phoneticInput, enabled: e.target.checked },
      })
    }
    style={{ width: 16, height: 16, cursor: 'pointer' }}
  />
</LabelRow>;

{
  settings.phoneticInput.enabled && (
    <LabelRow label={t('settings-phonetic-input-lang')}>
      <select
        value={settings.phoneticInput.lang}
        onChange={(e) =>
          onUpdate({
            phoneticInput: {
              ...settings.phoneticInput,
              lang: e.target.value as TransliterationLang,
            },
          })
        }
        style={{
          fontSize: 'var(--font-size-sm)',
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface-2)',
          color: 'var(--color-text)',
          maxWidth: 140,
        }}
      >
        {TRANSLITERATION_LANGUAGES.map(({ code, i18nKey }) => (
          <option key={code} value={code}>
            {t(i18nKey)}
          </option>
        ))}
      </select>
    </LabelRow>
  );
}
```

**Kluczowa różnica vs. oryginalna propozycja:** `SettingsPanel` nie ma hooka `useSettings` — `onUpdate` jest propsem (patrz linia 25: `onUpdate: (updates: Partial<AppSettings>) => void`). `onUpdate` przyjmuje `Partial<AppSettings>`, więc `${}` shallow merge w `onUpdate({...})` jest wystarczający — głęboki merge zachodzi w hooku `useSettings` w komponencie nadrzędnym.

---

## Faza 5 — i18n ✅ ZAIMPLEMENTOWANO (2026-07-15)

✅ **Faza 5 została zaimplementowana.** Klucze i18n zostały dodane do wszystkich plików `.ini` i wygenerowano `public/data.ini`.

### Zmodyfikowane pliki

- `src/l10n/_english.ini` — 30 kluczy (1 główny + 29 nazw języków)
- 28 plików `.ini` z tłumaczeniami:
  - 🇬🇧 `_english.ini`, 🇵🇱 `polish.ini`, 🇩🇪 `german.ini`, 🇫🇷 `french.ini`, 🇪🇸 `spanish.ini`
  - 🇸🇦 `arabic.ini`, 🇨🇳 `chinese-simplified.ini`, 🇹🇼 `chinese-traditional.ini`
  - 🇯🇵 `japanese.ini`, 🇮🇳 `hindi.ini`, 🇷🇺 `russian.ini`, 🇺🇦 `ukrainian.ini`
  - 🇹🇷 `turkish.ini`, 🇮🇩 `indonesian.ini`, 🇧🇷 `portuguese-br.ini`, 🇵🇹 `portuguese.ini`
  - 🇻🇳 `vietnamese.ini`, 🇬🇷 `greek.ini`, 🇩🇰 `danish.ini`, 🇳🇱 `dutch.ini`
  - 🇵🇭 `filipino.ini`, 🇨🇦 `catalan.ini`, 🇮🇳 `marathi.ini`, 🇳🇴 `norwegian.ini`
  - 🇷🇴 `romanian.ini`, 🇸🇪 `swedish.ini`, 🇹🇧 `tibetan.ini`, 🇮🇹 `italian.ini`
- `public/data.ini` — wygenerowano (28 locale'ów, 323.1 KB)

### Klucze i18n

```ini
settings-phonetic-input-enabled       = Phonetic input (transliteration)
settings-phonetic-lang-amharic        = Amharic
settings-phonetic-lang-arabic         = Arabic
settings-phonetic-lang-belarusian     = Belarusian
settings-phonetic-lang-bengali        = Bengali
settings-phonetic-lang-bulgarian      = Bulgarian
settings-phonetic-lang-chinese-hk     = Chinese (Hong Kong)
settings-phonetic-lang-chinese-simplified  = Chinese (Simplified)
settings-phonetic-lang-chinese-traditional = Chinese (Traditional)
settings-phonetic-lang-greek          = Greek
settings-phonetic-lang-gujarati       = Gujarati
settings-phonetic-lang-hebrew         = Hebrew
settings-phonetic-lang-hindi          = Hindi
settings-phonetic-lang-kannada        = Kannada
settings-phonetic-lang-malayalam      = Malayalam
settings-phonetic-lang-marathi        = Marathi
settings-phonetic-lang-nepali         = Nepali
settings-phonetic-lang-oriya          = Oriya
settings-phonetic-lang-persian        = Persian
settings-phonetic-lang-punjabi        = Punjabi
settings-phonetic-lang-russian        = Russian
settings-phonetic-lang-sanskrit       = Sanskrit
settings-phonetic-lang-serbian        = Serbian
settings-phonetic-lang-sinhalese      = Sinhalese
settings-phonetic-lang-tamil          = Tamil
settings-phonetic-lang-telugu         = Telugu
settings-phonetic-lang-thai           = Thai
settings-phonetic-lang-tigrinya       = Tigrinya
settings-phonetic-lang-ukrainian      = Ukrainian
settings-phonetic-lang-urdu           = Urdu
```

### Weryfikacja

- ✅ `npm run lint` — zero błędów
- ✅ `npx tsc --noEmit` — zero błędów
- ✅ `npm run build:locale` — pomyślnie wygenerowano `public/data.ini`
- ✅ 28 języków ma klucze `settings-phonetic-*` (w tym `italian.ini`)

---

## Faza 6 — Testy

- **Jednostkowe**: `transliteration.test.ts` (wyżej) + test dla `PhoneticInputExtension` sprawdzający: (a) handler Space zawsze zwraca `false` (spacja nigdy nie jest połykana), (b) gdy `enabled: false` → `transliterate()` nie jest wywoływane, (c) gdy `enabled: true` → `transliterate()` jest wywoływane i po resolve `insertContentAt` podmienia tekst, (d) test race conditionu — dwa równoległe zapytania, wcześniejsze wraca później niż późniejsze, asercja że `Mapping` poprawnie remapuje pozycję. **WAŻNE:** testy (c) i (d) muszą używać realnej instancji `Editor`/TipTap (nie mocka `this.editor`) — bug z `assoc` bias nie byłby wykryty przez mocki.
- **E2E** (`e2e/`): nowy scenariusz `phonetic-input.spec.ts` — włączenie ustawienia w UI, wpisanie słowa łacińskiego + spacja, asercja że w edytorze pojawia się tekst w Devanagari (można zamockować odpowiedź `/api/transliterate` na poziomie Playwright route interception, żeby test nie zależał od żywego Google API).

```ts
// e2e/phonetic-input.spec.ts (szkic)
await page.route('**/api/transliterate*', (route) =>
  route.fulfill({ json: { candidates: ['नमस्ते'] } }),
);
```

---

## Faza 7 — Weryfikacja

```bash
npm run lint
tsc --noEmit
npm run test
npm run test:e2e
npx knip
```

Wszystkie pięć musi przejść bez błędów, zgodnie z `AGENTS.md`. Zwrócić szczególną uwagę na `knip` — nowe pliki muszą być rzeczywiście zaimportowane (żaden „martwy” eksport).

---

## Faza 8 — Commit

```bash
git add -A
git commit -m "feat: add optional phonetic input (transliteration) with 29 languages"
git push
```

---

## Podsumowanie ryzyk do przeglądu przez człowieka przed mergem

1. 🔴 Stabilność `inputtools.google.com` — nieoficjalne API, brak gwarancji trwałości. **Decyzja:** czy akceptujemy ryzyko destabilizacji funkcji w przyszłości? **Mitigacja:** circuit breaker (5 błędów → skip 60s), cache w pamięci, cichy fallback na łaciński tekst.
2. ✅ Zachowanie `useEditor`/TipTap przy dynamicznej zmianie configu — rozwiązane przez getter pattern (Faza 3). Pusta tablica `deps`, config czytany z closure.
3. ✅ Circuit breaker w serwerze — po 5 kolejnych błędach upstream, pomija Google przez 60s. Cache nadal serwuje trafione wyniki. Chroni przed banem rate-limit i marnowaniem 3s per request.
4. ✅ Race condition w `PhoneticInputExtension` — rozwiązane przez ProseMirror `Mapping` (Faza 3). Każde oczekujące zastąpienie śledzi przesunięcia pozycji przez transakcje.
5. ✅ Walidacja Punjabi — kod `pu-t-i0-und` był nieprawidłowy, poprawiono na `pa-t-i0-und` (potwierdzone testem API).
6. ✅ Chinese Traditional — kod `zh-hant-t-i0-und` nie zwraca wyników, użyto `zh-hant-t-i0-pinyin` (pinyin → Traditional, potwierdzone testem API).

---

Ulepszenia po MVP (dropdown kandydatów, cache IndexedDB) opisane w `TODO_2.md`.
