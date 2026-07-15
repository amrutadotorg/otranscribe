/**
 * useSettings.ts — React hook for app settings
 *
 * Reads/writes settings to localStorage. Provides deep merge on update.
 * See PLAN.md section 6
 */

import { useState, useCallback } from 'react';
import type { AppSettings } from '../../types/settings';
import { DEFAULT_SETTINGS } from './defaults';
import { STORAGE_KEYS } from '../storage/storageKeys';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const saved = JSON.parse(raw) as Record<string, unknown>;
    // Deep merge: defaults take precedence for missing keys
    return deepMerge(
      DEFAULT_SETTINGS as unknown as Record<string, unknown>,
      saved,
    ) as unknown as AppSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function deepMerge(
  defaults: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...defaults };
  for (const key of Object.keys(overrides)) {
    if (
      typeof overrides[key] === 'object' &&
      overrides[key] !== null &&
      !Array.isArray(overrides[key]) &&
      typeof defaults[key] === 'object' &&
      defaults[key] !== null
    ) {
      result[key] = deepMerge(
        defaults[key] as Record<string, unknown>,
        overrides[key] as Record<string, unknown>,
      );
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = deepMerge(
        prev as unknown as Record<string, unknown>,
        updates as Record<string, unknown>,
      ) as unknown as AppSettings;

      // Clamp backup settings to valid ranges
      next.backupIntervalMinutes = Math.min(
        60,
        Math.max(1, next.backupIntervalMinutes),
      );
      next.backupsPerFile = Math.min(50, Math.max(1, next.backupsPerFile));

      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(next));
      } catch (e) {
        console.warn('[useSettings] Could not save settings:', e);
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  }, []);

  return { settings, updateSettings, resetSettings };
}
