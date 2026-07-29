import { Capacitor } from '@capacitor/core';
import {
  Directory,
  Encoding,
  Filesystem,
} from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  createFileExportAdapter,
  createNativeFileExporter,
  createWebFileExporter,
} from './file-export-adapter.js';

const isNativeAndroid = () => (
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
);

const webExportFile = createWebFileExporter({
  documentObject: document,
  BlobCtor: Blob,
  URLObject: URL,
  setTimeoutFn: window.setTimeout.bind(window),
});

const nativeExportFile = createNativeFileExporter({
  filesystem: Filesystem,
  share: Share,
  cacheDirectory: Directory.Cache,
  utf8Encoding: Encoding.UTF8,
});

const fileExportAdapter = createFileExportAdapter({
  isNativeAndroid,
  webExportFile,
  nativeExportFile,
});

export const exportFile = fileExportAdapter.exportFile;
