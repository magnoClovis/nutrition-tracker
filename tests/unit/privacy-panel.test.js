const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../privacy-panel.js"))],
  ["ESM", () => import("../../src/components/privacy-panel.js")]
];

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

function findButton(tree, text) {
  return elementsByType(tree, "button").find(button => elementText(button).includes(text));
}

function findInput(tree, placeholder) {
  return elementsByType(tree, "input").find(input => input.props.placeholder === placeholder);
}

function change(element, value) {
  element.props.onChange({ target: { value } });
}

function createFixture(createPrivacyPanel, { lang = "en", signInError, deleteData, fetchBehavior, saveSession } = {}) {
  const events = [];
  const timers = [];
  const savedSessions = [];
  const deleteFirestoreData = deleteData === undefined
    ? async () => { events.push("deleteFirestoreData"); }
    : deleteData;
  const { PrivacyPanel } = createPrivacyPanel({
    React,
    accountService: {
      async signIn(email, password) {
        events.push(`signIn:${email}:${password}`);
        if (signInError) throw signInError;
      },
      async getToken() {
        events.push("getToken");
        return "fresh-token";
      },
      signOut() {
        events.push("signOut");
      },
      getSaveSession() {
        if (saveSession === null) return undefined;
        return data => {
          events.push("saveSession");
          savedSessions.push(data);
          if (typeof saveSession === "function") saveSession(data);
        };
      },
      getDeleteFirestoreData() {
        return deleteFirestoreData === null ? undefined : deleteFirestoreData;
      }
    },
    localStorage: {
      getItem(key) {
        assert.equal(key, "fb_email");
        return "person@example.com";
      }
    },
    async fetchRequest(url, options) {
      const operation = url.includes("accounts:update") ? "update" : "delete";
      events.push(`fetch:${operation}`);
      if (fetchBehavior) return fetchBehavior(operation, url, options);
      if (operation === "update") {
        return { ok: true, async json() { return { idToken: "new-token", refreshToken: "new-refresh" }; } };
      }
      return { ok: true, status: 200, async json() { return {}; } };
    },
    firebaseApiKey: "test-api-key",
    timers: {
      setTimeout(callback, delay) {
        events.push(`setTimeout:${delay}`);
        const timer = { callback, delay };
        timers.push(timer);
        return timer;
      }
    }
  });
  const harness = createHookHarness(PrivacyPanel, {
    lang,
    onClose() { events.push("onClose"); },
    onLogout() { events.push("onLogout"); }
  });
  return { harness, events, timers, savedSessions };
}

function openChangePassword(fixture) {
  fixture.harness.render();
  findButton(fixture.harness.tree, "Change password").props.onClick();
  fixture.harness.render();
}

function fillChangePassword(fixture, current = "current123", next = "newpass123", confirmation = "newpass123") {
  change(findInput(fixture.harness.tree, "Current password"), current);
  change(findInput(fixture.harness.tree, "New password"), next);
  change(findInput(fixture.harness.tree, "Confirm new password"), confirmation);
  fixture.harness.render();
}

function openDeleteAccount(fixture) {
  fixture.harness.render();
  const button = findButton(fixture.harness.tree, "Delete account") || findButton(fixture.harness.tree, "Apagar conta");
  button.props.onClick();
  fixture.harness.render();
}

function fillDeleteConfirmation(fixture, password = "current123", phrase = "DELETE") {
  const passwordInput = elementsByType(fixture.harness.tree, "input").find(input => input.props.type === "password");
  const phraseInput = elementsByType(fixture.harness.tree, "input").find(input => input.props.type === "text");
  change(passwordInput, password);
  change(phraseInput, phrase);
  fixture.harness.render();
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createPrivacyPanel } = await load();
      return callback(createPrivacyPanel);
    });
  });
}

contractTest("changes the password, saves returned tokens, and keeps the exact 1500 ms timer", async createPrivacyPanel => {
  const fixture = createFixture(createPrivacyPanel);
  openChangePassword(fixture);
  fillChangePassword(fixture);
  await findButton(fixture.harness.tree, "Save new password").props.onClick();
  fixture.harness.render();

  assert.deepEqual(fixture.events, [
    "signIn:person@example.com:current123",
    "getToken",
    "fetch:update",
    "saveSession",
    "setTimeout:1500"
  ]);
  assert.deepEqual(fixture.savedSessions, [{ idToken: "new-token", refreshToken: "new-refresh" }]);
  assert.match(elementText(fixture.harness.tree), /Password changed successfully!/);
  assert.equal(fixture.timers[0].delay, 1500);

  fixture.timers[0].callback();
  fixture.harness.render();
  assert.match(elementText(fixture.harness.tree), /Privacy & security/);
});

