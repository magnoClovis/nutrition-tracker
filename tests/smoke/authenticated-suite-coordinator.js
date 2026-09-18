const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DEFAULT_REPOSITORY = 'magnoClovis/nutrition-tracker';
const LOCK_MAX_AGE_MS = 2 * 60 * 60 * 1000;

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

async function coordinateAuthenticatedSuite(options = {}) {
  const lock = acquireLocalLock(options);
  try {
    await assertNoActiveGithubCi(options);
    return () => releaseLocalLock(lock, options.fsImpl || fs);
  } catch (error) {
    releaseLocalLock(lock, options.fsImpl || fs);
    throw error;
  }
}

module.exports = {
  DEFAULT_REPOSITORY,
  LOCK_MAX_AGE_MS,
  acquireLocalLock,
  assertNoActiveGithubCi,
  coordinateAuthenticatedSuite,
  existingLockIsStale,
  lockFilePath,
  releaseLocalLock,
};
