const test = require('node:test');
const assert = require('node:assert/strict');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../firebase-firestore-sdk.js'))],
  ['ESM', () => import('../../src/firebase/firebase-firestore-sdk.js')],
];

const UID = 'user-1';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createBackend({root = {}, data = {}, granular = {}, failures = {}, delayedRootRead = null} = {}) {
  const rootFields = clone(root);
  const dataDocs = new Map(Object.entries(data));
  const granularDocs = new Map(Object.entries(granular).map(([key, value]) => [key, clone(value)]));
  const calls = [];
  const DELETE_FIELD = Symbol('delete-field');
  const SERVER_TIMESTAMP = Object.freeze({__serverTimestamp: true});
  const snapshotListeners = new Map();

  function ref(type, segments) {
    return {type, path: segments.join('/')};
  }

  const sdk = {
    doc(_firestore, ...segments) {
      calls.push({operation: 'doc', path: segments.join('/')});
      return ref('doc', segments);
    },
    collection(_firestore, ...segments) {
      calls.push({operation: 'collection', path: segments.join('/')});
      return ref('collection', segments);
    },
    deleteField() {
      return DELETE_FIELD;
    },
    serverTimestamp() {
      return SERVER_TIMESTAMP;
    },
    async getDoc(reference) {
      calls.push({operation: 'getDoc', path: reference.path});
      if (reference.path === `nutrition/${UID}`) {
        if (failures.rootRead) throw Object.assign(new Error('root read'), {code: 'unavailable'});
        if (delayedRootRead) await delayedRootRead;
        const snapshot = clone(rootFields);
        return {exists: () => true, data: () => snapshot};
      }
      if (reference.path.includes('/days/')) {
        const value = granularDocs.get(reference.path);
        return value
          ? {exists: () => true, data: () => clone(value)}
          : {exists: () => false, data: () => undefined};
      }
      const key = reference.path.split('/').pop();
      if (failures.dataRead === key) throw Object.assign(new Error('data read'), {code: 'unavailable'});
      return dataDocs.has(key)
        ? {exists: () => true, data: () => ({value: dataDocs.get(key)})}
        : {exists: () => false, data: () => undefined};
    },
    async getDocFromCache(reference) {
      calls.push({operation: 'getDocFromCache', path: reference.path});
      if (reference.path === `nutrition/${UID}`) {
        const snapshot = clone(rootFields);
        return {exists: () => true, data: () => snapshot, metadata: {fromCache: true}};
      }
      const key = reference.path.split('/').pop();
      return dataDocs.has(key)
        ? {exists: () => true, data: () => ({value: dataDocs.get(key)}), metadata: {fromCache: true}}
        : {exists: () => false, data: () => undefined, metadata: {fromCache: true}};
    },
    onSnapshot(reference, options, onValue, onError) {
      calls.push({operation: 'onSnapshot', path: reference.path, options});
      const listeners = snapshotListeners.get(reference.path) || new Set();
      const listener = {onValue, onError};
      listeners.add(listener);
      snapshotListeners.set(reference.path, listeners);
      const key = reference.path.split('/').pop();
      const isRoot = reference.path === `nutrition/${UID}`;
      const exists = isRoot || dataDocs.has(key);
      const data = isRoot ? clone(rootFields) : exists ? {value: dataDocs.get(key)} : undefined;
      onValue({exists: () => exists, data: () => data, metadata: {fromCache: true, hasPendingWrites: false}});
      return () => {
        calls.push({operation: 'unsubscribe', path: reference.path});
        listeners.delete(listener);
      };
    },
    async setDoc(reference, value, options) {
      calls.push({operation: 'setDoc', path: reference.path, value, options});
      if (reference.path === `nutrition/${UID}`) {
        if (failures.rootWrite) throw Object.assign(new Error('root write'), {code: 'permission-denied'});
        Object.entries(value).forEach(([key, item]) => {
          if (item === DELETE_FIELD) delete rootFields[key];
          else rootFields[key] = clone(item);
        });
        return;
      }
      if (reference.path.includes('/days/')) {
        if (failures.granularWrite) throw Object.assign(new Error('granular write'), {code: 'unavailable'});
        granularDocs.set(reference.path, clone(value));
        return;
      }
      const key = reference.path.split('/').pop();
      if (failures.dataWrite === key) throw Object.assign(new Error('data write'), {code: 'unavailable'});
      dataDocs.set(key, value.value);
    },
    async deleteDoc(reference) {
      calls.push({operation: 'deleteDoc', path: reference.path});
      if (reference.path.includes('/days/')) {
        if (failures.granularDelete) throw Object.assign(new Error('granular delete'), {code: 'permission-denied'});
        granularDocs.delete(reference.path);
        return;
      }
      const key = reference.path.split('/').pop();
      if (failures.dataDelete === key) throw Object.assign(new Error('data delete'), {code: 'permission-denied'});
      dataDocs.delete(key);
    },
    async getDocs(reference) {
      calls.push({operation: 'getDocs', path: reference.path});
      if (failures.dataList) throw Object.assign(new Error('data list'), {code: 'unavailable'});
      const documents = reference.path.includes('/days/')
        ? Array.from(granularDocs.entries())
            .filter(([path]) => path.startsWith(`${reference.path}/`) &&
              path.slice(reference.path.length + 1).indexOf('/') === -1)
            .map(([path, value]) => ({id: path.split('/').pop(), data: () => clone(value)}))
        : Array.from(dataDocs.keys()).map(id => ({id}));
      return {forEach(callback) { documents.forEach(callback); }};
    },
  };

  function emit(path, {fromCache = false, hasPendingWrites = false} = {}) {
    const key = path.split('/').pop();
    const isRoot = path === `nutrition/${UID}`;
    const exists = isRoot || dataDocs.has(key);
    const data = isRoot ? clone(rootFields) : exists ? {value: dataDocs.get(key)} : undefined;
    snapshotListeners.get(path)?.forEach(listener => listener.onValue({
      exists: () => exists,
      data: () => data,
      metadata: {fromCache, hasPendingWrites},
    }));
  }

  return {sdk, calls, rootFields, dataDocs, granularDocs, emit};
}

