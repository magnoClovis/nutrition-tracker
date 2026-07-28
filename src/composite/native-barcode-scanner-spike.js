/**
 * Creates the isolated native barcode-scanner spike.
 *
 * The injected plugin is the only dependency that can reach the native camera.
 * This module deliberately has no product lookup or persistence dependency.
 */
export function createNativeBarcodeScannerSpike({
  barcodeScanner,
  formats,
  isNativeAndroid,
}) {
  if (!barcodeScanner || typeof barcodeScanner.startScan !== 'function') {
    throw new TypeError('Native barcode spike requires a barcode scanner plugin');
  }
  if (!Array.isArray(formats) || formats.length === 0) {
    throw new TypeError('Native barcode spike requires at least one barcode format');
  }
  if (typeof isNativeAndroid !== 'function') {
    throw new TypeError('Native barcode spike requires an Android environment detector');
  }

  let active = false;
  let sessionId = 0;
  let listenerHandles = [];

  async function removeListeners() {
    const handles = listenerHandles;
    listenerHandles = [];
    await Promise.allSettled(handles.map(handle => handle.remove()));
  }

  async function stop() {
    sessionId += 1;
    const shouldStopNativeScan = active;
    active = false;
    await removeListeners();
    if (shouldStopNativeScan) {
      await barcodeScanner.stopScan();
    }
  }

  async function start({ onDetected, onError }) {
    if (!isNativeAndroid()) {
      throw new Error('The native barcode spike is available only on Capacitor Android');
    }
    if (typeof onDetected !== 'function' || typeof onError !== 'function') {
      throw new TypeError('Native barcode spike requires result and error callbacks');
    }

    await stop();
    const currentSessionId = sessionId;
    let resultClaimed = false;

    try {
      const scannedHandle = await barcodeScanner.addListener('barcodesScanned', event => {
        if (currentSessionId !== sessionId || resultClaimed) return;
        const barcode = event?.barcodes?.find(item => item?.rawValue || item?.displayValue);
        if (!barcode) return;

        resultClaimed = true;
        const code = String(barcode.rawValue || barcode.displayValue);
        void stop()
          .then(() => onDetected({ code, format: barcode.format || 'UNKNOWN' }))
          .catch(error => onError(error));
      });
      listenerHandles.push(scannedHandle);

      const errorHandle = await barcodeScanner.addListener('scanError', event => {
        if (currentSessionId !== sessionId || resultClaimed) return;
        resultClaimed = true;
        const error = new Error(event?.message || 'Native scanner reported an unknown error');
        void stop()
          .then(() => onError(error))
          .catch(stopError => onError(stopError));
      });
      listenerHandles.push(errorHandle);

      active = true;
      await barcodeScanner.startScan({ formats });
    } catch (error) {
      await stop();
      throw error;
    }
  }

  return {
    isAvailable: () => isNativeAndroid(),
    isActive: () => active,
    checkPermissions: () => barcodeScanner.checkPermissions(),
    requestPermissions: () => barcodeScanner.requestPermissions(),
    isSupported: () => barcodeScanner.isSupported(),
    isTorchAvailable: () => barcodeScanner.isTorchAvailable(),
    isTorchEnabled: () => barcodeScanner.isTorchEnabled(),
    toggleTorch: () => barcodeScanner.toggleTorch(),
    openSettings: () => barcodeScanner.openSettings(),
    start,
    stop,
  };
}
