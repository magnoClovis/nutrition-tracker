import PropTypes from 'prop-types';
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const ReactDOM = { createRoot };
const Recharts = {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
};

const legacyAppScripts = [
  'firebase-config-internal.js?v=0.8.1-beta-20260718',
  'firebase-auth-internal.js?v=0.8.1-beta-20260718',
  'firebase-firestore-internal.js?v=0.8.1-beta-20260718',
  'firebase-migration-internal.js?v=0.8.1-beta-20260718',
  'firebase-backup-internal.js?v=0.8.1-beta-20260718',
  'firebase-account-data-internal.js?v=0.8.1-beta-20260718',
  'firebase-storage.js?v=0.8.1-beta-20260718-account-data-internal-1',
  'meal-score.js?v=0.8.1-beta-20260713',
  'i18n.js?v=0.8.1-beta-20260716',
  'settings-panel.js?v=0.8.1-beta-20260716',
  'backup-modal.js?v=0.8.1-beta-20260716',
  'verify-email-screen.js?v=0.8.1-beta-20260716',
  'open-food-facts.js?v=0.8.1-beta-20260718',
  'barcode-scanner.js?v=0.8.1-beta-20260718',
  'groq-client.js?v=0.8.1-beta-20260718',
  'meal-review-ai.js?v=0.8.1-beta-20260718',
  'food-autofill-ai.js?v=0.8.1-beta-20260718',
  'dish-description-ai.js?v=0.8.1-beta-20260718',
  'diary-ticker.js?v=0.8.1-beta-20260716',
  'date-utils.js?v=0.8.1-beta-20260716',
  'hydration-guard.js?v=0.8.1-beta-20260722',
  'autosave-scheduler.js?v=0.8.1-beta-20260722',
  'calendar-model.js?v=0.8.1-beta-20260722',
  'food-entry.js?v=0.8.1-beta-20260716',
  'meal-ga.js?v=0.8.1-beta-20260718',
  'goal-calculator.js?v=0.8.1-beta-20260716',
  'daily-nutrition-model.js?v=0.8.1-beta-20260722',
  'recent-meals-model.js?v=0.8.1-beta-20260722',
  'body-metrics-model.js?v=0.8.1-beta-20260722',
  'historical-goals-model.js?v=0.8.1-beta-20260722',
  'week-aggregator.js?v=0.8.1-beta-20260722',
  'history-loaders.js?v=0.8.1-beta-20260722',
  'nutrition-feedback-ai.js?v=0.8.1-beta-20260718',
  'eating-patterns-ai.js?v=0.8.1-beta-20260718',
  'profile-validation.js?v=0.8.1-beta-20260716',
  'login-screen.js?v=0.8.1-beta-20260716',
  'privacy-panel.js?v=0.8.1-beta-20260716',
  'required-profile-modal.js?v=0.8.1-beta-20260716',
  'ui-primitives.js?v=0.8.1-beta-20260716',
  'release-notice.js?v=0.8.1-beta-20260716',
  'tutorial-overlay.js?v=0.8.1-beta-20260716',
  'visual-update-notice.js?v=0.8.1-beta-20260723',
  'meal-review-modal.js?v=0.8.1-beta-20260723',
  'ga-result-card.js?v=0.8.1-beta-20260723',
  'saved-meal-card.js?v=0.8.1-beta-20260723',
  'body-metrics-charts.js?v=0.8.1-beta-20260723',
  'week-screen.js?v=0.8.1-beta-20260723',
  'metrics-screen.js?v=0.8.1-beta-20260723',
  'pantry-screen.js?v=0.8.1-beta-20260723',
  'add-screen.js?v=0.8.1-beta-20260723',
  'diary-screen.js?v=0.8.1-beta-20260723',
  'app-header-navigation.js?v=0.8.1-beta-20260725',
  'nutrition-tracker-controller.js?v=0.8.1-beta-20260725',
  'app.js?v=0.8.1-beta-20260725-nutrition-tracker-controller-1',
];

function installNpmRuntime(target) {
  Object.assign(target, {
    PropTypes,
    React,
    ReactDOM,
    Recharts,
  });
}

function loadClassicScript(source) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = false;
    script.src = new URL(source, document.baseURI).href;
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', () => {
      reject(new Error(`Failed to load application runtime: ${source}`));
    }, { once: true });
    document.body.appendChild(script);
  });
}

async function bootstrapViteBaseline() {
  installNpmRuntime(globalThis);
  await Promise.all(legacyAppScripts.map(loadClassicScript));
}

bootstrapViteBaseline();
