const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");

const implementations = [
  ["UMD", () => Promise.resolve(require("../../choice-field.js"))],
  ["ESM", () => import("../../src/components/choice-field.js")]
];

implementations.forEach(([format, load]) => {
  test(`${format}: exposes a reusable controlled ChoiceField`, async () => {
    const { createChoiceField } = await load();
    const { ChoiceField, normalizeOptions, resolveChoiceFieldMode } = createChoiceField({ React });

    assert.equal(typeof ChoiceField, "function");
    assert.deepEqual(normalizeOptions([
      "Breakfast",
      { value: "lunch", label: "Lunch" },
      { value: 3, disabled: true }
    ]), [
      { value: "Breakfast", label: "Breakfast", disabled: false },
      { value: "lunch", label: "Lunch", disabled: false },
      { value: "3", label: "3", disabled: true }
    ]);
    assert.deepEqual(normalizeOptions([{
      value: "medium",
      label: "Medium",
      description: "A quick review is recommended",
      tone: "medium"
    }]), [{
      value: "medium",
      label: "Medium",
      disabled: false,
      description: "A quick review is recommended",
      tone: "medium"
    }]);
    assert.equal(resolveChoiceFieldMode([
      { value: "male", label: "Male" },
      { value: "female", label: "Female" }
    ]), "inline");
    assert.equal(resolveChoiceFieldMode(Array.from({ length: 5 }, (_, index) => String(index))), "inline");
    assert.equal(resolveChoiceFieldMode(Array.from({ length: 6 }, (_, index) => String(index))), "sheet");
    assert.equal(resolveChoiceFieldMode([
      { value: "loss", label: "Weight loss", description: "Reduce weight gradually" },
      { value: "gain", label: "Weight gain" }
    ]), "sheet");
  });

  test(`${format}: rejects a missing React dependency`, async () => {
    const { createChoiceField } = await load();
    assert.throws(() => createChoiceField({ React: null }), /requires a React runtime/);
  });
});
