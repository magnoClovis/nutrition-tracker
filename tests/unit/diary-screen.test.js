const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const MealScore = require("../../meal-score.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../diary-screen.js"))],
  ["ESM", () => import("../../src/components/diary-screen.js")]
];

function Ring() {
  return React.createElement("span", { "data-test-ring": true });
}

function Bar({ label }) {
  return React.createElement("span", { "data-test-bar": label }, label);
}

function GaResultCard({ result, onAdd, evaluateMealItems }) {
  return React.createElement("div", { "data-test-ga-result": result.id },
    React.createElement("button", { onClick: () => onAdd(result) }, "Add GA result"),
    React.createElement("button", { onClick: () => evaluateMealItems(result.items) }, "Evaluate GA result")
  );
}

function ChoiceField() {
  return null;
}
function SearchableChoiceField() {
  return null;
}

const labels = {
  water: "Water",
  suppTitle: "Supplements",
  notesTitle: "Notes",
  notesPlaceholder: "Write a note",
  analyzeDayBtn: "Analyze day",
  savedNote: "Save as note",
  noRecords: "No records",
  protein: "Protein",
  calories: "Calories",
  carbs: "Carbs",
  fat: "Fat",
  fiber: "Fiber",
  salt: "Salt",
  satfat: "Saturated fat",
  sugars: "Sugars",
  kcalUnit: "kcal",
  currentGoal: "Current goal",
  microLabel: "Micronutrients",
  suggesting: "Suggesting",
  suggestBtn: "Suggest meal"
};
const text = key => labels[key] || key;
const noOp = () => {};

function visit(node, callback) {
  if (!node || typeof node !== "object") return;
  callback(node);
  React.Children.toArray(node.props && node.props.children).forEach(child => visit(child, callback));
}

function findNodes(node, predicate) {
  const result = [];
  visit(node, value => {
    if (predicate(value)) result.push(value);
  });
  return result;
}

function textContent(node) {
  const parts = [];
  function collect(value) {
    if (value == null || typeof value === "boolean") return;
    if (typeof value === "string" || typeof value === "number") {
      parts.push(String(value));
      return;
    }
    React.Children.toArray(value.props && value.props.children).forEach(collect);
  }
  collect(node);
  return parts.join("");
}

