const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const { createDateUtils } = require("../../date-utils.js");
const { createMetricsScreen } = require("../../metrics-screen.js");

function BodyMetricChart() { return null; }
function WeightTrendChart() { return null; }
function BmrTrendChart() { return null; }
function BodyFatTrendChart() { return null; }

const { pickLang, normalizeLanguage, localeForLang } = createI18n();
const { formatDateDMY } = createDateUtils({ normalizeLanguage, pickLang, localeForLang });
const { MetricsScreen } = createMetricsScreen({
  React,
  pickLang,
  formatDateDMY,
  BodyMetricChart,
  WeightTrendChart,
  BmrTrendChart,
  BodyFatTrendChart
});

const copy = {
  customGoals: "Custom goals",
  editGoals: "Edit goals",
  protein: "Protein",
  calories: "Calories",
  kcalUnit: "kcal",
  carbs: "Carbs",
  fat: "Fat",
  fiber: "Fiber",
  salt: "Salt",
  water: "Water",
  logMeasurements: "Log measurements",
  weightPh: "Weight",
  heightPh: "Height",
  suppLogToday: "Save measurement",
  weight: "Weight",
  heightLabel: "Height",
  bmiUnderweight: "Underweight",
  bmiNormal: "Normal",
  bmiOverweight: "Overweight",
  bmiObese: "Obese",
  goalProtTrain: "Training protein",
  goalProtRest: "Rest protein",
  goalKcalTrain: "Training calories",
  goalKcalRest: "Rest calories",
  bmi: "BMI",
  editItem: "Edit",
  noWeightData: "No weight data"
};
const text = key => copy[key] || key;

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
  return {
    lang: "en",
    isMobileView: false,
    metricsSection: "tracking",
    setMetricsSection() {},
    text,
    activityLevels: {
      moderate: {
        pt: "Moderado", en: "Moderate", es: "Moderado",
        descPt: "Ativo", descEn: "Active", descEs: "Activo"
      }
    },
    nutritionPrefs: {
      activityLevel: "moderate",
      goalType: "maintenance",
      goalKg: "",
      goalWeeks: "",
      manualAdjustment: "",
      proteinMultiplier: "",
      bodyFatGoal: ""
    },
    saveNutritionPrefs() {},
    profileData: { height: "175", birthDate: "1990-01-01", gender: "male" },
    saveProfileHeight() {},
    currentHeight: 175,
    bodyComposition: {
      currentFatPct: null,
      latest: null,
      measured: [],
      targetPct: null,
      fatKg: null,
      leanMassKg: null,
      weightTarget: null,
      fatToLose: 0,
      weeksRemaining: null,
      fatChartData: []
    },
    updateBodyFatGoalTarget() {},
    bodyFatGoalAutoKg: "",
    baseGoals: {
      bmr: 1650, protein: 120, kcal: 2200, carbs: 250,
      fat: 70, fiber: 30, salt: 5, water: 2500
    },
    calorieBase: 2200,
    calorieAdjustment: 0,
    goals: {
      protein: 120, kcal: 2200, carbs: 250,
      fat: 70, fiber: 30, salt: 5, water: 2500
    },
    automaticGoalAdjustment: 0,
    automaticProteinMultiplier: "1.6",
    editingGoals: false,
    saveGoals() {},
    startEditGoals() {},
    goalDraft: {},
    setGoalDraft() {},
    customGoals: {},
    calorieAdjustmentWarning: "",
    weightForm: {
      weight: "",
      height: "",
      bodyFatPct: "",
      waistCm: "",
      muscleMassKg: "",
      date: "2026-07-23"
    },
    setWeightForm() {},
    currentWeight: null,
    today: "2026-07-23",
    saveWeight() {},
    bmi: null,
    bmiNum: null,
    currentBmr: null,
    currentTrainingGoals: { protein: 120, kcal: 2200 },
    currentRestGoals: { protein: 110, kcal: 1900 },
    weightChartData: [],
    bmrChartData: [],
    bodyMetricChartConfigs: [],
    chartTheme: { bg: "#fff", tick: "#555", border: "#ddd", label: "#777" },
    bodyMetrics: { hasWeightHistory: false },
    normalizedWeightEntries: [],
    editingWeightId: null,
    editWeightForm: {
      weight: "", height: "", bodyFatPct: "",
      waistCm: "", muscleMassKg: "", date: ""
    },
    setEditWeightForm() {},
    expandedWeightHistoryIds: {},
    setExpandedWeightHistoryIds() {},
    historyFieldAvailability: {
      bmi: false, bodyFatPct: false, muscleMassKg: false, waistCm: false
    },
    saveWeightEdit() {},
    startEditWeight() {},
    setWeightHistory() {},
    weightHistory: [],
    bodyCompositionOpen: false,
    setBodyCompositionOpen() {},
    bodyGoalForm: { currentFatPct: "", targetFatPct: "", weeks: "" },
    setBodyGoalForm() {},
    suggestedBodyGoalWeeks: "",
    saveBodyFatGoal() {},
    weeklyProgress: {
      plannedWeek: 0, deficit: 0, surplus: 0, adherence: 0, days: 0
    },
    weightTrend: {
      hasEnough: false, weeklyRate: 0, weeksRemaining: null, avg14: null
    },
    metricsProgressOpen: false,
    setMetricsProgressOpen() {},
    metricsProgressInfoOpen: false,
    setMetricsProgressInfoOpen() {},
    reportsEnabled: false,
    onOpenAdvancedReports() {},
    ...overrides
  };
}

