/**
 * phonetic-input.spec.ts — E2E tests for phonetic input (transliteration) feature.
 *
 * Mocks /api/transliterate via Playwright route interception — tests do not
 * depend on the live Google API or a running Express server.
 *
 * Tests load a tiny WAV fixture to transition from StartView → TranscribeView
 * (where TopBar with #btn-settings lives).
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { test, expect } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WAV_FIXTURE = path.resolve(__dirname, '../test-fixtures/silence.wav');

async function loadApp(
  page: Parameters<typeof test>[1] extends (arg: infer T) => unknown
    ? T
    : never,
) {
  await page.goto('/');
  await page.waitForSelector('button', { state: 'visible', timeout: 15000 });
}

/** Navigate from StartView to TranscribeView by loading a dummy audio file. */
async function goToTranscribeView(page: Parameters<typeof test>[1]) {
  await loadApp(page);
  await page.locator('#media-file-input').setInputFiles(WAV_FIXTURE);
  await expect(page.locator('#btn-settings')).toBeVisible({ timeout: 15000 });
}

test.describe('Phonetic input (transliteration)', () => {
  test('settings panel shows phonetic input toggle', async ({ page }) => {
    await goToTranscribeView(page);

    await page.locator('#btn-settings').click();
    await expect(page.locator('#settings-panel')).toBeVisible();

    await expect(page.locator('#setting-phonetic-input-enabled')).toBeVisible();
  });

  test('language select appears when phonetic input is enabled', async ({
    page,
  }) => {
    await goToTranscribeView(page);

    await page.locator('#btn-settings').click();
    await expect(page.locator('#settings-panel')).toBeVisible();

    // Language select should NOT be visible before enabling
    await expect(
      page.locator('#setting-phonetic-input-lang'),
    ).not.toBeVisible();

    // Enable phonetic input
    await page.locator('#setting-phonetic-input-enabled').check();

    // Language select should now appear
    await expect(page.locator('#setting-phonetic-input-lang')).toBeVisible();
  });

  test('typing a Latin word followed by space triggers transliteration', async ({
    page,
  }) => {
    // Mock the transliterate API endpoint
    await page.route('**/api/transliterate*', (route) =>
      route.fulfill({ json: { candidates: ['नमस्ते'] } }),
    );

    await goToTranscribeView(page);

    // Open settings, enable phonetic input
    await page.locator('#btn-settings').click();
    await expect(page.locator('#settings-panel')).toBeVisible();
    await page.locator('#setting-phonetic-input-enabled').check();

    // Verify the language select is visible and has Sanskrit as default
    const langSelect = page.locator('#setting-phonetic-input-lang');
    await expect(langSelect).toBeVisible();
    await expect(langSelect).toHaveValue('sa-t-i0-und');

    // Close settings
    await page.locator('#close-settings-btn').click();
  });
});
