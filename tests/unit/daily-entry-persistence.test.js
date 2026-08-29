const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../daily-entry-persistence.js'))],
  ['ESM', () => import(pathToFileURL(path.join(
    __dirname, '../../src/composite/daily-entry-persistence.js')).href)],
];

for (const [format, load] of implementations) {
  test(`${format}: diffs independent entries without replacing unrelated data`, async () => {
    const api = await load();
    const operations = api.diffDailyEntrySnapshots('meal', '2026-08-29', {
      Almoço: [{id: 'keep', qty: 1}, {id: 'remove', qty: 1}],
    }, {
      Almoço: [{id: 'keep', qty: 2}],
      Jantar: [{id: 'add', qty: 1}],
    });
    assert.deepEqual(operations, [
      {type: 'delete', kind: 'meal', date: '2026-08-29', entryId: 'remove'},
      {type: 'set', kind: 'meal', date: '2026-08-29',
        entry: {id: 'keep', qty: 2}, mealKey: 'Almoço'},
      {type: 'set', kind: 'meal', date: '2026-08-29',
        entry: {id: 'add', qty: 1}, mealKey: 'Jantar'},
    ]);
  });

  test(`${format}: migrates once, serializes snapshots, and batches each transition`, async () => {
    const api = await load();
    const events = [];
    const storage = {
      async migrateDailyEntries(kind, date) { events.push(`migrate:${kind}:${date}`); },
      async applyDailyEntryBatch(operations) {
        events.push(operations.map(item => `${item.type}:${item.entry?.id || item.entryId}`).join(','));
      },
    };
    const persistence = api.createDailyEntryPersistence({storage});
    persistence.seed('water', '2026-08-29', [{id: 'a', ml: 250}]);
    const first = persistence.persist('water', '2026-08-29', [
      {id: 'a', ml: 250}, {id: 'b', ml: 500},
    ]);
    const second = persistence.persist('water', '2026-08-29', [{id: 'b', ml: 500}]);
    await Promise.all([first, second]);

    assert.deepEqual(events, [
      'migrate:water:2026-08-29',
      'set:b',
      'delete:a',
    ]);
  });

  test(`${format}: leaves the aggregate facade untouched before SDK cutover`, async () => {
    const api = await load();
    let writes = 0;
    const persistence = api.createDailyEntryPersistence({storage: {
      async set() { writes++; },
    }});
    assert.equal(persistence.granular, false);
    assert.equal(await persistence.persist('water', '2026-08-29', [{id: 'a'}]), false);
    assert.equal(writes, 0);
  });
}
