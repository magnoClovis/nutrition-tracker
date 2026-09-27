const test = require('node:test');
const assert = require('node:assert/strict');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../manual-meal-result.js'))],
  ['ESM', () => import('../../src/components/manual-meal-result.js')],
];

for (const [runtime, load] of implementations) {
  test(`${runtime}: adapts a saved food to the shared result contract`, async () => {
    const { createManualMealEstimate } = await load();
    const estimate = createManualMealEstimate({
      id: 'rice', name: 'White rice', unit: 'g', portionSize: 150,
      kcal100: 130, protein100: 2.7, carbs100: 28, fat100: 0.3,
    });
    assert.equal(estimate.resultSource, 'saved-food');
    assert.equal(estimate.portionUnit, 'g');
    assert.equal(estimate.items[0].estimatedGrams, 150);
    assert.equal(estimate.items[0].kcal, 195);
    assert.equal(estimate.items[0].carbs, 42);
  });

  test(`${runtime}: preserves unit foods and resolves edited quantity`, async () => {
    const { createManualMealEstimate, resolveManualMealQuantity } = await load();
    const estimate = createManualMealEstimate({
      id: 'bar', name: 'Protein bar', unit: 'un', kcal100: 210, protein100: 20,
    });
    assert.equal(estimate.portionUnit, 'un');
    assert.equal(resolveManualMealQuantity(estimate), 1);
    assert.equal(resolveManualMealQuantity({ ...estimate, items: [{ ...estimate.items[0], estimatedGrams: 2 }] }), 2);
  });
}
