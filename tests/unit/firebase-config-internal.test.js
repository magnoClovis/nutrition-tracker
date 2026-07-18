const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SOURCE = fs.readFileSync(path.join(__dirname, "..", "..", "firebase-config-internal.js"), "utf8");

function loadConfig(reportServerUrl) {
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

test("publishes the namespaced UMD factory and fixed Firebase endpoints", () => {
  const { api, config } = loadConfig("https://reports.example.test");
  assert.equal(typeof api.createFirebaseConfig, "function");
  assert.equal(config.FB_PROJECT, "nutrition-tracker-780b3");
  assert.equal(config.FB_KEY, "AIzaSyCFRIi8LToXFRqO3vwoaL0EEqzrK3TUgGE");
  assert.equal(config.FB_BASE, "https://firestore.googleapis.com/v1/projects/nutrition-tracker-780b3/databases/(default)/documents/nutrition");
  assert.equal(config.AUTH_BASE, "https://identitytoolkit.googleapis.com/v1/accounts");
  assert.equal(config.TOKEN_BASE, "https://securetoken.googleapis.com/v1/token");
});

test("accepts a valid HTTPS report URL and removes its final slash", () => {
  const { config, warnings } = loadConfig("  https://reports.example.test/root/  ");
  assert.equal(config.REPORT_SERVER_URL, "https://reports.example.test/root");
  assert.equal(config.REPORTS_ENABLED, true);
  assert.deepEqual(warnings, []);
});

test("disables reports for absent, empty, and non-string URL values", () => {
  for (const value of [undefined, "", "   ", null, 123]) {
    const { config, warnings } = loadConfig(value);
    assert.equal(config.REPORT_SERVER_URL, "");
    assert.equal(config.REPORTS_ENABLED, false);
    assert.deepEqual(warnings, []);
  }
});

test("disables reports and warns for invalid and non-HTTPS URLs", () => {
  const invalid = loadConfig("not a url");
  assert.equal(invalid.config.REPORT_SERVER_URL, "");
  assert.equal(invalid.config.REPORTS_ENABLED, false);
  assert.deepEqual(invalid.warnings, ["Advanced reports received an invalid server URL and remain disabled."]);

  const insecure = loadConfig("http://reports.example.test/");
  assert.equal(insecure.config.REPORT_SERVER_URL, "");
  assert.equal(insecure.config.REPORTS_ENABLED, false);
  assert.deepEqual(insecure.warnings, ["Advanced reports require an HTTPS server URL and remain disabled."]);
});

test("derives REPORTS_ENABLED literally from Boolean(REPORT_SERVER_URL)", () => {
  const enabled = loadConfig("https://reports.example.test").config;
  const disabled = loadConfig("").config;
  assert.equal(enabled.REPORTS_ENABLED, Boolean(enabled.REPORT_SERVER_URL));
  assert.equal(disabled.REPORTS_ENABLED, Boolean(disabled.REPORT_SERVER_URL));
});
