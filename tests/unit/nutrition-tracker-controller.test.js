const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const {
  createNutritionTrackerController
} = require("../../nutrition-tracker-controller.js");

function createController() {
  return createNutritionTrackerController({
    React,
    services: {},
    domain: {},
    screens: {},
    browser: {
      windowObject: {},
      documentObject: {},
      localStorageObject: {},
      navigatorObject: {},
      fetchRequest: async () => ({}),
      setTimeoutFn: setTimeout,
      clearTimeoutFn: clearTimeout,
      requestAnimationFrameFn: () => 0,
      consoleObject: console
    },
    constants: {}
  });
}

test("keeps the complete hook protocol inside NutritionTracker", () => {
  const { NutritionTracker } = createController();
  const source = NutritionTracker.toString();

  assert.equal((source.match(/\buseState\s*\(/g) || []).length, 145);
  assert.equal((source.match(/\buseEffect\s*\(/g) || []).length, 35);
  assert.equal((source.match(/\buseRef\s*\(/g) || []).length, 14);
});

test("keeps all eleven render-scoped factories in their original order", () => {
  const { NutritionTracker } = createController();
  const source = NutritionTracker.toString();
  const factories = [
    "FoodEntry.createFoodEntry",
    "SavedMealCardModule.createSavedMealCard",
    "MealGA.createMealGA",
    "MealReviewAI.createMealReviewAI",
    "FoodAutofillAI.createFoodAutofillAI",
    "DishDescriptionAI.createDishDescriptionAI",
    "NutritionFeedbackAI.createNutritionFeedbackAI",
    "EatingPatternsAI.createEatingPatternsAI",
    "HistoryLoaders.createHistoryLoaders",
    "BarcodeScanner.createBarcodeScanner",
    "AutosaveScheduler.createAutosaveScheduler"
  ];

  const positions = factories.map(factoryName => source.indexOf(factoryName));
  positions.forEach((position, index) => {
    assert.notEqual(position, -1, `${factories[index]} must remain render-scoped`);
  });
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
});

test("MealGA keeps the current-render updateActiveLog closure", () => {
  const { NutritionTracker } = createController();
  const source = NutritionTracker.toString();
  const mealGaPosition = source.indexOf("MealGA.createMealGA");
  const callbackPosition = source.indexOf(
    "updateActiveLog: updater => setActiveLog(updater)",
    mealGaPosition
  );
  const componentEnd = source.lastIndexOf("return");

  assert.ok(mealGaPosition >= 0);
  assert.ok(callbackPosition > mealGaPosition);
  assert.ok(callbackPosition < componentEnd);
});
