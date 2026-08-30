import React from 'react';
import { createPortal } from 'react-dom';
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import * as AddScreenModule from './components/add-screen.js';
import * as AppHeaderNavigationModule from './components/app-header-navigation.js';
import * as BackupModalModule from './components/backup-modal.js';
import * as BodyMetricsCharts from './components/body-metrics-charts.js';
import * as ChoiceFieldModule from './components/choice-field.js';
import * as DiaryScreenModule from './components/diary-screen.js';
import * as GaResultCardModule from './components/ga-result-card.js';
import * as ImageMealScreenModule from './components/image-meal-screen.js';
import * as LoginScreenModule from './components/login-screen.js';
import * as MealEstimateEditorModule from './components/meal-estimate-editor.js';
import * as MealReviewModalModule from './components/meal-review-modal.js';
import * as MetricsScreenModule from './components/metrics-screen.js';
import * as PantryScreenModule from './components/pantry-screen.js';
import * as PrivacyPanelModule from './components/privacy-panel.js';
import * as ReleaseNotice from './components/release-notice.js';
import * as RequiredProfileModalModule from './components/required-profile-modal.js';
import * as SavedMealCardModule from './components/saved-meal-card.js';
import * as SettingsPanelModule from './components/settings-panel.js';
import * as TutorialOverlayModule from './components/tutorial-overlay.js';
import * as UiPrimitives from './components/ui-primitives.js';
import * as VerifyEmailScreenModule from './components/verify-email-screen.js';
import * as VisualUpdateNoticeModule from './components/visual-update-notice.js';
import * as WeekScreenModule from './components/week-screen.js';
import * as BarcodeScanner from './composite/barcode-scanner-runtime.js';
import * as BodyMetricsModel from './composite/body-metrics-model.js';
import * as DailyNutritionModel from './composite/daily-nutrition-model.js';
import * as DailyEntryModel from './composite/daily-entry-model.js';
import * as DailyEntryPersistence from './composite/daily-entry-persistence.js';
import * as DateUtils from './composite/date-utils.js';
import * as DiaryTicker from './composite/diary-ticker.js';
import * as DishDescriptionAI from './composite/dish-description-ai.js';
import * as EatingPatternsAI from './composite/eating-patterns-ai.js';
import * as FoodAutofillAI from './composite/food-autofill-ai.js';
import * as FoodEntry from './composite/food-entry.js';
import {
  exportFile,
  supportsNativeFileDestinations,
} from './composite/file-export-runtime.js';
import * as HistoricalGoalsModel from './composite/historical-goals-model.js';
import * as HistoryLoaders from './composite/history-loaders.js';
import * as ImageMealFlow from './composite/image-meal-flow.js';
import * as ImageMealRegistration from './composite/image-meal-registration.js';
import * as MealGA from './composite/meal-ga.js';
import * as MealEstimate from './composite/meal-estimate.js';
import * as MealReviewAI from './composite/meal-review-ai.js';
import * as MealImageCaptureRuntime from './composite/meal-image-capture-runtime.js';
import * as NutritionFeedbackAI from './composite/nutrition-feedback-ai.js';
import * as ProfileValidation from './composite/profile-validation.js';
import * as WeekAggregator from './composite/week-aggregator.js';
import { androidAppRuntime } from './composite/android-app-runtime.js';
import {
  androidSystemBarsRuntime,
  observeSystemBarsTheme,
} from './composite/android-system-bars-runtime.js';
import {
  BACK_HANDLER_PRIORITY,
  createBackNavigationDispatcher,
  resolveNutritionBackAction,
  resolveTabHistoryAfterNavigation,
} from './composite/android-back-navigation.js';
import { createNutritionTrackerController } from './controller/nutrition-tracker-controller.js';
import {
  FB_KEY,
  REPORTS_ENABLED,
  REPORT_SERVER_URL,
  fbCheckEmailVerified,
  fbIsLoggedIn,
  fbSignOut,
  fbToken,
  initializeFirebase,
  storage,
} from './firebase/firebase-storage.js';
import { getAppCheckToken, initializeAppCheck } from './firebase/app-check-client.js';
import {
  clearLocalAccountData,
  createAccountDeletionClient,
} from './firebase/account-deletion-client.js';
import * as AIClient from './leaf/ai-client.js';
import * as AutosaveScheduler from './leaf/autosave-scheduler.js';
import * as CalendarModel from './leaf/calendar-model.js';
import * as GoalCalculator from './leaf/goal-calculator.js';
import * as HydrationGuard from './leaf/hydration-guard.js';
import * as ImageMealClient from './leaf/image-meal-client.js';
import * as I18n from './leaf/i18n.js';
import * as MealScore from './leaf/meal-score.js';
import * as OpenFoodFacts from './leaf/open-food-facts.js';
import * as RecentMealsModel from './leaf/recent-meals-model.js';

