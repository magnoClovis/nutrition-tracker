const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../release-notice.js"))],
  ["ESM", () => import("../../src/components/release-notice.js")]
];

const { normalizeLanguage } = createI18n();

function renderedCopy(ReleaseNoticeModal, lang, onStartTutorial = () => {}) {
  const overlay = ReleaseNoticeModal({ lang, onStartTutorial });
  assert.equal(overlay.props["data-release-notice"], "true");
  const card = React.Children.toArray(overlay.props.children)[0];
  const [title, body, button] = React.Children.toArray(card.props.children);
  return { title: title.props.children, body: body.props.children, buttonLabel: button.props.children, onClick: button.props.onClick };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createReleaseNotice } = await load();
      const { ReleaseNoticeModal } = createReleaseNotice({ React, normalizeLanguage });
      return callback(ReleaseNoticeModal);
    });
  });
}

contractTest("renders the approved Portuguese 0.11.0 release copy", ReleaseNoticeModal => {
  const copy = renderedCopy(ReleaseNoticeModal, "pt");
  assert.equal(copy.title, "Bem-vindo à versão 0.11.0 Beta! 🎉🥳");
  assert.equal(copy.buttonLabel, "Continuar");
  assert.equal(copy.body, "A avaliação de refeições, a pontuação nutricional e as sugestões da IA agora seguem critérios mais claros e consistentes.");
});

contractTest("renders the approved English 0.11.0 release copy", ReleaseNoticeModal => {
  const copy = renderedCopy(ReleaseNoticeModal, "en");
  assert.equal(copy.title, "Welcome to version 0.11.0 Beta! 🎉🥳");
  assert.equal(copy.buttonLabel, "Continue");
  assert.equal(copy.body, "Meal evaluation, nutrition scores, and AI suggestions now follow clearer and more consistent criteria.");
});

contractTest("renders the approved Spanish 0.11.0 release copy", ReleaseNoticeModal => {
  const copy = renderedCopy(ReleaseNoticeModal, "es");
  assert.equal(copy.title, "¡Bienvenido a la versión 0.11.0 Beta! 🎉🥳");
  assert.equal(copy.buttonLabel, "Continuar");
  assert.equal(copy.body, "La evaluación de comidas, la puntuación nutricional y las sugerencias de IA ahora siguen criterios más claros y coherentes.");
});

contractTest("invokes onStartTutorial from the release action", ReleaseNoticeModal => {
  let calls = 0;
  const onStartTutorial = () => { calls += 1; };
  const copy = renderedCopy(ReleaseNoticeModal, "pt", onStartTutorial);
  assert.equal(copy.onClick, onStartTutorial);
  copy.onClick();
  assert.equal(calls, 1);
});

implementations.forEach(([format, load]) => {
  test(`${format}: exposes one coherent current-release contract`, async () => {
    const {
      CURRENT_RELEASE,
      hasSeenRelease,
      resolveReleaseTutorialType
    } = await load();

    assert.deepEqual(CURRENT_RELEASE, {
      id: "0.11.0-beta",
      versionName: "0.11.0-beta",
      label: "Trofia v0.11.0 Beta",
      tutorialType: "release-highlights"
    });
    assert.equal(hasSeenRelease({ value: "0.11.0-beta" }), true);
    assert.equal(hasSeenRelease({ value: "0.9.0-beta" }), false);
    assert.equal(hasSeenRelease(null), false);
    assert.equal(resolveReleaseTutorialType("new"), "main");
    assert.equal(resolveReleaseTutorialType("existing"), "release-highlights");
    assert.equal(resolveReleaseTutorialType("unknown"), null);
  });
});
