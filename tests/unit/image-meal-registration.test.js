const test = require('node:test');
const assert = require('node:assert/strict');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../image-meal-registration.js'))],
  ['ESM', () => import('../../src/composite/image-meal-registration.js')],
];

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => callback(await load()));
  });
}

function estimate() {
  return {
    status: 'identified',
    dishName: 'Rice and beans',
    overallConfidence: 'medium',
    assumptions: ['Visible serving'],
    photo: 'data:image/jpeg;base64,never-persist-this',
    items: [
      {
        id: 'estimate-rice', name: 'Rice', quantity: 120, unit: 'g', estimatedGrams: 120,
        protein: 3, kcal: 156, carbs: 34, fat: 0.4, fiber: 0.5,
        salt: null, sugars: null, satfat: null, confidence: 'medium',
        previewUrl: 'blob:never-persist-this',
      },
      {
        id: 'estimate-beans', name: 'Beans', quantity: 90, unit: 'g', estimatedGrams: 90,
        protein: 8, kcal: 115, carbs: 20, fat: 0.5, fiber: 7,
        salt: 0.2, sugars: 0.4, satfat: 0.1, confidence: 'high',
      },
    ],
  };
}

contractTest('creates one estimated diary entry per detected food with the selected category and time', module => {
  let nextId = 0;
  const registration = module.createImageMealRegistration({
    createEntryId: () => `entry-${++nextId}`,
    mealKeys: ['Breakfast', 'Lunch'],
  }).buildImageMealRegistration({ estimate: estimate(), meal: 'Lunch', time: '13:45' });

  assert.equal(registration.meal, 'Lunch');
  assert.equal(registration.items.length, 2);
  assert.deepEqual(registration.items[0], {
    id: 'entry-1', foodId: null, name: 'Rice', qty: 120, unit: 'g', time: '13:45',
    _estimated: true, _estimateSource: 'image',
    protein: 3, kcal: 156, carbs: 34, fat: 0.4, fiber: 0.5,
    salt: null, sugars: null, satfat: null,
  });
  assert.equal(registration.items[1].id, 'entry-2');
});

contractTest('never copies image data, preview URLs, provider metadata, or the aggregate estimate into entries', module => {
  const registration = module.createImageMealRegistration({
    createEntryId: () => 'entry-safe',
    mealKeys: ['Lunch'],
  }).buildImageMealRegistration({ estimate: estimate(), meal: 'Lunch', time: '12:00' });
  const serialized = JSON.stringify(registration);

  assert.doesNotMatch(serialized, /base64|blob:|previewUrl|estimatedGrams|confidence|assumptions|dishName/);
  assert.deepEqual(Object.keys(registration.items[0]).sort(), [
    '_estimateSource', '_estimated', 'carbs', 'fat', 'fiber', 'foodId', 'id', 'kcal',
    'name', 'protein', 'qty', 'salt', 'satfat', 'sugars', 'time', 'unit',
  ].sort());
});

contractTest('rejects missing estimates, unsupported categories, and invalid times before persistence', module => {
  const build = module.createImageMealRegistration({
    createEntryId: () => 'entry-1',
    mealKeys: ['Lunch'],
  }).buildImageMealRegistration;

  assert.throws(() => build({ estimate: null, meal: 'Lunch', time: '12:00' }), /estimate/i);
  assert.throws(() => build({ estimate: estimate(), meal: 'Dinner', time: '12:00' }), /category/i);
  assert.throws(() => build({ estimate: estimate(), meal: 'Lunch', time: '25:00' }), /time/i);
});