function createFixture(createFirebaseFirestoreSdk, {
  uid = UID,
  backend = createBackend(),
  now = () => Date.now(),
  assertWritesAllowed = () => {},
} = {}) {
  const client = createFirebaseFirestoreSdk({
    firestore: {name: 'shared-firestore'},
    getUid: () => uid,
    sdk: backend.sdk,
    now,
    assertWritesAllowed,
  });
  return {client, backend};
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const {createFirebaseFirestoreSdk} = await load();
      await callback(
        options => createFixture(createFirebaseFirestoreSdk, options),
        createFirebaseFirestoreSdk,
      );
    });
  });
}

contractTest('requires explicit modular SDK operations', (_create, createFirebaseFirestoreSdk) => {
  assert.throws(() => createFirebaseFirestoreSdk({
    firestore: {},
    getUid: () => UID,
    sdk: {},
  }), /requires Firestore/);
});

contractTest('publishes the canonical CRUD contract and narrow backup support port', create => {
  const {client} = create();
  assert.deepEqual(Object.keys(client).sort(), [
    'fbDel3', 'fbDelDailyEntry3', 'fbGet3', 'fbGetMany3', 'fbList3',
    'fbListDailyEntries3', 'fbSet3', 'fbSetDailyEntry3', 'fbSubscribeMany3',
    'resetStorageCaches', 'support',
  ]);
  assert.equal(typeof client.support.loadRootFields, 'function');
  assert.equal(typeof client.support.listDataKeys, 'function');
  assert.equal('legacyGet2' in client.support, false);
});

contractTest('uses only the canonical root and data document paths', async create => {
  const backend = createBackend({
    root: {goalType: 'lose_weight', misplaced: 'root-only'},
    data: {pantry_v2: '[]'},
  });
  const {client} = create({backend});

  assert.deepEqual(await client.fbGet3('goalType'), {value: 'loss'});
  assert.deepEqual(await client.fbGet3('pantry_v2'), {value: '[]'});
  assert.equal(await client.fbGet3('misplaced'), null);
  assert.equal(backend.calls.some(call => call.path.includes(`${UID}_`)), false);
  assert.equal(backend.calls.some(call => call.path === 'nutrition'), false);
  assert.equal(backend.calls.some(call => call.path === `nutrition/${UID}`), true);
  assert.equal(backend.calls.some(call => call.path === `nutrition/${UID}/data/pantry_v2`), true);
});