contractTest("preserves the generic password-change error for reauthentication and REST failures", async createPrivacyPanel => {
  const reauth = createFixture(createPrivacyPanel, { signInError: new Error("INVALID_LOGIN_CREDENTIALS") });
  openChangePassword(reauth);
  fillChangePassword(reauth);
  await findButton(reauth.harness.tree, "Save new password").props.onClick();
  reauth.harness.render();
  assert.match(elementText(reauth.harness.tree), /Current password incorrect or error changing password\./);
  assert.equal(reauth.events.some(event => event === "fetch:update"), false);

  const rest = createFixture(createPrivacyPanel, {
    fetchBehavior: async operation => {
      assert.equal(operation, "update");
      return { ok: false, async json() { return { error: { message: "WEAK_PASSWORD" } }; } };
    }
  });
  openChangePassword(rest);
  fillChangePassword(rest);
  await findButton(rest.harness.tree, "Save new password").props.onClick();
  rest.harness.render();
  assert.match(elementText(rest.harness.tree), /Current password incorrect or error changing password\./);
  assert.equal(rest.events.includes("saveSession"), false);
});

contractTest("requires both password and the exact confirmation phrase before deletion", async createPrivacyPanel => {
  const fixture = createFixture(createPrivacyPanel);
  openDeleteAccount(fixture);
  await findButton(fixture.harness.tree, "Delete account permanently").props.onClick();
  fixture.harness.render();
  assert.match(elementText(fixture.harness.tree), /Enter your password to confirm\./);
  assert.equal(fixture.events.length, 0);

  fillDeleteConfirmation(fixture, "current123", "delete");
  await findButton(fixture.harness.tree, "Delete account permanently").props.onClick();
  fixture.harness.render();
  assert.match(elementText(fixture.harness.tree), /Type DELETE to confirm\./);
  assert.equal(fixture.events.length, 0);
});

contractTest("deletes Firestore then Auth and logs out in the exact successful order", async createPrivacyPanel => {
  const fixture = createFixture(createPrivacyPanel);
  openDeleteAccount(fixture);
  fillDeleteConfirmation(fixture);
  await findButton(fixture.harness.tree, "Delete account permanently").props.onClick();

  assert.deepEqual(fixture.events, [
    "signIn:person@example.com:current123",
    "deleteFirestoreData",
    "getToken",
    "fetch:delete",
    "signOut",
    "onLogout"
  ]);
});

contractTest("stops after a Firestore deletion failure without Auth deletion or logout", async createPrivacyPanel => {
  const fixture = createFixture(createPrivacyPanel, {
    deleteData: async () => {
      fixture.events.push("deleteFirestoreData");
      throw new Error("PARTIAL_FIRESTORE_DELETE");
    }
  });
  openDeleteAccount(fixture);
  fillDeleteConfirmation(fixture);
  await findButton(fixture.harness.tree, "Delete account permanently").props.onClick();
  fixture.harness.render();

  assert.deepEqual(fixture.events, [
    "signIn:person@example.com:current123",
    "deleteFirestoreData"
  ]);
  assert.match(elementText(fixture.harness.tree), /Incorrect password or error deleting account\./);
});

contractTest("reports a network failure after Firestore deletion, keeps the panel open, and does not log out", async createPrivacyPanel => {
  const fixture = createFixture(createPrivacyPanel, {
    fetchBehavior: async operation => {
      assert.equal(operation, "delete");
      throw new Error("NETWORK_FAILURE");
    }
  });
  openDeleteAccount(fixture);
  fillDeleteConfirmation(fixture);
  await findButton(fixture.harness.tree, "Delete account permanently").props.onClick();
  fixture.harness.render();

  assert.deepEqual(fixture.events, [
    "signIn:person@example.com:current123",
    "deleteFirestoreData",
    "getToken",
    "fetch:delete"
  ]);
  const text = elementText(fixture.harness.tree);
  assert.match(text, /Firestore data has already been removed/);
  assert.match(text, /account was not deleted/);
  assert.ok(findButton(fixture.harness.tree, "Delete account permanently"));
});

