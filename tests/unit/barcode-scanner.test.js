const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createBarcodeScanner,
  ZXING_CDN_URLS
} = require("../../barcode-scanner.js");

const MESSAGES = {
  loadingCompatible: "loading-compatible",
  pointCamera: "point-camera",
  fallbackFailed: "fallback-failed",
  cameraUnavailable: "camera-unavailable",
  startFailed: "start-failed"
};

function createFixture(overrides = {}) {
  const timers = [];
  const frames = [];
  const messages = [];
  const scanning = [];
  const inputs = [];
  const lookups = [];
  const scripts = [];
  const trackStops = [];
  const refs = {
    videoRef: { current: overrides.video === undefined ? { play: async () => {} } : overrides.video },
    streamRef: { current: overrides.stream || null },
    readerRef: { current: overrides.reader || null },
    controlsRef: { current: overrides.controls || null },
    scanRef: { current: overrides.scanActive || false }
  };
  const stream = overrides.cameraStream || {
    getTracks: () => [{ stop: () => trackStops.push("camera") }]
  };
  const windowObject = overrides.windowObject || {};
  const navigatorObject = overrides.navigatorObject || {
    mediaDevices: {
      getUserMedia: async constraints => {
        fixture.constraints = constraints;
        return stream;
      }
    }
  };
  const documentObject = overrides.documentObject || {
    createElement(type) {
      assert.equal(type, "script");
      return {};
    },
    head: {
      appendChild(script) {
        scripts.push(script);
        if (overrides.onAppendScript) overrides.onAppendScript(script);
      }
    }
  };
  const fixture = {
    timers,
    frames,
    messages,
    scanning,
    inputs,
    lookups,
    scripts,
    trackStops,
    refs,
    stream,
    windowObject,
    navigatorObject,
    documentObject,
    constraints: null
  };
  fixture.api = createBarcodeScanner({
    windowObject,
    navigatorObject,
    documentObject,
    setTimeoutFn(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
    requestAnimationFrameFn(callback) {
      frames.push(callback);
      return frames.length;
    },
    refs,
    setScanning(value) { scanning.push(value); },
    setMessage(value) { messages.push(value); },
    setInput(value) { inputs.push(value); },
    async lookupBarcode(code) {
      lookups.push(code);
      if (overrides.lookupError) throw overrides.lookupError;
      return overrides.lookupResult;
    },
    messages: MESSAGES
  });
  return fixture;
}

async function flushAsyncWork() {
  await new Promise(resolve => setImmediate(resolve));
}

test("detects through native BarcodeDetector with the exact formats and camera constraints", async () => {
  let detectorOptions;
  const fixture = createFixture({
    windowObject: {
      BarcodeDetector: class {
        constructor(options) { detectorOptions = options; }
        async detect() { return [{ rawValue: "7891234567890" }]; }
      }
    }
  });

  await fixture.api.startBarcodeScanner();
  assert.deepEqual(detectorOptions, {
    formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"]
  });
  assert.deepEqual(fixture.constraints, {
    video: { facingMode: "environment" },
    audio: false
  });
  assert.equal(fixture.timers.length, 1);
  assert.equal(fixture.timers[0].delay, 0);

  await fixture.timers[0].callback();
  await flushAsyncWork();

  assert.equal(fixture.refs.videoRef.current.srcObject, fixture.stream);
  assert.deepEqual(fixture.inputs, ["7891234567890"]);
  assert.deepEqual(fixture.lookups, ["7891234567890"]);
  assert.equal(fixture.frames.length, 0);
});

test("uses the ZXing fallback when BarcodeDetector is absent", async () => {
  let decodeCalls = 0;
  class Reader {
    async decodeOnceFromVideoDevice(deviceId, video) {
      decodeCalls += 1;
      assert.equal(deviceId, null);
      assert.ok(video);
      return { getText: () => "4006381333931" };
    }
  }
  const fixture = createFixture({
    windowObject: { ZXingBrowser: { BrowserMultiFormatReader: Reader } }
  });

  await fixture.api.startBarcodeScanner();
  assert.deepEqual(fixture.messages, [
    MESSAGES.pointCamera,
    MESSAGES.loadingCompatible,
    MESSAGES.pointCamera
  ]);
  await fixture.timers[0].callback();
  await flushAsyncWork();

  assert.equal(decodeCalls, 1);
  assert.deepEqual(fixture.inputs, ["4006381333931"]);
  assert.deepEqual(fixture.lookups, ["4006381333931"]);
});

test("tries all four ZXing CDNs in order and rejects when none load", async () => {
  const fixture = createFixture({
    onAppendScript(script) {
      script.onerror();
    }
  });

  await assert.rejects(
    fixture.api.loadBarcodeFallbackLibrary(),
    /ZXing unavailable/
  );
  assert.deepEqual(fixture.scripts.map(script => script.src), ZXING_CDN_URLS);
  assert.ok(fixture.scripts.every(script => script.async === true));
  assert.equal(fixture.scripts.length, 4);
});

test("preserves the ZXingBrowser short-circuit even when window.ZXing is usable", async () => {
  class ValidReader {}
  const fixture = createFixture({
    windowObject: {
      ZXingBrowser: {},
      ZXing: { BrowserMultiFormatReader: ValidReader }
    },
    onAppendScript(script) {
      script.onerror();
    }
  });

  await assert.rejects(
    fixture.api.loadBarcodeFallbackLibrary(),
    /ZXing unavailable/
  );
  assert.deepEqual(fixture.scripts.map(script => script.src), ZXING_CDN_URLS);
});

test("leaves the native stream and active flags untouched when video is absent after timeout zero", async () => {
  const fixture = createFixture({
    video: null,
    windowObject: {
      BarcodeDetector: class {
        async detect() { return []; }
      }
    }
  });

  await fixture.api.startBarcodeScanner();
  await fixture.timers[0].callback();

  assert.equal(fixture.refs.streamRef.current, fixture.stream);
  assert.equal(fixture.refs.scanRef.current, true);
  assert.equal(fixture.scanning.at(-1), true);
  assert.deepEqual(fixture.trackStops, []);
  assert.equal(fixture.frames.length, 0);
});

test("does not fall back to ZXing when the native constructor fails", async () => {
  let fallbackReaderConstructions = 0;
  class FallbackReader {
    constructor() { fallbackReaderConstructions += 1; }
  }
  const fixture = createFixture({
    windowObject: {
      BarcodeDetector: class {
        constructor() { throw new Error("native unsupported"); }
      },
      ZXingBrowser: { BrowserMultiFormatReader: FallbackReader }
    }
  });

  await fixture.api.startBarcodeScanner();

  assert.equal(fallbackReaderConstructions, 0);
  assert.equal(fixture.messages.at(-1), MESSAGES.startFailed);
  assert.equal(fixture.scanning.at(-1), false);
});

test("manual stop ends controls, reader and tracks without clearing reader or video srcObject", () => {
  const calls = [];
  const video = { srcObject: { existing: true } };
  const reader = { reset: () => calls.push("reset") };
  const controls = { stop: () => calls.push("controls") };
  const stream = {
    getTracks: () => [
      { stop: () => calls.push("track-1") },
      { stop: () => calls.push("track-2") }
    ]
  };
  const fixture = createFixture({
    video,
    reader,
    controls,
    stream,
    scanActive: true
  });

  fixture.api.stopBarcodeScanner();

  assert.deepEqual(calls, ["controls", "reset", "track-1", "track-2"]);
  assert.equal(fixture.refs.scanRef.current, false);
  assert.equal(fixture.refs.controlsRef.current, null);
  assert.equal(fixture.refs.streamRef.current, null);
  assert.equal(fixture.refs.readerRef.current, reader);
  assert.deepEqual(fixture.refs.videoRef.current.srcObject, { existing: true });
  assert.equal(fixture.scanning.at(-1), false);
});

