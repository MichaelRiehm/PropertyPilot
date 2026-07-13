import { defineConfig, devices } from '@playwright/test';

const FRONTEND_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const BACKEND_HEALTH = process.env.E2E_BACKEND_HEALTH ?? 'http://localhost:4000/api/health';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // In CI, the workflow starts the backend + frontend before invoking Playwright.
  // Locally, spin them up ourselves so `npm run test:e2e` from the repo root just works.
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: 'npm run dev -w backend',
          url: BACKEND_HEALTH,
          cwd: '..',
          reuseExistingServer: true,
          timeout: 60_000,
          env: {
            E2E_BYPASS_AUTH_RATE_LIMIT: '1',
          },
        },
        {
          command: 'npm run dev -w frontend',
          url: FRONTEND_URL,
          cwd: '..',
          reuseExistingServer: true,
          timeout: 60_000,
        },
      ],
});
