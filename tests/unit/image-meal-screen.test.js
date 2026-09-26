const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('../../vendor/react.production.min.js');
const { createI18n } = require('../../i18n.js');

const implementations = [
  ['UMD', async () => ({
    screen: require('../../image-meal-screen.js'),
    analysis: require('../../image-meal-analysis-screen.js'),
  })],
  ['ESM', async () => ({
    screen: await import('../../src/components/image-meal-screen.js'),
    analysis: await import('../../src/components/image-meal-analysis-screen.js'),
  })],
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
    onCameraSurface: () => {},
    onEmbeddedCapture: () => {},
    onCameraFlashToggle: () => {},
    onEmbeddedPhotoPainted: () => {},
    onEmbeddedPhotoPaintFailed: () => {},
    onCancelCamera: () => {},
    onChoose: () => {},
    onProcess: () => {},
    onCancelProcessing: () => {},
    onDismissError: () => {},
    onRequestReauthentication: () => {},
    onDiscard: () => {},
    onEstimateChange: () => {},
    onReview: () => {},
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
      const modules = await load();
      function ResultSheet() { return React.createElement('div', null, 'RESULT SHEET'); }
      const { ImageMealAnalysisScreen } = modules.analysis.createImageMealAnalysisScreen({ React, pickLang });
      const { ImageMealScreen } = modules.screen.createImageMealScreen({
        React,
        pickLang,
        ImageMealAnalysisScreen,
        MealResultSheet: ResultSheet,
      });
      return callback(ImageMealScreen, ImageMealAnalysisScreen, ResultSheet);
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

contractTest('delegates processing to the full-screen analysis state', (ImageMealScreen, ImageMealAnalysisScreen) => {
  let cancelled = 0;
  const view = ImageMealScreen(baseProps({
    phase: 'processing',
    photo: { previewUrl: 'blob:meal' },
  }, { onCancelProcessing: () => { cancelled += 1; } }));
  const analysis = elements(view, ImageMealAnalysisScreen)[0];
  assert.equal(analysis.props.photoUrl, 'blob:meal');
  analysis.props.onCancel();
  assert.equal(cancelled, 1);
  const close = elements(view, 'button').find(button => button.props['aria-label'] === 'Fechar');
  assert.equal(close.props.disabled, true);
});

contractTest('renders the embedded camera as an accessible HTML overlay in every camera phase', ImageMealScreen => {
  for (const [phase, expectedStatus, shutterDisabled] of [
    ['camera-opening', 'Abrindo câmera', true],
    ['camera-active', 'Câmera ativa', false],
    ['camera-capturing', 'Capturando', true],
  ]) {
    const calls = [];
    const view = ImageMealScreen(baseProps({ phase }, {
      onEmbeddedCapture: () => calls.push('capture'),
      onCancelCamera: () => calls.push('cancel'),
    }));
    assert.equal(view.props['data-camera-native-active'], 'true');
    assert.equal(
      view.props['data-camera-geometry-locked'],
      phase === 'camera-active' || phase === 'camera-capturing' ? 'true' : undefined,
    );
    assert.match(textContent(view), new RegExp(expectedStatus));
    const shutter = elements(view, 'button').find(button => button.props['data-camera-shutter'] === 'true');
    const cancel = elements(view, 'button').find(button => button.props['data-camera-close'] === 'true');
    const overlay = elements(view, 'div').find(node => node.props['data-camera-stage-overlay'] === 'true');
    const viewport = elements(view, 'div').find(node => node.props['data-camera-stage-viewport'] === 'true');
    const announcement = elements(view, 'p').find(node => node.props['data-image-meal-announcement'] === 'true');
    assert.equal(shutter.props.disabled, shutterDisabled);
    assert.equal(elements(view, 'div').some(node => node.props['data-camera-active-indicator'] === 'true'), false);
    assert.equal(announcement.props.role, 'status');
    assert.equal(announcement.props['aria-live'], 'polite');
    assert.equal(announcement.props['aria-atomic'], 'true');
    assert.ok(overlay);
    assert.equal(viewport.props['data-embedded-camera'], 'true');
    assert.equal(cancel.props['aria-label'], 'Fechar câmera');
    assert.match(textContent(announcement), new RegExp(expectedStatus));
    if (!shutterDisabled) shutter.props.onClick();
    cancel.props.onClick();
    assert.deepEqual(calls, shutterDisabled ? ['cancel'] : ['capture', 'cancel']);
  }
});

contractTest('uses a filled flash glyph without restoring the removed visual camera-status pill', ImageMealScreen => {
  const view = ImageMealScreen(baseProps({
    phase: 'camera-active', cameraFlashModes: ['off', 'torch'], cameraFlashMode: 'off',
  }));
  const flash = elements(view, 'button').find(button => button.props['data-camera-flash'] === 'true');
  const path = elements(flash, 'path')[0];
  assert.equal(path.props.fill, 'currentColor');
  assert.equal(path.props.stroke, undefined);
  assert.equal(elements(view, 'div').some(node => node.props['data-camera-active-indicator'] === 'true'), false);
  const announcement = elements(view, 'p').find(node => node.props['data-image-meal-announcement'] === 'true');
  assert.match(textContent(announcement), /Câmera ativa\. Pronta para capturar\./);
});

contractTest('offers localized permission recovery through Android settings and gallery', ImageMealScreen => {
  for (const [lang, settingsLabel, title] of [
    ['pt', 'Abrir configurações', 'Acesso à câmera desativado'],
    ['en', 'Open settings', 'Camera access is turned off'],
    ['es', 'Abrir ajustes', 'El acceso a la cámara está desactivado'],
  ]) {
    const calls = [];
    const view = ImageMealScreen(baseProps({ phase: 'error', error: 'permission-denied' }, {
      lang,
      canOpenCameraSettings: true,
      onOpenCameraSettings: () => calls.push('settings'),
      onChoose: () => calls.push('gallery'),
    }));
    assert.match(textContent(view), new RegExp(title));
    const alert = elements(view, 'div').find(node => node.props['data-camera-permission-alert'] === 'true');
    const settings = elements(view, 'button').find(button => button.props['data-camera-open-settings'] === 'true');
    const gallery = elements(view, 'button').find(button => button.props['data-image-meal-choose-gallery'] === 'true');
    assert.equal(alert.props.role, 'alert');
    assert.equal(textContent(settings), settingsLabel);
    settings.props.onClick();
    gallery.props.onClick();
    assert.deepEqual(calls, ['settings', 'gallery']);
  }
});

contractTest('renders a localized accessible flash toggle only when the rear camera supports it', ImageMealScreen => {
  for (const [lang, offLabel, onLabel] of [
    ['pt', 'Flash desligado', 'Flash ligado'],
    ['en', 'Flash off', 'Flash on'],
    ['es', 'Flash apagado', 'Flash encendido'],
  ]) {
    let toggles = 0;
    const offView = ImageMealScreen(baseProps({
      phase: 'camera-active', cameraFlashModes: ['off', 'on', 'torch'], cameraFlashMode: 'off',
    }, { lang, onCameraFlashToggle: () => { toggles += 1; } }));
    const off = elements(offView, 'button').find(button => button.props['data-camera-flash'] === 'true');
    assert.equal(off.props['aria-label'], offLabel);
    assert.equal(off.props['aria-pressed'], false);
    assert.equal(off.props.disabled, false);
    assert.match(textContent(offView), new RegExp(`${offLabel}\\.`));
    off.props.onClick();

    const onView = ImageMealScreen(baseProps({
      phase: 'camera-active', cameraFlashModes: ['off', 'on'], cameraFlashMode: 'on',
    }, { lang }));
    const on = elements(onView, 'button').find(button => button.props['data-camera-flash'] === 'true');
    assert.equal(on.props['aria-label'], onLabel);
    assert.equal(on.props['aria-pressed'], true);
    assert.equal(on.props['data-camera-flash-state'], 'on');
    assert.match(textContent(onView), new RegExp(`${onLabel}\\.`));
    assert.equal(toggles, 1);
  }

  const unsupported = ImageMealScreen(baseProps({
    phase: 'camera-active', cameraFlashModes: ['off'], cameraFlashMode: 'off',
  }));
  assert.equal(elements(unsupported, 'button').some(button => button.props['data-camera-flash'] === 'true'), false);
});

contractTest('keeps the native layer active until two frames after the frozen photo loads', ImageMealScreen => {
  const calls = [];
  const trace = [];
  const frames = [];
  const view = ImageMealScreen(baseProps({
    phase: 'camera-frozen',
    photo: { previewUrl: 'blob:frozen' },
    cameraFlashModes: ['off', 'on', 'auto'],
    cameraFlashProbe: 'complete',
  }, {
    onEmbeddedPhotoPainted: () => calls.push('painted'),
    onEmbeddedPhotoPaintFailed: () => calls.push('failed'),
    onCameraHandoffTrace: stage => trace.push(stage),
  }));
  assert.equal(view.props['data-camera-native-active'], 'true');
  assert.equal(view.props['data-camera-geometry-locked'], 'true');
  const frozen = elements(view, 'div').find(node => node.props['data-image-meal-state'] === 'camera-frozen');
  assert.equal(frozen.props['data-camera-flash-modes'], 'off,on,auto');
  assert.equal(frozen.props['data-camera-flash-probe'], 'complete');
  const image = elements(view, 'img')[0];
  assert.equal(image.props['data-camera-frozen-photo'], 'true');
  image.props.onLoad({
    currentTarget: {
      ownerDocument: {
        defaultView: { requestAnimationFrame: callback => frames.push(callback) },
      },
    },
  });
  assert.deepEqual(calls, []);
  assert.deepEqual(trace, ['frozen-photo-load']);
  frames.shift()();
  assert.deepEqual(calls, []);
  assert.deepEqual(trace, ['frozen-photo-load', 'frozen-photo-frame-1']);
  frames.shift()();
  assert.deepEqual(calls, ['painted']);
  assert.deepEqual(trace, ['frozen-photo-load', 'frozen-photo-frame-1', 'frozen-photo-frame-2']);
  image.props.onError();
  assert.deepEqual(calls, ['painted', 'failed']);
});

contractTest('keeps camera actions semantic and exposes stable focus targets', ImageMealScreen => {
  const empty = ImageMealScreen(baseProps({ phase: 'empty' }));
  const emptyCamera = elements(empty, 'button').find(button => button.props['data-image-meal-open-camera'] === 'true');
  assert.equal(emptyCamera.props.type, 'button');

  const photo = ImageMealScreen(baseProps({ phase: 'photo', photo: { previewUrl: 'blob:meal' } }));
  const analyze = elements(photo, 'button').find(button => button.props['data-image-meal-analyze'] === 'true');
  const retake = elements(photo, 'button').find(button => button.props['data-image-meal-open-camera'] === 'true');
  assert.equal(analyze.props.type, 'button');
  assert.equal(retake.props.type, 'button');
});

contractTest('localizes the central camera stage and its two distinct close actions', ImageMealScreen => {
  for (const [lang, stageLabel, cameraClose, recognitionClose] of [
    ['pt', 'Câmera de refeição', 'Fechar câmera', 'Fechar reconhecimento'],
    ['en', 'Meal camera', 'Close camera', 'Close recognition'],
    ['es', 'Cámara de comida', 'Cerrar cámara', 'Cerrar reconocimiento'],
  ]) {
    const view = ImageMealScreen(baseProps({ phase: 'camera-active' }, { lang }));
    const stage = elements(view, 'div').find(node => node.props['data-camera-stage-overlay'] === 'true');
    const buttons = elements(view, 'button');
    assert.equal(stage.props.role, 'dialog');
    assert.equal(stage.props['aria-modal'], 'true');
    assert.equal(stage.props['aria-label'], stageLabel);
    assert.ok(buttons.find(button => button.props['aria-label'] === cameraClose));
    assert.ok(buttons.find(button => button.props['aria-label'] === recognitionClose));
  }
});

contractTest('contracts before closing and bypasses motion when reduced motion is requested', ImageMealScreen => {
  let cancelled = 0;
  let scheduled;
  const overlay = { dataset: {} };
  const view = ImageMealScreen(baseProps({ phase: 'camera-active' }, { onCancelCamera: () => { cancelled += 1; } }));
  const close = elements(view, 'button').find(button => button.props['data-camera-close'] === 'true');
  close.props.onClick({ currentTarget: {
    closest: () => overlay,
    ownerDocument: { defaultView: {
      matchMedia: () => ({ matches: false }),
      setTimeout: callback => { scheduled = callback; },
    } },
  } });
  assert.equal(overlay.dataset.cameraStageClosing, 'true');
  assert.equal(cancelled, 0);
  scheduled();
  assert.equal(cancelled, 1);

  close.props.onClick({ currentTarget: {
    closest: () => overlay,
    ownerDocument: { defaultView: { matchMedia: () => ({ matches: true }) } },
  } });
  assert.equal(cancelled, 2);
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

contractTest('delegates identified results to the progressive shared sheet', (ImageMealScreen, _Analysis, ResultSheet) => {
  const changes = [];
  let reviews = 0;
  let confirmations = 0;
  let mealChanges = 0;
  const currentEstimate = estimate();
  const view = ImageMealScreen(baseProps({
    phase: 'result',
    photo: { previewUrl: 'blob:meal' },
    estimate: currentEstimate,
    error: 'confirmation-failed',
    validationErrors: [{ path: 'items.0.kcal', code: 'required-number' }],
  }, {
    mealValue: 'Lunch',
    mealOptions: [{ value: 'Lunch', label: 'Almoço' }],
    onMealChange: () => { mealChanges += 1; },
    onEstimateChange: value => changes.push(value),
    onReview: () => { reviews += 1; },
    onConfirm: () => { confirmations += 1; },
  }));
  const sheet = elements(view, ResultSheet)[0];
  assert.equal(sheet.props.estimate, currentEstimate);
  assert.equal(sheet.props.photoUrl, 'blob:meal');
  assert.equal(sheet.props.mealValue, 'Lunch');
  assert.deepEqual(sheet.props.mealOptions, [{ value: 'Lunch', label: 'Almoço' }]);
  assert.deepEqual(sheet.props.errors, [{ path: 'items.0.kcal', code: 'required-number' }]);
  assert.match(sheet.props.errorMessage, /Não foi possível registrar/);
  assert.equal(sheet.props.disabled, false);
  sheet.props.onChange({ edited: true });
  sheet.props.onMealChange('Dinner');
  sheet.props.onConfirm();
  sheet.props.onReview();
  assert.deepEqual(changes, [{ edited: true }]);
  assert.equal(reviews, 1);
  assert.equal(confirmations, 1);
  assert.equal(mealChanges, 1);
});

contractTest('keeps the shared result sheet busy during confirmation', (ImageMealScreen, _Analysis, ResultSheet) => {
  const view = ImageMealScreen(baseProps({
    phase: 'confirming',
    photo: { previewUrl: 'blob:meal' },
    estimate: estimate(),
    validationErrors: [],
  }));
  assert.equal(elements(view, ResultSheet)[0].props.disabled, true);
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

contractTest('delegates actionable analysis errors with their metadata and keeps capture errors inline', (ImageMealScreen, ImageMealAnalysisScreen) => {
  for (const error of [
    'analysis-timeout', 'network-unavailable', 'quota-reached',
    'session-expired', 'service-unavailable', 'invalid-response',
  ]) {
    const view = ImageMealScreen(baseProps({
      phase: 'error', error, photo: { previewUrl: 'blob:error' }, retryAfterSeconds: 23,
    }));
    const analysis = elements(view, ImageMealAnalysisScreen)[0];
    assert.equal(analysis.props.error, error);
    assert.equal(analysis.props.photoUrl, 'blob:error');
    assert.equal(analysis.props.retryAfterSeconds, 23);
  }
  for (const [error, pattern] of Object.entries({
    'permission-denied': /Permissão da câmera negada/,
    'invalid-photo': /Não foi possível usar esta foto/,
    'camera-unavailable': /Não foi possível abrir a câmera dentro do app/,
  })) {
    const view = ImageMealScreen(baseProps({ phase: 'error', error }));
    assert.match(textContent(view), pattern);
  }
});

contractTest('connects session recovery exclusively to the public reauthentication callback', (ImageMealScreen, ImageMealAnalysisScreen) => {
  const callback = async () => {};
  const view = ImageMealScreen(baseProps({
    phase: 'error', error: 'session-expired', photo: { previewUrl: 'blob:session' },
  }, { onRequestReauthentication: callback }));
  const analysis = elements(view, ImageMealAnalysisScreen)[0];
  assert.equal(analysis.props.onReauthenticate, callback);
});

contractTest('renders successful confirmation and returns null without state', ImageMealScreen => {
  assert.equal(ImageMealScreen(baseProps(null)), null);
  const view = ImageMealScreen(baseProps({ phase: 'confirmed' }));
  assert.match(textContent(view), /Refeição confirmada/);
  assert.equal(elements(view, 'div').find(node => node.props['data-image-meal-state'] === 'confirmed').props.role, 'status');
});
