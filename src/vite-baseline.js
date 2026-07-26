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
import * as AutosaveScheduler from './leaf/autosave-scheduler.js';
import * as CalendarModel from './leaf/calendar-model.js';
import * as FirebaseConfigInternal from './leaf/firebase-config-internal.js';
import * as GoalCalculator from './leaf/goal-calculator.js';
import * as GroqClient from './leaf/groq-client.js';
import * as HydrationGuard from './leaf/hydration-guard.js';
import * as I18n from './leaf/i18n.js';
import * as MealScore from './leaf/meal-score.js';
import * as OpenFoodFacts from './leaf/open-food-facts.js';
import * as RecentMealsModel from './leaf/recent-meals-model.js';

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
  'firebase-auth-internal.js?v=0.8.1-beta-20260718',
  'firebase-firestore-internal.js?v=0.8.1-beta-20260718',
  'firebase-migration-internal.js?v=0.8.1-beta-20260718',
  'firebase-backup-internal.js?v=0.8.1-beta-20260718',
  'firebase-account-data-internal.js?v=0.8.1-beta-20260718',
  'firebase-storage.js?v=0.8.1-beta-20260718-account-data-internal-1',
  'settings-panel.js?v=0.8.1-beta-20260716',
  'backup-modal.js?v=0.8.1-beta-20260716',
  'verify-email-screen.js?v=0.8.1-beta-20260716',
  'barcode-scanner.js?v=0.8.1-beta-20260718',
  'meal-review-ai.js?v=0.8.1-beta-20260718',
  'food-autofill-ai.js?v=0.8.1-beta-20260718',
  'dish-description-ai.js?v=0.8.1-beta-20260718',
  'diary-ticker.js?v=0.8.1-beta-20260716',
  'date-utils.js?v=0.8.1-beta-20260716',
  'food-entry.js?v=0.8.1-beta-20260716',
  'meal-ga.js?v=0.8.1-beta-20260718',
  'daily-nutrition-model.js?v=0.8.1-beta-20260722',
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
    AutosaveScheduler,
    CalendarModel,
    FirebaseConfigInternal,
    GoalCalculator,
    GroqClient,
    HydrationGuard,
    I18n,
    MealScore,
    OpenFoodFacts,
    PropTypes,
    React,
    ReactDOM,
    RecentMealsModel,
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