test("renders complete goal profile and delegates profile decisions", () => {
  const saved = [];
  let height;
  let fatTarget;
  const props = baseProps({
    metricsSection: "goals",
    nutritionPrefs: {
      activityLevel: "moderate",
      goalType: "loss",
      goalKg: "5",
      goalWeeks: "10",
      manualAdjustment: "-300",
      proteinMultiplier: "1.8",
      bodyFatGoal: "14"
    },
    bodyComposition: {
      ...baseProps().bodyComposition,
      currentFatPct: 20,
      fatToLose: 4,
      targetPct: 14
    },
    bodyFatGoalAutoKg: 4,
    calorieAdjustment: -300,
    calorieAdjustmentWarning: "This is a high adjustment.",
    saveNutritionPrefs: value => saved.push(value),
    saveProfileHeight: value => { height = value; },
    updateBodyFatGoalTarget: value => { fatTarget = value; }
  });
  const screen = MetricsScreen(props);
  const rendered = textContent(screen);
  assert.match(rendered, /Nutrition profile/);
  assert.match(rendered, /Final target2200 kcal/);
  assert.match(rendered, /This is a high adjustment/);

  const activity = findNodes(
    screen,
    node => node.type === "select" && node.props.value === "moderate"
  )[0];
  activity.props.onChange({ target: { value: "moderate" } });
  const profileHeight = findNodes(
    screen,
    node => node.type === "input" && node.props.value === "175"
  )[0];
  profileHeight.props.onChange({ target: { value: "180" } });
  const targetInput = findNodes(
    screen,
    node => node.type === "input" && node.props.value === "14"
  )[0];
  targetInput.props.onChange({ target: { value: "13" } });

  assert.equal(saved[0].activityLevel, "moderate");
  assert.equal(height, "180");
  assert.equal(fatTarget, "13");
});

test("renders and delegates the custom-goal and hidden body-goal editors", () => {
  let goalPatch;
  let goalsSaved = 0;
  let bodyPatch;
  let bodySaved = 0;
  const screen = MetricsScreen(baseProps({
    metricsSection: "goals",
    editingGoals: true,
    goalDraft: { protein: "140" },
    setGoalDraft: updater => { goalPatch = updater({ protein: "140" }); },
    saveGoals: () => { goalsSaved += 1; },
    bodyCompositionOpen: true,
    bodyGoalForm: { currentFatPct: "20", targetFatPct: "15", weeks: "12" },
    suggestedBodyGoalWeeks: 10,
    setBodyGoalForm: updater => { bodyPatch = updater({ currentFatPct: "20" }); },
    saveBodyFatGoal: () => { bodySaved += 1; }
  }));
  const proteinDraft = findNodes(
    screen,
    node => node.type === "input" && node.props.value === "140"
  )[0];
  proteinDraft.props.onChange({ target: { value: "145" } });
  findNodes(screen, node => node.type === "button" && textContent(node) === "Save")[0].props.onClick();

  const bodyFatCurrent = findNodes(
    screen,
    node => node.type === "input" && node.props.value === "20"
  )[0];
  bodyFatCurrent.props.onChange({ target: { value: "21" } });
  findNodes(
    screen,
    node => node.type === "button" && textContent(node) === "Save body-fat goal"
  )[0].props.onClick();

  assert.equal(goalPatch.protein, "145");
  assert.equal(goalsSaved, 1);
  assert.equal(bodyPatch.currentFatPct, "21");
  assert.equal(bodySaved, 1);
  assert.match(textContent(screen), /Suggested healthy pace: about 10 weeks/);
});

