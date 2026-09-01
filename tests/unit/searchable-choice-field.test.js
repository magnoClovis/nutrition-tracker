const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");

const implementations = [
  ["UMD", () => Promise.resolve(require("../../searchable-choice-field.js"))],
  ["ESM", () => import("../../src/components/searchable-choice-field.js")]
];

implementations.forEach(([format, load]) => {
  test(`${format}: exposes searchable option normalization and accent-insensitive filtering`, async () => {
    const { createSearchableChoiceField } = await load();
    const { SearchableChoiceField, normalizeOptions, filterOptions, initialsFor } = createSearchableChoiceField({ React });
    const options = normalizeOptions([
      { value: 1, label: "Vitamina D3", description: "Dose padrão · 1 cáps", mark: "D3" },
      { value: "omega", label: "Ômega 3", description: "Dose padrão · 2 cáps" },
      "Creatina"
    ]);

    assert.equal(typeof SearchableChoiceField, "function");
    assert.deepEqual(options, [
      { value: "1", label: "Vitamina D3", disabled: false, description: "Dose padrão · 1 cáps", mark: "D3" },
      { value: "omega", label: "Ômega 3", disabled: false, description: "Dose padrão · 2 cáps", mark: undefined },
      { value: "Creatina", label: "Creatina", disabled: false }
    ]);
    assert.deepEqual(filterOptions(options, "omega").map(option => option.value), ["omega"]);
    assert.deepEqual(filterOptions(options, "caps").map(option => option.value), ["1", "omega"]);
    assert.deepEqual(filterOptions(options, "").map(option => option.value), ["1", "omega", "Creatina"]);
    assert.equal(initialsFor("Creatina monohidratada"), "CM");
    assert.equal(initialsFor("Whey"), "WH");
  });

  test(`${format}: rejects a missing React dependency`, async () => {
    const { createSearchableChoiceField } = await load();
    assert.throws(() => createSearchableChoiceField({ React: null }), /requires a React runtime/);
  });
});
