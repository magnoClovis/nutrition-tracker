const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const { createBodyMetricsCharts } = require("../../body-metrics-charts.js");

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
const {
  BodyMetricChart,
  WeightTrendChart,
  BmrTrendChart,
  BodyFatTrendChart
} = createBodyMetricsCharts({ React, Recharts, pickLang });
const chartTheme = { bg: "#fff", tick: "#555", border: "#ddd", label: "#777" };

function findTypes(node, type) {
  const found = [];
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (value.type === type) found.push(value);
    React.Children.toArray(value.props && value.props.children).forEach(visit);
  }
  visit(node);
  return found;
}

test("preserves empty/minimum-point rendering gates", () => {
  assert.equal(BodyMetricChart({
    config: { data: [] }, isMobileView: false, chartTheme, targetLabel: "Meta "
  }), null);
  assert.equal(WeightTrendChart({
    data: [{ date: "01/01", weight: 70 }], title: "Peso", visible: true,
    isMobileView: false, chartTheme
  }), null);
  assert.equal(BmrTrendChart({
    data: [], title: "TMB", visible: true, isMobileView: false, chartTheme
  }), null);
  assert.equal(BodyFatTrendChart({
    data: [{ label: "01/01", bodyFatPct: 15 }], targetPct: 12,
    lang: "pt", isMobileView: false
  }), null);
});

test("keeps target zero hidden and a positive target visible", () => {
  const base = {
    key: "bodyFatPct", title: "Gordura", label: "Gordura corporal",
    unit: "%", color: "#c86e8e", data: [{ date: "01/01", value: 15 }]
  };
  const zero = BodyMetricChart({
    config: { ...base, target: 0 }, isMobileView: false, chartTheme, targetLabel: "Meta "
  });
  assert.equal(findTypes(zero, "ReferenceLine").length, 0);
  const positive = BodyMetricChart({
    config: { ...base, target: 12 }, isMobileView: true, chartTheme, targetLabel: "Meta "
  });
  assert.equal(findTypes(positive, "ReferenceLine")[0].props.y, 12);
  assert.equal(findTypes(positive, "ResponsiveContainer")[0].props.height, 190);
});

test("renders weight and BMR series with the existing keys and visibility", () => {
  const weight = WeightTrendChart({
    data: [{ date: "01", weight: 70 }, { date: "02", weight: 69 }],
    title: "Weight trend", visible: false, isMobileView: true, chartTheme
  });
  assert.equal(weight.props.style.display, "none");
  assert.equal(findTypes(weight, "Line")[0].props.dataKey, "weight");
  assert.equal(findTypes(weight, "ResponsiveContainer")[0].props.height, 210);

  const bmr = BmrTrendChart({
    data: [{ date: "01", bmr: 1700 }, { date: "02", bmr: 1690 }],
    title: "BMR trend", visible: true, isMobileView: false, chartTheme
  });
  assert.equal(bmr.props["data-tutorial"], "bmr-chart");
  assert.equal(findTypes(bmr, "Line")[0].props.dataKey, "bmr");
});

test("renders localized body-fat chart and preserves target zero", () => {
  const data = [
    { label: "01", bodyFatPct: 15 },
    { label: "02", bodyFatPct: 14 }
  ];
  const zero = BodyFatTrendChart({ data, targetPct: 0, lang: "es", isMobileView: false });
  assert.equal(findTypes(zero, "ReferenceLine").length, 0);
  const target = BodyFatTrendChart({ data, targetPct: 12, lang: "es", isMobileView: true });
  assert.equal(findTypes(target, "ReferenceLine")[0].props.label.value, "Meta");
  assert.equal(findTypes(target, "ResponsiveContainer")[0].props.height, 190);
});
