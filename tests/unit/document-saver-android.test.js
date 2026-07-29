const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sourcePath = path.resolve(
  __dirname,
  "../../android/app/src/main/java/com/hermegas/phrona/DocumentSaverPlugin.java"
);

test("stages large exports outside the Capacitor activity-state bundle", () => {
  const source = fs.readFileSync(sourcePath, "utf8");
  const stageIndex = source.indexOf("File.createTempFile");
  const removeIndex = source.indexOf('call.getData().remove("content")');
  const pickerIndex = source.indexOf("startActivityForResult(call, intent");

  assert.ok(stageIndex >= 0);
  assert.ok(removeIndex > stageIndex);
  assert.ok(pickerIndex > removeIndex);
  assert.match(source, /protected Bundle saveInstanceState\(\)/);
  assert.match(source, /STATE_PENDING_FILE/);
});

test("copies staged bytes to the selected document and always cleans the cache file", () => {
  const source = fs.readFileSync(sourcePath, "utf8");

  assert.match(source, /new FileInputStream\(stagedFile\)/);
  assert.match(source, /openOutputStream\(uri, "wt"\)/);
  assert.match(source, /output\.write\(buffer, 0, count\)/);
  assert.match(source, /cleanupPendingFile\(\)/);
});
