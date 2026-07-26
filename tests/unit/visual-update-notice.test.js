const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../visual-update-notice.js"))],
  ["ESM", () => import("../../src/components/visual-update-notice.js")]
];

const { normalizeLanguage, pickLang } = createI18n();

function copyFor(VisualUpdateNotice, lang, onDismiss = () => {}) {
  const notice = VisualUpdateNotice({ lang, onDismiss });
  const [message, button] = React.Children.toArray(notice.props.children);
  return { notice, message: message.props.children, button };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createVisualUpdateNotice } = await load();
      const { VisualUpdateNotice } = createVisualUpdateNotice({ React, normalizeLanguage, pickLang });
      return callback(VisualUpdateNotice);
    });
  });
}

contractTest("renders the exact visual-update message in PT, EN, and ES", VisualUpdateNotice => {
  assert.equal(copyFor(VisualUpdateNotice, "pt").message, "A interface do app mudou! Explore o novo visual.");
  assert.equal(copyFor(VisualUpdateNotice, "en").message, "The app interface has changed! Explore the new look.");
  assert.equal(copyFor(VisualUpdateNotice, "es").message, "\u00a1La interfaz de la app ha cambiado! Explora el nuevo dise\u00f1o.");
});

contractTest("keeps the status role and delegates dismissal", VisualUpdateNotice => {
  let calls = 0;
  const rendered = copyFor(VisualUpdateNotice, "pt", () => { calls += 1; });
  assert.equal(rendered.notice.props.role, "status");
  assert.equal(rendered.button.props["aria-label"], "Dispensar aviso");
  rendered.button.props.onClick();
  assert.equal(calls, 1);
});
