import { copyFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDirectory = resolve(projectRoot, 'dist-vite');

const baselineRuntimeFiles = [
  'settings-panel.js',
  'backup-modal.js',
  'verify-email-screen.js',
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
  plugins: [react(), preserveExplicitBaselineRuntime()],
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(projectRoot, 'index.vite.html'),
    },
  },
});
