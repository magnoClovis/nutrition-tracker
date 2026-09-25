const crypto = require('node:crypto');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const util = require('node:util');

const DEFAULT_REPOSITORY = 'magnoClovis/nutrition-tracker';
const LOCK_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const REMOTE_LEASE_WORKFLOW = 'authenticated-local-lease.yml';
const REMOTE_LEASE_WAIT_MS = 2 * 60 * 1000;
const REMOTE_LEASE_POLL_MS = 1000;
const execFile = util.promisify(childProcess.execFile);

function lockFilePath(env = process.env) {
  const base = String(env.LOCALAPPDATA || '').trim()
    || path.join(os.tmpdir(), 'Trofia');
  return path.join(base, 'Trofia', 'authenticated-smoke.lock');
}

function processIsAlive(pid, killProcess = process.kill) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    killProcess(pid, 0);
    return true;
  } catch (_) {
    return false;
  }
}

function readLock(lockPath, fsImpl = fs) {
  try {
    return JSON.parse(fsImpl.readFileSync(lockPath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function existingLockIsStale(lockPath, {
  fsImpl = fs,
  now = Date.now,
  killProcess = process.kill,
} = {}) {
  const record = readLock(lockPath, fsImpl);
  if (record && !processIsAlive(Number(record.pid), killProcess)) return true;
  try {
    return Number(now()) - fsImpl.statSync(lockPath).mtimeMs > LOCK_MAX_AGE_MS;
  } catch (_) {
    return true;
  }
}

function acquireLocalLock({
  env = process.env,
  fsImpl = fs,
  now = Date.now,
  pid = process.pid,
  cwd = process.cwd(),
  killProcess = process.kill,
  randomUUID = crypto.randomUUID,
} = {}) {
  const lockPath = lockFilePath(env);
  fsImpl.mkdirSync(path.dirname(lockPath), {recursive: true});

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = randomUUID();
    try {
      const descriptor = fsImpl.openSync(lockPath, 'wx');
      fsImpl.writeFileSync(descriptor, JSON.stringify({
        token,
        pid,
        startedAt: new Date(Number(now())).toISOString(),
        cwd,
      }));
      fsImpl.closeSync(descriptor);
      return Object.freeze({lockPath, token});
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      if (attempt === 0 && existingLockIsStale(lockPath, {fsImpl, now, killProcess})) {
        fsImpl.rmSync(lockPath, {force: true});
        continue;
      }
      const lockError = new Error('authenticated-smoke-local-run-active');
      lockError.code = 'authenticated-smoke-local-run-active';
      throw lockError;
    }
  }
  throw new Error('authenticated-smoke-lock-unavailable');
}

function releaseLocalLock(lock, fsImpl = fs) {
  if (!lock?.lockPath || !lock?.token) return;
  const current = readLock(lock.lockPath, fsImpl);
  if (current?.token !== lock.token) return;
  fsImpl.rmSync(lock.lockPath, {force: true});
}

async function assertNoActiveGithubCi({
  env = process.env,
  fetchRequest = globalThis.fetch,
  repository = DEFAULT_REPOSITORY,
} = {}) {
  if (String(env.GITHUB_ACTIONS || '').toLowerCase() === 'true') return;
  if (typeof fetchRequest !== 'function') {
    throw new Error('authenticated-smoke-ci-check-unavailable');
  }
  const response = await fetchRequest(
    `https://api.github.com/repos/${repository}/actions/runs?per_page=100`,
    {headers: {'Accept': 'application/vnd.github+json'}},
  );
  if (!response?.ok) throw new Error('authenticated-smoke-ci-check-failed');
  const payload = await response.json();
  const active = (payload?.workflow_runs || []).filter(run => (
    run?.name === 'CI' && ['queued', 'in_progress', 'waiting', 'pending'].includes(run?.status)
  ));
  if (active.length) {
    const error = new Error(`authenticated-smoke-github-ci-active:${active.map(run => run.id).join(',')}`);
    error.code = 'authenticated-smoke-github-ci-active';
    throw error;
  }
}

async function executeGh(args) {
  const result = await execFile('gh', args, {
    windowsHide: true,
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });
  return String(result?.stdout || '');
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function listRemoteLeaseRuns({
  executeGhCommand = executeGh,
  repository = DEFAULT_REPOSITORY,
} = {}) {
  let output;
  try {
    output = await executeGhCommand([
      'run', 'list',
      '--repo', repository,
      '--workflow', REMOTE_LEASE_WORKFLOW,
      '--event', 'workflow_dispatch',
      '--limit', '30',
      '--json', 'databaseId,displayTitle,status,conclusion',
    ]);
  } catch (_) {
    throw new Error('authenticated-smoke-remote-lease-list-failed');
  }
  try {
    const parsed = JSON.parse(output);
    if (!Array.isArray(parsed)) throw new Error('invalid-list');
    return parsed;
  } catch (_) {
    throw new Error('authenticated-smoke-remote-lease-list-invalid');
  }
}

async function releaseRemoteLease(lease, {
  executeGhCommand = executeGh,
  repository = DEFAULT_REPOSITORY,
  sleep = wait,
  now = Date.now,
  waitTimeoutMs = REMOTE_LEASE_WAIT_MS,
  pollIntervalMs = REMOTE_LEASE_POLL_MS,
} = {}) {
  if (!lease?.runId) return;
  const deadline = Number(now()) + waitTimeoutMs;
  let cancellationRequested = false;
  while (Number(now()) <= deadline) {
    if (!cancellationRequested) {
      try {
        await executeGhCommand(['run', 'cancel', String(lease.runId), '--repo', repository]);
        cancellationRequested = true;
      } catch (_) {
        // Cancellation is idempotent from the coordinator's perspective. A
        // transient CLI/API failure must not abandon an active lease for its
        // full one-hour timeout; inspect the run, then retry while it is live.
      }
    }
    let output;
    try {
      output = await executeGhCommand([
        'run', 'view', String(lease.runId),
        '--repo', repository,
        '--json', 'status,conclusion',
      ]);
    } catch (_) {
      throw new Error(`authenticated-smoke-remote-lease-view-failed:${lease.runId}`);
    }
    let state;
    try {
      state = JSON.parse(output);
    } catch (_) {
      throw new Error(`authenticated-smoke-remote-lease-view-invalid:${lease.runId}`);
    }
    if (state?.status === 'completed') return;
    await sleep(pollIntervalMs);
  }
  throw new Error(`authenticated-smoke-remote-lease-release-timeout:${lease.runId}`);
}

async function acquireRemoteLease({
  executeGhCommand = executeGh,
  repository = DEFAULT_REPOSITORY,
  randomUUID = crypto.randomUUID,
  sleep = wait,
  now = Date.now,
  waitTimeoutMs = REMOTE_LEASE_WAIT_MS,
  pollIntervalMs = REMOTE_LEASE_POLL_MS,
} = {}) {
  const leaseId = randomUUID();
  const title = `Authenticated local lease ${leaseId}`;
  try {
    await executeGhCommand([
      'workflow', 'run', REMOTE_LEASE_WORKFLOW,
      '--repo', repository,
      '--ref', 'main',
      '-f', `lease_id=${leaseId}`,
    ]);
  } catch (_) {
    throw new Error('authenticated-smoke-remote-lease-dispatch-failed');
  }

  const deadline = Number(now()) + waitTimeoutMs;
  let run = null;
  try {
    while (Number(now()) <= deadline) {
      const runs = await listRemoteLeaseRuns({executeGhCommand, repository});
      run = runs.find(candidate => candidate?.displayTitle === title) || null;
      if (run?.status === 'in_progress') {
        return Object.freeze({runId: Number(run.databaseId)});
      }
      if (run?.status === 'completed') {
        throw new Error(`authenticated-smoke-remote-lease-failed:${run.databaseId}`);
      }
      await sleep(pollIntervalMs);
    }
    throw new Error('authenticated-smoke-remote-lease-acquire-timeout');
  } catch (error) {
    if (run?.databaseId && run?.status !== 'completed') {
      try {
        await releaseRemoteLease({runId: Number(run.databaseId)}, {
          executeGhCommand,
          repository,
          sleep,
          now,
          waitTimeoutMs,
          pollIntervalMs,
        });
      } catch (_) {
        throw new Error(`authenticated-smoke-remote-lease-cleanup-failed:${run.databaseId}`);
      }
    }
    throw error;
  }
}

async function coordinateAuthenticatedSuite(options = {}) {
  const lock = acquireLocalLock(options);
  let remoteLease = null;
  try {
    await assertNoActiveGithubCi(options);
    if (String((options.env || process.env).GITHUB_ACTIONS || '').toLowerCase() !== 'true') {
      remoteLease = await acquireRemoteLease(options);
    }
    let released = false;
    return async () => {
      if (released) return;
      released = true;
      try {
        await releaseRemoteLease(remoteLease, options);
      } finally {
        releaseLocalLock(lock, options.fsImpl || fs);
      }
    };
  } catch (error) {
    releaseLocalLock(lock, options.fsImpl || fs);
    throw error;
  }
}

module.exports = {
  DEFAULT_REPOSITORY,
  LOCK_MAX_AGE_MS,
  REMOTE_LEASE_POLL_MS,
  REMOTE_LEASE_WAIT_MS,
  REMOTE_LEASE_WORKFLOW,
  acquireRemoteLease,
  acquireLocalLock,
  assertNoActiveGithubCi,
  coordinateAuthenticatedSuite,
  existingLockIsStale,
  lockFilePath,
  releaseRemoteLease,
  releaseLocalLock,
};
