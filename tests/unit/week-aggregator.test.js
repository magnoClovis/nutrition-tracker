const test = require("node:test");
const assert = require("node:assert/strict");
const { createI18n } = require("../../i18n.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../week-aggregator.js"))],
  ["ESM", () => import("../../src/composite/week-aggregator.js")]
];

const { MEAL_KEYS } = createI18n();

function goalResult(overrides = {}) {
  const effectiveGoal = {
    protein: 100,
    kcal: 2000,
    carbs: 250,
    fat: 70,
    fiber: 30,
    salt: 5,
    ...overrides
  };
  return {
    rawGoal: { ...effectiveGoal, baseCalories: 2200, adjustment: -200 },
    effectiveGoal
  };
}

function createAggregator(createWeekAggregator, resolveHistoricalGoals = () => goalResult()) {
  return createWeekAggregator({
    resolveHistoricalGoals,
    formatDateDM: date => `label:${date}`
  });
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createWeekAggregator } = await load();
      return callback({
        createWeekAggregator,
        createAggregator: resolver => createAggregator(createWeekAggregator, resolver)
      });
    });
  });
}

function weekSnapshot(overrides = {}) {
  return {
    dayDescriptors: [
      { date: "2026-07-20", day: 20 },
      { date: "2026-07-21", day: 21 },
      { date: "2026-07-22", day: 22 }
    ],
    logsByDate: {},
    today: "2026-07-22",
    trainingByDate: {},
    goalContext: {
      weightHistory: [],
      currentWeight: 80,
      currentHeight: 180,
      profileData: { birthDate: "1990-01-01", gender: "male" },
      nutritionPrefs: { activityLevel: "moderate" },
      customGoals: {},
      goalHistory: {}
    },
    ...overrides
  };
}

contractTest("aggregates complete and missing week days with the existing rounding and goal rules", ({ createAggregator }) => {
  const calls = [];
  const { aggregateWeekRows } = createAggregator(snapshot => {
    calls.push(snapshot);
    return goalResult();
  });
  const snapshot = weekSnapshot({
    logsByDate: {
      "2026-07-20": {
        Almoço: [
          { protein: 30.4, kcal: 500.5, carbs: 50.4, fat: 12.6, fiber: 8.5, salt: 1.24 },
          { protein: null, kcal: 99.1, carbs: 10.4, fat: 2.2, fiber: 1.2, salt: 0.21 }
        ]
      },
      "2026-07-22": { Jantar: [{ protein: 100, kcal: 1800 }] }
    },
    trainingByDate: { "2026-07-20": false },
    goalContext: {
      ...weekSnapshot().goalContext,
      goalHistory: { "2026-07-20": { protein: 95 } }
    }
  });

  const rows = aggregateWeekRows(snapshot);

  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], {
    date: "2026-07-20",
    label: "label:2026-07-20",
    day: 20,
    protein: 30,
    proteinTrend: 30,
    proteinPastLine: 30,
    proteinTodayLine: null,
    kcal: 600,
    kcalTrend: 600,
    kcalPastLine: 600,
    kcalTodayLine: null,
    carbs: 61,
    fat: 15,
    fiber: 10,
    salt: 1.5,
    carbsGoal: 250,
    fatGoal: 70,
    fiberGoal: 30,
    saltGoal: 5,
    proteinGoal: 100,
    kcalGoal: 2000,
    baseCalories: 2200,
    adjustment: -200,
    metProtein: false,
    metKcal: false,
    hasData: true,
    isToday: false
  });
  assert.equal(rows[1].hasData, false);
  assert.equal(rows[1].protein, 0);
  assert.equal(rows[1].kcal, 0);
  assert.equal(rows[1].day, 21);
  assert.equal(rows[2].metProtein, true);
  assert.equal(rows[2].metKcal, true);
  assert.equal(calls[0].dayIsTraining, false);
  assert.equal(calls[1].dayIsTraining, true);
  assert.deepEqual(calls[0].frozenGoal, { protein: 95 });
});

