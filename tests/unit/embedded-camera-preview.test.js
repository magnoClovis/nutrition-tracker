const test = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../src/composite/embedded-camera-preview.js');
}

function createPermissionPlugin(overrides = {}, calls = {}) {
  return {
    async checkPermissions() {
      return { camera: overrides.permission || 'granted' };
    },
    async requestPermissions() {
      calls.permissionRequested = true;
      return { camera: overrides.requestedPermission || 'granted' };
    },
  };
}

function createFixture(module, overrides = {}) {
  const calls = { start: [], capture: [], stop: 0, flashModes: 0, flashModeChanges: [] };
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
    async getSupportedFlashModes() {
      calls.flashModes += 1;
      if (overrides.flashModesError) throw overrides.flashModesError;
      return { result: overrides.flashModes || ['off', 'on', 'auto', 'unknown', 'on'] };
    },
    async setFlashMode(options) {
      calls.flashModeChanges.push(options);
      if (overrides.setFlashModeError) throw overrides.setFlashModeError;
    },
  };
  return {
    calls,
    preview: module.createEmbeddedCameraPreview({
      cameraPreviewPlugin: plugin,
      cameraPermissionPlugin: createPermissionPlugin(overrides, calls),
      isNativeAndroid: () => overrides.native !== false,
      operationTimeoutMs: overrides.operationTimeoutMs,
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

test('scrolls the complete camera card into the add-meal viewport before measurement', async () => {
  const module = await loadModule();
  const frameCallbacks = [];
  let scrollTop = 120;
  let cardTop = 530;
  const scrollViewport = {
    get scrollTop() { return scrollTop; },
    set scrollTop(value) { scrollTop = value; },
    getBoundingClientRect: () => ({ top: 80, bottom: 680, height: 600 }),
    scrollBy({ top }) {
      scrollTop += top;
      cardTop -= top;
    },
  };
  const card = {
    dataset: {},
    getBoundingClientRect: () => ({ top: cardTop, bottom: cardTop + 360, height: 360 }),
  };
  const surface = {
    ownerDocument: {
      defaultView: {
        requestAnimationFrame(callback) {
          frameCallbacks.push(callback);
          setImmediate(callback);
        },
      },
    },
    closest(selector) {
      if (selector === '[data-embedded-camera="true"]') return card;
      if (selector === '[data-app-main="adicionar"]') return scrollViewport;
      return null;
    },
  };

  assert.equal(await module.prepareEmbeddedPreviewSurface(surface), true);
  assert.equal(scrollTop, 342);
  assert.equal(card.getBoundingClientRect().bottom, 668);
  assert.equal(card.dataset.cameraGeometryReady, 'true');
  assert.equal(frameCallbacks.length, 3);
});

test('measures native bounds only after the camera card has settled in the viewport', async () => {
  const module = await loadModule();
  let cardTop = 520;
  const calls = { start: [] };
  const card = {
    dataset: {},
    getBoundingClientRect: () => ({ top: cardTop, bottom: cardTop + 360, height: 360 }),
  };
  const viewport = {
    getBoundingClientRect: () => ({ top: 60, bottom: 700, height: 640 }),
    scrollBy({ top }) { cardTop -= top; },
  };
  const surface = {
    ownerDocument: { defaultView: { requestAnimationFrame: callback => setImmediate(callback) } },
    closest(selector) {
      if (selector === '[data-embedded-camera="true"]') return card;
      if (selector === '[data-app-main="adicionar"]') return viewport;
      return null;
    },
    getBoundingClientRect: () => ({ left: 18, top: cardTop, width: 340, height: 360 }),
  };
  const preview = module.createEmbeddedCameraPreview({
    cameraPreviewPlugin: {
      async start(options) { calls.start.push(options); },
      async capture() { return { value: 'jpeg' }; },
      async stop() {},
    },
    cameraPermissionPlugin: createPermissionPlugin(),
    isNativeAndroid: () => true,
  });

  await preview.start(surface);
  assert.equal(calls.start[0].y, 328);
  assert.equal(calls.start[0].height, 360);
  assert.equal(card.dataset.cameraGeometryReady, 'true');
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
    toBack: true,
    storeToFile: false,
    disableExifHeaderStripping: false,
    enableZoom: false,
    lockAndroidOrientation: true,
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

test('reports normalized rear-camera flash modes only while the preview is active', async () => {
  const module = await loadModule();
  const fixture = createFixture(module);
  await assert.rejects(
    fixture.preview.getSupportedFlashModes(),
    error => error.code === 'preview-not-active',
  );
  await fixture.preview.start(fixture.surface);
  assert.deepEqual(await fixture.preview.getSupportedFlashModes(), ['off', 'on', 'auto']);
  assert.equal(fixture.calls.flashModes, 1);
});

test('sets only supported flash values while active and resets an enabled light before stop', async () => {
  const module = await loadModule();
  const fixture = createFixture(module);
  await assert.rejects(
    fixture.preview.setFlashMode('torch'),
    error => error.code === 'preview-not-active',
  );
  await fixture.preview.start(fixture.surface);
  await assert.rejects(
    fixture.preview.setFlashMode('bright'),
    error => error.code === 'preview-flash-mode-invalid',
  );
  assert.equal(await fixture.preview.setFlashMode('torch'), 'torch');
  assert.equal(fixture.preview.getFlashMode(), 'torch');
  await fixture.preview.stop();
  assert.deepEqual(fixture.calls.flashModeChanges, [
    { flashMode: 'torch' },
    { flashMode: 'off' },
  ]);
  assert.equal(fixture.preview.getFlashMode(), 'off');
});

test('stops idempotently and restores idle even when native stop fails', async () => {
  const module = await loadModule();
  const fixture = createFixture(module, { stopError: new Error('native stop failed') });
  await fixture.preview.start(fixture.surface);

  await assert.rejects(fixture.preview.stop(), error => error.code === 'preview-stop-failed');
  assert.equal(fixture.preview.getPhase(), 'idle');
  assert.equal(fixture.calls.stop, 2);
  await fixture.preview.stop();
  assert.equal(fixture.calls.stop, 2);
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
  const failedStart = createFixture(module, { startError: new Error('native preview unavailable') });
  await assert.rejects(failedStart.preview.start(failedStart.surface), error => (
    error.code === 'preview-start-failed' && error.cause.message === 'native preview unavailable'
  ));
  assert.equal(failedStart.preview.getPhase(), 'idle');

  const failedCapture = createFixture(module, { captureResult: { value: '' } });
  await failedCapture.preview.start(failedCapture.surface);
  await assert.rejects(failedCapture.preview.capture(), error => error.code === 'preview-capture-empty');
  assert.equal(failedCapture.preview.getPhase(), 'active');
});

test('maps a native permission rejection to the shared camera error', async () => {
  const module = await loadModule();
  const fixture = createFixture(module, { startError: new Error('Camera permission denied') });
  await assert.rejects(
    fixture.preview.start(fixture.surface),
    error => error.code === 'camera-permission-denied',
  );
});

test('stops a preview whose native start finishes after cancellation', async () => {
  const module = await loadModule();
  let releaseStart;
  const started = new Promise(resolve => { releaseStart = resolve; });
  const calls = { stop: 0 };
  const preview = module.createEmbeddedCameraPreview({
    cameraPreviewPlugin: {
      start: () => started,
      async capture() { return { value: 'unused' }; },
      async stop() { calls.stop += 1; },
    },
    cameraPermissionPlugin: createPermissionPlugin(),
    isNativeAndroid: () => true,
  });
  const surface = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }) };
  const opening = preview.start(surface);
  await new Promise(resolve => setImmediate(resolve));
  await preview.stop();
  releaseStart();
  await opening;
  assert.equal(preview.getPhase(), 'idle');
  assert.equal(calls.stop, 2);
});

test('does not resurrect an active phase when capture settles after cancellation', async () => {
  const module = await loadModule();
  let releaseCapture;
  const pendingCapture = new Promise(resolve => { releaseCapture = resolve; });
  const fixture = createFixture(module, { captureResult: pendingCapture });
  fixture.preview = module.createEmbeddedCameraPreview({
    cameraPreviewPlugin: {
      async start() {},
      capture: () => pendingCapture,
      async stop() {},
    },
    cameraPermissionPlugin: createPermissionPlugin(),
    isNativeAndroid: () => true,
  });
  await fixture.preview.start(fixture.surface);
  const capture = fixture.preview.capture();
  const stopping = fixture.preview.stop();
  releaseCapture({ value: 'late-jpeg' });
  await stopping;
  await assert.rejects(capture, error => error.code === 'preview-capture-cancelled');
  assert.equal(fixture.preview.getPhase(), 'idle');
});

test('serializes native stop after an in-flight capture settles', async () => {
  const module = await loadModule();
  let releaseCapture;
  const nativeCapture = new Promise(resolve => { releaseCapture = resolve; });
  const calls = [];
  const preview = module.createEmbeddedCameraPreview({
    cameraPreviewPlugin: {
      async start() {},
      capture() { calls.push('capture'); return nativeCapture; },
      async stop() { calls.push('stop'); },
    },
    cameraPermissionPlugin: createPermissionPlugin(),
    isNativeAndroid: () => true,
  });
  await preview.start({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }) });

  const capture = preview.capture();
  const stopping = preview.stop();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ['capture']);

  releaseCapture({ value: 'late-jpeg' });
  await stopping;
  await assert.rejects(capture, error => error.code === 'preview-capture-cancelled');
  assert.deepEqual(calls, ['capture', 'stop']);
});

