const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../nutrition-tracker-controller.js"))],
  ["ESM", () => import("../../src/controller/nutrition-tracker-controller.js")]
];

function createController(createNutritionTrackerController) {
  return createNutritionTrackerController({
    React,
    services: {
      resolveNutritionBackAction: () => null
    },
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

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createNutritionTrackerController } = await load();
      return callback(createNutritionTrackerController);
    });
  });
}

contractTest("keeps the complete hook protocol inside NutritionTracker", createNutritionTrackerController => {
  const { NutritionTracker } = createController(createNutritionTrackerController);
  const source = NutritionTracker.toString();

  assert.equal((source.match(/\buseState\s*\(/g) || []).length, 147);
  assert.equal((source.match(/\buseEffect\s*\(/g) || []).length, 36);
  assert.equal((source.match(/\buseRef\s*\(/g) || []).length, 16);
});

contractTest("keeps all eleven render-scoped factories in their original order", createNutritionTrackerController => {
  const { NutritionTracker } = createController(createNutritionTrackerController);
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

contractTest("MealGA keeps the current-render updateActiveLog closure", createNutritionTrackerController => {
  const { NutritionTracker } = createController(createNutritionTrackerController);
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

test("ESM exports the exact UMD controller factory reference", async () => {
  const umd = require("../../nutrition-tracker-controller.js");
  const esm = await import("../../src/controller/nutrition-tracker-controller.js");

  assert.equal(esm.createNutritionTrackerController, umd.createNutritionTrackerController);
});

contractTest("keeps every render-scoped factory argument and current-render closure in its original block", createNutritionTrackerController => {
  const { NutritionTracker } = createController(createNutritionTrackerController);
  const source = NutritionTracker.toString();
  const contracts = [
    {
      factory: "FoodEntry.createFoodEntry",
      dependencies: [
        "divisor",
        "createEntryId: () => Date.now().toString() + Math.random()",
        "getEntryTime: () => new Date().toTimeString().slice(0,5)",
        "getPantry: () => pantry",
        "buildDayTotals"
      ]
    },
    {
      factory: "SavedMealCardModule.createSavedMealCard",
      dependencies: ["React", "pickLang", "templateEntries", "templateTotals", "templateItemEntry"]
    },
    {
      factory: "MealGA.createMealGA",
      dependencies: [
        "mealScore: window.MealScore",
        "buildEntry",
        "updateActiveLog: updater => setActiveLog(updater)",
        "random: Math.random",
        "setTimeout: window.setTimeout.bind(window)"
      ]
    },
    {
      factory: "MealReviewAI.createMealReviewAI",
      dependencies: ["callAI", "pickLang", "getEvaluationCount: mealScoreEvaluationCount"]
    },
    {
      factory: "FoodAutofillAI.createFoodAutofillAI",
      dependencies: ["callAI", "normalizeLanguage", "pickLang", "getAiLanguageInstruction: aiLang"]
    },
    {
      factory: "DishDescriptionAI.createDishDescriptionAI",
      dependencies: [
        "callAI",
        "normalizeLanguage",
        "getAiLanguageInstruction: aiLang",
        "createEntryId: () => Date.now().toString() + Math.random()"
      ]
    },
    {
      factory: "NutritionFeedbackAI.createNutritionFeedbackAI",
      dependencies: ["callAI", "normalizeLanguage", "pickLang", "activityLevels: ACTIVITY_LEVELS", "calculateAge"]
    },
    {
      factory: "EatingPatternsAI.createEatingPatternsAI",
      dependencies: ["callAI", "pickLang", "computeGoals", "getWeightForDate"]
    },
    {
      factory: "HistoryLoaders.createHistoryLoaders",
      dependencies: [
        "storage",
        "normalizeMealKeys",
        "aggregateWeekRows",
        "aggregateMealAverages",
        "monthDays",
        "calendarMarkerFor",
        "resolveHistoricalGoals",
        "createDate: () => new Date()",
        "warn: (...args) => console.warn(...args)"
      ]
    },
    {
      factory: "BarcodeScanner.createBarcodeScanner",
      dependencies: [
        "windowObject: window",
        "navigatorObject: navigator",
        "documentObject: document",
        "setTimeoutFn: (callback, delay) => setTimeout(callback, delay)",
        "requestAnimationFrameFn: callback => requestAnimationFrame(callback)",
        "refs: {",
        "videoRef",
        "streamRef: barcodeStreamRef",
        "readerRef: barcodeReaderRef",
        "controlsRef: barcodeControlsRef",
        "scanRef: barcodeScanRef",
        "setScanning: setBarcodeScanning",
        "setMessage: setBarcodeMessage",
        "setInput: setBarcodeInput",
        "lookupBarcode: code => fetchBarcodeProduct(code)",
        "loadingCompatible: pickLang(lang,",
        "pointCamera: pickLang(lang,",
        "fallbackFailed: pickLang(lang,",
        "cameraUnavailable: pickLang(lang,",
        "startFailed: pickLang(lang,"
      ]
    },
    {
      factory: "AutosaveScheduler.createAutosaveScheduler",
      dependencies: [
        "storage",
        "setTimer: (callback, delay) => setTimeout(callback, delay)",
        "clearTimer: handle => clearTimeout(handle)",
        "timersByKey: saveTimeout.current",
        "onPersisted: key => hydratedStorageKeysRef.current.add(key)"
      ]
    }
  ];

  contracts.forEach((contract, index) => {
    const start = source.indexOf(contract.factory);
    const end = index + 1 < contracts.length
      ? source.indexOf(contracts[index + 1].factory)
      : source.lastIndexOf("return");
    const block = source.slice(start, end);

    assert.notEqual(start, -1, `${contract.factory} must remain render-scoped`);
    assert.ok(end > start, `${contract.factory} must remain before the next render-scoped factory`);
    contract.dependencies.forEach(dependency => {
      assert.ok(
        block.includes(dependency),
        `${contract.factory} must keep ${dependency}`
      );
    });
  });
});
