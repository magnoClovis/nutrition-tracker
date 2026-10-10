(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ThemePolicy = api;
  if (root && root.document) {
    let storage = null;
    try { storage = root.localStorage; } catch (_) {}
    api.applyInitialTheme({
      storage,
      document: root.document,
      matchMedia: typeof root.matchMedia === 'function' ? root.matchMedia.bind(root) : null,
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const THEME_POLICY_VERSION = '2';
  const THEME_POLICY_VERSION_KEY = 'appThemePolicyVersion';
  const THEME_PREFERENCE_KEY = 'appThemePreference';
  const LEGACY_DARK_MODE_KEY = 'appDarkMode';
  const VALID_PREFERENCES = new Set(['light', 'dark', 'system']);

  function normalizeThemePreference(value) {
    return VALID_PREFERENCES.has(value) ? value : 'light';
  }

  function resolveThemePreference(preference, matchMedia) {
    const normalized = normalizeThemePreference(preference);
    if (normalized !== 'system') return normalized;
    try {
      return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } catch (_) {
      return 'light';
    }
  }

  function applyResolvedTheme(preference, { document, matchMedia } = {}) {
    const resolved = resolveThemePreference(preference, matchMedia);
    const rootElement = document && document.documentElement;
    if (rootElement) {
      rootElement.dataset.theme = resolved;
      rootElement.classList.toggle('dark-loading', resolved === 'dark');
    }
    return resolved;
  }

  function mirrorLegacyPreference(storage, preference, matchMedia) {
    storage.setItem(
      LEGACY_DARK_MODE_KEY,
      String(resolveThemePreference(preference, matchMedia) === 'dark'),
    );
  }

  function readThemePreference({ storage, document, matchMedia } = {}) {
    try {
      if (!storage || storage.getItem(THEME_POLICY_VERSION_KEY) !== THEME_POLICY_VERSION) {
        storage.setItem(THEME_PREFERENCE_KEY, 'light');
        mirrorLegacyPreference(storage, 'light', matchMedia);
        applyResolvedTheme('light', { document, matchMedia });
        storage.setItem(THEME_POLICY_VERSION_KEY, THEME_POLICY_VERSION);
        return 'light';
      }
      const preference = normalizeThemePreference(storage.getItem(THEME_PREFERENCE_KEY));
      applyResolvedTheme(preference, { document, matchMedia });
      return preference;
    } catch (_) {
      applyResolvedTheme('light', { document, matchMedia });
      return 'light';
    }
  }

  function saveThemePreference(preference, { storage, document, matchMedia } = {}) {
    const normalized = normalizeThemePreference(preference);
    try {
      storage.setItem(THEME_PREFERENCE_KEY, normalized);
      mirrorLegacyPreference(storage, normalized, matchMedia);
    } catch (_) {
      applyResolvedTheme('light', { document, matchMedia });
      return 'light';
    }
    applyResolvedTheme(normalized, { document, matchMedia });
    return normalized;
  }

  function applyInitialTheme(services) {
    return readThemePreference(services);
  }

  return {
    THEME_POLICY_VERSION,
    THEME_POLICY_VERSION_KEY,
    THEME_PREFERENCE_KEY,
    LEGACY_DARK_MODE_KEY,
    normalizeThemePreference,
    resolveThemePreference,
    applyResolvedTheme,
    readThemePreference,
    saveThemePreference,
    applyInitialTheme,
  };
});
