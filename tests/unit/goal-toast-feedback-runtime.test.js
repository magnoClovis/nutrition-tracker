import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoalToastFeedbackRuntime } from '../../src/composite/goal-toast-feedback-runtime.js';

test('uses native success haptics only on Android', async () => {
  const calls = [];
  const runtime = createGoalToastFeedbackRuntime({
    isNativeAndroid: () => true,
    haptics: { notification: async options => calls.push(options) },
  });

  assert.equal(await runtime.notify('success'), true);
  assert.deepEqual(calls, [{ type: 'SUCCESS' }]);
});

test('maps warning and silently falls back off native Android', async () => {
  const calls = [];
  const warningRuntime = createGoalToastFeedbackRuntime({
    isNativeAndroid: () => true,
    haptics: { notification: async options => calls.push(options) },
  });
  const webRuntime = createGoalToastFeedbackRuntime({
    isNativeAndroid: () => false,
    haptics: { notification: async () => assert.fail('web must not call haptics') },
  });

  assert.equal(await warningRuntime.notify('warning'), true);
  assert.deepEqual(calls, [{ type: 'WARNING' }]);
  assert.equal(await webRuntime.notify('success'), false);
});

test('converts native plugin failures into a safe fallback signal', async () => {
  const runtime = createGoalToastFeedbackRuntime({
    isNativeAndroid: () => true,
    haptics: { notification: async () => { throw new Error('native-unavailable'); } },
  });

  assert.equal(await runtime.notify('success'), false);
});
