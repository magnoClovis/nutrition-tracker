import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner as MlKitBarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

/**
 * Small injectable boundary around the Android-only App plugin behavior.
 */
export function createAndroidAppRuntime({
  appPlugin,
  appSettingsPlugin,
  isNativeAndroid,
}) {
  if (!appPlugin || typeof appPlugin.addListener !== 'function'
    || typeof appPlugin.minimizeApp !== 'function') {
    throw new TypeError('Android app runtime requires the Capacitor App plugin');
  }
  if (typeof isNativeAndroid !== 'function') {
    throw new TypeError('Android app runtime requires an environment detector');
  }

  async function addBackButtonListener(listener) {
    if (!isNativeAndroid()) return () => {};
    const handle = await appPlugin.addListener('backButton', listener);
    return () => handle.remove();
  }

  async function addAppStateListener(listener) {
    if (!isNativeAndroid()) return () => {};
    const handle = await appPlugin.addListener('appStateChange', listener);
    return () => handle.remove();
  }

  async function minimize() {
    if (isNativeAndroid()) await appPlugin.minimizeApp();
  }

  async function openSettings() {
    if (!isNativeAndroid() || typeof appSettingsPlugin?.openSettings !== 'function') return false;
    await appSettingsPlugin.openSettings();
    return true;
  }

  return {
    isAvailable: isNativeAndroid,
    canOpenSettings: () => isNativeAndroid() && typeof appSettingsPlugin?.openSettings === 'function',
    addBackButtonListener,
    addAppStateListener,
    minimize,
    openSettings,
  };
}

const isNativeAndroid = () => (
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
);

export const androidAppRuntime = createAndroidAppRuntime({
  appPlugin: CapacitorApp,
  appSettingsPlugin: MlKitBarcodeScanner,
  isNativeAndroid,
});
