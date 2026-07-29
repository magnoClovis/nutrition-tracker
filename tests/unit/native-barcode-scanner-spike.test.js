const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..", "..");

async function loadFactory() {
  return import("../../src/composite/native-barcode-scanner-spike.js");
}

function createPluginFixture() {
  const listeners = new Map();
  const calls = [];
  const handles = [];
  const plugin = {
    async addListener(name, callback) {
      listeners.set(name, callback);
      const handle = {
        async remove() {
          calls.push(["remove", name]);
          listeners.delete(name);
        }
      };
      handles.push(handle);
      return handle;
    },
    async startScan(options) {
      calls.push(["start", options]);
    },
    async stopScan() {
      calls.push(["stop"]);
    },
    async checkPermissions() {
      calls.push(["checkPermissions"]);
      return { camera: "prompt" };
    },
    async requestPermissions() {
      calls.push(["requestPermissions"]);
      return { camera: "granted" };
    },
    async isSupported() {
      calls.push(["isSupported"]);
      return { supported: true };
    },
    async isTorchAvailable() {
      return { available: true };
    },
    async isTorchEnabled() {
      return { enabled: false };
    },
    async toggleTorch() {
      calls.push(["toggleTorch"]);
    },
    async openSettings() {
      calls.push(["openSettings"]);
    }
  };
  return { plugin, calls, listeners, handles };
}

test("native spike is unavailable outside Capacitor Android", async () => {
  const { createNativeBarcodeScannerSpike } = await loadFactory();
  const fixture = createPluginFixture();
  const spike = createNativeBarcodeScannerSpike({
    barcodeScanner: fixture.plugin,
    formats: ["EAN_13"],
    isNativeAndroid: () => false
  });

  assert.equal(spike.isAvailable(), false);
  await assert.rejects(
    spike.start({ onDetected() {}, onError() {} }),
    /available only on Capacitor Android/
  );
  assert.deepEqual(fixture.calls, []);
});

test("native spike forwards permission and hardware checks through injected plugin", async () => {
  const { createNativeBarcodeScannerSpike } = await loadFactory();
  const fixture = createPluginFixture();
  const spike = createNativeBarcodeScannerSpike({
    barcodeScanner: fixture.plugin,
    formats: ["EAN_13"],
    isNativeAndroid: () => true
  });

  assert.deepEqual(await spike.checkPermissions(), { camera: "prompt" });
  assert.deepEqual(await spike.requestPermissions(), { camera: "granted" });
  assert.deepEqual(await spike.isSupported(), { supported: true });
  await spike.toggleTorch();
  await spike.openSettings();

  assert.deepEqual(fixture.calls, [
    ["checkPermissions"],
    ["requestPermissions"],
    ["isSupported"],
    ["toggleTorch"],
    ["openSettings"]
  ]);
});

test("native spike accepts one result, stops camera, and never performs a lookup", async () => {
  const { createNativeBarcodeScannerSpike } = await loadFactory();
  const fixture = createPluginFixture();
  const detected = [];
  const errors = [];
  const spike = createNativeBarcodeScannerSpike({
    barcodeScanner: fixture.plugin,
    formats: ["EAN_13", "UPC_A"],
    isNativeAndroid: () => true
  });

  await spike.start({
    onDetected: result => detected.push(result),
    onError: error => errors.push(error)
  });
  assert.equal(spike.isActive(), true);
  assert.deepEqual(fixture.calls[0], ["start", { formats: ["EAN_13", "UPC_A"] }]);

  fixture.listeners.get("barcodesScanned")({
    barcodes: [{ rawValue: "7891234567895", format: "EAN_13" }]
  });
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(detected, [{ code: "7891234567895", format: "EAN_13" }]);
  assert.deepEqual(errors, []);
  assert.equal(spike.isActive(), false);
  assert.equal(fixture.calls.filter(call => call[0] === "stop").length, 1);
});

test("native spike cancellation removes listeners and is idempotent", async () => {
  const { createNativeBarcodeScannerSpike } = await loadFactory();
  const fixture = createPluginFixture();
  const spike = createNativeBarcodeScannerSpike({
    barcodeScanner: fixture.plugin,
    formats: ["EAN_8"],
    isNativeAndroid: () => true
  });

  await spike.start({ onDetected() {}, onError() {} });
  await spike.stop();
  await spike.stop();

  assert.equal(fixture.calls.filter(call => call[0] === "stop").length, 1);
  assert.equal(fixture.calls.filter(call => call[0] === "remove").length, 2);
  assert.equal(fixture.listeners.size, 0);
});

test("native spike cleans up when listener registration fails", async () => {
  const { createNativeBarcodeScannerSpike } = await loadFactory();
  const fixture = createPluginFixture();
  fixture.plugin.addListener = async name => {
    if (name === "scanError") throw new Error("listener unavailable");
    const handle = {
      async remove() {
        fixture.calls.push(["remove", name]);
      }
    };
    return handle;
  };
  const spike = createNativeBarcodeScannerSpike({
    barcodeScanner: fixture.plugin,
    formats: ["EAN_13"],
    isNativeAndroid: () => true
  });

  await assert.rejects(
    spike.start({ onDetected() {}, onError() {} }),
    /listener unavailable/
  );

  assert.equal(spike.isActive(), false);
  assert.deepEqual(fixture.calls, [["remove", "barcodesScanned"]]);
});

test("native spike hides the whole WebView body without masking the camera preview", () => {
  const css = fs.readFileSync(
    path.join(repositoryRoot, "src", "native-barcode-scanner-spike.css"),
    "utf8"
  );

  assert.match(
    css,
    /body\.phrona-native-scanner-spike-active\s*\{\s*visibility:\s*hidden;/
  );
  assert.match(
    css,
    /body\.phrona-native-scanner-spike-active \.phrona-native-scanner-spike\s*\{[\s\S]*?visibility:\s*visible !important;/
  );
  assert.doesNotMatch(css, /9999px/);
});

test("native spike overrides the more specific dark One UI body background", () => {
  const css = fs.readFileSync(
    path.join(repositoryRoot, "src", "native-barcode-scanner-spike.css"),
    "utf8"
  );

  assert.match(
    css,
    /html\.phrona-native-scanner-spike-active body\.phrona-native-scanner-spike-active\s*\{[\s\S]*?background-color:\s*transparent !important;[\s\S]*?background-image:\s*none !important;/
  );
});