const Recharts = {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
};

// The controller deliberately keeps these factories render-scoped and resolves
// their namespaces from window. Install the explicitly imported ESM facades
// without changing that frozen controller contract.
Object.assign(globalThis, {
  AutosaveScheduler,
  BarcodeScanner,
  DishDescriptionAI,
  DailyEntryModel,
  DailyEntryPersistence,
  EatingPatternsAI,
  FoodAutofillAI,
  FoodEntry,
  HistoryLoaders,
  MealGA,
  MealReviewAI,
  MealScore,
  NutritionFeedbackAI,
  SavedMealCardModule,
});

const CURRENT_RELEASE = ReleaseNotice.CURRENT_RELEASE;
const APP_VERSION_LABEL = window.APP_VERSION_LABEL || CURRENT_RELEASE.label;
const MOST_RECENT_TUTORIAL_KEY = 'tutorial_most_recent_version_seen';
const CURRENT_RELEASE_ID = CURRENT_RELEASE.id;
const VISUAL_UPDATE_NOTICE_KEY = 'seenVisualUpdateNotice_0.8.1';
const tutorialSeenKey = type => `tutorialSeen_${type}`;
const DARK_THEME_DEFAULT_MIGRATION_KEY = 'appThemeDefaultDarkV1';

function readPreferredDarkMode() {
  try {
    if (localStorage.getItem(DARK_THEME_DEFAULT_MIGRATION_KEY) !== '1') {
      localStorage.setItem('appDarkMode', 'true');
      localStorage.setItem(DARK_THEME_DEFAULT_MIGRATION_KEY, '1');
      return true;
    }
    const saved = localStorage.getItem('appDarkMode');
    return saved !== null ? saved === 'true' : true;
  } catch (_) {
    return true;
  }
}

function hasSeenTutorial(record) {
  return record && (record.value === true || record.value === 'true');
}

const {
  LANGUAGE_OPTIONS,
  normalizeLanguage,
  getLanguageOption,
  pickLang,
  getLocalizedValue,
  formatLocalizedText,
  createTextGetter,
  localeForLang,
  sortLocaleForLang,
  STRINGS,
  MEAL_KEYS,
  getMealLabelsForLanguage,
  normalizeTabKey,
} = I18n.createI18n();

const {
  rnd,
  quickQtys,
  divisor,
  portionLabel,
  formatDateDMY,
  formatDateDM,
  formatHeaderDate,
  capitalizeFirst,
  localToday,
  addCivilDays,
  differenceInCivilDays,
  lastCivilDayOfMonth,
  addDays,
} = DateUtils.createDateUtils({ normalizeLanguage, pickLang, localeForLang });

const {
  searchProducts: searchOpenFoodFactsProducts,
  getProductByBarcode: getOpenFoodFactsProductByBarcode,
  mapProductToForm: mapOpenFoodFactsProductToForm,
} = OpenFoodFacts.createOpenFoodFacts({
  fetchRequest: (...args) => window.fetch(...args),
});

const {
  callAI: requestAICompletion,
} = AIClient.createAIClient({
  fetchRequest: (...args) => window.fetch(...args),
  getIdToken: () => fbToken(),
});
const { AIClientError } = AIClient;

const ACCOUNT_DELETION_FUNCTION_URL =
  'https://europe-southwest1-nutrition-tracker-780b3.cloudfunctions.net/requestAccountDeletion';
const accountDeletionClient = createAccountDeletionClient({
  fetchRequest: (...args) => window.fetch(...args),
  getIdToken: () => fbToken(),
  getAppCheckToken,
  sessionStorage: window.sessionStorage,
  randomUUID: () => window.crypto.randomUUID(),
  functionUrl: ACCOUNT_DELETION_FUNCTION_URL,
});
const firebaseRuntimeConfigured = Boolean(import.meta.env?.VITE_FIREBASE_WEB_APP_ID?.trim());
const appCheckInitialization = firebaseRuntimeConfigured ? Promise.resolve()
  .then(() => initializeAppCheck())
  .catch(() => {
    // Account deletion remains fail-closed if platform attestation is unavailable.
  }) : Promise.resolve();