contractTest('coalesces profile and data reads and keeps writes coherent', async create => {
  const backend = createBackend({
    root: {gender: 'female', height: '170'},
    data: {pantry_v2: '[{"id":"initial"}]'},
  });
  const {client} = create({backend});

  assert.deepEqual(await Promise.all([
    client.fbGet3('gender'),
    client.fbGet3('height'),
    client.fbGet3('gender'),
  ]), [{value: 'female'}, {value: '170'}, {value: 'female'}]);
  assert.equal(backend.calls.filter(call => call.operation === 'getDoc' && call.path === `nutrition/${UID}`).length, 1);

  assert.deepEqual(await Promise.all([
    client.fbGet3('pantry_v2'),
    client.fbGet3('pantry_v2'),
  ]), [
    {value: '[{"id":"initial"}]'},
    {value: '[{"id":"initial"}]'},
  ]);
  assert.equal(backend.calls.filter(call => call.operation === 'getDoc' && call.path.endsWith('/pantry_v2')).length, 1);

  await client.fbSet3('pantry_v2', [{id: 'updated'}]);
  assert.deepEqual(await client.fbGet3('pantry_v2'), {value: '[{"id":"updated"}]'});
  await client.fbDel3('pantry_v2');
  assert.equal(await client.fbGet3('pantry_v2'), null);
});

contractTest('does not let an older in-flight root read overwrite a completed write', async create => {
  let releaseRead;
  const delayedRootRead = new Promise(resolve => { releaseRead = resolve; });
  const backend = createBackend({
    root: {birthDate: '1990-01-01', lastLoginAt: 'old'},
    delayedRootRead,
  });
  const {client} = create({backend});

  const birthDate = client.fbGet3('birthDate');
  await Promise.resolve();
  await client.fbSet3('lastLoginAt', '2026-08-28T12:00:00.000Z');
  releaseRead();

  assert.deepEqual(await birthDate, {value: '1990-01-01'});
  assert.deepEqual(await client.fbGet3('lastLoginAt'), {value: '2026-08-28T12:00:00.000Z'});
});

contractTest('preserves profile normalization, prefix listing, and idempotent delete', async create => {
  const backend = createBackend({root: {language: 'pt'}, data: {pantry_v2: '[]'}});
  const {client} = create({backend});

  await client.fbSet3('gender', 'Feminino');
  await client.fbSet3('activityLevel', 'moderado');
  await client.fbSet3('goalType', 'lose_weight');
  assert.deepEqual(await client.fbGet3('gender'), {value: 'female'});
  assert.deepEqual(await client.fbGet3('activityLevel'), {value: 'moderate'});
  assert.deepEqual(await client.fbGet3('goalType'), {value: 'loss'});
  assert.deepEqual(await client.fbList3('pantry'), {keys: ['pantry_v2']});

  await client.fbDel3('pantry_v2');
  await client.fbDel3('pantry_v2');
  assert.equal(await client.fbGet3('pantry_v2'), null);
  assert.equal(backend.calls.filter(call => call.operation === 'deleteDoc').length, 2);
});

contractTest('deletes profile fields with merge without replacing the root document', async create => {
  const backend = createBackend({root: {language: 'pt', gender: 'female'}});
  const {client} = create({backend});

  await client.fbDel3('gender');
  assert.deepEqual(backend.rootFields, {language: 'pt'});
  const write = backend.calls.find(call => call.operation === 'setDoc');
  assert.deepEqual(write.options, {merge: true});
});

contractTest('preserves read fallbacks and write/delete rejection messages', async create => {
  const backend = createBackend({failures: {
    rootRead: true,
    dataRead: 'weightHistory',
    dataList: true,
    dataWrite: 'pantry_v2',
    dataDelete: 'goalHistory',
    rootWrite: true,
  }});
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    const {client} = create({backend});
    assert.equal(await client.fbGet3('weightHistory'), null);
    assert.equal(await client.fbGet3('language'), null);
    assert.deepEqual(await client.fbList3(), {keys: []});
    await assert.rejects(client.fbSet3('pantry_v2', '[]'), /Firestore data write failed/);
    await assert.rejects(client.fbDel3('goalHistory'), /Firestore data delete failed/);
    await assert.rejects(client.fbSet3('language', 'en'), /Firestore write failed/);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnings.some(args => args[0] === 'Firestore root read failed'), true);
  assert.equal(warnings.some(args => args[0] === 'Firestore data read failed'), true);
  assert.equal(warnings.some(args => args[0] === 'Firestore data list failed'), true);
});

