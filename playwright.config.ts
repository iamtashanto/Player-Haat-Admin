import { defineConfig, devices } from '@playwright/test';

/** Runs against the real API on :4000 through the Vite dev proxy (same origin, so the httpOnly refresh cookie works). */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: { baseURL: 'http://localhost:5174', trace: 'on-first-retry', actionTimeout: 15_000 },
  projects: [{ name: 'admin-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: { command: 'pnpm exec vite --port 5174 --strictPort', url: 'http://localhost:5174', reuseExistingServer: true, timeout: 60_000 },
});
