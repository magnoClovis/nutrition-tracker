// Trofia application script.
// This file is intentionally kept outside index.html so the app code is readable
// and third-party bundles remain isolated in vendor/. New feature code should keep
// calculation helpers documented where inputs/outputs are not immediately obvious.
const {useState,useEffect,useRef}=React;
const {LineChart,Line,XAxis,YAxis,Tooltip,ResponsiveContainer,ReferenceLine}=Recharts;
const CURRENT_RELEASE = window.ReleaseNotice.CURRENT_RELEASE;
const APP_VERSION_LABEL = window.APP_VERSION_LABEL || CURRENT_RELEASE.label;
const MOST_RECENT_TUTORIAL_KEY = "tutorial_most_recent_version_seen";
const CURRENT_RELEASE_ID = CURRENT_RELEASE.id;
const VISUAL_UPDATE_NOTICE_KEY = "seenVisualUpdateNotice_0.8.1";
const tutorialSeenKey = type => "tutorialSeen_" + type;
const DARK_THEME_DEFAULT_MIGRATION_KEY = "appThemeDefaultDarkV1";

/**
 * Makes dark mode the default once for every browser after this release.
 * After the migration marker is stored, the user's explicit light/dark choice
 * remains authoritative on every subsequent app load and login.
 */
function readPreferredDarkMode() {
  try {
    if (localStorage.getItem(DARK_THEME_DEFAULT_MIGRATION_KEY) !== "1") {
      localStorage.setItem("appDarkMode", "true");
      localStorage.setItem(DARK_THEME_DEFAULT_MIGRATION_KEY, "1");
      return true;
    }
    const saved = localStorage.getItem("appDarkMode");
    return saved !== null ? saved === "true" : true;
  } catch (_) {
    return true;
  }
}

/**
 * Reads tutorial flags safely across legacy/string and current/boolean values.
 * Input: storage record shaped like { value }. Output: true only when the user
 * has explicitly completed the tutorial/release cycle.
 */
function hasSeenTutorial(record) {
  return record && (record.value === true || record.value === "true");
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
  normalizeTabKey
} = window.I18n.createI18n();

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
  addDays
} = window.DateUtils.createDateUtils({ normalizeLanguage, pickLang, localeForLang });

const {
  searchProducts: searchOpenFoodFactsProducts,
  getProductByBarcode: getOpenFoodFactsProductByBarcode,
  mapProductToForm: mapOpenFoodFactsProductToForm
} = window.OpenFoodFacts.createOpenFoodFacts({
  fetchRequest: (...args) => window.fetch(...args)
});

const {
  callAI: requestAICompletion,
  requestFoodEstimate: requestStructuredFoodEstimate,
  requestDishEstimate: requestStructuredDishEstimate,
  requestPantrySuggestions: requestStructuredPantrySuggestions
} = window.AIClient.createAIClient({
  fetchRequest: (...args) => window.fetch(...args),
  getIdToken: () => fbToken()
});
const { AIClientError } = window.AIClient;
const ACCOUNT_DELETION_FUNCTION_URL =
  'https://europe-southwest1-nutrition-tracker-780b3.cloudfunctions.net/requestAccountDeletion';
const appCheckClient = window.AppCheckClient.createAppCheckClient({
  getPlugin: () => window.Capacitor?.Plugins?.FirebaseAppCheck,
  isNativePlatform: () => Boolean(window.Capacitor?.isNativePlatform?.())
});
const accountDeletionClient = window.AccountDeletionClient.createAccountDeletionClient({
  fetchRequest: (...args) => window.fetch(...args),
  getIdToken: () => fbToken(),
  getAppCheckToken: () => appCheckClient.getToken(),
  sessionStorage: window.sessionStorage,
  randomUUID: () => window.crypto.randomUUID(),
  functionUrl: ACCOUNT_DELETION_FUNCTION_URL
});
void appCheckClient.initialize().catch(() => {
  // The legacy runtime remains native-only; Vite owns the web provider.
});

const {
  CheckboxField,
  SliderField
} = window.SelectionControlsModule.createSelectionControls({ React });

