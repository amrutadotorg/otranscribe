# Audyt pozostałości po migracji Preact → React

**Data:** 2026-07-11
**Status:** Brak śladów Preact w kodzie źródłowym — migracja kompletna.
Znaleziono martwy kod i nieużywane zależności niezwiązane z Preact.

---

## 1. Martwy kod

### Wysoki priorytet

| Plik:linia | Opis | Rekomendacja |
|-----------|------|-------------|
| `src/modules/settings/useSettings.ts:80-89` | `migrateOldSettings()` — eksportowana, pusta funkcja, nigdy importowana | Usunąć |
| `src/types/settings.d.ts:24-43` | `DEFAULT_SETTINGS` const w pliku `.d.ts` — duplikat `defaults.ts`, nigdy importowana | Usunąć |

### Średni priorytet

| Plik:linia | Opis | Rekomendacja |
|-----------|------|-------------|
| `src/modules/audio-engine/Player.ts:206-208` | `setPlayer()` — eksportowana, nigdy importowana z zewnątrz | Usunąć |
| `src/modules/editor/pasteCleanup.ts:82-108` | `stripInlineStyles()` — eksportowana, nigdy importowana | Usunąć |
| `src/modules/file-io/exportFormats.ts:137-163` | `copyRichText()` + `copyPlainText()` — eksportowane, nigdy importowane | Usunąć |
| `src/modules/storage/vimeoCache.ts:54-72` | `deleteCachedVimeoFile()` + `clearVimeoCache()` — eksportowane, nigdy importowane | Usunąć |

### Niski priorytet

| Plik:linia | Opis | Rekomendacja |
|-----------|------|-------------|
| `src/types/otr.d.ts:25-28` | `TimestampData` interface — eksportowany, nigdy importowany | Usunąć |
| `src/modules/storage/storageKeys.ts:21` | `STORAGE_KEYS.LAST_FILE` — nigdy używany | Usunąć z obiektu |
| `src/modules/storage/storageKeys.ts:27` | `STORAGE_KEYS.VIMEO_ID_LEGACY` — nigdy używany | Usunąć z obiektu |

### Eksporty wewnętrzne (niepotrzebnie `export`)

Funkcje eksportowane, ale używane tylko wewnątrz własnego pliku — usunąć `export`:

- `src/modules/file-io/exportFormats.ts` — `injectTimestamps` (linia 35), `sanitizeForExport` (52), `sanitizeForPlainText` (59), `sanitizeForMarkdown` (72), `sanitizeFilename` (92)
- `src/modules/file-io/otrFormat.ts` — `convertTimestampToSeconds` (19), `normaliseTimestamp` (31), `preprocessOtrHtml` (46) *(używane też w testach)*
- `src/modules/audio-engine/drivers/YouTubeDriver.ts` — `parseYouTubeUrl` (20)
- `src/modules/storage/backupManager.ts` — `getAllBackupKeys` (22), `getBackupsForMedia` (45)
- `src/modules/storage/migrateLegacyData.ts` — `needsMigration` (19)
- `src/modules/storage/autosave.ts` — `saveAutosave` (25)
- `src/modules/storage/vimeoCache.ts` — `cacheVimeoFile` (27), `extractVimeoId` (76)

---

## 2. Pozostałości po Preact

**Brak.** Kod jest w 100% czysty:

- Zero importów z `preact`, `preact/hooks`, `preact/compat`
- Zero pragma `/** @jsx h */`
- Zero aliasów react→preact w `vite.config.ts`
- `tsconfig.app.json` ustawia `"jsx": "react-jsx"` (poprawnie)
- `className` używane wszędzie (nie `class`)
- `createRoot` z `react-dom/client` (nie `ReactDOM.render`)
- `flushSync` importowane z `react-dom` (poprawnie)
- Zero plików `.jsx` — wszystko `.tsx`/`.ts`

---

## 3. Zależności w package.json

### Nieużywane zależności devDependencies

| Zależność | Problem | Rekomendacja |
|----------|---------|-------------|
| `eslint-plugin-react` | Zainstalowana, ale nie używana w `eslint.config.js` | Usunąć |
| `eslint-plugin-react-hooks` | Zainstalowana, ale nie używana w `eslint.config.js` | Usunąć |
| `oxlint` | Zainstalowany, ale brak skryptu npm i configa | Usunąć |

### Potencjalnie redundantskie zależności

| Zależność | Problem | Rekomendacja |
|----------|---------|-------------|
| `@tiptap/extension-bold` | Nigdy bezpośrednio importowany — bundled w `@tiptap/starter-kit` | Rozważyć usunięcie |
| `@tiptap/extension-italic` | Tak samo jak bold — bundled w StarterKit | Rozważyć usunięcie |
| `@tiptap/pm` | Nigdy importowany, ale jest peer dep `@tiptap/react` — musi pozostać | Zostawić |

---

## 4. Niespójności strukturalne

**Brak.** Wszystkie komponenty są funkcyjne, spójne stylistycznie, używają React hooks. Brak duplikatów komponentów. Brak nieaktualnych typów TypeScript odnoszących się do API Preact.

---

## 5. Konfiguracja builda

**Czysta.** `vite.config.ts`, `tsconfig*.json`, `eslint.config.js` — zero odniesień do Preact.

---

## Podsumowanie

| Priorytet | Ilość | Co usunąć |
|-----------|-------|-----------|
| WYSOKI | 2 | `migrateOldSettings()`, `DEFAULT_SETTINGS` z `.d.ts` |
| ŚREDNI | 9 | 6 martwych eksportów + 3 nieużywane zależności devDep |
| NISKI | 12 | 9 eksportów wewnętrznych do oznaczenia jako prywatne + 2 martwe stałe + 1 martwy interface + 2 redundantskie tipTap deps |

**Łącznie: 23 znaleziska do przeglądu (żadne nie jest krytyczne).**
