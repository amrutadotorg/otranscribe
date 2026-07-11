# Changelog

## [Unreleased]

### Added
- `minutes` translation key in 28 languages (suffix next to backup interval input)
- `debouncedAutosave()` function in autosave module
- **Autosave recovery on startup**: when the app loads and a non-empty autosave is detected in localStorage, a recovery banner is shown on StartView. "Restore" loads the session into TranscribeView; "Discard" clears the stale slot. New translation keys: `autosave-recovery-message`, `autosave-restore`, `autosave-discard` (English; other languages fall back automatically).
- **Favicon**: copied full set of favicon assets from previous project
- **Keyboard shortcuts refactor**: removed 5 dead shortcuts from settings (bold, italic, underline, addTimestamp, addTimestampMilliseconds) that were handled internally by TipTap/browser
- **Configurable save shortcut**: `Ctrl+S` (save backup) is now a user-configurable keyboard shortcut (`saveBackup` key)
- **shift/alt modifier support**: keyboard shortcut matcher now supports `shift+` and `alt+` modifiers in addition to `mod+`
- **`ShortcutInput` component**: interactive key capture for editing shortcuts — "Listen" button listens for next key combo, tags for each shortcut with ✕ to remove
- `shortcut-listen` and `saveBackup` translation keys in 28 languages

### Changed
- **Backup interval setting**: added translated unit suffix ("min", "分", "Мин", etc.) next to the numeric input in Settings panel
- **Autosave**: replaced `setInterval(1000)` polling with debounce-based save (1s after last content change). Saves only when user actually edits text, reducing unnecessary localStorage writes
- **Keyboard shortcuts UI**: replaced plain text inputs with interactive `ShortcutInput` component (tags + Listen button)
- **Keyboard shortcut instructions**: updated `shortcuts-instrux` to mention `shift` and `alt` modifiers
- **Translation corrections** (from reviewer): de `shortcut-listen` Lauschen→Erfassen, ru/uk shortcut-listen → Записать/Записати, ar shortcuts-instrux prefix fix, fil susi→key, ro shortcuts-instrux phrasing, bo shortcuts-instrux full rewrite

### Removed
- `startAutosave()` / `stopAutosave()` polling functions (replaced by `debouncedAutosave()`)
- `useEffect` in Editor.tsx that started/stopped the autosave polling loop
- 5 dead shortcuts from settings: bold, italic, underline, addTimestamp, addTimestampMilliseconds (TipTap/browser handle these internally)
- Hardcoded `Ctrl+S` — now a configurable shortcut

### Fixed
- Backup interval setting now clearly shows the unit (minutes) in all 28 supported languages
- **Periodic backup not working**: `startPeriodicBackup()` was defined but never called. Now wired into `TranscribeView.tsx` — creates timestamped backups every N minutes (configurable in Settings)
- **Periodic backup duplicate entries**: backup was created every N minutes regardless of content changes. Now only creates a new entry when the editor content actually changed
- **Backup quota exceeded**: replaced single-evict fallback with loop that removes oldest backups until write succeeds
- **Settings validation**: `backupIntervalMinutes` (1-60) and `backupsPerFile` (1-50) are now clamped to valid ranges on update
- **Shortcut collision**: when assigning a shortcut to an action, it is now automatically removed from any other action (last-write-wins). Prevents silent conflicts where only the first action in the handler chain would fire
- **`timeSelection` shortcut not working**: the "Jump to time" shortcut was configurable in Settings but had no handler. Now triggers a prompt dialog for MM:SS input and jumps to that time
