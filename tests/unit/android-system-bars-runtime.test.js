const test = require('node:test');
const assert = require('node:assert/strict');

async function loadRuntime() {
  return import('../../src/composite/android-system-bars-runtime.js');
}

test('Android system bars runtime is inert outside native Android', async () => {
  const { createAndroidSystemBarsRuntime } = await loadRuntime();
  const calls = [];
  const runtime = createAndroidSystemBarsRuntime({
    systemBarsPlugin: {
      async setStyle(options) { calls.push(options); },
    },
    isNativeAndroid: () => false,
    styles: { dark: 'DARK', light: 'LIGHT' },
    statusBar: 'StatusBar',
  });

  await runtime.applyTheme('dark');

  assert.deepEqual(calls, []);
});

test('Android system bars runtime maps app themes to status-bar icon contrast', async () => {
  const { createAndroidSystemBarsRuntime } = await loadRuntime();
  const calls = [];
  const runtime = createAndroidSystemBarsRuntime({
    systemBarsPlugin: {
      async setStyle(options) { calls.push(options); },
    },
    isNativeAndroid: () => true,
    styles: { dark: 'DARK', light: 'LIGHT' },
    statusBar: 'StatusBar',
  });

  await runtime.applyTheme('dark');
  await runtime.applyTheme('light');

  assert.deepEqual(calls, [
    { style: 'DARK', bar: 'StatusBar' },
    { style: 'LIGHT', bar: 'StatusBar' },
  ]);
});

test('theme observer synchronizes initially, reacts to changes and disconnects', async () => {
  const { observeSystemBarsTheme } = await loadRuntime();
  const rootElement = { dataset: { theme: 'dark' } };
  const appliedThemes = [];
  let listener;
  let observed;
  let disconnected = false;

  const dispose = observeSystemBarsTheme({
    rootElement,
    runtime: {
      async applyTheme(theme) { appliedThemes.push(theme); },
    },
    createObserver(callback) {
      listener = callback;
      return {
        observe(element, options) { observed = { element, options }; },
        disconnect() { disconnected = true; },
      };
    },
  });

  rootElement.dataset.theme = 'light';
  listener();
  await Promise.resolve();
  dispose();

  assert.deepEqual(appliedThemes, ['dark', 'light']);
  assert.deepEqual(observed, {
    element: rootElement,
    options: {
      attributes: true,
      attributeFilter: ['data-theme'],
    },
  });
  assert.equal(disconnected, true);
});
