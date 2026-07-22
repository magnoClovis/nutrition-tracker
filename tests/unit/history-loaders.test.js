const test = require("node:test");
const assert = require("node:assert/strict");
const { createHistoryLoaders } = require("../../history-loaders.js");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function baseDependencies(overrides = {}) {
  return {
    storage: { get: async () => null },
    normalizeMealKeys: log => ({ normalized: log }),
    aggregateWeekRows: snapshot => snapshot,
    aggregateMealAverages: snapshot => snapshot,
    monthDays: () => [],
    calendarMarkerFor: (log, goal) => ({ log, goal }),
    resolveHistoricalGoals: snapshot => ({ effectiveGoal: { date: snapshot.date } }),
    createDate: () => new Date("2026-07-22T12:00:00.000Z"),
    warn: () => {},
    ...overrides
  };
}

test("reads historical log and note in parallel and returns normalized data without setters", async () => {
  const logRead = deferred();
  const noteRead = deferred();
  const calls = [];
  let setterCalls = 0;
  const loaders = createHistoryLoaders(baseDependencies({
    storage: {
      get(key) {
        calls.push(key);
        return key.startsWith("log_") ? logRead.promise : noteRead.promise;
      }
    },
    setHistoryLog: () => setterCalls++,
    setHistoryNote: () => setterCalls++
  }));

  const pending = loaders.loadHistoricalDate({ date: "2026-07-20", today: "2026-07-22" });
  assert.deepEqual(calls, ["log_v2_2026-07-20", "notes_2026-07-20"]);
  logRead.resolve({ value: JSON.stringify({ Almoço: [{ kcal: 500 }] }) });
  noteRead.resolve({ value: "nota" });

  assert.deepEqual(await pending, {
    isHistorical: true,
    historyLog: { normalized: { Almoço: [{ kcal: 500 }] } },
    historyNote: "nota"
  });
  assert.equal(setterCalls, 0);
});

test("returns a neutral TODAY result without reading storage", async () => {
  let reads = 0;
  const { loadHistoricalDate } = createHistoryLoaders(baseDependencies({
    storage: { get: async () => { reads++; return null; } }
  }));

  assert.deepEqual(
    await loadHistoricalDate({ date: "2026-07-22", today: "2026-07-22" }),
    { isHistorical: false }
  );
  assert.equal(reads, 0);
});

test("keeps invalid historical JSON as a rejected loader promise", async () => {
  const { loadHistoricalDate } = createHistoryLoaders(baseDependencies({
    storage: {
      get: async key => key.startsWith("log_") ? { value: "{" } : { value: "note" }
    }
  }));

  await assert.rejects(
    loadHistoricalDate({ date: "2026-07-20", today: "2026-07-22" }),
    SyntaxError
  );
});

test("reads weekly history sequentially with a fresh Date per iteration", async () => {
  let activeReads = 0;
  let maxActiveReads = 0;
  let dateCreations = 0;
  const readKeys = [];
  let aggregateInput;
  const { loadWeekRows } = createHistoryLoaders(baseDependencies({
    storage: {
      async get(key) {
        readKeys.push(key);
        activeReads++;
        maxActiveReads = Math.max(maxActiveReads, activeReads);
        await new Promise(resolve => setImmediate(resolve));
        activeReads--;
        return { value: JSON.stringify({ Outro: [{ protein: readKeys.length }] }) };
      }
    },
    createDate() {
      dateCreations++;
      return new Date("2026-07-22T12:00:00.000Z");
    },
    aggregateWeekRows(snapshot) {
      aggregateInput = snapshot;
      return [{ aggregated: true }];
    }
  }));
  const goalContext = { marker: "goal-context" };
  const todayLog = { Hoje: [{ kcal: 1 }] };

  const result = await loadWeekRows({
    today: "2026-07-22",
    todayLog,
    trainingByDate: { "2026-07-21": false },
    goalContext
  });

  assert.deepEqual(result, [{ aggregated: true }]);
  assert.equal(dateCreations, 8);
  assert.equal(readKeys.length, 7);
  assert.equal(maxActiveReads, 1);
  assert.equal(aggregateInput.dayDescriptors.length, 8);
  assert.deepEqual(aggregateInput.dayDescriptors.at(-1), { date: "2026-07-22", day: 22 });
  assert.strictEqual(aggregateInput.logsByDate["2026-07-22"], todayLog);
  assert.strictEqual(aggregateInput.goalContext, goalContext);
});

