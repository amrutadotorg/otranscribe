# Verification

Every task ends with the same five gates. They are fast; run them, don't guess.

| #   | Command                | What it covers                                                   |
| --- | ---------------------- | ---------------------------------------------------------------- |
| 1   | `npm run format:check` | Prettier over **the whole repo**, including `.yml`/`.json`/`.md` |
| 2   | `npm run lint`         | ESLint on `src/**/*.{ts,tsx}` only                               |
| 3   | `npm run typecheck`    | `tsc -b` over `tsconfig.app.json` + `tsconfig.node.json`         |
| 4   | `npm run test`         | Vitest single run                                                |
| 5   | `npx knip`             | Unused files, exports and dependencies                           |

## Gate notes

**Formatting covers YAML.** CI runs `prettier --check .` from the repo root, so
`docker-compose.prod.yml` and `.github/*.yml` are in scope. Prettier normalises
quoting — write `'false'`, not `"false"`. Run `npm run format` to fix everything
before committing.

**Lint scope is narrow.** `eslint src` skips `scripts/`, `e2e/` and config files
(`eslint.config.js` also ignores `dist/`, `dist-server/`, `node_modules/`). A clean
lint does not mean `scripts/build-locale.mjs` is correct. `no-explicit-any` is a
**warning**, so a clean run can still contain `any`.

**Typecheck runs project builds.** `tsc -b` is incremental and caches in
`node_modules/.tmp/`; it is the only command that actually checks types. The root
`tsconfig.json` has `files: []` and only `references`, which is why `tsc --noEmit`
at the root is a no-op that exits 0.

**Knip ignores the server.** `knip.json` sets `ignore: ["src/server/**"]`, so unused
server exports won't be reported. Knip needs a recent Node — if it crashes with an
array-buffer or ABI error, check `node -v` against `.nvmrc`.

## When e2e is required

Run `npm run test:e2e` in addition to the five gates whenever the change touches:

- anything under `src/components/` or `src/modules/editor/`,
- player logic (`src/modules/audio-engine/`),
- keyboard shortcuts or the paste pipeline.

Playwright starts its own dev server on `http://localhost:5173` and reuses one that
is already running, so no manual `npm run dev` is needed.

## CI parity

`.github/workflows/ci.yml` runs, on every push and PR to `main`:

```text
npm ci → lint → format:check → test → build (tsc -b && vite build) → knip
      → playwright install chromium → test:e2e → docker build
```

Green CI is the same bar as local verification, plus the production bundle and
image build. Do not push code that fails any gate locally.
