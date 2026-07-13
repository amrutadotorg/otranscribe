/**
 * migrateLegacyData.ts — Migration from original oTranscribe localStorage format
 *
 * Original app uses localStorageManager (LSM) with keys like:
 *   localStorageManager_autosave
 *   localStorageManager_oTranscribe-backup-{timestamp}
 *
 * This module detects and migrates data from the old SPA if it exists.
 * Called once on app start, idempotent.
 *
 * See PLAN.md section 2.6 (Legacy data migration)
 */

import { STORAGE_KEYS } from './storageKeys';

const MIGRATION_DONE_KEY = 'otranscribe-v3-migration-done';

/** Check if old data exists and hasn't been migrated yet */
export function needsMigration(): boolean {
  if (localStorage.getItem(MIGRATION_DONE_KEY) === '1') return false;
  // Check for existence of original autosave key
  return localStorage.getItem(STORAGE_KEYS.AUTOSAVE) !== null;
}

/**
 * Migrate legacy backup entries to the new format.
 * Old backup keys: localStorageManager_oTranscribe-backup-{timestamp}
 * New backup keys: same prefix (already compatible!)
 *
 * The main migration needed is for settings format changes.
 */
export function migrateLegacyData(): void {
  if (!needsMigration()) return;

  try {
    // Migrate settings if old format detected
    const settingsRaw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (settingsRaw) {
      const settings = JSON.parse(settingsRaw) as Record<string, unknown>;

      // v1→v3: rename 'oT-pauseOnType' boolean to 'pauseOnTyping'
      if ('oT-pauseOnType' in settings) {
        settings['pauseOnTyping'] = settings['oT-pauseOnType'];
        delete settings['oT-pauseOnType'];
      }

      // v1→v3: flatten old keyboard shortcut format
      if (
        settings['keyboardShortcuts'] === undefined &&
        settings['escKeyAction']
      ) {
        // Old format stored shortcut preferences differently
        settings['keyboardShortcuts'] = {};
      }

      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }

    // Mark migration complete
    localStorage.setItem(MIGRATION_DONE_KEY, '1');
    console.info('[migration] Legacy oTranscribe data migrated to v3 format');
  } catch (err) {
    console.warn(
      '[migration] Migration failed, continuing with defaults:',
      err,
    );
    localStorage.setItem(MIGRATION_DONE_KEY, '1'); // Don't retry on failure
  }
}

/** Run migration on app boot (safe to call multiple times) */
export function runMigrationIfNeeded(): void {
  try {
    migrateLegacyData();
  } catch {
    // Silent fail — app must still work even if migration errors
  }
}
