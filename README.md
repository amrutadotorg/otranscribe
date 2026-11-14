# Transcribe for Amruta.org

A free, open-source web application for transcription, inspired by [otranscribe.com](https://otranscribe.com/) and rewritten from scratch on a modern stack.

Load audio/video files (local, YouTube, Vimeo) and transcribe them with a rich text editor that supports inline timestamps. Runs as a PWA with offline support.

> **Note:** Vimeo integration uses a server-side proxy with a `VIMEO_ACCESS_TOKEN` to handle CORS and enable caching. The token is kept on the server and never exposed to the client.

## Tech Stack

- React 19 + TypeScript 6
- Vite 8 (build + dev server)
- TipTap 3 (rich text editor with timestamps)
- Express 5 (server for SSO, Vimeo proxy, transliteration)
- Vitest + Playwright (unit + e2e tests)

## Development

Requires Node `26.13.1` (see `.nvmrc`).

```bash
nvm use
npm ci
cp .env.example .env   # then fill in VIMEO_ACCESS_TOKEN, SSO_SALT
npm run dev             # Vite dev server (http://localhost:5173)
```

The Express server is a separate build; `dev:server` runs the compiled output, it
does not watch:

```bash
npm run build:server    # → dist-server/
npm run dev:server      # Express server
```

## Build & Deploy

```bash
npm run build           # tsc -b && vite build → dist/
npm run build:server    # → dist-server/

# The compose project lives in ~/containers (my_network and the shared
# anchors are defined there); this repo only contributes a fragment.
cd ~/containers
docker compose --progress=plain build transcribe
docker compose up -d --force-recreate transcribe
docker exec nginx nginx -t && docker exec nginx nginx -s reload
```

After deploying, hard-refresh (Ctrl+Shift+R) or unregister the service worker to
pick up the new bundle.

## Testing

```bash
npm run lint            # ESLint
npm run typecheck       # tsc -b
npm run test            # Vitest unit tests
npx playwright install chromium   # once
npm run test:e2e        # Playwright end-to-end tests
```

The full pre-commit gate set (plus `format:check` and `knip`) is in
[AGENTS.md](AGENTS.md); contributor conventions live in [docs/agents](docs/agents/).

## License

Open source — see repository for details.
