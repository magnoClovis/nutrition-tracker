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
}
