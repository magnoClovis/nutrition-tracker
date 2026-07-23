const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const { createWeekScreen } = require("../../week-screen.js");

const Recharts = {
  LineChart: "LineChart",
  Line: "Line",
  XAxis: "XAxis",
  YAxis: "YAxis",
  Tooltip: "Tooltip",
  ResponsiveContainer: "ResponsiveContainer",
  ReferenceLine: "ReferenceLine"
};
const { pickLang } = createI18n();
const { WeekScreen } = createWeekScreen({ React, Recharts, pickLang });
const chartTheme = { bg: "#fff", tick: "#555", border: "#ddd", label: "#777" };
const labels = {
  loading: "Loading",
  avgProtein: "Average protein",
  avgCalories: "Average calories",
  daysProtGoal: "Protein-goal days",
  protein: "Protein",
  calories: "Calories",
  analyzingPatterns: "Analyzing patterns",
  aiPatterns: "Analyze patterns",
  savedNote: "Save to notes",
  analyzing: "Analyzing feedback",
  aiAnalyzeWeek: "Analyze week",
  selectCopyManual: "Select and copy"
};
const text = key => labels[key] || key;

function visit(node, callback) {
  if (!node || typeof node !== "object") return;
  callback(node);
  React.Children.toArray(node.props && node.props.children).forEach(child => visit(child, callback));
}

function findNodes(node, predicate) {
  const found = [];
  visit(node, value => {
    if (predicate(value)) found.push(value);
  });
  return found;
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
    text,
    getMealLabel: meal => ({ "Caf\u00e9 da manh\u00e3": "Breakfast" }[meal] || meal),
    chartTheme,
    weekData: [
      {
        date: "2026-07-22",
        label: "Wed",
        isToday: false,
        hasData: true,
        metProtein: true,
        protein: 100,
        kcal: 1800,
        proteinGoal: 100,
        kcalGoal: 2000,
        proteinPastLine: 100,
        proteinTodayLine: null,
        kcalPastLine: 1800,
        kcalTodayLine: null
      },
      {
        date: "2026-07-23",
        label: "Today",
        isToday: true,
        hasData: true,
        metProtein: false,
        protein: 80,
        kcal: 1600,
        proteinGoal: 100,
        kcalGoal: 2000,
        proteinPastLine: null,
        proteinTodayLine: 80,
        kcalPastLine: null,
        kcalTodayLine: 1600
      }
    ],
    mealAverages: {
      "Caf\u00e9 da manh\u00e3": { count: 2, avgProtein: 25, avgKcal: 350 }
    },
    goals: { protein: 100, kcal: 2000 },
    latestWeekPoint: { proteinGoal: 100, kcalGoal: 2000 },
    weekSummary: {
      avgProtein: 90,
      avgKcal: 1700,
      daysMetProtein: 1,
      daysWithData: ["2026-07-22", "2026-07-23"],
      calorieBank: 600,
      calorieBankDays: [{ date: "2026-07-22" }, { date: "2026-07-23" }]
    },
    patternsLoading: false,
    patternsText: "Pattern result",
    patternsSaved: false,
    feedbackLoading: false,
    feedbackText: "Feedback result",
    feedbackPeriod: "week",
    feedbackSaved: false,
    showExportPanel: "week",
    exportResult: { filename: "week.txt", content: "payload", copied: false },
    onOpenDay() {},
    onToggleWeekExport() {},
    onRunWeekExport() {},
    onDismissExportResult() {},
    onCopyExportResult() {},
    onGeneratePatterns() {},
    onSavePatterns() {},
    onGenerateWeekFeedback() {},
    onSaveFeedback() {},
    ...overrides
  };
}

