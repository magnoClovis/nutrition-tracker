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
    const { SearchableChoiceField, normalizeOptions, filterOptions, initialsFor } = createSearchableChoiceField({
      React,
      createPortal: node => node,
      documentObject: { body: {} },
    });
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

  test(`${format}: portals the open sheet outside transformed content blocks`, async () => {
    const { createSearchableChoiceField } = await load();
    let stateIndex = 0;
    let portalCall;
    const StaticReact = Object.assign({}, React, {
      useId: () => 'portal-test',
      useState(initialValue) {
        const index = stateIndex++;
        return [index === 0 ? true : (typeof initialValue === 'function' ? initialValue() : initialValue), () => {}];
      },
      useRef: initialValue => ({ current: initialValue }),
      useEffect: () => {},
    });
    const body = {};
    const { SearchableChoiceField } = createSearchableChoiceField({
      React: StaticReact,
      createPortal(node, target) {
        portalCall = { node, target };
        return node;
      },
      documentObject: { body },
    });

    SearchableChoiceField({ label: 'Ingredient', value: '', options: [] });

    assert.equal(portalCall.target, body);
    assert.equal(portalCall.node.props['data-searchable-choice-field-overlay'], 'true');
  });

  test(`${format}: rejects missing runtime dependencies`, async () => {
    const { createSearchableChoiceField } = await load();
    assert.throws(
      () => createSearchableChoiceField({ React: null, createPortal() {}, documentObject: { body: {} } }),
      /requires React, createPortal, and document.body/,
    );
    assert.throws(
      () => createSearchableChoiceField({ React }),
      /requires React, createPortal, and document.body/,
    );
  });
});