contractTest('keeps unauthenticated reads empty and writes as no-ops', async create => {
  const backend = createBackend();
  const {client} = create({uid: null, backend});
  assert.equal(await client.fbGet3('pantry_v2'), null);
  assert.equal(await client.fbSet3('pantry_v2', '[]'), undefined);
  assert.equal(await client.fbDel3('pantry_v2'), undefined);
  assert.deepEqual(await client.fbList3(), {keys: []});
  assert.equal(backend.calls.length, 0);
});

contractTest('clears adapter caches on account changes', async create => {
  const backend = createBackend({data: {pantry_v2: 'first'}});
  const {client} = create({backend});
  assert.deepEqual(await client.fbGet3('pantry_v2'), {value: 'first'});
  backend.dataDocs.set('pantry_v2', 'second');
  assert.deepEqual(await client.fbGet3('pantry_v2'), {value: 'first'});
  client.resetStorageCaches();
  assert.deepEqual(await client.fbGet3('pantry_v2'), {value: 'second'});
});

contractTest('rejects writes before enqueueing them after the C22 lock', async create => {
  const backend = createBackend();
  const blocked = Object.assign(new Error('firestore-writes-blocked'), {
    code: 'firestore-writes-blocked',
  });
  const {client} = create({backend, assertWritesAllowed() { throw blocked; }});

  await assert.rejects(client.fbSet3('language', 'pt'), error => error === blocked);
  await assert.rejects(client.fbSet3('pantry_v2', '[]'), error => error === blocked);
  await assert.rejects(client.fbDel3('pantry_v2'), error => error === blocked);
  await assert.rejects(
    client.fbSetDailyEntry3('water', '2026-08-29', {id: 'water-1', ml: 250}),
    error => error === blocked,
  );
  await assert.rejects(
    client.fbDelDailyEntry3('water', '2026-08-29', 'water-1'),
    error => error === blocked,
  );
  assert.equal(backend.calls.some(call => ['setDoc', 'deleteDoc'].includes(call.operation)), false);
});

contractTest('writes, lists, and deletes typed granular daily entries by stable identity', async create => {
  const backend = createBackend();
  const {client} = create({backend});

  await client.fbSetDailyEntry3('meal', '2026-08-29', {
    id: 'meal-1', name: 'Arroz', kcal: 130,
  }, {mealKey: 'Almoço'});
  await client.fbSetDailyEntry3('water', '2026-08-29', {id: 'water-1', ml: 250});
  await client.fbSetDailyEntry3('supplement', '2026-08-29', {
    id: 'supplement-1', name: 'Creatina', dose: 5,
  });

  assert.deepEqual(
    Array.from(backend.granularDocs.keys()).sort(),
    [
      `nutrition/${UID}/days/2026-08-29/meals/meal-1`,
      `nutrition/${UID}/days/2026-08-29/supplements/supplement-1`,
      `nutrition/${UID}/days/2026-08-29/water/water-1`,
    ],
  );
  assert.deepEqual(await client.fbListDailyEntries3('meal', '2026-08-29'), [{
    schemaVersion: 1,
    id: 'meal-1',
    date: '2026-08-29',
    mealKey: 'Almoço',
    entry: {id: 'meal-1', name: 'Arroz', kcal: 130},
    updatedAt: {__serverTimestamp: true},
  }]);

  await client.fbDelDailyEntry3('water', '2026-08-29', 'water-1');
  assert.equal(
    backend.granularDocs.has(`nutrition/${UID}/days/2026-08-29/water/water-1`),
    false,
  );
});

contractTest('keeps concurrent entries independent and retries idempotent by document id', async create => {
  const backend = createBackend();
  const {client} = create({backend});

  await Promise.all([
    client.fbSetDailyEntry3('water', '2026-08-29', {id: 'water-a', ml: 250}),
    client.fbSetDailyEntry3('water', '2026-08-29', {id: 'water-b', ml: 500}),
    client.fbSetDailyEntry3('water', '2026-08-29', {id: 'water-a', ml: 250}),
  ]);

  assert.equal(backend.granularDocs.size, 2);
  assert.deepEqual(
    (await client.fbListDailyEntries3('water', '2026-08-29')).map(item => item.id),
    ['water-a', 'water-b'],
  );
  assert.equal(
    backend.calls.some(call => call.path === `nutrition/${UID}/data/waterIntake_2026-08-29`),
    false,
  );
});

