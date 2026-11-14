# Testing

## Unit tests — Vitest

- Colocated in `__tests__/` next to the module they cover:
  `src/modules/file-io/__tests__/otrFormat.test.ts`.
- Naming: `*.test.ts` / `*.test.tsx`.
- Environment: `jsdom` globally (`vite.config.ts` → `test.environment`), `globals:
true` so `describe`/`it`/`expect` need no import.
- `e2e/**` is excluded from Vitest; a `.spec.ts` in `e2e/` is not a unit test.
- Per-file environment override when needed (e.g. `src/__tests__/contrast.test.ts`
  uses `@vitest-environment node` because it only reads CSS text).

Current coverage lives in `audio-engine/`, `editor/`, `file-io/`, `settings/`,
`server/` and `src/__tests__/`. New domain logic belongs in a `__tests__/` folder
alongside it — not in `e2e/`.

## E2E tests — Playwright

- Directory: `e2e/`, naming `*.spec.ts`.
- Chromium only, `workers: 1`, retries in CI only.
- `webServer` boots `npm run dev` on `http://localhost:5173` and reuses an existing
  server, so a `nohup npm run dev &` will not be killed.
- `baseURL` is `http://localhost:5173`; navigate with relative paths.
- `testDir` is `./e2e` — Playwright will not pick up unit tests.

Use e2e for behaviour a unit test cannot see: the editor accepting keystrokes,
timestamps being inserted, the player wiring up.

## Fixtures

`test-fixtures/` holds real files used by tests:

```text
otr/
├── legacy-timestamp.otr     MM:SS string timestamps
├── modern-timestamp.otr     numeric seconds
├── multilang.otr            non-Latin content
├── youtube-source.otr       YouTube-backed document
├── no-media.otr             document without a media reference
└── bold-italic.otr          inline formatting
silence.wav                  audio for player tests
```

Add a fixture rather than inlining a large JSON blob in a test.

## Backwards compatibility rule

`otrFormat.ts` must keep reading **both** legacy `"2:03"` strings and modern numeric
`123.45` timestamps. Any change to the parser requires `npm run test` — and if the
change affects loading, the e2e suite too. Existing `.otr` files are user data;
breaking them is data loss.