function baseProps(overrides = {}) {
  const meal = "Lunch";
  const entry = {
    id: "entry-1",
    name: "Rice",
    qty: 100,
    unit: "g",
    protein: 4,
    kcal: 130,
    time: "12:30"
  };
  return {
    section: "content",
    tab: "diario",
    lang: "en",
    isMobileView: false,
    darkMode: false,
    text,
    uiText: (_pt, en) => en,
    tickerPhase: "idle",
    tickerDirection: 1,
    safeTickerIndex: 0,
    activeTickerSlide: { icon: "★", text: "Daily status", tone: "neutral" },
    tickerTimerReset: 0,
    handleTickerPointerDown: noOp,
    handleTickerPointerMove: noOp,
    finishTickerPointer: noOp,
    tickerToneColor: "#333",
    tickerDragOffset: 0,
    tickerSlides: [{ key: "status", text: "Daily status" }],
    setTickerTimerReset: noOp,
    moveTicker: noOp,
    greetingText: "Good morning!",
    greetingLine: "Keep going.",
    tot: { protein: 40, kcal: 900, carbs: 100, sugars: 0, fat: 25, satfat: 5, fiber: 12, salt: 2 },
    goals: { protein: 100, kcal: 2000, carbs: 220, fat: 70, fiber: 30, salt: 5, water: 2500 },
    remainProtein: 60,
    remainKcal: 1100,
    allEntries: [entry],
    dayProteinPct: 40,
    dayKcalPct: 45,
    openMealSuggestions: noOp,
    gaRunning: false,
    suggestLoading: false,
    showGA: false,
    setShowGA: noOp,
    gaTolerance: 0,
    setGATolerance: noOp,
    gaTargetMeal: meal,
    setGATargetMeal: noOp,
    MEALS: [meal],
    mealLabel: value => value,
    gaUseAll: true,
    setGAUseAll: noOp,
    runGASafely: noOp,
    gaProgress: 0,
    gaResults: [],
    gaHasSearched: false,
    expandMicros: false,
    setExpandMicros: noOp,
    dailyMicros: [],
    hasMicros: false,
    getAutomaticMealSuggestionLimits: () => ({ kcalMax: 500, proteinMax: 35, hoursLeft: 6, timeShare: 0.25 }),
    gaKcalMin: "",
    setGAKcalMin: noOp,
    gaProtMin: "",
    setGAProtMin: noOp,
    gaKcalMax: "",
    setGAKcalMax: noOp,
    gaProtMax: "",
    setGAProtMax: noOp,
    gaFoodSearch: "",
    setGAFoodSearch: noOp,
    pantry: [{ id: "food-1", name: "Rice", kcal100: 130, protein100: 4 }],
    gaSelIds: {},
    setGASelIds: noOp,
    gaAdvancedOpen: false,
    setGAAdvancedOpen: noOp,
    gaGlobalMax: 5,
    setGAGlobalMax: noOp,
    gaUseProtTol: false,
    setGAUseProtTol: noOp,
    gaProtTolerance: 20,
    setGAProtTolerance: noOp,
    activeLog: { [meal]: [entry] },
    evaluateMealItems: noOp,
    mealScoreBrief: () => "",
    mealScoreEvaluationText: () => "",
    mealScoreLabel: value => ({ protein: "Protein", kcal: "Calories", fiber: "Fiber", salt: "Salt" })[value] || value,
    addGAResultToDiary: noOp,
    TODAY: "2026-07-23",
    diaryStatus: { tone: "neutral", title: "Day started", detail: "Keep logging" },
    dateLabel: value => value,
    viewDate: "2026-07-23",
    calendarOpen: false,
    setCalendarOpen: noOp,
    changeViewDate: noOp,
    setCalendarMonth: noOp,
    calendarMonth: "2026-07",
    calendarData: {},
    calendarLoading: false,
    isToday: true,
    viewWeight: 70,
    isTraining: true,
    totalWater: 500,
    waterExpanded: false,
    setWaterExpanded: noOp,
    editWaterGoal: false,
    setEditWaterGoal: noOp,
    waterGoalInput: "",
    setWaterGoalInput: noOp,
    setWaterGoal: noOp,
    addWater: noOp,
    waterCustomPreset: 750,
    configureWaterCustomPreset: noOp,
    waterInput: "",
    setWaterInput: noOp,
    waterIntake: [{ id: "water-1", ml: 500, time: "09:00" }],
    removeWater: noOp,
    suppLog: [{ id: "supp-1", name: "Creatine", dose: 5, unit: "g", time: "08:00" }],
    removeSuppLog: noOp,
    entryMenuId: null,
    editEntryId: null,
    editEntryQty: "",
    setEditEntryQty: noOp,
    saveEntryEdit: noOp,
    setEditEntryId: noOp,
    openAddForMeal: noOp,
    setEntryMenuId: noOp,
    detailFood: null,
    setDetailFood: noOp,
    diaryMealEvaluationDetail: null,
    setDiaryMealEvaluationDetail: noOp,
    startEditEntry: noOp,
    duplicateEntry: noOp,
    removeEntry: noOp,
    notesOpen: true,
    setNotesOpen: noOp,
    todayNote: "Remember vegetables",
    historyNote: "",
    setTodayNote: noOp,
    setHistoryNote: noOp,
    suppPantry: [{ id: "supp-food", name: "Creatine", dose: 5, unit: "g" }],
    showSuppAdd: false,
    setShowSuppAdd: noOp,
    suppAddId: "",
    setSuppAddId: noOp,
    suppAddDose: "",
    setSuppAddDose: noOp,
    logSupp: noOp,
    feedbackLoading: false,
    feedbackPeriod: "",
    generateFeedback: noOp,
    feedbackText: "",
    feedbackSaved: false,
    saveFeedbackAsNote: noOp,
    setTab: noOp,
    opaqueTrailingNode: React.createElement("div", { "data-opaque-tail": true }),
    ...overrides
  };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createDiaryScreen } = await load();
      const api = createDiaryScreen({
        React,
        pickLang: (lang, pt, en, es) => lang === "en" ? en : lang === "es" ? es : pt,
        sortLocaleForLang: () => "en",
        localeForLang: () => "en-US",
        addDays: (date, amount) => {
          const value = new Date(date + "T12:00:00");
          value.setDate(value.getDate() + amount);
          return value.toISOString().slice(0, 10);
        },
        monthDays: () => [],
        shiftMonth: value => value,
        calendarMonthStats: () => ({
          registered: 0,
          proteinDays: 0,
          avgKcalMonth: 0,
          avgProteinMonth: 0,
          kcalOverDays: 0
        }),
        Ring,
        Bar,
        GaResultCard,
        ChoiceField,
        SearchableChoiceField,
        collectValidMealEvaluationGroups: MealScore.collectValidMealEvaluationGroups
      });
      return callback(api.DiaryScreen, api);
    });
  });
}

