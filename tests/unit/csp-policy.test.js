const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const {renderStagingCspHtml, verifyCspPolicy, verifyStagingCspPolicy} = require('../../scripts/verify-csp-policy.js');

const sourceHtml = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
const stagingManifest = {
  firebase: {authDomain: 'trofia-staging.firebaseapp.com'},
  worker: {origin: 'https://trofia-ai-proxy-staging.example.workers.dev'},
  callable: {url: 'https://europe-southwest1-trofia-staging.cloudfunctions.net/requestAccountDeletion'},
};

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

test('staging CSP replaces only the three environment destinations and preserves inline hashes', () => {
  const staged = renderStagingCspHtml(sourceHtml, stagingManifest);
  const policy = verifyStagingCspPolicy(staged, stagingManifest);
  assert.match(policy, /https:\/\/trofia-ai-proxy-staging\.example\.workers\.dev/);
  assert.match(policy, /https:\/\/europe-southwest1-trofia-staging\.cloudfunctions\.net/);
  assert.match(policy, /https:\/\/trofia-staging\.firebaseapp\.com/);
  assert.doesNotMatch(policy, /nutrition-tracker-780b3|trofia-ai-proxy\.cmagno-dev/);
  assert.match(policy, /script-src 'self' 'sha256-/);
  assert.equal(staged
    .replace(stagingManifest.worker.origin, 'https://trofia-ai-proxy.cmagno-dev.workers.dev')
    .replace('https://europe-southwest1-trofia-staging.cloudfunctions.net', 'https://europe-southwest1-nutrition-tracker-780b3.cloudfunctions.net')
    .replace('https://trofia-staging.firebaseapp.com', 'https://nutrition-tracker-780b3.firebaseapp.com'), sourceHtml);
});

test('staging CSP refuses incomplete, production, wildcard and wrong-project destinations', () => {
  assert.throws(() => renderStagingCspHtml(sourceHtml, {...stagingManifest, worker: {origin: ''}}), /incomplete/);
  assert.throws(() => renderStagingCspHtml(sourceHtml, {...stagingManifest, worker: {origin: 'https://trofia-ai-proxy.cmagno-dev.workers.dev'}}), /production/);
  assert.throws(() => renderStagingCspHtml(sourceHtml, {...stagingManifest, worker: {origin: 'https://*.workers.dev'}}), /wildcard|invalid|exact/);
  assert.throws(() => renderStagingCspHtml(sourceHtml, {...stagingManifest, firebase: {authDomain: 'nutrition-tracker-780b3.firebaseapp.com'}}), /production|another project/);
  assert.throws(() => renderStagingCspHtml(sourceHtml, {...stagingManifest, callable: {url: 'https://europe-southwest1-other.cloudfunctions.net/requestAccountDeletion'}}), /another project/);
  const staged = renderStagingCspHtml(sourceHtml, stagingManifest);
  assert.throws(() => verifyStagingCspPolicy(staged.replace('trofia-staging.firebaseapp.com', 'nutrition-tracker-780b3.firebaseapp.com'), stagingManifest), /lacks Auth|production/);
});
