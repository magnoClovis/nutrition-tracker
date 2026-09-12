const test = require('node:test');
const assert = require('node:assert/strict');

async function loadFactory() {
  return import('../../src/composite/android-app-runtime.js');
}

test('Android app runtime is inert outside native Android', async () => {
  const { createAndroidAppRuntime } = await loadFactory();
  const calls = [];
  const runtime = createAndroidAppRuntime({
    appPlugin: {
      async addListener() { calls.push('listen'); },
      async minimizeApp() { calls.push('minimize'); },
    },
    isNativeAndroid: () => false,
  });

  const remove = await runtime.addBackButtonListener(() => {});
  const removeState = await runtime.addAppStateListener(() => {});
  await runtime.minimize();
  remove();
  removeState();

  assert.deepEqual(calls, []);
});

test('Android app runtime owns one removable listener and native minimize', async () => {
  const { createAndroidAppRuntime } = await loadFactory();
  const calls = [];
  const runtime = createAndroidAppRuntime({
    appPlugin: {
      async addListener(name, listener) {
        calls.push(['listen', name, listener]);
        return { remove() { calls.push(['remove']); } };
      },
      async minimizeApp() { calls.push(['minimize']); },
    },
    isNativeAndroid: () => true,
  });
  const listener = () => {};
  const stateListener = () => {};

  const remove = await runtime.addBackButtonListener(listener);
  const removeState = await runtime.addAppStateListener(stateListener);
  await runtime.minimize();
  await remove();
  await removeState();

  assert.deepEqual(calls, [
    ['listen', 'backButton', listener],
    ['listen', 'appStateChange', stateListener],
    ['minimize'],
    ['remove'],
    ['remove'],
  ]);
});

test('Android app runtime opens application settings only on native Android', async () => {
  const { createAndroidAppRuntime } = await loadFactory();
  const calls = [];
  const dependencies = {
    appPlugin: {
      async addListener() {},
      async minimizeApp() {},
    },
    appSettingsPlugin: {
      async openSettings() { calls.push('settings'); },
    },
  };
  const nativeRuntime = createAndroidAppRuntime({ ...dependencies, isNativeAndroid: () => true });
  assert.equal(nativeRuntime.canOpenSettings(), true);
  assert.equal(await nativeRuntime.openSettings(), true);

  const webRuntime = createAndroidAppRuntime({ ...dependencies, isNativeAndroid: () => false });
  assert.equal(webRuntime.canOpenSettings(), false);
  assert.equal(await webRuntime.openSettings(), false);
  assert.deepEqual(calls, ['settings']);
});
