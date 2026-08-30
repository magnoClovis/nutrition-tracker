const test = require('node:test');
const assert = require('node:assert/strict');
const MealEstimate = require('../../meal-estimate.js');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../image-meal-flow.js'))],
  ['ESM', () => import('../../src/composite/image-meal-flow.js')],
];

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => callback(await load()));
  });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function remoteEstimate(overrides = {}) {
  return {
    status: 'identified',
    dishName: 'Rice bowl',
    overallConfidence: 'medium',
    assumptions: ['Visible serving'],
    items: [{
      name: 'Rice', quantity: 120, unit: 'g', estimatedGrams: 120,
      protein: 3, kcal: 156, carbs: 34, fat: 0.4, fiber: 0.5,
      salt: null, sugars: null, satfat: null, confidence: 'medium',
    }],
    ...overrides,
  };
}

function createFixture(module, overrides = {}) {
  let nextId = 0;
  const domain = MealEstimate.createMealEstimate({ createItemId: () => `item-${++nextId}` });
  const photos = [];
  const reviews = [];
  const confirmations = [];
  const aborts = [];
  class ClientError extends Error {
    constructor(code, retryAfterSeconds, scope) {
      super(code);
      this.code = code;
      this.retryAfterSeconds = retryAfterSeconds;
      this.scope = scope;
    }
  }
  function photo(name) {
    const value = {
      name,
      previewUrl: `blob:${name}`,
      disposed: false,
      dispose() { this.disposed = true; },
      async toRequestImage() { return { mimeType: 'image/jpeg', data: name }; },
    };
    photos.push(value);
    return value;
  }
  const flow = module.createImageMealFlow({
    captureFromCamera: overrides.captureFromCamera || (async () => photo('camera')),
    chooseFromGallery: overrides.chooseFromGallery || (async () => photo('gallery')),
    analyzeImageMeal: overrides.analyzeImageMeal || (async () => remoteEstimate()),
    normalizeMealEstimate: domain.normalizeMealEstimate,
    validateMealEstimate: MealEstimate.validateMealEstimate,
    onReview: overrides.onReview || (async value => { reviews.push(value); }),
    onConfirm: overrides.onConfirm || (async value => { confirmations.push(value); }),
    createAbortController: () => {
      const controller = {
        signal: {},
        abort() { aborts.push(true); this.signal.aborted = true; },
      };
      return controller;
    },
    ImageMealClientError: ClientError,
    MealEstimateValidationError: MealEstimate.MealEstimateValidationError,
  });
  return { flow, photos, reviews, confirmations, aborts, photo, ClientError };
}

contractTest('moves from empty to camera/gallery photo and disposes replaced or discarded blobs', async module => {
  const fixture = createFixture(module);
  const phases = [];
  fixture.flow.subscribe(state => phases.push(state.phase));
  assert.equal(fixture.flow.getState().phase, 'empty');

  await fixture.flow.captureFromCamera();
  const first = fixture.flow.getState().photo;
  assert.equal(first.previewUrl, 'blob:camera');
  await fixture.flow.chooseFromGallery();
  assert.equal(first.disposed, true);
  assert.equal(fixture.flow.getState().photo.previewUrl, 'blob:gallery');
  fixture.flow.discard();
  assert.equal(fixture.photos[1].disposed, true);
  assert.equal(fixture.flow.getState().phase, 'empty');
  assert.deepEqual(phases, ['capturing', 'photo', 'capturing', 'photo', 'empty']);
});

contractTest('processes a photo into an editable normalized result with stable item ids', async module => {
  const analyzed = [];
  const fixture = createFixture(module, {
    analyzeImageMeal: async input => {
      analyzed.push(input);
      return remoteEstimate();
    },
  });
  await fixture.flow.captureFromCamera();
  const result = await fixture.flow.process('en');

  assert.equal(result.phase, 'result');
  assert.equal(result.estimate.dishName, 'Rice bowl');
  assert.equal(result.estimate.items[0].id, 'item-1');
  assert.deepEqual(analyzed[0].image, { mimeType: 'image/jpeg', data: 'camera' });
  assert.equal(analyzed[0].language, 'en');
  assert.ok(analyzed[0].signal);
});

contractTest('cancels processing, keeps the photo, and ignores a late response', async module => {
  const pending = deferred();
  const fixture = createFixture(module, { analyzeImageMeal: () => pending.promise });
  await fixture.flow.captureFromCamera();
  const processing = fixture.flow.process('pt');
  assert.equal(fixture.flow.getState().phase, 'processing');
  fixture.flow.cancelProcessing();
  assert.equal(fixture.flow.getState().phase, 'photo');
  assert.equal(fixture.aborts.length, 1);
  pending.resolve(remoteEstimate());
  await processing;
  assert.equal(fixture.flow.getState().phase, 'photo');
  assert.equal(fixture.flow.getState().estimate, null);
});

