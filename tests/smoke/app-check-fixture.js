const { test: base, expect } = require('@playwright/test');
const { hasCredentials } = require('./test-credentials');
const {
  FIRESTORE_ORIGIN,
  buildFirestoreHeaders,
  installCiAppCheck,
  readCiAppCheckConfig,
} = require('./app-check-ci');

async function installCiAppCheckForTarget(target) {
  if (!hasCredentials) return;

  const { debugToken } = readCiAppCheckConfig();
  const appCheckToken = String(process.env.TROFIA_CI_APP_CHECK_TOKEN || '').trim();
  if (!debugToken || !appCheckToken) {
    throw new Error('app-check-ci-token-unavailable');
  }
  await target.route(`${FIRESTORE_ORIGIN}/**`, async (route) => {
    await route.continue({
      headers: buildFirestoreHeaders(route.request().headers(), appCheckToken),
    });
  });
  await target.addInitScript(installCiAppCheck, debugToken);
}

async function installCiAppCheckForContext(context) {
  await installCiAppCheckForTarget(context);
}

const test = base.extend({
  page: async ({ page }, use) => {
    await installCiAppCheckForTarget(page);
    await use(page);
  },
});

module.exports = { expect, installCiAppCheckForContext, test };