const imageMealClient = ImageMealClient.createImageMealClient({
  fetchRequest: (...args) => window.fetch(...args),
  getIdToken: () => fbToken(),
});

const mealEstimateDomain = MealEstimate.createMealEstimate({
  createItemId: () => (
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `image-meal-${Date.now()}-${Math.random().toString(16).slice(2)}`
  ),
});

const {
  ChoiceField,
} = ChoiceFieldModule.createChoiceField({ React });

const { MealEstimateEditor } = MealEstimateEditorModule.createMealEstimateEditor({
  React,
  pickLang,
  createEmptyItem: mealEstimateDomain.createEmptyItem,
  calculateTotals: mealEstimateDomain.calculateTotals,
  ChoiceField,
});

const { ImageMealScreen } = ImageMealScreenModule.createImageMealScreen({
  React,
  pickLang,
  MealEstimateEditor,
});

const imageMealRegistration = ImageMealRegistration.createImageMealRegistration({
  createEntryId: () => DailyEntryModel.createIdempotentEntryId(),
  mealKeys: MEAL_KEYS,
});

const imageMealFeature = Object.freeze({
  ImageMealScreen,
  buildRegistration: imageMealRegistration.buildImageMealRegistration,
  createFlow: ({ onReview, onConfirm }) => ImageMealFlow.createImageMealFlow({
    captureFromCamera: MealImageCaptureRuntime.captureMealImageFromCamera,
    chooseFromGallery: MealImageCaptureRuntime.chooseMealImageFromGallery,
    analyzeImageMeal: imageMealClient.analyzeImageMeal,
    normalizeMealEstimate: mealEstimateDomain.normalizeMealEstimate,
    validateMealEstimate: MealEstimate.validateMealEstimate,
    onReview,
    onConfirm,
    createAbortController: () => new AbortController(),
    ImageMealClientError: ImageMealClient.ImageMealClientError,
    MealEstimateValidationError: MealEstimate.MealEstimateValidationError,
  }),
});

const {
  SettingsPanel,
} = SettingsPanelModule.createSettingsPanel({
  React,
  languageOptions: LANGUAGE_OPTIONS,
  normalizeLanguage,
  getLanguageOption,
  pickLang,
  signOut: fbSignOut,
  openUrl: window.open.bind(window),
});

const {
  BackupModal,
} = BackupModalModule.createBackupModal({
  React,
  normalizeLanguage,
  pickLang,
  storage,
  localStorage,
  exportFile,
  supportsNativeFileDestinations,
  getBackupContext: () => ({
    exportData: window._exportData || {},
    exportFullBackup: window._exportFullBackup,
    previewFullAccountBackupImport: window.previewFullAccountBackupImport,
    importFullAccountBackup: window.importFullAccountBackup,
    restoreFullAccountBackup: window._restoreFullAccountBackup,
    reloadNutritionData: window._reloadNutritionData,
    reloadApplication: () => window.location.reload(),
  }),
  FileReader: window.FileReader,
  alertUser: window.alert.bind(window),
  reportError: (...args) => console.error(...args),
  localToday,
  addCivilDays,
});

const {
  VerifyEmailScreen,
} = VerifyEmailScreenModule.createVerifyEmailScreen({
  React,
  authService: {
    checkEmailVerified: fbCheckEmailVerified,
    sendVerificationEmail: window.fbSendVerificationEmail,
  },
  localStorage,
  timers: {
    setInterval: window.setInterval.bind(window),
    clearInterval: window.clearInterval.bind(window),
  },
});

const {
  getGreetingPeriod,
  getGreetingEmoji,
  formatTickerAmount,
  buildNutrientTickerSlide,
} = DiaryTicker.createDiaryTicker({ localeForLang, pickLang });

const { canPersistHydratedKey } = HydrationGuard;

const {
  monthDays,
  shiftMonth,
  calendarMarkerFor,
  calendarMonthStats,
} = CalendarModel.createCalendarModel();

const {
  ACTIVITY_LEVELS,
  REST_FACTORS,
  calculateAge,
  getGoalAdjustment,
  defaultProteinMultiplier,
  getProteinMultiplier,
  computeGoals,
} = GoalCalculator.createGoalCalculator();

