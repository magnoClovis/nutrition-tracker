const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createDiaryScreen } = require("../../diary-screen.js");

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

const { DiaryScreen } = createDiaryScreen({
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
  GaResultCard
});

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

test("renders meals, water, supplements, notes, and the opaque legacy tail", () => {
  const view = DiaryScreen(baseProps());
  const content = textContent(view);

  assert.match(content, /Rice/);
  assert.match(content, /500ml/);
  assert.match(content, /Creatine/);
  assert.equal(findNodes(view, node => node.type === "textarea")[0].props.value, "Remember vegetables");
  assert.equal(findNodes(view, node => node.props && node.props["data-opaque-tail"]).length, 1);
});

test("historical navigation remains callback-driven and keeps current supplements visible", () => {
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
  previous.props.onClick();
  next.props.onClick();

  assert.deepEqual(dates, ["2026-07-19", "2026-07-21"]);
  assert.match(textContent(view), /Creatine/);
  assert.doesNotMatch(textContent(view), /500ml/);
});

test("active GA result delegates execution, evaluation, and diary insertion callbacks", () => {
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

test("daily feedback remains controlled and no meal-review modal is invented", () => {
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

test("ticker delegates gestures without owning its timers", () => {
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
