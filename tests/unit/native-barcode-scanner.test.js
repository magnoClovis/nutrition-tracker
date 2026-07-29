const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..", "..");

async function loadFactory() {
  return import("../../src/composite/native-barcode-scanner.js");
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

test("native scanner is unavailable outside Capacitor Android", async () => {
  const { createNativeBarcodeScanner } = await loadFactory();
  const fixture = createPluginFixture();
  const scanner = createNativeBarcodeScanner({
    barcodeScanner: fixture.plugin,
    formats: ["EAN_13"],
    isNativeAndroid: () => false
  });

  assert.equal(scanner.isAvailable(), false);
  await assert.rejects(
    scanner.start({ onDetected() {}, onError() {} }),
    /available only on Capacitor Android/
  );
  assert.deepEqual(fixture.calls, []);
});

test("native scanner forwards permission and hardware checks through injected plugin", async () => {
  const { createNativeBarcodeScanner } = await loadFactory();
  const fixture = createPluginFixture();
  const scanner = createNativeBarcodeScanner({
    barcodeScanner: fixture.plugin,
    formats: ["EAN_13"],
    isNativeAndroid: () => true
  });

  assert.deepEqual(await scanner.checkPermissions(), { camera: "prompt" });
  assert.deepEqual(await scanner.requestPermissions(), { camera: "granted" });
  assert.deepEqual(await scanner.isSupported(), { supported: true });
  await scanner.toggleTorch();
  await scanner.openSettings();

  assert.deepEqual(fixture.calls, [
    ["checkPermissions"],
    ["requestPermissions"],
    ["isSupported"],
    ["toggleTorch"],
    ["openSettings"]
  ]);
});

test("native scanner accepts one result and stops before delivering it", async () => {
  const { createNativeBarcodeScanner } = await loadFactory();
  const fixture = createPluginFixture();
  const detected = [];
  const errors = [];
  const scanner = createNativeBarcodeScanner({
    barcodeScanner: fixture.plugin,
    formats: ["EAN_13", "UPC_A"],
    isNativeAndroid: () => true
  });

  await scanner.start({
    onDetected: result => {
      fixture.calls.push(["delivered"]);
      detected.push(result);
    },
    onError: error => errors.push(error)
  });
  assert.equal(scanner.isActive(), true);
  assert.deepEqual(fixture.calls[0], ["start", { formats: ["EAN_13", "UPC_A"] }]);

  fixture.listeners.get("barcodesScanned")({
    barcodes: [{ rawValue: "7891234567895", format: "EAN_13" }]
  });
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(detected, [{ code: "7891234567895", format: "EAN_13" }]);
  assert.deepEqual(errors, []);
  assert.equal(scanner.isActive(), false);
  assert.equal(fixture.calls.filter(call => call[0] === "stop").length, 1);
  assert.ok(
    fixture.calls.findIndex(call => call[0] === "stop")
      < fixture.calls.findIndex(call => call[0] === "delivered"),
  );
});

test("native scanner cancellation removes listeners and is idempotent", async () => {
  const { createNativeBarcodeScanner } = await loadFactory();
  const fixture = createPluginFixture();
  const scanner = createNativeBarcodeScanner({
    barcodeScanner: fixture.plugin,
    formats: ["EAN_8"],
    isNativeAndroid: () => true
  });

  await scanner.start({ onDetected() {}, onError() {} });
  await scanner.stop();
  await scanner.stop();

  assert.equal(fixture.calls.filter(call => call[0] === "stop").length, 1);
  assert.equal(fixture.calls.filter(call => call[0] === "remove").length, 2);
  assert.equal(fixture.listeners.size, 0);
});

test("native scanner cleans up when listener registration fails", async () => {
  const { createNativeBarcodeScanner } = await loadFactory();
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
  const scanner = createNativeBarcodeScanner({
    barcodeScanner: fixture.plugin,
    formats: ["EAN_13"],
    isNativeAndroid: () => true
  });

  await assert.rejects(
    scanner.start({ onDetected() {}, onError() {} }),
    /listener unavailable/
  );

  assert.equal(scanner.isActive(), false);
  assert.deepEqual(fixture.calls, [["remove", "barcodesScanned"]]);
});

test("native flow hides the WebView body without masking the real scanner controls", () => {
  const css = fs.readFileSync(
    path.join(repositoryRoot, "src", "native-barcode-scanner.css"),
    "utf8"
  );

  assert.match(
    css,
    /body\.phrona-native-barcode-scanner-active\s*\{\s*visibility:\s*hidden;/
  );
  assert.match(
    css,
    /body\.phrona-native-barcode-scanner-active \.phrona-native-barcode-scanner-flow\s*\{[\s\S]*?visibility:\s*visible !important;/
  );
  assert.doesNotMatch(css, /9999px/);
});

test("native flow overrides the more specific dark One UI body background", () => {
  const css = fs.readFileSync(
    path.join(repositoryRoot, "src", "native-barcode-scanner.css"),
    "utf8"
  );

  assert.match(
    css,
    /html\.phrona-native-barcode-scanner-active body\.phrona-native-barcode-scanner-active\s*\{[\s\S]*?background-color:\s*transparent !important;[\s\S]*?background-image:\s*none !important;/
  );
});
