/**
 * backupManager.ts — Named backup manager
 *
 * Creates timestamped backup entries grouped by media file name.
 * Max N backups per file (default 10), evicts oldest.
 * Behaviour mirrors original oTranscribe backup.js.
 */

import { STORAGE_KEYS } from './storageKeys';
import type { MediaDetails } from '../../types/otr';

export interface BackupEntry {
  text: string;
  media: string;
  mediaDetails: MediaDetails;
  timestamp: number;
}

/** Get all backup keys from localStorage */
function getAllBackupKeys(): string[] {
  return Object.keys(localStorage).filter((k) =>
    k.startsWith(STORAGE_KEYS.BACKUP_PREFIX),
  );
}

/** Get all backup entries as objects */
export function getAllBackups(): Array<{ key: string; entry: BackupEntry }> {
  return getAllBackupKeys()
    .map((key) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return { key, entry: JSON.parse(raw) as BackupEntry };
      } catch {
        return null;
      }
    })
    .filter((x): x is { key: string; entry: BackupEntry } => x !== null)
    .sort((a, b) => b.entry.timestamp - a.entry.timestamp);
}

/** Get backups for a specific media file name */
function getBackupsForMedia(
  mediaName: string,
): Array<{ key: string; entry: BackupEntry }> {
  return getAllBackups().filter((b) => b.entry.media === mediaName);
}

/**
 * Save a backup entry. Evicts oldest if maxPerFile exceeded.
 */
export function saveBackup(
  html: string,
  mediaDetails: MediaDetails,
  maxPerFile = 10,
): void {
  const timestamp = Date.now();
  const key = `${STORAGE_KEYS.BACKUP_PREFIX}${timestamp}`;

  const entry: BackupEntry = {
    text: html,
    media: mediaDetails.name,
    mediaDetails,
    timestamp,
  };

  // Evict oldest backups for this file if at limit
  const existing = getBackupsForMedia(mediaDetails.name);
  if (existing.length >= maxPerFile) {
    const toDelete = existing.slice(maxPerFile - 1);
    toDelete.forEach(({ key: k }) => localStorage.removeItem(k));
  }

  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // QuotaExceededError: evict oldest backups until write succeeds
    console.warn('[backupManager] Quota exceeded, evicting oldest backups');
    const all = getAllBackupKeys();
    for (const oldest of all.sort()) {
      localStorage.removeItem(oldest);
      try {
        localStorage.setItem(key, JSON.stringify(entry));
        break;
      } catch {
        continue;
      }
    }
  }
}

/** Restore a backup entry by key */
export function restoreBackup(key: string): BackupEntry | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as BackupEntry;
  } catch {
    return null;
  }
}

/** Delete a specific backup */
export function deleteBackup(key: string): void {
  localStorage.removeItem(key);
}

// ─── Periodic backup ───────────────────────────────────────────────────────

let backupInterval: ReturnType<typeof setInterval> | null = null;
let lastSavedHtml = '';

type BackupFn = () => { html: string; mediaDetails: MediaDetails };

/** Start periodic backup loop */
export function startPeriodicBackup(
  getState: BackupFn,
  intervalMinutes: number,
  maxPerFile: number,
): void {
  stopPeriodicBackup();
  const ms = intervalMinutes * 60 * 1000;
  backupInterval = setInterval(() => {
    const { html, mediaDetails } = getState();
    if (html && html !== lastSavedHtml) {
      saveBackup(html, mediaDetails, maxPerFile);
      lastSavedHtml = html;
    }
  }, ms);
}

export function stopPeriodicBackup(): void {
  if (backupInterval !== null) {
    clearInterval(backupInterval);
    backupInterval = null;
  }
  lastSavedHtml = '';
}
