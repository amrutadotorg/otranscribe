# Security advisories and accepted risks

`package.json` → `overrides` is the source of truth for pinned transitive versions.
These notes explain the non-obvious ones so nobody "cleans them up".

After any `package.json` change: `npm audit`, then check this file before acting on a
finding.

## Resolved: `minimatch` DoS (CVE-2026-118764, 2026-10-31)

[minimatch <11.0.1](https://github.com/advisories/GHSA-g3hv-75wg-m249) amplifies
attacker-supplied glob patterns quadratically when `optimizationLevel >= 2`. All
dependents still declare `minimatch: ^10`, so `npm audit fix` cannot resolve it.

```json
"overrides": {
  "minimatch": "^11.0.3",
  "glob": "^14.0.3"
}
```

`glob` is overridden because it carried its own advisory
([GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)) and 14.0.3
is the version requiring `minimatch ^11`. The chain is dev/build-time only and the
full gate suite passes with it.

**Revisit** when `eslint`, `typescript-eslint` and `workbox-build` stop pinning
`minimatch ^10`; drop the override then.

## Accepted risk: `deepmerge` prototype-poisoning guard bypass (2026-10-28)

- [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)
  (CVE-2026-93753), `deepmerge >=4.2.0 <=4.3.1`, **no patched version**, scored
  Low (2.7).
- Chain: `deepmerge` → `@rollup/plugin-node-resolve` → `workbox-build` →
  `vite-plugin-pwa`.
- Upstream declined to fix ([#273](https://github.com/TehShrike/deepmerge/issues/273),
  closed). `npm audit fix --force` only offers a breaking downgrade to
  `vite-plugin-pwa@0.2.1`.
- Reachability: build-time only. Workbox merges local plugin options during
  `vite build`; no untrusted request data reaches `mergeObject()`.

**Revisit** if `deepmerge` ships a release above 4.3.1 or the advisory is withdrawn.

## Resolved: Brotli decoder RCE (CVE-2026-111497, "Node2Shell", 2026-10-28)

Node.js bundled a vulnerable Brotli decoder (OOB write → potential RCE) through
24.22.0, fixed in 24.22.1. The base image was moved to Alpine and is now
`node:26.13.1-alpine`, well past the fix.

Residual exposure: outbound `fetch()` of Brotli-compressed responses (Vimeo, Google)
that undici decompresses. The Express app exposes `GET` routes only and installs no
body parser, so request-body decompression is not reachable. No Python
`brotli`/`brotlicffi` is used.

**If you add a body parser**, re-read this section before merging.

## Other overrides

`package.json` also pins `body-parser`, `brace-expansion`, `ejs`, `fast-uri`,
`postcss`, `serialize-javascript`, `undici` and `zod`. Treat the file as authoritative;
do not remove an override without checking why it was added (see `git log -p --
package.json`).
