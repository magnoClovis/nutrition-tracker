const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const { createGoalCalculator } = require("../../goal-calculator.js");
const { createProfileValidation } = require("../../profile-validation.js");
const { createRequiredProfileModal } = require("../../required-profile-modal.js");

const { normalizeLanguage, pickLang } = createI18n();
const { ACTIVITY_LEVELS } = createGoalCalculator();
const currentDispatcher = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;

function createHookHarness(Component, props) {
  const state = [];
  let tree;

  function render() {
    let hookIndex = 0;
    const dispatcher = {
      useState(initialValue) {
        const index = hookIndex++;
        if (!(index in state)) state[index] = typeof initialValue === "function" ? initialValue() : initialValue;
        const setValue = nextValue => {
          state[index] = typeof nextValue === "function" ? nextValue(state[index]) : nextValue;
        };
        return [state[index], setValue];
      }
    };
    const previousDispatcher = currentDispatcher.current;
    currentDispatcher.current = dispatcher;
    try {
      tree = Component(props);
    } finally {
      currentDispatcher.current = previousDispatcher;
    }
    return tree;
  }

  return { render, get tree() { return tree; } };
}

function walkElements(node, visit) {
  if (node === null || node === undefined || typeof node !== "object") return;
  visit(node);
  React.Children.toArray(node.props && node.props.children).forEach(child => walkElements(child, visit));
}

function elementsByType(tree, type) {
  const matches = [];
  walkElements(tree, node => {
    if (node.type === type) matches.push(node);
  });
  return matches;
}

function createFixture(profile = {}, persisted = {}) {
  const values = { ...persisted };
  const writes = [];
  const completed = [];
  const storage = {
    async get(key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? { value: values[key] } : null;
    },
    async set(key, value) {
      writes.push([key, value]);
      values[key] = value;
    }
  };
  const validation = createProfileValidation({ storage, activityLevels: ACTIVITY_LEVELS });
  const { RequiredProfileModal } = createRequiredProfileModal({
    React,
    normalizeLanguage,
    pickLang,
    activityLevels: ACTIVITY_LEVELS,
    storage,
    isValidBirthDate: validation.isValidBirthDate,
    isValidGender: validation.isValidGender,
    isValidGoalProfile: validation.isValidGoalProfile,
    getRequiredProfileData: validation.getRequiredProfileData,
    hasRequiredProfileData: validation.hasRequiredProfileData
  });
  const harness = createHookHarness(RequiredProfileModal, {
    lang: "pt",
    profile,
    onComplete(savedProfile) { completed.push(savedProfile); }
  });
  return { harness, writes, completed, values };
}

async function submit(fixture) {
  const form = elementsByType(fixture.harness.render(), "form")[0];
  let prevented = false;
  await form.props.onSubmit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  return fixture.harness.render();
}

test("renders empty, partial, and complete persisted profile values", () => {
  const empty = createFixture();
  let tree = empty.harness.render();
  assert.deepEqual(elementsByType(tree, "input").map(input => input.props.value), [""]);
  assert.deepEqual(elementsByType(tree, "select").map(select => select.props.value), ["", "", ""]);
  assert.equal(elementsByType(tree, "input")[0].props.max, new Date().toISOString().split("T")[0]);

  const partial = createFixture({ birthDate: "1990-06-15", gender: "female" });
  tree = partial.harness.render();
  assert.deepEqual(elementsByType(tree, "input").map(input => input.props.value), ["1990-06-15"]);
  assert.deepEqual(elementsByType(tree, "select").map(select => select.props.value), ["female", "", ""]);

  const complete = createFixture({
    birthDate: "1990-06-15",
    gender: "male",
    activityLevel: "moderate",
    goalType: "loss",
    goalKg: "5.5",
    goalWeeks: "12"
  });
  tree = complete.harness.render();
  assert.deepEqual(elementsByType(tree, "input").map(input => input.props.value), ["1990-06-15", "5.5", "12"]);
  assert.deepEqual(elementsByType(tree, "select").map(select => select.props.value), ["male", "moderate", "loss"]);
});

test("rejects invalid birth date, gender, activity level, and goal combination", async t => {
  const valid = {
    birthDate: "1990-06-15",
    gender: "female",
    activityLevel: "moderate",
    goalType: "maintenance",
    goalKg: "",
    goalWeeks: ""
  };
  const cases = [
    ["birth date", { birthDate: "2999-01-01" }],
    ["gender", { gender: "other" }],
    ["activity level", { activityLevel: "unknown" }],
    ["goal combination", { goalType: "loss", goalKg: "0", goalWeeks: "10" }]
  ];

  for (const [name, override] of cases) {
    await t.test(name, async () => {
      const fixture = createFixture({ ...valid, ...override });
      const tree = await submit(fixture);
      assert.deepEqual(fixture.writes, []);
      assert.deepEqual(fixture.completed, []);
      assert.equal(elementsByType(tree, "div").some(div => div.props.children === "Preencha todos os dados obrigatórios."), true);
    });
  }
});

test("writes the six exact storage keys and calls onComplete only after a valid reread", async () => {
  const fixture = createFixture({
    birthDate: "1988-02-29",
    gender: "female",
    activityLevel: "very",
    goalType: "gain",
    goalKg: "3.5",
    goalWeeks: "8"
  });

  await submit(fixture);

  assert.deepEqual(fixture.writes, [
    ["birthDate", "1988-02-29"],
    ["gender", "female"],
    ["activityLevel", "very"],
    ["goalType", "gain"],
    ["goalKg", "3.5"],
    ["goalWeeks", "8"]
  ]);
  assert.deepEqual(fixture.completed, [{
    birthDate: "1988-02-29",
    gender: "female",
    activityLevel: "very",
    goalType: "gain",
    goalKg: "3.5",
    goalWeeks: "8",
    manualAdjustment: ""
  }]);
});

test("preserves maintenance storage semantics by clearing goalKg and goalWeeks", async () => {
  const fixture = createFixture({
    birthDate: "1995-01-01",
    gender: "male",
    activityLevel: "light",
    goalType: "maintenance",
    goalKg: "9",
    goalWeeks: "20"
  });

  await submit(fixture);

  assert.deepEqual(fixture.writes.map(([key]) => key), [
    "birthDate",
    "gender",
    "activityLevel",
    "goalType",
    "goalKg",
    "goalWeeks"
  ]);
  assert.deepEqual(fixture.writes.slice(-2), [["goalKg", ""], ["goalWeeks", ""]]);
  assert.equal(fixture.completed.length, 1);
  assert.equal(fixture.completed[0].goalKg, "");
  assert.equal(fixture.completed[0].goalWeeks, "");
});