contractTest("renders meals, water, supplements, notes, and the opaque legacy tail", DiaryScreen => {
  const view = DiaryScreen(baseProps());
  const content = textContent(view);

  assert.match(content, /Rice/);
  assert.match(content, /500 \/ 2500 ml/);
  assert.match(content, /Creatine/);
  assert.equal(findNodes(view, node => node.type === "textarea")[0].props.value, "Remember vegetables");
  assert.equal(findNodes(view, node => node.props && node.props["data-opaque-tail"]).length, 1);
});

contractTest("keeps water compact by default with only summary and thin progress visible", DiaryScreen => {
  let toggle = null;
  const view = DiaryScreen(baseProps({
    waterExpanded: false,
    setWaterExpanded: updater => { toggle = updater; }
  }));
  const summary = findNodes(
    view,
    node => node.props?.["data-water-summary"] === "true"
  )[0];
  const progress = findNodes(
    view,
    node => node.props?.["data-water-progress"] === "true"
  )[0];

  assert.equal(summary.props["aria-expanded"], false);
  assert.match(textContent(summary), /Water500 \/ 2500 ml/);
  assert.equal(progress.props.style.height, 4);
  assert.equal(progress.props.style.marginBottom, 0);
  assert.equal(findNodes(view, node => node.props?.["data-water-details"] === "true").length, 0);
  assert.doesNotMatch(textContent(view), /150ml|other value in ml|500ml 09:00/);
  summary.props.onClick();
  assert.equal(typeof toggle, "function");
  assert.equal(toggle(false), true);
});

