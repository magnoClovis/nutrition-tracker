const { test: base, expect } = require('@playwright/test');
const { hasCredentials } = require('./test-credentials');
const {
  FIRESTORE_ORIGIN,
  buildFirestoreHeaders,
  installCiAppCheck,
  readCiAppCheckConfig,
} = require('./app-check-ci');

async function installCiAppCheckForTarget(target, {
  credentialsAvailable = hasCredentials,
  env = process.env,
} = {}) {
  const { debugToken } = readCiAppCheckConfig(env);
  if (!debugToken) {
    if (credentialsAvailable) throw new Error('app-check-ci-token-unavailable');
    return;
  }

  // Pages uses a simulated Auth/storage contract, but the production bundle
  // still initializes the real App Check SDK. Installing the registered debug
  // provider before page scripts is therefore sufficient for that deterministic
  // UI harness and does not grant it access to Firestore.
  await target.addInitScript(installCiAppCheck, debugToken);
  if (!credentialsAvailable) return;

  const appCheckToken = String(env.TROFIA_CI_APP_CHECK_TOKEN || '').trim();
  if (!appCheckToken) throw new Error('app-check-ci-token-unavailable');
  await target.route(`${FIRESTORE_ORIGIN}/**`, async (route) => {
    await route.continue({
      headers: buildFirestoreHeaders(route.request().headers(), appCheckToken),
    });
  });
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

module.exports = { expect, installCiAppCheckForContext, installCiAppCheckForTarget, test };