const {
  buildDayTotals,
  buildActiveLogTotals,
  buildDailyGoalModel,
  classifyDiaryStatus,
  getReachedGoalMetrics,
} = DailyNutritionModel.createDailyNutritionModel({
  rnd,
  getGoalAdjustment,
  getProteinMultiplier,
});

const {
  aggregateRecentMeals,
} = RecentMealsModel.createRecentMealsModel();

const {
  getWeightForDate,
  optionalNumber,
  upsertWeightEntry,
  normalizeWeightHistory,
  calculateBmrForMeasurement,
  buildBodyMetricsModel,
} = BodyMetricsModel.createBodyMetricsModel({
  computeGoals,
  formatDateDM,
  differenceInCivilDays,
  createMeasurementId: () => Date.now().toString(),
});

const {
  resolveHistoricalGoals,
} = HistoricalGoalsModel.createHistoricalGoalsModel({
  computeGoals,
  getWeightForDate,
});

const {
  aggregateWeekRows,
  aggregateMealAverages,
} = WeekAggregator.createWeekAggregator({
  resolveHistoricalGoals,
  formatDateDM,
});

const {
  isValidBirthDate,
  isValidGender,
  isValidActivityLevel,
  isValidGoalProfile,
  getRequiredProfileData,
  hasRequiredProfileData,
} = ProfileValidation.createProfileValidation({
  storage,
  activityLevels: ACTIVITY_LEVELS,
});

const {
  LoginScreen,
} = LoginScreenModule.createLoginScreen({
  React,
  languageOptions: LANGUAGE_OPTIONS,
  normalizeLanguage,
  isValidBirthDate,
  isValidGender,
  ChoiceField,
  authService: {
    signIn: (...args) => window.fbSignIn(...args),
    checkEmailVerified: (...args) => window.fbCheckEmailVerified(...args),
    signUp: (...args) => window.fbSignUp(...args),
    updateProfile: (...args) => window.fbUpdateProfile(...args),
    setValue: (...args) => window.fbSet(...args),
    sendVerificationEmail: (...args) => window.fbSendVerificationEmail(...args),
    sendPasswordResetEmail: (...args) => window.fbSendPasswordResetEmail(...args),
  },
  readPreferredDarkMode,
  localStorage,
  documentElement: document.documentElement,
  Date,
  localToday,
});

const {
  PrivacyPanel,
} = PrivacyPanelModule.createPrivacyPanel({
  React,
  accountService: {
    signIn: (...args) => window.fbSignIn(...args),
    changePassword: async (currentPassword, newPassword) => {
      await window.fbReauthenticate(currentPassword);
      await window.fbUpdatePassword(newPassword);
    },
    getToken: (...args) => window.fbToken(...args),
    signOut: (...args) => window.fbSignOut(...args),
    getSaveSession: () => window._saveSession,
    requestDeletion: () => accountDeletionClient.requestDeletion(),
    prepareDeletion: () => typeof window.fbPrepareAccountDeletion === 'function'
      ? window.fbPrepareAccountDeletion()
      : Promise.resolve(),
    finalizeDeletion: () => typeof window.fbFinalizeAccountDeletion === 'function'
      ? window.fbFinalizeAccountDeletion()
      : window.fbSignOut(),
    suspendAutosaves: () => {
      if (typeof window._accountDeletionAutosaves?.suspend !== 'function') {
        throw new Error('Autosave coordinator is unavailable');
      }
      return window._accountDeletionAutosaves.suspend();
    },
    resumeAutosaves: () => window._accountDeletionAutosaves?.resume?.(),
    clearLocalAccountData: () => clearLocalAccountData({
      localStorage: window.localStorage,
      sessionStorage: window.sessionStorage,
    }),
  },
  localStorage,
  fetchRequest: (...args) => window.fetch(...args),
  firebaseApiKey: FB_KEY,
  timers: {
    setTimeout: window.setTimeout.bind(window),
  },
});

const {
  RequiredProfileModal,
} = RequiredProfileModalModule.createRequiredProfileModal({
  React,
  normalizeLanguage,
  pickLang,
  ChoiceField,
  activityLevels: ACTIVITY_LEVELS,
  storage,
  isValidBirthDate,
  isValidGender,
  isValidGoalProfile,
  getRequiredProfileData,
  hasRequiredProfileData,
  localToday,
});

const {
  Ring,
  Bar,
  ErrorBoundary,
} = UiPrimitives.createUiPrimitives({ React });

const {
  ReleaseNoticeModal,
} = ReleaseNotice.createReleaseNotice({ React, normalizeLanguage });

