const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', '..', 'one-ui.css'), 'utf8');

test('desktop navigation preserves the shared shell while the standalone Diary navigation follows D2', () => {
  const desktopStart = css.indexOf('@media (min-width: 1024px)');
  assert.notEqual(desktopStart, -1);
  const desktopCss = css.slice(desktopStart);
  const headerRule = desktopCss.match(/\[data-app-header\]\s*\{([\s\S]*?)\}/);
  const navRule = desktopCss.match(/\[data-app-nav\]\s*\{([\s\S]*?)\}/);
  const standaloneRule = desktopCss.match(/\[data-app-nav-placement="standalone"\]\s*\{([\s\S]*?)\}/);

  assert.ok(headerRule, 'desktop header rule is present');
  assert.doesNotMatch(headerRule[1], /transition:[^;]*padding/);
  assert.ok(navRule, 'desktop navigation rule is present');
  assert.match(navRule[1], /width:\s*100%/);
  assert.match(navRule[1], /max-width:\s*1080px/);
  assert.match(navRule[1], /align-self:\s*stretch/);
  assert.match(navRule[1], /margin-top:\s*14px\s*!important/);
  assert.match(navRule[1], /margin-right:\s*auto\s*!important/);
  assert.match(navRule[1], /margin-left:\s*auto\s*!important/);
  assert.doesNotMatch(navRule[1], /margin-top:\s*-/);

  assert.ok(standaloneRule, 'standalone diary navigation aligns to the wider D2 shell');
  assert.match(standaloneRule[1], /max-width:\s*1680px/);
  assert.match(standaloneRule[1], /width:\s*calc\(100%\s*-\s*64px\)/);
});
