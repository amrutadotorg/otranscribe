# PLAN.md — Keyboard Shortcuts Improvements

## Overview

Refactor keyboard shortcuts system: remove dead shortcuts, add interactive key capture,
extend modifier support, and make Ctrl+S configurable.

## Tasks

### Task 1: Remove TipTap-handled shortcuts from Settings

**Problem:** `bold`, `italic`, `underline`, `addTimestamp`, `addTimestampMilliseconds` are
displayed in Settings but **never used** — TipTap/ProseMirror has its own hardcoded keymaps.

**Keep (7 actions — handled by window keydown):**
- `playPause`, `backwards`, `forwards`, `returnToStart`, `timeSelection`, `speedDown`, `speedUp`

**Remove (5 actions — handled natively by TipTap):**
- `addTimestamp`, `addTimestampMilliseconds`, `bold`, `italic`, `underline`

**Files:**
| File | Change |
|------|--------|
| `src/types/settings.d.ts` | Remove 5 keys from `KeyboardShortcuts` interface |
| `src/modules/settings/defaults.ts` | Remove 5 keys from `DEFAULT_SETTINGS` |
| `src/components/SettingsPanel.tsx` | Remove 5 keys from `SHORTCUT_KEYS` |
| `public/data.ini` | Remove translation keys: `addTimestamp`, `bold`, `italic`, `underline` (all 28 languages) |

---

### Task 2: Make Ctrl+S (save backup) configurable

**Problem:** `Ctrl+S` is hardcoded at `TranscribeView.tsx:192`.

**Changes:**
1. Add `saveBackup: string[]` to `KeyboardShortcuts` in `settings.d.ts`
2. Add `saveBackup: ['mod+s']` to `defaults.ts`
3. Add `saveBackup: 'saveBackup'` to `SHORTCUT_KEYS` in `SettingsPanel.tsx`
4. In `TranscribeView.tsx:192` replace hardcoded `mod && e.key === 's'` with `matches(shortcuts.saveBackup, e)`
5. Add translation key `saveBackup` in `data.ini` (28 languages)

---

### Task 3: Extend `matches()` to support `shift` and `alt` modifiers

**Problem:** `matches()` in `TranscribeView.tsx:152-161` only checks `mod` (Ctrl/Cmd).
No support for `shift` or `alt`.

**New format:** `mod+shift+backwards`, `alt+f1`, `shift+escape`

**Changes in `TranscribeView.tsx`:**
```ts
const matches = (keys: string[], event: KeyboardEvent) =>
  keys.some((k) => {
    const parts = k.split('+');
    const key = parts[parts.length - 1];
    const needsMod = parts.includes('mod');
    const needsShift = parts.includes('shift');
    const needsAlt = parts.includes('alt');
    return (
      event.key.toLowerCase() === key.toLowerCase() &&
      (!needsMod || mod) &&
      (!needsShift || event.shiftKey) &&
      (!needsAlt || event.altKey)
    );
  });
```

**Also:** Update `shortcuts-instrux` in `data.ini` to mention `shift` and `alt`.

---

### Task 4: Interactive "Listen" button for key capture

**Problem:** Users must manually type shortcut strings. No interactive recording.

**New component: `src/components/ShortcutInput.tsx`**

Replaces `<input type="text">` for each shortcut row.

**Behavior:**
1. Displays current shortcuts as removable tags/badges
2. "Listen" button → listens for `keydown` on `window`
3. On keypress: builds shortcut string (e.g. `mod+shift+1`), calls `onChange`, stops listening
4. `Escape` cancels listening
5. `Backspace` removes last shortcut
6. "×" button on each tag removes that shortcut

**Key capture logic:**
```ts
const handleKeyDown = (e: KeyboardEvent) => {
  e.preventDefault();
  if (e.key === 'Escape') { stopListening(); return; }
  if (e.key === 'Backspace') { removeLastShortcut(); return; }

  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push('mod');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');
  parts.push(e.key.toLowerCase());

  onChange([...currentShortcuts, parts.join('+')]);
  stopListening();
};
```

**New translation key:** `shortcut-listen` in `data.ini` (28 languages)

---

## Implementation Order

1. Task 1 — remove dead shortcuts (safe, no logic changes)
2. Task 2 — configurable Ctrl+S (small change)
3. Task 3 — extend `matches()` with shift/alt
4. Task 4 — new `ShortcutInput.tsx` component + Listen button

## Files to Modify

| File | Tasks |
|------|-------|
| `src/types/settings.d.ts` | 1, 2 |
| `src/modules/settings/defaults.ts` | 1, 2 |
| `src/components/SettingsPanel.tsx` | 1, 2, 4 |
| `src/components/TranscribeView.tsx` | 2, 3 |
| `src/components/ShortcutInput.tsx` | 4 (new file) |
| `public/data.ini` | 1, 2, 3, 4 (28 languages each) |
| `CHANGELOG.md` | summary |

## Estimated Scope

- ~150 lines changed/added
- 1 new file (`ShortcutInput.tsx`)
- ~20 new/modified translation keys in `data.ini`
- 5 translation keys removed from `data.ini`
