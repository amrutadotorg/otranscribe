# Feature notes

Non-obvious implementation details that are easy to undo by accident.

## Phonetic input (transliteration)

Optional Latin → script transliteration (Devanagari, Arabic, Cyrillic, …) in the
editor. Type Latin, press Space: the word is transliterated in the background and
replaced when the response arrives. Space is never delayed.

Flow: `PhoneticInputExtension` intercepts Space → `transliteration.ts` calls
`GET /api/transliterate` → `transliterateProxy.ts` calls Google Input Tools with an
LRU cache, circuit breaker and per-IP rate limit → top candidate replaces the word
via a ProseMirror `Mapping` (so concurrent edits elsewhere don't corrupt positions).

Key files:

| File                                             | Role                                                    |
| ------------------------------------------------ | ------------------------------------------------------- |
| `src/modules/editor/PhoneticInputExtension.ts`   | Space interception + replacement                        |
| `src/modules/editor/transliteration.ts`          | Client fetch wrapper; returns `[]` on any failure       |
| `src/modules/editor/transliterationLanguages.ts` | 29 languages (code + i18n key) — single source of truth |
| `src/server/transliterateProxy.ts`               | Server proxy, cache, breaker, limiter                   |
| `src/components/SettingsPanel.tsx`               | Enable toggle + language select                         |

Behaviour to preserve:

- **Silent failure.** No network, offline (`navigator.onLine` is checked first),
  proxy error, or empty result → plain Latin text stays. Never surface a toast.
- **No editor recreation.** `Editor.tsx` reads settings through a `useRef(settings)`
  so toggling transliteration does not rebuild the editor and destroy undo history.
- **Settings shape.** `phoneticInput: { enabled, lang }` in `AppSettings`, default
  `enabled: false`, `lang: 'sa-t-i0-und'` (Sanskrit).
- **Fallback default.** If you add a language to `transliterationLanguages.ts`, add
  its label key to `src/l10n/_english.ini` and rebuild locales.

## Vimeo — use the proxy, not the SDK

The official `@vimeo/player` SDK cannot download or expose the stream (CORS, iframe
only), which breaks IndexedDB caching and offline playback. The working design is:

`vimeoProxy.ts` calls the Vimeo REST API with the server-held `VIMEO_ACCESS_TOKEN`,
streams the file to the client, and `vimeoCache.ts` stores it in IndexedDB.

**Do not reintroduce `@vimeo/player`.** The token must stay server-side.

## flushSync in PlayerContext

`PlayerContext.tsx` calls `flushSync` to commit `driverType` before `createPlayer()`
appends elements into `#media-container`. This is deliberate, not an oversight.
Removing it makes the driver append into a container React has not rendered yet —
a race that shows up as a missing or duplicated player element.

## Legacy `.otr` compatibility

`otrFormat.ts` accepts both legacy `"2:03"` string timestamps and modern numeric
`123.45` seconds, and both are covered by fixtures and tests. Treat old `.otr` files
as user data: any parser change must keep both formats loading. See
[testing](testing.md#backwards-compatibility-rule).

## YouTube

The iframe API is loaded dynamically (bundle size), and `YouTubeDriver` implements
the same `Player` interface as the HTML5 drivers. Source detection/validation lives
in `src/components/start-view/useMediaLoader.ts`; Vimeo URL validation lives in
`src/modules/vimeo/vimeoUrl.ts`.
