const { defineConfig, devices } = require('@playwright/test');

/**
 * Smoke test configuration for the static app.
 *
 * The app is served through a local HTTP server so browser APIs behave closer
 * to production than they would from a raw file:// URL. Authenticated tests are
 * opt-in through environment variables or tests/test-user.local.json. The
 * ignored playwright/.auth/user.json state avoids logging in before every test.
 */
module.exports = defineConfig({
  testDir: './tests/smoke',
  testIgnore: /cutover-visual-matrix\.spec\.js/,
  globalSetup: require.resolve('./tests/smoke/app-check-global-setup.js'),
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }]
  ],
  use: {
    baseURL: 'http://127.0.0.1:8765',
    // The App Check debug secret is installed before page scripts in CI. Do
    // not retain network traces that could capture that registered secret.
    trace: process.env.FIREBASE_APPCHECK_DEBUG_TOKEN ? 'off' : 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'node tests/smoke/serve-static.js . 8765 tests/fixtures/index.legacy.html',
    cwd: __dirname,
    url: 'http://127.0.0.1:8765/index.html',
    reuseExistingServer: false,
    timeout: 10000
  },
  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.js/,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'desktop-chromium',
      testIgnore: [/auth\.setup\.js/, /cutover-visual-matrix\.spec\.js/],
      dependencies: ['auth-setup'],
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile-chromium',
      testIgnore: [/auth\.setup\.js/, /cutover-visual-matrix\.spec\.js/],
      dependencies: ['auth-setup'],
      use: { ...devices['Pixel 5'] }
    }
  ]
});
