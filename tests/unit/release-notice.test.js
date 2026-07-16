const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const { createReleaseNotice } = require("../../release-notice.js");

const { normalizeLanguage } = createI18n();
const { ReleaseNoticeModal } = createReleaseNotice({ React, normalizeLanguage });

function renderedCopy(lang, onStartTutorial = () => {}) {
  const overlay = ReleaseNoticeModal({ lang, onStartTutorial });
  const card = React.Children.toArray(overlay.props.children)[0];
  const [title, body, button] = React.Children.toArray(card.props.children);
  return { title: title.props.children, body: body.props.children, buttonLabel: button.props.children, onClick: button.props.onClick };
}

test("renders the existing Portuguese release copy", () => {
  const copy = renderedCopy("pt");
  assert.equal(copy.title, "Bem-vindo à versão 0.8.0 Beta! 🎉🥳");
  assert.equal(copy.buttonLabel, "Ver novidades");
  assert.equal(copy.body, "O Di\u00e1rio Nutricional agora tamb\u00e9m est\u00e1 dispon\u00edvel em espanhol e ganhou novas ferramentas para ajudar nas suas decis\u00f5es: voc\u00ea pode avaliar uma refei\u00e7\u00e3o antes de registr\u00e1-la, acompanhar melhor sua semana e suas m\u00e9tricas corporais e enviar feedback diretamente pelas Configura\u00e7\u00f5es. Preparamos um guia r\u00e1pido com as principais novidades.");
  assert.match(copy.body, /Diário Nutricional agora também está disponível em espanhol/);
});

test("renders the existing English release copy", () => {
  const copy = renderedCopy("en");
  assert.equal(copy.title, "Welcome to version 0.8.0 Beta! 🎉🥳");
  assert.equal(copy.buttonLabel, "See what's new");
  assert.equal(copy.body, "Nutrition Tracker is now also available in Spanish and includes new tools to support your daily decisions: you can evaluate a meal before logging it, follow your weekly and body metrics more clearly, and send feedback directly from Settings. We prepared a quick tour of the main updates.");
  assert.match(copy.body, /Nutrition Tracker is now also available in Spanish/);
});

test("renders the existing Spanish release copy", () => {
  const copy = renderedCopy("es");
  assert.equal(copy.title, "¡Bienvenido a la versión 0.8.0 Beta! 🎉🥳");
  assert.equal(copy.buttonLabel, "Ver novedades");
  assert.equal(copy.body, "Diario Nutricional ya est\u00e1 disponible en espa\u00f1ol e incluye nuevas herramientas para ayudarte en tus decisiones diarias: puedes evaluar una comida antes de registrarla, seguir con m\u00e1s claridad tu semana y tus m\u00e9tricas corporales y enviar comentarios directamente desde Configuraci\u00f3n. Preparamos una gu\u00eda r\u00e1pida con las principales novedades.");
  assert.match(copy.body, /Diario Nutricional ya está disponible en español/);
});

test("invokes onStartTutorial from the release action", () => {
  let calls = 0;
  const onStartTutorial = () => { calls += 1; };
  const copy = renderedCopy("pt", onStartTutorial);
  assert.equal(copy.onClick, onStartTutorial);
  copy.onClick();
  assert.equal(calls, 1);
});
