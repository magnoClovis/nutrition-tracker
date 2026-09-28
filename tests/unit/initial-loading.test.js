const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const sources = [
  ['runtime', path.join(root, 'index.html')],
  ['legacy fixture', path.join(root, 'tests/fixtures/index.legacy.html')],
];

for (const [label, file] of sources) {
  test(`${label}: renders the approved branded startup layer`, () => {
    const source = fs.readFileSync(file, 'utf8');

    assert.match(source, /id="loading" role="status" aria-live="polite" aria-atomic="true"/);
    assert.match(source, /class="initial-loading-mark"/);
    assert.match(source, /class="initial-loading-wordmark">Trofia</);
    assert.match(source, /class="initial-loading-aura"/);
    assert.match(source, /class="initial-loading-progress" aria-hidden="true"/);
    assert.doesNotMatch(source, /border-top-color:#2a6a2a;animation:spin/);
  });

  test(`${label}: localizes honest startup copy without inventing phases`, () => {
    const source = fs.readFileSync(file, 'utf8');

    assert.match(source, /localStorage\.getItem\('appLang'\)/);
    assert.match(source, /'Loading…'/);
    assert.match(source, /'Cargando…'/);
    assert.match(source, /'Carregando…'/);
    assert.doesNotMatch(source, /Calculando calorias|Detectando ingredientes/);
  });

  test(`${label}: keeps the layer visible for the approved minimum and fails closed`, () => {
    const source = fs.readFileSync(file, 'utf8');

    assert.match(source, /window\.INITIAL_LOADING_MIN_MS = 900/);
    assert.match(source, /Math\.max\(0, window\.INITIAL_LOADING_MIN_MS - elapsed\)/);
    assert.match(source, /if \(window\.initialLoadingHideRequested\) return/);
    assert.match(source, /clearTimeout\(window\.initialLoadingHideTimer\)/);
    assert.match(source, /clearTimeout\(window\.initialLoadingRemoveTimer\)/);
    assert.match(source, /window\.initialLoadingHideRequested = false/);
    assert.match(source, /el\.classList\.remove\('is-hidden'\)/);
  });

  test(`${label}: exposes a static reduced-motion presentation`, () => {
    const source = fs.readFileSync(file, 'utf8');

    assert.match(source, /@media \(prefers-reduced-motion:reduce\)/);
    assert.match(source, /\.initial-loading-mark\{transform:scale\(1\);opacity:1;animation:none!important\}/);
    assert.match(source, /\.initial-loading-aura\{transform:scale\(1\);opacity:\.55;animation:none!important\}/);
    assert.match(source, /\.initial-loading-progress span\{width:100%;transform:none;animation:none!important\}/);
  });
}
