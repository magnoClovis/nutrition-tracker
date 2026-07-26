const test = require("node:test");
const assert = require("node:assert/strict");
const { createI18n } = require("../../i18n.js");
const { createDateUtils } = require("../../date-utils.js");
const { createGoalCalculator } = require("../../goal-calculator.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../body-metrics-model.js"))],
  ["ESM", () => import("../../src/composite/body-metrics-model.js")]
];

const { normalizeLanguage, pickLang, localeForLang } = createI18n();
const { formatDateDM } = createDateUtils({ normalizeLanguage, pickLang, localeForLang });
const { computeGoals } = createGoalCalculator();

function createModel(createBodyMetricsModel, overrides = {}) {
  return createBodyMetricsModel({
    computeGoals,
    formatDateDM,
    createMeasurementId: () => "generated-id",
    ...overrides
  });
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createBodyMetricsModel } = await load();
      return callback({
        createBodyMetricsModel,
        createModel: overrides => createModel(createBodyMetricsModel, overrides)
      });
    });
  });
}

function baseSnapshot(overrides = {}) {
  return {
    weekData: [],
    weightHistory: [],
    currentWeight: 80,
    currentHeight: 180,
    profileData: {
      birthDate: "1990-06-15",
      gender: "male",
      height: 180
    },
    nutritionPrefs: {
      activityLevel: "moderate",
      goalType: "loss",
      goalKg: "5",
      goalWeeks: "10",
      manualAdjustment: "",
      proteinMultiplier: "",
      bodyFatGoal: "20"
    },
    calorieAdjustment: -500,
    today: "2026-07-22",
    ...overrides
  };
}

contractTest("resolves the latest lexical measurement on or before a date", ({ createModel }) => {
  const { getWeightForDate } = createModel();
  const history = [
    { date: "2024-02-10", weight: 80 },
    { date: "2024-01-31", weight: 82 },
    { date: "2024-02-01", weight: 81 }
  ];

  assert.deepEqual(getWeightForDate(history, "2024-02-05"), { date: "2024-02-01", weight: 81 });
  assert.equal(getWeightForDate(history, "2024-01-01"), null);
  assert.throws(() => getWeightForDate(undefined, "2024-02-01"), TypeError);
});

contractTest("parses optional numbers while preserving zero and parseFloat behavior", ({ createModel }) => {
  const { optionalNumber } = createModel();
  assert.equal(optionalNumber(""), null);
  assert.equal(optionalNumber(null), null);
  assert.equal(optionalNumber("not-a-number"), null);
  assert.equal(optionalNumber(Infinity), null);
  assert.equal(optionalNumber("12.5kg"), 12.5);
  assert.equal(optionalNumber("0"), 0);
  assert.equal(optionalNumber(0), 0);
});

contractTest("upserts new and existing measurements with the exact ID priority", ({ createModel }) => {
  let nextId = 0;
  const { upsertWeightEntry } = createModel({
    createMeasurementId: () => `generated-${++nextId}`
  });
  const history = [
    { id: "later", date: "2024-02-02", weight: 80 },
    { id: "earlier", date: "2024-02-01", weight: 81, height: 180 }
  ];

  const inserted = upsertWeightEntry(history, { date: "2024-02-03", weight: 79 });
  assert.deepEqual(inserted.map(entry => entry.date), ["2024-02-01", "2024-02-02", "2024-02-03"]);
  assert.equal(inserted[2].id, "generated-1");

  const updated = upsertWeightEntry(inserted, { id: "replacement", date: "2024-02-01", weight: 80.5 });
  assert.deepEqual(updated[0], { id: "earlier", date: "2024-02-01", weight: 80.5, height: 180 });
  assert.equal(nextId, 1);

  const moved = upsertWeightEntry(updated, { date: "2024-02-02", weight: 78 }, "2024-02-03");
  assert.deepEqual(moved.map(entry => entry.date), ["2024-02-01", "2024-02-02"]);
  assert.equal(moved[1].id, "later");
  assert.equal(moved[1].weight, 78);
});

