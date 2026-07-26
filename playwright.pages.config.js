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
    trace: 'retain-on-failure',
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
