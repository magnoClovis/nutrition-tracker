const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const { createBackupModal } = require("../../backup-modal.js");

const { normalizeLanguage, pickLang } = createI18n();
const currentDispatcher = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;

function createHookHarness(Component, props) {
  const state = [];
  let tree;

  function render() {
    let hookIndex = 0;
    const dispatcher = {
      useState(initialValue) {
        const index = hookIndex++;
        if (!(index in state)) state[index] = typeof initialValue === "function" ? initialValue() : initialValue;
        const setValue = nextValue => {
          state[index] = typeof nextValue === "function" ? nextValue(state[index]) : nextValue;
        };
        return [state[index], setValue];
      }
    };
    const previousDispatcher = currentDispatcher.current;
    currentDispatcher.current = dispatcher;
    try {
      tree = Component(props);
    } finally {
      currentDispatcher.current = previousDispatcher;
    }
    return tree;
  }

  return { render, get tree() { return tree; } };
}

function walkElements(node, visit) {
  if (node === null || node === undefined || typeof node !== "object") return;
  visit(node);
  React.Children.toArray(node.props && node.props.children).forEach(child => walkElements(child, visit));
}

function elementsByType(tree, type) {
  const matches = [];
  walkElements(tree, node => {
    if (node.type === type) matches.push(node);
  });
  return matches;
}

function elementText(node) {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(elementText).join("");
  if (typeof node === "object") return React.Children.toArray(node.props && node.props.children).map(elementText).join("");
  return "";
}

function findButton(tree, label) {
  return elementsByType(tree, "button").find(button => elementText(button).includes(label));
}

class FakeFileReader {
  readAsText(file) {
    this.result = file.content;
    if (file.readError) {
      this.error = file.readError;
      this.onerror();
      return;
    }
    this.onload();
  }
}

function createFixture({ getBackupContext, storageGet, lang = "en" } = {}) {
  const alerts = [];
  const errors = [];
  const { BackupModal } = createBackupModal({
    React,
    normalizeLanguage,
    pickLang,
    storage: {
      async get(key) {
        return storageGet ? storageGet(key) : null;
      }
    },
    localStorage: { getItem() { return "false"; } },
    getBackupContext: getBackupContext || (() => ({})),
    FileReader: FakeFileReader,
    alertUser(message) { alerts.push(message); },
    reportError(...args) { errors.push(args); }
  });
  return {
    harness: createHookHarness(BackupModal, { lang, darkMode: false, onClose() {} }),
    alerts,
    errors
  };
}

function exportData(marker, downloads) {
  return {
    activeLog: { Breakfast: [{ name: marker, protein: 1, kcal: 2, carbs: 3, fat: 4, fiber: 5, salt: 0.1 }] },
    log: {},
    TODAY: "2026-07-16",
    isTraining: true,
    goals: { protein: 100 },
    goalHistory: {},
    trainingByDate: {},
    buildDayTotals() {},
    normalizeMealKeys(value) { return value; },
    downloadFile(content, filename, type) { downloads.push({ content, filename, type }); },
    lang: "en",
    notify() {},
    weightHistory: []
  };
}

test("calls getBackupContext for every export action and uses the latest render snapshot", async () => {
  const downloads = [];
  let marker = "first-snapshot";
  let contextCalls = 0;
  const fixture = createFixture({
    getBackupContext() {
      contextCalls += 1;
      return { exportData: exportData(marker, downloads) };
    }
  });

  let tree = fixture.harness.render();
  await findButton(tree, "Diary - today").props.onClick();
  marker = "second-snapshot";
  tree = fixture.harness.render();
  await findButton(tree, "Diary - today").props.onClick();

  assert.equal(contextCalls, 2);
  assert.equal(downloads.length, 2);
  assert.equal(downloads[0].content.includes("first-snapshot"), true);
  assert.equal(downloads[1].content.includes("second-snapshot"), true);
});

test("resolves separate current contexts for preview and confirmed import", async () => {
  const rawBackup = { schema: "nutrition-tracker-account-backup", version: 3, data: { "notes_2026-07-16": "original" } };
  const getterCalls = [];
  const imported = [];
  const contexts = [
    {
      async previewFullAccountBackupImport(value) {
        assert.deepEqual(value, rawBackup);
        return {
          ok: true,
          categories: [{ id: "notes", total: 5, newItems: 1, existingItems: 4 }]
        };
      }
    },
    {
      async importFullAccountBackup(value, options) {
        imported.push({ value, options });
        return { imported: 1, skipped: 0 };
      }
    }
  ];
  const fixture = createFixture({
    getBackupContext() {
      const index = getterCalls.length;
      getterCalls.push(index);
      return contexts[index];
    }
  });

  let tree = fixture.harness.render();
  const input = elementsByType(tree, "input").find(element => element.props.type === "file");
  const target = { files: [{ content: JSON.stringify(rawBackup) }], value: "backup.json" };
  await input.props.onChange({ target });
  assert.equal(target.value, "");

  tree = fixture.harness.render();
  assert.equal(elementText(tree).includes("Notes"), true);
  assert.equal(elementText(tree).includes("5 records · 1 new · 0 existing"), true);
  const checkbox = elementsByType(tree, "input").find(element => element.props.type === "checkbox");
  checkbox.props.onChange({ target: { checked: true } });
  tree = fixture.harness.render();
  findButton(tree, "Replace").props.onClick();
  tree = fixture.harness.render();
  await findButton(tree, "Import selected").props.onClick();

  assert.deepEqual(getterCalls, [0, 1]);
  assert.deepEqual(imported, [{
    value: rawBackup,
    options: { categories: { notes: "replace" } }
  }]);
});

test("preserves empty-file behavior by previewing an empty object", async () => {
  let previewed;
  let contextCalls = 0;
  const fixture = createFixture({
    getBackupContext() {
      contextCalls += 1;
      return {
        async previewFullAccountBackupImport(value) {
          previewed = value;
          return { ok: false, errors: ["Backup has no importable account data."] };
        }
      };
    }
  });

  let tree = fixture.harness.render();
  const input = elementsByType(tree, "input").find(element => element.props.type === "file");
  const target = { files: [{ content: "" }], value: "empty.json" };
  await input.props.onChange({ target });
  tree = fixture.harness.render();

  assert.deepEqual(previewed, {});
  assert.equal(contextCalls, 1);
  assert.equal(elementText(tree).includes("Import error: Backup has no importable account data."), true);
  assert.equal(target.value, "");
});

test("preserves malformed-JSON behavior without reaching the preview bridge", async () => {
  let contextCalls = 0;
  const fixture = createFixture({
    getBackupContext() {
      contextCalls += 1;
      return {};
    }
  });

  let tree = fixture.harness.render();
  const input = elementsByType(tree, "input").find(element => element.props.type === "file");
  const target = { files: [{ content: "{" }], value: "broken.json" };
  await input.props.onChange({ target });
  tree = fixture.harness.render();

  assert.equal(contextCalls, 0);
  assert.equal(elementText(tree).includes("Import error: Invalid JSON file."), true);
  assert.equal(target.value, "");
});
