const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('App Check and modular Auth depend on the same lazy Firebase app', () => {
  const appCheck = read('src/firebase/app-check-client.js');
  const auth = read('src/firebase/firebase-auth-sdk.js');
  assert.match(appCheck, /getSharedFirebaseApp\(\)/);
  assert.match(auth, /getAuth\(getSharedFirebaseApp\(\)\)/);
  assert.match(appCheck, /new CustomProvider\(\{getToken: readNativeToken\}\)/);
  assert.match(appCheck, /new ReCaptchaEnterpriseProvider\(siteKey\)/);
  assert.match(appCheck, /normalizeNativeAppCheckToken\(result\)/);
});

test('the modular Auth adapter remains staged and does not cut over active sessions yet', () => {
  const activeFacade = read('src/firebase/firebase-storage.js');
  const app = read('src/App.jsx');
  assert.doesNotMatch(activeFacade, /firebase-auth-sdk/);
  assert.doesNotMatch(app, /createModularAuthClient/);
  assert.match(activeFacade, /firebase-auth-internal/);
});