for (const status of [400, 401, 500]) {
  contractTest(`blocks logout and keeps the panel open when Auth deletion returns HTTP ${status}`, async createPrivacyPanel => {
    const fixture = createFixture(createPrivacyPanel, {
      fetchBehavior: async operation => {
        assert.equal(operation, "delete");
        return { ok: false, status, async json() { return { error: { message: "AUTH_DELETE_FAILED" } }; } };
      }
    });
    openDeleteAccount(fixture);
    fillDeleteConfirmation(fixture);
    await findButton(fixture.harness.tree, "Delete account permanently").props.onClick();
    fixture.harness.render();

    assert.deepEqual(fixture.events.slice(-2), ["getToken", "fetch:delete"]);
    assert.equal(fixture.events.includes("signOut"), false);
    assert.equal(fixture.events.includes("onLogout"), false);
    const text = elementText(fixture.harness.tree);
    assert.match(text, /Firestore data has already been removed/);
    assert.match(text, /account was not deleted/);
    assert.ok(findButton(fixture.harness.tree, "Delete account permanently"));
  });
}

contractTest("shows the Auth deletion failure message in Portuguese, English, and Spanish", async createPrivacyPanel => {
  const cases = [
    { lang: "pt", phrase: "APAGAR", expected: /Seus dados do Firestore j\u00e1 foram removidos, mas a conta n\u00e3o foi exclu\u00edda/ },
    { lang: "en", phrase: "DELETE", expected: /Your Firestore data has already been removed, but your account was not deleted/ },
    { lang: "es", phrase: "DELETE", expected: /Tus datos de Firestore ya se eliminaron, pero la cuenta no/ }
  ];

  for (const { lang, phrase, expected } of cases) {
    const fixture = createFixture(createPrivacyPanel, {
      lang,
      fetchBehavior: async operation => {
        assert.equal(operation, "delete");
        return { ok: false, status: 500, async json() { return {}; } };
      }
    });
    openDeleteAccount(fixture);
    fillDeleteConfirmation(fixture, "current123", phrase);
    await findButton(fixture.harness.tree, lang === "pt" ? "Apagar conta permanentemente" : "Delete account permanently").props.onClick();
    fixture.harness.render();

    assert.match(elementText(fixture.harness.tree), expected);
    assert.equal(fixture.events.includes("signOut"), false);
    assert.equal(fixture.events.includes("onLogout"), false);
  }
});

contractTest("deliberately skips missing Firestore cleanup and continues Auth deletion", async createPrivacyPanel => {
  const fixture = createFixture(createPrivacyPanel, { deleteData: null });
  openDeleteAccount(fixture);
  fillDeleteConfirmation(fixture);
  await findButton(fixture.harness.tree, "Delete account permanently").props.onClick();

  assert.deepEqual(fixture.events, [
    "signIn:person@example.com:current123",
    "getToken",
    "fetch:delete",
    "signOut",
    "onLogout"
  ]);
});

contractTest("does not claim Firestore removal when optional cleanup was missing and Auth deletion fails", async createPrivacyPanel => {
  const fixture = createFixture(createPrivacyPanel, {
    deleteData: null,
    fetchBehavior: async operation => {
      assert.equal(operation, "delete");
      return { ok: false, status: 500, async json() { return {}; } };
    }
  });
  openDeleteAccount(fixture);
  fillDeleteConfirmation(fixture);
  await findButton(fixture.harness.tree, "Delete account permanently").props.onClick();
  fixture.harness.render();

  const text = elementText(fixture.harness.tree);
  assert.match(text, /Your account was not deleted/);
  assert.doesNotMatch(text, /Firestore data has already been removed/);
  assert.equal(fixture.events.includes("signOut"), false);
  assert.equal(fixture.events.includes("onLogout"), false);
});

contractTest("keeps Spanish on the English path with the DELETE confirmation phrase", async createPrivacyPanel => {
  const fixture = createFixture(createPrivacyPanel, { lang: "es" });
  openDeleteAccount(fixture);
  assert.match(elementText(fixture.harness.tree), /This action is irreversible/);
  assert.equal(findInput(fixture.harness.tree, "Type DELETE to confirm").props.value, "");
});

contractTest("links to the canonical public privacy policy in Portuguese, English, and Spanish", async createPrivacyPanel => {
  const labels = {
    pt: "Ler a política de privacidade",
    en: "Read the privacy policy",
    es: "Leer la política de privacidad"
  };

  for (const [lang, label] of Object.entries(labels)) {
    const fixture = createFixture(createPrivacyPanel, { lang });
    fixture.harness.render();
    const link = elementsByType(fixture.harness.tree, "a").find(element => elementText(element).includes(label));
    assert.ok(link, `missing policy link for ${lang}`);
    assert.equal(link.props.href, "https://magnoclovis.github.io/nutrition-tracker/privacy/");
    assert.equal(link.props.target, "_blank");
    assert.equal(link.props.rel, "noopener noreferrer");
  }
});
