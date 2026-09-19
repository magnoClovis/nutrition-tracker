const { defineConfig, devices } = require('@playwright/test');

const baseURL = process.env.PAGES_BASE_URL;
if (!baseURL) {
  throw new Error('PAGES_BASE_URL is required for the deployed Pages smoke test');
}

module.exports = defineConfig({
  testDir: './tests/smoke',
  testMatch: /app-orchestration\.spec\.js/,
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report/pages' }],
    ['json', { outputFile: 'test-results/pages-playwright-results.json' }]
  ],
  use: {
    baseURL,
    // The registered App Check debug secret is installed before page scripts
    // in Pages CI. Never retain a trace that could capture it.
    trace: process.env.FIREBASE_APPCHECK_DEBUG_TOKEN ? 'off' : 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'pages-desktop-chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'pages-mobile-chromium',
      use: { ...devices['Pixel 5'] }
    }
  ]
});
