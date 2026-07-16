# Project Context & Rules for AI Agents

## Overview

**oTranscribe** is a free, open-source web application for transcription. It allows users to load audio/video files (local, YouTube, Vimeo) and transcribe them with a rich text editor that supports inline timestamps. The app runs as a PWA with offline support and includes a lightweight Express server for SSO/Vimeo proxying.

## GitHub Repository

- **URL**: https://github.com/amrutadotorg/otranscribe
- **Default branch**: `main`
- **Clone**: `git clone git@github.com:amrutadotorg/otranscribe.git`

## Tech Stack

| Category         | Technology                                                                       |
| ---------------- | -------------------------------------------------------------------------------- |
| Framework        | React 19, TypeScript 6                                                           |
| Build Tool       | Vite 8                                                                           |
| Rich Text Editor | TipTap 3 (with StarterKit, Bold, Italic, Underline extensions)                   |
| Styling          | Plain CSS with CSS Custom Properties (CSS variables), no CSS modules             |
| State Management | React Context API (`PlayerContext`, `I18nContext`), custom hooks (`useSettings`) |
| Routing          | Manual view state (`AppView` type), no React Router                              |
| Testing          | Vitest (unit), Playwright (e2e)                                                  |
| Linting          | ESLint + typescript-eslint + Prettier, oxlint                                    |
| Server           | Express 4 (Node.js)                                                              |
| PWA              | vite-plugin-pwa (Workbox)                                                        |
| i18n             | Custom INI-based translation system                                              |
| Path Alias       | `@` → `./src`                                                                    |

## Scripts

```bash
npm run dev          # Vite dev server (http://localhost:5173)
npm run build        # tsc -b && vite build → dist/
npm run preview      # Preview production build locally
npm run test         # Vitest unit tests (single run)
npm run test:watch   # Vitest in watch mode
npm run test:ui      # Vitest with browser UI
npm run test:e2e     # Playwright end-to-end tests
npm run test:e2e:ui  # Playwright with browser UI
npm run lint         # ESLint on src/ (.ts, .tsx)
npm run build:locale # Build per-language locale files → public/locales/{code}.ini + manifest.json
npm run build:server # Compile Express server → dist-server/
npm run server       # Run production server (requires build:server first)
npm run dev:server   # Run server in development mode
npx knip             # Find unused deps, exports, types (via knip.json config)
```

**Note:** There is no dedicated `typecheck` script. Use `tsc --noEmit` directly, or rely on `npm run build` which runs `tsc -b` as a first step.

## Docker Deployment

```bash
docker compose --progress=plain build transcribe   # Build production image
docker compose up -d --force-recreate transcribe   # Deploy (recreate container)
```

The image is `transcribe:prod`. The app runs on the host port defined in `docker-compose.yml`. After deploying, users must hard-refresh (Ctrl+Shift+R) or unregister the service worker to see changes, since VitePWA caches JS bundles.

## Verification Workflow

Before considering any task complete, run ALL of the following:

```bash
npm run lint         # 1. Lint — must pass with zero errors
tsc --noEmit         # 2. Typecheck — must compile with zero errors
npm run test         # 3. Unit tests — all must pass
npm run test:e2e     # 4. E2E tests — all must pass (if changed UI or player logic)
npx knip             # 5. Dead code — must report zero unused files/exports
```

If any step fails, fix the issue before proceeding. Never commit code that doesn't compile or fails lint.

## Git Workflow

After completing a task and passing all verification steps, commit and push the changes:

```bash
git add -A
git commit -m "<type>: <short description>"
git push
```

**Commit message format** (Conventional Commits):

- `feat:` — new feature or functionality
- `fix:` — bug fix
- `refactor:` — code restructuring without behavior change
- `docs:` — documentation only
- `style:` — formatting, whitespace, no logic change
- `test:` — adding or updating tests
- `chore:` — build, config, dependencies, tooling

**Examples:**

- `feat: add dark mode toggle to settings panel`
- `fix: resolve timestamp parsing for legacy .otr files`
- `refactor: extract player driver creation into helper`
- `chore: update Vite to v8.1.0`

## Environment Variables