const {
  SettingsPanel
} = window.SettingsPanelModule.createSettingsPanel({
  React,
  languageOptions: LANGUAGE_OPTIONS,
  normalizeLanguage,
  getLanguageOption,
  pickLang,
  signOut: fbSignOut,
  openUrl: window.open.bind(window)
});

const {
  BackupModal
} = window.BackupModalModule.createBackupModal({
  React,
  normalizeLanguage,
  pickLang,
  storage,
  localStorage,
  getBackupContext: () => ({
    exportData: window._exportData || {},
    exportFullBackup: window._exportFullBackup,
    previewFullAccountBackupImport: window.previewFullAccountBackupImport,
    importFullAccountBackup: window.importFullAccountBackup,
    restoreFullAccountBackup: window._restoreFullAccountBackup
  }),
  FileReader: window.FileReader,
  alertUser: window.alert.bind(window),
  reportError: (...args) => console.error(...args),
  localToday,
  addCivilDays,
  CheckboxField
});

const {
  VerifyEmailScreen
} = window.VerifyEmailScreenModule.createVerifyEmailScreen({
  React,
  authService: {
    checkEmailVerified: fbCheckEmailVerified,
    sendVerificationEmail: fbSendVerificationEmail
  },
  localStorage,
  timers: {
    setInterval: window.setInterval.bind(window),
    clearInterval: window.clearInterval.bind(window)
  }
});

const {
  getGreetingPeriod,
  getGreetingEmoji,
  formatTickerAmount,
  buildNutrientTickerSlide
} = window.DiaryTicker.createDiaryTicker({ localeForLang, pickLang });

const { canPersistHydratedKey } = window.HydrationGuard;

const {
  monthDays,
  shiftMonth,
  calendarMarkerFor,
  calendarMonthStats
} = window.CalendarModel.createCalendarModel();

const {
  ACTIVITY_LEVELS,
  REST_FACTORS,
  calculateAge,
  getGoalAdjustment,
  defaultProteinMultiplier,
  getProteinMultiplier,
  computeGoals
} = window.GoalCalculator.createGoalCalculator();

const {
  buildDayTotals,
  buildActiveLogTotals,
  buildDailyGoalModel,
  classifyDiaryStatus,
  getReachedGoalMetrics
} = window.DailyNutritionModel.createDailyNutritionModel({
  rnd,
  getGoalAdjustment,
  getProteinMultiplier
});

const {
  aggregateRecentMeals
} = window.RecentMealsModel.createRecentMealsModel();

const {
  getWeightForDate,
  optionalNumber,
  upsertWeightEntry,
  normalizeWeightHistory,
  calculateBmrForMeasurement,
  buildBodyMetricsModel
} = window.BodyMetricsModel.createBodyMetricsModel({
  computeGoals,
  formatDateDM,
  differenceInCivilDays,
  createMeasurementId: () => Date.now().toString()
});

const {
  resolveHistoricalGoals
} = window.HistoricalGoalsModel.createHistoricalGoalsModel({
  computeGoals,
  getWeightForDate
});

const {
  aggregateWeekRows,
  aggregateMealAverages
} = window.WeekAggregator.createWeekAggregator({
  resolveHistoricalGoals,
  formatDateDM
});

const {
  isValidBirthDate,
  isValidGender,
  isValidActivityLevel,
  isValidGoalProfile,
  getRequiredProfileData,
  hasRequiredProfileData
} = window.ProfileValidation.createProfileValidation({ storage, activityLevels: ACTIVITY_LEVELS });

const {
  ChoiceField
} = window.ChoiceFieldModule.createChoiceField({ React });

