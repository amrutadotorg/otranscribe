/**
 * contrast.test.ts — WCAG 2.1 AA contrast ratio verification
 *
 * Verifies all color pairs defined in src/index.css meet WCAG 2.1 AA thresholds:
 * - Normal text (≥18px or ≥14px bold): 4.5:1 (SC 1.4.3)
 * - Large text (≥24px or ≥18.66px bold): 3:1 (SC 1.4.3)
 * - UI components and graphical objects: 3:1 (SC 1.4.11)
 *
 * All values are computed from the actual sRGB hex values in the CSS variables.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';

// ─── sRGB relative luminance (WCAG 2.x definition) ────────────────────────

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
  );
}

/**
 * WCAG 2.x contrast ratio between two hex colors.
 * Returns a value ≥ 1 (lighter/darker).
 */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Blend an RGBA color onto a solid background (hex) and return the effective hex.
 */
function rgbaOnBg(rgba: string, bgHex: string): string {
  const match = rgba.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/,
  );
  if (!match) throw new Error(`Invalid rgba: ${rgba}`);
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
  const [bgR, bgG, bgB] = hexToRgb(bgHex);
  const outR = Math.round(r * a + bgR * (1 - a));
  const outG = Math.round(g * a + bgG * (1 - a));
  const outB = Math.round(b * a + bgB * (1 - a));
  return (
    '#' +
    [outR, outG, outB]
      .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0'))
      .join('')
  );
}

// ─── Color tokens from src/index.css ──────────────────────────────────────

const LIGHT = {
  bg: '#f8f9fa',
  surface: '#ffffff',
  surface2: '#f1f3f5',
  border: '#8c8c8c',
  text: '#212529',
  textMuted: '#687078',
  primary: '#2967a1',
  primaryHover: '#245a8e',
  accent: '#e87722',
  danger: '#dc3545',
  timestamp: '#2967a1',
  onPrimary: '#ffffff',
  onAccent: '#1a1a1a',
} as const;

const DARK = {
  bg: '#1a1b1e',
  surface: '#25262b',
  surface2: '#2c2e33',
  border: '#777777',
  text: '#e9ecef',
  textMuted: '#939599',
  primary: '#4dabf7',
  primaryHover: '#74c0fc',
  accent: '#ff9f43',
  danger: '#ff6b6b',
  timestamp: '#4dabf7',
  onPrimary: '#111318',
  onAccent: '#111318',
} as const;

// Effective rgba-blended backgrounds
const LIGHT_TIMESTAMP_BG = rgbaOnBg('rgba(41, 103, 161, 0.08)', LIGHT.surface);
const LIGHT_TIMESTAMP_HOVER_BG = rgbaOnBg(
  'rgba(41, 103, 161, 0.15)',
  LIGHT.surface,
);
const DARK_TIMESTAMP_BG = rgbaOnBg('rgba(77, 171, 247, 0.10)', DARK.surface2);
const DARK_TIMESTAMP_HOVER_BG = rgbaOnBg(
  'rgba(77, 171, 247, 0.10)',
  DARK.surface2,
);

// ─── WCAG thresholds ──────────────────────────────────────────────────────

const WCAG_AA_NORMAL_TEXT = 4.5;
const WCAG_AA_UI_COMPONENTS = 3.0;

// ─── Test helpers ──────────────────────────────────────────────────────────

function assertMinContrast(
  actual: number,
  minimum: number,
  _label: string,
): void {
  expect(actual).toBeGreaterThanOrEqual(minimum - 0.01); // tiny epsilon for float
}

// ─── LIGHT MODE: text on surfaces (SC 1.4.3 AA ≥ 4.5:1) ─────────────────

describe('Light mode — text on surfaces (≥ 4.5:1)', () => {
  it('--color-text on --color-surface', () => {
    assertMinContrast(
      contrastRatio(LIGHT.text, LIGHT.surface),
      WCAG_AA_NORMAL_TEXT,
      'text on surface',
    );
  });

  it('--color-text-muted on --color-surface', () => {
    assertMinContrast(
      contrastRatio(LIGHT.textMuted, LIGHT.surface),
      WCAG_AA_NORMAL_TEXT,
      'text-muted on surface',
    );
  });

  it('--color-text on --color-surface-2', () => {
    assertMinContrast(
      contrastRatio(LIGHT.text, LIGHT.surface2),
      WCAG_AA_NORMAL_TEXT,
      'text on surface-2',
    );
  });

  it('--color-text-muted on --color-surface-2', () => {
    assertMinContrast(
      contrastRatio(LIGHT.textMuted, LIGHT.surface2),
      WCAG_AA_NORMAL_TEXT,
      'text-muted on surface-2',
    );
  });

  it('--color-text on --color-bg', () => {
    assertMinContrast(
      contrastRatio(LIGHT.text, LIGHT.bg),
      WCAG_AA_NORMAL_TEXT,
      'text on bg',
    );
  });

  it('--color-text-muted on --color-bg', () => {
    assertMinContrast(
      contrastRatio(LIGHT.textMuted, LIGHT.bg),
      WCAG_AA_NORMAL_TEXT,
      'text-muted on bg',
    );
  });

  it('--color-primary on --color-surface (links)', () => {
    assertMinContrast(
      contrastRatio(LIGHT.primary, LIGHT.surface),
      WCAG_AA_NORMAL_TEXT,
      'primary on surface',
    );
  });

  it('--color-danger on --color-surface', () => {
    assertMinContrast(
      contrastRatio(LIGHT.danger, LIGHT.surface),
      WCAG_AA_NORMAL_TEXT,
      'danger on surface',
    );
  });
});

