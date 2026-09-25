const test = require('node:test');
const assert = require('node:assert/strict');
const { createI18n } = require('../../i18n.js');
const { createImageMealAnalysisScreen } = require('../../image-meal-analysis-screen.js');

function fakeReact(states = []) {
  let stateIndex = 0;
  return {
    createElement(type, props, ...children) {
      return { type, props: { ...(props || {}), children } };
    },
    useState(initial) {
      const configured = stateIndex < states.length ? states[stateIndex] : initial;
      stateIndex += 1;
      return [configured, () => {}];
    },
    useEffect(callback) {
      const cleanup = callback();
      if (typeof cleanup === 'function') cleanup();
    },
  };
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  (node.props?.children || []).flat(Infinity).forEach(child => walk(child, visit));
}

function textContent(node) {
  const parts = [];
  function collect(value) {
    if (typeof value === 'string' || typeof value === 'number') parts.push(String(value));
    else if (value && typeof value === 'object') (value.props?.children || []).flat(Infinity).forEach(collect);
  }
  collect(node);
  return parts.join('');
}

test('renders the captured photo unblurred, localized honest copy, and reachable cancel action', () => {
  const React = fakeReact();
  const { pickLang } = createI18n();
  const { ImageMealAnalysisScreen } = createImageMealAnalysisScreen({ React, pickLang });

  for (const [lang, heading] of [
    ['pt', 'Analisando a refeição'],
    ['en', 'Analyzing the meal'],
    ['es', 'Analizando la comida'],
  ]) {
    let cancelled = 0;
    const view = ImageMealAnalysisScreen({ photoUrl: 'blob:frozen', lang, onCancel: () => { cancelled += 1; } });
    const nodes = [];
    walk(view, node => nodes.push(node));
    const photo = nodes.find(node => node.props?.['data-image-meal-analysis-photo'] === 'true');
    const scrim = nodes.find(node => node.props?.['data-image-meal-analysis-scrim'] === 'true');
    const status = nodes.find(node => node.props?.['data-image-meal-analysis-status'] === 'true');
    const cancel = nodes.find(node => node.props?.['data-image-meal-cancel'] === 'true');
    assert.equal(photo.props.src, 'blob:frozen');
    assert.equal(photo.props['aria-hidden'], 'true');
    assert.ok(scrim);
    assert.equal(status.props.role, 'status');
    assert.match(textContent(view), new RegExp(heading));
    cancel.props.onClick();
    assert.equal(cancelled, 1);
  }
});

test('keeps processing language honest and free from fabricated backend phases', () => {
  const React = fakeReact();
  const { pickLang } = createI18n();
  const { ImageMealAnalysisScreen } = createImageMealAnalysisScreen({ React, pickLang });
  const visibleCopy = textContent(ImageMealAnalysisScreen({ photoUrl: 'blob:frozen', lang: 'pt', onCancel() {} }));
  assert.match(visibleCopy, /Analisando a refeição/);
  assert.doesNotMatch(visibleCopy, /Worker|Gemini|fase 1|phase 1/i);
});