const mealEstimateDomain = window.MealEstimate.createMealEstimate({
  createItemId: () => (
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `meal-estimate-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )
});

const {
  MealEstimateEditor
} = window.MealEstimateEditorModule.createMealEstimateEditor({
  React,
  pickLang,
  createEmptyItem: mealEstimateDomain.createEmptyItem,
  calculateTotals: mealEstimateDomain.calculateTotals,
  ChoiceField
});

const {
  SearchableChoiceField
} = window.SearchableChoiceFieldModule.createSearchableChoiceField({ React });

const {
  TemporalField,
  DateField,
  NumericField
} = window.TemporalFieldModule.createTemporalField({ React });

const {
  LoginScreen
} = window.LoginScreenModule.createLoginScreen({
  React,
  languageOptions: LANGUAGE_OPTIONS,
  normalizeLanguage,
  isValidBirthDate,
  isValidGender,
  ChoiceField,
  DateField,
  authService: {
    signIn: (...args) => window.fbSignIn(...args),
    checkEmailVerified: (...args) => window.fbCheckEmailVerified(...args),
    signUp: (...args) => window.fbSignUp(...args),
    updateProfile: (...args) => window.fbUpdateProfile(...args),
    setValue: (...args) => window.fbSet(...args),
    sendVerificationEmail: (...args) => window.fbSendVerificationEmail(...args),
    sendPasswordResetEmail: (...args) => window.fbSendPasswordResetEmail(...args)
  },
  readPreferredDarkMode,
  localStorage,
  documentElement: document.documentElement,
  Date,
  localToday
});

const {
  PrivacyPanel
} = window.PrivacyPanelModule.createPrivacyPanel({
  React,
  accountService: {
    signIn: (...args) => window.fbSignIn(...args),
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
    clearLocalAccountData: () => window.AccountDeletionClient.clearLocalAccountData({
      localStorage: window.localStorage,
      sessionStorage: window.sessionStorage
    })
  },
  localStorage,
  fetchRequest: (...args) => window.fetch(...args),
  firebaseApiKey: FB_KEY,
  timers: {
    setTimeout: window.setTimeout.bind(window)
  }
});

const {
  RequiredProfileModal,
  RequiredProfileReadError
} = window.RequiredProfileModalModule.createRequiredProfileModal({
  React,
  normalizeLanguage,
  pickLang,
  ChoiceField,
  DateField,
  activityLevels: ACTIVITY_LEVELS,
  storage,
  isValidBirthDate,
  isValidGender,
  isValidGoalProfile,
  getRequiredProfileData,
  hasRequiredProfileData,
  localToday
});

const {
  Ring,
  Bar,
  ErrorBoundary
} = window.UiPrimitives.createUiPrimitives({ React });

const {
  ReleaseNoticeModal
} = window.ReleaseNotice.createReleaseNotice({ React, normalizeLanguage });

const {
  TutorialOverlay
} = window.TutorialOverlay.createTutorialOverlay({ React, normalizeLanguage });

const {
  VisualUpdateNotice
} = window.VisualUpdateNoticeModule.createVisualUpdateNotice({ React, normalizeLanguage, pickLang });

const {
  MealReviewModal
} = window.MealReviewModalModule.createMealReviewModal({ React, pickLang });

const {
  GaResultCard
} = window.GaResultCardModule.createGaResultCard({ React, pickLang });

const {
  BodyMetricChart,
  WeightTrendChart,
  BmrTrendChart,
  BodyFatTrendChart
} = window.BodyMetricsCharts.createBodyMetricsCharts({ React, Recharts, pickLang });

const {
  WeekScreen
} = window.WeekScreenModule.createWeekScreen({ React, Recharts, pickLang });

const {
  PantryScreen
} = window.PantryScreenModule.createPantryScreen({ React, pickLang, portionLabel, ChoiceField });

const {
  AddScreen
} = window.AddScreenModule.createAddScreen({ React, pickLang, quickQtys, divisor, ChoiceField, TemporalField, NumericField, MealEstimateEditor });

const {
  MetricsScreen
} = window.MetricsScreenModule.createMetricsScreen({
  React,
  pickLang,
  formatDateDMY,
  BodyMetricChart,
  WeightTrendChart,
  BmrTrendChart,
  BodyFatTrendChart,
  ChoiceField
});

const {
  DiaryScreen
} = window.DiaryScreenModule.createDiaryScreen({
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
  SearchableChoiceField,
  CheckboxField,
  SliderField,
  collectValidMealEvaluationGroups: window.MealScore.collectValidMealEvaluationGroups
});
const {
  AppHeaderNavigation
} = window.AppHeaderNavigationModule.createAppHeaderNavigation({ React });

// Contract anchor for the existing tutorial-host test. The executable callback
// remains render-scoped inside NutritionTrackerController:
// setTimeout(() => onStartTutorial && onStartTutorial(normalizedTab), 120)
const {
  NutritionTracker
} = window.NutritionTrackerController.createNutritionTrackerController({
  React,
  services: {
    storage
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
    requestStructuredFoodEstimate,
    requestStructuredDishEstimate,
    requestStructuredPantrySuggestions,
    normalizeMealEstimate: mealEstimateDomain.normalizeMealEstimate,
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
    aggregateMealAverages
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
    SearchableChoiceField
  },
  browser: {
    windowObject: window,
    documentObject: document,
    localStorageObject: localStorage,
    sessionStorageObject: sessionStorage,
    navigatorObject: navigator,
    FileReaderClass: window.FileReader,
    BlobClass: window.Blob,
    URLObject: window.URL,
    fetchRequest: (...args) => window.fetch(...args),
    setTimeoutFn: window.setTimeout.bind(window),
    clearTimeoutFn: window.clearTimeout.bind(window),
    requestAnimationFrameFn: window.requestAnimationFrame.bind(window),
    consoleObject: console
  },
  constants: {
    APP_VERSION_LABEL,
    REPORT_SERVER_URL,
    REPORTS_ENABLED,
    tutorialSeenKey,
    hasSeenTutorial
  }
});

/**
 * Release notices use an explicit version marker. Legacy boolean values mean
 * that an older release was acknowledged, so existing users still receive the
 * current release welcome once without resetting their completed tab tutorials.
 */
function hasSeenCurrentRelease(record) {
  return window.ReleaseNotice.hasSeenRelease(record, CURRENT_RELEASE_ID);
}

async function markCurrentReleaseSeen() {
  await storage.set(MOST_RECENT_TUTORIAL_KEY, CURRENT_RELEASE_ID).catch(() => {});
}

function profileReadErrorCode(error) {
  let current = error;
  for (let depth = 0; current && depth < 4; depth += 1) {
    const code = String(current.code || '').trim();
    if (/^[A-Za-z0-9_./-]{1,100}$/.test(code)) return code;
    current = current.cause;
  }
  return 'firestore-profile-read-failed';
}

// Login / Register Screen



// Privacy & Security Panel
// Root App
function App() {
  const [authed,  setAuthed]    = React.useState(fbIsLoggedIn());
  const [checking,setChecking]  = React.useState(fbIsLoggedIn());
  const [showSettings,setShowSettings] = React.useState(false);
  const [showTutorial,setShowTutorial] = React.useState(false);
  const [tutorialType,setTutorialType] = React.useState('main');
  const [showPrivacy, setShowPrivacy]  = React.useState(false);
  const [showBackup,  setShowBackup]   = React.useState(false);
  const [pendingEmail, setPendingEmail] = React.useState('');
  const [pendingName,  setPendingName]  = React.useState('');
  const [requiredProfile, setRequiredProfile] = React.useState(null);
  const [profileLoadError, setProfileLoadError] = React.useState(null);
  const [profileChecking, setProfileChecking] = React.useState(fbIsLoggedIn());
  const [lang, setLang]         = React.useState(()=>normalizeLanguage(localStorage.getItem('appLang')||'pt'));
  const [showReleaseNotice, setShowReleaseNotice] = React.useState(false);
  const [showVisualUpdateNotice, setShowVisualUpdateNotice] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState(readPreferredDarkMode);
  const releaseAudienceRef = React.useRef(null);
  React.useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  function toggleLang(nextLang) {
    const fallback = lang === 'pt' ? 'en' : lang === 'en' ? 'es' : 'pt';
    const nl = normalizeLanguage(nextLang || fallback);
    localStorage.setItem('appLang',nl);
    setLang(nl);
    Promise.resolve(storage.set('language', nl))
      .catch(()=>{});
  }
  function toggleDark() { setDarkMode(d => { const next = !d; localStorage.setItem('appDarkMode', String(next)); return next; }); }
  async function handleLogout() {
    try {
      await Promise.resolve(fbSignOut());
    } catch (_) {}
    setAuthed(false);
    setChecking(false);
    setProfileChecking(false);
    setRequiredProfile(null);
    setProfileLoadError(null);
    setShowSettings(false);
    setShowPrivacy(false);
    setShowBackup(false);
    setShowTutorial(false);
    setShowReleaseNotice(false);
    setShowVisualUpdateNotice(false);
    releaseAudienceRef.current = null;
  }
  async function checkRequiredProfile() {
    setProfileChecking(true);
    setProfileLoadError(null);
    try {
      const profile = await getRequiredProfileData();
      setRequiredProfile(hasRequiredProfileData(profile) ? null : profile);
      return true;
    } catch (error) {
      setRequiredProfile(null);
      setProfileLoadError(profileReadErrorCode(error));
      return false;
    } finally {
      setProfileChecking(false);
    }
  }

  async function checkVisualUpdateNotice(isNew) {
    const seen = await storage.get(VISUAL_UPDATE_NOTICE_KEY).catch(()=>null);
    if (seen?.value === 'true') return;
    await storage.set(VISUAL_UPDATE_NOTICE_KEY, 'true').catch(()=>{});
    if (!isNew) setShowVisualUpdateNotice(true);
  }

  async function afterAuthenticated(isNew) {
    setAuthed(true);
    storage.set('lastLoginAt', new Date().toISOString()).catch(()=>{});
    const savedLang = await storage.get('language').catch(()=>null);
    const normalizedSavedLang = normalizeLanguage(savedLang?.value || localStorage.getItem('appLang') || lang || 'pt');
    localStorage.setItem('appLang', normalizedSavedLang);
    setLang(normalizedSavedLang);
    if (savedLang?.value !== normalizedSavedLang) {
      storage.set('language', normalizedSavedLang).catch(()=>{});
    }
    if (!await checkRequiredProfile()) return;
    await checkVisualUpdateNotice(isNew);
    const tutorialVersion = await storage.get(MOST_RECENT_TUTORIAL_KEY).catch(()=>null);
    if (!hasSeenCurrentRelease(tutorialVersion)) {
      releaseAudienceRef.current = isNew ? 'new' : 'existing';
      setShowReleaseNotice(true);
      return;
    }
    storage.get(tutorialSeenKey('main')).then(r => {
      if (!hasSeenTutorial(r)) { setTutorialType('main'); setShowTutorial(true); }
    }).catch(()=>{});
  }

  React.useEffect(() => {
    if (!fbIsLoggedIn()) { setChecking(false); return; }
    const timeout = setTimeout(() => { fbSignOut(); setAuthed(false); setChecking(false); }, 8000);
    fbRefreshToken()
      .then(async () => {
        clearTimeout(timeout);
        const verified = await fbCheckEmailVerified();
        if (!verified) {
          setAuthed(false);
          setPendingEmail(localStorage.getItem('fb_email') || '');
          setChecking(false);
          setProfileChecking(false);
          return;
        }
        const savedLang = await storage.get('language').catch(()=>null);
        const normalizedSavedLang = normalizeLanguage(savedLang?.value || localStorage.getItem('appLang') || 'pt');
        localStorage.setItem('appLang', normalizedSavedLang);
        setLang(normalizedSavedLang);
        if (savedLang?.value !== normalizedSavedLang) {
          storage.set('language', normalizedSavedLang).catch(()=>{});
        }
        storage.set('lastLoginAt', new Date().toISOString()).catch(()=>{});
        await checkVisualUpdateNotice(false);
        const tutorialVersion = await storage.get(MOST_RECENT_TUTORIAL_KEY).catch(()=>null);
        if (!hasSeenCurrentRelease(tutorialVersion)) {
          releaseAudienceRef.current = 'existing';
          setShowReleaseNotice(true);
        }
        setChecking(false);
        await checkRequiredProfile();
      })
      .catch(() => { clearTimeout(timeout); fbSignOut(); setAuthed(false); setChecking(false); setProfileChecking(false); });
  }, []);

  // Removed: was auto-opening settings on every login

  React.useEffect(() => {
    if (checking || profileChecking) {
      if (typeof window.setInitialLoadingText === "function") {
        window.setInitialLoadingText(pickLang(lang, "Entrando...", "Signing in...", "Iniciando sesi\u00f3n..."));
      }
      return;
    }

    // Login, verification and required-profile screens are ready at this level.
    // Authenticated app content hides the initial loading layer from inside
    // NutritionTracker after user data has finished loading.
    if (!authed || pendingEmail || requiredProfile || profileLoadError) {
      const timer = setTimeout(() => {
        if (typeof window.hideInitialLoading === "function") window.hideInitialLoading();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [checking, profileChecking, authed, pendingEmail, requiredProfile, profileLoadError, lang]);

  // Keep the static loading layer on screen while auth/profile checks run.
  if (checking || profileChecking) return null;
  if (pendingEmail) return React.createElement(VerifyEmailScreen, {
    email: pendingEmail,
    name: pendingName,
    lang,
    onVerified: (isNew) => {
      setPendingEmail(null); setPendingName('');
      afterAuthenticated(isNew);
    },
    onBack: () => { setPendingEmail(null); setPendingName(''); fbSignOut(); }
  });
  if (!authed) return React.createElement(LoginScreen, {
    onLogin: (isNew) => {
      setLang(localStorage.getItem('appLang') || 'pt');
      afterAuthenticated(isNew);
    },
    onPendingVerification: (email, name) => {
      setPendingEmail(email);
      setPendingName(name || '');
      setLang(localStorage.getItem('appLang') || 'pt');
    }
  });

  return React.createElement(ErrorBoundary, null,
    React.createElement(React.Fragment, null,
      profileLoadError ? React.createElement(RequiredProfileReadError, {
        lang,
        errorCode: profileLoadError,
        onRetry: checkRequiredProfile,
        onLogout: handleLogout
      }) : requiredProfile ? React.createElement(RequiredProfileModal, {
        lang,
        profile: requiredProfile,
        onComplete: () => setRequiredProfile(null)
      }) : null,
      !requiredProfile && !profileLoadError && React.createElement(NutritionTracker, {
        onOpenSettings: () => setShowSettings(true),
        onLogout: handleLogout,
        onStartTutorial: (type = 'main') => { setTutorialType(type); setShowTutorial(true); },
        onOpenPrivacy: () => setShowPrivacy(true),
        onOpenBackup: () => setShowBackup(true),
        externalLang: lang,
        externalDarkMode: darkMode,
        onLanguageChange: toggleLang,
        onDarkModeChange: toggleDark,
      }),
      showPrivacy ? React.createElement(PrivacyPanel, {
        lang,
        onClose: () => setShowPrivacy(false),
        onLogout: handleLogout
      }) : null,
      showBackup ? React.createElement(BackupModal, {
        lang,
        darkMode,
        onClose: () => setShowBackup(false)
      }) : null,
      showReleaseNotice && !requiredProfile && !profileLoadError ? React.createElement(ReleaseNoticeModal, {
        lang,
        onStartTutorial: () => {
          const nextTutorialType = window.ReleaseNotice.resolveReleaseTutorialType(releaseAudienceRef.current, CURRENT_RELEASE);
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
        }
      }) : null,
      showVisualUpdateNotice && !requiredProfile && !profileLoadError ? React.createElement(VisualUpdateNotice, {
        lang,
        onDismiss: () => setShowVisualUpdateNotice(false)
      }) : null,
      showTutorial && !requiredProfile && !profileLoadError ? React.createElement(TutorialOverlay, {
        lang,
        type: tutorialType,
        onDone: () => {
          storage.set(tutorialSeenKey(tutorialType), 'true').catch(()=>{});
          if (releaseAudienceRef.current) {
            markCurrentReleaseSeen();
            releaseAudienceRef.current = null;
          }
          setShowTutorial(false);
        }
      }) : null,
      showSettings ? React.createElement(SettingsPanel, {
        onClose:  () => setShowSettings(false),
        onLogout: handleLogout,
        onOpenBackup: () => setShowBackup(true),
        onOpenPrivacy: () => setShowPrivacy(true),
        lang, darkMode, toggleLang, toggleDark
      }) : null
    )
  );
}

const _root = ReactDOM.createRoot(document.getElementById('root'));
_root.render(React.createElement(App));
