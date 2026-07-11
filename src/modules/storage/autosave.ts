/**
 * autosave.ts — Autosave manager
 *
 * Saves editor HTML to localStorage 1 second after the last content change.
 * Uses debounce to avoid unnecessary writes on every keystroke.
 * See PLAN.md section 5
 */

import { STORAGE_KEYS } from './storageKeys';

const AUTOSAVE_DEBOUNCE_MS = 1000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced autosave — call on every content change, saves 1s after last edit */
export function debouncedAutosave(html: string): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    saveAutosave(html);
    debounceTimer = null;
  }, AUTOSAVE_DEBOUNCE_MS);
}

/** Write HTML to autosave slot */
export function saveAutosave(html: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTOSAVE, html);
  } catch (e) {
    console.warn('[autosave] localStorage write failed:', e);
  }
}

/** Read autosaved HTML, returns null if none */
export function loadAutosave(): string | null {
  return localStorage.getItem(STORAGE_KEYS.AUTOSAVE);
}

/** Clear the autosave slot */
export function clearAutosave(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTOSAVE);
}
