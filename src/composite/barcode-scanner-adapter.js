const GRANTED_CAMERA_PERMISSIONS = new Set(['granted', 'limited']);

/**
 * Creates the runtime barcode-scanner facade used by NutritionTracker.
 *
 * The browser implementation is returned untouched outside Capacitor Android.
 * On Android, this facade preserves the existing controller callback contract
 * while replacing only the code-capture mechanism.
 */
export function createBarcodeScannerAdapter({
  webBarcodeScanner,
  nativeBarcodeScanner,
  isNativeAndroid,
  documentObject,
}) {
  if (!webBarcodeScanner || typeof webBarcodeScanner.createBarcodeScanner !== 'function') {
    throw new TypeError('Barcode scanner adapter requires the web scanner facade');
  }
  if (!nativeBarcodeScanner || typeof nativeBarcodeScanner.start !== 'function') {
    throw new TypeError('Barcode scanner adapter requires the native scanner service');
  }
  if (typeof isNativeAndroid !== 'function' || !documentObject) {
    throw new TypeError('Barcode scanner adapter requires environment dependencies');
  }

  let launchId = 0;
  let activePanel = null;
  let visibilityHandler = null;

  function deactivateCameraSurface() {
    if (visibilityHandler) {
      documentObject.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
    activePanel?.classList.remove('phrona-native-barcode-scanner-flow');
    activePanel = null;
    documentObject.documentElement.classList.remove('phrona-native-barcode-scanner-active');
    documentObject.body.classList.remove('phrona-native-barcode-scanner-active');
  }

  function activateCameraSurface(videoElement, onBackground) {
    const panel = videoElement?.parentElement;
    if (!panel) {
      throw new Error('The barcode scanner surface is not mounted');
    }

    deactivateCameraSurface();
    activePanel = panel;
    activePanel.classList.add('phrona-native-barcode-scanner-flow');
    documentObject.documentElement.classList.add('phrona-native-barcode-scanner-active');
    documentObject.body.classList.add('phrona-native-barcode-scanner-active');
    visibilityHandler = () => {
      if (documentObject.hidden) onBackground();
    };
    documentObject.addEventListener('visibilitychange', visibilityHandler);
  }

  function createNativeController({
    refs,
    setScanning,
    setMessage,
    setInput,
    lookupBarcode,
    setTorchAvailable = () => {},
    setTorchEnabled = () => {},
    messages,
  }) {
    if (!refs?.videoRef || typeof setScanning !== 'function'
      || typeof setMessage !== 'function' || typeof setInput !== 'function'
      || typeof lookupBarcode !== 'function' || !messages) {
      throw new TypeError('Native barcode controller requires refs, callbacks, and messages');
    }

    function resetPresentation() {
      deactivateCameraSurface();
      setScanning(false);
      setTorchAvailable(false);
      setTorchEnabled(false);
    }

    function stopBarcodeScanner() {
      launchId += 1;
      resetPresentation();
      return nativeBarcodeScanner.stop();
    }

    async function failStart(currentLaunchId) {
      if (currentLaunchId !== launchId) return;
      resetPresentation();
      setMessage(messages.startFailed);
      await nativeBarcodeScanner.stop();
    }

    async function startBarcodeScanner() {
      const currentLaunchId = ++launchId;
      resetPresentation();
      setMessage(messages.pointCamera);
      await nativeBarcodeScanner.stop();

      try {
        const support = await nativeBarcodeScanner.isSupported();
        if (currentLaunchId !== launchId) return;
        if (!support?.supported) {
          await failStart(currentLaunchId);
          return;
        }

        let permission = await nativeBarcodeScanner.checkPermissions();
        if (currentLaunchId !== launchId) return;
        if (!GRANTED_CAMERA_PERMISSIONS.has(permission?.camera)) {
          if (permission?.camera === 'denied') {
            await failStart(currentLaunchId);
            return;
          }
          permission = await nativeBarcodeScanner.requestPermissions();
          if (currentLaunchId !== launchId) return;
        }
        if (!GRANTED_CAMERA_PERMISSIONS.has(permission?.camera)) {
          await failStart(currentLaunchId);
          return;
        }

        activateCameraSurface(refs.videoRef.current, () => {
          void stopBarcodeScanner();
        });
        setScanning(true);

        await nativeBarcodeScanner.start({
          onDetected({ code }) {
            if (currentLaunchId !== launchId) return;
            launchId += 1;
            resetPresentation();
            setInput(code);
            void Promise.resolve(lookupBarcode(code));
          },
          onError() {
            if (currentLaunchId !== launchId) return;
            launchId += 1;
            resetPresentation();
            setMessage(messages.startFailed);
          },
        });
        if (currentLaunchId !== launchId) return;

        const torch = await nativeBarcodeScanner.isTorchAvailable();
        if (currentLaunchId === launchId) {
          setTorchAvailable(Boolean(torch?.available));
        }
      } catch (_) {
        await failStart(currentLaunchId);
      }
    }

    async function toggleBarcodeTorch() {
      if (!nativeBarcodeScanner.isActive()) return;
      try {
        await nativeBarcodeScanner.toggleTorch();
        const status = await nativeBarcodeScanner.isTorchEnabled();
        setTorchEnabled(Boolean(status?.enabled));
      } catch (_) {
        setTorchEnabled(false);
      }
    }

    return {
      startBarcodeScanner,
      stopBarcodeScanner,
      toggleBarcodeTorch,
    };
  }

  function createBarcodeScanner(dependencies) {
    if (!isNativeAndroid()) {
      return webBarcodeScanner.createBarcodeScanner(dependencies);
    }
    return createNativeController(dependencies);
  }

  return {
    createBarcodeScanner,
    ZXING_CDN_URLS: webBarcodeScanner.ZXING_CDN_URLS,
  };
}