const {
  TutorialOverlay,
} = TutorialOverlayModule.createTutorialOverlay({ React, normalizeLanguage });

const {
  VisualUpdateNotice,
} = VisualUpdateNoticeModule.createVisualUpdateNotice({
  React,
  normalizeLanguage,
  pickLang,
});

const {
  MealReviewModal,
} = MealReviewModalModule.createMealReviewModal({ React, pickLang });

const {
  GaResultCard,
} = GaResultCardModule.createGaResultCard({ React, pickLang });

const {
  BodyMetricChart,
  WeightTrendChart,
  BmrTrendChart,
  BodyFatTrendChart,
} = BodyMetricsCharts.createBodyMetricsCharts({ React, Recharts, pickLang });

const {
  WeekScreen,
} = WeekScreenModule.createWeekScreen({ React, Recharts, pickLang });

const {
  PantryScreen,
} = PantryScreenModule.createPantryScreen({
  React,
  pickLang,
  portionLabel,
  ChoiceField,
  nativeBarcodePortal: {
    isActive: () => document.body.classList.contains('phrona-native-barcode-scanner-active'),
    render: node => createPortal(node, document.body),
  },
});

const {
  AddScreen,
} = AddScreenModule.createAddScreen({ React, pickLang, quickQtys, divisor, ChoiceField });

const {
  MetricsScreen,
} = MetricsScreenModule.createMetricsScreen({
  React,
  pickLang,
  formatDateDMY,
  BodyMetricChart,
  WeightTrendChart,
  BmrTrendChart,
  BodyFatTrendChart,
  ChoiceField,
});

const {
  DiaryScreen,
} = DiaryScreenModule.createDiaryScreen({
  React,
  pickLang,
  sortLocaleForLang,
  localeForLang,
  addDays,
  monthDays,
  shiftMonth,
  calendarMonthStats,
  Ring,
  Bar,
  GaResultCard,
  ChoiceField,
});

const {
  AppHeaderNavigation,
} = AppHeaderNavigationModule.createAppHeaderNavigation({ React });

const {
  NutritionTracker,
} = createNutritionTrackerController({
  React,
  services: {
    storage,
    exportFile,
    imageMealFeature,
    resolveNutritionBackAction,
    resolveTabHistoryAfterNavigation,
  },
  domain: {
    LANGUAGE_OPTIONS,
    normalizeLanguage,
    getLanguageOption,
    pickLang,
    createTextGetter,
    localeForLang,
    sortLocaleForLang,
    STRINGS,
    MEAL_KEYS,
    getMealLabelsForLanguage,
    normalizeTabKey,
    searchOpenFoodFactsProducts,
    getOpenFoodFactsProductByBarcode,
    mapOpenFoodFactsProductToForm,
    requestAICompletion,
    AIClientError,
    getGreetingPeriod,
    getGreetingEmoji,
    buildNutrientTickerSlide,
    rnd,
    divisor,
    formatDateDMY,
    formatHeaderDate,
    localToday,
    addCivilDays,
    lastCivilDayOfMonth,
    canPersistHydratedKey,
    monthDays,
    calendarMarkerFor,
    ACTIVITY_LEVELS,
    calculateAge,
    getGoalAdjustment,
    defaultProteinMultiplier,
    computeGoals,
    buildDayTotals,
    buildActiveLogTotals,
    buildDailyGoalModel,
    classifyDiaryStatus,
    getReachedGoalMetrics,
    aggregateRecentMeals,
    getWeightForDate,
    optionalNumber,
    upsertWeightEntry,
    normalizeWeightHistory,
    calculateBmrForMeasurement,
    buildBodyMetricsModel,
    resolveHistoricalGoals,
    aggregateWeekRows,
    aggregateMealAverages,
  },
  screens: {
    MealReviewModal,
    WeekScreen,
    PantryScreen,
    AddScreen,
    MetricsScreen,
    DiaryScreen,
    AppHeaderNavigation,
    ChoiceField,
  },
  browser: {
    windowObject: window,
    documentObject: document,
    localStorageObject: localStorage,
    navigatorObject: navigator,
    FileReaderClass: window.FileReader,
    BlobClass: window.Blob,
    URLObject: window.URL,
    fetchRequest: (...args) => window.fetch(...args),
    setTimeoutFn: window.setTimeout.bind(window),
    clearTimeoutFn: window.clearTimeout.bind(window),
    requestAnimationFrameFn: window.requestAnimationFrame.bind(window),
    consoleObject: console,
  },
  constants: {
    APP_VERSION_LABEL,
    REPORT_SERVER_URL,
    REPORTS_ENABLED,
    tutorialSeenKey,
    hasSeenTutorial,
  },
});

