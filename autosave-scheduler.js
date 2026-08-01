/**
 * Per-key debounced persistence scheduler used by the diary autosave effects.
 *
 * TEMPORAL-PROTOCOL WARNING: this controller is only the timer mechanism inside
 * the hydration/autosave protocol. The host retains the 24-key hydration pass,
 * its 12-second fallback, every effect and guard condition, the static TODAY
 * keys, and all React setters. Changing scheduler timing in isolation can cause
 * startup defaults or stale historical values to overwrite real user data.
 *
 * The UMD module exposes a `createAutosaveScheduler` factory. The host injects
 * storage, set/clear timer functions, the persistent `saveTimeout.current`
 * handle map, and an `onPersisted` callback. The returned scheduler keeps the
 * existing 800 ms default, accepts the existing 1500 ms notes override, and
 * swallows rejected writes. It also coordinates backup restoration: suspension
 * cancels every queued timer, blocks new schedules and waits for writes already
 * in flight before the importer is allowed to replace remote data.
 *
 * @module AutosaveScheduler
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AutosaveScheduler = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const schedulerStateByTimerMap = new WeakMap();

  function stateFor(timersByKey) {
    let state = schedulerStateByTimerMap.get(timersByKey);
    if (!state) {
      state = { suspensionDepth: 0, inFlightWrites: new Set() };
      schedulerStateByTimerMap.set(timersByKey, state);
    }
    return state;
  }

  /**
   * Creates the existing per-key debounce mechanism with environmental services supplied by the host.
   *
   * @param {Object} dependencies Injected dependencies.
   * @param {{set: function(string, *): Promise<*>}} dependencies.storage Public persistence facade.
   * @param {function(function(), number): *} dependencies.setTimer Schedules one timer and returns its handle.
   * @param {function(*): void} dependencies.clearTimer Clears a previous timer handle.
   * @param {Object<string, *>} dependencies.timersByKey Persistent timer handles keyed by storage key.
   * @param {function(string): void} dependencies.onPersisted Marks a key only after a successful write.
   * @returns {{scheduleSave: function(string, *, number=): void, suspend: function(): Promise<void>, resume: function(): void}} Autosave scheduler API.
   */
  function createAutosaveScheduler({ storage, setTimer, clearTimer, timersByKey, onPersisted }) {
    if (
      !storage || typeof storage.set !== "function" ||
      typeof setTimer !== "function" ||
      typeof clearTimer !== "function" ||
      !timersByKey || typeof timersByKey !== "object" ||
      typeof onPersisted !== "function"
    ) {
      throw new TypeError("AutosaveScheduler requires storage, timer services, a timer map, and onPersisted");
    }
    const state = stateFor(timersByKey);

    function cancelPendingSaves() {
      Object.keys(timersByKey).forEach(key => {
        clearTimer(timersByKey[key]);
        delete timersByKey[key];
      });
    }

    async function suspend() {
      state.suspensionDepth += 1;
      cancelPendingSaves();
      await Promise.allSettled([...state.inFlightWrites]);
    }

    function resume() {
      state.suspensionDepth = Math.max(0, state.suspensionDepth - 1);
    }

    /**
     * Replaces the pending timer for one key and persists the captured value after its delay.
     *
     * @param {string} key Persisted storage key and independent debounce slot.
     * @param {*} value Value captured when this save is scheduled.
     * @param {number} [delay=800] Debounce delay in milliseconds.
     * @returns {void}
     */
    function scheduleSave(key, value, delay = 800) {
      if (state.suspensionDepth > 0) return;
      if (timersByKey[key]) clearTimer(timersByKey[key]);
      timersByKey[key] = setTimer(() => {
        if (state.suspensionDepth > 0) return;
        let storageWrite;
        try {
          storageWrite = storage.set(key, typeof value === "string" ? value : JSON.stringify(value));
        } catch (error) {
          storageWrite = Promise.reject(error);
        }
        const write = Promise.resolve(storageWrite)
          .then(() => onPersisted(key))
          .catch(() => {});
        state.inFlightWrites.add(write);
        write.finally(() => state.inFlightWrites.delete(write));
      }, delay);
    }

    return { scheduleSave, suspend, resume };
  }

  return { createAutosaveScheduler };
});
