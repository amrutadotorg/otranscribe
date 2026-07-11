/**
 * storageKeys.ts — Constants for localStorage/IndexedDB keys
 *
 * Mirrors the original localStorageManager key scheme for backwards compatibility.
 * See PLAN.md section 1.2 Table E
 */

const LSM_PREFIX = 'localStorageManager_';

export const STORAGE_KEYS = {
  /** Autosave HTML — written every second */
  AUTOSAVE: `${LSM_PREFIX}autosave`,

  /** Backup prefix — appended with timestamp */
  BACKUP_PREFIX: `${LSM_PREFIX}oTranscribe-backup-`,

  /** Settings */
  SETTINGS: `${LSM_PREFIX}oTranscribe-settings`,

  /** Last file info */
  LAST_FILE: `${LSM_PREFIX}oT-lastfile`,

  /** Language code */
  LANGUAGE: `${LSM_PREFIX}oTranscribe-language`,

  /** Legacy Vimeo video ID (without LSM prefix) */
  VIMEO_ID_LEGACY: 'otranscribe-vimeo-id',
} as const;

/** IndexedDB database name */
export const VIMEO_DB_NAME = 'otranscribe-vimeo-cache';
/** IndexedDB store name for cached Vimeo files */
export const VIMEO_STORE_NAME = 'files';
