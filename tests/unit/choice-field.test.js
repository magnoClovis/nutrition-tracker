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
    const { ChoiceField, normalizeOptions } = createChoiceField({ React });

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
  });

  test(`${format}: rejects a missing React dependency`, async () => {
    const { createChoiceField } = await load();
    assert.throws(() => createChoiceField({ React: null }), /requires a React runtime/);
  });
});
