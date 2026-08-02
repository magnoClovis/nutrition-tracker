const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('../../vendor/react.production.min.js');
const { createI18n } = require('../../i18n.js');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../image-meal-screen.js'))],
  ['ESM', () => import('../../src/components/image-meal-screen.js')],
];
const { pickLang } = createI18n();

function walk(node, visit) {
  if (node == null || typeof node === 'boolean' || typeof node !== 'object') return;
  visit(node);
  React.Children.toArray(node.props && node.props.children).forEach(child => walk(child, visit));
}

function textContent(node) {
  const parts = [];
  function collect(value) {
    if (value == null || typeof value === 'boolean') return;
    if (typeof value === 'string' || typeof value === 'number') {
      parts.push(String(value));
      return;
    }
    React.Children.toArray(value.props && value.props.children).forEach(collect);
  }
  collect(node);
  return parts.join('');
}

function elements(node, type) {
  const result = [];
  walk(node, value => { if (value.type === type) result.push(value); });
  return result;
}

function baseProps(state, overrides = {}) {
  return {
    state,
    lang: 'pt',
    isMobileView: false,
    onClose: () => {},
    onCapture: () => {},
    onChoose: () => {},
    onProcess: () => {},
    onCancelProcessing: () => {},
    onDiscard: () => {},
    onEstimateChange: () => {},
    onConfirm: () => {},
    ...overrides,
  };
}

function estimate() {
  return {
    status: 'identified', dishName: 'Arroz com frango', overallConfidence: 'medium',
    assumptions: ['Porção visual'],
    items: [{ id: 'rice', name: 'Arroz', protein: 3, kcal: 156 }],
  };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const module = await load();
      function Editor() { return React.createElement('div', null, 'EDITOR'); }
      const { ImageMealScreen } = module.createImageMealScreen({ React, pickLang, MealEstimateEditor: Editor });
      return callback(ImageMealScreen, Editor);
    });
  });
}

contractTest('renders the no-photo state in PT/EN/ES and delegates both sources', ImageMealScreen => {
  for (const [lang, title] of [['pt', 'Reconhecer refeição'], ['en', 'Recognize meal'], ['es', 'Reconocer comida']]) {
    const calls = [];
    const view = ImageMealScreen(baseProps({ phase: 'empty' }, {
      lang,
      onCapture: () => calls.push('camera'),
      onChoose: () => calls.push('gallery'),
    }));
    assert.match(textContent(view), new RegExp(title));
    const buttons = elements(view, 'button');
    buttons.at(-2).props.onClick();
    buttons.at(-1).props.onClick();
    assert.deepEqual(calls, ['camera', 'gallery']);
  }
});

contractTest('shows a captured photo and cancellable processing indicator', ImageMealScreen => {
  let cancelled = 0;
  const view = ImageMealScreen(baseProps({
    phase: 'processing',
    photo: { previewUrl: 'blob:meal' },
  }, { onCancelProcessing: () => { cancelled += 1; } }));
  assert.equal(elements(view, 'img')[0].props.src, 'blob:meal');
  assert.match(textContent(view), /Analisando prato/);
  const cancel = elements(view, 'button').find(button => button.props['data-image-meal-cancel'] === 'true');
  assert.equal(cancel.props.disabled, false);
  cancel.props.onClick();
  assert.equal(cancelled, 1);
  const close = elements(view, 'button').find(button => button.props['aria-label'] === 'Fechar');
  assert.equal(close.props.disabled, true);
});

contractTest('shows the captured-photo checkpoint before analysis', ImageMealScreen => {
  const calls = [];
  const view = ImageMealScreen(baseProps({
    phase: 'photo',
    photo: { previewUrl: 'blob:ready' },
  }, {
    onProcess: () => calls.push('process'),
    onCapture: () => calls.push('retake'),
    onChoose: () => calls.push('choose'),
    onDiscard: () => calls.push('discard'),
  }));
  assert.equal(elements(view, 'img')[0].props.src, 'blob:ready');
  assert.match(textContent(view), /Confira se o prato está visível/);
  const buttons = elements(view, 'button');
  ['Analisar foto', 'Tirar outra', 'Escolher outra', 'Descartar'].forEach(label => {
    buttons.find(button => textContent(button) === label).props.onClick();
  });
  assert.deepEqual(calls, ['process', 'retake', 'choose', 'discard']);
});

