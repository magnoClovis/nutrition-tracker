const { defineConfig, devices } = require('@playwright/test');

/**
 * Smoke test configuration for the static app.
 *
 * The app is served through a local HTTP server so browser APIs behave closer
 * to production than they would from a raw file:// URL. Authenticated tests are
 * opt-in through environment variables and never store credentials in the repo.
 */
module.exports = defineConfig({
  testDir: './tests/smoke',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    baseURL: 'http://127.0.0.1:8765',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'node tests/smoke/serve-static.js',
    cwd: __dirname,
    url: 'http://127.0.0.1:8765/index.html',
    reuseExistingServer: true,
    timeout: 10000
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] }
    }
  ]
});
