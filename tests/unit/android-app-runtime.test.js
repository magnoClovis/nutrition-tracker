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
