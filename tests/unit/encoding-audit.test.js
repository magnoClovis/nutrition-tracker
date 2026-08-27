const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  findMojibake,
  isRuntimeSourcePath,
  scanFiles
} = require("../../scripts/encoding-audit.js");

test("recognizes every tracked runtime source family without scanning tests or documentation", () => {
  assert.equal(isRuntimeSourcePath("app.js"), true);
  assert.equal(isRuntimeSourcePath("capacitor.config.ts"), true);
  assert.equal(isRuntimeSourcePath("src/components/login-screen.js"), true);
  assert.equal(isRuntimeSourcePath("worker/src/ai-worker.js"), true);
  assert.equal(isRuntimeSourcePath("android/app/src/main/AndroidManifest.xml"), true);
  assert.equal(isRuntimeSourcePath("tests/unit/i18n.test.js"), false);
  assert.equal(isRuntimeSourcePath("ROADMAP.md"), false);
  assert.equal(isRuntimeSourcePath("scripts/preflight-release.ps1"), false);
});

test("detects replacement, latin-1, punctuation, and emoji corruption without rejecting valid accents", () => {
  const corrupted = [
    String.fromCodePoint(0xFFFD),
    String.fromCodePoint(0x00C3, 0x00A7),
    String.fromCodePoint(0x00E2, 0x20AC, 0x0153),
    String.fromCodePoint(0x00F0, 0x0178, 0x0091, 0x008B)
  ].join("\n");
  assert.equal(findMojibake(corrupted).length, 4);
  assert.deepEqual(findMojibake("AVALIAÇÃO\nInformación\nNutrição"), []);
});

test("reports the tracked file and line containing corrupted runtime text", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trofia-encoding-audit-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "src", "good.js"), "const title = 'Nutrição';\n", "utf8");
  fs.writeFileSync(
    path.join(root, "src", "bad.js"),
    `const first = 'ok';\nconst second = '${String.fromCodePoint(0x00C3, 0x00A9)}';\n`,
    "utf8"
  );

  const findings = scanFiles(root, ["src/good.js", "src/bad.js"]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, "src/bad.js");
  assert.equal(findings[0].line, 2);
});

test("ignores tracked runtime paths removed by the current pre-commit cutover", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trofia-encoding-audit-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "active.js"), "const title = 'Nutrição';\n", "utf8");

  assert.deepEqual(scanFiles(root, ["active.js", "removed-runtime.js"]), []);
});
