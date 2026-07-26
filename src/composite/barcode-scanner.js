import '../../barcode-scanner.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createBarcodeScanner, ZXING_CDN_URLS } = readLegacyNamespace(
  globalThis,
  'BarcodeScanner',
  ['createBarcodeScanner', 'ZXING_CDN_URLS'],
);

export { createBarcodeScanner, ZXING_CDN_URLS };
