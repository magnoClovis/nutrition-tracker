const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  acquireLocalLock,
  assertNoActiveGithubCi,
  coordinateAuthenticatedSuite,
  lockFilePath,
  releaseLocalLock,
} = require('../smoke/authenticated-suite-coordinator');

function makeTempEnv() {
  return {LOCALAPPDATA: fs.mkdtempSync(path.join(os.tmpdir(), 'trofia-auth-lock-'))};
}

test('serializes authenticated suites across local worktrees', () => {
  const env = makeTempEnv();
  const first = acquireLocalLock({env, randomUUID: () => 'first'});
  assert.throws(
    () => acquireLocalLock({env, randomUUID: () => 'second'}),
    /authenticated-smoke-local-run-active/,
  );
  releaseLocalLock(first);
  assert.equal(fs.existsSync(lockFilePath(env)), false);
});

test('reclaims a lock whose owner process no longer exists', () => {
  const env = makeTempEnv();
  const stalePath = lockFilePath(env);
  fs.mkdirSync(path.dirname(stalePath), {recursive: true});
  fs.writeFileSync(stalePath, JSON.stringify({token: 'stale', pid: 99999999}));

  const lock = acquireLocalLock({
    env,
    randomUUID: () => 'replacement',
    killProcess() { throw new Error('not running'); },
  });
  assert.equal(JSON.parse(fs.readFileSync(stalePath, 'utf8')).token, 'replacement');
  releaseLocalLock(lock);
});

test('fails closed when a GitHub authenticated CI run is active', async () => {
  await assert.rejects(assertNoActiveGithubCi({
    env: {},
    async fetchRequest() {
      return {
        ok: true,
        async json() {
          return {workflow_runs: [{id: 35281945540, name: 'CI', status: 'in_progress'}]};
        },
      };
    },
  }), /authenticated-smoke-github-ci-active:35281945540/);
});

test('releases the local lock when the GitHub guard rejects', async () => {
  const env = makeTempEnv();
  await assert.rejects(coordinateAuthenticatedSuite({
    env,
    async fetchRequest() {
      return {
        ok: true,
        async json() {
          return {workflow_runs: [{id: 7, name: 'CI', status: 'queued'}]};
        },
      };
    },
  }), /authenticated-smoke-github-ci-active:7/);
  assert.equal(fs.existsSync(lockFilePath(env)), false);
});

test('trusts GitHub concurrency inside Actions and returns a local release handle', async () => {
  const env = {...makeTempEnv(), GITHUB_ACTIONS: 'true'};
  const release = await coordinateAuthenticatedSuite({
    env,
    fetchRequest() { throw new Error('must not fetch from CI'); },
  });
  assert.equal(fs.existsSync(lockFilePath(env)), true);
  release();
  assert.equal(fs.existsSync(lockFilePath(env)), false);
});
