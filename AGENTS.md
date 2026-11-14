# Transcribe for Amruta.org

Free, open-source transcription PWA: load audio/video (local, YouTube, Vimeo) and
transcribe in a TipTap editor with inline timestamps. React 19 + TypeScript + Vite 8
frontend, small Express 5 server for SSO and media proxies. Repo
`amrutadotorg/otranscribe`, branch `main`.

## Essentials

- **Package manager:** npm only. Use `npm ci` — the lockfile is committed.
- **Node:** `26.13.1`, pinned in `.nvmrc`. Run `nvm use` before `npm ci`.
- **Typecheck:** `npm run typecheck` (`tsc -b`). Do **not** use `npx tsc --noEmit`:
  the root `tsconfig.json` is solution-style (`files: []`), so it compiles zero files
  and exits 0.
- **Server has a separate build:** `npm run build:server` → `dist-server/`.
  `npm run server` and `npm run dev:server` execute that output; neither rebuilds or
  watches.
- **Locales are generated:** edit `src/l10n/*.ini`, then `npm run build:locale`.
  Never edit `public/locales/` by hand.

## Before you finish

All five must pass. Fix failures — don't report them and move on.

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npx knip
```

Add `npm run test:e2e` when you touch UI or player logic. CI runs the same set plus
`vite build` and `docker build`. Details: [verification](docs/agents/verification.md).

## Where to look

| Doc                                                       | Use it for                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------ |
| [verification](docs/agents/verification.md)               | What each gate covers, CI parity, when e2e is required       |
| [architecture](docs/agents/architecture.md)               | Stack, directory map, key files, cross-cutting patterns      |
| [code-conventions](docs/agents/code-conventions.md)       | Components, state, styling, TypeScript, imports, server      |
| [testing](docs/agents/testing.md)                         | Vitest/Playwright layout, fixtures, backwards-compat rules   |
| [i18n](docs/agents/i18n.md)                               | INI format, `t()`/`tHtml()`, adding a language               |
| [features](docs/agents/features.md)                       | Phonetic input, Vimeo proxy, flushSync, `.otr` compatibility |
| [deployment](docs/agents/deployment.md)                   | Docker deploy, Dependabot, Node upgrades, nginx              |
| [security-advisories](docs/agents/security-advisories.md) | Current npm overrides and accepted risks                     |

## Non-negotiables

- No new dependencies without justification; prefer native browser APIs and what's
  already installed.
- Never commit `.env` — it is gitignored and holds the Vimeo token and SSO salt.
- Commit messages follow Conventional Commits. See
  [git-workflow](docs/agents/git-workflow.md).
