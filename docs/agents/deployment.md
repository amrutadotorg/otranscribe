# Deployment

## Where commands run

This repo is a **fragment** of the server-wide compose project. `my_network` and the
shared anchors exist only in `~/containers/compose.yml`, which `include:`s this
repo's `docker-compose.prod.yml`. Running compose against the fragment alone fails
with "service refers to undefined network my_network".

Always prefix compose commands with `cd ~/containers`:

```bash
cd ~/containers
docker compose config -q                            # validate merged config
docker compose --progress=plain build transcribe    # build transcribe:prod
docker compose up -d --force-recreate transcribe    # deploy
docker exec nginx nginx -t && docker exec nginx nginx -s reload
uv run --project ~/SCRIPTS/py_amr -m waf.purge_cache --host transcribe.amruta.org
```

Reload nginx whenever the container was recreated. Prefer validate + reload over
`docker restart nginx` — a restart drops all sites and hides config errors until the
next request.

## Container facts

- Image `transcribe:prod`, built locally (`pull_policy: never`), so DIUN is disabled
  for it via a label. Its base image is watched separately (see below).
- Service name and container name: `transcribe`.
- Pinned at `192.168.1.110` on `my_network`; nginx caches upstream IPs at config load,
  so the address must not drift.
- The container listens on `3000` (`EXPOSE`, `PORT` default in `src/server/index.ts`).
  There is **no `docker-compose.yml`** here and no published host port — nginx
  terminates and proxies, config in
  `~/containers/nginx/sites/transcribe.amruta.org.conf`.
- `env_file: .env` is required at runtime (Vimeo token, SSO salt).

## After deploying

VitePWA precaches JS bundles, so returning users keep the old build until the service
worker updates. Tell testers to hard-refresh (Ctrl+Shift+R) or unregister the service
worker when verifying a deploy.

## Dependabot (monthly)

`.github/dependabot.yml` opens PRs **monthly** for two ecosystems:

- **npm** — patch and minor grouped into one PR; majors separate.
- **docker** — the pinned `node:<version>-alpine` tag.

CI lints, tests, builds the app, runs e2e and runs `docker build` on every PR, so a
green PR is safe to merge.

After merging:

```bash
git pull origin main
nvm use && npm ci

cd ~/containers
docker compose --progress=plain build transcribe
docker compose up -d --force-recreate transcribe
docker exec nginx nginx -t && docker exec nginx nginx -s reload
uv run --project ~/SCRIPTS/py_amr -m waf.purge_cache --host transcribe.amruta.org
```

## Node runtime pins

These move together; CI reads `.nvmrc`, so a mismatch surfaces as a confusing build
failure rather than a clear error.

| File                             | Value                        | Changes when                            |
| -------------------------------- | ---------------------------- | --------------------------------------- |
| `.nvmrc`                         | `26.13.1` (also CI's source) | every bump                              |
| `package.json` → `engines.node`  | `>=26`                       | major only                              |
| `Dockerfile` → both `FROM` lines | `node:26.13.1-alpine`        | every bump                              |
| `Dockerfile` → `npm install -g`  | `npm@12.0.1` (both stages)   | only to override the bundled npm        |
| `package.json` → `@types/node`   | `^26.6.6`                    | major only (patch/minor via Dependabot) |

## Two signals, two actions

**Dependabot PR (docker ecosystem)** — the tag string changed. Merge, then run the
post-merge workflow above.

**DIUN notification for `node:26-alpine`** — the floating tag's digest changed. That
can mean a new Node release _or_ an upstream rebuild of the same version (Alpine
patch, bundled npm). Check which:

```bash
curl -s "https://hub.docker.com/v2/repositories/library/node/tags?page_size=100&name=26." \
  | python3 -c "import sys,json;print('\n'.join(t['name'] for t in json.load(sys.stdin)['results']))"
```

- **Newer version exists** → bump the pins above, merge, deploy.
- **Same version** → no file changes and nothing to commit; just rebuild so the image
  picks up the refreshed base:

```bash
cd ~/containers
docker compose --progress=plain build --pull transcribe   # --pull is required
docker compose up -d --force-recreate transcribe
docker exec nginx nginx -t && docker exec nginx nginx -s reload
uv run --project ~/SCRIPTS/py_amr -m waf.purge_cache --host transcribe.amruta.org
```

Without `--pull`, BuildKit reuses the cached base digest and still reports success.
Verify the base actually moved before deploying:

```bash
docker history --format '{{.CreatedBy}}' transcribe:prod | grep -o 'alpine-minirootfs-[0-9.]*-aarch64'
docker run --rm --entrypoint node transcribe:prod -v   # expect the pinned version
```

## Node major upgrade (e.g. 26 → 28)

Same pins, plus one file **outside this repo**: DIUN watches the floating tag, so
`~/containers/diun/custom-images.yml` must follow, or DIUN keeps watching an EOL tag
and silently stops reporting.

```bash
cd ~/containers/diun && git pull
sed -i 's/node:26-alpine/node:28-alpine/' custom-images.yml
git commit -am 'chore: watch node:28-alpine' && git push
cd ~/containers && docker compose up -d diun
```

Node majors land roughly every 6 months. Patch/minor bumps never touch
`custom-images.yml`.
