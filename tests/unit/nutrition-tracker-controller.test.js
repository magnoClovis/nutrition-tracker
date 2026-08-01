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
      resolveNutritionBackAction: () => null,
      resolveTabHistoryAfterNavigation: history => history
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

  assert.equal((source.match(/\buseState\s*\(/g) || []).length, 151);
  assert.equal((source.match(/\buseEffect\s*\(/g) || []).length, 36);
  assert.equal((source.match(/\buseRef\s*\(/g) || []).length, 19);
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

contractTest("stores only sanitized AI status metadata for the current session", createNutritionTrackerController => {
  const {
    normalizeAIStatus,
    readAIStatus,
    writeAIStatus
  } = createController(createNutritionTrackerController);
  const values = new Map();
  const sessionStorage = {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) { values.set(key, value); }
  };
  const now = () => new Date("2026-07-31T12:34:56.000Z");

  assert.deepEqual(readAIStatus(sessionStorage), { status: "not-called" });
  assert.deepEqual(writeAIStatus(sessionStorage, {
    status: "rate-limited",
    scope: "daily",
    retryAfterSeconds: 61.2,
    prompt: "must not be stored",
    response: "must not be stored",
    token: "must not be stored"
  }, now), {
    status: "rate-limited",
    timestamp: "2026-07-31T12:34:56.000Z",
    scope: "daily",
    retryAfterSeconds: 62
  });
  assert.deepEqual(readAIStatus(sessionStorage), {
    status: "rate-limited",
    timestamp: "2026-07-31T12:34:56.000Z",
    scope: "daily",
    retryAfterSeconds: 62
  });
  assert.doesNotMatch([...values.values()][0], /must not be stored/);
  assert.deepEqual(normalizeAIStatus({
    status: "unexpected",
    timestamp: "2026-07-31T12:34:56.000Z"
  }), { status: "not-called" });
});

contractTest("records every requested local AI state and exposes the Trofia IA modal", createNutritionTrackerController => {
  const { NutritionTracker } = createController(createNutritionTrackerController);
  const source = NutritionTracker.toString();

  for (const state of [
    "success",
    "session-expired",
    "service-unavailable",
    "invalid-response",
    "rate-limited",
    "not-called"
  ]) {
    assert.ok(source.includes(`"${state}"`), `missing ${state} state`);
  }
  assert.ok(source.includes('key: "trofia-ai"'));
  assert.ok(source.includes('label: "Trofia IA"'));
  assert.ok(source.includes("setAIStatusModal(readAIStatus(sessionStorage))"));
  assert.ok(source.includes('"data-ai-status-modal": "true"'));
  assert.ok(source.includes("error.retryAfterSeconds"));
  assert.ok(source.includes("error.scope"));
  assert.ok(source.includes('case "closeAIStatus"'));
});

contractTest("keeps contextual help in reserved flow and injects it into the Add header", createNutritionTrackerController => {
  const { NutritionTracker } = createController(createNutritionTrackerController);
  const source = NutritionTracker.toString();
  const helperStart = source.indexOf("function renderContextualHelpButton");
  const helperEnd = source.indexOf("useEffect", helperStart);
  const normalRowStart = source.indexOf('"data-contextual-help-row": "true"');
  const normalRowEnd = source.indexOf('tab === "diario"', normalRowStart);

  assert.ok(helperStart >= 0);
  assert.ok(source.slice(helperStart, helperEnd).includes('"data-contextual-help": tab'));
  assert.ok(source.includes("helpNode: renderContextualHelpButton()"));
  assert.ok(source.includes('tab !== "adicionar"'));
  assert.ok(normalRowStart >= 0);
  assert.ok(source.slice(normalRowStart, normalRowEnd).includes('justifyContent: "flex-end"'));
  assert.doesNotMatch(source.slice(normalRowStart, normalRowEnd), /position:\s*"absolute"/);
});

contractTest("resolves one validated registration time and applies it immutably to every meal item", createNutritionTrackerController => {
  const {
    formatMealRegistrationTime,
    resolveMealRegistrationTime,
    applyMealRegistrationTime
  } = createController(createNutritionTrackerController);
  const now = new Date(2026, 6, 31, 9, 7);
  const items = [{ id: "one", time: "08:00" }, { id: "two" }];

  assert.equal(formatMealRegistrationTime(now), "09:07");
  assert.equal(resolveMealRegistrationTime({ open: false, value: "18:45" }, now), "09:07");
  assert.equal(resolveMealRegistrationTime({ open: true, value: "18:45" }, now), "18:45");
  assert.equal(resolveMealRegistrationTime({ open: true, value: "25:99" }, now), "09:07");
  assert.deepEqual(applyMealRegistrationTime(items, "18:45"), [
    { id: "one", time: "18:45" },
    { id: "two", time: "18:45" }
  ]);
  assert.deepEqual(items, [{ id: "one", time: "08:00" }, { id: "two" }]);
});

contractTest("captures a stable meal origin and surfaces persistence failures", async createNutritionTrackerController => {
  const {
    createMealRegistrationOrigin,
    persistMealRegistration
  } = createController(createNutritionTrackerController);
  const origin = createMealRegistrationOrigin({
    tab: "semana",
    viewDate: "2026-07-30",
    scrollY: 642
  });
  const writes = [];
  const nextLog = { Almoço: [{ id: "entry-1" }] };

  assert.deepEqual(origin, {
    tab: "semana",
    viewDate: "2026-07-30",
    scrollY: 642
  });
  assert.equal(createMealRegistrationOrigin({
    tab: "diario",
    viewDate: "2026-07-31",
    scrollY: -1
  }).scrollY, 0);
  assert.equal(await persistMealRegistration({
    storage: {
      async set(key, value) {
        writes.push([key, value]);
      }
    },
    key: "log_v2_2026-07-30",
    nextLog
  }), nextLog);
  assert.deepEqual(writes, [[
    "log_v2_2026-07-30",
    JSON.stringify(nextLog)
  ]]);
  await assert.rejects(
    persistMealRegistration({
      storage: { async set() { throw new Error("offline"); } },
      key: "log_v2_2026-07-30",
      nextLog
    }),
    /offline/
  );
});

contractTest("keeps autosaves suspended until backup import and rehydration finish", async createNutritionTrackerController => {
  const { restoreAccountBackupSafely, NutritionTracker } = createController(createNutritionTrackerController);
  const events = [];

  const result = await restoreAccountBackupSafely({
    async suspendAutosaves() { events.push("suspend"); },
    resumeAutosaves() { events.push("resume"); },
    clearHydratedKeys() { events.push("clear-hydrated"); },
    async importBackup() {
      events.push("import");
      return { imported: 3 };
    },
    async reloadData() { events.push("reload"); }
  });

  assert.deepEqual(result, { imported: 3 });
  assert.deepEqual(events, ["suspend", "clear-hydrated", "import", "reload", "resume"]);

  const source = NutritionTracker.toString();
  assert.ok(source.includes("window._restoreFullAccountBackup = restoreFullAccountBackup"));
  assert.ok(source.indexOf("setLoaded(false)") < source.indexOf("restoreAccountBackupSafely({"));
});

contractTest("applies the selected time at every final meal-registration path", createNutritionTrackerController => {
  const { NutritionTracker } = createController(createNutritionTrackerController);
  const source = NutritionTracker.toString();
  const functionNames = [
    "addDescribedToLog",
    "addToLog",
    "commitStaged",
    "confirmMealReview"
  ];

  functionNames.forEach((functionName, index) => {
    const start = source.indexOf(`function ${functionName}`);
    const nextStart = index + 1 < functionNames.length
      ? source.indexOf(`function ${functionNames[index + 1]}`, start)
      : source.indexOf("const stagedTot", start);
    assert.ok(start >= 0, `${functionName} must exist`);
    assert.ok(
      source.slice(start, nextStart).includes("applySelectedMealTime"),
      `${functionName} must apply the shared registration time`
    );
  });
});

contractTest("restores the captured tab, date, and scroll only after successful registration", createNutritionTrackerController => {
  const { NutritionTracker } = createController(createNutritionTrackerController);
  const source = NutritionTracker.toString();

  function functionBlock(name, nextMarker) {
    const start = source.indexOf(`function ${name}`);
    const end = source.indexOf(nextMarker, start);
    assert.ok(start >= 0, `${name} must exist`);
    assert.ok(end > start, `${name} must end before ${nextMarker}`);
    return source.slice(start, end);
  }

  const suggestion = functionBlock("loadSuggestionToStaged", "function reportDateShift");
  const openAdd = functionBlock("openAddForMeal", "async function addToLog");
  const close = functionBlock("closeMealRegistration", "async function saveMealRegistration");
  const save = functionBlock("saveMealRegistration", "// Pantry");

  assert.ok(suggestion.indexOf("captureMealRegistrationOrigin()") < suggestion.indexOf('openTab("adicionar")'));
  assert.ok(openAdd.indexOf("captureMealRegistrationOrigin()") < openAdd.indexOf('openTab("adicionar")'));
  assert.match(close, /if \(mealRegistrationSavingRef\.current\) return false/);
  assert.match(close, /origin\.viewDate !== viewDate/);
  assert.match(close, /pendingScrollRestoreRef\.current = origin\.scrollY/);
  assert.match(close, /openTab\(origin\.tab, \{ skipTutorial: true, fromBack: true \}\)/);
  assert.match(save, /await persistMealRegistration/);
  assert.ok(save.indexOf("await persistMealRegistration") < save.indexOf("setActiveLog(nextLog)"));
  assert.match(save, /catch \(_\)/);
  assert.match(save, /return null/);
  assert.ok(source.includes("onClick: closeMealRegistration"));
  assert.ok(source.includes('case "leaveAddScreen"'));

  const finalPaths = [
    ["addDescribedToLog", "// Water"],
    ["addToLog", "function addToStaged"],
    ["commitStaged", "function evaluateStagedMeal"],
    ["confirmMealReview", "const stagedTot"]
  ];
  finalPaths.forEach(([name, nextMarker]) => {
    const block = functionBlock(name, nextMarker);
    const saveIndex = block.indexOf("await saveMealRegistration");
    const guardIndex = block.indexOf("if (!savedLog) return");
    const closeIndex = block.indexOf("await closeMealRegistration()");
    assert.ok(saveIndex >= 0, `${name} must await persistence`);
    assert.ok(guardIndex > saveIndex, `${name} must preserve the modal after persistence failure`);
    assert.ok(closeIndex > guardIndex, `${name} must close only after success`);
  });
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
        "addCivilDays",
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
