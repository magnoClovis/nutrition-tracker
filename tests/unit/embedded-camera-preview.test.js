const test = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../src/composite/embedded-camera-preview.js');
}

function createFixture(module, overrides = {}) {
  const calls = { start: [], capture: [], stop: 0 };
  const plugin = {
    async start(options) {
      calls.start.push(options);
      if (overrides.startError) throw overrides.startError;
    },
    async capture(options) {
      calls.capture.push(options);
      if (overrides.captureError) throw overrides.captureError;
      return overrides.captureResult || { value: 'jpeg-base64' };
    },
    async stop() {
      calls.stop += 1;
      if (overrides.stopError) throw overrides.stopError;
    },
  };
  return {
    calls,
    preview: module.createEmbeddedCameraPreview({
      cameraPreviewPlugin: plugin,
      isNativeAndroid: () => overrides.native !== false,
    }),
    surface: {
      getBoundingClientRect: () => overrides.rect || ({
        left: 12.4,
        top: 148.6,
        width: 336.2,
        height: 251.7,
      }),
    },
  };
}

test('measures the dedicated surface in Android DIP-compatible CSS pixels', async () => {
  const module = await loadModule();
  assert.deepEqual(module.measureEmbeddedPreview({
    getBoundingClientRect: () => ({ left: 12.4, top: 148.6, width: 336.2, height: 251.7 }),
  }), { x: 12, y: 149, width: 336, height: 252 });
});

test('starts a rear camera preview constrained to the measured rectangle', async () => {
  const module = await loadModule();
  const fixture = createFixture(module);

  await fixture.preview.start(fixture.surface);

  assert.equal(fixture.preview.getPhase(), 'active');
  assert.deepEqual(fixture.calls.start, [{
    x: 12,
    y: 149,
    width: 336,
    height: 252,
    position: 'rear',
    toBack: false,
    storeToFile: false,
    disableExifHeaderStripping: false,
    enableZoom: true,
    lockAndroidOrientation: false,
  }]);
});

test('captures one bounded-preview frame and keeps the preview active', async () => {
  const module = await loadModule();
  const fixture = createFixture(module);
  await fixture.preview.start(fixture.surface);

  assert.equal(await fixture.preview.capture(), 'jpeg-base64');
  assert.equal(fixture.preview.getPhase(), 'active');
  assert.deepEqual(fixture.calls.capture, [{ quality: 100, width: 1280, height: 1280 }]);
});

test('stops idempotently and restores idle even when native stop fails', async () => {
  const module = await loadModule();
  const fixture = createFixture(module, { stopError: new Error('native stop failed') });
  await fixture.preview.start(fixture.surface);

  await assert.rejects(fixture.preview.stop(), error => error.code === 'preview-stop-failed');
  assert.equal(fixture.preview.getPhase(), 'idle');
  assert.equal(fixture.calls.stop, 1);
  await fixture.preview.stop();
  assert.equal(fixture.calls.stop, 1);
});

test('rejects browser use, invalid surfaces, duplicate starts, and capture before start', async () => {
  const module = await loadModule();
  const browser = createFixture(module, { native: false });
  await assert.rejects(browser.preview.start(browser.surface), error => error.code === 'preview-unsupported');

  const invalid = createFixture(module, { rect: { left: 0, top: 0, width: 0, height: 200 } });
  await assert.rejects(invalid.preview.start(invalid.surface), error => error.code === 'preview-surface-invalid');

  const fixture = createFixture(module);
  await assert.rejects(fixture.preview.capture(), error => error.code === 'preview-not-active');
  await fixture.preview.start(fixture.surface);
  await assert.rejects(fixture.preview.start(fixture.surface), error => error.code === 'preview-already-active');
});

test('normalizes start and capture failures without leaving a stuck phase', async () => {
  const module = await loadModule();
  const failedStart = createFixture(module, { startError: new Error('permission denied') });
  await assert.rejects(failedStart.preview.start(failedStart.surface), error => (
    error.code === 'preview-start-failed' && error.cause.message === 'permission denied'
  ));
  assert.equal(failedStart.preview.getPhase(), 'idle');

  const failedCapture = createFixture(module, { captureResult: { value: '' } });
  await failedCapture.preview.start(failedCapture.surface);
  await assert.rejects(failedCapture.preview.capture(), error => error.code === 'preview-capture-empty');
  assert.equal(failedCapture.preview.getPhase(), 'active');
});
