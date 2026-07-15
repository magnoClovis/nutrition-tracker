const fs = require('node:fs');
const path = require('node:path');

const LOCAL_CREDENTIALS_PATH = path.resolve(__dirname, '..', 'test-user.local.json');
const AUTH_STATE_PATH = path.resolve(__dirname, '..', '..', 'playwright', '.auth', 'user.json');

function readLocalCredentials() {
  if (!fs.existsSync(LOCAL_CREDENTIALS_PATH)) return {};

  try {
    const parsed = JSON.parse(fs.readFileSync(LOCAL_CREDENTIALS_PATH, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    throw new Error(`Invalid JSON in ${LOCAL_CREDENTIALS_PATH}: ${error.message}`);
  }
}

const localCredentials = readLocalCredentials();
const email = String(process.env.NUTRITION_TEST_EMAIL || localCredentials.email || '').trim();
const password = String(process.env.NUTRITION_TEST_PASSWORD || localCredentials.password || '');
const hasCredentials = Boolean(email && password);
const missingCredentialsMessage =
  'credenciais de teste não configuradas — preencha tests/test-user.local.json ou defina NUTRITION_TEST_EMAIL/NUTRITION_TEST_PASSWORD';

module.exports = {
  AUTH_STATE_PATH,
  LOCAL_CREDENTIALS_PATH,
  email,
  password,
  hasCredentials,
  missingCredentialsMessage
};
