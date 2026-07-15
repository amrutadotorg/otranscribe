# Audyt pozostałości po migracji Preact → React

**Data:** 2026-07-11 / 2026-07-15
**Status:** ✅ Migracja kompletna. Martwy kod i niepotrzebne zależności zostały usunięte.

Wszystkie punkty audytu zostały wdrożone:
- Usunięto martwy kod z modułów (m.in. `migrateOldSettings()`, `DEFAULT_SETTINGS` z `.d.ts`, `setPlayer()`, `stripInlineStyles()`, `copyRichText()`).
- Zmieniono eksporty wewnętrzne na funkcje prywatne.
- Usunięto nieużywane klucze `localStorage` (`LAST_FILE`, `VIMEO_ID_LEGACY`).
- Usunięto nadmiarowe moduły TipTap z `package.json` oraz plik konfiguracyjny `.oxlintrc.json`.
- Brak jakichkolwiek śladów po `preact` w całym kodzie.

