const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

const legacy = require('../../daily-entry-model.js');

async function loadEsm() {
  return import(pathToFileURL(path.join(__dirname, '../../src/composite/daily-entry-model.js')).href);
}

function contractTest(name, callback) {
  test(`legacy: ${name}`, () => callback(legacy));
  test(`ESM: ${name}`, async () => callback(await loadEsm()));
}

contractTest('uses randomUUID and preserves an assigned identity across retries', model => {
  let calls = 0;
  const options = {cryptoObject: {randomUUID: () => `uuid-${++calls}`}};
  const first = model.ensureEntryId({name: 'Rice'}, options);
  const retried = model.ensureEntryId(first, options);

  assert.equal(first.id, 'uuid-1');
  assert.strictEqual(retried, first);
  assert.equal(calls, 1);
});

contractTest('provides a deterministic Firestore-safe fallback without Web Crypto', model => {
  const id = model.createIdempotentEntryId({
    cryptoObject: null,
    now: () => 123456,
    random: () => 0.5,
  });

  assert.match(id, /^entry_2n9c_[a-z0-9]+$/);
  assert.doesNotMatch(id, /\//);
});

contractTest('replaying one add does not duplicate entries', model => {
  const mutation = {type: 'add', entries: [{id: 'entry-a', name: 'Rice'}]};
  const first = model.applyEntryListMutation([], mutation);
  const replayed = model.applyEntryListMutation(first, mutation);

  assert.deepEqual(first, [{id: 'entry-a', name: 'Rice'}]);
  assert.strictEqual(replayed, first);
});

contractTest('sequential concurrent additions preserve unrelated entries', model => {
  let log = {Lunch: [{id: 'existing'}]};
  log = model.applyMealLogMutation(log, 'Lunch', {
    type: 'add', entries: [{id: 'device-a'}],
  });
  log = model.applyMealLogMutation(log, 'Lunch', {
    type: 'add', entries: [{id: 'device-b'}],
  });

  assert.deepEqual(log.Lunch.map(entry => entry.id), ['existing', 'device-a', 'device-b']);
});

contractTest('updates and removes only the addressed entry', model => {
  const original = [{id: 'a', qty: 1}, {id: 'b', qty: 2}];
  const updated = model.applyEntryListMutation(original, {
    type: 'update',
    entryId: 'b',
    update: entry => ({...entry, qty: 3}),
  });
  const removed = model.applyEntryListMutation(updated, {type: 'remove', entryId: 'a'});

  assert.deepEqual(updated, [{id: 'a', qty: 1}, {id: 'b', qty: 3}]);
  assert.deepEqual(removed, [{id: 'b', qty: 3}]);
});

contractTest('rejects identity changes during an update', model => {
  assert.throws(() => model.applyEntryListMutation([{id: 'a'}], {
    type: 'update',
    entryId: 'a',
    update: () => ({id: 'b'}),
  }), /identity cannot change/);
});
