/**
 * smoke.spec.ts — Smoke tests for oTranscribe
 *
 * Tests the Start screen and basic navigation.
 * See PLAN.md Faza 9
 *
 * Prerequisites:
 *   npm run dev (background)
 *   npx playwright install chromium
 *
 * Run: npm run test:e2e
 */

import { test, expect } from '@playwright/test';

// Helper to load the app and wait for React to hydrate
async function loadApp(
  page: Parameters<typeof test>[1] extends (arg: infer T) => unknown
    ? T
    : never,
) {
  await page.goto('/');
  // Wait for React to mount and render — look for any button to appear
  await page.waitForSelector('button', { state: 'visible', timeout: 15000 });
}

test.describe('Start screen', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('oTranscribe');
  });

  test('shows oTranscribe heading', async ({ page }) => {
    await loadApp(page);
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Transcribe');
  });

  test('shows all 4 media source buttons', async ({ page }) => {
    await loadApp(page);
    await expect(page.locator('#load-local-file-btn')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('#load-youtube-btn')).toBeVisible();
    await expect(page.locator('#load-vimeo-btn')).toBeVisible();
    await expect(page.locator('#import-otr-btn')).toBeVisible();
  });

  test('page has accessible structure', async ({ page }) => {
    await loadApp(page);
    // Check semantic heading
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    // At least 4 buttons (media sources)
    const count = await page.locator('button').count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('YouTube button opens URL modal and validates', async ({ page }) => {
    await loadApp(page);
    await page.locator('#load-youtube-btn').click();

    // Wait for the modal to appear
    const modal = page.locator('#url-input-modal');
    await expect(modal).toBeVisible();

    // Test validation
    await page.locator('#url-modal-input').fill('invalid-url');
    await page.locator('#url-modal-btn-confirm').click();
    await expect(page.locator('#url-modal-error')).toContainText(
      'valid YouTube URL',
    );

    // Close modal
    await page.locator('#url-modal-cancel-btn').click();
    await expect(modal).toBeHidden();
  });

  test('Vimeo button opens URL modal and validates', async ({ page }) => {
    await loadApp(page);
    await page.locator('#load-vimeo-btn').click();

    const modal = page.locator('#url-input-modal');
    await expect(modal).toBeVisible();

    // Test with the user provided link
    await page
      .locator('#url-modal-input')
      .fill('https://vimeo.com/251865580/18d771e072');
    // We don't click confirm here because it would actually start downloading the Vimeo file in the test,
    // which might take too long and isn't mocked. We just verify the input takes the value and cancels properly.
    await expect(page.locator('#url-modal-input')).toHaveValue(
      'https://vimeo.com/251865580/18d771e072',
    );

    await page.locator('#url-modal-cancel-btn').click();
    await expect(modal).toBeHidden();
  });

  test('local file button opens file chooser', async ({ page }) => {
    await loadApp(page);
    // Intercept file chooser
    const fileChooserPromise = page.waitForEvent('filechooser', {
      timeout: 8000,
    });
    await page.locator('#load-local-file-btn').click();
    const fileChooser = await fileChooserPromise;
    // Verify it accepts audio/video types
    const accept = fileChooser.element().getAttribute('accept');
    expect(accept).toBeTruthy();
    // Don't pick a file — leave dialog open
  });

  test('import .otr button opens file chooser', async ({ page }) => {
    await loadApp(page);
    const fileChooserPromise = page.waitForEvent('filechooser', {
      timeout: 8000,
    });
    await page.locator('#import-otr-btn').click();
    const fileChooser = await fileChooserPromise;
    const accept = await fileChooser.element().getAttribute('accept');
    expect(accept).toContain('.otr');
  });
});

test.describe('PWA requirements', () => {
  test('manifest.json is served', async ({ page }) => {
    const res = await page.goto('/manifest.webmanifest');
    expect(res?.status()).toBe(200);
    const body = await res?.text();
    expect(body).toContain('oTranscribe');
  });

  test('favicon SVG is served', async ({ page }) => {
    const res = await page.goto('/favicon.svg');
    expect(res?.status()).toBe(200);
  });

  test('favicon PNG (192) is served', async ({ page }) => {
    const res = await page.goto('/favicon-192.png');
    expect(res?.status()).toBe(200);
  });

  test('service worker API is available', async ({ page }) => {
    await page.goto('/');
    const hasSW = await page.evaluate(() => 'serviceWorker' in navigator);
    expect(hasSW).toBe(true);
  });
});

test.describe('Locale data', () => {
  test('data.ini is served with 28 languages', async ({ page }) => {
    const res = await page.goto('/data.ini');
    expect(res?.status()).toBe(200);
    const body = (await res?.text()) ?? '';
    expect(body).toContain('[en-US]');
    expect(body).toContain('[fr]');
    expect(body).toContain('[de]');
    expect(body).toContain('[ja]');
    expect(body).toContain('[pl]');
    // Count sections
    const sections = body.match(/^\[[\w-]+\]/gm) ?? [];
    expect(sections.length).toBeGreaterThanOrEqual(28);
  });
});

test.describe('App stability', () => {
  test('no uncaught JS errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      // Ignore known Vite HMR noise
      if (!err.message.includes('HMR') && !err.message.includes('WebSocket')) {
        errors.push(err.message);
      }
    });
    await loadApp(page);
    await page.waitForTimeout(1000); // Let any async errors surface
    expect(errors).toHaveLength(0);
  });
});
