const test = require('node:test');
const assert = require('node:assert/strict');

async function loadGate() {
  return import('../../src/leaf/authenticated-profile-gate.js');
}

test('waits for a real App Check token before the protected profile read', async () => {
  const {resolveAuthenticatedProfileGate} = await loadGate();
  const calls = [];
  let releaseToken;
  const token = new Promise(resolve => { releaseToken = resolve; });
  const pending = resolveAuthenticatedProfileGate({
    isNewAccount: false,
    getAppCheckToken: async () => { calls.push('token:start'); await token; calls.push('token:ready'); },
    readServerProfile: async () => { calls.push('profile'); return {complete: true}; },
    hasRequiredProfileData: profile => profile.complete,
  });

  await Promise.resolve();
  assert.deepEqual(calls, ['token:start']);
  releaseToken('real-token');
  assert.equal((await pending).status, 'complete');
  assert.deepEqual(calls, ['token:start', 'token:ready', 'profile']);
});

test('fails closed on invalid token or unavailable server without reading cache', async () => {
  const {resolveAuthenticatedProfileGate} = await loadGate();
  let reads = 0;
  const tokenError = Object.assign(new Error('dummy token'), {code: 'app-check-token-invalid'});
  await assert.rejects(resolveAuthenticatedProfileGate({
    isNewAccount: false,
    getAppCheckToken: async () => { throw tokenError; },
    readServerProfile: async () => { reads++; return {}; },
    hasRequiredProfileData: () => false,
  }), error => error === tokenError);
  assert.equal(reads, 0);

  const networkError = Object.assign(new Error('offline'), {code: 'unavailable'});
  await assert.rejects(resolveAuthenticatedProfileGate({
    isNewAccount: false,
    getAppCheckToken: async () => 'token',
    readServerProfile: async () => { throw networkError; },
    hasRequiredProfileData: () => false,
  }), error => error === networkError);
});

test('only a confirmed new account can reach profile completion', async () => {
  const {resolveAuthenticatedProfileGate} = await loadGate();
  const resolve = isNewAccount => resolveAuthenticatedProfileGate({
    isNewAccount,
    getAppCheckToken: async () => 'token',
    readServerProfile: async () => ({birthDate: ''}),
    hasRequiredProfileData: () => false,
  });

  assert.equal((await resolve(true)).status, 'requires-completion');
  assert.equal((await resolve(false)).status, 'incomplete-existing');
});

test('reload of an existing account stays out of the creation-only modal', async () => {
  const {resolveAuthenticatedProfileGate} = await loadGate();
  let serverProfile = {complete: false};
  const runAfterReload = () => resolveAuthenticatedProfileGate({
    isNewAccount: false,
    getAppCheckToken: async () => 'token',
    readServerProfile: async () => serverProfile,
    hasRequiredProfileData: profile => profile.complete,
  });

  assert.equal((await runAfterReload()).status, 'incomplete-existing');
  serverProfile = {complete: true};
  assert.equal((await runAfterReload()).status, 'complete');
});
