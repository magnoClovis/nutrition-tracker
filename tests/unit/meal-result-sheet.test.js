'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../meal-result-sheet.js'))],
  ['ESM', () => import('../../src/components/meal-result-sheet.js')],
];

function sampleEstimate() {
  return {
    dishName: 'Prato longo',
    items: [
      { id: 'a', estimatedGrams: 120, quantity: 1, kcal: 198, protein: 37 },
      { id: 'b', estimatedGrams: 180, quantity: 1, kcal: 234, protein: 5 },
      { id: 'c', estimatedGrams: 80, quantity: 1, kcal: 106, protein: 10 },
    ],
  };
}

for (const [format, load] of implementations) {
  test(`${format}: totals the available estimated grams`, async () => {
    const { totalEstimatedGrams } = await load();
    assert.equal(totalEstimatedGrams(sampleEstimate()), 380);
    assert.equal(totalEstimatedGrams({ items: [{ estimatedGrams: null }] }), null);
    assert.equal(totalEstimatedGrams({ items: [] }), null);
  });

  test(`${format}: rescales every ingredient from the approved total portion`, async () => {
    const { scaleEstimateToTotalGrams } = await load();
    const calls = [];
    const result = scaleEstimateToTotalGrams(sampleEstimate(), 760, (item, field, value) => {
      calls.push([item.id, field, value]);
      const ratio = value / item.estimatedGrams;
      return { ...item, estimatedGrams: value, kcal: item.kcal * ratio, protein: item.protein * ratio };
    });
    assert.deepEqual(calls, [
      ['a', 'estimatedGrams', 240],
      ['b', 'estimatedGrams', 360],
      ['c', 'estimatedGrams', 160],
    ]);
    assert.equal(result.items.reduce((sum, item) => sum + item.estimatedGrams, 0), 760);
    assert.equal(result.items.reduce((sum, item) => sum + item.kcal, 0), 1076);
    assert.equal(sampleEstimate().items[0].estimatedGrams, 120);
  });

  test(`${format}: preserves the estimate when a proportional base is unavailable`, async () => {
    const { scaleEstimateToTotalGrams } = await load();
    const estimate = { items: [{ id: 'a', estimatedGrams: null, kcal: 10 }] };
    const validEstimate = sampleEstimate();
    assert.equal(scaleEstimateToTotalGrams(estimate, 200, () => assert.fail('must not scale')), estimate);
    assert.equal(scaleEstimateToTotalGrams(validEstimate, 0, () => assert.fail('must not scale')), validEstimate);
  });

  test(`${format}: resolves the drag to the nearest approved snap`, async () => {
    const { resolveMealResultSnap } = await load();
    assert.equal(resolveMealResultSnap(40, 320), 'expanded');
    assert.equal(resolveMealResultSnap(159.9, 320), 'expanded');
    assert.equal(resolveMealResultSnap(160, 320), 'compact');
    assert.equal(resolveMealResultSnap(300, 320), 'compact');
    assert.equal(resolveMealResultSnap(null, 320), 'compact');
  });
}
