const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const { createVisualUpdateNotice } = require("../../visual-update-notice.js");

const { normalizeLanguage, pickLang } = createI18n();
const { VisualUpdateNotice } = createVisualUpdateNotice({ React, normalizeLanguage, pickLang });

function copyFor(lang, onDismiss = () => {}) {
  const notice = VisualUpdateNotice({ lang, onDismiss });
  const [message, button] = React.Children.toArray(notice.props.children);
  return { notice, message: message.props.children, button };
}

test("renders the exact visual-update message in PT, EN, and ES", () => {
  assert.equal(copyFor("pt").message, "A interface do app mudou! Explore o novo visual.");
  assert.equal(copyFor("en").message, "The app interface has changed! Explore the new look.");
  assert.equal(copyFor("es").message, "\u00a1La interfaz de la app ha cambiado! Explora el nuevo dise\u00f1o.");
});

test("keeps the status role and delegates dismissal", () => {
  let calls = 0;
  const rendered = copyFor("pt", () => { calls += 1; });
  assert.equal(rendered.notice.props.role, "status");
  assert.equal(rendered.button.props["aria-label"], "Dispensar aviso");
  rendered.button.props.onClick();
  assert.equal(calls, 1);
});