contractTest("expands all existing water controls and delegates their actions", DiaryScreen => {
  const added = [];
  const removed = [];
  let configured = 0;
  let customValue = null;
  let goalValue = null;
  let goalDraft = null;
  const editChanges = [];
  const view = DiaryScreen(baseProps({
    waterExpanded: true,
    editWaterGoal: true,
    waterGoalInput: "3000",
    addWater: value => added.push(value),
    removeWater: id => removed.push(id),
    configureWaterCustomPreset: () => { configured += 1; },
    setWaterInput: value => { customValue = value; },
    setWaterGoal: value => { goalValue = value; },
    setWaterGoalInput: value => { goalDraft = value; },
    setEditWaterGoal: updater => { editChanges.push(updater); }
  }));
  const summary = findNodes(view, node => node.props?.["data-water-summary"] === "true")[0];
  const details = findNodes(view, node => node.props?.["data-water-details"] === "true")[0];
  const goalInput = findNodes(details, node => node.props?.["data-water-goal-input"] === "true")[0];
  const customInput = findNodes(details, node => node.props?.["data-water-custom-value"] === "true")[0];
  const quick150 = findNodes(details, node => node.props?.["data-water-quick"] === 150)[0];
  const quickCustom = findNodes(details, node => node.props?.["data-water-quick"] === 750)[0];
  const configure = findNodes(details, node => node.props?.["data-water-configure"] === "true")[0];
  const addCustom = findNodes(details, node => node.props?.["data-water-add-custom"] === "true")[0];
  const remove = findNodes(details, node => node.props?.["data-water-remove"] === "water-1")[0];
  const adjustGoal = findNodes(
    details,
    node => node.type === "button" && node.props?.["aria-label"] === "Adjust water goal"
  )[0];
  const confirmGoal = findNodes(details, node => node.type === "button" && textContent(node) === "ok")[0];

  assert.equal(summary.props["aria-expanded"], true);
  assert.ok(details);
  assert.match(textContent(details), /150ml/);
  assert.match(textContent(details), /500ml 09:00/);
  quick150.props.onClick();
  quickCustom.props.onClick();
  configure.props.onClick();
  customInput.props.onChange({ target: { value: "425" } });
  addCustom.props.onClick();
  remove.props.onClick();
  adjustGoal.props.onClick();
  confirmGoal.props.onClick();

  assert.deepEqual(added, [150, 750, undefined]);
  assert.deepEqual(removed, ["water-1"]);
  assert.equal(configured, 1);
  assert.equal(customValue, "425");
  assert.equal(goalValue, 3000);
  assert.equal(goalDraft, "");
  assert.equal(editChanges[0](false), true);
  assert.equal(editChanges[1], false);
  assert.equal(goalInput.props.value, "3000");
});

contractTest("orders visible meal categories by their oldest valid entry time", (_DiaryScreen, api) => {
  const meals = ["Breakfast", "Lunch", "Snack", "Dinner", "Other"];
  const activeLog = {
    Breakfast: [{ id: "breakfast-legacy" }],
    Lunch: [
      { id: "lunch-late", time: "13:15" },
      { id: "lunch-early", time: "12:05" }
    ],
    Snack: [],
    Dinner: [{ id: "dinner", time: "19:30" }],
    Other: [{ id: "other-invalid", time: "25:00" }]
  };

  assert.deepEqual(api.getVisibleMealCategories(meals, activeLog), [
    "Lunch",
    "Dinner",
    "Breakfast",
    "Other"
  ]);
  assert.deepEqual(api.getVisibleMealCategories(meals, {
    Breakfast: [{ time: "08:00" }],
    Lunch: [{ time: "08:00" }]
  }), ["Breakfast", "Lunch"]);
});

contractTest("shows one centered global Add button and no cards on an empty day", DiaryScreen => {
  const openedMeals = [];
  const meals = ["Breakfast", "Lunch", "Dinner"];
  const view = DiaryScreen(baseProps({
    MEALS: meals,
    activeLog: { Breakfast: [], Lunch: [], Dinner: [] },
    allEntries: [],
    openAddForMeal: meal => openedMeals.push(meal)
  }));
  const globalAdd = findNodes(
    view,
    node => node.props?.["data-diary-global-add"] === "empty-day"
  )[0];
  const addButtons = findNodes(
    view,
    node => node.type === "button" && node.props?.["data-tutorial"] === "open-log-sheet"
  );

  assert.equal(findNodes(view, node => node.props?.["data-diary-meal-card"] === "true").length, 0);
  assert.equal(globalAdd.props.style.justifyContent, "center");
  assert.equal(addButtons.length, 1);
  assert.equal(textContent(addButtons[0]), "+ Add");
  addButtons[0].props.onClick();
  assert.deepEqual(openedMeals, ["Breakfast"]);
});

