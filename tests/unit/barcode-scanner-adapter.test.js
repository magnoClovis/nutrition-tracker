const test = require("node:test");
const assert = require("node:assert/strict");

async function loadFactory() {
  return import("../../src/composite/barcode-scanner-adapter.js");
}

function createClassList() {
  const values = new Set();
  return {
    add(value) { values.add(value); },
    remove(value) { values.delete(value); },
    contains(value) { return values.has(value); },
  };
}

function createDocumentFixture() {
  const listeners = new Map();
  return {
    hidden: false,
    documentElement: { classList: createClassList() },
    body: { classList: createClassList() },
    addEventListener(name, callback) {
      listeners.set(name, callback);
    },
    removeEventListener(name, callback) {
      if (listeners.get(name) === callback) listeners.delete(name);
    },
    emit(name) {
      listeners.get(name)?.();
    },
    listeners,
  };
}

function createNativeFixture(overrides = {}) {
  const calls = [];
  let callbacks = null;
  let active = false;
  const service = {
    async stop() {
      calls.push("stop");
      active = false;
    },
    async isSupported() {
      calls.push("supported");
      return { supported: true };
    },
    async checkPermissions() {
      calls.push("check");
      return { camera: "granted" };
    },
    async requestPermissions() {
      calls.push("request");
      return { camera: "granted" };
    },
    async start(nextCallbacks) {
      calls.push("start");
      callbacks = nextCallbacks;
      active = true;
    },
    async isTorchAvailable() {
      calls.push("torchAvailable");
      return { available: true };
    },
    async toggleTorch() {
      calls.push("toggleTorch");
    },
    async isTorchEnabled() {
      calls.push("torchEnabled");
      return { enabled: true };
    },
    isActive() {
      return active;
    },
    ...overrides,
  };
  return {
    service,
    calls,
    emitDetected(code) {
      active = false;
      callbacks.onDetected({ code, format: "EAN_13" });
    },
    emitError(error = new Error("scan failed")) {
      active = false;
      callbacks.onError(error);
    },
  };
}

function createDependencies(events, panel) {
  return {
    refs: { videoRef: { current: { parentElement: panel } } },
    setScanning(value) { events.push(["scanning", value]); },
    setMessage(value) { events.push(["message", value]); },
    setInput(value) { events.push(["input", value]); },
    setTorchAvailable(value) { events.push(["torchAvailable", value]); },
    setTorchEnabled(value) { events.push(["torchEnabled", value]); },
    lookupBarcode(value) {
      events.push(["lookup", value]);
      return Promise.resolve();
    },
    messages: {
      pointCamera: "point",
      startFailed: "failed",
    },
  };
}

test("adapter returns the existing web controller untouched outside native Android", async () => {
  const { createBarcodeScannerAdapter } = await loadFactory();
  const expectedController = { startBarcodeScanner() {}, stopBarcodeScanner() {} };
  const webDependencies = { contract: "unchanged" };
  let receivedDependencies = null;
  const adapter = createBarcodeScannerAdapter({
    webBarcodeScanner: {
      ZXING_CDN_URLS: ["web"],
      createBarcodeScanner(dependencies) {
        receivedDependencies = dependencies;
        return expectedController;
      },
    },
    nativeBarcodeScanner: createNativeFixture().service,
    isNativeAndroid: () => false,
    documentObject: createDocumentFixture(),
  });

  assert.strictEqual(adapter.createBarcodeScanner(webDependencies), expectedController);
  assert.strictEqual(receivedDependencies, webDependencies);
  assert.deepEqual(adapter.ZXING_CDN_URLS, ["web"]);
});

test("native adapter reads a code into the existing input and lookup callbacks", async () => {
  const { createBarcodeScannerAdapter } = await loadFactory();
  const documentObject = createDocumentFixture();
  const panel = { classList: createClassList() };
  const native = createNativeFixture();
  const events = [];
  const adapter = createBarcodeScannerAdapter({
    webBarcodeScanner: { createBarcodeScanner() { throw new Error("web path used"); } },
    nativeBarcodeScanner: native.service,
    isNativeAndroid: () => true,
    documentObject,
  });
  const controller = adapter.createBarcodeScanner(createDependencies(events, panel));

  await controller.startBarcodeScanner();
  assert.equal(panel.classList.contains("phrona-native-barcode-scanner-flow"), true);
  assert.equal(documentObject.body.classList.contains("phrona-native-barcode-scanner-active"), true);
  assert.deepEqual(native.calls, ["stop", "supported", "check", "start", "torchAvailable"]);

  native.emitDetected("7891234567895");
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(panel.classList.contains("phrona-native-barcode-scanner-flow"), false);
  assert.equal(documentObject.body.classList.contains("phrona-native-barcode-scanner-active"), false);
  assert.deepEqual(
    events.filter(([name]) => name === "input" || name === "lookup"),
    [["input", "7891234567895"], ["lookup", "7891234567895"]],
  );
});

