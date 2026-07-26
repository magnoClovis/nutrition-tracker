const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/smoke',
  testMatch: /cutover-visual-matrix\.spec\.js/,
  timeout: 120000,
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report/cutover' }],
    ['json', { outputFile: 'test-results/cutover-playwright-results.json' }]
  ],
  use: {
    ...devices['Desktop Chrome'],
    launchOptions: {
      args: ['--disable-gpu']
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: [
    {
      command: 'node tests/smoke/serve-static.js . 8775 tests/fixtures/index.legacy.html',
      cwd: __dirname,
      url: 'http://127.0.0.1:8775/index.html',
      reuseExistingServer: false,
      timeout: 10000
    },
    {
      command: 'node tests/smoke/serve-static.js dist 8776',
      cwd: __dirname,
      url: 'http://127.0.0.1:8776/index.html',
      reuseExistingServer: false,
      timeout: 10000
    }
  ],
  projects: [
    {
      name: 'legacy-vite-cutover-matrix'
    }
  ]
});
