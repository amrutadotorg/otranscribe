# Architecture

## Stack

| Concern     | Choice                                                                    |
| ----------- | ------------------------------------------------------------------------- |
| UI          | React 19, TypeScript 6, Vite 8                                            |
| Editor      | TipTap 3 (StarterKit + Bold/Italic/Underline, custom Timestamp node)      |
| Styling     | Plain CSS + custom properties in `src/index.css`; no CSS modules/Tailwind |
| State       | React Context (`PlayerContext`, `I18nContext`) + hooks (`useSettings`)    |
| Routing     | Manual `AppView` state in `App.tsx`; no React Router                      |
| Persistence | `localStorage` (settings, backups) + IndexedDB (Vimeo cache)              |
| Server      | Express 5, separate TS project → `dist-server/`                           |
| PWA         | `vite-plugin-pwa` (Workbox)                                               |
| i18n        | Custom INI parser, per-language files                                     |
| Tests       | Vitest (jsdom) + Playwright (chromium)                                    |

## Directory map

```text
src/
├── main.tsx                  entry; mounts <App />, runs legacy migration
├── App.tsx                   view routing, theme, providers
├── index.css                 design tokens + global styles
├── __tests__/                cross-cutting tests (contrast)
├── components/               one component per file
│   └── start-view/           useMediaLoader hook (URL validation + loading)
├── l10n/                     translation sources (.ini) + generated/
├── modules/
│   ├── audio-engine/         Player interface, factory, PlayerContext, drivers/
│   ├── editor/               TipTap setup, timestamp node, phonetic input
│   ├── file-io/              .otr import/export, txt/md export
│   ├── platform/             Mac/Windows detection, shortcut labels
│   ├── settings/             useSettings hook + defaults
│   ├── storage/              autosave, backups, Vimeo cache, migration
│   ├── shell/                i18n context/parser, URL params
│   └── vimeo/                Vimeo URL validation
├── server/                   Express: index, sso, vimeoProxy, transliterateProxy
└── types/                    shared .d.ts (otr, player, settings)
```

Outside `src/`: `e2e/` (Playwright), `test-fixtures/` (`.otr` + audio),
`scripts/build-locale.mjs`, `public/locales/` (generated — do not edit).

## Key files

| File                                         | Purpose                                     |
| -------------------------------------------- | ------------------------------------------- |
| `src/App.tsx`                                | View state, theme, provider composition     |
| `src/modules/audio-engine/PlayerContext.tsx` | Global player state + controls              |
| `src/modules/editor/Editor.tsx`              | TipTap configuration                        |
| `src/modules/file-io/otrFormat.ts`           | `.otr` parse/serialise                      |
| `src/modules/settings/useSettings.ts`        | Settings persistence + deep merge           |
| `src/types/settings.d.ts`                    | `AppSettings` — the settings schema         |
| `vite.config.ts`                             | Build, PWA, proxy, `@` alias, Vitest config |

## Cross-cutting patterns

- **View routing** is a `useState<AppView>` in `App.tsx` (`'start' | 'transcribe'`).
  No router, no URL sync — keep it that way unless asked.
- **Custom DOM events** (`editor:focus`, `editor:format`) are dispatched via
  `document.dispatchEvent(new CustomEvent(...))` to reach the editor from the
  toolbar, which lives outside the editor tree.
- **Settings are deep-merged** with `DEFAULT_SETTINGS`, so partial or older stored
  objects remain valid. New settings fields need a default in
  `src/modules/settings/defaults.ts`.
- **localStorage keys** are centralised in `src/modules/storage/storageKeys.ts`; never
  hard-code a key string.
- **Player drivers** implement the `Player` interface (`HTML5AudioDriver`,
  `HTML5VideoDriver`, `YouTubeDriver`). Adding a source type means adding a driver,
  not branching in components.
- **`flushSync` in `PlayerContext`** is deliberate — see
  [features](features.md#flushsync-in-playercontext).
