const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const { createGoalCalculator } = require("../../goal-calculator.js");
const { createProfileValidation } = require("../../profile-validation.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../required-profile-modal.js"))],
  ["ESM", () => import("../../src/components/required-profile-modal.js")]
];

const { normalizeLanguage, pickLang } = createI18n();
const { ACTIVITY_LEVELS } = createGoalCalculator();
const currentDispatcher = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;

function ChoiceField() {}
function DateField() {}

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

function createFixture(createRequiredProfileModal, profile = {}, persisted = {}) {
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
    ChoiceField,
    DateField,
    activityLevels: ACTIVITY_LEVELS,
    storage,
    isValidBirthDate: validation.isValidBirthDate,
    isValidGender: validation.isValidGender,
    isValidGoalProfile: validation.isValidGoalProfile,
    getRequiredProfileData: validation.getRequiredProfileData,
    hasRequiredProfileData: validation.hasRequiredProfileData,
    localToday: () => "2026-07-31"
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

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async t => {
      const { createRequiredProfileModal } = await load();
      return callback(createRequiredProfileModal, t);
    });
  });
}

contractTest("renders empty, partial, and complete persisted profile values", createRequiredProfileModal => {
  const empty = createFixture(createRequiredProfileModal);
  let tree = empty.harness.render();
  assert.deepEqual(elementsByType(tree, "input").map(input => input.props.value), []);
  assert.deepEqual(elementsByType(tree, DateField).map(field => field.props.value), [""]);
  assert.deepEqual(elementsByType(tree, ChoiceField).map(field => field.props.value), ["", "", ""]);
  assert.equal(elementsByType(tree, DateField)[0].props.max, "2026-07-31");
  assert.equal(elementsByType(tree, "input").some(input => input.props.type === "date"), false);

  const partial = createFixture(createRequiredProfileModal, { birthDate: "1990-06-15", gender: "female" });
  tree = partial.harness.render();
  assert.deepEqual(elementsByType(tree, "input").map(input => input.props.value), []);
  assert.deepEqual(elementsByType(tree, DateField).map(field => field.props.value), ["1990-06-15"]);
  assert.deepEqual(elementsByType(tree, ChoiceField).map(field => field.props.value), ["female", "", ""]);

  const complete = createFixture(createRequiredProfileModal, {
    birthDate: "1990-06-15",
    gender: "male",
    activityLevel: "moderate",
    goalType: "loss",
    goalKg: "5.5",
    goalWeeks: "12"
  });
  tree = complete.harness.render();
  assert.deepEqual(elementsByType(tree, "input").map(input => input.props.value), ["5.5", "12"]);
  assert.deepEqual(elementsByType(tree, DateField).map(field => field.props.value), ["1990-06-15"]);
  assert.deepEqual(elementsByType(tree, ChoiceField).map(field => field.props.value), ["male", "moderate", "loss"]);
});

contractTest("uses inline gender and described bottom-sheet activity and goal ChoiceFields", createRequiredProfileModal => {
  const fixture = createFixture(createRequiredProfileModal);
  const tree = fixture.harness.render();
  const fields = elementsByType(tree, ChoiceField);

  assert.equal(elementsByType(tree, "select").length, 0);
  assert.deepEqual(fields.map(field => field.props.id), [
    "required-profile-gender",
    "required-profile-activity",
    "required-profile-goal"
  ]);
  assert.equal(fields[0].props.options.length, 2);
  assert.equal(fields[0].props.options.some(option => option.description), false);
  assert.equal(fields[1].props.options.length, 5);
  assert.equal(fields[1].props.options.every(option => option.description), true);
  assert.equal(fields[2].props.options.length, 3);
  assert.equal(fields[2].props.options.every(option => option.description), true);
});

contractTest("rejects invalid birth date, gender, activity level, and goal combination", async (createRequiredProfileModal, t) => {
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
      const fixture = createFixture(createRequiredProfileModal, { ...valid, ...override });
      const tree = await submit(fixture);
      assert.deepEqual(fixture.writes, []);
      assert.deepEqual(fixture.completed, []);
      assert.equal(elementsByType(tree, "div").some(div => div.props.children === "Preencha todos os dados obrigatórios."), true);
    });
  }
});

contractTest("writes the six exact storage keys and calls onComplete only after a valid reread", async createRequiredProfileModal => {
  const fixture = createFixture(createRequiredProfileModal, {
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

contractTest("preserves maintenance storage semantics by clearing goalKg and goalWeeks", async createRequiredProfileModal => {
  const fixture = createFixture(createRequiredProfileModal, {
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

contractTest("renders a distinct retryable profile-read error in PT, EN, and ES", createRequiredProfileModal => {
  const storage = { async get() { return null; }, async set() {} };
  const validation = createProfileValidation({ storage, activityLevels: ACTIVITY_LEVELS });
  const { RequiredProfileReadError } = createRequiredProfileModal({
    React,
    normalizeLanguage,
    pickLang,
    ChoiceField,
    DateField,
    activityLevels: ACTIVITY_LEVELS,
    storage,
    isValidBirthDate: validation.isValidBirthDate,
    isValidGender: validation.isValidGender,
    isValidGoalProfile: validation.isValidGoalProfile,
    getRequiredProfileData: validation.getRequiredProfileData,
    hasRequiredProfileData: validation.hasRequiredProfileData,
    localToday: () => "2026-09-01"
  });
  const expectedTitles = {
    pt: "Não foi possível carregar seu perfil",
    en: "Your profile could not be loaded",
    es: "No se pudo cargar tu perfil"
  };

  for (const [lang, title] of Object.entries(expectedTitles)) {
    let retries = 0;
    let logouts = 0;
    const tree = RequiredProfileReadError({
      lang,
      errorCode: "permission-denied",
      onRetry() { retries += 1; },
      onLogout() { logouts += 1; }
    });
    assert.equal(tree.props["data-required-profile-read-error"], "true");
    assert.equal(elementsByType(tree, "div").some(element => element.props.children === title), true);
    assert.equal(
      elementsByType(tree, "div").some(element =>
        String(element.props.children || "").includes("permission-denied")),
      true
    );
    const buttons = elementsByType(tree, "button");
    assert.equal(buttons.length, 2);
    buttons[0].props.onClick();
    buttons[1].props.onClick();
    assert.equal(retries, 1);
    assert.equal(logouts, 1);
  }

  const sanitized = RequiredProfileReadError({
    lang: "en",
    errorCode: "secret details with spaces",
    onRetry() {},
    onLogout() {}
  });
  assert.equal(
    elementsByType(sanitized, "div").some(element =>
      String(element.props.children || "").includes("firestore-profile-read-failed")),
    true
  );
  assert.equal(JSON.stringify(sanitized).includes("secret details with spaces"), false);
});