test('retries one transient native stop failure before releasing the session', async () => {
  const module = await loadModule();
  let stopCalls = 0;
  const preview = module.createEmbeddedCameraPreview({
    cameraPreviewPlugin: {
      async start() {},
      async capture() { return { value: 'jpeg' }; },
      async stop() {
        stopCalls += 1;
        if (stopCalls === 1) throw new Error('transient stop failure');
      },
    },
    cameraPermissionPlugin: createPermissionPlugin(),
    isNativeAndroid: () => true,
  });
  await preview.start({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }) });
  await preview.stop();
  assert.equal(stopCalls, 2);
  assert.equal(preview.getPhase(), 'idle');
});

test('bounds a stuck native start and returns to idle after cleanup', async () => {
  const module = await loadModule();
  let stopCalls = 0;
  const preview = module.createEmbeddedCameraPreview({
    cameraPreviewPlugin: {
      start: () => new Promise(() => {}),
      async capture() { return { value: 'unused' }; },
      async stop() { stopCalls += 1; },
    },
    cameraPermissionPlugin: createPermissionPlugin(),
    isNativeAndroid: () => true,
    operationTimeoutMs: 5,
  });
  await assert.rejects(
    preview.start({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }) }),
    error => error.code === 'preview-start-timeout',
  );
  assert.equal(preview.getPhase(), 'idle');
  assert.equal(stopCalls, 1);
});

