'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  THEME_POLICY_VERSION_KEY,
  THEME_PREFERENCE_KEY,
  readThemePreference,
  resolveThemePreference,
  saveThemePreference,
} = require('../../theme-policy.js');

function createServices(initial = {}, systemDark = false) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  const root = { dataset: {}, classList: { toggle() {} } };
  return {
    values,
    writes,
    services: {
      storage: {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); writes.push([key, String(value)]); },
      },
      document: { documentElement: root },
      matchMedia: () => ({ matches: systemDark }),
    },
    root,
  };
}

test('migrates an old dark installation exactly once to light', () => {
  const fixture = createServices({ appDarkMode: 'true', appThemeDefaultDarkV1: '1' });
  assert.equal(readThemePreference(fixture.services), 'light');
  assert.equal(fixture.root.dataset.theme, 'light');
  assert.equal(fixture.values.get(THEME_PREFERENCE_KEY), 'light');
  assert.equal(fixture.values.get('appDarkMode'), 'false');
  assert.equal(fixture.values.get(THEME_POLICY_VERSION_KEY), '2');

  saveThemePreference('dark', fixture.services);
  assert.equal(readThemePreference(fixture.services), 'dark');
  assert.equal(fixture.root.dataset.theme, 'dark');
});

test('system follows the current device preference', () => {
  const fixture = createServices({ appThemePolicyVersion: '2', appThemePreference: 'system' }, true);
  assert.equal(readThemePreference(fixture.services), 'system');
  assert.equal(fixture.root.dataset.theme, 'dark');
  assert.equal(resolveThemePreference('system', () => ({ matches: false })), 'light');
});

test('invalid preferences and storage failures resolve safely to light', () => {
  const invalid = createServices({ appThemePolicyVersion: '2', appThemePreference: 'sepia' });
  assert.equal(readThemePreference(invalid.services), 'light');
  assert.equal(invalid.root.dataset.theme, 'light');

  const root = { dataset: {}, classList: { toggle() {} } };
  const failing = {
    storage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } },
    document: { documentElement: root },
  };
  assert.equal(readThemePreference(failing), 'light');
  assert.equal(root.dataset.theme, 'light');
});

test('does not mark migration complete when storage cannot finish the ordered writes', () => {
  const values = new Map();
  const root = { dataset: {}, classList: { toggle() {} } };
  const services = {
    storage: {
      getItem(key) { return values.get(key) || null; },
      setItem(key, value) {
        if (key === 'appDarkMode') throw new Error('interrupted');
        values.set(key, String(value));
      },
    },
    document: { documentElement: root },
  };
  assert.equal(readThemePreference(services), 'light');
  assert.equal(values.has(THEME_POLICY_VERSION_KEY), false);
  assert.equal(root.dataset.theme, 'light');
});
