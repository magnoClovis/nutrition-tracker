const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const {verifyCspPolicy} = require('../../scripts/verify-csp-policy.js');

const sourceHtml = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');

test('CSP precedes scripts and hashes every inline script/style block', () => {
  const policy = verifyCspPolicy(sourceHtml);
  assert.match(policy, /script-src 'self'/);
  assert.match(policy, /https:\/\/www\.google\.com\/recaptcha\//);
  assert.match(policy, /script-src[^;]*https:\/\/apis\.google\.com\/js\/api\.js/);
  assert.match(policy, /script-src[^;]*https:\/\/apis\.google\.com\/_\/scs\//);
  assert.doesNotMatch(policy, /script-src[^;]*https:\/\/apis\.google\.com(?:\s|;)/);
  assert.match(policy, /frame-src[^;]*https:\/\/nutrition-tracker-780b3\.firebaseapp\.com(?:\s|;)/);
  assert.doesNotMatch(policy, /frame-src[^;]*https:\/\/\*\.firebaseapp\.com/);
  assert.match(policy, /connect-src[^;]*https:\/\/apis\.google\.com\/js\/gen_204(?:\s|;)/);
  assert.doesNotMatch(policy, /connect-src[^;]*https:\/\/apis\.google\.com(?:\s|;)/);
  assert.match(policy, /img-src[^;]*https:\/\/www\.google\.com\/images\/cleardot\.gif/);
  assert.match(policy, /https:\/\/trofia-ai-proxy\.cmagno-dev\.workers\.dev/);
});

test('CSP fails closed if an inline bootstrap script changes without updating its hash', () => {
  const changed = sourceHtml.replace('window.APP_VERSION_LABEL =', 'window.APP_VERSION_LABEL  =');
  assert.throws(() => verifyCspPolicy(changed), /CSP hash missing for inline script/);
});

test('CSP refuses unsafe script directives or a policy placed after bootstrap', () => {
  assert.throws(
    () => verifyCspPolicy(sourceHtml.replace("script-src 'self'", "script-src 'unsafe-inline' 'self'")),
    /must not allow/,
  );
  const meta = sourceHtml.match(/  <meta http-equiv="Content-Security-Policy"[^\n]+\n/)[0];
  assert.throws(
    () => verifyCspPolicy(sourceHtml.replace(meta, '').replace('</head>', `${meta}</head>`)),
    /must precede/,
  );
});
