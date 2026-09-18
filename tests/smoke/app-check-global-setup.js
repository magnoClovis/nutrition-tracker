const { hasCredentials } = require('./test-credentials');
const { exchangeDebugToken, readCiAppCheckConfig } = require('./app-check-ci');
const { coordinateAuthenticatedSuite } = require('./authenticated-suite-coordinator');

module.exports = async function prepareAppCheckForAuthenticatedSmoke() {
  if (!hasCredentials) return;

  const releaseSuite = await coordinateAuthenticatedSuite();
  try {
    const config = readCiAppCheckConfig();
    if (!config.debugToken || !config.appId) {
      throw new Error('app-check-ci-debug-token-missing');
    }

    process.env.TROFIA_CI_APP_CHECK_TOKEN = await exchangeDebugToken(config);
    return releaseSuite;
  } catch (error) {
    releaseSuite();
    throw error;
  }
};
