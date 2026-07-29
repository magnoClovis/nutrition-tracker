import { Capacitor } from '@capacitor/core';
import {
  BarcodeFormat,
  BarcodeScanner as MlKitBarcodeScanner,
} from '@capacitor-mlkit/barcode-scanning';
import * as WebBarcodeScanner from './barcode-scanner.js';
import { createBarcodeScannerAdapter } from './barcode-scanner-adapter.js';
import { createNativeBarcodeScanner } from './native-barcode-scanner.js';

const isNativeAndroid = () => (
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
);

const nativeBarcodeScanner = createNativeBarcodeScanner({
  barcodeScanner: MlKitBarcodeScanner,
  formats: [
    BarcodeFormat.Ean13,
    BarcodeFormat.Ean8,
    BarcodeFormat.UpcA,
    BarcodeFormat.UpcE,
    BarcodeFormat.Code128,
  ],
  isNativeAndroid,
});

const runtimeBarcodeScanner = createBarcodeScannerAdapter({
  webBarcodeScanner: WebBarcodeScanner,
  nativeBarcodeScanner,
  isNativeAndroid,
  documentObject: document,
});

export const createBarcodeScanner = runtimeBarcodeScanner.createBarcodeScanner;
export const ZXING_CDN_URLS = runtimeBarcodeScanner.ZXING_CDN_URLS;