contractTest('rejects invalid granular paths and malformed payloads before SDK writes', async create => {
  const backend = createBackend();
  const {client} = create({backend});
  const invalidCalls = [
    () => client.fbSetDailyEntry3('unknown', '2026-08-29', {id: 'entry-1'}),
    () => client.fbSetDailyEntry3('water', '2026-02-30', {id: 'water-1', ml: 250}),
    () => client.fbSetDailyEntry3('water', '2026-08-29', {id: 'bad/id', ml: 250}),
    () => client.fbSetDailyEntry3('meal', '2026-08-29', {id: 'meal-1'}),
    () => client.fbSetDailyEntry3('water', '2026-08-29', {id: 'water-1'}, {mealKey: 'Outro'}),
  ];
  for (const call of invalidCalls) await assert.rejects(call(), TypeError);
  assert.equal(backend.calls.some(call => call.operation === 'setDoc'), false);
});

contractTest('fails closed when a granular document does not match its path envelope', async create => {
  const path = `nutrition/${UID}/days/2026-08-29/water/water-1`;
  const backend = createBackend({granular: {
    [path]: {
      schemaVersion: 1,
      id: 'different-id',
      date: '2026-08-29',
      entry: {id: 'different-id', ml: 250},
      updatedAt: null,
    },
  }});
  const {client} = create({backend});
  await assert.rejects(
    client.fbListDailyEntries3('water', '2026-08-29'),
    /Invalid granular daily entry document/,
  );
});

contractTest('loads grouped records from cache before falling back to network', async create => {
  const backend = createBackend({root: {language: 'pt'}, data: {
    'log_v2_2026-08-27': '{"Almoço":[]}',
    'notes_2026-08-27': 'nota',
  }});
  const {client} = create({backend});
  assert.deepEqual(await client.fbGetMany3([
    'log_v2_2026-08-27', 'notes_2026-08-27', 'language', 'notes_2026-08-27',
  ]), {
    'log_v2_2026-08-27': {value: '{"Almoço":[]}'},
    'notes_2026-08-27': {value: 'nota'},
    language: {value: 'pt'},
  });
  assert.equal(backend.calls.filter(call => call.operation === 'getDocFromCache').length, 2);
  assert.equal(backend.calls.filter(call => call.operation === 'getDoc').length, 1);
});

contractTest('reuses overlapping subscriptions and emits only changed cached records', async create => {
  const backend = createBackend({root: {language: 'pt', userName: 'Ana'}, data: {
    'log_v2_2026-08-27': 'first',
  }});
  const {client} = create({backend});
  const first = [];
  const second = [];
  const stopFirst = client.fbSubscribeMany3(['log_v2_2026-08-27', 'language'], value => first.push(value));
  const stopSecond = client.fbSubscribeMany3(['log_v2_2026-08-27', 'userName'], value => second.push(value));

  assert.equal(backend.calls.filter(call => call.operation === 'onSnapshot' &&
    call.path === `nutrition/${UID}/data/log_v2_2026-08-27`).length, 1);
  assert.equal(backend.calls.filter(call => call.operation === 'onSnapshot' &&
    call.path === `nutrition/${UID}`).length, 1);
  assert.deepEqual(await client.fbGetMany3(['log_v2_2026-08-27']), {
    'log_v2_2026-08-27': {value: 'first'},
  });
  assert.equal(backend.calls.filter(call => ['getDoc', 'getDocFromCache'].includes(call.operation)).length, 0);
  backend.emit(`nutrition/${UID}/data/log_v2_2026-08-27`, {fromCache: false});
  assert.equal(first.length, 2);
  assert.equal(second.length, 2);

  backend.dataDocs.set('log_v2_2026-08-27', 'updated');
  backend.emit(`nutrition/${UID}/data/log_v2_2026-08-27`, {fromCache: false});
  assert.equal(first.at(-1).records['log_v2_2026-08-27'].value, 'updated');
  assert.equal(second.at(-1).records['log_v2_2026-08-27'].value, 'updated');
  stopFirst();
  assert.equal(backend.calls.filter(call => call.operation === 'unsubscribe' &&
    call.path.endsWith('log_v2_2026-08-27')).length, 0);
  stopSecond();
  assert.equal(backend.calls.filter(call => call.operation === 'unsubscribe' &&
    call.path.endsWith('log_v2_2026-08-27')).length, 1);
});
