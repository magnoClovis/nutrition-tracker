const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('authenticated diary flows use the app local civil-date domain', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../smoke/authenticated-flows.spec.js'),
    'utf8'
  );

  assert.match(source, /window\.DateUtils\.localToday\(\)/);
  assert.match(source, /window\.DateUtils\.addCivilDays\(today, offset\)/);
  assert.doesNotMatch(source, /new Date\(\)\.toISOString\(\)\.split\(['"]T['"]\)\[0\]/);
  assert.doesNotMatch(source, /date\.setDate\(date\.getDate\(\) - 1\)/);
});
