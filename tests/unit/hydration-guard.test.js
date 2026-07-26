const test = require("node:test");
const assert = require("node:assert/strict");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../hydration-guard.js"))],
  ["ESM", () => import("../../src/leaf/hydration-guard.js")]
];

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => callback(await load()));
  });
}

contractTest("an already hydrated key permits every value including empty and absent values", ({ canPersistHydratedKey }) => {
  const hydrated = new Set(["key"]);

  for (const value of [[], {}, "", null, undefined, false, 0]) {
    assert.equal(canPersistHydratedKey("key", value, hydrated), true);
  }
});

contractTest("unhydrated arrays require at least one item", ({ canPersistHydratedKey }) => {
  const hydrated = new Set();

  assert.equal(canPersistHydratedKey("key", [], hydrated), false);
  assert.equal(canPersistHydratedKey("key", [0], hydrated), true);
});

contractTest("unhydrated objects require at least one enumerable property", ({ canPersistHydratedKey }) => {
  const hydrated = new Set();

  assert.equal(canPersistHydratedKey("key", {}, hydrated), false);
  assert.equal(canPersistHydratedKey("key", { value: undefined }, hydrated), true);
});

contractTest("unhydrated strings require non-zero length while whitespace remains content", ({ canPersistHydratedKey }) => {
  const hydrated = new Set();

  assert.equal(canPersistHydratedKey("key", "", hydrated), false);
  assert.equal(canPersistHydratedKey("key", " ", hydrated), true);
  assert.equal(canPersistHydratedKey("key", "value", hydrated), true);
});

contractTest("other unhydrated values reject only null and undefined", ({ canPersistHydratedKey }) => {
  const hydrated = new Set();

  assert.equal(canPersistHydratedKey("key", null, hydrated), false);
  assert.equal(canPersistHydratedKey("key", undefined, hydrated), false);
  assert.equal(canPersistHydratedKey("key", false, hydrated), true);
  assert.equal(canPersistHydratedKey("key", 0, hydrated), true);
  assert.equal(canPersistHydratedKey("key", Number.NaN, hydrated), true);
});

contractTest("preserves the unhydrated non-empty waterGoal overwrite risk", ({ canPersistHydratedKey }) => {
  assert.equal(canPersistHydratedKey("waterGoal", 2500, new Set()), true);
});
