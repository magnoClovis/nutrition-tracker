const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('../../vendor/react.production.min.js');

const implementations = [
  ['UMD', async () => require('../../temporal-field.js')],
  ['ESM', async () => import('../../src/components/temporal-field.js')],
];

for (const [format, load] of implementations) {
  test(`${format}: validates the injected React runtime`, async () => {
    const { createTemporalField } = await load();
    assert.throws(() => createTemporalField({}), /React runtime/);
  });

  test(`${format}: keeps the public time value locale-independent`, async () => {
    const { createTemporalField } = await load();
    const { parseTime, formatTime } = createTemporalField({ React });
    assert.deepEqual(parseTime('08:07'), { hour: 8, minute: 7 });
    assert.deepEqual(parseTime('24:00', '19:45'), { hour: 19, minute: 45 });
    assert.deepEqual(parseTime('not-a-time'), { hour: 0, minute: 0 });
    assert.equal(formatTime(8, 7), '08:07');
  });

  test(`${format}: wraps hour and minute steppers predictably`, async () => {
    const { createTemporalField } = await load();
    const { stepTimePart } = createTemporalField({ React });
    assert.deepEqual(stepTimePart({ hour: 23, minute: 40 }, 'hour', 1), { hour: 0, minute: 40 });
    assert.deepEqual(stepTimePart({ hour: 0, minute: 0 }, 'hour', -1), { hour: 23, minute: 0 });
    assert.deepEqual(stepTimePart({ hour: 8, minute: 55 }, 'minute', 1), { hour: 8, minute: 0 });
    assert.deepEqual(stepTimePart({ hour: 8, minute: 0 }, 'minute', -1), { hour: 8, minute: 55 });
  });

  test(`${format}: keeps civil dates strict, timezone-free, and bounded`, async () => {
    const { createTemporalField } = await load();
    const { parseIsoDate, formatIsoDate, daysInMonth, shiftCivilMonth, clampIsoDate } = createTemporalField({ React });
    assert.deepEqual(parseIsoDate('1992-02-29'), { year: 1992, month: 2, day: 29 });
    assert.equal(parseIsoDate('1991-02-29'), null);
    assert.equal(parseIsoDate('02/28/1990'), null);
    assert.equal(formatIsoDate(1990, 2, 8), '1990-02-08');
    assert.equal(daysInMonth(2000, 2), 29);
    assert.deepEqual(shiftCivilMonth({ year: 2025, month: 1, day: 31 }, 1), { year: 2025, month: 2, day: 28 });
    assert.deepEqual(clampIsoDate({ year: 1890, month: 1, day: 1 }, '1900-01-01', '2026-08-30'), { year: 1900, month: 1, day: 1 });
    assert.deepEqual(clampIsoDate({ year: 2030, month: 1, day: 1 }, '1900-01-01', '2026-08-30'), { year: 2026, month: 8, day: 30 });
  });
}
