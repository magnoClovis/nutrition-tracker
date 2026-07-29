const test = require('node:test');
const assert = require('node:assert/strict');

async function loadModule() {
  return import('../../src/composite/android-back-navigation.js');
}

test('dispatcher gives nested panels priority over app and nutrition handlers', async () => {
  const {
    BACK_HANDLER_PRIORITY,
    createBackNavigationDispatcher,
  } = await loadModule();
  const calls = [];
  const dispatcher = createBackNavigationDispatcher({
    onUnhandled() { calls.push('fallback'); },
  });

  dispatcher.register({
    id: 'nutrition',
    priority: BACK_HANDLER_PRIORITY.nutrition,
    handler() { calls.push('nutrition'); return true; },
  });
  dispatcher.register({
    id: 'app',
    priority: BACK_HANDLER_PRIORITY.app,
    handler() { calls.push('app'); return true; },
  });
  dispatcher.register({
    id: 'settings',
    priority: BACK_HANDLER_PRIORITY.nestedPanel,
    handler() { calls.push('settings'); return true; },
  });

  assert.deepEqual(await dispatcher.dispatch({}), {
    handled: true,
    source: 'settings',
  });
  assert.deepEqual(calls, ['settings']);
});

test('dispatcher continues until a handler consumes Back and otherwise minimizes', async () => {
  const { createBackNavigationDispatcher } = await loadModule();
  const calls = [];
  const dispatcher = createBackNavigationDispatcher({
    onUnhandled() { calls.push('minimize'); },
  });

  dispatcher.register({
    id: 'app',
    priority: 20,
    handler() { calls.push('app'); return false; },
  });
  dispatcher.register({
    id: 'nutrition',
    priority: 10,
    handler() { calls.push('nutrition'); return false; },
  });

  assert.deepEqual(await dispatcher.dispatch({}), {
    handled: false,
    source: 'fallback',
  });
  assert.deepEqual(calls, ['app', 'nutrition', 'minimize']);
});

test('nutrition resolver preserves the seven-level navigation hierarchy', async () => {
  const { resolveNutritionBackAction } = await loadModule();
  const base = {
    today: '2026-07-29',
    viewDate: '2026-07-29',
    tab: 'diario',
  };

  const cases = [
    [{ ...base, mealReviewHelpOpen: true, barcodeModalOpen: true }, 'closeMealReviewHelp', 1],
    [{ ...base, barcodeModalOpen: true, entryMenuId: 'entry' }, 'closeBarcodeModal', 2],
    [{ ...base, entryMenuId: 'entry', newFoodOpen: true }, 'closeEntryMenu', 3],
    [{ ...base, newFoodOpen: true, tab: 'adicionar' }, 'closeNewFood', 4],
    [{ ...base, tab: 'adicionar' }, 'leaveAddScreen', 5],
    [{ ...base, viewDate: '2026-07-28' }, 'returnToToday', 6],
    [{ ...base, tab: 'semana' }, 'leaveSecondaryTab', 7],
    [{ ...base, hasTabHistory: true }, 'leaveSecondaryTab', 7],
  ];

  for (const [state, action, level] of cases) {
    assert.deepEqual(resolveNutritionBackAction(state), { action, level });
  }
  assert.equal(resolveNutritionBackAction(base), null);
});

test('resolver checks same-level actions in deterministic topmost-first order', async () => {
  const { resolveNutritionBackAction } = await loadModule();
  const state = {
    today: '2026-07-29',
    viewDate: '2026-07-29',
    tab: 'metricas',
    reportModalOpen: true,
    detailFood: { id: 'food' },
    menuOpen: true,
  };

  assert.deepEqual(resolveNutritionBackAction(state), {
    action: 'closeReportModal',
    level: 2,
  });
});

test('explicit Diary navigation resets history without affecting contextual navigation', async () => {
  const { resolveTabHistoryAfterNavigation } = await loadModule();
  const history = ['diario', 'despensa'];

  assert.deepEqual(resolveTabHistoryAfterNavigation(history, {
    currentTab: 'semana',
    nextTab: 'diario',
    resetHistory: true,
  }), []);

  assert.deepEqual(resolveTabHistoryAfterNavigation(history, {
    currentTab: 'semana',
    nextTab: 'diario',
  }), ['diario', 'despensa', 'semana']);

  assert.deepEqual(resolveTabHistoryAfterNavigation(history, {
    currentTab: 'semana',
    nextTab: 'despensa',
    fromBack: true,
  }), history);
});