test("reads 30 meal-analysis days sequentially without normalizing meal keys", async () => {
  let activeReads = 0;
  let maxActiveReads = 0;
  let normalizeCalls = 0;
  let aggregateInput;
  const { loadMealAnalysisData } = createHistoryLoaders(baseDependencies({
    storage: {
      async get(key) {
        activeReads++;
        maxActiveReads = Math.max(maxActiveReads, activeReads);
        await new Promise(resolve => setImmediate(resolve));
        activeReads--;
        if (key.endsWith("07-21")) return { value: JSON.stringify({ Breakfast: [{ protein: 20 }] }) };
        return null;
      }
    },
    normalizeMealKeys(log) {
      normalizeCalls++;
      return log;
    },
    aggregateMealAverages(snapshot) {
      aggregateInput = snapshot;
      return { done: true };
    }
  }));

  assert.deepEqual(await loadMealAnalysisData({ mealKeys: ["Café da manhã"] }), { done: true });
  assert.equal(maxActiveReads, 1);
  assert.equal(normalizeCalls, 0);
  assert.deepEqual(aggregateInput, {
    dailyLogs: [{ Breakfast: [{ protein: 20 }] }],
    mealKeys: ["Café da manhã"]
  });
});

test("keeps invalid weekly and meal JSON as rejected promises", async () => {
  const dependencies = baseDependencies({
    storage: { get: async () => ({ value: "{" }) }
  });
  const { loadWeekRows, loadMealAnalysisData } = createHistoryLoaders(dependencies);

  await assert.rejects(
    loadWeekRows({ today: "2026-07-22", todayLog: {}, trainingByDate: {}, goalContext: {} }),
    SyntaxError
  );
  await assert.rejects(loadMealAnalysisData({ mealKeys: [] }), SyntaxError);
});

test("loads calendar days in parallel and keeps present, missing, invalid, and TODAY markers distinct only by input", async () => {
  const reads = new Map();
  const warnings = [];
  const goalCalls = [];
  const normalizerCalls = [];
  const storage = {
    get(key) {
      const item = deferred();
      reads.set(key, item);
      return item.promise;
    }
  };
  const { loadCalendarMonthData } = createHistoryLoaders(baseDependencies({
    storage,
    monthDays: () => [null, "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05"],
    normalizeMealKeys(log) {
      normalizerCalls.push(log);
      return { normalized: log };
    },
    resolveHistoricalGoals(snapshot) {
      goalCalls.push(snapshot);
      return { effectiveGoal: { protein: snapshot.dayIsTraining ? 100 : 80 } };
    },
    warn: (...args) => warnings.push(args)
  }));
  const todayLog = { Hoje: [{ protein: 10 }] };
  const goalContext = {
    weightHistory: [],
    currentWeight: 80,
    currentHeight: 180,
    profileData: {},
    nutritionPrefs: {},
    customGoals: {},
    goalHistory: { "2026-07-01": { protein: 90 } }
  };

  const pending = loadCalendarMonthData({
    calendarMonth: "2026-07",
    today: "2026-07-04",
    todayLog,
    trainingByDate: { "2026-07-01": false },
    goalContext
  });

  assert.deepEqual([...reads.keys()], [
    "log_v2_2026-07-01",
    "log_v2_2026-07-02",
    "log_v2_2026-07-03"
  ]);
  reads.get("log_v2_2026-07-01").resolve({ value: JSON.stringify({ Almoço: [{ kcal: 500 }] }) });
  reads.get("log_v2_2026-07-02").reject(new Error("offline"));
  reads.get("log_v2_2026-07-03").resolve({ value: "{" });

  const result = await pending;
  assert.deepEqual(result["2026-07-01"].log, { normalized: { Almoço: [{ kcal: 500 }] } });
  assert.deepEqual(result["2026-07-02"].log, {});
  assert.deepEqual(result["2026-07-03"].log, {});
  assert.strictEqual(result["2026-07-04"].log, todayLog);
  assert.equal(Object.hasOwn(result, "2026-07-05"), false);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][0], "Registro diário inválido no calendário:");
  assert.equal(warnings[0][1], "2026-07-03");
  assert.equal(normalizerCalls.length, 1);
  assert.equal(goalCalls.find(call => call.date === "2026-07-01").dayIsTraining, false);
  assert.deepEqual(goalCalls.find(call => call.date === "2026-07-01").frozenGoal, { protein: 90 });
});

test("publishes the UMD factory and requires every loader dependency", () => {
  assert.equal(typeof createHistoryLoaders, "function");
  assert.throws(
    () => createHistoryLoaders(baseDependencies({ createDate: null })),
    /requires storage and all history-loader dependency functions/
  );
});
