const test = require("node:test");
const assert = require("node:assert/strict");
const ReactRuntime = require("../../vendor/react.production.min.js");

const implementations = [
  ["UMD", () => Promise.resolve(require("../../selection-controls.js"))],
  ["ESM", () => import("../../src/components/selection-controls.js")]
];

const React = Object.assign({}, ReactRuntime, {
  useId: () => ":selection-controls-test:"
});

function childrenOf(node) {
  return ReactRuntime.Children.toArray(node?.props?.children);
}

function findNode(node, predicate) {
  if (!node || typeof node !== "object") return null;
  if (predicate(node)) return node;
  for (const child of childrenOf(node)) {
    const match = findNode(child, predicate);
    if (match) return match;
  }
  return null;
}

implementations.forEach(([format, load]) => {
  test(`${format}: CheckboxField keeps a controlled native checkbox and refined mark`, async () => {
    const { createSelectionControls } = await load();
    const { CheckboxField } = createSelectionControls({ React });
    const changes = [];
    const tree = CheckboxField({
      id: "foods-all",
      label: "Use all foods",
      description: "Keeps the manual selection",
      checked: true,
      required: true,
      name: "foods",
      value: "all",
      onChange: (checked, event) => changes.push([checked, event.type])
    });
    const input = findNode(tree, node => node.type === "input");
    const mark = findNode(tree, node => node.props?.["data-checkbox-field-mark"] === "true");
    const icon = childrenOf(mark)[0];

    assert.equal(tree.type, "label");
    assert.equal(tree.props["data-checkbox-field"], "true");
    assert.equal(input.props.type, "checkbox");
    assert.equal(input.props.checked, true);
    assert.equal(input.props.required, true);
    assert.equal(input.props.name, "foods");
    assert.equal(input.props.value, "all");
    assert.equal(input.props["aria-describedby"], "foods-all-description");
    assert.ok(mark);
    assert.equal(icon.type.name, "CheckIcon");
    input.props.onChange({ type: "change", target: { checked: false } });
    assert.deepEqual(changes, [[false, "change"]]);
  });

  test(`${format}: SliderField preserves native range constraints and numeric callbacks`, async () => {
    const { createSelectionControls } = await load();
    const { SliderField } = createSelectionControls({ React });
    const changes = [];
    const tree = SliderField({
      id: "meal-size",
      label: "Meal size",
      value: 20,
      min: -40,
      max: 40,
      step: 5,
      valueText: "+20% · 620 kcal",
      minLabel: "− deficit",
      centerLabel: "0%",
      maxLabel: "+ surplus",
      onChange: value => changes.push(value)
    });
    const input = findNode(tree, node => node.type === "input");
    const output = findNode(tree, node => node.type === "output");
    const scale = findNode(tree, node => node.props?.["data-slider-field-scale"] === "true");

    assert.equal(input.props.type, "range");
    assert.equal(input.props.min, -40);
    assert.equal(input.props.max, 40);
    assert.equal(input.props.step, 5);
    assert.equal(input.props.value, 20);
    assert.equal(input.props["aria-valuetext"], "+20% · 620 kcal");
    assert.equal(input.props.style["--slider-field-progress"], "75%");
    assert.equal(output.props.htmlFor, "meal-size");
    assert.ok(scale);
    input.props.onChange({ target: { value: "35" } });
    assert.deepEqual(changes, [35]);
  });

  test(`${format}: SliderField clamps an invalid controlled value to native bounds`, async () => {
    const { createSelectionControls } = await load();
    const { SliderField } = createSelectionControls({ React });
    const tree = SliderField({ label: "Protein", value: 99, min: 5, max: 50 });
    const input = findNode(tree, node => node.type === "input");

    assert.equal(input.props.value, 50);
    assert.equal(input.props.style["--slider-field-progress"], "100%");
  });

  test(`${format}: rejects a missing React dependency`, async () => {
    const { createSelectionControls } = await load();
    assert.throws(() => createSelectionControls({ React: null }), /requires a React runtime/);
  });
});