function hasSeenCurrentRelease(record) {
  return ReleaseNotice.hasSeenRelease(record, CURRENT_RELEASE_ID);
}

async function markCurrentReleaseSeen() {
  await storage.set(MOST_RECENT_TUTORIAL_KEY, CURRENT_RELEASE_ID).catch(() => {});
}

export function App() {
  const [authed, setAuthed] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showTutorial, setShowTutorial] = React.useState(false);
  const [tutorialType, setTutorialType] = React.useState('main');
  const [showPrivacy, setShowPrivacy] = React.useState(false);
  const [showBackup, setShowBackup] = React.useState(false);
  const [pendingEmail, setPendingEmail] = React.useState('');
  const [pendingName, setPendingName] = React.useState('');
  const [requiredProfile, setRequiredProfile] = React.useState(null);
  const [profileChecking, setProfileChecking] = React.useState(false);
  const [lang, setLang] = React.useState(() => normalizeLanguage(localStorage.getItem('appLang') || 'pt'));
  const [showReleaseNotice, setShowReleaseNotice] = React.useState(false);
  const [showVisualUpdateNotice, setShowVisualUpdateNotice] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState(readPreferredDarkMode);
  const releaseAudienceRef = React.useRef(null);
  const backDispatcherRef = React.useRef(null);
  if (!backDispatcherRef.current) {
    backDispatcherRef.current = createBackNavigationDispatcher({
      onUnhandled: () => androidAppRuntime.minimize(),
    });
  }
  const registerBackHandler = React.useCallback(
    registration => backDispatcherRef.current.register(registration),
    [],
  );

  React.useEffect(() => {
    let disposed = false;
    let removeListener = () => {};

    androidAppRuntime
      .addBackButtonListener(event => backDispatcherRef.current.dispatch(event))
      .then(remove => {
        if (disposed) {
          void remove();
          return;
        }
        removeListener = remove;
      })
      .catch(error => console.error('Unable to register Android Back listener', error));

    return () => {
      disposed = true;
      void removeListener();
    };
  }, []);

  React.useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    return observeSystemBarsTheme({
      rootElement: document.documentElement,
      runtime: androidSystemBarsRuntime,
      createObserver: listener => new MutationObserver(listener),
      onError: error => console.error('Unable to update Android status bar style', error),
    });
  }, [darkMode]);

  function toggleLang(nextLang) {
    const fallback = lang === 'pt' ? 'en' : lang === 'en' ? 'es' : 'pt';
    const nl = normalizeLanguage(nextLang || fallback);
    localStorage.setItem('appLang', nl);
    setLang(nl);
    Promise.resolve(storage.set('language', nl))
      .catch(() => {});
  }

  function toggleDark() {
    setDarkMode(d => {
      const next = !d;
      localStorage.setItem('appDarkMode', String(next));
      return next;
    });
  }

  async function handleLogout() {
    try {
      await Promise.resolve(fbSignOut());
    } catch (_) {}
    setAuthed(false);
    setChecking(false);
    setProfileChecking(false);
    setRequiredProfile(null);
    setShowSettings(false);
    setShowPrivacy(false);
    setShowBackup(false);
    setShowTutorial(false);
    setShowReleaseNotice(false);
    setShowVisualUpdateNotice(false);
    releaseAudienceRef.current = null;
  }

  React.useEffect(() => registerBackHandler({
    id: 'app-shell',
    priority: BACK_HANDLER_PRIORITY.app,
    handler: () => {
      if (pendingEmail) {
        setPendingEmail(null);
        setPendingName('');
        fbSignOut();
        return true;
      }
      if (showTutorial) {
        setShowTutorial(false);
        releaseAudienceRef.current = null;
        return true;
      }
      if (showReleaseNotice) {
        setShowReleaseNotice(false);
        releaseAudienceRef.current = null;
        return true;
      }
      if (showVisualUpdateNotice) {
        setShowVisualUpdateNotice(false);
        return true;
      }
      if (showPrivacy) {
        setShowPrivacy(false);
        return true;
      }
      if (showBackup) {
        setShowBackup(false);
        return true;
      }
      if (showSettings) {
        setShowSettings(false);
        return true;
      }
      return false;
    },
  }), [
    pendingEmail,
    registerBackHandler,
    showBackup,
    showPrivacy,
    showReleaseNotice,
    showSettings,
    showTutorial,
    showVisualUpdateNotice,
  ]);

  async function checkRequiredProfile() {
    setProfileChecking(true);
    const profile = await getRequiredProfileData().catch(() => ({
      birthDate: '',
      gender: '',
      activityLevel: '',
      goalType: '',
      goalKg: '',
      goalWeeks: '',
      manualAdjustment: '',
    }));
    setRequiredProfile(hasRequiredProfileData(profile) ? null : profile);
    setProfileChecking(false);
  }

  async function checkVisualUpdateNotice(isNew) {
    const seen = await storage.get(VISUAL_UPDATE_NOTICE_KEY).catch(() => null);
    if (seen?.value === 'true') return;
    await storage.set(VISUAL_UPDATE_NOTICE_KEY, 'true').catch(() => {});
    if (!isNew) setShowVisualUpdateNotice(true);
  }

  async function afterAuthenticated(isNew) {
    setAuthed(true);
    storage.set('lastLoginAt', new Date().toISOString()).catch(() => {});
    const savedLang = await storage.get('language').catch(() => null);
    const normalizedSavedLang = normalizeLanguage(savedLang?.value || localStorage.getItem('appLang') || lang || 'pt');
    localStorage.setItem('appLang', normalizedSavedLang);
    setLang(normalizedSavedLang);
    if (savedLang?.value !== normalizedSavedLang) {
      storage.set('language', normalizedSavedLang).catch(() => {});
    }
    await checkRequiredProfile();
    await checkVisualUpdateNotice(isNew);
    const tutorialVersion = await storage.get(MOST_RECENT_TUTORIAL_KEY).catch(() => null);
    if (!hasSeenCurrentRelease(tutorialVersion)) {
      releaseAudienceRef.current = isNew ? 'new' : 'existing';
      setShowReleaseNotice(true);
      return;
    }
    storage.get(tutorialSeenKey('main')).then(r => {
      if (!hasSeenTutorial(r)) {
        setTutorialType('main');
        setShowTutorial(true);
      }
    }).catch(() => {});
  }

  React.useEffect(() => {
    let active = true;
    if (!firebaseRuntimeConfigured) {
      setChecking(false);
      return () => { active = false; };
    }
    const timeout = setTimeout(() => {
      Promise.resolve().then(() => fbSignOut()).catch(() => {});
      setAuthed(false);
      setChecking(false);
    }, 8000);
    Promise.all([
      appCheckInitialization,
      Promise.resolve().then(() => initializeFirebase()),
    ])
      .then(() => {
        if (!active || !fbIsLoggedIn()) {
          clearTimeout(timeout);
          if (active) setChecking(false);
          return null;
        }
        return null;
      })
      .then(async () => {
        if (!active || !fbIsLoggedIn()) return;
        clearTimeout(timeout);
        const verified = await fbCheckEmailVerified({reload: false});
        if (!verified) {
          setAuthed(false);
          setPendingEmail(localStorage.getItem('fb_email') || '');
          setChecking(false);
          setProfileChecking(false);
          return;
        }
        setAuthed(true);
        const savedLang = await storage.get('language').catch(() => null);
        const normalizedSavedLang = normalizeLanguage(savedLang?.value || localStorage.getItem('appLang') || 'pt');
        localStorage.setItem('appLang', normalizedSavedLang);
        setLang(normalizedSavedLang);
        if (savedLang?.value !== normalizedSavedLang) {
          storage.set('language', normalizedSavedLang).catch(() => {});
        }
        storage.set('lastLoginAt', new Date().toISOString()).catch(() => {});
        await checkVisualUpdateNotice(false);
        const tutorialVersion = await storage.get(MOST_RECENT_TUTORIAL_KEY).catch(() => null);
        if (!hasSeenCurrentRelease(tutorialVersion)) {
          releaseAudienceRef.current = 'existing';
          setShowReleaseNotice(true);
        }
        setChecking(false);
        await checkRequiredProfile();
      })
      .catch(() => {
        clearTimeout(timeout);
        Promise.resolve().then(() => fbSignOut()).catch(() => {});
        setAuthed(false);
        setChecking(false);
        setProfileChecking(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, []);

  React.useEffect(() => {
    if (checking || profileChecking) {
      if (typeof window.setInitialLoadingText === 'function') {
        window.setInitialLoadingText(pickLang(lang, 'Entrando...', 'Signing in...', 'Iniciando sesión...'));
      }
      return;
    }

    if (!authed || pendingEmail || requiredProfile) {
      const timer = setTimeout(() => {
        if (typeof window.hideInitialLoading === 'function') window.hideInitialLoading();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [checking, profileChecking, authed, pendingEmail, requiredProfile, lang]);

  if (checking || profileChecking) return null;
  if (pendingEmail) {
    return (
      <VerifyEmailScreen
        email={pendingEmail}
        name={pendingName}
        lang={lang}
        onVerified={isNew => {
          setPendingEmail(null);
          setPendingName('');
          afterAuthenticated(isNew);
        }}
        onBack={() => {
          setPendingEmail(null);
          setPendingName('');
          fbSignOut();
        }}
      />
    );
  }
  if (!authed) {
    return (
      <LoginScreen
        onLogin={isNew => {
          setLang(localStorage.getItem('appLang') || 'pt');
          afterAuthenticated(isNew);
        }}
        onPendingVerification={(email, name) => {
          setPendingEmail(email);
          setPendingName(name || '');
          setLang(localStorage.getItem('appLang') || 'pt');
        }}
      />
    );
  }

  return (
    <ErrorBoundary>
      <>
        {requiredProfile ? (
          <RequiredProfileModal
            lang={lang}
            profile={requiredProfile}
            onComplete={() => setRequiredProfile(null)}
          />
        ) : null}
        {!requiredProfile && (
          <NutritionTracker
            onOpenSettings={() => setShowSettings(true)}
            onLogout={handleLogout}
            onStartTutorial={(type = 'main') => {
              setTutorialType(type);
              setShowTutorial(true);
            }}
            onOpenPrivacy={() => setShowPrivacy(true)}
            onOpenBackup={() => setShowBackup(true)}
            externalLang={lang}
            externalDarkMode={darkMode}
            onLanguageChange={toggleLang}
            onDarkModeChange={toggleDark}
            registerBackHandler={registerBackHandler}
            backHandlerPriority={BACK_HANDLER_PRIORITY.nutrition}
          />
        )}
        {showPrivacy ? (
          <PrivacyPanel
            lang={lang}
            onClose={() => setShowPrivacy(false)}
            onLogout={handleLogout}
          />
        ) : null}
        {showBackup ? (
          <BackupModal
            lang={lang}
            darkMode={darkMode}
            onClose={() => setShowBackup(false)}
            registerBackHandler={registerBackHandler}
            backHandlerPriority={BACK_HANDLER_PRIORITY.nestedPanel}
          />
        ) : null}
        {showReleaseNotice && !requiredProfile ? (
          <ReleaseNoticeModal
            lang={lang}
            onStartTutorial={() => {
              const nextTutorialType = ReleaseNotice.resolveReleaseTutorialType(releaseAudienceRef.current, CURRENT_RELEASE);
              setShowReleaseNotice(false);
              if (nextTutorialType) {
                setTutorialType(nextTutorialType);
                setShowTutorial(true);
              } else {
                if (releaseAudienceRef.current) {
                  markCurrentReleaseSeen();
                  releaseAudienceRef.current = null;
                }
              }
            }}
          />
        ) : null}
        {showVisualUpdateNotice && !requiredProfile ? (
          <VisualUpdateNotice
            lang={lang}
            onDismiss={() => setShowVisualUpdateNotice(false)}
          />
        ) : null}
        {showTutorial && !requiredProfile ? (
          <TutorialOverlay
            lang={lang}
            type={tutorialType}
            onDone={() => {
              storage.set(tutorialSeenKey(tutorialType), 'true').catch(() => {});
              if (releaseAudienceRef.current) {
                markCurrentReleaseSeen();
                releaseAudienceRef.current = null;
              }
              setShowTutorial(false);
            }}
          />
        ) : null}
        {showSettings ? (
          <SettingsPanel
            onClose={() => setShowSettings(false)}
            onLogout={handleLogout}
            onOpenBackup={() => setShowBackup(true)}
            onOpenPrivacy={() => setShowPrivacy(true)}
            lang={lang}
            darkMode={darkMode}
            toggleLang={toggleLang}
            toggleDark={toggleDark}
            registerBackHandler={registerBackHandler}
            backHandlerPriority={BACK_HANDLER_PRIORITY.nestedPanel}
          />
        ) : null}
      </>
    </ErrorBoundary>
  );
}