The server requires a `.env` file in the project root:

```env
VIMEO_ACCESS_TOKEN=<your_vimeo_api_token>   # Required for Vimeo video downloads
SSO_SALT=<random_hex_string>                # Required for SSO middleware
PORT=3000                                   # Optional, defaults to 3000
```

**Setup:**

1. Copy `.env.example` (if exists) or create `.env` manually
2. Obtain a Vimeo API token from https://developer.vimeo.com/
3. Generate a random hex string for `SSO_SALT` (e.g., `openssl rand -hex 32`)

The `.env` file is gitignored — never commit it.

## Directory Structure

```
├── src/
│   ├── main.tsx                    # Entry point, mounts <App />
│   ├── App.tsx                     # Root component, view routing, theme
│   ├── App.css                     # (Legacy styles, mostly moved to index.css)
│   ├── index.css                   # Global CSS: design tokens, layout, components
│   ├── assets/                     # Static assets (images, icons)
│   ├── components/                 # UI components (one per file)
│   │   ├── StartView.tsx           # Landing screen with media source selection
│   │   ├── TranscribeView.tsx      # Main transcription workspace
│   │   ├── TopBar.tsx              # Player controls + toolbar
│   │   ├── TextPanel.tsx           # TipTap editor wrapper
│   │   ├── QuickTutorial.tsx       # Editor onboarding overlay
│   │   ├── FormatToolbar.tsx       # Bold/italic/underline buttons
│   │   ├── SettingsPanel.tsx       # Slide-in settings
│   │   ├── BackupPanel.tsx         # Slide-in backup manager
│   │   ├── HelpPanel.tsx           # Slide-in help/shortcuts
│   │   ├── UrlInputModal.tsx       # YouTube/Vimeo URL input dialog
│   │   ├── Tooltip.tsx             # Floating tooltip wrapper
│   │   └── NarrowScreenWarning.tsx # Mobile breakpoint warning
│   ├── l10n/                       # Locale source files (.ini)
│   │   ├── _english.ini            # English (source of truth for translations)
│   │   ├── arabic.ini              # Arabic
│   │   ├── french.ini              # French
│   │   └── ...                     # (28 languages total)
│   ├── modules/                    # Feature modules (domain logic)
│   │   ├── audio-engine/           # Player abstraction + drivers
│   │   │   ├── Player.ts           # Player interface + factory
│   │   │   ├── PlayerContext.tsx    # React context for player state
│   │   │   └── drivers/            # HTML5 audio/video, YouTube iframe
│   │   ├── editor/                 # TipTap editor setup
│   │   │   ├── Editor.tsx          # Main editor component
│   │   │   ├── PhoneticInputExtension.ts  # TipTap extension for phonetic input
│   │   │   ├── transliteration.ts  # Client-side transliteration fetch wrapper
│   │   │   ├── transliterationLanguages.ts  # Language metadata (code + i18n key pairs)
│   │   │   ├── TimestampExtension.ts  # Custom TipTap node
│   │   │   ├── TimestampNode.ts    # Node schema definition
│   │   │   ├── TimestampNodeView.tsx  # Node React rendering
│   │   │   └── pasteCleanup.ts     # HTML paste normalization
│   │   ├── file-io/                # Import/export logic
│   │   │   ├── importFile.ts       # .otr file import
│   │   │   ├── exportFormats.ts    # Export to txt/md/otr
│   │   │   ├── otrFormat.ts        # .otr JSON format parser/serializer
│   │   │   └── __tests__/          # Unit tests for file-io
│   │   ├── platform/               # Platform detection
│   │   │   └── detectPlatform.ts   # Mac/Windows detection, shortcut display
│   │   ├── settings/               # Settings persistence
│   │   │   ├── useSettings.ts      # Hook: localStorage read/write + deep merge
│   │   │   └── defaults.ts         # Default settings values
│   │   ├── storage/                # Local storage & caching
│   │   │   ├── storageKeys.ts      # Centralized localStorage key constants
│   │   │   ├── autosave.ts         # Periodic autosave
│   │   │   ├── backupManager.ts    # Backup creation/restore
│   │   │   ├── vimeoCache.ts       # Vimeo download + cache (IndexedDB)
│   │   │   └── migrateLegacyData.ts # Legacy data migration
│   │   └── shell/                  # App shell utilities
│   │       └── i18n/               # Internationalization
│   │           ├── I18nContext.tsx  # Translation context + hook
│   │           └── iniParser.ts    # INI file parser for locales
│   ├── server/                     # Express server (separate build)
│   │   ├── index.ts                # Server entry point
│   │   ├── sso.ts                  # SSO middleware
│   │   ├── vimeoProxy.ts           # Vimeo proxy endpoint
│   │   └── transliterateProxy.ts   # Transliteration proxy endpoint
│   └── types/                      # TypeScript type definitions
│       ├── otr.d.ts                # .otr file format types
│       ├── player.d.ts             # Player state/driver types
│       └── settings.d.ts           # AppSettings interface
├── e2e/                            # Playwright end-to-end tests
│   └── smoke.spec.ts               # Basic smoke test
├── test-fixtures/                  # Test data files (.otr fixtures)
├── scripts/                        # Build scripts
│   └── build-locale.mjs            # Locale file builder
├── public/
│   └── locales/                    # Per-language locale files (generated, do not edit directly)
│       ├── {code}.ini              # One file per language (e.g. pl.ini, de.ini)
│       └── manifest.json           # List of available language codes
├── vite.config.ts                  # Vite config (PWA, proxy, aliases)
├── tsconfig.json                   # TS config (references app + node)
├── tsconfig.app.json               # TS config for app source
├── tsconfig.node.json              # TS config for server source
├── eslint.config.js                # ESLint flat config
├── knip.json                       # Knip dead-code analysis config (ignores server/)
├── playwright.config.ts            # Playwright config
├── .env                            # Environment variables (gitignored)
└── package.json                    # Dependencies & scripts
```