contractTest('renders identified result summary and wires the shared editable review', (ImageMealScreen, Editor) => {
  const changes = [];
  const currentEstimate = estimate();
  const view = ImageMealScreen(baseProps({
    phase: 'result',
    photo: { previewUrl: 'blob:meal' },
    estimate: currentEstimate,
    validationErrors: [{ path: 'items.0.kcal', code: 'required-number' }],
  }, { onEstimateChange: value => changes.push(value) }));
  assert.match(textContent(view), /Arroz com frango/);
  assert.match(textContent(view), /Confiança: medium · 1 alimentos/);
  const editor = elements(view, Editor)[0];
  assert.equal(editor.props.estimate, currentEstimate);
  assert.deepEqual(editor.props.errors, [{ path: 'items.0.kcal', code: 'required-number' }]);
  assert.equal(editor.props.disabled, false);
  editor.props.onChange({ edited: true });
  assert.deepEqual(changes, [{ edited: true }]);
  assert.match(textContent(view), /Confirmar refeição/);
});

contractTest('keeps confirmation busy and disables editing and competing actions', (ImageMealScreen, Editor) => {
  const view = ImageMealScreen(baseProps({
    phase: 'confirming',
    photo: { previewUrl: 'blob:meal' },
    estimate: estimate(),
    validationErrors: [],
  }));
  assert.match(textContent(view), /Registrando/);
  assert.equal(elements(view, Editor)[0].props.disabled, true);
  elements(view, 'button').filter(button => button.props['aria-label'] !== 'Fechar')
    .forEach(button => assert.equal(button.props.disabled, true));
});

contractTest('distinguishes not-food from an unrecognizable meal', ImageMealScreen => {
  const notFood = ImageMealScreen(baseProps({
    phase: 'not-identifiable', photo: { previewUrl: 'blob:a' }, notIdentifiableReason: 'not-food',
  }));
  const unclear = ImageMealScreen(baseProps({
    phase: 'not-identifiable', photo: { previewUrl: 'blob:b' }, notIdentifiableReason: 'not-identifiable',
  }));
  assert.match(textContent(notFood), /não parece mostrar uma refeição/);
  assert.match(textContent(unclear), /reconhecer os alimentos com segurança/);
});

contractTest('renders every mapped error distinctly, including Retry-After quota detail', ImageMealScreen => {
  const expectations = {
    'permission-denied': /Permissão da câmera negada/,
    'invalid-photo': /Não foi possível usar esta foto/,
    'quota-reached': /limite de análises por imagem foi atingido/,
    'session-expired': /sessão expirou/,
    'service-unavailable': /temporariamente indisponível/,
    'invalid-response': /resposta recebida não pôde ser validada/,
  };
  for (const [error, pattern] of Object.entries(expectations)) {
    const view = ImageMealScreen(baseProps({
      phase: 'error', error, photo: { previewUrl: 'blob:error' }, retryAfterSeconds: 23,
    }));
    assert.match(textContent(view), pattern);
    if (error === 'quota-reached') assert.match(textContent(view), /23s/);
  }
});

contractTest('renders successful confirmation and returns null without state', ImageMealScreen => {
  assert.equal(ImageMealScreen(baseProps(null)), null);
  const view = ImageMealScreen(baseProps({ phase: 'confirmed' }));
  assert.match(textContent(view), /Refeição confirmada/);
  assert.equal(elements(view, 'div').find(node => node.props['data-image-meal-state'] === 'confirmed').props.role, 'status');
});
