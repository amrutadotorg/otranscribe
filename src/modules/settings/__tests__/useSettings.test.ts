/**
 * useSettings.test.ts — Unit tests for settings persistence and deepMerge
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSettings, deepMerge } from '../useSettings';
import { DEFAULT_SETTINGS } from '../defaults';
import { STORAGE_KEYS } from '../../storage/storageKeys';

describe('deepMerge', () => {
  it('merges shallow properties', () => {
    const defaults = { a: 1, b: 2 };
    const overrides = { b: 3, c: 4 };
    const result = deepMerge(defaults, overrides);
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('merges deep properties', () => {
    const defaults = { a: { b: 1, c: 2 }, d: 4 };
    const overrides = { a: { c: 3 } };
    const result = deepMerge(defaults, overrides);
    expect(result).toEqual({ a: { b: 1, c: 3 }, d: 4 });
  });

  it('overwrites arrays entirely (does not deep merge arrays)', () => {
    const defaults = { arr: [1, 2] };
    const overrides = { arr: [3] };
    const result = deepMerge(defaults, overrides);
    expect(result).toEqual({ arr: [3] });
  });

  it('ignores __proto__, constructor, and prototype to prevent prototype pollution', () => {
    const defaults = {};
    const overrides = JSON.parse(
      '{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}, "prototype": {"polluted": true}}',
    ) as Record<string, unknown>;

    const result = deepMerge(defaults, overrides);

    // Result should not have the restricted keys copied over
    expect(result).not.toHaveProperty('__proto__');
    expect(result).not.toHaveProperty('constructor');
    expect(result).not.toHaveProperty('prototype');

    // Global Object prototype should NOT be polluted
    expect({}).not.toHaveProperty('polluted');
  });
});

describe('loadSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('loads and deep merges settings from localStorage', () => {
    localStorage.setItem(
      STORAGE_KEYS.SETTINGS,
      JSON.stringify({ timestampMilliseconds: true, pauseOnTyping: false }),
    );
    const settings = loadSettings();
    expect(settings.timestampMilliseconds).toBe(true);
    expect(settings.pauseOnTyping).toBe(false);
    // Ensure unspecified defaults are preserved
    expect(settings.backupIntervalMinutes).toBe(
      DEFAULT_SETTINGS.backupIntervalMinutes,
    );
  });

  it('falls back to default settings on JSON parse error', () => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, 'invalid json');
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });
});
