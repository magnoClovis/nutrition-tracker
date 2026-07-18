/**
 * Native BarcodeDetector and ZXing fallback camera-scanner controller.
 *
 * The UMD module exposes a `createBarcodeScanner` factory. The React host
 * injects its stable refs, state callbacks, localized messages, and the
 * `lookupBarcode(code)` callback that continues to own Open Food Facts and UI
 * behavior. Browser camera, DOM, timing, animation-frame, BarcodeDetector, and
 * ZXing globals enter through explicit environmental dependencies.
 *
 * KNOWN BEHAVIOR DELIBERATELY PRESERVED:
 * - feature selection only tests `"BarcodeDetector" in windowObject`; native
 *   construction/runtime failures do not fall back to ZXing;
 * - both zero-delay video setup paths can return without cleanup when the video
 *   is absent, leaving active flags and (for native scanning) the stream open;
 * - native detection stops scheduling frames after the first code even when
 *   product lookup fails and leaves the stream open;
 * - `windowObject.ZXingBrowser || windowObject.ZXing` short-circuits before API
 *   validation; four async CDN scripts have no timeout and are never removed;
 * - the fallback-library Promise belongs to this factory instance. Because the
 *   React host creates the factory on every render, it is intentionally not a
 *   stable cross-render cache and duplicate script loading remains possible;
 * - cancellation uses the shared scan flag and manual controls only; animation
 *   frame IDs and pending promises are not cancelled.
 *
 * @module BarcodeScanner
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BarcodeScanner = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const ZXING_CDN_URLS = [
    "https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/index.min.js",
    "https://unpkg.com/@zxing/browser@0.1.5/umd/index.min.js",
    "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js",
    "https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js"
  ];

  /**
   * Creates a barcode-scanner controller for one React render.
   *
   * @param {Object} dependencies Explicit environment, refs, and host callbacks.
   * @param {Object} dependencies.windowObject Window-like object containing BarcodeDetector/ZXing globals.
   * @param {Object} dependencies.navigatorObject Navigator-like object containing mediaDevices.
   * @param {Object} dependencies.documentObject Document-like script creation and head APIs.
   * @param {function(function(),number): *} dependencies.setTimeoutFn Existing timer service.
   * @param {function(function()): *} dependencies.requestAnimationFrameFn Existing animation-frame service.
   * @param {Object} dependencies.refs Shared video, stream, reader, controls, and scan refs.
   * @param {function(boolean): void} dependencies.setScanning Updates the React scanning state.
   * @param {function(string): void} dependencies.setMessage Updates the localized scanner message.
   * @param {function(string): void} dependencies.setInput Updates the detected barcode input.
   * @param {function(string): Promise<*>} dependencies.lookupBarcode Existing React/Open Food Facts callback.
   * @param {Object<string,string>} dependencies.messages Already-localized scanner messages.
   * @returns {Object} Start, stop, native/fallback, and fallback-loader controller operations.
   */
  function createBarcodeScanner({
    windowObject,
    navigatorObject,
    documentObject,
    setTimeoutFn,
    requestAnimationFrameFn,
    refs,
    setScanning,
    setMessage,
    setInput,
    lookupBarcode,
    messages
  }) {
    if (!windowObject || !navigatorObject || !documentObject ||
        typeof setTimeoutFn !== "function" || typeof requestAnimationFrameFn !== "function" ||
        !refs || typeof setScanning !== "function" || typeof setMessage !== "function" ||
        typeof setInput !== "function" || typeof lookupBarcode !== "function" || !messages) {
      throw new TypeError("BarcodeScanner requires environment, refs, callbacks, and messages");
    }

    const {
      videoRef,
      streamRef,
      readerRef,
      controlsRef,
      scanRef
    } = refs;

    let barcodeLibPromise = null;

    /**
     * Stops native tracks and ZXing controls using the existing shared refs.
     *
     * @returns {void}
     */
    function stopBarcodeScanner() {
      scanRef.current = false;
      if (controlsRef.current && typeof controlsRef.current.stop === "function") {
        try { controlsRef.current.stop(); } catch (_) {}
        controlsRef.current = null;
      }
      if (readerRef.current && typeof readerRef.current.reset === "function") {
        try { readerRef.current.reset(); } catch (_) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setScanning(false);
    }

    /**
     * Loads the first recognized ZXing global through the existing four-CDN sequence.
     *
     * @returns {Promise<Object>} Recognized ZXing browser/library global.
     */
    function loadBarcodeFallbackLibrary() {
      const getLoaded = () => {
        const lib = windowObject.ZXingBrowser || windowObject.ZXing;
        if (lib && (lib.BrowserMultiFormatReader || lib.BrowserBarcodeReader)) return lib;
        return null;
      };
      const loaded = getLoaded();
      if (loaded) return Promise.resolve(loaded);
      if (barcodeLibPromise) return barcodeLibPromise;
      const urls = [...ZXING_CDN_URLS];
      barcodeLibPromise = new Promise((resolve, reject) => {
        let idx = 0;
        const tryNext = () => {
          const current = getLoaded();
          if (current) return resolve(current);
          if (idx >= urls.length) return reject(new Error("ZXing unavailable"));
          const script = documentObject.createElement("script");
          script.src = urls[idx++];
          script.async = true;
          script.onload = () => {
            const lib = getLoaded();
            lib ? resolve(lib) : tryNext();
          };
          script.onerror = tryNext;
          documentObject.head.appendChild(script);
        };
        tryNext();
      });
      return barcodeLibPromise;
    }

    /**
     * Starts the native BarcodeDetector loop with the historical formats and timing.
     *
     * @returns {Promise<void>} Resolves after the stream and zero-delay setup are scheduled.
     */
    async function startNativeBarcodeScanner() {
      const detector = new windowObject.BarcodeDetector({formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"]});
      const stream = await navigatorObject.mediaDevices.getUserMedia({video: {facingMode: "environment"}, audio: false});
      streamRef.current = stream;
      scanRef.current = true;
      setScanning(true);
      setTimeoutFn(async () => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch (_) {}
        const scan = async () => {
          if (!scanRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length) {
              const code = codes[0].rawValue;
              setInput(code);
              await lookupBarcode(code);
              return;
            }
          } catch (_) {}
          if (scanRef.current) requestAnimationFrameFn(scan);
        };
        scan();
      }, 0);
    }

    /**
     * Starts the dynamically loaded ZXing scanner with its existing API fallbacks.
     *
     * @returns {Promise<void>} Resolves after the zero-delay reader setup is scheduled.
     */
    async function startFallbackBarcodeScanner() {
      setMessage(messages.loadingCompatible);
      const lib = await loadBarcodeFallbackLibrary();
      const Reader = lib.BrowserMultiFormatReader || lib.BrowserBarcodeReader;
      if (!Reader) throw new Error("ZXing reader unavailable");
      const reader = new Reader();
      readerRef.current = reader;
      scanRef.current = true;
      setScanning(true);
      setMessage(messages.pointCamera);
      setTimeoutFn(async () => {
        if (!videoRef.current || !scanRef.current) return;
        try {
          if (typeof reader.decodeFromVideoDevice === "function") {
            const maybeControls = await reader.decodeFromVideoDevice(null, videoRef.current, async (result, err, controls) => {
              if (controls && !controlsRef.current) controlsRef.current = controls;
              if (!result || !scanRef.current) return;
              const code = typeof result.getText === "function" ? result.getText() : (result.text || result.rawValue || String(result));
              if (!code) return;
              setInput(code);
              if (controls && typeof controls.stop === "function") {
                try { controls.stop(); } catch (_) {}
              }
              await lookupBarcode(code);
            });
            if (maybeControls && typeof maybeControls.stop === "function") controlsRef.current = maybeControls;
          } else if (typeof reader.decodeOnceFromVideoDevice === "function") {
            const result = await reader.decodeOnceFromVideoDevice(null, videoRef.current);
            const code = typeof result.getText === "function" ? result.getText() : (result.text || result.rawValue || String(result));
            setInput(code);
            await lookupBarcode(code);
          } else {
            throw new Error("ZXing video API unavailable");
          }
        } catch (e) {
          stopBarcodeScanner();
          setMessage(messages.fallbackFailed);
        }
      }, 0);
    }

    /**
     * Selects the native or fallback scanner through the existing feature test.
     *
     * @returns {Promise<void>} Resolves after scanner startup or its existing localized failure handling.
     */
    async function startBarcodeScanner() {
      if (!navigatorObject.mediaDevices || !navigatorObject.mediaDevices.getUserMedia) {
        setMessage(messages.cameraUnavailable);
        return;
      }
      stopBarcodeScanner();
      setMessage(messages.pointCamera);
      try {
        if ("BarcodeDetector" in windowObject) await startNativeBarcodeScanner();
        else await startFallbackBarcodeScanner();
      } catch (e) {
        stopBarcodeScanner();
        setMessage(messages.startFailed);
      }
    }

    return {
      stopBarcodeScanner,
      loadBarcodeFallbackLibrary,
      startNativeBarcodeScanner,
      startFallbackBarcodeScanner,
      startBarcodeScanner
    };
  }

  return { createBarcodeScanner, ZXING_CDN_URLS };
});