contractTest("renders filled categories chronologically after the sole global Add button", DiaryScreen => {
  const meals = ["Breakfast", "Lunch", "Dinner"];
  const activeLog = {
    Breakfast: [{ id: "breakfast", name: "Oats", qty: 1, unit: "un", time: "09:00" }],
    Lunch: [],
    Dinner: [{ id: "dinner", name: "Soup", qty: 1, unit: "un", time: "08:30" }]
  };
  const view = DiaryScreen(baseProps({
    MEALS: meals,
    activeLog,
    allEntries: [...activeLog.Breakfast, ...activeLog.Dinner]
  }));
  const globalAdd = findNodes(
    view,
    node => node.props?.["data-diary-global-add"] === "with-meals"
  )[0];
  const cards = findNodes(
    view,
    node => node.props?.["data-diary-meal-card"] === "true"
  );
  const addButtons = findNodes(
    view,
    node => node.type === "button" && node.props?.["data-tutorial"] === "open-log-sheet"
  );
  const mealLayout = findNodes(
    view,
    node => node.props?.["data-diary-global-add"]
      || node.props?.["data-diary-meal-card"] === "true"
  );

  assert.equal(globalAdd.props.style.justifyContent, "flex-start");
  assert.deepEqual(cards.map(card => card.props["data-diary-meal"]), ["Dinner", "Breakfast"]);
  assert.equal(mealLayout[0].props["data-diary-global-add"], "with-meals");
  assert.deepEqual(
    mealLayout.slice(1).map(card => card.props["data-diary-meal"]),
    ["Dinner", "Breakfast"]
  );
  assert.equal(addButtons.length, 1);
  cards.forEach(card => {
    assert.equal(findNodes(
      card,
      node => node.type === "button" && node.props?.["data-tutorial"] === "open-log-sheet"
    ).length, 0);
  });
});

contractTest("renders one accepted-assessment badge per valid evaluation group", DiaryScreen => {
  const snapshot = {
    algorithmVersion: "meal-score-v2",
    score: 4.25,
    coverage: 0.9,
    confidence: "high",
    provisional: false,
    provisionalReasons: [],
    components: {
      protein: { key: "protein", available: true, score: 0.9 }
    }
  };
  const entries = [
    { id: "a", name: "Rice", qty: 100, unit: "g", protein: 4, kcal: 130, mealEvaluationId: "review-1", mealScoreSnapshot: snapshot },
    { id: "b", name: "Beans", qty: 100, unit: "g", protein: 8, kcal: 120, mealEvaluationId: "review-1", mealScoreSnapshot: snapshot },
    { id: "c", name: "Salad", qty: 80, unit: "g", protein: 1, kcal: 30 }
  ];
  let opened = null;
  const view = DiaryScreen(baseProps({
    activeLog: { Lunch: entries },
    allEntries: entries,
    setDiaryMealEvaluationDetail: value => { opened = value; }
  }));
  const badges = findNodes(view, node => node.props?.["data-meal-evaluation-badge"]);
  assert.equal(badges.length, 1);
  assert.equal(textContent(badges[0]), "★ 4.25/5 · Well aligned");
  badges[0].props.onClick();
  assert.equal(opened.evaluationId, "review-1");
  assert.deepEqual(opened.entryIds, ["a", "b"]);
  assert.equal(opened.meal, "Lunch");
});

contractTest("hides malformed or inconsistent stored evaluation groups", DiaryScreen => {
  const first = { algorithmVersion: "meal-score-v2", score: 4.25 };
  const second = { algorithmVersion: "meal-score-v2", score: 2.5 };
  const entries = [
    { id: "a", name: "Rice", qty: 100, unit: "g", mealEvaluationId: "broken", mealScoreSnapshot: first },
    { id: "b", name: "Beans", qty: 100, unit: "g", mealEvaluationId: "broken", mealScoreSnapshot: second }
  ];
  const view = DiaryScreen(baseProps({ activeLog: { Lunch: entries }, allEntries: entries }));
  assert.equal(findNodes(view, node => node.props?.["data-meal-evaluation-badge"]).length, 0);
});

