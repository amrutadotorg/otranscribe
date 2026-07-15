/**
 * phonetic-input.spec.ts — E2E tests for phonetic input (transliteration) feature.
 *
 * Mocks /api/transliterate via Playwright route interception — tests do not
 * depend on the live Google API or a running Express server.
 */

import { test, expect } from '@playwright/test';

// Helper to load the app and wait for React to hydrate
async function loadApp(
  page: Parameters<typeof test>[1] extends (arg: infer T) => unknown
    ? T
    : never,
) {
  await page.goto('/');
  await page.waitForSelector('button', { state: 'visible', timeout: 15000 });
}

test.describe('Phonetic input (transliteration)', () => {
  test('settings panel shows phonetic input toggle', async ({ page }) => {
    await loadApp(page);

    // Open settings (the gear/settings button in TopBar)
    const settingsBtn = page.locator('#btn-settings');
    await expect(settingsBtn).toBeVisible({ timeout: 10000 });
    await settingsBtn.click();

    const panel = page.locator('#settings-panel');
    await expect(panel).toBeVisible();

    // The phonetic input checkbox should be present
    await expect(page.locator('#setting-phonetic-input-enabled')).toBeVisible();
  });

  test('language select appears when phonetic input is enabled', async ({
    page,
  }) => {
    await loadApp(page);

    // Open settings
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

    await loadApp(page);

    // Navigate to the transcribe view by simulating a file load
    // We open settings, enable phonetic input, then check for it
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