## Coding Guidelines & Best Practices

### Component Design

- **Functional components only** — no class components
- **One component per file** — filename matches the component name (e.g., `TopBar.tsx` exports `TopBar`)
- **Interface-based props** — define a `Props` interface at the top of each component file
- **Default exports** for components; named exports for hooks, utilities, and types
- **File-level JSDoc comment** at the top of each component explaining its purpose

**Reference example** (minimal component following all conventions):

```tsx
/**
 * StatusBadge.tsx — Displays a colored badge for entity status
 */

import type { AppSettings } from '../types/settings';

interface Props {
  status: 'active' | 'inactive' | 'error';
  label?: string;
  settings: AppSettings;
}

export default function StatusBadge({ status, label, settings }: Props) {
  const colorMap = {
    active: 'var(--color-success)',
    inactive: 'var(--color-text-muted)',
    error: 'var(--color-danger)',
  };

  return (
    <span
      className="status-badge"
      style={{ color: colorMap[status] }}
      aria-label={label ?? status}
    >
      {label ?? status}
    </span>
  );
}
```

### State Management

- **React Context** for global state: `PlayerContext` (player state), `I18nContext` (translations)
- **Custom hooks** for feature-specific state: `useSettings()`, `usePlayer()`
- **No Redux/Zustand** — keep state local unless it must be shared across components
- **localStorage** for persistence (settings, backups) — centralized via `STORAGE_KEYS` constants

### Styling

- **Plain CSS** with CSS Custom Properties — no CSS modules, no Tailwind, no styled-components
- **All design tokens** defined in `src/index.css` `:root` block (colors, spacing, typography, shadows, radii)
- **Dark/light theming** via `.dark` class on `<html>` — variables change automatically
- **BEM-like naming** for CSS classes: `.topbar`, `.topbar-brand`, `.start-card`, `.player-btn.primary`
- **Inline styles** used sparingly for dynamic values (e.g., progress bars, conditional layouts)

### TypeScript

- **Strict mode** enabled — no `any` (use sparingly, prefer `unknown`)
- **`verbatimModuleSyntax: true`** — use `import type` for type-only imports
- **Type definitions** in `src/types/` as `.d.ts` files for shared interfaces
- **No enums** — use string literal unions (e.g., `type AppView = 'start' | 'transcribe'`)

### Imports

