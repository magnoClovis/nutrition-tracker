const test = require('node:test');
const assert = require('node:assert/strict');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../firebase-sync-state.js'))],
  ['ESM wrapper', () => import('../../src/firebase/firebase-sync-state.js')],
];

const identity = Object.freeze({kind: 'water', date: '2026-08-29', entryId: 'water-1'});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return {promise, resolve, reject};
}

function fakeClock() {
  let value = 1000;
  let sequence = 0;
  const timers = new Map();
  return {
    now: () => value,
    setTimeoutFn(callback, delay) {
      const id = ++sequence;
      timers.set(id, {callback, at: value + delay});
      return id;
    },
    clearTimeoutFn(id) { timers.delete(id); },
    async runNext() {
      const next = Array.from(timers.entries()).sort((left, right) => left[1].at - right[1].at)[0];
      assert.ok(next, 'expected a scheduled retry');
      timers.delete(next[0]);
      value = next[1].at;
      next[1].callback();
      await Promise.resolve();
    },
    count: () => timers.size,
  };
}

for (const [format, load] of implementations) {
  test(`${format}: reports pending until the server acknowledges, then synced`, async () => {
    const api = await load();
    const pendingWrite = deferred();
    const states = [];
    const tracker = api.createFirestoreSyncState();
    tracker.subscribe(state => states.push(state));

    const write = tracker.execute(identity, () => pendingWrite.promise);
    assert.equal(tracker.get(identity).status, 'pending');
    assert.equal(tracker.get(identity).attempt, 1);
    pendingWrite.resolve('saved');
    assert.equal(await write, 'saved');
    assert.equal(tracker.get(identity).status, 'synced');
    assert.deepEqual(states.map(state => state.status), ['pending', 'synced']);
  });

  test(`${format}: retries a transient failure with bounded backoff`, async () => {
    const api = await load();
    const clock = fakeClock();
    let attempts = 0;
    const tracker = api.createFirestoreSyncState({
      retryDelaysMs: [500, 2000],
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
      now: clock.now,
    });
    const write = tracker.execute(identity, async () => {
      attempts++;
      if (attempts === 1) throw Object.assign(new Error('private provider text'), {
        code: 'firestore/unavailable',
      });
      return 'saved';
    });
    await Promise.resolve();

    assert.deepEqual(tracker.get(identity), {
      key: 'water:2026-08-29:water-1', kind: 'water', date: '2026-08-29',
      entryId: 'water-1', status: 'pending', attempt: 1,
      errorCode: 'unavailable', retryAt: 1500, updatedAt: 1000,
    });
    await clock.runNext();
    assert.equal(await write, 'saved');
    assert.equal(attempts, 2);
    assert.equal(tracker.get(identity).status, 'synced');
    assert.equal(tracker.get(identity).attempt, 2);
  });

  test(`${format}: exposes a sanitized terminal error and supports manual retry`, async () => {
    const api = await load();
    let allowed = false;
    const tracker = api.createFirestoreSyncState({retryDelaysMs: []});
    const operation = async () => {
      if (!allowed) throw Object.assign(new Error('contains user data'), {
        code: 'firestore/permission-denied',
      });
      return 'saved';
    };
    await assert.rejects(tracker.execute(identity, operation), /contains user data/);
    const failed = tracker.get(identity);
    assert.equal(failed.status, 'error');
    assert.equal(failed.errorCode, 'permission-denied');
    assert.equal(JSON.stringify(failed).includes('contains user data'), false);

    allowed = true;
    assert.equal(await tracker.retry(identity), 'saved');
    assert.equal(tracker.get(identity).status, 'synced');
  });

  test(`${format}: account lifecycle reset cancels retries and clears observable state`, async () => {
    const api = await load();
    const clock = fakeClock();
    let attempts = 0;
    const notifications = [];
    const tracker = api.createFirestoreSyncState({
      retryDelaysMs: [500],
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
      now: clock.now,
    });
    tracker.subscribe(state => notifications.push(state));
    const write = tracker.execute(identity, async () => {
      attempts++;
      throw Object.assign(new Error('offline'), {code: 'unavailable'});
    });
    await Promise.resolve();
    assert.equal(clock.count(), 1);
    tracker.reset();

    await assert.rejects(write, error => error.code === 'write-cancelled');
    assert.equal(clock.count(), 0);
    assert.equal(attempts, 1);
    assert.deepEqual(tracker.list(), []);
    assert.equal(notifications.at(-1), null);
  });

  test(`${format}: an older completion cannot overwrite a newer write state`, async () => {
    const api = await load();
    const oldWrite = deferred();
    const tracker = api.createFirestoreSyncState({retryDelaysMs: []});
    const first = tracker.execute(identity, () => oldWrite.promise);
    const second = tracker.execute(identity, async () => 'new');
    assert.equal(await second, 'new');
    oldWrite.resolve('old');
    assert.equal(await first, 'old');
    assert.equal(tracker.get(identity).status, 'synced');
    assert.equal(tracker.get(identity).attempt, 1);
  });

  test(`${format}: one atomic batch exposes the same lifecycle for every entry`, async () => {
    const api = await load();
    const tracker = api.createFirestoreSyncState({retryDelaysMs: []});
    const water = {kind: 'water', date: '2026-08-29', entryId: 'water-1'};
    const meal = {kind: 'meal', date: '2026-08-29', entryId: 'meal-1'};
    let commits = 0;

    await tracker.executeBatch([water, meal], async () => { commits++; });

    assert.equal(commits, 1);
    assert.equal(tracker.get(water).status, 'synced');
    assert.equal(tracker.get(meal).status, 'synced');
    assert.equal(tracker.get(water).attempt, 1);
    assert.equal(tracker.get(meal).attempt, 1);
  });

  test(`${format}: retries an atomic batch once without splitting its entries`, async () => {
    const api = await load();
    const clock = fakeClock();
    const tracker = api.createFirestoreSyncState({
      retryDelaysMs: [500],
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
      now: clock.now,
    });
    const identities = [
      {kind: 'meal', date: '2026-08-29', entryId: 'meal-a'},
      {kind: 'meal', date: '2026-08-29', entryId: 'meal-b'},
    ];
    let commits = 0;
    const write = tracker.executeBatch(identities, async () => {
      commits++;
      if (commits === 1) throw Object.assign(new Error('offline'), {code: 'unavailable'});
    });
    await Promise.resolve();
    assert.equal(tracker.get(identities[0]).status, 'pending');
    assert.equal(tracker.get(identities[1]).errorCode, 'unavailable');
    await clock.runNext();
    await write;
    assert.equal(commits, 2);
    assert.equal(tracker.get(identities[0]).status, 'synced');
    assert.equal(tracker.get(identities[1]).status, 'synced');
  });
}
