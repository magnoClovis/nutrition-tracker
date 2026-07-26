const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SOURCE = fs.readFileSync(path.join(__dirname, "..", "..", "firebase-config-internal.js"), "utf8");

function loadUmdConfig(reportServerUrl) {
  const warnings = [];
  const context = {
    URL,
    console: {
      warn(message) { warnings.push(message); }
    }
  };
  if (reportServerUrl !== undefined) {
    context.NUTRITION_TRACKER_CONFIG = { reportServerUrl };
  }
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(SOURCE, context, { filename: "firebase-config-internal.js" });
  return {
    config: context.FirebaseConfigInternal.createFirebaseConfig(),
    warnings,
    api: context.FirebaseConfigInternal
  };
}

function createEsmConfigLoader(api) {
  return reportServerUrl => {
    const warnings = [];
    const hadConfig = Object.prototype.hasOwnProperty.call(globalThis, "NUTRITION_TRACKER_CONFIG");
    const previousConfig = globalThis.NUTRITION_TRACKER_CONFIG;
    const previousConsole = globalThis.console;

    if (reportServerUrl === undefined) delete globalThis.NUTRITION_TRACKER_CONFIG;
    else globalThis.NUTRITION_TRACKER_CONFIG = { reportServerUrl };
    globalThis.console = {
      ...previousConsole,
      warn(message) { warnings.push(message); }
    };

    try {
      return {
        config: api.createFirebaseConfig(),
        warnings,
        api
      };
    } finally {
      if (hadConfig) globalThis.NUTRITION_TRACKER_CONFIG = previousConfig;
      else delete globalThis.NUTRITION_TRACKER_CONFIG;
      globalThis.console = previousConsole;
    }
  };
}

const implementations = [
  ["UMD", async () => loadUmdConfig],
  ["ESM", async () => createEsmConfigLoader(await import("../../src/leaf/firebase-config-internal.js"))]
];

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => callback(await load()));
  });
}

contractTest("publishes the namespaced factory and fixed Firebase endpoints", loadConfig => {
  const { api, config } = loadConfig("https://reports.example.test");
  assert.equal(typeof api.createFirebaseConfig, "function");
  assert.equal(config.FB_PROJECT, "nutrition-tracker-780b3");
  assert.equal(config.FB_KEY, "AIzaSyCFRIi8LToXFRqO3vwoaL0EEqzrK3TUgGE");
  assert.equal(config.FB_BASE, "https://firestore.googleapis.com/v1/projects/nutrition-tracker-780b3/databases/(default)/documents/nutrition");
  assert.equal(config.AUTH_BASE, "https://identitytoolkit.googleapis.com/v1/accounts");
  assert.equal(config.TOKEN_BASE, "https://securetoken.googleapis.com/v1/token");
});

contractTest("accepts a valid HTTPS report URL and removes its final slash", loadConfig => {
  const { config, warnings } = loadConfig("  https://reports.example.test/root/  ");
  assert.equal(config.REPORT_SERVER_URL, "https://reports.example.test/root");
  assert.equal(config.REPORTS_ENABLED, true);
  assert.deepEqual(warnings, []);
});

contractTest("disables reports for absent, empty, and non-string URL values", loadConfig => {
  for (const value of [undefined, "", "   ", null, 123]) {
    const { config, warnings } = loadConfig(value);
    assert.equal(config.REPORT_SERVER_URL, "");
    assert.equal(config.REPORTS_ENABLED, false);
    assert.deepEqual(warnings, []);
  }
});

contractTest("disables reports and warns for invalid and non-HTTPS URLs", loadConfig => {
  const invalid = loadConfig("not a url");
  assert.equal(invalid.config.REPORT_SERVER_URL, "");
  assert.equal(invalid.config.REPORTS_ENABLED, false);
  assert.deepEqual(invalid.warnings, ["Advanced reports received an invalid server URL and remain disabled."]);

  const insecure = loadConfig("http://reports.example.test/");
  assert.equal(insecure.config.REPORT_SERVER_URL, "");
  assert.equal(insecure.config.REPORTS_ENABLED, false);
  assert.deepEqual(insecure.warnings, ["Advanced reports require an HTTPS server URL and remain disabled."]);
});

contractTest("derives REPORTS_ENABLED literally from Boolean(REPORT_SERVER_URL)", loadConfig => {
  const enabled = loadConfig("https://reports.example.test").config;
  const disabled = loadConfig("").config;
  assert.equal(enabled.REPORTS_ENABLED, Boolean(enabled.REPORT_SERVER_URL));
  assert.equal(disabled.REPORTS_ENABLED, Boolean(disabled.REPORT_SERVER_URL));
});
