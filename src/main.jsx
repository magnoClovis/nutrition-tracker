import React from 'react';
import { Capacitor } from '@capacitor/core';
import {
  BarcodeFormat,
  BarcodeScanner,
} from '@capacitor-mlkit/barcode-scanning';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { createNativeBarcodeScannerSpikePanel } from './components/native-barcode-scanner-spike.jsx';
import { createNativeBarcodeScannerSpike } from './composite/native-barcode-scanner-spike.js';
import './native-barcode-scanner-spike.css';

const root = createRoot(document.getElementById('root'));
const nativeBarcodeScannerSpike = createNativeBarcodeScannerSpike({
  barcodeScanner: BarcodeScanner,
  formats: [
    BarcodeFormat.Ean13,
    BarcodeFormat.Ean8,
    BarcodeFormat.UpcA,
    BarcodeFormat.UpcE,
    BarcodeFormat.Code128,
  ],
  isNativeAndroid: () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android',
});
const NativeBarcodeScannerSpikePanel = createNativeBarcodeScannerSpikePanel({
  React,
  scanner: nativeBarcodeScannerSpike,
  documentObject: document,
});

root.render(
  <>
    <App />
    <NativeBarcodeScannerSpikePanel />
  </>,
);
