const baseConfig = require('./playwright.config.js');

module.exports = {
  ...baseConfig,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report/vite' }],
    ['json', { outputFile: 'test-results/vite-playwright-results.json' }]
  ],
  use: {
    ...baseConfig.use,
    baseURL: 'http://127.0.0.1:8766'
  },
  webServer: {
    ...baseConfig.webServer,
    command: 'node tests/smoke/serve-static.js dist 8766',
    url: 'http://127.0.0.1:8766/index.html',
    reuseExistingServer: false
  }
};