test("preserves absent tracking data and complete history/chart presentation", () => {
  const empty = MetricsScreen(baseProps());
  assert.match(textContent(empty), /No weight data/);
  assert.doesNotMatch(textContent(empty), /Current metrics/);

  const entry = {
    id: "measurement-1",
    date: "2026-07-22",
    weight: 70,
    height: 175,
    bodyFatPct: 18,
    waistCm: 80,
    muscleMassKg: 55,
    bmr: 1650
  };
  const completeProps = baseProps({
    currentWeight: 70,
    currentBmr: 1650,
    bmi: "22.9",
    bmiNum: 22.9,
    bodyMetrics: { hasWeightHistory: true },
    normalizedWeightEntries: [entry],
    weightHistory: [entry],
    expandedWeightHistoryIds: { "2026-07-22": true },
    historyFieldAvailability: {
      bmi: true, bodyFatPct: true, muscleMassKg: true, waistCm: true
    },
    bodyComposition: {
      currentFatPct: 18,
      latest: entry,
      measured: [entry],
      targetPct: 15,
      fatKg: 12.6,
      leanMassKg: 57.4,
      weightTarget: 67.5,
      fatToLose: 2.5,
      weeksRemaining: 8,
      fatChartData: [{ label: "22/07", bodyFatPct: 18 }]
    },
    bodyMetricChartConfigs: [{
      key: "bodyFatPct",
      title: "Body fat",
      label: "Body fat",
      unit: "%",
      color: "#c86e8e",
      data: [{ date: "22/07", value: 18 }]
    }],
    weeklyProgress: {
      plannedWeek: 2100, deficit: 1800, surplus: 0, adherence: 86, days: 6
    },
    weightTrend: {
      hasEnough: true, weeklyRate: -0.4, weeksRemaining: 8, avg14: 70.2
    },
    bodyCompositionOpen: true,
    metricsProgressOpen: true
  });
  const complete = MetricsScreen(completeProps);
  const rendered = textContent(complete);
  assert.match(rendered, /Current metrics/);
  assert.match(rendered, /22\.9Normal/);
  assert.match(rendered, /Body composition/);
  assert.match(rendered, /Progress and forecast/);
  assert.equal(findNodes(complete, node => node.type === WeightTrendChart).length, 1);
  assert.equal(findNodes(complete, node => node.type === BmrTrendChart).length, 1);
  assert.equal(findNodes(complete, node => node.type === BodyMetricChart).length, 1);
  assert.equal(findNodes(complete, node => node.type === BodyFatTrendChart).length, 1);
});

test("keeps the advanced-reports card disabled or callback-only without a modal", () => {
  let opened = 0;
  const disabled = MetricsScreen(baseProps({ reportsEnabled: false }));
  const disabledButton = findNodes(
    disabled,
    node => node.type === "button" && textContent(node) === "Under maintenance"
  )[0];
  assert.equal(disabledButton.props.disabled, true);

  const enabledProps = baseProps({
    reportsEnabled: true,
    onOpenAdvancedReports: () => { opened += 1; }
  });
  const enabled = MetricsScreen(enabledProps);
  const generate = findNodes(
    enabled,
    node => node.type === "button" && textContent(node) === "Generate report"
  )[0];
  generate.props.onClick();
  assert.equal(opened, 1);
  assert.equal(findNodes(enabled, node => node.props.role === "dialog").length, 0);
  assert.doesNotMatch(textContent(enabled), /Report generated|Report format|Download report/);
  assert.equal(textContent(MetricsScreen(enabledProps)), textContent(enabled));
});
