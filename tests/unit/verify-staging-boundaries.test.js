'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  RUNTIME_FILES,
  inspectStagingSources,
  verifyDeploymentTarget,
} = require('../../scripts/verify-staging-boundaries.js');

function stagingSources() {
  return Object.fromEntries(RUNTIME_FILES.map((file) => [file, 'staging-only runtime']));
}

const stagingManifest = Object.freeze({
  firebase: { authDomain: 'trofia-staging.firebaseapp.com' },
  worker: { origin: 'https://trofia-ai-proxy-staging.example.workers.dev' },
  callable: { url: 'https://europe-southwest1-trofia-staging.cloudfunctions.net/requestAccountDeletion' },
});

function sourcesWithProductionCsp() {
  const sources = stagingSources();
  sources['index.html'] = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
  return sources;
}

test('accepts runtime sources without production bindings', () => {
  assert.deepEqual(inspectStagingSources(stagingSources()), []);
});

test('rejects production Firebase, Worker, and Android bindings without exposing source content', () => {
  const sources = stagingSources();
  sources['firebase-config-internal.js'] = 'project: nutrition-tracker-780b3';
  sources['ai-client.js'] = 'https://trofia-ai-proxy.cmagno-dev.workers.dev/v1/ai';
  sources['worker/wrangler.jsonc'] = '"name": "trofia-ai-proxy"';
  sources['android/app/build.gradle'] = 'applicationId "com.hermegas.trofia"';

  assert.deepEqual(inspectStagingSources(sources), [
    'firebase-config-internal.js: Firebase production project',
    'ai-client.js: production AI Worker host',
    'worker/wrangler.jsonc: production Worker deployment name',
    'android/app/build.gradle: production Android application ID',
  ]);
});

test('fails closed if a required runtime source is missing', () => {
  const sources = stagingSources();
  delete sources['functions/src/config.js'];
  assert.deepEqual(inspectStagingSources(sources), [
    'functions/src/config.js: required runtime source is missing',
  ]);
});

test('checks transformed staging CSP rather than production HTML baseline after manifest validation', () => {
  const sources = sourcesWithProductionCsp();
  assert.ok(inspectStagingSources(sources).includes('index.html: Firebase production project'));
  assert.deepEqual(inspectStagingSources(sources, stagingManifest), []);
});

test('still rejects production bindings outside the transformed CSP', () => {
  const sources = sourcesWithProductionCsp();
  sources['index.html'] += '<script src="https://trofia-ai-proxy.cmagno-dev.workers.dev/app.js"></script>';
  assert.deepEqual(inspectStagingSources(sources, stagingManifest), [
    'index.html: production AI Worker host',
  ]);
});

test('fails closed if the staging CSP cannot be transformed', () => {
  const sources = sourcesWithProductionCsp();
  sources['index.html'] = sources['index.html'].replace('Content-Security-Policy', 'Invalid-CSP');
  assert.deepEqual(inspectStagingSources(sources, stagingManifest), [
    'index.html: staging CSP transformation failed',
  ]);
});

test('rejects unknown deployment targets and blocks staging on the current production-bound sources', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  assert.throws(() => verifyDeploymentTarget('', projectRoot), /Unknown Trofia deployment target/);
  assert.throws(() => verifyDeploymentTarget('preview', projectRoot), /Unknown Trofia deployment target/);
  assert.throws(() => verifyDeploymentTarget('staging', projectRoot), /Staging manifest check failed/);
  assert.doesNotThrow(() => verifyDeploymentTarget('production', projectRoot));
});
