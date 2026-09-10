const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', '..', 'one-ui.css'), 'utf8');

test('desktop navigation fills the shared 1080px shell without negative overlap', () => {
  const desktopStart = css.indexOf('@media (min-width: 1024px)');
  assert.notEqual(desktopStart, -1);
  const desktopCss = css.slice(desktopStart);
  const navRule = desktopCss.match(/\[data-app-nav\]\s*\{([\s\S]*?)\}/);
  const standaloneRule = desktopCss.match(/\[data-app-nav-placement="standalone"\]\s*\{([\s\S]*?)\}/);

  assert.ok(navRule, 'desktop navigation rule is present');
  assert.match(navRule[1], /width:\s*100%/);
  assert.match(navRule[1], /max-width:\s*1080px/);
  assert.match(navRule[1], /align-self:\s*stretch/);
  assert.match(navRule[1], /margin-top:\s*14px\s*!important/);
  assert.doesNotMatch(navRule[1], /margin-top:\s*-/);

  assert.ok(standaloneRule, 'standalone diary navigation aligns to the same shell');
  assert.match(standaloneRule[1], /width:\s*min\(1080px,\s*calc\(100%\s*-\s*64px\)\)/);
  assert.match(standaloneRule[1], /margin-right:\s*auto\s*!important/);
  assert.match(standaloneRule[1], /margin-left:\s*auto\s*!important/);
});
