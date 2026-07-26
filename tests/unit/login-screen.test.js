const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const { createGoalCalculator } = require("../../goal-calculator.js");
const { createProfileValidation } = require("../../profile-validation.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../login-screen.js"))],
  ["ESM", () => import("../../src/components/login-screen.js")]
];

const { LANGUAGE_OPTIONS, normalizeLanguage } = createI18n();
const { ACTIVITY_LEVELS } = createGoalCalculator();
const { isValidBirthDate, isValidGender } = createProfileValidation({
  storage: { async get() { return null; } },
  activityLevels: ACTIVITY_LEVELS
});
const currentDispatcher = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;

function createHookHarness(Component, props) {
  const state = [];
  const effects = [];
  let tree;

  function render() {
    let hookIndex = 0;
    const pendingEffects = [];
    const dispatcher = {
      useState(initialValue) {
        const index = hookIndex++;
        if (!(index in state)) state[index] = typeof initialValue === "function" ? initialValue() : initialValue;
        const setValue = nextValue => {
          state[index] = typeof nextValue === "function" ? nextValue(state[index]) : nextValue;
        };
        return [state[index], setValue];
      },
      useEffect(callback, dependencies) {
        const index = hookIndex++;
        const previous = effects[index];
        const unchanged = previous && dependencies && previous.dependencies &&
          dependencies.length === previous.dependencies.length &&
          dependencies.every((value, dependencyIndex) => Object.is(value, previous.dependencies[dependencyIndex]));
        if (!unchanged) pendingEffects.push({ index, callback, dependencies });
      }
    };
    const previousDispatcher = currentDispatcher.current;
    currentDispatcher.current = dispatcher;
    try {
      tree = Component(props);
    } finally {
      currentDispatcher.current = previousDispatcher;
    }
    pendingEffects.forEach(({ index, callback, dependencies }) => {
      const previous = effects[index];
      if (previous && typeof previous.cleanup === "function") previous.cleanup();
      effects[index] = { dependencies, cleanup: callback() };
    });
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

function elementText(node) {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(elementText).join("");
  if (typeof node === "object") return React.Children.toArray(node.props && node.props.children).map(elementText).join("");
  return "";
}

function findButton(tree, label, occurrence = 0) {
  return elementsByType(tree, "button").filter(button => elementText(button) === label)[occurrence];
}

function findInput(tree, predicate) {
  return elementsByType(tree, "input").find(input => predicate(input.props));
}

function change(element, value) {
  element.props.onChange({ target: { value } });
}

function fixedDateConstructor() {
  const NativeDate = Date;
  function FixedDate(...args) {
    return args.length ? new NativeDate(...args) : new NativeDate("2026-07-16T12:00:00.000Z");
  }
  FixedDate.now = () => 1234567890;
  return FixedDate;
}

function createFixture(createLoginScreen, { stored = {}, auth = {}, initialDark = true } = {}) {
  const values = new Map(Object.entries({ appLang: "en", ...stored }));
  const localWrites = [];
  const calls = [];
  const documentElement = { dataset: {} };
  const pending = [];
  const loggedIn = [];
  const services = {
    async signIn(email, password) { calls.push(["signIn", email, password]); },
    async checkEmailVerified() { calls.push(["checkEmailVerified"]); return true; },
    async signUp(email, password) { calls.push(["signUp", email, password]); },
    async updateProfile(name) { calls.push(["updateProfile", name]); },
    async setValue(key, value) { calls.push(["setValue", key, value]); },
    async sendVerificationEmail() { calls.push(["sendVerificationEmail"]); },
    async sendPasswordResetEmail(email) { calls.push(["sendPasswordResetEmail", email]); },
    ...auth
  };
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) {
      const stringValue = String(value);
      values.set(key, stringValue);
      localWrites.push([key, stringValue]);
    }
  };
  const { LoginScreen } = createLoginScreen({
    React,
    languageOptions: LANGUAGE_OPTIONS,
    normalizeLanguage,
    isValidBirthDate,
    isValidGender,
    authService: services,
    readPreferredDarkMode() { calls.push(["readPreferredDarkMode"]); return initialDark; },
    localStorage,
    documentElement,
    Date: fixedDateConstructor()
  });
  const harness = createHookHarness(LoginScreen, {
    onLogin(isNew) { calls.push(["onLogin", isNew]); loggedIn.push(isNew); },
    onPendingVerification(email, name) {
      calls.push(["onPendingVerification", email, name]);
      pending.push([email, name]);
    }
  });
  return { harness, calls, pending, loggedIn, localWrites, values, documentElement };
}

