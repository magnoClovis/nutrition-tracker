const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../backup-modal.js"))],
  ["ESM", () => import("../../src/components/backup-modal.js")]
];

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

function createFixture(createBackupModal, {
  getBackupContext,
  storageGet,
  exportFile,
  supportsNativeFileDestinations = false,
  lang = "en"
} = {}) {
  const alerts = [];
  const errors = [];
  const exports = [];
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
    exportFile: exportFile === null
      ? undefined
      : exportFile || (async request => {
          exports.push(request);
          return { method: "download" };
        }),
    supportsNativeFileDestinations,
    getBackupContext: getBackupContext || (() => ({})),
    FileReader: FakeFileReader,
    alertUser(message) { alerts.push(message); },
    reportError(...args) { errors.push(args); }
  });
  return {
    harness: createHookHarness(BackupModal, { lang, darkMode: false, onClose() {} }),
    alerts,
    errors,
    exports
  };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createBackupModal } = await load();
      return callback(createBackupModal);
    });
  });
}

function exportData(marker, notifications = []) {
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
    lang: "en",
    notify(message) { notifications.push(message); },
    weightHistory: []
  };
}

contractTest("calls getBackupContext for every export action and uses the latest render snapshot", async createBackupModal => {
  const notifications = [];
  let marker = "first-snapshot";
  let contextCalls = 0;
  const fixture = createFixture(createBackupModal, {
    getBackupContext() {
      contextCalls += 1;
      return { exportData: exportData(marker, notifications) };
    }
  });

  let tree = fixture.harness.render();
  await findButton(tree, "Diary - today").props.onClick();
  marker = "second-snapshot";
  tree = fixture.harness.render();
  await findButton(tree, "Diary - today").props.onClick();

  assert.equal(contextCalls, 2);
  assert.equal(fixture.exports.length, 2);
  assert.equal(fixture.exports[0].content.includes("first-snapshot"), true);
  assert.equal(fixture.exports[1].content.includes("second-snapshot"), true);
  assert.equal(fixture.exports[0].mimeType, "application/json");
  assert.deepEqual(notifications, ["File downloaded!", "File downloaded!"]);
});

contractTest("waits for export completion before announcing success", async createBackupModal => {
  const notifications = [];
  let resolveExport;
  const pendingExport = new Promise(resolve => {
    resolveExport = resolve;
  });
  const fixture = createFixture(createBackupModal, {
    exportFile() {
      return pendingExport;
    },
    getBackupContext() {
      return { exportData: exportData("pending", notifications) };
    }
  });

  const tree = fixture.harness.render();
  const exportPromise = findButton(tree, "Diary - today").props.onClick();
  await Promise.resolve();

  assert.deepEqual(notifications, []);
  resolveExport({ method: "share" });
  await exportPromise;
  assert.deepEqual(notifications, ["File downloaded!"]);
});

contractTest("offers explicit save and share destinations only for native Android", async createBackupModal => {
  const requests = [];
  const fixture = createFixture(createBackupModal, {
    supportsNativeFileDestinations: true,
    async exportFile(request) {
      requests.push(request);
      return { method: request.destination };
    },
    getBackupContext() {
      return { exportData: exportData("native") };
    }
  });

  let tree = fixture.harness.render();
  findButton(tree, "Diary - today").props.onClick();
  tree = fixture.harness.render();

  assert.equal(requests.length, 0);
  assert.ok(findButton(tree, "Save on device"));
  assert.ok(findButton(tree, "Share"));

  await findButton(tree, "Save on device").props.onClick();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].destination, "save");
});

contractTest("does not announce success when Android document saving is cancelled", async createBackupModal => {
  const notifications = [];
  const fixture = createFixture(createBackupModal, {
    supportsNativeFileDestinations: true,
    async exportFile() {
      return { method: "save", cancelled: true };
    },
    getBackupContext() {
      return { exportData: exportData("cancelled", notifications) };
    }
  });

  let tree = fixture.harness.render();
  findButton(tree, "Diary - today").props.onClick();
  tree = fixture.harness.render();
  await findButton(tree, "Save on device").props.onClick();

  assert.deepEqual(notifications, []);
});

contractTest("accepts the controller export bridge used by the frozen legacy composition", async createBackupModal => {
  const exports = [];
  const fixture = createFixture(createBackupModal, {
    exportFile: null,
    getBackupContext() {
      return {
        exportData: {
          ...exportData("legacy"),
          async exportFile(request) {
            exports.push(request);
          }
        }
      };
    }
  });

  const tree = fixture.harness.render();
  await findButton(tree, "Diary - today").props.onClick();

  assert.equal(exports.length, 1);
  assert.equal(exports[0].filename, "diario_2026-07-16.json");
});

contractTest("reports an export failure without announcing success", async createBackupModal => {
  const notifications = [];
  const fixture = createFixture(createBackupModal, {
    async exportFile() {
      throw new Error("share failed");
    },
    getBackupContext() {
      return { exportData: exportData("failure", notifications) };
    }
  });

  const tree = fixture.harness.render();
  await findButton(tree, "Diary - today").props.onClick();

  assert.deepEqual(notifications, []);
  assert.deepEqual(fixture.alerts, ["Export error: share failed"]);
});

contractTest("resolves separate current contexts for preview and confirmed import", async createBackupModal => {
  const rawBackup = { schema: "nutrition-tracker-account-backup", version: 3, data: { "notes_2026-07-16": "original" } };
  const getterCalls = [];
  const imported = [];
  const reloads = [];
  const applicationReloads = [];
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
      },
      async reloadNutritionData() {
        reloads.push("after-import");
      },
      async reloadApplication() {
        applicationReloads.push("full-reload");
      }
    }
  ];
  const fixture = createFixture(createBackupModal, {
    getBackupContext() {
      const index = getterCalls.length;
      getterCalls.push(index);
      return contexts[Math.min(index, contexts.length - 1)];
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
  assert.deepEqual(reloads, ["after-import"]);
  tree = fixture.harness.render();
  assert.equal(elementText(tree).includes("Import complete: 1 records."), true);
  await findButton(tree, "Refresh data").props.onClick();
  assert.deepEqual(getterCalls, [0, 1, 2]);
  assert.deepEqual(applicationReloads, ["full-reload"]);
  tree = fixture.harness.render();
  assert.equal(elementText(tree).includes("Reloading the app..."), true);
});

contractTest("preserves empty-file behavior by previewing an empty object", async createBackupModal => {
  let previewed;
  let contextCalls = 0;
  const fixture = createFixture(createBackupModal, {
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

contractTest("preserves malformed-JSON behavior without reaching the preview bridge", async createBackupModal => {
  let contextCalls = 0;
  const fixture = createFixture(createBackupModal, {
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