contractTest("opens accepted assessment as read-only detail and explains provisional coverage", DiaryScreen => {
  let closed = 0;
  const detail = {
    evaluationId: "review-1",
    entryIds: ["a", "b"],
    meal: "Lunch",
    snapshot: {
      algorithmVersion: "meal-score-v2",
      score: 3.75,
      coverage: 0.75,
      confidence: "medium",
      provisional: true,
      provisionalReasons: [{ nutrient: "fiber", scope: "candidate", missingItemCount: 1, totalItemCount: 2 }],
      components: {
        protein: { key: "protein", available: true, score: 0.8 },
        fiber: { key: "fiber", available: false }
      }
    }
  };
  const view = DiaryScreen(baseProps({
    diaryMealEvaluationDetail: detail,
    setDiaryMealEvaluationDetail: value => { if (value === null) closed += 1; }
  }));
  const modal = findNodes(view, node => node.props?.["data-diary-meal-evaluation-modal"] === "true")[0];
  assert.ok(modal);
  const copy = textContent(modal);
  assert.match(copy, /Saved assessment/);
  assert.match(copy, /3\.75/);
  assert.match(copy, /Data confidence: Medium/);
  assert.match(copy, /Coverage: 75%/);
  assert.match(copy, /Provisional score/);
  assert.match(copy, /Fiber: data is missing for 1 of 2 foods in this meal\./);
  assert.equal(/Edit|Log meal|Evaluate meal/.test(copy), false);
  findNodes(modal, node => node.type === "button" && textContent(node) === "Close").at(-1).props.onClick();
  assert.equal(closed, 1);
});

contractTest("centers the Nutrients label and disclosure arrow as one group", DiaryScreen => {
  const view = DiaryScreen(baseProps({ section: "summary" }));
  const button = findNodes(
    view,
    node => node.type === "button" && node.props?.["data-tutorial"] === "microLabel"
  )[0];

  assert.equal(button.props.style.textAlign, "center");
  assert.equal(button.props.style.alignItems, "center");
  assert.equal(button.props.style.justifyContent, "center");
  assert.equal(button.props.style.gap, 6);
  assert.equal(textContent(button), "Nutrients▼");
});

contractTest("historical navigation remains callback-driven and keeps current supplements visible", DiaryScreen => {
  const dates = [];
  const view = DiaryScreen(baseProps({
    isToday: false,
    viewDate: "2026-07-20",
    activeLog: { Lunch: [] },
    allEntries: [],
    changeViewDate: value => dates.push(value)
  }));

  const previous = findNodes(view, node => node.type === "button" && textContent(node) === "‹")[0];
  const next = findNodes(view, node => node.type === "button" && textContent(node) === "›")[0];
  const primaryRow = findNodes(view, node => node.props?.["data-diary-date-primary"] === "true")[0];
  const todayRow = findNodes(view, node => node.props?.["data-diary-today-row"] === "true")[0];
  const todayButton = findNodes(todayRow, node => node.type === "button" && textContent(node) === "Today")[0];

  assert.equal(primaryRow.props.style.display, "grid");
  assert.equal(primaryRow.props.style.gridTemplateColumns, "36px minmax(0, 1fr) 36px");
  assert.equal(todayRow.props.style.display, "flex");
  assert.equal(todayRow.props.style.justifyContent, "center");
  previous.props.onClick();
  next.props.onClick();
  todayButton.props.onClick();

  assert.deepEqual(dates, ["2026-07-19", "2026-07-21", "2026-07-23"]);
  assert.match(textContent(view), /Creatine/);
  assert.doesNotMatch(textContent(view), /500ml/);

  const todayView = DiaryScreen(baseProps());
  assert.equal(findNodes(todayView, node => node.props?.["data-diary-today-row"] === "true").length, 0);
});