function fillLogin(fixture, email = "person@example.com", password = "secret123") {
  fixture.harness.render();
  change(findInput(fixture.harness.tree, props => props.type === "email"), email);
  change(findInput(fixture.harness.tree, props => props.autoComplete === "current-password"), password);
  fixture.harness.render();
}

function switchToRegistration(fixture) {
  fixture.harness.render();
  findButton(fixture.harness.tree, "Create account", 0).props.onClick();
  fixture.harness.render();
}

function fillRegistration(fixture, overrides = {}) {
  const values = {
    email: "new@example.com",
    password: "secret123",
    password2: "secret123",
    name: "New User",
    birthDate: "1990-02-28",
    gender: "female",
    weight: "70.5",
    height: "170",
    ...overrides
  };
  change(findInput(fixture.harness.tree, props => props.type === "email"), values.email);
  const passwords = elementsByType(fixture.harness.tree, "input").filter(input => input.props.autoComplete === "new-password");
  change(passwords[0], values.password);
  change(passwords[1], values.password2);
  change(findInput(fixture.harness.tree, props => props.autoComplete === "name"), values.name);
  change(findInput(fixture.harness.tree, props => props.type === "date"), values.birthDate);
  change(elementsByType(fixture.harness.tree, "select")[0], values.gender);
  const numbers = elementsByType(fixture.harness.tree, "input").filter(input => input.props.type === "number");
  change(numbers[0], values.weight);
  change(numbers[1], values.height);
  fixture.harness.render();
  return values;
}

async function submit(fixture) {
  const form = elementsByType(fixture.harness.tree, "form")[0];
  await form.props.onSubmit({ preventDefault() {} });
  fixture.harness.render();
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createLoginScreen } = await load();
      return callback(createLoginScreen);
    });
  });
}

contractTest("logs in through the named services and reports an existing verified account", async createLoginScreen => {
  const fixture = createFixture(createLoginScreen);
  fillLogin(fixture);
  await submit(fixture);

  assert.deepEqual(fixture.calls.filter(call => call[0] !== "readPreferredDarkMode"), [
    ["signIn", "person@example.com", "secret123"],
    ["checkEmailVerified"],
    ["onLogin", false]
  ]);
  assert.deepEqual(fixture.loggedIn, [false]);
  assert.deepEqual(fixture.pending, []);
});

contractTest("maps invalid login credentials to the existing localized message", async createLoginScreen => {
  const fixture = createFixture(createLoginScreen, {
    auth: {
      async signIn() { throw new Error("INVALID_LOGIN_CREDENTIALS"); }
    }
  });
  fillLogin(fixture);
  await submit(fixture);

  assert.match(elementText(fixture.harness.tree), /Incorrect email or password\./);
  assert.equal(fixture.calls.some(call => call[0] === "checkEmailVerified"), false);
});

contractTest("keeps loading active when login returns to pending verification", async createLoginScreen => {
  const fixture = createFixture(createLoginScreen, {
    auth: {
      async checkEmailVerified() { fixture.calls.push(["checkEmailVerified"]); return false; }
    }
  });
  fillLogin(fixture, "pending@example.com");
  await submit(fixture);

  assert.deepEqual(fixture.pending, [["pending@example.com", undefined]]);
  const submitButton = elementsByType(fixture.harness.tree, "button").find(button => button.props.type === "submit");
  assert.equal(submitButton.props.disabled, true);
  assert.equal(elementText(submitButton), "Processing...");
});

contractTest("preserves the lack of a synchronous double-submit guard", async createLoginScreen => {
  const fixture = createFixture(createLoginScreen);
  fillLogin(fixture);
  const form = elementsByType(fixture.harness.tree, "form")[0];
  await Promise.all([
    form.props.onSubmit({ preventDefault() {} }),
    form.props.onSubmit({ preventDefault() {} })
  ]);

  assert.equal(fixture.calls.filter(call => call[0] === "signIn").length, 2);
});

