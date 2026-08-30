const { test: base, expect } = require('@playwright/test');
const { hasCredentials } = require('./test-credentials');
const {
  FIRESTORE_ORIGIN,
  buildFirestoreHeaders,
  installCiAppCheck,
  readCiAppCheckConfig,
} = require('./app-check-ci');

const test = base.extend({
  page: async ({ page }, use) => {
    if (hasCredentials) {
      const { debugToken } = readCiAppCheckConfig();
      const appCheckToken = String(process.env.TROFIA_CI_APP_CHECK_TOKEN || '').trim();
      if (!debugToken || !appCheckToken) {
        throw new Error('app-check-ci-token-unavailable');
      }
      await page.route(`${FIRESTORE_ORIGIN}/**`, async (route) => {
        await route.continue({
          headers: buildFirestoreHeaders(route.request().headers(), appCheckToken),
        });
      });
      await page.addInitScript(installCiAppCheck, debugToken);
    }
    await use(page);
  },
});

module.exports = { expect, test };
