const { hasCredentials } = require('./test-credentials');
const { exchangeDebugToken, readCiAppCheckConfig } = require('./app-check-ci');

module.exports = async function prepareAppCheckForAuthenticatedSmoke() {
  if (!hasCredentials) return;

  const config = readCiAppCheckConfig();
  if (!config.debugToken || !config.appId) {
    throw new Error('app-check-ci-debug-token-missing');
  }

  process.env.TROFIA_CI_APP_CHECK_TOKEN = await exchangeDebugToken(config);
};