test("renders the complete weekly summary, charts, averages, and shared results", () => {
  const screen = WeekScreen(baseProps());
  const copy = textContent(screen);
  assert.equal(screen.props["data-screen"], "semana");
  assert.match(copy, /90gAverage protein/);
  assert.match(copy, /\+600 kcalCalorie bank/);
  assert.match(copy, /Breakfast/);
  assert.match(copy, /2 logged days/);
  assert.match(copy, /Pattern result/);
  assert.match(copy, /Feedback result/);
  assert.match(copy, /week\.txt/);
  assert.equal(findNodes(screen, node => node.type === "LineChart").length, 2);
  assert.equal(findNodes(screen, node => node.type === "ReferenceLine").length, 2);
});

test("preserves loading and empty-data rendering gates", () => {
  const loading = WeekScreen(baseProps({ weekData: [], mealAverages: {}, latestWeekPoint: null }));
  assert.equal(textContent(loading), "Loading");

  const empty = WeekScreen(baseProps({
    weekData: [{
      date: "2026-07-23",
      label: "Today",
      isToday: true,
      hasData: false,
      metProtein: false,
      protein: 0,
      kcal: 0,
      proteinGoal: 100,
      kcalGoal: 2000
    }],
    mealAverages: {},
    latestWeekPoint: { proteinGoal: 100, kcalGoal: 2000 },
    patternsText: "",
    feedbackText: "",
    showExportPanel: null,
    exportResult: null,
    weekSummary: {
      avgProtein: 0,
      avgKcal: 0,
      daysMetProtein: 0,
      daysWithData: [],
      calorieBank: 0,
      calorieBankDays: []
    }
  }));
  assert.match(textContent(empty), /Analyze patterns/);
  assert.doesNotMatch(textContent(empty), /Analyze week|Escolha o formato/);
});

test("renders the existing independent AI loading states", () => {
  const screen = WeekScreen(baseProps({
    patternsLoading: true,
    patternsText: "",
    feedbackLoading: true,
    feedbackText: "",
    feedbackPeriod: "week"
  }));
  const copy = textContent(screen);
  assert.match(copy, /Analyzing patterns/);
  assert.match(copy, /Analyzing feedback/);
});

test("delegates navigation, export, clipboard, patterns, and feedback actions", () => {
  const calls = [];
  const callbacks = {
    onOpenDay: date => calls.push(["day", date]),
    onToggleWeekExport: () => calls.push(["toggle"]),
    onRunWeekExport: format => calls.push(["export", format]),
    onDismissExportResult: () => calls.push(["dismiss"]),
    onCopyExportResult: () => calls.push(["copy"]),
    onGeneratePatterns: () => calls.push(["patterns"]),
    onSavePatterns: () => calls.push(["save-patterns"]),
    onGenerateWeekFeedback: () => calls.push(["feedback"]),
    onSaveFeedback: () => calls.push(["save-feedback"])
  };
  const screen = WeekScreen(baseProps(callbacks));
  const buttons = findNodes(screen, node => node.type === "button");
  const clickableDay = findNodes(
    screen,
    node => node.type === "div" && typeof node.props.onClick === "function" && textContent(node).includes("Wed")
  )[0];
  clickableDay.props.onClick();
  buttons.find(button => textContent(button) === "\u2193 Exportar semana").props.onClick();
  buttons.find(button => textContent(button).startsWith("JSON")).props.onClick();
  findNodes(screen, node => node.props.onClick === callbacks.onDismissExportResult)[0].props.onClick();
  findNodes(screen, node => node.props.onClick === callbacks.onCopyExportResult)[0].props.onClick();
  findNodes(screen, node => node.props.onClick === callbacks.onGeneratePatterns)[0].props.onClick();
  findNodes(screen, node => node.props.onClick === callbacks.onSavePatterns)[0].props.onClick();
  findNodes(screen, node => node.props.onClick === callbacks.onGenerateWeekFeedback)[0].props.onClick();
  findNodes(screen, node => node.props.onClick === callbacks.onSaveFeedback)[0].props.onClick();
  assert.deepEqual(calls, [
    ["day", "2026-07-22"],
    ["toggle"],
    ["export", "json"],
    ["dismiss"],
    ["copy"],
    ["patterns"],
    ["save-patterns"],
    ["feedback"],
    ["save-feedback"]
  ]);
});