contractTest("registers with real profile validators and writes the exact persistence keys in order", async createLoginScreen => {
  const fixture = createFixture(createLoginScreen);
  switchToRegistration(fixture);
  fillRegistration(fixture);
  await submit(fixture);

  const relevantCalls = fixture.calls.filter(call => call[0] !== "readPreferredDarkMode");
  assert.deepEqual(relevantCalls.map(call => call[0] === "setValue" ? `${call[0]}:${call[1]}` : call[0]), [
    "signUp",
    "updateProfile",
    "setValue:weightHistory",
    "setValue:userName",
    "setValue:birthDate",
    "setValue:gender",
    "setValue:language",
    "sendVerificationEmail",
    "onPendingVerification"
  ]);
  const weightPayload = JSON.parse(relevantCalls.find(call => call[0] === "setValue" && call[1] === "weightHistory")[2]);
  assert.deepEqual(weightPayload, [{ id: "1234567890", date: "2026-07-16", weight: 70.5, height: 170 }]);
  assert.equal(fixture.values.get("fb_email"), "new@example.com");
  assert.deepEqual(relevantCalls.filter(call => call[0] === "setValue" && call[1] !== "weightHistory"), [
    ["setValue", "userName", "New User"],
    ["setValue", "birthDate", "1990-02-28"],
    ["setValue", "gender", "female"],
    ["setValue", "language", "en"]
  ]);
  assert.deepEqual(fixture.pending, [["new@example.com", "New User"]]);
});

contractTest("rejects invalid birth date and gender through the production validators", async createLoginScreen => {
  const invalidBirth = createFixture(createLoginScreen);
  switchToRegistration(invalidBirth);
  fillRegistration(invalidBirth, { birthDate: "2999-01-01" });
  await submit(invalidBirth);
  assert.match(elementText(invalidBirth.harness.tree), /Date of birth is required and must be valid\./);
  assert.equal(invalidBirth.calls.some(call => call[0] === "signUp"), false);

  const invalidGender = createFixture(createLoginScreen);
  switchToRegistration(invalidGender);
  fillRegistration(invalidGender, { gender: "other" });
  await submit(invalidGender);
  assert.match(elementText(invalidGender.harness.tree), /Gender is required\./);
  assert.equal(invalidGender.calls.some(call => call[0] === "signUp"), false);
});

contractTest("reports an existing registration email without applying later writes", async createLoginScreen => {
  const fixture = createFixture(createLoginScreen, {
    auth: {
      async signUp() { throw new Error("EMAIL_EXISTS"); }
    }
  });
  switchToRegistration(fixture);
  fillRegistration(fixture);
  await submit(fixture);

  assert.match(elementText(fixture.harness.tree), /This email already has an account\./);
  assert.equal(fixture.calls.some(call => call[0] === "setValue"), false);
  assert.equal(fixture.calls.some(call => call[0] === "sendVerificationEmail"), false);
});

contractTest("continues registration without rollback when an initial profile write fails", async createLoginScreen => {
  const fixture = createFixture(createLoginScreen, {
    auth: {
      async setValue(key, value) {
        fixture.calls.push(["setValue", key, value]);
        if (key === "birthDate") throw new Error("WRITE_FAILED");
      }
    }
  });
  switchToRegistration(fixture);
  fillRegistration(fixture);
  await submit(fixture);

  assert.equal(fixture.calls.some(call => call[0] === "setValue" && call[1] === "gender"), true);
  assert.equal(fixture.calls.some(call => call[0] === "sendVerificationEmail"), true);
  assert.deepEqual(fixture.pending, [["new@example.com", "New User"]]);
});

contractTest("sends password recovery for the trimmed email and preserves the neutral response", async createLoginScreen => {
  const fixture = createFixture(createLoginScreen);
  fillLogin(fixture, "  person@example.com  ");
  const resetButton = findButton(fixture.harness.tree, "Forgot password?");
  await resetButton.props.onClick();
  fixture.harness.render();

  assert.deepEqual(fixture.calls.find(call => call[0] === "sendPasswordResetEmail"), [
    "sendPasswordResetEmail",
    "person@example.com"
  ]);
  assert.match(elementText(fixture.harness.tree), /If an account exists for this email/);
});

contractTest("persists language and theme locally and writes the document theme without synchronizing App", createLoginScreen => {
  const fixture = createFixture(createLoginScreen, { stored: { appLang: "pt" }, initialDark: true });
  fixture.harness.render();
  assert.equal(fixture.documentElement.dataset.theme, "dark");

  findButton(fixture.harness.tree, "🇺🇸 EN").props.onClick();
  fixture.harness.render();
  assert.equal(fixture.values.get("appLang"), "en");

  findButton(fixture.harness.tree, "☀").props.onClick();
  fixture.harness.render();
  assert.equal(fixture.values.get("appDarkMode"), "false");
  assert.equal(fixture.documentElement.dataset.theme, "light");
  assert.equal(fixture.localWrites.some(([key]) => key === "appLang"), true);
  assert.equal(fixture.localWrites.some(([key]) => key === "appDarkMode"), true);
});