test('cleans up again when a timed-out native start settles late', async () => {
  const module = await loadModule();
  let releaseStart;
  let stopCalls = 0;
  const nativeStart = new Promise(resolve => { releaseStart = resolve; });
  const preview = module.createEmbeddedCameraPreview({
    cameraPreviewPlugin: {
      start: () => nativeStart,
      async capture() { return { value: 'unused' }; },
      async stop() { stopCalls += 1; },
    },
    cameraPermissionPlugin: createPermissionPlugin(),
    isNativeAndroid: () => true,
    operationTimeoutMs: 5,
  });

  await assert.rejects(
    preview.start({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }) }),
    error => error.code === 'preview-start-timeout',
  );
  assert.equal(stopCalls, 1);

  releaseStart();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(stopCalls, 2);
  assert.equal(preview.getPhase(), 'idle');
});

test('requests a prompt permission once and refuses a permanently denied camera', async () => {
  const module = await loadModule();
  const prompted = createFixture(module, { permission: 'prompt', requestedPermission: 'granted' });
  await prompted.preview.start(prompted.surface);
  assert.equal(prompted.calls.permissionRequested, true);

  const denied = createFixture(module, { permission: 'denied' });
  await assert.rejects(
    denied.preview.start(denied.surface),
    error => error.code === 'camera-permission-denied',
  );
  assert.equal(denied.calls.start.length, 0);
  assert.equal(denied.preview.getPhase(), 'idle');
});
