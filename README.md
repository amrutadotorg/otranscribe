# Transcribe for Amruta.org

A free, open-source web application for transcription, inspired by [otranscribe.com](https://otranscribe.com/) and rewritten from scratch on a modern stack.

Load audio/video files (local, YouTube, Vimeo) and transcribe them with a rich text editor that supports inline timestamps. Runs as a PWA with offline support.

> **Note:** Vimeo integration uses a server-side proxy with a `VIMEO_ACCESS_TOKEN` to handle CORS and enable caching. The token is kept on the server and never exposed to the client.

## Tech Stack

- React 19 + TypeScript 6
- Vite 8 (build + dev server)
- TipTap 3 (rich text editor with timestamps)
- Express 4 (server for SSO, Vimeo proxy, transliteration)
- Vitest + Playwright (unit + e2e tests)

## Development

```bash
npm install
cp .env.example .env   # then fill in VIMEO_ACCESS_TOKEN, SSO_SALT
npm run dev             # Vite dev server (http://localhost:5173)
npm run dev:server      # Express server
```

## Build & Deploy

```bash
npm run build           # tsc -b && vite build → dist/
docker compose --progress=plain build transcribe
docker compose up -d --force-recreate transcribe
```

## Testing

```bash
npm run test            # Vitest unit tests
npm run test:e2e        # Playwright end-to-end tests
npm run lint            # ESLint
```

## License

Open source — see repository for details.
