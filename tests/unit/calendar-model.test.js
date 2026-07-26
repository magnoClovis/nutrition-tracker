const test = require("node:test");
const assert = require("node:assert/strict");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../calendar-model.js"))],
  ["ESM", () => import("../../src/leaf/calendar-model.js")]
];

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createCalendarModel } = await load();
      return callback(createCalendarModel());
    });
  });
}

contractTest("builds Sunday-first calendar grids including leap years", ({ monthDays }) => {
  const leapFebruary = monthDays("2024-02");
  assert.equal(leapFebruary.length, 35);
  assert.deepEqual(leapFebruary.slice(0, 4), [null, null, null, null]);
  assert.equal(leapFebruary[4], "2024-02-01");
  assert.equal(leapFebruary[32], "2024-02-29");
  assert.deepEqual(leapFebruary.slice(33), [null, null]);

  const nonLeapFebruary = monthDays("2023-02");
  assert.equal(nonLeapFebruary.length, 35);
  assert.equal(nonLeapFebruary.filter(Boolean).length, 28);
  assert.equal(nonLeapFebruary[3], "2023-02-01");
  assert.equal(nonLeapFebruary[30], "2023-02-28");

  const sundayStart = monthDays("2023-10");
  assert.equal(sundayStart[0], "2023-10-01");
  assert.equal(sundayStart.length % 7, 0);
});

contractTest("shifts months across year boundaries using the existing local-Date model", ({ shiftMonth }) => {
  assert.equal(shiftMonth("2024-01", -1), "2023-12");
  assert.equal(shiftMonth("2023-12", 1), "2024-01");
  assert.equal(shiftMonth("2024-02", 12), "2025-02");
  assert.equal(shiftMonth("2024-02", -14), "2022-12");
});

contractTest("builds calendar markers with the existing thresholds and rounding", ({ calendarMarkerFor }) => {
  const marker = calendarMarkerFor({
    breakfast: [{ protein: 40.4, kcal: 400.4 }],
    dinner: [{ protein: 60.2, kcal: 449.6 }]
  }, { protein: 100, kcal: 1000 });

  assert.deepEqual(marker, {
    hasData: true,
    proteinMet: true,
    kcalGood: true,
    kcalOver: false,
    protein: 101,
    kcal: 850
  });

  const upperBoundary = calendarMarkerFor({ meal: [{ kcal: 1150 }] }, { protein: 1, kcal: 1000 });
  assert.equal(upperBoundary.kcalGood, true);
  assert.equal(upperBoundary.kcalOver, false);

  const overBoundary = calendarMarkerFor({ meal: [{ kcal: 1150.01 }] }, { protein: 1, kcal: 1000 });
  assert.equal(overBoundary.kcalGood, false);
  assert.equal(overBoundary.kcalOver, true);
  assert.equal(overBoundary.kcal, 1150);
});

contractTest("treats empty logs and missing nutrient fields exactly as before", ({ calendarMarkerFor }) => {
  assert.deepEqual(calendarMarkerFor({}, { protein: 100, kcal: 2000 }), {
    hasData: false,
    proteinMet: false,
    kcalGood: false,
    kcalOver: false,
    protein: 0,
    kcal: 0
  });

  assert.deepEqual(calendarMarkerFor({ meal: [{}] }, { protein: 0, kcal: 0 }), {
    hasData: true,
    proteinMet: true,
    kcalGood: true,
    kcalOver: false,
    protein: 0,
    kcal: 0
  });
});

contractTest("aggregates only markers containing diary data", ({ calendarMonthStats }) => {
  assert.deepEqual(calendarMonthStats({
    "2024-02-01": { hasData: true, proteinMet: true, kcalOver: false, kcal: 1800, protein: 100 },
    "2024-02-02": { hasData: true, proteinMet: false, kcalOver: true, kcal: 2101, protein: 80 },
    "2024-02-03": { hasData: false, proteinMet: true, kcalOver: true, kcal: 9999, protein: 999 },
    "2024-02-04": null
  }), {
    registered: 2,
    proteinDays: 1,
    kcalOverDays: 1,
    avgKcalMonth: 1951,
    avgProteinMonth: 90
  });

  assert.deepEqual(calendarMonthStats({}), {
    registered: 0,
    proteinDays: 0,
    kcalOverDays: 0,
    avgKcalMonth: 0,
    avgProteinMonth: 0
  });
});
