const test = require("node:test");
const assert = require("node:assert/strict");
const { canPersistHydratedKey } = require("../../hydration-guard.js");

test("an already hydrated key permits every value including empty and absent values", () => {
  const hydrated = new Set(["key"]);

  for (const value of [[], {}, "", null, undefined, false, 0]) {
    assert.equal(canPersistHydratedKey("key", value, hydrated), true);
  }
});

test("unhydrated arrays require at least one item", () => {
  const hydrated = new Set();

  assert.equal(canPersistHydratedKey("key", [], hydrated), false);
  assert.equal(canPersistHydratedKey("key", [0], hydrated), true);
});

test("unhydrated objects require at least one enumerable property", () => {
  const hydrated = new Set();

  assert.equal(canPersistHydratedKey("key", {}, hydrated), false);
  assert.equal(canPersistHydratedKey("key", { value: undefined }, hydrated), true);
});

test("unhydrated strings require non-zero length while whitespace remains content", () => {
  const hydrated = new Set();

  assert.equal(canPersistHydratedKey("key", "", hydrated), false);
  assert.equal(canPersistHydratedKey("key", " ", hydrated), true);
  assert.equal(canPersistHydratedKey("key", "value", hydrated), true);
});

test("other unhydrated values reject only null and undefined", () => {
  const hydrated = new Set();

  assert.equal(canPersistHydratedKey("key", null, hydrated), false);
  assert.equal(canPersistHydratedKey("key", undefined, hydrated), false);
  assert.equal(canPersistHydratedKey("key", false, hydrated), true);
  assert.equal(canPersistHydratedKey("key", 0, hydrated), true);
  assert.equal(canPersistHydratedKey("key", Number.NaN, hydrated), true);
});

test("preserves the unhydrated non-empty waterGoal overwrite risk", () => {
  assert.equal(canPersistHydratedKey("waterGoal", 2500, new Set()), true);
});