contractTest("creates the special dashed segment only between yesterday and today", ({ createAggregator }) => {
  const { aggregateWeekRows } = createAggregator();
  const rows = aggregateWeekRows(weekSnapshot({
    logsByDate: {
      "2026-07-20": { Outro: [{ protein: 10, kcal: 100 }] },
      "2026-07-21": { Outro: [{ protein: 20, kcal: 200 }] },
      "2026-07-22": { Outro: [{ protein: 30, kcal: 300 }] }
    }
  }));

  assert.equal(rows[0].proteinTodayLine, null);
  assert.equal(rows[0].kcalTodayLine, null);
  assert.equal(rows[1].proteinTodayLine, 20);
  assert.equal(rows[1].kcalTodayLine, 200);
  assert.equal(rows[2].proteinTodayLine, 30);
  assert.equal(rows[2].kcalTodayLine, 300);
  assert.equal(rows[1].proteinPastLine, 20);
  assert.equal(rows[2].proteinPastLine, null);
  assert.equal(rows[2].kcalPastLine, null);
});

contractTest("does not create a today segment when today is absent or first", ({ createAggregator }) => {
  const { aggregateWeekRows } = createAggregator();
  const absent = aggregateWeekRows(weekSnapshot({ today: "2026-07-23" }));
  const first = aggregateWeekRows(weekSnapshot({
    dayDescriptors: [
      { date: "2026-07-22", day: 22 },
      { date: "2026-07-23", day: 23 }
    ]
  }));

  assert.equal(absent.every(row => row.proteinTodayLine === null), true);
  assert.equal(first.every(row => row.proteinTodayLine === null), true);
});

contractTest("meal analysis counts only fixed PT keys and preserves unnormalized keys as ignored", ({ createAggregator }) => {
  const { aggregateMealAverages } = createAggregator();
  const result = aggregateMealAverages({
    mealKeys: MEAL_KEYS,
    dailyLogs: [
      {
        "Café da manhã": [{ protein: 20, kcal: 300, carbs: 35 }],
        Breakfast: [{ protein: 99, kcal: 999, carbs: 99 }]
      },
      {
        "Café da manhã": [
          { protein: 30, kcal: 400, carbs: 45 },
          { protein: 10, kcal: 100, carbs: 5 }
        ],
        Desayuno: [{ protein: 88, kcal: 888, carbs: 88 }]
      }
    ]
  });

  assert.deepEqual(result, {
    "Café da manhã": {
      count: 2,
      avgProtein: 30,
      avgKcal: 400,
      avgCarbs: 43
    }
  });
  assert.equal(Object.hasOwn(result, "Breakfast"), false);
  assert.equal(Object.hasOwn(result, "Desayuno"), false);
});

contractTest("meal analysis skips empty meals and rounds totals by recorded day count", ({ createAggregator }) => {
  const { aggregateMealAverages } = createAggregator();
  const result = aggregateMealAverages({
    mealKeys: ["Almoço", "Jantar"],
    dailyLogs: [
      { Almoço: [], Jantar: [{ protein: 10.4, kcal: 100.4, carbs: 20.4 }] },
      { Almoço: [{ protein: null, kcal: 250, carbs: 30 }], Jantar: [{ protein: 11.4, kcal: 101.4, carbs: 21.4 }] },
      {}
    ]
  });

  assert.deepEqual(result, {
    Jantar: { count: 2, avgProtein: 11, avgKcal: 101, avgCarbs: 21 },
    Almoço: { count: 1, avgProtein: 0, avgKcal: 250, avgCarbs: 30 }
  });
});

contractTest("publishes the factory and validates its two direct dependencies", ({ createWeekAggregator }) => {
  assert.equal(typeof createWeekAggregator, "function");
  assert.throws(
    () => createWeekAggregator({ resolveHistoricalGoals: null, formatDateDM: date => date }),
    /requires resolveHistoricalGoals and formatDateDM/
  );
});
