const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  acquireRemoteLease,
  acquireLocalLock,
  assertNoActiveGithubCi,
  coordinateAuthenticatedSuite,
  lockFilePath,
  releaseRemoteLease,
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
  await release();
  assert.equal(fs.existsSync(lockFilePath(env)), false);
});

test('dispatches a remote lease and waits until it owns the concurrency group', async () => {
  const calls = [];
  let listCount = 0;
  const lease = await acquireRemoteLease({
    randomUUID: () => '11111111-1111-4111-8111-111111111111',
    now: (() => { let value = 0; return () => value++; })(),
    waitTimeoutMs: 20,
    pollIntervalMs: 0,
    async sleep() {},
    async executeGhCommand(args) {
      calls.push(args);
      if (args[0] === 'workflow') return '';
      listCount += 1;
      return JSON.stringify([{
        databaseId: 42,
        displayTitle: 'Authenticated local lease 11111111-1111-4111-8111-111111111111',
        status: listCount === 1 ? 'queued' : 'in_progress',
        conclusion: '',
      }]);
    },
  });
  assert.equal(lease.runId, 42);
  assert.equal(calls[0].includes('lease_id=11111111-1111-4111-8111-111111111111'), true);
  assert.equal(listCount, 2);
});

test('cancels the remote lease and waits for confirmed completion', async () => {
  const calls = [];
  let viewCount = 0;
  await releaseRemoteLease({runId: 42}, {
    now: (() => { let value = 0; return () => value++; })(),
    waitTimeoutMs: 20,
    pollIntervalMs: 0,
    async sleep() {},
    async executeGhCommand(args) {
      calls.push(args);
      if (args[1] === 'cancel') return '';
      viewCount += 1;
      return JSON.stringify({
        status: viewCount === 1 ? 'in_progress' : 'completed',
        conclusion: viewCount === 1 ? '' : 'cancelled',
      });
    },
  });
  assert.deepEqual(calls[0].slice(0, 3), ['run', 'cancel', '42']);
  assert.equal(viewCount, 2);
});

test('releases the local lock when remote dispatch fails closed', async () => {
  const env = makeTempEnv();
  await assert.rejects(coordinateAuthenticatedSuite({
    env,
    async fetchRequest() {
      return {ok: true, async json() { return {workflow_runs: []}; }};
    },
    async executeGhCommand() {
      throw new Error('gh unavailable');
    },
  }), /authenticated-smoke-remote-lease-dispatch-failed/);
  assert.equal(fs.existsSync(lockFilePath(env)), false);
});

test('keeps the local lock through the remote lease and releases both exactly once', async () => {
  const env = makeTempEnv();
  const calls = [];
  const release = await coordinateAuthenticatedSuite({
    env,
    randomUUID: () => '22222222-2222-4222-8222-222222222222',
    now: (() => { let value = 0; return () => value++; })(),
    waitTimeoutMs: 20,
    pollIntervalMs: 0,
    async sleep() {},
    async fetchRequest() {
      return {ok: true, async json() { return {workflow_runs: []}; }};
    },
    async executeGhCommand(args) {
      calls.push(args);
      if (args[0] === 'workflow') return '';
      if (args[1] === 'list') {
        return JSON.stringify([{
          databaseId: 77,
          displayTitle: 'Authenticated local lease 22222222-2222-4222-8222-222222222222',
          status: 'in_progress',
          conclusion: '',
        }]);
      }
      if (args[1] === 'cancel') return '';
      return JSON.stringify({status: 'completed', conclusion: 'cancelled'});
    },
  });
  assert.equal(fs.existsSync(lockFilePath(env)), true);
  await release();
  await release();
  assert.equal(fs.existsSync(lockFilePath(env)), false);
  assert.equal(calls.filter(args => args[1] === 'cancel').length, 1);
});
