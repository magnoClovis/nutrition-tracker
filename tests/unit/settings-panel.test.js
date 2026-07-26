const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../settings-panel.js"))],
  ["ESM", () => import("../../src/components/settings-panel.js")]
];

const {
  LANGUAGE_OPTIONS,
  normalizeLanguage,
  getLanguageOption,
  pickLang
} = createI18n();
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

function elementText(node) {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(elementText).join("");
  if (typeof node === "object") return React.Children.toArray(node.props && node.props.children).map(elementText).join("");
  return "";
}

function findButton(tree, label) {
  return elementsByType(tree, "button").find(button => elementText(button).includes(label));
}

function createFixture(createSettingsPanel, {
  lang = "en",
  darkMode = false,
  directKey = false,
  stored = {},
  signOut,
  callbacks = {}
} = {}) {
  const storageReads = [];
  const storageWrites = [];
  const opened = [];
  const localStorage = {
    getItem(key) {
      storageReads.push(key);
      return Object.prototype.hasOwnProperty.call(stored, key) ? stored[key] : null;
    },
    setItem(key, value) {
      storageWrites.push([key, value]);
      stored[key] = value;
    }
  };
  const { SettingsPanel } = createSettingsPanel({
    React,
    languageOptions: LANGUAGE_OPTIONS,
    normalizeLanguage,
    getLanguageOption,
    pickLang,
    localStorage,
    signOut: signOut || (() => {}),
    openUrl(...args) { opened.push(args); }
  });
  const props = {
    onClose: callbacks.onClose || (() => {}),
    onLogout: callbacks.onLogout || (() => {}),
    onOpenBackup: callbacks.onOpenBackup || (() => {}),
    onOpenPrivacy: callbacks.onOpenPrivacy || (() => {}),
    lang,
    darkMode,
    toggleLang: callbacks.toggleLang || (() => {}),
    toggleDark: callbacks.toggleDark || (() => {}),
    directKey
  };
  return {
    harness: createHookHarness(SettingsPanel, props),
    storageReads,
    storageWrites,
    opened
  };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createSettingsPanel } = await load();
      return callback(createSettingsPanel);
    });
  });
}

contractTest("renders the existing localized copy for light and dark mode combinations", createSettingsPanel => {
  const cases = [
    { lang: "pt", darkMode: false, expected: ["Aparência", "Modo escuro"] },
    { lang: "en", darkMode: true, expected: ["Appearance", "Light mode"] },
    { lang: "es", darkMode: false, expected: ["Apariencia", "Modo oscuro"] }
  ];

  for (const entry of cases) {
    const tree = createFixture(createSettingsPanel, entry).harness.render();
    const text = elementText(tree);
    for (const expected of entry.expected) {
      assert.equal(text.includes(expected), true, `${entry.lang} should include ${expected}: ${text}`);
    }
  }
});

contractTest("delegates language and dark-mode changes to the existing callbacks", createSettingsPanel => {
  const calls = [];
  const fixture = createFixture(createSettingsPanel, {
    lang: "en",
    callbacks: {
      toggleLang(code) { calls.push(["lang", code]); },
      toggleDark() { calls.push(["dark"]); }
    }
  });

  let tree = fixture.harness.render();
  findButton(tree, "Language: English").props.onClick();
  tree = fixture.harness.render();
  findButton(tree, "Português").props.onClick();
  findButton(tree, "Dark mode").props.onClick();

  assert.deepEqual(calls, [["lang", "pt"], ["dark"]]);
});

contractTest("calls signOut before onLogout and onClose", async createSettingsPanel => {
  const order = [];
  const fixture = createFixture(createSettingsPanel, {
    signOut() { order.push("signOut"); },
    callbacks: {
      onLogout() { order.push("onLogout"); },
      onClose() { order.push("onClose"); }
    }
  });

  await findButton(fixture.harness.render(), "Sign out").props.onClick();
  assert.deepEqual(order, ["signOut", "onLogout", "onClose"]);
});

contractTest("keeps logout callbacks running in order when signOut rejects", async createSettingsPanel => {
  const order = [];
  const fixture = createFixture(createSettingsPanel, {
    async signOut() {
      order.push("signOut");
      throw new Error("SIGN_OUT_FAILED");
    },
    callbacks: {
      onLogout() { order.push("onLogout"); },
      onClose() { order.push("onClose"); }
    }
  });

  await findButton(fixture.harness.render(), "Sign out").props.onClick();
  assert.deepEqual(order, ["signOut", "onLogout", "onClose"]);
});

contractTest("reads and writes groq_key and cors_proxy through the injected localStorage", createSettingsPanel => {
  let closeCalls = 0;
  const fixture = createFixture(createSettingsPanel, {
    directKey: true,
    stored: { groq_key: "old-key", cors_proxy: "https://old.example/?" },
    callbacks: { onClose() { closeCalls += 1; } }
  });

  let tree = fixture.harness.render();
  assert.deepEqual(fixture.storageReads, ["groq_key", "cors_proxy"]);
  const inputs = elementsByType(tree, "input");
  assert.deepEqual(inputs.map(input => input.props.value), ["old-key", "https://old.example/?"]);

  inputs[0].props.onChange({ target: { value: "new-key" } });
  inputs[1].props.onChange({ target: { value: "https://proxy.example/?" } });
  tree = fixture.harness.render();
  findButton(tree, "Save").props.onClick();

  assert.deepEqual(fixture.storageWrites, [
    ["groq_key", "new-key"],
    ["cors_proxy", "https://proxy.example/?"]
  ]);
  assert.equal(closeCalls, 1);
});

contractTest("opens the existing feedback form through the injected URL service", createSettingsPanel => {
  let closeCalls = 0;
  const fixture = createFixture(createSettingsPanel, {
    lang: "en",
    callbacks: { onClose() { closeCalls += 1; } }
  });

  let tree = fixture.harness.render();
  findButton(tree, "Send feedback / report a bug").props.onClick();
  tree = fixture.harness.render();
  findButton(tree, "Open form").props.onClick();

  assert.deepEqual(fixture.opened, [[
    "https://forms.gle/4WUAXiWHAWd5vJ94A",
    "_blank",
    "noopener,noreferrer"
  ]]);
  assert.equal(closeCalls, 1);
});