- **Path alias**: `@/` resolves to `src/` — use it for all internal imports
- **Import order**: React → third-party → local modules → types → styles
- **Type-only imports**: always use `import type { Foo } from '...'`

### Testing

- **Unit tests**: Vitest, colocated in `__tests__/` directories within modules
- **E2E tests**: Playwright, in `e2e/` directory
- **Test file naming**: `*.test.ts` or `*.spec.ts`
- **Fixture-based testing**: test data in `test-fixtures/` directory

### Server

- **Separate TypeScript project** (`tsconfig.node.json`) — compiled to `dist-server/`
- **Express** with modular route handlers in `src/server/`
- **Environment variables** via `dotenv`

## Dependencies

- **Do not add new dependencies without explicit justification.** Prefer native browser APIs or existing libraries.
- **Run `npm audit` after any change to `package.json`** to catch vulnerabilities early.
- **Peer dependency conflicts**: TipTap and Floating UI have specific peer dep requirements — verify compatibility before upgrading React or other core libs.
- **Bundle size matters**: The PWA ships to production. Use dynamic imports for large optional features (e.g., YouTube iframe API).

## i18n — Translation System

The app uses a custom INI-based translation system (replaces the legacy `webl10n` library).

### Locale file format (`public/locales/{code}.ini`)

Each language lives in its own file (e.g. `public/locales/pl.ini`). The default language (en-US) is inlined into the JS bundle at build time.

```ini
[en-US]
; Comments start with ; or #
help                = Help
start-loading       = Loading...
choose-file         = Choose audio (or video) file
wordcount           = {{n}} words
export-markdown     = Markdown (.md)
```

**Rules:**

- Section header is a BCP-47 language code: `[en-US]`, `[de]`, `[pl]`, etc.
- Keys are lowercase, hyphen-separated: `error-youtube-url`, `settings-title`
- Variable interpolation: `{{n}}`, `{{name}}` — replaced at runtime
- HTML values: suffix key with `.innerHTML` (e.g., `start-description.innerHTML = <b>Bold</b>`)
- Fallback: if a key is missing in the target language, en-US value is used (inlined in JS bundle)

### Editing translations

1. **Source locale files** live in `src/l10n/` (referenced via `scripts/build-locale.mjs`)
2. **Edit** the `.ini` files in that directory (or add new keys to `_english.ini`)
3. **Run** `npm run build:locale` to regenerate `public/locales/{code}.ini` + `manifest.json` + `src/l10n/generated/defaultLocale.ts`
4. **Never edit `public/locales/` directly** — it will be overwritten on next build

### Usage in code

```tsx
import { useTranslation } from '../modules/shell/i18n/I18nContext';

function MyComponent() {
  const { t, tHtml } = useTranslation();

  return (
    <div>
      <p>{t('choose-file')}</p>
      <p>{t('wordcount', { n: 42 })}</p>
      <p dangerouslySetInnerHTML={{ __html: tHtml('start-description')! }} />
    </div>
  );
}
```

## Known Issues / Gotchas

### Phonetic input (transliteration) — Phases 0-5 implemented

Phases 0-5 of the phonetic input feature are implemented and deployed. The feature adds optional Latin → script transliteration (e.g. Devanagari, Arabic, Cyrillic) to the TipTap editor, using Google's `inputtools.google.com` API via a server-side proxy.

**How it works:** User types Latin text, presses Space, and the last word is transparently replaced with the top transliteration candidate from Google's API. Space is inserted immediately (no lag); replacement happens in the background.

**Key files:**