// ─── LIGHT MODE: white text on colored backgrounds (SC 1.4.3 AA) ─────────

describe('Light mode — button text on colored backgrounds (≥ 4.5:1)', () => {
  it('--color-on-primary text on --color-primary', () => {
    assertMinContrast(
      contrastRatio(LIGHT.onPrimary, LIGHT.primary),
      WCAG_AA_NORMAL_TEXT,
      'on-primary text on primary',
    );
  });

  it('--color-on-primary text on --color-primary-hover', () => {
    assertMinContrast(
      contrastRatio(LIGHT.onPrimary, LIGHT.primaryHover),
      WCAG_AA_NORMAL_TEXT,
      'on-primary text on primary-hover',
    );
  });

  it('--color-on-accent text on --color-accent', () => {
    assertMinContrast(
      contrastRatio(LIGHT.onAccent, LIGHT.accent),
      WCAG_AA_NORMAL_TEXT,
      'on-accent text on accent',
    );
  });

  it('--color-on-primary text on --color-danger', () => {
    assertMinContrast(
      contrastRatio(LIGHT.onPrimary, LIGHT.danger),
      WCAG_AA_NORMAL_TEXT,
      'on-primary text on danger',
    );
  });
});

// ─── LIGHT MODE: timestamps (SC 1.4.3 AA ≥ 4.5:1) ──────────────────────

describe('Light mode — timestamps (≥ 4.5:1)', () => {
  it('timestamp on timestamp-bg', () => {
    assertMinContrast(
      contrastRatio(LIGHT.timestamp, LIGHT_TIMESTAMP_BG),
      WCAG_AA_NORMAL_TEXT,
      'timestamp on timestamp-bg',
    );
  });

  it('timestamp on timestamp-hover-bg', () => {
    assertMinContrast(
      contrastRatio(LIGHT.timestamp, LIGHT_TIMESTAMP_HOVER_BG),
      WCAG_AA_NORMAL_TEXT,
      'timestamp on timestamp-hover-bg',
    );
  });
});

// ─── LIGHT MODE: UI components (SC 1.4.11 AA ≥ 3:1) ─────────────────────

describe('Light mode — UI components (≥ 3:1)', () => {
  it('--color-border on --color-surface', () => {
    assertMinContrast(
      contrastRatio(LIGHT.border, LIGHT.surface),
      WCAG_AA_UI_COMPONENTS,
      'border on surface',
    );
  });

  it('--color-border on --color-bg', () => {
    assertMinContrast(
      contrastRatio(LIGHT.border, LIGHT.bg),
      WCAG_AA_UI_COMPONENTS,
      'border on bg',
    );
  });

  it('--color-border on --color-surface-2', () => {
    assertMinContrast(
      contrastRatio(LIGHT.border, LIGHT.surface2),
      WCAG_AA_UI_COMPONENTS,
      'border on surface-2',
    );
  });

  it('--color-primary on --color-surface (focus ring)', () => {
    assertMinContrast(
      contrastRatio(LIGHT.primary, LIGHT.surface),
      WCAG_AA_UI_COMPONENTS,
      'primary focus ring on surface',
    );
  });

  it('--color-text-muted on --color-surface (icon buttons)', () => {
    assertMinContrast(
      contrastRatio(LIGHT.textMuted, LIGHT.surface),
      WCAG_AA_UI_COMPONENTS,
      'text-muted icon buttons on surface',
    );
  });
});

// ─── DARK MODE: text on surfaces (SC 1.4.3 AA ≥ 4.5:1) ─────────────────

describe('Dark mode — text on surfaces (≥ 4.5:1)', () => {
  it('--color-text on --color-surface', () => {
    assertMinContrast(
      contrastRatio(DARK.text, DARK.surface),
      WCAG_AA_NORMAL_TEXT,
      '[dark] text on surface',
    );
  });

  it('--color-text-muted on --color-surface', () => {
    assertMinContrast(
      contrastRatio(DARK.textMuted, DARK.surface),
      WCAG_AA_NORMAL_TEXT,
      '[dark] text-muted on surface',
    );
  });

  it('--color-text on --color-surface-2', () => {
    assertMinContrast(
      contrastRatio(DARK.text, DARK.surface2),
      WCAG_AA_NORMAL_TEXT,
      '[dark] text on surface-2',
    );
  });

  it('--color-text-muted on --color-surface-2', () => {
    assertMinContrast(
      contrastRatio(DARK.textMuted, DARK.surface2),
      WCAG_AA_NORMAL_TEXT,
      '[dark] text-muted on surface-2',
    );
  });

  it('--color-text on --color-bg', () => {
    assertMinContrast(
      contrastRatio(DARK.text, DARK.bg),
      WCAG_AA_NORMAL_TEXT,
      '[dark] text on bg',
    );
  });

  it('--color-text-muted on --color-bg', () => {
    assertMinContrast(
      contrastRatio(DARK.textMuted, DARK.bg),
      WCAG_AA_NORMAL_TEXT,
      '[dark] text-muted on bg',
    );
  });

  it('--color-primary on --color-surface (links)', () => {
    assertMinContrast(
      contrastRatio(DARK.primary, DARK.surface),
      WCAG_AA_NORMAL_TEXT,
      '[dark] primary on surface',
    );
  });

  it('--color-danger on --color-surface', () => {
    assertMinContrast(
      contrastRatio(DARK.danger, DARK.surface),
      WCAG_AA_NORMAL_TEXT,
      '[dark] danger on surface',
    );
  });
});

