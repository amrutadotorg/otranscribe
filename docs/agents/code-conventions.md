# Code conventions

## Components

- Functional components only.
- One component per file; filename matches the export (`TopBar.tsx` → `TopBar`).
- Props are declared as a local `interface Props` at the top of the file.
- `export default` for components; named exports for hooks, utilities and types.
- A short file-level JSDoc block at the top describing purpose. Most components
  follow this; new ones should too.

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

export default function StatusBadge({ status, label }: Props) {
  const colorMap = {
    active: 'var(--color-success)',
    inactive: 'var(--color-text-muted)',
    error: 'var(--color-danger)',
  };

  return (
    <span className="status-badge" style={{ color: colorMap[status] }}>
      {label ?? status}
    </span>
  );
}
```

## State

- Global state: React Context (`PlayerContext`, `I18nContext`).
- Feature state: custom hooks (`useSettings`, `usePlayer`, `useMediaLoader`).
- Keep state local unless it must cross component boundaries. No Redux/Zustand.
- Persist through `STORAGE_KEYS` from `src/modules/storage/storageKeys.ts`; never
  inline a key string.

## Styling

- Plain CSS with custom properties. No CSS modules, Tailwind or styled-components.
- Design tokens live in the `:root` block of `src/index.css` (colour, spacing,
  typography, shadow, radius). Use `var(--token)` rather than literals.
- Theming is the `.dark` class on `<html>`; token values swap automatically, so
  components should not branch on theme.
- BEM-like class names: `.topbar`, `.topbar-brand`, `.start-card`,
  `.player-btn.primary`.
- Inline styles only for dynamic values (progress width, conditional layout).

## TypeScript

The config is **not** `strict` — `strict` is absent from both `tsconfig.app.json`
and `tsconfig.node.json`. What is actually enforced:

- `noUnusedLocals`, `noUnusedParameters` — dead locals fail the build.
- `verbatimModuleSyntax` — type-only imports must use `import type`.
- `erasableSyntaxOnly` — no parameter properties, no `enum`.
- `noFallthroughCasesInSwitch`.
- `skipLibCheck`, `moduleResolution: bundler`, `noEmit` (Vite emits).
- ESLint: `@typescript-eslint/no-explicit-any` is a **warning**, not an error.

Consequences: assume `null`/`undefined` are possible only where you said so — the
compiler will not force you. Prefer `unknown` over `any`; the one accepted `as any`
is in `src/server/__tests__/sso.test.ts` for a Node crypto shim. Don't add more.
Use string-literal unions instead of enums, and put shared interfaces in
`src/types/*.d.ts`.

## Imports

- **Use relative imports.** The `@/` alias exists in `vite.config.ts` but no source
  file uses it; matching the codebase beats matching the config.
- `import type { Foo } from '...'` for type-only imports (`verbatimModuleSyntax`).
- Node built-ins take the `node:` prefix: `import path from 'node:path'`.
- Order: React → third-party → local modules → types → styles.

## Server (`src/server/`)

- Separate TypeScript project (`tsconfig.node.json`) compiled to `dist-server/`.
- Express with one file per concern (`sso.ts`, `vimeoProxy.ts`,
  `transliterateProxy.ts`) and wiring in `index.ts`.
- Configuration comes from `process.env`, loaded once with
  `process.loadEnvFile()` in `index.ts` (it throws if `.env` is missing or
  malformed — the catch there is intentional).
- Existing routes are `GET` only and no body parser is installed. If you add a
  body parser, revisit the Brotli notes in
  [security-advisories](security-advisories.md).
- `npm run dev:server` runs the compiled output; rebuild with
  `npm run build:server` after edits.

## Dependencies

- Justify each new dependency; prefer platform APIs or an installed package.
- The PWA ships to users: dynamic-import large optional features (the YouTube
  iframe API is the precedent).
- Run `npm audit` after changing `package.json` and check the accepted-risk list in
  [security-advisories](security-advisories.md) before "fixing" anything.
- TipTap and Floating UI have tight peer ranges — check compatibility before
  bumping React.