contractTest('separates not-food and not-identifiable from transport errors', async module => {
  for (const status of ['not-food', 'not-identifiable']) {
    const fixture = createFixture(module, {
      analyzeImageMeal: async () => remoteEstimate({
        status,
        dishName: '',
        overallConfidence: 'low',
        assumptions: [],
        items: [],
      }),
    });
    await fixture.flow.captureFromCamera();
    const state = await fixture.flow.process('es');
    assert.equal(state.phase, 'not-identifiable');
    assert.equal(state.notIdentifiableReason, status);
  }
});

contractTest('maps every distinct capture and analysis failure with quota metadata', async module => {
  const captureCases = [
    ['camera-permission-denied', 'permission-denied'],
    ['image-processing-failed', 'invalid-photo'],
  ];
  for (const [sourceCode, expected] of captureCases) {
    const fixture = createFixture(module, {
      captureFromCamera: async () => { throw Object.assign(new Error(sourceCode), { code: sourceCode }); },
    });
    assert.equal((await fixture.flow.captureFromCamera()).error, expected);
  }

  const analysisCases = [
    ['quota-reached', 'quota-reached'],
    ['session-expired', 'session-expired'],
    ['service-unavailable', 'service-unavailable'],
    ['invalid-response', 'invalid-response'],
  ];
  for (const [sourceCode, expected] of analysisCases) {
    let fixture;
    fixture = createFixture(module, {
      analyzeImageMeal: async () => { throw new fixture.ClientError(sourceCode, 41, 'image-user'); },
    });
    await fixture.flow.captureFromCamera();
    const state = await fixture.flow.process('pt');
    assert.equal(state.error, expected);
    assert.equal(state.retryAfterSeconds, 41);
    assert.equal(state.scope, 'image-user');
  }
});

contractTest('validates edits, confirms once, disposes the photo, and preserves edits on save failure', async module => {
  const fixture = createFixture(module);
  await fixture.flow.captureFromCamera();
  await fixture.flow.process('pt');
  fixture.flow.updateEstimate({ ...fixture.flow.getState().estimate, dishName: '' });
  const invalid = await fixture.flow.confirm();
  assert.equal(invalid.phase, 'result');
  assert.ok(invalid.validationErrors.some(error => error.path === 'dishName'));

  fixture.flow.updateEstimate({ ...fixture.flow.getState().estimate, dishName: 'Edited bowl' });
  const confirmed = await fixture.flow.confirm();
  assert.equal(confirmed.phase, 'confirmed');
  assert.equal(fixture.confirmations[0].dishName, 'Edited bowl');
  assert.equal(fixture.photos[0].disposed, true);

  const failing = createFixture(module, { onConfirm: async () => { throw new Error('write failed'); } });
  await failing.flow.captureFromCamera();
  await failing.flow.process('pt');
  const failed = await failing.flow.confirm();
  assert.equal(failed.phase, 'result');
  assert.equal(failed.error, 'confirmation-failed');
  assert.equal(failing.photos[0].disposed, false);
  assert.equal(failed.estimate.dishName, 'Rice bowl');
});

contractTest('validates and normalizes the optional review without confirming or disposing the photo', async module => {
  const fixture = createFixture(module);
  await fixture.flow.captureFromCamera();
  await fixture.flow.process('pt');
  const photo = fixture.flow.getState().photo;

  fixture.flow.updateEstimate({ ...fixture.flow.getState().estimate, dishName: '' });
  const invalid = await fixture.flow.review();
  assert.ok(invalid.validationErrors.some(error => error.path === 'dishName'));
  assert.equal(fixture.reviews.length, 0);

  fixture.flow.updateEstimate({ ...fixture.flow.getState().estimate, dishName: 'Reviewed bowl' });
  const reviewed = await fixture.flow.review();
  assert.equal(reviewed.phase, 'result');
  assert.equal(reviewed.error, null);
  assert.equal(fixture.reviews[0].dishName, 'Reviewed bowl');
  assert.equal(fixture.confirmations.length, 0);
  assert.equal(photo.disposed, false);
});

contractTest('keeps the edited photo result available when opening review fails', async module => {
  const fixture = createFixture(module, {
    onReview: async () => { throw new Error('review unavailable'); },
  });
  await fixture.flow.captureFromCamera();
  await fixture.flow.process('pt');
  const failed = await fixture.flow.review();

  assert.equal(failed.phase, 'result');
  assert.equal(failed.error, 'invalid-response');
  assert.equal(failed.estimate.dishName, 'Rice bowl');
  assert.equal(fixture.photos[0].disposed, false);
});