- `src/server/transliterateProxy.ts` — Express proxy endpoint (`GET /api/transliterate`) with LRU cache, circuit breaker, per-IP rate limiter
- `src/modules/editor/transliteration.ts` — Client-side `transliterate()` fetch wrapper (returns `[]` on any failure for silent fallback)
- `src/modules/editor/PhoneticInputExtension.ts` — TipTap extension: intercepts Space, extracts Latin word, replaces via async API call. Uses ProseMirror `Mapping` for correct concurrent word replacement
- `src/modules/editor/transliterationLanguages.ts` — Single source of truth for 29 supported languages (code + i18n key pairs)
- `src/types/settings.d.ts` — `PhoneticInputSettings` interface (`enabled`, `lang`)
- `src/modules/settings/defaults.ts` — Default: `enabled: false`, `lang: 'sa-t-i0-und'` (Sanskrit)
- `src/components/SettingsPanel.tsx:299-337` — Settings UI: checkbox to enable + language select dropdown
- `src/l10n/_english.ini` — 30 i18n keys (1 toggle label + 29 language names)
- `public/locales/{code}.ini` — Per-language locale files (e.g. `public/locales/pl.ini`)
- `public/locales/manifest.json` — List of available language codes

**Settings persistence:** `phoneticInput` is part of `AppSettings`, stored in localStorage via `useSettings` hook.

**Config update pattern:** `Editor.tsx` uses a `useRef(settings)` to ensure `PhoneticInputExtension`'s `getConfig` getter always reads the latest settings without recreating the editor (which would destroy undo history).

**Offline behavior:** `transliterate()` checks `navigator.onLine` and returns `[]` when offline — the editor falls back to plain Latin input.

**Remaining phases:** Phase 6 (tests), Phase 7 (full verification), Phase 8 (commit + push). See `TODO.md` for details.

### Vimeo — SDK integration abandoned

We attempted to use the official Vimeo JavaScript Player SDK (`@vimeo/player`) for embedded playback but abandoned it due to:

- CORS restrictions preventing programmatic download of the video file
- The SDK only exposes an `<iframe>` player — no access to the raw video stream for caching
- No way to read the video blob for IndexedDB caching or offline playback

**Current approach:** Server-side proxy (`src/server/vimeoProxy.ts`) that calls the Vimeo REST API with a server-held access token, streams the download to the client, and caches it in IndexedDB. This keeps the token secret and enables offline playback.

**Do not reintroduce `@vimeo/player` SDK** — use the proxy pattern instead.

### flushSync usage in PlayerContext

`PlayerContext.tsx` uses `flushSync` from `react-dom` to synchronously update the DOM (set `driverType`) before `createPlayer()` appends child elements into `#media-container`. This is intentional — removing it will cause a race condition where the player driver tries to append into a container that React hasn't rendered yet.

### Legacy .otr format compatibility

The `.otr` file parser (`otrFormat.ts`) handles both legacy MM:SS timestamps (string `"2:03"`) and modern numeric timestamps (`123.45`). Tests cover both formats. When modifying the parser, run the full test suite to ensure backwards compatibility.

## Key Files

| File                                         | Purpose                                             |
| -------------------------------------------- | --------------------------------------------------- |
| `src/main.tsx`                               | Entry point — mounts React, runs migration          |
| `src/App.tsx`                                | Root component — view routing, theme, providers     |
| `src/index.css`                              | Design system — all CSS tokens and global styles    |
| `src/modules/audio-engine/PlayerContext.tsx` | Global player state + controls                      |
| `src/modules/settings/useSettings.ts`        | Settings persistence hook                           |
| `src/modules/editor/Editor.tsx`              | TipTap editor setup                                 |
| `src/modules/file-io/otrFormat.ts`           | .otr file format parser/serializer                  |
| `src/types/settings.d.ts`                    | `AppSettings` interface definition                  |
| `src/types/otr.d.ts`                         | `.otr` file format types                            |
| `vite.config.ts`                             | Build config, PWA, aliases, proxy                   |
| `tsconfig.app.json`                          | TypeScript strict config for app                    |
| `eslint.config.js`                           | Linting rules                                       |
| `package.json`                               | Scripts: `dev`, `build`, `test`, `lint`, `test:e2e` |

## Common Patterns

- **View routing**: `AppView` type (`'start' | 'transcribe'`) controlled by `useState` in `App.tsx`
- **Custom events**: `editor:focus`, `editor:format` dispatched via `document.dispatchEvent(new CustomEvent(...))`
- **flushSync**: Used in `PlayerContext` to synchronously update DOM before driver initialization
- **Deep merge**: Settings use recursive deep merge for partial updates
- **Translation**: `useTranslation()` hook returns `t(key)` and `tHtml(key)` functions
