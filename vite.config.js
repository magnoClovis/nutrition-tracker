import { copyFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDirectory = resolve(projectRoot, 'dist-vite');

const baselineRuntimeFiles = [
  'vendor/react.production.min.js',
  'vendor/react-dom.production.min.js',
  'vendor/prop-types.min.js',
  'vendor/recharts.min.js',
  'firebase-config-internal.js',
  'firebase-auth-internal.js',
  'firebase-firestore-internal.js',
  'firebase-migration-internal.js',
  'firebase-backup-internal.js',
  'firebase-account-data-internal.js',
  'firebase-storage.js',
  'meal-score.js',
  'i18n.js',
  'settings-panel.js',
  'backup-modal.js',
  'verify-email-screen.js',
  'open-food-facts.js',
  'barcode-scanner.js',
  'groq-client.js',
  'meal-review-ai.js',
  'food-autofill-ai.js',
  'dish-description-ai.js',
  'diary-ticker.js',
  'date-utils.js',
  'hydration-guard.js',
  'autosave-scheduler.js',
  'calendar-model.js',
  'food-entry.js',
  'meal-ga.js',
  'goal-calculator.js',
  'daily-nutrition-model.js',
  'recent-meals-model.js',
  'body-metrics-model.js',
  'historical-goals-model.js',
  'week-aggregator.js',
  'history-loaders.js',
  'nutrition-feedback-ai.js',
  'eating-patterns-ai.js',
  'profile-validation.js',
  'login-screen.js',
  'privacy-panel.js',
  'required-profile-modal.js',
  'ui-primitives.js',
  'release-notice.js',
  'tutorial-overlay.js',
  'visual-update-notice.js',
  'meal-review-modal.js',
  'ga-result-card.js',
  'saved-meal-card.js',
  'body-metrics-charts.js',
  'week-screen.js',
  'metrics-screen.js',
  'pantry-screen.js',
  'add-screen.js',
  'diary-screen.js',
  'app-header-navigation.js',
  'nutrition-tracker-controller.js',
  'app.js',
];

const baselineStaticFiles = [
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icone.png',
];

function preserveExplicitBaselineRuntime() {
  return {
    name: 'preserve-explicit-baseline-runtime',
    apply: 'build',
    async closeBundle() {
      for (const relativePath of [...baselineRuntimeFiles, ...baselineStaticFiles]) {
        const destination = resolve(outputDirectory, relativePath);
        await mkdir(dirname(destination), { recursive: true });
        await copyFile(resolve(projectRoot, relativePath), destination);
      }

      await rename(
        resolve(outputDirectory, 'index.vite.html'),
        resolve(outputDirectory, 'index.html'),
      );
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [preserveExplicitBaselineRuntime()],
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(projectRoot, 'index.vite.html'),
    },
  },
});