test("native adapter requests prompt permission and exposes flashlight state", async () => {
  const { createBarcodeScannerAdapter } = await loadFactory();
  const native = createNativeFixture({
    async checkPermissions() {
      native.calls.push("check");
      return { camera: "prompt" };
    },
  });
  const events = [];
  const adapter = createBarcodeScannerAdapter({
    webBarcodeScanner: { createBarcodeScanner() {} },
    nativeBarcodeScanner: native.service,
    isNativeAndroid: () => true,
    documentObject: createDocumentFixture(),
  });
  const controller = adapter.createBarcodeScanner(
    createDependencies(events, { classList: createClassList() }),
  );

  await controller.startBarcodeScanner();
  await controller.toggleBarcodeTorch();

  assert.deepEqual(native.calls, [
    "stop",
    "supported",
    "check",
    "request",
    "start",
    "torchAvailable",
    "toggleTorch",
    "torchEnabled",
  ]);
  assert.ok(events.some(event => event[0] === "torchAvailable" && event[1] === true));
  assert.ok(events.some(event => event[0] === "torchEnabled" && event[1] === true));
});

test("native adapter reports denied permission without opening the camera", async () => {
  const { createBarcodeScannerAdapter } = await loadFactory();
  const native = createNativeFixture({
    async checkPermissions() {
      native.calls.push("check");
      return { camera: "denied" };
    },
  });
  const events = [];
  const adapter = createBarcodeScannerAdapter({
    webBarcodeScanner: { createBarcodeScanner() {} },
    nativeBarcodeScanner: native.service,
    isNativeAndroid: () => true,
    documentObject: createDocumentFixture(),
  });

  await adapter.createBarcodeScanner(
    createDependencies(events, { classList: createClassList() }),
  ).startBarcodeScanner();

  assert.equal(native.calls.includes("start"), false);
  assert.ok(events.some(event => event[0] === "message" && event[1] === "failed"));
});

test("cancellation during a pending permission request discards the late grant", async () => {
  const { createBarcodeScannerAdapter } = await loadFactory();
  let resolvePermission;
  const permission = new Promise(resolve => {
    resolvePermission = resolve;
  });
  const native = createNativeFixture({
    async checkPermissions() {
      native.calls.push("check");
      return { camera: "prompt" };
    },
    async requestPermissions() {
      native.calls.push("request");
      return permission;
    },
  });
  const adapter = createBarcodeScannerAdapter({
    webBarcodeScanner: { createBarcodeScanner() {} },
    nativeBarcodeScanner: native.service,
    isNativeAndroid: () => true,
    documentObject: createDocumentFixture(),
  });
  const controller = adapter.createBarcodeScanner(
    createDependencies([], { classList: createClassList() }),
  );

  const starting = controller.startBarcodeScanner();
  await new Promise(resolve => setImmediate(resolve));
  await controller.stopBarcodeScanner();
  resolvePermission({ camera: "granted" });
  await starting;

  assert.equal(native.calls.includes("start"), false);
});

test("putting the app in the background stops the active native session", async () => {
  const { createBarcodeScannerAdapter } = await loadFactory();
  const documentObject = createDocumentFixture();
  const native = createNativeFixture();
  const adapter = createBarcodeScannerAdapter({
    webBarcodeScanner: { createBarcodeScanner() {} },
    nativeBarcodeScanner: native.service,
    isNativeAndroid: () => true,
    documentObject,
  });
  const controller = adapter.createBarcodeScanner(
    createDependencies([], { classList: createClassList() }),
  );

  await controller.startBarcodeScanner();
  documentObject.hidden = true;
  documentObject.emit("visibilitychange");
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(native.service.isActive(), false);
  assert.equal(documentObject.listeners.has("visibilitychange"), false);
});
