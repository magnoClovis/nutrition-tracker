import '../../theme-policy.js';
import { readLegacyNamespace } from './read-legacy-namespace.js';

const themePolicy = readLegacyNamespace(
  globalThis,
  'ThemePolicy',
  [
    'THEME_POLICY_VERSION',
    'THEME_POLICY_VERSION_KEY',
    'THEME_PREFERENCE_KEY',
    'normalizeThemePreference',
    'resolveThemePreference',
    'applyResolvedTheme',
    'readThemePreference',
    'saveThemePreference',
  ],
);

export const {
  THEME_POLICY_VERSION,
  THEME_POLICY_VERSION_KEY,
  THEME_PREFERENCE_KEY,
  normalizeThemePreference,
  resolveThemePreference,
  applyResolvedTheme,
  readThemePreference,
  saveThemePreference,
} = themePolicy;