contractTest("normalizes duplicate dates with the later fields and earlier ID", ({ createModel }) => {
  const { normalizeWeightHistory } = createModel();
  const normalized = normalizeWeightHistory([
    { id: "first-id", date: "2024-02-02", weight: 80, height: 180 },
    { id: "jan", date: "2024-01-01", weight: 82 },
    { id: "later-id", date: "2024-02-02", weight: 79, bodyFatPct: 20 }
  ]);

  assert.deepEqual(normalized, [
    { id: "jan", date: "2024-01-01", weight: 82 },
    { id: "first-id", date: "2024-02-02", weight: 79, height: 180, bodyFatPct: 20 }
  ]);
  assert.deepEqual(normalizeWeightHistory(null), []);
});

contractTest("calculates dated BMR with the production goal calculator and fallbacks", ({ createModel }) => {
  const { calculateBmrForMeasurement } = createModel();
  const context = baseSnapshot();
  const measurementContext = {
    profileData: context.profileData,
    currentHeight: context.currentHeight,
    nutritionPrefs: context.nutritionPrefs,
    today: context.today
  };
  const entry = { date: "2024-02-29", weight: 80, height: 0 };
  const expected = computeGoals(80, true, {
    height: 180,
    birthDate: "1990-06-15",
    gender: "male",
    prefs: context.nutritionPrefs,
    referenceDate: "2024-02-29"
  }).bmr;

  assert.equal(calculateBmrForMeasurement(entry, measurementContext), expected);
  assert.equal(calculateBmrForMeasurement({ weight: 0 }, measurementContext), null);
  assert.equal(calculateBmrForMeasurement(null, measurementContext), null);
});

contractTest("builds weekly averages, calorie bank, deficit and adherence exactly", ({ createModel }) => {
  const { buildBodyMetricsModel } = createModel();
  const model = buildBodyMetricsModel(baseSnapshot({
    weekData: [
      { date: "2026-07-19", hasData: true, isToday: false, protein: 100, kcal: 1500, kcalGoal: 1800, baseCalories: 2000, metProtein: true },
      { date: "2026-07-20", hasData: false, isToday: false, protein: 0, kcal: 0, kcalGoal: 1800, baseCalories: 2000, metProtein: false },
      { date: "2026-07-21", hasData: true, isToday: false, protein: 80, kcal: 2300, kcalGoal: 2200, baseCalories: 2000, metProtein: false },
      { date: "2026-07-22", hasData: true, isToday: true, protein: 120, kcal: 1900, kcalGoal: 2000, baseCalories: 2000, metProtein: true }
    ]
  }));

  assert.deepEqual(model.weeklyAverages, {
    daysWithData: [
      { date: "2026-07-19", hasData: true, isToday: false, protein: 100, kcal: 1500, kcalGoal: 1800, baseCalories: 2000, metProtein: true },
      { date: "2026-07-21", hasData: true, isToday: false, protein: 80, kcal: 2300, kcalGoal: 2200, baseCalories: 2000, metProtein: false },
      { date: "2026-07-22", hasData: true, isToday: true, protein: 120, kcal: 1900, kcalGoal: 2000, baseCalories: 2000, metProtein: true }
    ],
    avgProtein: 100,
    avgKcal: 1900,
    daysMetProtein: 2
  });
  assert.equal(model.calorieBank.days.length, 2);
  assert.equal(model.calorieBank.target, 4000);
  assert.equal(model.calorieBank.consumed, 3800);
  assert.equal(model.calorieBank.balance, 200);
  assert.deepEqual(model.weeklyProgress, {
    days: 2,
    deficit: 500,
    surplus: 300,
    plannedWeek: 3500,
    avgDaily: 250,
    adherence: 14
  });
});

contractTest("uses records rather than days for the 7/14 weight windows", ({ createModel }) => {
  const { buildBodyMetricsModel } = createModel();
  const weightHistory = Array.from({ length: 15 }, (_, index) => ({
    id: String(index + 1),
    date: `2024-01-${String(index + 1).padStart(2, "0")}`,
    weight: index + 1
  }));
  const model = buildBodyMetricsModel(baseSnapshot({ weightHistory, currentWeight: 15 }));

  assert.equal(model.weightTrend.avg7, 12);
  assert.equal(model.weightTrend.avg14, 8.5);
  assert.equal(model.weightTrend.weeklyRate, 7);
  assert.equal(model.weightTrend.hasEnough, true);

  const insufficient = buildBodyMetricsModel(baseSnapshot({
    weightHistory: [{ id: "one", date: "2024-01-01", weight: 70 }],
    currentWeight: 70
  }));
  assert.equal(insufficient.weightTrend.weeklyRate, 0);
  assert.equal(insufficient.weightTrend.hasEnough, false);
});

