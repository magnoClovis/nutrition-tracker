const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createAppHeaderNavigation } = require("../../app-header-navigation.js");

const { AppHeaderNavigation } = createAppHeaderNavigation({ React });

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

const noOp = () => {};

function baseProps(overrides = {}) {
  return {
    activeTab: "diario",
    isMobileView: false,
    title: "Nutrition diary",
    dateText: "Saturday, July 25",
    menuOpen: false,
    languageMenuOpen: false,
    onToggleMenu: noOp,
    onCloseMenu: noOp,
    onToggleLanguageMenu: noOp,
    languageFlag: "🇬🇧",
    languageLabel: "Language",
    languageOptions: [
      { code: "pt", flag: "🇧🇷", label: "Português", isCurrent: false },
      { code: "en", flag: "🇬🇧", label: "English", isCurrent: true },
      { code: "es", flag: "🇪🇸", label: "Español", isCurrent: false }
    ],
    onSelectLanguage: noOp,
    darkModeLabel: "Dark mode",
    onToggleDarkMode: noOp,
    menuActions: [],
    tickerNode: React.createElement("div", { "data-test-ticker": true }, "Ticker"),
    dayOfLabel: "Day type",
    isTraining: true,
    onToggleDayType: noOp,
    trainingLabel: "Training",
    restLabel: "Rest",
    currentWeight: 70,
    bmi: "22.5",
    bmiLabel: "BMI",
    metricsTitle: "Open metrics",
    onOpenMetrics: noOp,
    navItems: [
      { key: "diario", label: "Diary" },
      { key: "despensa", label: "Pantry" },
      { key: "semana", label: "Week" },
      { key: "metricas", label: "Metrics" }
    ],
    onOpenTab: noOp,
    miniProgressItems: [
      { label: "Protein", value: 50, goal: 100, unit: "g", color: "green" }
    ],
    summaryNode: React.createElement("div", { "data-test-summary": true }, "Summary"),
    goalToast: null,
    notification: "",
    ...overrides
  };
}

test("renders the diary header, status controls, summary, and one primary navigation", () => {
  let dayToggles = 0;
  let metricsOpens = 0;
  const openedTabs = [];
  const view = AppHeaderNavigation(baseProps({
    onToggleDayType: () => { dayToggles += 1; },
    onOpenMetrics: () => { metricsOpens += 1; },
    onOpenTab: tab => openedTabs.push(tab)
  }));

  const header = findNodes(view, node => node.props && node.props["data-app-header"])[0];
  const rootChildren = React.Children.toArray(view.props.children);
  assert.equal(header.props["data-app-header"], "true");
  assert.equal(header.props["data-active-tab"], "diario");
  assert.equal(rootChildren[0].props["data-app-header"], "true");
  assert.equal(rootChildren.some(node => node.props && node.props["data-app-nav"]), true);
  assert.equal(findNodes(header, node => node.props && node.props["data-app-nav"]).length, 0);
  assert.match(textContent(view), /Nutrition diary/);
  assert.match(textContent(view), /Ticker/);
  assert.match(textContent(view), /Summary/);
  assert.equal(findNodes(view, node => node.props && node.props["data-app-nav"]).length, 1);

  findNodes(view, node => node.props && node.props["data-tutorial"] === "day-type")[0].props.onClick();
  findNodes(view, node => node.type === "button" && node.props.title === "Open metrics")[0].props.onClick();
  findNodes(view, node => node.props && node.props["data-tutorial"] === "tab-semana")[0].props.onClick();

  assert.equal(dayToggles, 1);
  assert.equal(metricsOpens, 1);
  assert.deepEqual(openedTabs, ["semana"]);
});

test("keeps both ephemeral menu states controlled and delegates resolved actions", () => {
  const events = [];
  const view = AppHeaderNavigation(baseProps({
    menuOpen: true,
    languageMenuOpen: true,
    onToggleMenu: () => events.push("menu"),
    onCloseMenu: () => events.push("close"),
    onToggleLanguageMenu: () => events.push("language-menu"),
    onSelectLanguage: code => events.push(`language:${code}`),
    onToggleDarkMode: () => events.push("theme"),
    menuActions: [{
      key: "backup",
      icon: "B",
      label: "Backup",
      onClick: () => events.push("backup")
    }]
  }));

  findNodes(view, node => node.props && node.props["data-tutorial"] === "menu-settings")[0].props.onClick();
  findNodes(view, node => node.type === "div" && node.props.style && node.props.style.zIndex === 99)[0].props.onClick();
  findNodes(view, node => node.type === "button" && textContent(node).includes("Language"))[0].props.onClick();
  findNodes(view, node => node.type === "button" && textContent(node).includes("Español"))[0].props.onClick();
  findNodes(view, node => node.type === "button" && textContent(node).includes("Dark mode"))[0].props.onClick();
  findNodes(view, node => node.type === "button" && textContent(node).includes("Backup"))[0].props.onClick();

  assert.deepEqual(events, [
    "menu",
    "close",
    "language-menu",
    "language:es",
    "theme",
    "backup"
  ]);
});

test("renders non-diary progress, notifications, and the alternate navigation placement", () => {
  const view = AppHeaderNavigation(baseProps({
    activeTab: "metricas",
    isMobileView: true,
    currentWeight: null,
    goalToast: {
      tone: "warning",
      visible: true,
      text: "Goal reached",
      detail: "100 / 100g"
    },
    notification: "Error loading data"
  }));

  assert.equal(findNodes(view, node => node.props && node.props["data-app-nav"]).length, 1);
  assert.match(textContent(view), /Protein50 \/ 100g/);
  assert.match(textContent(view), /Goal reached/);
  assert.match(textContent(view), /Error loading data/);
  assert.equal(findNodes(view, node => node.type === "button" && node.props.title === "Open metrics").length, 0);
});

test("keeps Add as a pseudo-tab absent from the primary navigation", () => {
  const view = AppHeaderNavigation(baseProps({ activeTab: "adicionar" }));
  const tabButtons = findNodes(view, node => node.props && String(node.props["data-tutorial"] || "").startsWith("tab-"));

  assert.deepEqual(tabButtons.map(node => node.props["data-tutorial"]), [
    "tab-diario",
    "tab-despensa",
    "tab-semana",
    "tab-metricas"
  ]);
  assert.equal(tabButtons.some(node => node.props.style.borderBottom === "2px solid #c8a96e"), false);
});
