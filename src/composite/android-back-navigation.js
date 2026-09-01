/**
 * Pure Android-back dispatcher and NutritionTracker action resolver.
 *
 * Native plugin access is intentionally kept out of this module so the
 * priority contract can be exercised without an Android runtime.
 */

export const BACK_HANDLER_PRIORITY = Object.freeze({
  nutrition: 100,
  app: 200,
  nestedPanel: 300,
});

export const NUTRITION_BACK_LEVEL = Object.freeze({
  nestedModal: 1,
  modal: 2,
  contextual: 3,
  secondaryScreen: 4,
  addScreen: 5,
  historicalDate: 6,
  secondaryTab: 7,
});

/**
 * Returns the next immutable tab-history snapshot for one navigation.
 */
export function resolveTabHistoryAfterNavigation(history, {
  currentTab,
  nextTab,
  fromBack = false,
  resetHistory = false,
}) {
  if (resetHistory) return [];
  if (currentTab === nextTab || fromBack) return history;
  return [...history, currentTab];
}

const ACTIONS_BY_LEVEL = Object.freeze([
  [
    ['mealReviewHelpOpen', 'closeMealReviewHelp'],
    ['showSaveTemplateModal', 'closeSaveTemplateModal'],
    ['gaAdvancedOpen', 'closeGaAdvanced'],
    ['metricsProgressInfoOpen', 'closeMetricsProgressInfo'],
    ['backupImportPreview', 'closeBackupImportPreview'],
  ],
  [
    ['barcodeModalOpen', 'closeBarcodeModal'],
    ['aiStatusModal', 'closeAIStatus'],
    ['reportModalOpen', 'closeReportModal'],
    ['mealReview', 'closeMealReview'],
    ['diaryMealEvaluationDetail', 'closeDiaryMealEvaluationDetail'],
    ['detailFood', 'closeFoodDetail'],
    ['calendarOpen', 'closeCalendar'],
    ['notesOpen', 'closeNotes'],
    ['backupOpen', 'closeBackup'],
    ['showGA', 'closeGa'],
    ['metricsProgressOpen', 'closeMetricsProgress'],
    ['bodyCompositionOpen', 'closeBodyComposition'],
    ['showSuppAdd', 'closeSupplementAdd'],
    ['showSuppForm', 'closeSupplementForm'],
  ],
  [
    ['headerLanguageMenuOpen', 'closeHeaderLanguageMenu'],
    ['menuOpen', 'closeHeaderMenu'],
    ['entryMenuId', 'closeEntryMenu'],
    ['editEntryId', 'cancelEntryEdit'],
    ['editingId', 'cancelFoodEdit'],
    ['editingWeightId', 'cancelWeightEdit'],
    ['editingTemplateId', 'cancelTemplateEdit'],
    ['editStagedIdx', 'cancelStagedEdit'],
    ['editWaterGoal', 'cancelWaterGoalEdit'],
    ['editingGoals', 'cancelGoalsEdit'],
    ['showExportPanel', 'closeExportPanel'],
    ['exportResult', 'closeExportResult'],
    ['showRecentMeals', 'closeRecentMeals'],
  ],
  [
    ['newFoodOpen', 'closeNewFood'],
    ['pantryItemsOpen', 'closePantryItems'],
    ['mealTemplatesOpen', 'closeMealTemplates'],
    ['suppPantryOpen', 'closeSupplementPantry'],
    ['addTemplatesOpen', 'closeAddTemplates'],
  ],
]);

function active(value) {
  return value !== false && value !== null && value !== undefined && value !== '';
}

/**
 * Returns the first UI action that should consume Android Back.
 */
export function resolveNutritionBackAction(state) {
  for (let levelIndex = 0; levelIndex < ACTIONS_BY_LEVEL.length; levelIndex += 1) {
    for (const [stateKey, action] of ACTIONS_BY_LEVEL[levelIndex]) {
      if (active(state[stateKey])) {
        return { action, level: levelIndex + 1 };
      }
    }
  }

  if (state.tab === 'adicionar') {
    return { action: 'leaveAddScreen', level: NUTRITION_BACK_LEVEL.addScreen };
  }
  if (state.tab === 'diario' && state.viewDate !== state.today) {
    return { action: 'returnToToday', level: NUTRITION_BACK_LEVEL.historicalDate };
  }
  if ((state.tab && state.tab !== 'diario') || state.hasTabHistory) {
    return { action: 'leaveSecondaryTab', level: NUTRITION_BACK_LEVEL.secondaryTab };
  }
  return null;
}

/**
 * Creates one ordered dispatcher. Handlers with a higher priority run first;
 * equal priorities use last-registered-first order.
 */
export function createBackNavigationDispatcher({ onUnhandled }) {
  if (typeof onUnhandled !== 'function') {
    throw new TypeError('Back navigation dispatcher requires an unhandled callback');
  }

  const handlers = new Map();
  let registrationOrder = 0;
  let dispatching = false;

  function register({ id, priority = 0, handler }) {
    if (!id || typeof handler !== 'function') {
      throw new TypeError('Back handler requires an id and callback');
    }
    const registration = {
      handler,
      priority,
      order: ++registrationOrder,
    };
    handlers.set(id, registration);

    return () => {
      if (handlers.get(id) === registration) handlers.delete(id);
    };
  }

  async function dispatch(event) {
    if (dispatching) return { handled: true, source: 'busy' };
    dispatching = true;
    try {
      const ordered = [...handlers.entries()]
        .sort(([, left], [, right]) => (
          right.priority - left.priority || right.order - left.order
        ));

      for (const [id, registration] of ordered) {
        if (await registration.handler(event)) {
          return { handled: true, source: id };
        }
      }

      await onUnhandled(event);
      return { handled: false, source: 'fallback' };
    } finally {
      dispatching = false;
    }
  }

  return {
    register,
    dispatch,
  };
}