// ─── DARK MODE: button text on colored backgrounds (SC 1.4.3 AA) ────────

describe('Dark mode — button text on colored backgrounds (≥ 4.5:1)', () => {
  it('--color-on-primary text on --color-primary', () => {
    assertMinContrast(
      contrastRatio(DARK.onPrimary, DARK.primary),
      WCAG_AA_NORMAL_TEXT,
      '[dark] on-primary text on primary',
    );
  });

  it('--color-on-primary text on --color-primary-hover', () => {
    assertMinContrast(
      contrastRatio(DARK.onPrimary, DARK.primaryHover),
      WCAG_AA_NORMAL_TEXT,
      '[dark] on-primary text on primary-hover',
    );
  });

  it('--color-on-accent text on --color-accent', () => {
    assertMinContrast(
      contrastRatio(DARK.onAccent, DARK.accent),
      WCAG_AA_NORMAL_TEXT,
      '[dark] on-accent text on accent',
    );
  });

  it('--color-on-primary text on --color-danger', () => {
    assertMinContrast(
      contrastRatio(DARK.onPrimary, DARK.danger),
      WCAG_AA_NORMAL_TEXT,
      '[dark] on-primary text on danger',
    );
  });
});

// ─── DARK MODE: timestamps (SC 1.4.3 AA ≥ 4.5:1) ───────────────────────

describe('Dark mode — timestamps (≥ 4.5:1)', () => {
  it('timestamp on timestamp-bg', () => {
    assertMinContrast(
      contrastRatio(DARK.timestamp, DARK_TIMESTAMP_BG),
      WCAG_AA_NORMAL_TEXT,
      '[dark] timestamp on timestamp-bg',
    );
  });

  it('timestamp on timestamp-hover-bg', () => {
    assertMinContrast(
      contrastRatio(DARK.timestamp, DARK_TIMESTAMP_HOVER_BG),
      WCAG_AA_NORMAL_TEXT,
      '[dark] timestamp on timestamp-hover-bg',
    );
  });
});

// ─── DARK MODE: UI components (SC 1.4.11 AA ≥ 3:1) ──────────────────────

describe('Dark mode — UI components (≥ 3:1)', () => {
  it('--color-border on --color-surface', () => {
    assertMinContrast(
      contrastRatio(DARK.border, DARK.surface),
      WCAG_AA_UI_COMPONENTS,
      '[dark] border on surface',
    );
  });

  it('--color-border on --color-bg', () => {
    assertMinContrast(
      contrastRatio(DARK.border, DARK.bg),
      WCAG_AA_UI_COMPONENTS,
      '[dark] border on bg',
    );
  });

  it('--color-border on --color-surface-2', () => {
    assertMinContrast(
      contrastRatio(DARK.border, DARK.surface2),
      WCAG_AA_UI_COMPONENTS,
      '[dark] border on surface-2',
    );
  });

  it('--color-primary on --color-surface (focus ring)', () => {
    assertMinContrast(
      contrastRatio(DARK.primary, DARK.surface),
      WCAG_AA_UI_COMPONENTS,
      '[dark] primary focus ring on surface',
    );
  });

  it('--color-text-muted on --color-surface (icon buttons)', () => {
    assertMinContrast(
      contrastRatio(DARK.textMuted, DARK.surface),
      WCAG_AA_UI_COMPONENTS,
      '[dark] text-muted icon buttons on surface',
    );
  });
});

// ─── Cross-mode: ensure light-mode colors aren't accidentally used in dark ─

describe('Token separation — light and dark mode are distinct', () => {
  it('--color-on-primary differs between modes', () => {
    expect(LIGHT.onPrimary).not.toBe(DARK.onPrimary);
  });

  it('--color-on-accent differs between modes', () => {
    expect(LIGHT.onAccent).not.toBe(DARK.onAccent);
  });

  it('border colors provide correct directional contrast for their themes', () => {
    // Light border must be darker than light surfaces (border < surface luminance)
    expect(relativeLuminance(LIGHT.border)).toBeLessThan(
      relativeLuminance(LIGHT.surface),
    );
    // Dark border must be lighter than dark surfaces (border > surface luminance)
    expect(relativeLuminance(DARK.border)).toBeGreaterThan(
      relativeLuminance(DARK.surface),
    );
  });
});
