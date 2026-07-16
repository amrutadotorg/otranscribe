import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration
 *
 * Run: npm run test:e2e
 * Prerequisite: npm run dev (or nohup npm run dev &)
 */
export default defineConfig({
  testDir: './e2e',
  // Run tests sequentially in a single worker to avoid port conflicts
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Give pages more time to load (Vite HMR can be slow on first load)
    navigationTimeout: 15000,
    actionTimeout: 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start the dev server if not already running
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    // Reuse existing server to avoid killing nohup process
    reuseExistingServer: true,
    timeout: 30000,
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
