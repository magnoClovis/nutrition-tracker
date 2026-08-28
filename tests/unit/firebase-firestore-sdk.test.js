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

function createBackend({root = {}, data = {}, failures = {}, delayedRootRead = null} = {}) {
  const rootFields = clone(root);
  const dataDocs = new Map(Object.entries(data));
  const calls = [];
  const DELETE_FIELD = Symbol('delete-field');

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
    async getDoc(reference) {
      calls.push({operation: 'getDoc', path: reference.path});
      if (reference.path === `nutrition/${UID}`) {
        if (failures.rootRead) throw Object.assign(new Error('root read'), {code: 'unavailable'});
        if (delayedRootRead) await delayedRootRead;
        const snapshot = clone(rootFields);
        return {exists: () => true, data: () => snapshot};
      }
      const key = reference.path.split('/').pop();
      if (failures.dataRead === key) throw Object.assign(new Error('data read'), {code: 'unavailable'});
      return dataDocs.has(key)
        ? {exists: () => true, data: () => ({value: dataDocs.get(key)})}
        : {exists: () => false, data: () => undefined};
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
      const key = reference.path.split('/').pop();
      if (failures.dataWrite === key) throw Object.assign(new Error('data write'), {code: 'unavailable'});
      dataDocs.set(key, value.value);
    },
    async deleteDoc(reference) {
      calls.push({operation: 'deleteDoc', path: reference.path});
      const key = reference.path.split('/').pop();
      if (failures.dataDelete === key) throw Object.assign(new Error('data delete'), {code: 'permission-denied'});
      dataDocs.delete(key);
    },
    async getDocs(reference) {
      calls.push({operation: 'getDocs', path: reference.path});
      if (failures.dataList) throw Object.assign(new Error('data list'), {code: 'unavailable'});
      const documents = Array.from(dataDocs.keys()).map(id => ({id}));
      return {forEach(callback) { documents.forEach(callback); }};
    },
  };

  return {sdk, calls, rootFields, dataDocs};
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
    'fbDel3', 'fbGet3', 'fbList3', 'fbSet3', 'resetStorageCaches', 'support',
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
  assert.equal(backend.calls.some(call => ['setDoc', 'deleteDoc'].includes(call.operation)), false);
});
