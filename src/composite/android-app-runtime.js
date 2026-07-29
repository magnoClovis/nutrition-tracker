import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Small injectable boundary around the Android-only App plugin behavior.
 */
export function createAndroidAppRuntime({
  appPlugin,
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

  async function minimize() {
    if (isNativeAndroid()) await appPlugin.minimizeApp();
  }

  return {
    isAvailable: isNativeAndroid,
    addBackButtonListener,
    minimize,
  };
}

const isNativeAndroid = () => (
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
);

export const androidAppRuntime = createAndroidAppRuntime({
  appPlugin: CapacitorApp,
  isNativeAndroid,
});
