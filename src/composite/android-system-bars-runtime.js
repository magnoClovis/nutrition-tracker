import {
  Capacitor,
  SystemBars,
  SystemBarsStyle,
  SystemBarType,
} from '@capacitor/core';

/**
 * Injectable boundary for the Android status bar appearance.
 */
export function createAndroidSystemBarsRuntime({
  systemBarsPlugin,
  isNativeAndroid,
  styles,
  statusBar,
}) {
  if (!systemBarsPlugin || typeof systemBarsPlugin.setStyle !== 'function') {
    throw new TypeError('Android system bars runtime requires the SystemBars plugin');
  }
  if (typeof isNativeAndroid !== 'function') {
    throw new TypeError('Android system bars runtime requires an environment detector');
  }

  async function applyTheme(theme) {
    if (!isNativeAndroid()) return;

    await systemBarsPlugin.setStyle({
      style: theme === 'dark' ? styles.dark : styles.light,
      bar: statusBar,
    });
  }

  return {
    isAvailable: isNativeAndroid,
    applyTheme,
  };
}

/**
 * Keeps the native status-bar icons aligned with every theme writer, including
 * the standalone login screen.
 */
export function observeSystemBarsTheme({
  rootElement,
  runtime,
  createObserver,
  onError = () => {},
}) {
  if (!rootElement || !rootElement.dataset) {
    throw new TypeError('System bars theme observer requires the document root');
  }
  if (!runtime || typeof runtime.applyTheme !== 'function') {
    throw new TypeError('System bars theme observer requires a runtime');
  }
  if (typeof createObserver !== 'function') {
    throw new TypeError('System bars theme observer requires an observer factory');
  }

  const sync = () => {
    Promise.resolve(runtime.applyTheme(rootElement.dataset.theme))
      .catch(onError);
  };
  const observer = createObserver(sync);

  sync();
  observer.observe(rootElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  return () => observer.disconnect();
}

const isNativeAndroid = () => (
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
);

export const androidSystemBarsRuntime = createAndroidSystemBarsRuntime({
  systemBarsPlugin: SystemBars,
  isNativeAndroid,
  styles: {
    dark: SystemBarsStyle.Dark,
    light: SystemBarsStyle.Light,
  },
  statusBar: SystemBarType.StatusBar,
});
