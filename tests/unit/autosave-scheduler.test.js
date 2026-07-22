const test = require("node:test");
const assert = require("node:assert/strict");
const { createAutosaveScheduler } = require("../../autosave-scheduler.js");

function createTimerHarness() {
  let nextId = 1;
  const pending = new Map();
  const scheduled = [];
  const cleared = [];
  return {
    setTimer(callback, delay) {
      const id = nextId++;
      pending.set(id, callback);
      scheduled.push({ id, delay });
      return id;
    },
    clearTimer(id) {
      cleared.push(id);
      pending.delete(id);
    },
    fire(id) {
      const callback = pending.get(id);
      if (callback) callback();
    },
    pending,
    scheduled,
    cleared
  };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

test("uses 800 ms by default and preserves the explicit 1500 ms notes delay", () => {
  const timer = createTimerHarness();
  const timersByKey = {};
  const { scheduleSave } = createAutosaveScheduler({
    storage: { set: async () => {} },
    setTimer: timer.setTimer,
    clearTimer: timer.clearTimer,
    timersByKey,
    onPersisted: () => {}
  });

  assert.equal(scheduleSave("log", {}, undefined), undefined);
  scheduleSave("notes", "note", 1500);

  assert.deepEqual(timer.scheduled, [
    { id: 1, delay: 800 },
    { id: 2, delay: 1500 }
  ]);
  assert.deepEqual(timersByKey, { log: 1, notes: 2 });
});

test("replaces only the previous timer for the same key", () => {
  const timer = createTimerHarness();
  const timersByKey = {};
  const writes = [];
  const { scheduleSave } = createAutosaveScheduler({
    storage: { set: async (...args) => writes.push(args) },
    setTimer: timer.setTimer,
    clearTimer: timer.clearTimer,
    timersByKey,
    onPersisted: () => {}
  });

  scheduleSave("same", { version: 1 });
  scheduleSave("other", { version: 1 });
  scheduleSave("same", { version: 2 });

  assert.deepEqual(timer.cleared, [1]);
  assert.equal(timer.pending.has(1), false);
  assert.equal(timer.pending.has(2), true);
  assert.equal(timer.pending.has(3), true);
  assert.deepEqual(timersByKey, { same: 3, other: 2 });
  assert.deepEqual(writes, []);
});

test("persists strings directly, JSON-serializes other values, and marks only successful keys", async () => {
  const timer = createTimerHarness();
  const timersByKey = {};
  const writes = [];
  const persisted = [];
  const { scheduleSave } = createAutosaveScheduler({
    storage: {
      set(key, value) {
        writes.push([key, value]);
        return key === "failed" ? Promise.reject(new Error("offline")) : Promise.resolve();
      }
    },
    setTimer: timer.setTimer,
    clearTimer: timer.clearTimer,
    timersByKey,
    onPersisted: key => persisted.push(key)
  });

  scheduleSave("string", "raw");
  scheduleSave("object", { value: 1 });
  scheduleSave("failed", [1, 2]);
  timer.fire(1);
  timer.fire(2);
  timer.fire(3);
  await flushPromises();

  assert.deepEqual(writes, [
    ["string", "raw"],
    ["object", JSON.stringify({ value: 1 })],
    ["failed", JSON.stringify([1, 2])]
  ]);
  assert.deepEqual(persisted, ["string", "object"]);
});

test("keeps fired timer handles in the shared map without cleanup", async () => {
  const timer = createTimerHarness();
  const timersByKey = {};
  const { scheduleSave } = createAutosaveScheduler({
    storage: { set: async () => {} },
    setTimer: timer.setTimer,
    clearTimer: timer.clearTimer,
    timersByKey,
    onPersisted: () => {}
  });

  scheduleSave("key", "value");
  timer.fire(1);
  await flushPromises();

  assert.equal(timersByKey.key, 1);
});

test("publishes the UMD factory and requires every scheduler dependency", () => {
  assert.equal(typeof createAutosaveScheduler, "function");
  assert.throws(
    () => createAutosaveScheduler({
      storage: { set: async () => {} },
      setTimer: null,
      clearTimer: () => {},
      timersByKey: {},
      onPersisted: () => {}
    }),
    /requires storage, timer services, a timer map, and onPersisted/
  );
});
