const test = require('node:test');
const assert = require('node:assert/strict');
const { createI18n } = require('../../i18n.js');
const { createImageMealAnalysisScreen } = require('../../image-meal-analysis-screen.js');

function fakeReact() {
  return {
    createElement(type, props, ...children) {
      return { type, props: { ...(props || {}), children } };
    },
    useState(initial) { return [initial, () => {}]; },
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
