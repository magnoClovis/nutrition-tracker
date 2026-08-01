const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../verify-email-screen.js"))],
  ["ESM", () => import("../../src/components/verify-email-screen.js")]
];

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

  function unmount() {
    effects.forEach(effect => {
      if (effect && typeof effect.cleanup === "function") effect.cleanup();
    });
  }

  return { render, unmount, get tree() { return tree; } };
}

function walkElements(node, visit) {
  if (node === null || node === undefined || typeof node !== "object") return;
  visit(node);
  React.Children.toArray(node.props && node.props.children).forEach(child => walkElements(child, visit));
}

function elementText(node) {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(elementText).join("");
  if (typeof node === "object") return React.Children.toArray(node.props && node.props.children).map(elementText).join("");
  return "";
}

function findButton(tree, label) {
  let match;
  walkElements(tree, node => {
    if (!match && node.type === "button" && elementText(node).includes(label)) match = node;
  });
  return match;
}

function createFixture(createVerifyEmailScreen, { lang = "en", storedLang = "pt", name = "", checkResults = [] } = {}) {
  const intervals = [];
  const events = [];
  let checkIndex = 0;
  let sendCount = 0;
  const { VerifyEmailScreen } = createVerifyEmailScreen({
    React,
    authService: {
      async checkEmailVerified() {
        events.push("check");
        return checkResults[checkIndex++] || false;
      },
      async sendVerificationEmail() {
        sendCount += 1;
      }
    },
    localStorage: {
      getItem(key) {
        assert.equal(key, "appLang");
        return storedLang;
      }
    },
    timers: {
      setInterval(callback, delay) {
        const interval = { callback, delay, cleared: false };
        intervals.push(interval);
        return interval;
      },
      clearInterval(interval) {
        interval.cleared = true;
        events.push("clear");
      }
    }
  });
  const verified = [];
  const harness = createHookHarness(VerifyEmailScreen, {
    email: "person@example.com",
    name,
    lang,
    onVerified(isNew) {
      events.push("verified");
      verified.push(isNew);
    },
    onBack() {}
  });
  return { harness, intervals, events, verified, get sendCount() { return sendCount; } };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createVerifyEmailScreen } = await load();
      return callback(createVerifyEmailScreen);
    });
  });
}

contractTest("renders independent Portuguese, English, and Spanish verification copy", createVerifyEmailScreen => {
  const portuguese = createFixture(createVerifyEmailScreen, { lang: "pt" });
  assert.match(elementText(portuguese.harness.render()), /Verifique seu email/);
  assert.match(elementText(portuguese.harness.tree), /Aguardando verificação/);
  portuguese.harness.unmount();

  const english = createFixture(createVerifyEmailScreen, { lang: "en" });
  assert.match(elementText(english.harness.render()), /Verify your email/);
  assert.match(elementText(english.harness.tree), /Waiting for verification/);
  english.harness.unmount();

  const spanish = createFixture(createVerifyEmailScreen, { lang: "es" });
  assert.match(elementText(spanish.harness.render()), /Verifica tu correo electr\u00f3nico/);
  assert.match(elementText(spanish.harness.tree), /Esperando la verificaci\u00f3n/);
  assert.doesNotMatch(elementText(spanish.harness.tree), /Verifique seu email/);
  assert.doesNotMatch(elementText(spanish.harness.tree), /Verify your email/);
  spanish.harness.unmount();
});

contractTest("gives a truthy lang prop precedence and uses appLang only as fallback", createVerifyEmailScreen => {
  const propWins = createFixture(createVerifyEmailScreen, { lang: "en", storedLang: "pt" });
  assert.match(elementText(propWins.harness.render()), /Verify your email/);
  propWins.harness.unmount();

  const storageFallback = createFixture(createVerifyEmailScreen, { lang: "", storedLang: "en" });
  assert.match(elementText(storageFallback.harness.render()), /Verify your email/);
  storageFallback.harness.unmount();
});

contractTest("polls every 5000 ms, clears the interval, then calls onVerified", async createVerifyEmailScreen => {
  const fixture = createFixture(createVerifyEmailScreen, { name: "Ana", checkResults: [false, false, true] });
  fixture.harness.render();
  assert.equal(fixture.intervals.length, 1);
  assert.equal(fixture.intervals[0].delay, 5000);

  await fixture.intervals[0].callback();
  await fixture.intervals[0].callback();
  assert.deepEqual(fixture.verified, []);
  await fixture.intervals[0].callback();

  assert.deepEqual(fixture.verified, [true]);
  assert.equal(fixture.intervals[0].cleared, true);
  assert.deepEqual(fixture.events.slice(-3), ["check", "clear", "verified"]);
  fixture.harness.unmount();
});

contractTest("resends the verification email through the injected service", async createVerifyEmailScreen => {
  const fixture = createFixture(createVerifyEmailScreen, { lang: "en" });
  fixture.harness.render();
  const resend = findButton(fixture.harness.tree, "Resend verification email");
  assert.ok(resend);

  await resend.props.onClick();
  fixture.harness.render();

  assert.equal(fixture.sendCount, 1);
  assert.match(elementText(fixture.harness.tree), /Email resent!/);
  fixture.harness.unmount();

  const spanish = createFixture(createVerifyEmailScreen, { lang: "es" });
  spanish.harness.render();
  const spanishResend = findButton(spanish.harness.tree, "Reenviar correo de verificaci\u00f3n");
  assert.ok(spanishResend);
  await spanishResend.props.onClick();
  spanish.harness.render();
  assert.equal(spanish.sendCount, 1);
  assert.match(elementText(spanish.harness.tree), /Correo reenviado!/);
  spanish.harness.unmount();
});

contractTest("clears polling on unmount and the active guard prevents late verification", async createVerifyEmailScreen => {
  const fixture = createFixture(createVerifyEmailScreen, { checkResults: [true] });
  fixture.harness.render();
  const interval = fixture.intervals[0];

  fixture.harness.unmount();
  assert.equal(interval.cleared, true);
  await interval.callback();

  assert.deepEqual(fixture.verified, []);
});
