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
import * as FirebaseConfigInternal from './leaf/firebase-config-internal.js';
import * as FirebaseAuthInternal from './firebase/firebase-auth-internal.js';
import * as FirebaseFirestoreInternal from './firebase/firebase-firestore-internal.js';
import * as FirebaseMigrationInternal from './firebase/firebase-migration-internal.js';
import * as FirebaseBackupInternal from './firebase/firebase-backup-internal.js';
import * as FirebaseAccountDataInternal from './firebase/firebase-account-data-internal.js';
import './firebase/firebase-storage.js';
import * as BarcodeScanner from './composite/barcode-scanner.js';
import * as BodyMetricsModel from './composite/body-metrics-model.js';
import * as DailyNutritionModel from './composite/daily-nutrition-model.js';
import * as DateUtils from './composite/date-utils.js';
import * as DiaryTicker from './composite/diary-ticker.js';
import * as DishDescriptionAI from './composite/dish-description-ai.js';
import * as EatingPatternsAI from './composite/eating-patterns-ai.js';
import * as FoodAutofillAI from './composite/food-autofill-ai.js';
import * as FoodEntry from './composite/food-entry.js';
import * as HistoricalGoalsModel from './composite/historical-goals-model.js';
import * as HistoryLoaders from './composite/history-loaders.js';
import * as MealGA from './composite/meal-ga.js';
import * as MealReviewAI from './composite/meal-review-ai.js';
import * as NutritionFeedbackAI from './composite/nutrition-feedback-ai.js';
import * as ProfileValidation from './composite/profile-validation.js';
import * as WeekAggregator from './composite/week-aggregator.js';
import * as AutosaveScheduler from './leaf/autosave-scheduler.js';
import * as CalendarModel from './leaf/calendar-model.js';
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
  'settings-panel.js?v=0.8.1-beta-20260716',
  'backup-modal.js?v=0.8.1-beta-20260716',
  'verify-email-screen.js?v=0.8.1-beta-20260716',
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
    BarcodeScanner,
    BodyMetricsModel,
    CalendarModel,
    DailyNutritionModel,
    DateUtils,
    DiaryTicker,
    DishDescriptionAI,
    EatingPatternsAI,
    FirebaseConfigInternal,
    FirebaseAuthInternal,
    FirebaseFirestoreInternal,
    FirebaseMigrationInternal,
    FirebaseBackupInternal,
    FirebaseAccountDataInternal,
    FoodAutofillAI,
    FoodEntry,
    GoalCalculator,
    GroqClient,
    HistoricalGoalsModel,
    HistoryLoaders,
    HydrationGuard,
    I18n,
    MealGA,
    MealReviewAI,
    MealScore,
    NutritionFeedbackAI,
    OpenFoodFacts,
    PropTypes,
    React,
    ReactDOM,
    RecentMealsModel,
    Recharts,
    ProfileValidation,
    WeekAggregator,
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