contractTest("active GA result delegates execution, evaluation, and diary insertion callbacks", DiaryScreen => {
  let opened = 0;
  let ran = 0;
  let added = null;
  let evaluated = 0;
  const result = { id: "ga-1", items: [{ name: "Rice" }] };
  const view = DiaryScreen(baseProps({
    section: "summary",
    showGA: true,
    gaResults: [result],
    gaHasSearched: true,
    openMealSuggestions: () => { opened += 1; },
    runGASafely: () => { ran += 1; },
    addGAResultToDiary: value => { added = value; },
    evaluateMealItems: () => { evaluated += 1; }
  }));

  findNodes(view, node => node.type === "button" && textContent(node) === "Suggest meal")[0].props.onClick();
  findNodes(view, node => node.type === "button" && textContent(node) === "Find suggestions")[0].props.onClick();
  const card = findNodes(view, node => node.type === GaResultCard)[0];
  card.props.onAdd(result);
  card.props.evaluateMealItems(result.items);

  assert.equal(opened, 1);
  assert.equal(ran, 1);
  assert.equal(added, result);
  assert.equal(evaluated, 1);
});

contractTest("uses the reusable ChoiceField for the GA target meal", DiaryScreen => {
  let selected = null;
  const view = DiaryScreen(baseProps({
    section: "summary",
    showGA: true,
    MEALS: ["Breakfast", "Lunch"],
    gaTargetMeal: "Lunch",
    setGATargetMeal: value => { selected = value; }
  }));
  const field = findNodes(view, node => node.type === ChoiceField)[0];

  assert.equal(field.props.id, "ga-target-meal-choice");
  assert.equal(field.props.value, "Lunch");
  assert.deepEqual(field.props.options, [
    { value: "Breakfast", label: "Breakfast" },
    { value: "Lunch", label: "Lunch" }
  ]);
  field.props.onChange("Breakfast");
  assert.equal(selected, "Breakfast");
});

contractTest("uses the searchable selector for Diary supplements", DiaryScreen => {
  let selected = null;
  const view = DiaryScreen(baseProps({
    section: "content",
    showSuppAdd: true,
    suppPantry: [
      { id: "creatine", name: "Creatine", dose: 5, unit: "g" },
      { id: "vitamin-d", name: "Vitamin D", dose: 1, unit: "caps" }
    ],
    setSuppAddId: value => { selected = value; }
  }));
  const field = findNodes(view, node => node.type === SearchableChoiceField)[0];

  assert.equal(field.props.id, "diary-supplement");
  assert.deepEqual(field.props.options, [
    { value: "creatine", label: "Creatine", description: "Default dose · 5 g" },
    { value: "vitamin-d", label: "Vitamin D", description: "Default dose · 1 caps" }
  ]);
  assert.equal(field.props.resultCountLabel(2), "2 results");
  field.props.onChange("vitamin-d");
  assert.equal(selected, "vitamin-d");
});

contractTest("daily feedback remains controlled and no meal-review modal is invented", DiaryScreen => {
  let generated = null;
  let saved = 0;
  const view = DiaryScreen(baseProps({
    feedbackText: "Daily feedback",
    feedbackPeriod: "day",
    generateFeedback: period => { generated = period; },
    saveFeedbackAsNote: () => { saved += 1; }
  }));

  findNodes(view, node => node.type === "button" && textContent(node) === "Analyze day")[0].props.onClick();
  findNodes(view, node => node.type === "button" && textContent(node) === "Save as note")[0].props.onClick();

  assert.equal(generated, "day");
  assert.equal(saved, 1);
  assert.equal(findNodes(view, node => node.props && node.props["data-meal-review-modal"]).length, 0);
});

contractTest("ticker delegates gestures without owning its timers", DiaryScreen => {
  let pointerDown = 0;
  const view = DiaryScreen(baseProps({
    section: "ticker",
    handleTickerPointerDown: () => { pointerDown += 1; }
  }));

  assert.equal(view.props["data-header-ticker"], "true");
  view.props.onPointerDown({});
  assert.equal(pointerDown, 1);
  assert.match(textContent(view), /Daily status/);
});