test('uses a solid corner mask and never blurs the captured photo', () => {
  const css = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', '..', 'one-ui.css'), 'utf8');
  assert.match(css, /rgb\(6, 16, 13\) var\(--camera-stage-radius\)/);
  assert.doesNotMatch(css, /\[data-image-meal-analysis-photo="true"\][^{]*\{[^}]*filter\s*:/s);
  assert.match(css, /body:has\(\[data-image-meal-analysis="true"\]\)[^{]*\{[^}]*overflow:\s*hidden/s);
});

test('renders all actionable failures in PT EN ES with the preserved-photo lifetime made explicit', () => {
  const React = fakeReact();
  const { pickLang } = createI18n();
  const { ImageMealAnalysisScreen } = createImageMealAnalysisScreen({ React, pickLang });
  const cases = [
    ['analysis-timeout', 'A análise demorou demais', 'The analysis took too long', 'El análisis tardó demasiado'],
    ['network-unavailable', 'Não foi possível acessar a internet', 'Could not reach the internet', 'No se pudo acceder a internet'],
    ['service-unavailable', 'A análise não está disponível agora', 'Analysis is unavailable right now', 'El análisis no está disponible ahora'],
    ['invalid-response', 'Não foi possível interpretar o resultado', 'The result could not be interpreted', 'No se pudo interpretar el resultado'],
    ['session-expired', 'Entre novamente para continuar', 'Sign in again to continue', 'Inicia sesión de nuevo para continuar'],
    ['quota-reached', 'Tente analisar mais tarde', 'Try analyzing later', 'Intenta analizar más tarde'],
  ];
  for (const [error, pt, en, es] of cases) {
    for (const [lang, expected] of [['pt', pt], ['en', en], ['es', es]]) {
      const view = ImageMealAnalysisScreen({
        photoUrl: 'blob:retained', lang, error, retryAfterSeconds: 23,
        onRetry() {}, onBackToPhoto() {}, onChoosePhoto() {}, onClose() {},
      });
      const nodes = [];
      walk(view, node => nodes.push(node));
      assert.equal(view.props['data-image-meal-analysis-mode'], 'error');
      assert.equal(view.props['data-image-meal-analysis-error'], error);
      assert.equal(nodes.find(node => node.props?.['data-image-meal-analysis-photo'] === 'true').props.src, 'blob:retained');
      assert.equal(nodes.find(node => node.props?.['data-image-meal-error-card'] === 'true').props.role, 'alert');
      assert.match(textContent(view), new RegExp(expected));
      assert.match(textContent(view), lang === 'pt' ? /enquanto esta tela estiver aberta/ : lang === 'en' ? /while this screen stays open/ : /mientras esta pantalla siga abierta/);
      if (error === 'quota-reached') assert.match(textContent(view), /23s/);
    }
  }
});

test('wires retry, recovery, close, and quota actions without restarting the camera', () => {
  const React = fakeReact();
  const { pickLang } = createI18n();
  const { ImageMealAnalysisScreen } = createImageMealAnalysisScreen({ React, pickLang });
  const calls = [];
  function actions(error) {
    const view = ImageMealAnalysisScreen({
      photoUrl: 'blob:same', lang: 'pt', error,
      onRetry: () => calls.push('retry'),
      onBackToPhoto: () => calls.push('back'),
      onChoosePhoto: () => calls.push('choose'),
      onReauthenticate: () => calls.push('auth'),
      onClose: () => calls.push('close'),
    });
    const nodes = [];
    walk(view, node => nodes.push(node));
    return {
      primary: nodes.find(node => node.props?.['data-image-meal-error-primary'] === 'true'),
      secondary: nodes.find(node => node.props?.['data-image-meal-error-secondary'] === 'true'),
      close: nodes.find(node => node.props?.['data-image-meal-error-close'] === 'true'),
    };
  }
  let current = actions('analysis-timeout');
  current.primary.props.onClick(); current.secondary.props.onClick(); current.close.props.onClick();
  current = actions('invalid-response'); current.secondary.props.onClick();
  current = actions('session-expired'); current.primary.props.onClick();
  current = actions('quota-reached'); current.primary.props.onClick(); current.secondary.props.onClick();
  assert.deepEqual(calls, ['retry', 'back', 'close', 'choose', 'auth', 'back', 'close']);
});

test('blocks every competing action while reauthentication is pending and exposes a sanitized recoverable failure', () => {
  const { pickLang } = createI18n();
  const pendingReact = fakeReact([0, 'pending']);
  const { ImageMealAnalysisScreen: PendingScreen } = createImageMealAnalysisScreen({ React: pendingReact, pickLang });
  const pending = PendingScreen({
    photoUrl: 'blob:session', lang: 'pt', error: 'session-expired',
    onReauthenticate() {}, onBackToPhoto() {}, onClose() {},
  });
  const pendingNodes = [];
  walk(pending, node => pendingNodes.push(node));
  const primary = pendingNodes.find(node => node.props?.['data-image-meal-error-primary'] === 'true');
  const secondary = pendingNodes.find(node => node.props?.['data-image-meal-error-secondary'] === 'true');
  const close = pendingNodes.find(node => node.props?.['data-image-meal-error-close'] === 'true');
  assert.equal(primary.props.disabled, true);
  assert.equal(primary.props['aria-busy'], 'true');
  assert.equal(secondary.props.disabled, true);
  assert.equal(close.props.disabled, true);
  assert.match(textContent(pending), /Abrindo acesso/);

  const failedReact = fakeReact([0, 'failed']);
  const { ImageMealAnalysisScreen: FailedScreen } = createImageMealAnalysisScreen({ React: failedReact, pickLang });
  const failed = FailedScreen({
    photoUrl: 'blob:session', lang: 'en', error: 'session-expired',
    onReauthenticate() {}, onBackToPhoto() {}, onClose() {},
  });
  const failedNodes = [];
  walk(failed, node => failedNodes.push(node));
  const alert = failedNodes.find(node => node.props?.['data-image-meal-reauthentication-error'] === 'true');
  assert.equal(alert.props.role, 'alert');
  assert.match(textContent(alert), /could not be completed/);
});