contractTest("uses only the last six valid fat measurements and requires three", ({ createModel }) => {
  const { buildBodyMetricsModel } = createModel();
  const bodyFatValues = [50, 29, 28, 27, 26, 25, 24];
  const weightHistory = bodyFatValues.map((bodyFatPct, index) => ({
    id: String(index),
    date: `2024-01-${String(index + 1).padStart(2, "0")}`,
    weight: 100,
    bodyFatPct
  }));
  const model = buildBodyMetricsModel(baseSnapshot({ weightHistory, currentWeight: 100 }));

  assert.equal(model.bodyComposition.currentFatPct, 24);
  assert.equal(model.bodyComposition.fatWeeklyRate, -7);
  assert.equal(model.bodyComposition.hasEnoughFatTrend, true);
  assert.equal(model.bodyComposition.fatToLose, 5);
  assert.equal(model.bodyFatGoalAutoKg, 5);

  const insufficient = buildBodyMetricsModel(baseSnapshot({
    weightHistory: weightHistory.slice(0, 2),
    currentWeight: 100
  }));
  assert.equal(insufficient.bodyComposition.fatWeeklyRate, 0);
  assert.equal(insufficient.bodyComposition.hasEnoughFatTrend, false);
});

contractTest("preserves every field-specific zero-as-absence rule", ({ createModel }) => {
  const { buildBodyMetricsModel } = createModel({ computeGoals: () => ({ bmr: 0 }) });
  const model = buildBodyMetricsModel(baseSnapshot({
    weightHistory: [
      { id: "zero-weight", date: "2024-01-01", weight: 0, height: 180, bodyFatPct: 30, waistCm: 90, muscleMassKg: 40 },
      { id: "zero-optionals", date: "2024-01-02", weight: 70, height: 0, bodyFatPct: 0, waistCm: 0, muscleMassKg: 0, bmr: 0 }
    ],
    currentWeight: 70,
    currentHeight: 0,
    profileData: { birthDate: "", gender: "", height: 0 },
    nutritionPrefs: { goalType: "maintenance", goalKg: "", bodyFatGoal: "0" }
  }));

  assert.deepEqual(model.fieldAvailability, {
    bmi: false,
    bodyFatPct: true,
    muscleMassKg: true,
    waistCm: true
  });
  assert.equal(model.chartSeries.weight[0].weight, 0);
  assert.deepEqual(model.chartSeries.bodyFatPct, [{ date: "01-01", value: 30 }]);
  assert.deepEqual(model.chartSeries.muscleMassKg, [{ date: "01-01", value: 40 }]);
  assert.deepEqual(model.chartSeries.waistCm, [{ date: "01-01", value: 90 }]);
  assert.equal(model.weightTrend.avg7, 70);
  assert.equal(model.bodyComposition.currentFatPct, null);
  assert.equal(model.bodyComposition.targetPct, 0);
  assert.equal(model.bodyFatGoalAutoKg, "");
  assert.deepEqual(model.chartSeries.bmr, []);
});

contractTest("preserves six render-time normalization passes and ID generations", ({ createModel }) => {
  let generated = 0;
  const { buildBodyMetricsModel } = createModel({
    computeGoals: weight => ({ bmr: Number(weight) * 10 }),
    createMeasurementId: () => `generated-${++generated}`
  });
  const model = buildBodyMetricsModel(baseSnapshot({
    weightHistory: [{ date: "2024-01-01", weight: 70, bodyFatPct: 20, waistCm: 80, muscleMassKg: 30 }],
    currentWeight: 70
  }));

  assert.equal(generated, 6);
  assert.equal(model.normalizedWeightEntries[0].id, "generated-1");
  assert.equal(model.hasWeightHistory, true);
});
