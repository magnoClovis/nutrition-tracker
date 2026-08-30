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

  assert.equal((source.match(/\buseState\s*\(/g) || []).length, 155);
  assert.equal((source.match(/\buseEffect\s*\(/g) || []).length, 40);
  assert.equal((source.match(/\buseRef\s*\(/g) || []).length, 25);
});

contractTest("cuts aggregate daily autosaves only when granular persistence is available", createNutritionTrackerController => {
  const {NutritionTracker} = createController(createNutritionTrackerController);
  const source = NutritionTracker.toString();

  assert.match(source, /dailyEntryPersistence\.persist\("meal", TODAY, log\)/);
  assert.match(source, /dailyEntryPersistence\.persist\("water", TODAY, waterIntake\)/);
  assert.match(source, /dailyEntryPersistence\.persist\("supplement", TODAY, suppLog\)/);
  assert.match(source, /if \(dailyEntryPersistence\.granular\)[\s\S]*?else \{[\s\S]*?scheduleSave\("log_v2_"/);
  assert.match(source, /dailyEntryPersistence\.persist\("meal", viewDate, nextLog\)/);
});

contractTest("routes historical screens and reports through grouped cache-first loaders", createNutritionTrackerController => {
  const { NutritionTracker } = createController(createNutritionTrackerController);
  const source = NutritionTracker.toString();

  for (const loader of [
    "loadRecentMealDays",
    "loadEatingPatternDays",
    "loadLogDays",
    "loadReportDays",
    "subscribeHistoryWindow"
  ]) {
    assert.match(source, new RegExp(`\\b${loader}\\b`));
  }
  assert.doesNotMatch(source, /await\s+storage\.get\(["']log_v2_/);
});

contractTest("computes the next real local midnight across DST transitions", createNutritionTrackerController => {
  const { millisecondsUntilNextLocalDay } = createController(createNutritionTrackerController);
  const originalTimezone = process.env.TZ;
  try {
    const cases = [
      ["America/New_York", new Date(2026, 2, 8, 0, 0, 0), 23],
      ["America/New_York", new Date(2026, 10, 1, 0, 0, 0), 25],
      ["Europe/Madrid", new Date(2026, 2, 29, 0, 0, 0), 23],
      ["Europe/Madrid", new Date(2026, 9, 25, 0, 0, 0), 25]
    ];
    for (const [timezone, , expectedHours] of cases) {
      process.env.TZ = timezone;
      const localMidnight = timezone === "America/New_York"
        ? new Date(2026, expectedHours === 23 ? 2 : 10, expectedHours === 23 ? 8 : 1, 0, 0, 0)
        : new Date(2026, expectedHours === 23 ? 2 : 9, expectedHours === 23 ? 29 : 25, 0, 0, 0);
      assert.equal(millisecondsUntilNextLocalDay(localMidnight), expectedHours * 60 * 60 * 1000);
    }
  } finally {
    if (originalTimezone == null) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

contractTest("reacts to a fake midnight clock and foreground checks without duplicate transitions", async createNutritionTrackerController => {
  const { createLocalDayClock } = createController(createNutritionTrackerController);
  let now = new Date(2026, 6, 31, 23, 59, 59, 900);
  let today = "2026-07-31";
  let nextTimerId = 0;
  const timers = new Map();
  const cleared = [];
  const windowListeners = new Map();
  const documentListeners = new Map();
  const transitions = [];
  const clock = createLocalDayClock({
    initialDay: today,
    readToday: () => today,
    readNow: () => now,
    setTimer(callback, delay) {
      const id = ++nextTimerId;
      timers.set(id, {callback, delay});
      return id;
    },
    clearTimer(id) {
      cleared.push(id);
      timers.delete(id);
    },
    async onDayChange(nextDay, previousDay) {
      transitions.push([previousDay, nextDay]);
    },
    windowObject: {
      addEventListener(name, callback) { windowListeners.set(name, callback); },
      removeEventListener(name) { windowListeners.delete(name); }
    },
    documentObject: {
      visibilityState: "visible",
      addEventListener(name, callback) { documentListeners.set(name, callback); },
      removeEventListener(name) { documentListeners.delete(name); }
    }
  });

  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].delay, 150);
  now = new Date(2026, 7, 1, 0, 0, 0, 50);
  today = "2026-08-01";
  await [...timers.values()][0].callback();
  assert.deepEqual(transitions, [["2026-07-31", "2026-08-01"]]);

  await windowListeners.get("focus")();
  await documentListeners.get("visibilitychange")();
  assert.equal(transitions.length, 1);
  assert.equal(timers.size, 1);

  clock.dispose();
  assert.equal(timers.size, 0);
  assert.equal(windowListeners.size, 0);
  assert.equal(documentListeners.size, 0);
  assert.ok(cleared.length >= 1);
});

contractTest("rehydrates only the new civil day's log, water, supplements, and note", async createNutritionTrackerController => {
  const {
    readDailyStateForDate,
    rolloverDailyStateSafely
  } = createController(createNutritionTrackerController);
  const records = new Map([
    ["log_v2_2026-08-01", {value: JSON.stringify({Lunch: [{id: "new-meal"}]})}],
    ["notes_2026-08-01", {value: "new note"}],
    ["waterIntake_2026-08-01", {value: JSON.stringify([{id: "new-water", ml: 250}])}],
    ["suppLog_2026-08-01", {value: JSON.stringify([{id: "new-supplement"}])}]
  ]);
  const reads = [];
  const events = [];
  let applied = null;

  const result = await rolloverDailyStateSafely({
    nextDate: "2026-08-01",
    async suspendAutosaves() { events.push("suspend"); },
    resumeAutosaves() { events.push("resume"); },
    readDailyState: date => readDailyStateForDate({
      storage: {
        async get(key) {
          reads.push(key);
          return records.get(key) || null;
        }
      },
      date,
      normalizeMealKeys: log => ({...log, normalized: true})
    }),
    async applyDailyState(dailyState) {
      events.push("apply");
      applied = dailyState;
    }
  });

  assert.deepEqual(reads, [
    "log_v2_2026-08-01",
    "notes_2026-08-01",
    "waterIntake_2026-08-01",
    "suppLog_2026-08-01"
  ]);
  assert.deepEqual(events, ["suspend", "apply", "resume"]);
  assert.deepEqual(applied.log, {Lunch: [{id: "new-meal"}], normalized: true});
  assert.equal(applied.note, "new note");
  assert.deepEqual(applied.waterIntake, [{id: "new-water", ml: 250}]);
  assert.deepEqual(applied.supplementLog, [{id: "new-supplement"}]);
  assert.equal(result, applied);

  const empty = await readDailyStateForDate({
    storage: {async get() { return null; }},
    date: "2026-08-02",
    normalizeMealKeys: log => log
  });
  assert.deepEqual({
    log: empty.log,
    note: empty.note,
    waterIntake: empty.waterIntake,
    supplementLog: empty.supplementLog
  }, {log: {}, note: "", waterIntake: [], supplementLog: []});
});

contractTest("keeps autosaves suspended when daily hydration fails and retries safely", async createNutritionTrackerController => {
  const { rolloverDailyStateSafely, NutritionTracker } = createController(createNutritionTrackerController);
  const events = [];
  await assert.rejects(rolloverDailyStateSafely({
    nextDate: "2026-08-01",
    async suspendAutosaves() { events.push("suspend"); },
    resumeAutosaves() { events.push("resume"); },
    async readDailyState() {
      events.push("read");
      throw new Error("offline");
    },
    async applyDailyState() { events.push("apply"); }
  }), /offline/);
  assert.deepEqual(events, ["suspend", "read", "resume"]);

  const source = NutritionTracker.toString();
  assert.ok(source.includes("const [TODAY, setToday] = useState(() => localToday())"));
  assert.ok(source.indexOf("await rolloverDailyStateSafely") < source.indexOf("setToday(nextDate)"));
  assert.ok(source.includes("setLog(dailyState.log)"));
  assert.ok(source.includes("setTodayNote(dailyState.note)"));
  assert.ok(source.includes("setWaterIntake(dailyState.waterIntake)"));
  assert.ok(source.includes("setSuppLog(dailyState.supplementLog)"));
  assert.ok(source.includes("viewDateRef.current === previousDate"));
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
    buildMealOccurrenceDateTime,
    applyMealRegistrationTime
  } = createController(createNutritionTrackerController);
  const now = new Date(2026, 6, 31, 9, 7);
  const items = [{ id: "one", time: "08:00" }, { id: "two" }];

  assert.equal(formatMealRegistrationTime(now), "09:07");
  assert.equal(resolveMealRegistrationTime({ open: false, value: "18:45" }, now), "09:07");
  assert.equal(resolveMealRegistrationTime({ open: true, value: "18:45" }, now), "18:45");
  assert.equal(resolveMealRegistrationTime({ open: true, value: "25:99" }, now), "09:07");
  assert.equal(buildMealOccurrenceDateTime("2026-07-15", "18:45", now), "2026-07-15T18:45:00");
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

contractTest("persists image entries before closing and keeps the screen open on failure", async createNutritionTrackerController => {
  const { completeImageMealRegistration } = createController(createNutritionTrackerController);
  const calls = [];
  const savedLog = { Lunch: [{ id: "image-1" }] };
  const result = await completeImageMealRegistration({
    buildRegistration: selection => {
      calls.push(["build", selection]);
      return { meal: "Lunch", items: [{ id: "image-1" }] };
    },
    estimate: { items: [{}] },
    meal: "Lunch",
    time: "13:10",
    saveMealRegistration: async (meal, items) => {
      calls.push(["save", meal, items]);
      return savedLog;
    },
    closeMealRegistration: async () => {
      calls.push(["close"]);
      return true;
    }
  });
  assert.equal(result, savedLog);
  assert.deepEqual(calls.map(call => call[0]), ["build", "save", "close"]);

  let closeCalls = 0;
  await assert.rejects(completeImageMealRegistration({
    buildRegistration: () => ({ meal: "Lunch", items: [{ id: "image-1" }] }),
    estimate: { items: [{}] },
    meal: "Lunch",
    time: "13:10",
    saveMealRegistration: async () => null,
    closeMealRegistration: async () => { closeCalls += 1; return true; }
  }), /image-meal-persistence-failed/);
  assert.equal(closeCalls, 0);
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
    const block = source.slice(start, nextStart);
    const appliesTime = functionName === "confirmMealReview"
      ? block.includes("applyMealRegistrationTime(mealReview.items, mealReview.registrationTime)")
      : block.includes("applySelectedMealTime");
    assert.ok(appliesTime, `${functionName} must apply the shared registration time`);
  });
});

contractTest("freezes the real meal occurrence across review, reevaluation, and persistence", createNutritionTrackerController => {
  const { NutritionTracker } = createController(createNutritionTrackerController);
  const source = NutritionTracker.toString();
  const reviewStart = source.indexOf("function openMealReview");
  const confirmStart = source.indexOf("async function confirmMealReview", reviewStart);
  const reviewBlock = source.slice(reviewStart, confirmStart);
  assert.match(reviewBlock, /buildMealOccurrenceDateTime\(viewDate, registrationTime, evaluatedAt\)/);
  assert.match(reviewBlock, /evaluateMealItems\(candidateItems, mealOccurredAt, evaluatedAt\)/);
  assert.match(source, /registrationTime: mealReview\.registrationTime[\s\S]*mealOccurredAt: mealReview\.mealOccurredAt/);
  assert.match(source, /applyMealRegistrationTime\(mealReview\.items, mealReview\.registrationTime\)/);
});

contractTest("describes the five-gram nutrient target as salt in English goal notifications", createNutritionTrackerController => {
  const source = createNutritionTrackerController.toString();
  assert.match(source, /Salt limit reached/);
  assert.doesNotMatch(source, /Sodium (?:limit|reached|notice|is|target)/);
});

contractTest("assigns stable daily-entry IDs and routes list changes through idempotent mutations", createNutritionTrackerController => {
  const { NutritionTracker } = createController(createNutritionTrackerController);
  const source = NutritionTracker.toString();

  assert.match(source, /createEntryId: \(\) => window\.DailyEntryModel\.createIdempotentEntryId\(\)/);
  assert.match(source, /setWaterIntake\(previous => window\.DailyEntryModel\.applyEntryListMutation/);
  assert.match(source, /setSuppLog\(previous => window\.DailyEntryModel\.applyEntryListMutation/);
  assert.match(source, /const nextLog = window\.DailyEntryModel\.applyMealLogMutation/);
  assert.match(source, /setActiveLog\(previous => window\.DailyEntryModel\.applyMealLogMutation/);
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
  const imageSave = functionBlock("saveImageMealRegistration", "// Pantry");

  assert.ok(suggestion.indexOf("captureMealRegistrationOrigin()") < suggestion.indexOf('openTab("adicionar")'));
  assert.ok(openAdd.indexOf("captureMealRegistrationOrigin()") < openAdd.indexOf('openTab("adicionar")'));
  assert.match(close, /if \(mealRegistrationSavingRef\.current\) return false/);
  assert.match(close, /origin\.viewDate !== viewDate/);
  assert.match(close, /pendingScrollRestoreRef\.current = origin\.scrollY/);
  assert.match(close, /openTab\(origin\.tab, \{ skipTutorial: true, fromBack: true \}\)/);
  assert.match(save, /await persistMealRegistration/);
  assert.match(save, /return setActiveLog\(previous => window\.DailyEntryModel\.applyMealLogMutation/);
  const functionalUpdate = save.indexOf("return setActiveLog(previous");
  assert.ok(save.indexOf("await dailyEntryPersistence.persist") < functionalUpdate);
  assert.ok(save.indexOf("await persistMealRegistration") < functionalUpdate);
  assert.match(save, /catch \(_\)/);
  assert.match(save, /return null/);
  assert.match(imageSave, /completeImageMealRegistration/);
  assert.match(imageSave, /buildRegistration: imageMealFeature\.buildRegistration/);
  assert.match(imageSave, /saveMealRegistration/);
  assert.match(imageSave, /closeMealRegistration/);
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

contractTest("uses the reusable ChoiceField for the image meal category", createNutritionTrackerController => {
  const { NutritionTracker } = createController(createNutritionTrackerController);
  const source = NutritionTracker.toString();
  const start = source.indexOf("React.createElement(ChoiceField", source.indexOf("data-image-meal-registration-options"));
  const end = source.indexOf("imageMealFeature.ImageMealScreen", start);
  const fieldBlock = source.slice(start, end);

  assert.ok(start >= 0);
  assert.match(fieldBlock, /React\.createElement\(ChoiceField/);
  assert.match(fieldBlock, /options: MEALS\.map/);
  assert.match(fieldBlock, /onChange: value => setStaged/);
  assert.doesNotMatch(fieldBlock, /React\.createElement\("select"/);
});

contractTest("wires the image flow into Add navigation without changing its persistence contract", createNutritionTrackerController => {
  const { NutritionTracker } = createController(createNutritionTrackerController);
  const source = NutritionTracker.toString();
  const openStart = source.indexOf("function openImageMealMode");
  const openEnd = source.indexOf("useEffect(() => () =>", openStart);
  const closeStart = source.indexOf("function closeImageMealMode");
  const closeEnd = source.indexOf("function openImageMealMode", closeStart);
  const openBlock = source.slice(openStart, openEnd);
  const closeBlock = source.slice(closeStart, closeEnd);

  assert.ok(openStart >= 0);
  assert.match(openBlock, /imageMealFeature\.createFlow/);
  assert.match(openBlock, /saveImageMealRegistration/);
  assert.match(openBlock, /resolveMealRegistrationTime/);
  assert.match(openBlock, /setImageMealOpen\(true\)/);
  assert.match(closeBlock, /flow\.destroy\(\)/);
  assert.match(source, /mode === "image"/);
  assert.match(source, /data-image-meal-registration-options/);
  assert.match(source, /imageMealFeature\.ImageMealScreen/);
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
        "createEntryId: () => window.DailyEntryModel.createIdempotentEntryId()",
        "getEntryTime: () => new Date().toTimeString().slice(0,5)",
        "getPantry: () => pantry",
        "buildDayTotals"
      ]
    },
    {
      factory: "SavedMealCardModule.createSavedMealCard",
      dependencies: ["React", "pickLang", "templateEntries", "templateTotals", "templateItemEntry", "ChoiceField"]
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
        "createEntryId: () => window.DailyEntryModel.createIdempotentEntryId()"
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
