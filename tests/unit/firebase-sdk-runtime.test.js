const test = require('node:test');
const assert = require('node:assert/strict');

async function loadReaderFactory() {
  const {createPreviewBackupValueReader} = await import('../../src/firebase/firebase-sdk-runtime.js');
  return createPreviewBackupValueReader;
}

const dailyState = marker => ({
  log: {'Almoço': [{id: `meal-${marker}`}]},
  waterIntake: [{id: `water-${marker}`, ml: 250}],
  supplementLog: [{id: `supp-${marker}`}],
});

test('preview reader coalesces all daily keys for one date into one full read', async () => {
  const createReader = await loadReaderFactory();
  const dates = [];
  const reader = createReader({
    readStorageValue: async () => null,
    readDailyState: async date => {
      dates.push(date);
      return dailyState('one');
    },
  });

  const [meals, water, supplements] = await Promise.all([
    reader('log_v2_2026-09-27'),
    reader('waterIntake_2026-09-27'),
    reader('suppLog_2026-09-27'),
  ]);

  assert.deepEqual(dates, ['2026-09-27']);
  assert.deepEqual(JSON.parse(meals.value), dailyState('one').log);
  assert.deepEqual(JSON.parse(water.value), dailyState('one').waterIntake);
  assert.deepEqual(JSON.parse(supplements.value), dailyState('one').supplementLog);
});

test('preview reader keeps distinct dates independent', async () => {
  const createReader = await loadReaderFactory();
  const dates = [];
  const reader = createReader({
    readStorageValue: async () => null,
    readDailyState: async date => {
      dates.push(date);
      return dailyState(date);
    },
  });

  await Promise.all([
    reader('log_v2_2026-09-26'),
    reader('waterIntake_2026-09-27'),
    reader('suppLog_2026-09-26'),
  ]);

  assert.deepEqual(dates.sort(), ['2026-09-26', '2026-09-27']);
});

test('preview reader shares and propagates a daily read failure', async () => {
  const createReader = await loadReaderFactory();
  const failure = new Error('daily read failed');
  let reads = 0;
  const reader = createReader({
    readStorageValue: async () => null,
    readDailyState: async () => {
      reads += 1;
      throw failure;
    },
  });

  const results = await Promise.allSettled([
    reader('log_v2_2026-09-27'),
    reader('waterIntake_2026-09-27'),
    reader('suppLog_2026-09-27'),
  ]);

  assert.equal(reads, 1);
  assert.deepEqual(results.map(result => result.status), ['rejected', 'rejected', 'rejected']);
  results.forEach(result => assert.equal(result.reason, failure));
});

test('a new preview reader observes updated state after success', async () => {
  const createReader = await loadReaderFactory();
  let marker = 'old';
  let reads = 0;
  const dependencies = {
    readStorageValue: async () => null,
    readDailyState: async () => {
      reads += 1;
      return dailyState(marker);
    },
  };

  const first = createReader(dependencies);
  assert.equal(JSON.parse((await first('log_v2_2026-09-27')).value).Almoço[0].id, 'meal-old');
  marker = 'new';
  assert.equal(JSON.parse((await first('log_v2_2026-09-27')).value).Almoço[0].id, 'meal-old');

  const second = createReader(dependencies);
  assert.equal(JSON.parse((await second('log_v2_2026-09-27')).value).Almoço[0].id, 'meal-new');
  assert.equal(reads, 2);
});

test('a new preview reader retries after an earlier preview failed', async () => {
  const createReader = await loadReaderFactory();
  let reads = 0;
  const dependencies = {
    readStorageValue: async () => null,
    readDailyState: async () => {
      reads += 1;
      if (reads === 1) throw new Error('temporary failure');
      return dailyState('recovered');
    },
  };

  await assert.rejects(
    createReader(dependencies)('waterIntake_2026-09-27'),
    /temporary failure/
  );
  const recovered = await createReader(dependencies)('waterIntake_2026-09-27');

  assert.equal(JSON.parse(recovered.value)[0].id, 'water-recovered');
  assert.equal(reads, 2);
});

test('preview reader delegates non-daily keys without using the daily cache', async () => {
  const createReader = await loadReaderFactory();
  const storageKeys = [];
  let dailyReads = 0;
  const reader = createReader({
    readStorageValue: async key => {
      storageKeys.push(key);
      return {value: 'stored'};
    },
    readDailyState: async () => {
      dailyReads += 1;
      return dailyState('unused');
    },
  });

  assert.deepEqual(await reader('pantry_v2'), {value: 'stored'});
  assert.deepEqual(storageKeys, ['pantry_v2']);
  assert.equal(dailyReads, 0);
});
