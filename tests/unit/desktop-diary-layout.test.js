const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs
  .readFileSync(path.join(__dirname, '..', '..', 'one-ui.css'), 'utf8')
  .replace(/\r\n/g, '\n');

function ruleBody(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  assert.ok(match, `missing CSS rule: ${selector}`);
  return match[1];
}

test('D2 uses a four-card desktop summary without changing the base mobile rule', () => {
  const desktopStart = css.indexOf('@media (min-width: 1024px)');
  assert.notEqual(desktopStart, -1);
  const desktopCss = css.slice(desktopStart);
  const metrics = ruleBody(desktopCss, '[data-diary-metrics]');
  const diary = ruleBody(desktopCss, '[data-screen="diario"]');

  assert.match(metrics, /position:\s*static/);
  assert.match(metrics, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(metrics, /max-width:\s*none/);
  assert.doesNotMatch(metrics, /position:\s*absolute/);
  assert.match(diary, /grid-template-columns:\s*minmax\(0,\s*1\.7fr\)\s+minmax\(280px,\s*\.76fr\)/);
});

test('D2 expands only the Diary desktop shell and aligns its standalone navigation with the wider header', () => {
  const desktopStart = css.indexOf('@media (min-width: 1024px)');
  const desktopCss = css.slice(desktopStart);
  const sharedNav = ruleBody(desktopCss, '[data-app-nav]');
  const diaryHeader = ruleBody(desktopCss, '[data-one-ui-root]:has([data-app-nav-placement="standalone"]) [data-app-header]');
  const diaryMain = ruleBody(desktopCss, '[data-app-main="diario"]');
  const diaryNav = ruleBody(desktopCss, '[data-app-nav-placement="standalone"]');

  assert.match(sharedNav, /max-width:\s*1080px/);
  assert.match(diaryHeader, /100vw\s*-\s*1680px/);
  assert.match(diaryMain, /max-width:\s*1680px\s*!important/);
  assert.match(diaryNav, /max-width:\s*1680px/);
  assert.match(diaryNav, /width:\s*calc\(100%\s*-\s*64px\)/);
});

test('D2 keeps the date selector full-width and places meals before the contextual rail', () => {
  const desktopStart = css.indexOf('@media (min-width: 1024px)');
  const desktopCss = css.slice(desktopStart);
  const stack = ruleBody(desktopCss, '[data-screen="diario"] > [data-diary-content-stack="true"]');
  const date = ruleBody(desktopCss, '[data-diary-content-stack="true"] > [data-diary-date-primary="true"]');
  const meal = ruleBody(desktopCss, '[data-diary-content-stack="true"] > [data-diary-meal-card="true"],\n  [data-diary-content-stack="true"] > [data-diary-global-add]');
  const status = ruleBody(desktopCss, '[data-screen="diario"] > [data-day-progress-summary]');

  assert.match(stack, /grid-template-columns:\s*minmax\(0,\s*1\.7fr\)\s+minmax\(280px,\s*\.76fr\)/);
  assert.match(date, /grid-column:\s*1\s*\/\s*-1/);
  assert.match(meal, /grid-column:\s*1/);
  assert.match(status, /grid-column:\s*2/);
});
