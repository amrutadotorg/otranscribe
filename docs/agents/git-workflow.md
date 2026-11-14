# Git workflow

## Commit and push

After the five gates in [verification](verification.md) pass:

```bash
npm run format          # auto-fix before committing
git add -A
git commit -m "<type>: <short description>"
git push
```

## Conventional Commits

| Type        | Use for                                |
| ----------- | -------------------------------------- |
| `feat:`     | new feature or behaviour               |
| `fix:`      | bug fix                                |
| `refactor:` | restructuring with no behaviour change |
| `docs:`     | documentation only                     |
| `style:`    | formatting/whitespace, no logic change |
| `test:`     | adding or updating tests               |
| `chore:`    | build, config, dependencies, tooling   |

Examples:

- `feat: add dark mode toggle to settings panel`
- `fix: resolve timestamp parsing for legacy .otr files`
- `refactor: extract player driver creation into helper`
- `chore: update Vite to v8.1.0`

## Branch notes

- Default and deployment branch: `main`.
- `main` is protected (PR + required `CI` check). Admin pushes bypass the PR
  requirement and GitHub prints a "Bypassed rule violations" notice; CI then runs on
  the pushed commit rather than before merge. Don't treat a bypass as a green build.
- Commits that touch `docker-compose.prod.yml` or `.github/*.yml` must pass
  `npx prettier --check .` (see [verification](verification.md)).

## Never commit

- `.env` — gitignored, holds `VIMEO_ACCESS_TOKEN` and `SSO_SALT`. `.env.example` is
  the tracked template.
- `dist/`, `dist-server/`, `node_modules/`, `test-results/`,
  `playwright-report/` — all gitignored build/test output.
