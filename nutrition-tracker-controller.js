/**
 * MAXIMUM-CAUTION CONTROLLER CORE for the Diário Nutricional application.
 *
 * This UMD module owns the complete NutritionTracker controller: its 145 React
 * states, 35 effects, 14 refs, local callbacks, and the temporal hydration /
 * autosave protocol. Hook order and effect dependency arrays are behavioral
 * contracts. The eleven render-scoped factories below intentionally remain
 * inside NutritionTracker so they receive the current render closures; do not
 * hoist, memoize, reorder, or instantiate them at module scope.
 *
 * The composition root injects stable services, domain APIs, screens, browser
 * capabilities, and constants. Input is the same App-owned prop contract used
 * before extraction; output is the same React tree. This is a mechanical module
 * boundary only and deliberately preserves every documented race and edge case,
 * including tutorial sequencing, persistent global backup bridges, the language
 * submenu state, hydration timeout behavior, and autosave timing.
 *
 * @module NutritionTrackerController
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NutritionTrackerController = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  /**
   * Creates the final application controller from explicitly grouped dependencies.
   *
   * @param {Object} dependencies Controller dependencies.
   * @param {Object} dependencies.React React runtime.
   * @param {Object} dependencies.services Stable persistence and external services.
   * @param {Object} dependencies.domain Pure/domain APIs composed by app.js.
   * @param {Object} dependencies.screens Presentational screens composed by app.js.
   * @param {Object} dependencies.browser Browser capabilities used by the controller.
   * @param {Object} dependencies.constants Stable application constants and gates.
   * @returns {{NutritionTracker: function(Object): Object}} Controller component API.
   */
  function createNutritionTrackerController({
    React,
    services,
    domain,
    screens,
    browser,
    constants
  }) {
    if (!React || typeof React.createElement !== "function") {
      throw new TypeError("NutritionTrackerController requires React");
    }

    const { useState, useEffect, useRef } = React;
    const { storage, exportFile: injectedExportFile } = services;
    const {
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
      requestGroqCompletion,
      GroqClientError,
      getGreetingPeriod,
      getGreetingEmoji,
      buildNutrientTickerSlide,
      rnd,
      divisor,
      formatDateDMY,
      formatHeaderDate,
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
    } = domain;
    const {
      MealReviewModal,
      WeekScreen,
      PantryScreen,
      AddScreen,
      MetricsScreen,
      DiaryScreen,
      AppHeaderNavigation
    } = screens;
    const {
      windowObject,
      documentObject,
      localStorageObject,
      navigatorObject,
      FileReaderClass,
      BlobClass,
      URLObject,
      fetchRequest,
      setTimeoutFn,
      clearTimeoutFn,
      requestAnimationFrameFn,
      consoleObject
    } = browser;
    const {
      APP_VERSION_LABEL,
      TODAY,
      REPORT_SERVER_URL,
      REPORTS_ENABLED,
      tutorialSeenKey,
      hasSeenTutorial
    } = constants;

    const window = windowObject || root;
    const document = documentObject || window.document;
    const localStorage = localStorageObject || window.localStorage;
    const navigator = navigatorObject || window.navigator;
    const FileReader = FileReaderClass || window.FileReader;
    const Blob = BlobClass || window.Blob;
    const URL = URLObject || window.URL;
    const fetch = fetchRequest || window.fetch.bind(window);
    const setTimeout = setTimeoutFn || window.setTimeout.bind(window);
    const clearTimeout = clearTimeoutFn || window.clearTimeout.bind(window);
    const requestAnimationFrame = requestAnimationFrameFn || window.requestAnimationFrame.bind(window);
    const console = consoleObject || window.console;

    const GREETING_PHRASES = {
      pt: {
        morning: [
          "Vamos começar o dia com clareza.",
          "Um bom registro agora facilita o resto do dia.",
          "Hoje é um bom dia para manter o plano simples.",
          "Pequenas escolhas cedo deixam o dia mais fácil.",
          "Comece pelo básico: registrar, ajustar e seguir.",
          "Uma manhã organizada ajuda muito no resultado.",
          "Deixa o plano do dia visível antes da correria.",
          "Hoje começa melhor quando você sabe onde está.",
          "Um passo de cada vez, desde cedo.",
          "Vamos montar uma base boa para o dia."
        ],
        afternoon: [
          "Boa hora para revisar como o dia está indo.",
          "Ainda dá tempo de ajustar o rumo com calma.",
          "Vamos ver o que falta para fechar bem o dia.",
          "A tarde é boa para corrigir pequenos desvios.",
          "Pausa rápida para checar o plano.",
          "Metade do caminho já diz bastante.",
          "Vamos alinhar o resto do dia com seu objetivo.",
          "Um ajuste agora evita improviso depois.",
          "Boa hora para equilibrar proteína, calorias e rotina.",
          "Vamos transformar o que já foi registrado em direção."
        ],
        night: [
          "Vamos fechar o dia com uma visão clara.",
          "Boa hora para entender o que funcionou hoje.",
          "Registrar agora ajuda o plano de amanhã.",
          "O fim do dia também conta para o progresso.",
          "Vamos revisar sem drama e com precisão.",
          "Hoje ainda pode terminar bem organizado.",
          "Um fechamento honesto vale mais que perfeição.",
          "Vamos guardar os dados de hoje do jeito certo.",
          "A noite é boa para aprender com o dia.",
          "Fechar o dia com clareza deixa amanhã mais fácil."
        ],
        general: [
          "Vamos cuidar do plano de hoje.",
          "Pequenas consistências viram tendência.",
          "O importante é enxergar o padrão, não um dia isolado.",
          "Registre o que aconteceu e siga ajustando.",
          "Dados claros ajudam decisões melhores.",
          "Vamos deixar seus objetivos mais visíveis.",
          "O plano melhora quando você acompanha de perto.",
          "Um registro bem feito já é parte do progresso.",
          "Foque no que dá para ajustar agora.",
          "Vamos organizar as escolhas sem complicar."
        ]
      },
      en: {
        morning: [
          "Let's start the day with clarity.",
          "Logging now makes the rest of the day easier.",
          "Today is a good day to keep the plan simple.",
          "Small early choices make the day smoother.",
          "Start with the basics: log, adjust, keep going.",
          "An organized morning helps the whole plan.",
          "Make today's plan visible before the rush.",
          "The day starts better when you know where you stand.",
          "One step at a time, starting early.",
          "Let's build a solid base for the day."
        ],
        afternoon: [
          "Good time to review how the day is going.",
          "There's still time to adjust calmly.",
          "Let's see what's left to finish the day well.",
          "The afternoon is useful for small course corrections.",
          "Quick pause to check the plan.",
          "Halfway through, the pattern already says a lot.",
          "Let's align the rest of the day with your goal.",
          "A small adjustment now avoids improvising later.",
          "Good time to balance protein, calories, and routine.",
          "Let's turn what you've logged into direction."
        ],
        night: [
          "Let's close the day with a clear view.",
          "Good time to understand what worked today.",
          "Logging now helps tomorrow's plan.",
          "The end of the day still counts toward progress.",
          "Let's review without drama and with precision.",
          "Today can still finish organized.",
          "An honest closeout matters more than perfection.",
          "Let's store today's data properly.",
          "Night is a good time to learn from the day.",
          "Closing the day clearly makes tomorrow easier."
        ],
        general: [
          "Let's take care of today's plan.",
          "Small consistencies become trends.",
          "The pattern matters more than a single day.",
          "Log what happened and keep adjusting.",
          "Clear data supports better decisions.",
          "Let's make your goals easier to see.",
          "The plan improves when you track it closely.",
          "A good log is already part of the progress.",
          "Focus on what you can adjust now.",
          "Let's organize choices without overcomplicating them."
        ]
      },
      es: {
        morning: [
          "Empecemos el día con claridad.",
          "Registrar ahora hace más fácil el resto del día.",
          "Hoy es un buen día para mantener el plan simple.",
          "Las pequeñas elecciones temprano ordenan el día.",
          "Empieza por lo básico: registrar, ajustar y seguir.",
          "Una mañana organizada ayuda mucho al resultado.",
          "Deja el plan del día visible antes de la prisa.",
          "El día empieza mejor cuando sabes dónde estás.",
          "Un paso a la vez, desde temprano.",
          "Vamos a construir una buena base para el día."
        ],
        afternoon: [
          "Buen momento para revisar cómo va el día.",
          "Todavía hay tiempo para ajustar con calma.",
          "Veamos qué falta para cerrar bien el día.",
          "La tarde ayuda a corregir pequeños desvíos.",
          "Pausa rápida para revisar el plan.",
          "A mitad del camino ya se ve bastante.",
          "Alineemos el resto del día con tu objetivo.",
          "Un ajuste ahora evita improvisar después.",
          "Buen momento para equilibrar proteína, calorías y rutina.",
          "Convirtamos lo registrado en dirección."
        ],
        night: [
          "Cerremos el día con una visión clara.",
          "Buen momento para entender qué funcionó hoy.",
          "Registrar ahora ayuda al plan de mañana.",
          "El final del día también cuenta para el progreso.",
          "Revisemos sin drama y con precisión.",
          "Hoy todavía puede terminar bien organizado.",
          "Un cierre honesto vale más que la perfección.",
          "Guardemos los datos de hoy correctamente.",
          "La noche es buena para aprender del día.",
          "Cerrar el día con claridad hace más fácil mañana."
        ],
        general: [
          "Cuidemos el plan de hoy.",
          "Las pequeñas constancias se vuelven tendencia.",
          "Importa más el patrón que un día aislado.",
          "Registra lo que pasó y sigue ajustando.",
          "Datos claros ayudan a decidir mejor.",
          "Hagamos más visibles tus objetivos.",
          "El plan mejora cuando lo sigues de cerca.",
          "Un buen registro ya es parte del progreso.",
          "Enfócate en lo que puedes ajustar ahora.",
          "Organicemos las elecciones sin complicarlo."
        ]
      }
    };

    function getLocalDateKey(date = new Date()) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function hashString(text) {
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = (hash * 31 + text.charCodeAt(i)) | 0;
      }
      return Math.abs(hash);
    }

    /**
     * Picks one greeting phrase per local day, language, and day period.
     * Input: current language and greeting period. Output: stable phrase string.
     * localStorage keeps the choice stable during the day without touching Firestore.
     */
    function getDailyGreetingPhrase(lang, period) {
      const language = GREETING_PHRASES[normalizeLanguage(lang)] ? normalizeLanguage(lang) : "pt";
      const dateKey = getLocalDateKey();
      const storageKey = `dailyGreetingPhrase_${language}_${period}_${dateKey}`;
      const pool = [
        ...(GREETING_PHRASES[language][period] || []),
        ...GREETING_PHRASES[language].general
      ];
      const stored = localStorage.getItem(storageKey);
      if (stored && pool.includes(stored)) return stored;
      const phrase = pool[hashString(storageKey) % pool.length] || "";
      localStorage.setItem(storageKey, phrase);
      return phrase;
    }

    // Translations
    // Goal toast copy is intentionally centralized so future tone changes do not
    // require touching the milestone detection logic.
    const GOAL_TOAST_COPY = {
      pt: {
        protein: [
          "Prote\u00edna completa. Boa base para recupera\u00e7\u00e3o e massa muscular.",
          "Meta de prote\u00edna batida. O prato fez o trabalho dele.",
          "Prote\u00edna do dia no alvo. Seus m\u00fasculos registraram presen\u00e7a.",
          "Boa! A prote\u00edna fechou a conta de hoje.",
          "Prote\u00edna garantida. Agora o resto do dia fica mais f\u00e1cil de ajustar."
        ],
        kcal: [
          "Meta cal\u00f3rica alcan\u00e7ada. Energia do dia registrada.",
          "Calorias no alvo. O plano de hoje ganhou forma.",
          "Meta de calorias batida. A matem\u00e1tica do prato colaborou.",
          "Energia completa por hoje. Bom ritmo.",
          "Calorias chegaram na meta. Miss\u00e3o energ\u00e9tica cumprida."
        ],
        water: [
          "Hidrata\u00e7\u00e3o em dia. Meta de \u00e1gua batida.",
          "\u00c1gua completa por hoje. A garrafa trabalhou bem.",
          "Boa hidrata\u00e7\u00e3o. Seu eu do futuro agradece.",
          "Meta de \u00e1gua alcan\u00e7ada. Simples, \u00fatil e feito.",
          "Hidrata\u00e7\u00e3o fechada. A rotina ganhou um ponto."
        ],
        carbs: [
          "Carboidratos no alvo. Energia dispon\u00edvel para o dia.",
          "Meta de carboidratos alcan\u00e7ada. Combust\u00edvel registrado.",
          "Carbos completos. O tanque n\u00e3o ficou no vazio.",
          "Boa! Os carboidratos chegaram na meta.",
          "Carboidratos em dia. Agora \u00e9 s\u00f3 usar essa energia com ju\u00edzo."
        ],
        fat: [
          "Gorduras no alvo. Meta do dia alcan\u00e7ada.",
          "Meta de gorduras batida. Equil\u00edbrio tamb\u00e9m conta ponto.",
          "Gorduras completas para hoje. Sem drama, s\u00f3 registro bem feito.",
          "Boa! A meta de gorduras chegou l\u00e1.",
          "Gorduras em dia. O painel ficou mais completo."
        ],
        fiber: [
          "Fibra em dia. Bom apoio para saciedade e digest\u00e3o.",
          "Meta de fibra alcan\u00e7ada. O intestino provavelmente aprovou.",
          "Boa ingest\u00e3o de fibra hoje. Esse detalhe faz diferen\u00e7a.",
          "Fibra completa. Pequena vit\u00f3ria bem subestimada.",
          "Meta de fibra batida. Ponto para a qualidade do dia."
        ],
        salt: [
          "Limite de sal atingido. Vale moderar daqui em diante.",
          "Sal chegou ao limite di\u00e1rio. Aten\u00e7\u00e3o no restante do dia.",
          "Aviso de sal: limite alcan\u00e7ado. O saleiro j\u00e1 fez participa\u00e7\u00e3o especial.",
          "Sal no limite. Melhor deixar o pr\u00f3ximo prato mais leve nisso.",
          "Aten\u00e7\u00e3o: a meta de sal j\u00e1 foi atingida."
        ]
      },
      en: {
        protein: [
          "Protein complete. Solid support for recovery and muscle.",
          "Protein goal hit. The plate did its job.",
          "Protein is on target today. Muscles have entered the chat.",
          "Nice. Today's protein goal is covered.",
          "Protein secured. The rest of the day gets easier to balance."
        ],
        kcal: [
          "Calorie target reached. Today's energy is logged.",
          "Calories are on target. The plan is taking shape.",
          "Calorie goal hit. The food math cooperated.",
          "Energy covered for today. Good rhythm.",
          "Calories reached the target. Energy mission complete."
        ],
        water: [
          "Hydration is on track. Water goal hit.",
          "Water complete for today. That bottle put in work.",
          "Good hydration. Future you says thanks.",
          "Water goal reached. Simple, useful, done.",
          "Hydration closed out. One point for the routine."
        ],
        carbs: [
          "Carbs are on target. Energy is available for the day.",
          "Carb goal reached. Fuel logged.",
          "Carbs complete. The tank is not empty.",
          "Nice. Carbs reached the target.",
          "Carbs are in place. Use that energy wisely."
        ],
        fat: [
          "Fats are on target. Daily goal reached.",
          "Fat goal hit. Balance counts too.",
          "Fats complete for today. No drama, just clean tracking.",
          "Nice. Fat target reached.",
          "Fats are in place. The dashboard is more complete."
        ],
        fiber: [
          "Fiber is in. Good support for fullness and digestion.",
          "Fiber goal reached. Your gut may approve.",
          "Good fiber intake today. This detail matters.",
          "Fiber complete. An underrated little win.",
          "Fiber goal hit. Point for food quality today."
        ],
        salt: [
          "Sodium limit reached. Worth moderating from here.",
          "Sodium reached today's limit. Keep an eye on the rest of the day.",
          "Sodium notice: limit reached. The salt had its cameo.",
          "Sodium is at the limit. A lighter next meal may help.",
          "Heads up: sodium target has been reached."
        ]
      }
    };

    function webExportFile(content, filename, mime) {
      try {
        const url = "data:" + mime + ";charset=utf-8," + encodeURIComponent(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (_) {
        const blob = new Blob([content], {
          type: mime
        });
        const url2 = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url2;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url2), 1000);
      }
    }
    const exportFile = typeof injectedExportFile === "function"
      ? injectedExportFile
      : async ({content, filename, mimeType}) => webExportFile(content, filename, mimeType);
    function dateLabel(date, lang) {
      const s = STRINGS[lang || 'pt'];
      if (date === TODAY) return `${s.today} ${formatDateDMY(date)}`;
      const d = new Date(date + "T12:00:00");
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return `${s.yesterday} ${formatDateDMY(date)}`;
      return formatDateDMY(date);
    }

    function NutritionTracker({
      onOpenSettings,
      onLogout,
      onStartTutorial,
      onOpenPrivacy,
      onOpenBackup,
      externalLang,
      externalDarkMode,
      onLanguageChange,
      onDarkModeChange
    }) {
      const [lang, setLang] = useState(() => normalizeLanguage(externalLang || localStorage.getItem('appLang') || 'pt'));
      const [menuOpen, setMenuOpen] = useState(false);
      const [headerLanguageMenuOpen, setHeaderLanguageMenuOpen] = useState(false);
      const text = createTextGetter(lang, STRINGS);
      const {
        MACRO_FIELDS_BASE,
        MICRO_FIELDS_BASE,
        ALL_FIELDS_KEYS,
        emptyFood,
        buildFoodSnapshot,
        buildEntryFromSnapshot,
        buildEntry,
        recalcEntryQuantity,
        templateItemEntry,
        templateEntries,
        templateTotals
      } = window.FoodEntry.createFoodEntry({
        divisor,
        createEntryId: () => Date.now().toString() + Math.random(),
        getEntryTime: () => new Date().toTimeString().slice(0,5),
        getPantry: () => pantry,
        buildDayTotals
      });
      const {
        SavedMealCard
      } = window.SavedMealCardModule.createSavedMealCard({
        React,
        pickLang,
        templateEntries,
        templateTotals,
        templateItemEntry
      });
      const {
        getAutomaticMealSuggestionLimits: calculateAutomaticMealSuggestionLimits,
        runGA: runMealGA,
        addGAResultToDiary: applyGAResultToDiary
      } = window.MealGA.createMealGA({
        mealScore: window.MealScore,
        buildEntry,
        updateActiveLog: updater => setActiveLog(updater),
        random: Math.random,
        setTimeout: window.setTimeout.bind(window)
      });

      // Temporary bridge for inline strings that are not yet in STRINGS.
      // Input: pt/en/es variants. Output: the variant for the active app language.
      const uiText = (pt, en, es) => pickLang(lang, pt, en, es);
      const {
        requestMealReviewExplanation
      } = window.MealReviewAI.createMealReviewAI({
        callAI,
        pickLang,
        getEvaluationCount: mealScoreEvaluationCount
      });
      const {
        requestFoodAutofill,
        applyFoodAutofillResult
      } = window.FoodAutofillAI.createFoodAutofillAI({
        callAI,
        normalizeLanguage,
        pickLang,
        getAiLanguageInstruction: aiLang
      });
      const {
        requestDishEstimate,
        buildDescribedEntry: buildDishDescriptionEntry
      } = window.DishDescriptionAI.createDishDescriptionAI({
        callAI,
        normalizeLanguage,
        getAiLanguageInstruction: aiLang,
        createEntryId: () => Date.now().toString() + Math.random()
      });
      const {
        generateNutritionFeedback
      } = window.NutritionFeedbackAI.createNutritionFeedbackAI({
        callAI,
        normalizeLanguage,
        pickLang,
        activityLevels: ACTIVITY_LEVELS,
        calculateAge
      });
      const {
        generateEatingPatterns
      } = window.EatingPatternsAI.createEatingPatternsAI({
        callAI,
        pickLang,
        computeGoals,
        getWeightForDate
      });
      function toggleLang(nextLang) {
        const fallback = lang === 'pt' ? 'en' : lang === 'en' ? 'es' : 'pt';
        const nl = normalizeLanguage(nextLang || fallback);
        localStorage.setItem('appLang', nl);
        setLang(nl);
        if (typeof onLanguageChange === 'function') {
          onLanguageChange(nl);
        } else {
          Promise.resolve(storage.set('language', nl))
            .catch(() => {});
        }
      }
      // Sync external lang changes
      useEffect(() => {
        if (!externalLang) return;
        const normalizedExternalLang = normalizeLanguage(externalLang);
        setLang(currentLang => {
          if (currentLang !== normalizedExternalLang) {
            localStorage.setItem('appLang', normalizedExternalLang);
            return normalizedExternalLang;
          }
          return currentLang;
        });
      }, [externalLang]);
      useEffect(() => {
        storage.set('lastActivityAt', new Date().toISOString()).catch(() => {});
      }, []);
      // MEALS always uses fixed PT names as storage keys (data compatibility)
      const MEALS = MEAL_KEYS;
      const localizedMealLabels = getMealLabelsForLanguage(lang);
      const mealLabel = m => {
        const i = MEAL_KEYS.indexOf(m);
        return i >= 0 ? localizedMealLabels[i] || m : m;
      };
      // Normalize log keys: map EN/any lang meal names back to PT storage keys
      function normalizeMealKeys(rawLog) {
        if (!rawLog) return {};
        const enMeals = Array.isArray(STRINGS.en && STRINGS.en.meals) ? STRINGS.en.meals : [];
        const esMeals = Array.isArray(STRINGS.es && STRINGS.es.meals) ? STRINGS.es.meals : [];
        const ptMeals = MEAL_KEYS;
        const normalized = {};
        for (const [key, entries] of Object.entries(rawLog)) {
          const enIdx = enMeals.indexOf(key);
          const esIdx = esMeals.indexOf(key);
          const translatedIdx = enIdx >= 0 ? enIdx : esIdx;
          const ptKey = translatedIdx >= 0 ? ptMeals[translatedIdx] : key;
          normalized[ptKey] = (normalized[ptKey] || []).concat(entries || []);
        }
        return normalized;
      }
      const {
        loadHistoricalDate,
        loadWeekRows,
        loadMealAnalysisData,
        loadCalendarMonthData
      } = window.HistoryLoaders.createHistoryLoaders({
        storage,
        normalizeMealKeys,
        aggregateWeekRows,
        aggregateMealAverages,
        monthDays,
        calendarMarkerFor,
        resolveHistoricalGoals,
        createDate: () => new Date(),
        warn: (...args) => console.warn(...args)
      });
      // Maps storage key -> display name
      const mealDisplay = key => {
        const i = MEAL_KEYS.indexOf(key);
        return i >= 0 ? localizedMealLabels[i] || key : key;
      };
      const MACRO_FIELDS = MACRO_FIELDS_BASE.map(f => ({
        ...f,
        label: text(f.labelKey)
      }));
      // Pre-computed ordered list: each parent immediately followed by its sub-fields
      const MACRO_FIELDS_ORDERED = (function() {
        const result = [];
        MACRO_FIELDS.filter(f => !f.sub).forEach(f => {
          result.push(f);
          MACRO_FIELDS.filter(s => s.sub && s.group === f.labelKey).forEach(s => result.push(s));
        });
        return result;
      })();
      const MICRO_FIELDS = MICRO_FIELDS_BASE.map(f => ({
        ...f,
        label: text(f.labelKey)
      }));
      const ALL_FIELDS = [...MACRO_FIELDS, ...MICRO_FIELDS]; // labeled version for render
      const [darkMode, setDarkMode] = useState(() => externalDarkMode !== undefined ? externalDarkMode : false);
      // Sync external darkMode changes
      useEffect(() => {
        if (externalDarkMode !== undefined) setDarkMode(externalDarkMode);
      }, [externalDarkMode]);
      useEffect(() => {
        document.documentElement.dataset.theme = darkMode ? "dark" : "light";
      }, [darkMode]);
      const [pantry, setPantry] = useState([]);
      const [log, setLog] = useState({});
      const [tab, setTab] = useState("diario");
      function openTab(nextTab, opts = {}) {
        const normalizedTab = normalizeTabKey(nextTab);
        setTab(normalizedTab);
        if (opts.skipTutorial || window.__tutorialNavigating) return;
        storage.get(tutorialSeenKey(normalizedTab)).then(r => {
          if (!hasSeenTutorial(r)) {
            setTimeout(() => onStartTutorial && onStartTutorial(normalizedTab), 120);
          }
        }).catch(() => {});
      }
      function reopenTabTutorial() {
        onStartTutorial && onStartTutorial(tab);
      }
      useEffect(() => {
        if (tab === "adicionar" && pantry.length === 0 && !describeMode) {
          setDescribeMode(true);
          setBatchMode(false);
        }
      }, [tab, pantry.length]);
      function selectAddMode(mode) {
        if (mode === "saved") {
          setDescribeMode(false);
          setBatchMode(true);
          setAddTemplatesOpen(true);
          return;
        }
        if (mode !== "describe" && pantry.length === 0) {
          notify(uiText(
            "Cadastre alimentos na despensa primeiro, ou use Descrever prato.",
            "Add foods to the pantry first, or use Describe dish.",
            "Primero registra alimentos en la despensa o usa Describir plato."
          ));
          setDescribeMode(true);
          setBatchMode(false);
          return;
        }
        if (mode === "describe") {
          setAddTemplatesOpen(false);
          setDescribeMode(true);
          setBatchMode(false);
        } else {
          setAddTemplatesOpen(false);
          setDescribeMode(false);
          setBatchMode(true);
        }
      }
      const [trainingByDate, setTrainingByDate] = useState({});
      const [form, setForm] = useState(emptyFood());
      const [showMicroForm, setShowMicroForm] = useState(false);
      const [notesOpen,    setNotesOpen]    = useState(false);
      const [backupOpen,   setBackupOpen]   = useState(false);
      const [editingId, setEditingId] = useState(null);
      const [editForm, setEditForm] = useState(null);
      const [addEntry, setAddEntry] = useState({
        foodId: "",
        qty: "",
        meal: "Café da manhã"
      });
      const [batchMode, setBatchMode] = useState(true);
      const [staged, setStaged] = useState({
        meal: "Café da manhã",
        items: []
      });
      const [mealReview, setMealReview] = useState(null);
      const [mealReviewHelpOpen, setMealReviewHelpOpen] = useState(false);
      const [mealReviewAiText, setMealReviewAiText] = useState("");
      const [mealReviewAiLoading, setMealReviewAiLoading] = useState(false);
      const [mealTemplates, setMealTemplates] = useState([]);
      const [templateName, setTemplateName] = useState("");
      const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
      const [describeMode, setDescribeMode] = useState(false);
      const [editingTemplateId, setEditingTemplateId] = useState(null);
      const [templateEditDraft, setTemplateEditDraft] = useState(null);
      const [mealDescription, setMealDescription] = useState("");
      const [describeMeal, setDescribeMeal] = useState("Almoço");
      const [describeResult, setDescribeResult] = useState(null);
      const [describeLoading, setDescribeLoading] = useState(false);
      const [feedbackLoading, setFeedbackLoading] = useState(false);
      const [feedbackText, setFeedbackText] = useState("");
      const [feedbackPeriod, setFeedbackPeriod] = useState(null);
      const [feedbackSaved, setFeedbackSaved] = useState(false);
      const [showExportPanel, setShowExportPanel] = useState(null);
      const [exportResult, setExportResult] = useState(null);
      const [backupJson, setBackupJson] = useState(null);
      const [backupLoading, setBackupLoading] = useState(false);
      const [backupImportPreview, setBackupImportPreview] = useState(null);
      const [patternsLoading, setPatternsLoading] = useState(false);
      const [patternsText, setPatternsText] = useState("");
      const [patternsSaved, setPatternsSaved] = useState(false);
      const [suggestLoading, setSuggestLoading] = useState(false);
      const [suggestions, setSuggestions] = useState(null);
      const [showGA, setShowGA]           = useState(false);
      const [gaUseAll, setGAUseAll]       = useState(true);
      const [gaSelIds, setGASelIds]       = useState({});
      const [gaFoodSearch, setGAFoodSearch] = useState("");
      const [gaAdvancedOpen, setGAAdvancedOpen] = useState(false);
      const [gaLimits, setGALimits]       = useState({});
      const [gaGlobalMax, setGAGlobalMax] = useState(5);
      const [gaTolerance, setGATolerance] = useState(15);
      const [gaRunning, setGARunning]     = useState(false);
      const [gaProgress, setGAProgress]   = useState(0);
      const [gaResults, setGAResults]     = useState([]);
      const [gaHasSearched, setGAHasSearched] = useState(false);
      const [gaTargetMeal, setGATargetMeal] = useState(''); // {content, filename, copied}
      const [gaUseProtTol, setGAUseProtTol] = useState(false);
      const [gaProtTolerance, setGAProtTolerance] = useState(20);
      const [gaKcalMin, setGAKcalMin]       = useState("");
      const [gaKcalMax, setGAKcalMax]       = useState("");
      const [gaProtMin, setGAProtMin]       = useState("");
      const [gaProtMax, setGAProtMax]       = useState("");
      const [loaded, setLoaded] = useState(false);
      const [isMobileView, setIsMobileView] = useState(() => typeof window !== "undefined" && window.innerWidth <= 520);
      const [userName, setUserName] = useState("");
      const [syncing, setSyncing] = useState(false);
      const [autoFillLoading, setAutoFillLoading] = useState(false);
      const [foodDbLoading, setFoodDbLoading] = useState(false);
      const [foodDbResults, setFoodDbResults] = useState([]);
      const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
      const [barcodeInput, setBarcodeInput] = useState("");
      const [barcodeLoading, setBarcodeLoading] = useState(false);
      const [barcodeScanning, setBarcodeScanning] = useState(false);
      const [barcodeTorchAvailable, setBarcodeTorchAvailable] = useState(false);
      const [barcodeTorchEnabled, setBarcodeTorchEnabled] = useState(false);
      const [barcodeMessage, setBarcodeMessage] = useState("");
      const [reportModalOpen, setReportModalOpen] = useState(false);
      const [reportType, setReportType] = useState("week");
      const [reportFormat, setReportFormat] = useState("html");
      const [reportLoading, setReportLoading] = useState(false);
      const [reportMessage, setReportMessage] = useState("");
      const videoRef = useRef(null);
      const barcodeStreamRef = useRef(null);
      const barcodeReaderRef = useRef(null);
      const barcodeControlsRef = useRef(null);
      const barcodeScanRef = useRef(false);
      const {
        stopBarcodeScanner,
        startBarcodeScanner,
        toggleBarcodeTorch = async () => {}
      } = window.BarcodeScanner.createBarcodeScanner({
        windowObject: window,
        navigatorObject: navigator,
        documentObject: document,
        setTimeoutFn: (callback, delay) => setTimeout(callback, delay),
        requestAnimationFrameFn: callback => requestAnimationFrame(callback),
        refs: {
          videoRef,
          streamRef: barcodeStreamRef,
          readerRef: barcodeReaderRef,
          controlsRef: barcodeControlsRef,
          scanRef: barcodeScanRef
        },
        setScanning: setBarcodeScanning,
        setMessage: setBarcodeMessage,
        setInput: setBarcodeInput,
        setTorchAvailable: setBarcodeTorchAvailable,
        setTorchEnabled: setBarcodeTorchEnabled,
        lookupBarcode: code => fetchBarcodeProduct(code),
        messages: {
          loadingCompatible: pickLang(lang, "Carregando leitor compatível...", "Loading compatible barcode scanner...", "Cargando lector compatible..."),
          pointCamera: pickLang(lang, "Aponte a câmera para o código de barras.", "Point the camera at the barcode.", "Apunta la cámara al código de barras."),
          fallbackFailed: pickLang(lang, "O leitor compatível pela câmera falhou. Digite o código manualmente abaixo.", "Compatible camera scanner failed. Type the barcode manually below.", "El lector compatible por cámara falló. Introduce el código manualmente abajo."),
          cameraUnavailable: pickLang(lang, "O acesso à câmera não está disponível. Use a digitação manual abaixo.", "Camera access is not available. Use manual entry below.", "El acceso a la cámara no está disponible. Usa la entrada manual abajo."),
          startFailed: pickLang(lang, "A permissão da câmera foi negada, não está disponível ou não é compatível. Use a digitação manual abaixo.", "Camera permission was denied, unavailable, or unsupported. Use manual entry below.", "El permiso de cámara fue denegado, no está disponible o no es compatible. Usa la entrada manual abajo.")
        }
      });
      const [notification, setNotification] = useState("");
      const [goalToast, setGoalToast] = useState(null);
      const goalToastQueueRef = useRef([]);
      const goalToastTimerRef = useRef(null);
      const goalToastActiveRef = useRef(false);
      const [expandMicros, setExpandMicros] = useState(false);
      const [detailFood, setDetailFood] = useState(null);
      const [entryMenuId, setEntryMenuId] = useState(null);
      const [weightHistory, setWeightHistory] = useState([]);
      const [profileData, setProfileData] = useState({ birthDate: "", gender: "", height: "" });
      const [goalHistory, setGoalHistory] = useState({});
      const hydratedStorageKeysRef = useRef(new Set());
      const [metricsProgressOpen, setMetricsProgressOpen] = useState(false);
      const [metricsProgressInfoOpen, setMetricsProgressInfoOpen] = useState(false);
      const [bodyCompositionOpen, setBodyCompositionOpen] = useState(false);
      const [tickerIndex, setTickerIndex] = useState(0);
      const [tickerPhase, setTickerPhase] = useState("idle");
      const [tickerDirection, setTickerDirection] = useState(1);
      const [tickerDragOffset, setTickerDragOffset] = useState(0);
      const [tickerTimerReset, setTickerTimerReset] = useState(0);
      const tickerPointerRef = useRef({active: false, pointerId: null, startX: 0});
      const tickerAutoTimerRef = useRef(null);
      const tickerSwapTimerRef = useRef(null);
      const tickerEnterTimerRef = useRef(null);
      const [metricsSection, setMetricsSection] = useState("tracking");
      const [nutritionPrefs, setNutritionPrefs] = useState({
        activityLevel: "",
        goalType: "",
        goalKg: "",
        goalWeeks: "",
        manualAdjustment: "",
        proteinMultiplier: "",
        bodyFatGoal: ""
      });
      const [weightForm, setWeightForm] = useState({
        weight: "",
        height: "",
        bodyFatPct: "",
        waistCm: "",
        muscleMassKg: "",
        date: TODAY
      });
      const [editingWeightId, setEditingWeightId] = useState(null);
      const [editWeightForm, setEditWeightForm] = useState({
        weight: "",
        height: "",
        bodyFatPct: "",
        waistCm: "",
        muscleMassKg: "",
        date: ""
      });
      const [bodyGoalForm, setBodyGoalForm] = useState({
        currentFatPct: "",
        targetFatPct: "",
        weeks: ""
      });
      const [viewDate, setViewDate] = useState(TODAY);
      const [historyLog, setHistoryLog] = useState({});
      const [todayNote, setTodayNote] = useState("");
      const [historyNote, setHistoryNote] = useState("");
      const [weekData, setWeekData] = useState([]);
      const [mealAverages, setMealAverages] = useState({});
      const [recentMeals, setRecentMeals] = useState([]);
      const [showRecentMeals, setShowRecentMeals] = useState(false);
      const [editStagedIdx, setEditStagedIdx] = useState(null);
      const [editStagedQty, setEditStagedQty] = useState("");
      // Water
      const [waterIntake, setWaterIntake] = useState([]);
      const [waterInput, setWaterInput] = useState("");
      const [waterGoal, setWaterGoal] = useState(2500);
      const [waterGoalInput, setWaterGoalInput] = useState("");
      const [editWaterGoal, setEditWaterGoal] = useState(false);
      const [waterCustomPreset, setWaterCustomPreset] = useState(null);
      // Supplements
      const [suppPantry, setSuppPantry] = useState([]);
      const [suppLog, setSuppLog] = useState([]);
      const [suppForm, setSuppForm] = useState({
        name: "",
        dose: "",
        unit: "un",
        notes: ""
      });
      const [showSuppForm, setShowSuppForm] = useState(false);
      const [showSuppAdd, setShowSuppAdd] = useState(false);
      const [suppAddId, setSuppAddId] = useState("");
      const [suppAddDose, setSuppAddDose] = useState("");
      // Custom goals
      const [customGoals, setCustomGoals] = useState({});
      const [editingGoals, setEditingGoals] = useState(false);
      const [goalDraft, setGoalDraft] = useState({});
      const [pantrySearch, setPantrySearch] = useState("");
      const [pantryItemsOpen, setPantryItemsOpen] = useState(false);
      const [mealTemplatesOpen, setMealTemplatesOpen] = useState(false);
      const [newFoodOpen, setNewFoodOpen] = useState(false);
      const [addTemplatesOpen, setAddTemplatesOpen] = useState(false);
      const [addTemplateSearch, setAddTemplateSearch] = useState("");
      const [expandedTemplateIds, setExpandedTemplateIds] = useState({});
      const [expandedPantryIds, setExpandedPantryIds] = useState({});
      const [expandedWeightHistoryIds, setExpandedWeightHistoryIds] = useState({});
      const [calendarOpen, setCalendarOpen] = useState(false);
      const [calendarMonth, setCalendarMonth] = useState(TODAY.slice(0, 7));
      const [calendarData, setCalendarData] = useState({});
      const [calendarLoading, setCalendarLoading] = useState(false);
      const [suppPantryOpen, setSuppPantryOpen] = useState(false);
      const [editEntryId, setEditEntryId] = useState(null);
      const [editEntryQty, setEditEntryQty] = useState("");
      const saveTimeout = useRef({});
      const { scheduleSave } = window.AutosaveScheduler.createAutosaveScheduler({
        storage,
        setTimer: (callback, delay) => setTimeout(callback, delay),
        clearTimer: handle => clearTimeout(handle),
        timersByKey: saveTimeout.current,
        onPersisted: key => hydratedStorageKeysRef.current.add(key)
      });
      useEffect(() => {
        if (tab === "despensa") {
          setPantryItemsOpen(false);
          setMealTemplatesOpen(false);
          setSuppPantryOpen(false);
          setNewFoodOpen(false);
        }
        if (tab === "adicionar") {
          setAddTemplatesOpen(false);
          setAddTemplateSearch("");
        }
      }, [tab]);
      async function loadAll() {
        setSyncing(true);
        // Timeout fallback: if Firebase hangs for 12s, show app anyway
        const _loadTimeout = setTimeout(() => {
          setSyncing(false);
          setLoaded(true);
        }, 12000);
        try {
          const loadKeys = [
            "pantry_v2",
            "log_v2_" + TODAY,
            "trainingByDate",
            "weightHistory",
            "mealTemplates",
            "notes_" + TODAY,
            "waterGoal",
            "waterCustomPreset",
            "waterIntake_" + TODAY,
            "suppPantry",
            "suppLog_" + TODAY,
            "customGoals",
            "goalHistory",
            "birthDate",
            "gender",
            "height",
            "activityLevel",
            "goalType",
            "goalKg",
            "goalWeeks",
            "manualCalorieAdjustment",
            "proteinMultiplier",
            "bodyFatGoal",
            "userName"
          ];
          const loadedValues = await Promise.all(loadKeys.map(key => storage.get(key).catch(() => null)));
          loadedValues.forEach((value, index) => {
            if (value) hydratedStorageKeysRef.current.add(loadKeys[index]);
          });
          const [p, l, t, w, mt, n, wg, wcp, wi, sp, sl, cg, gh, bd, gd, ht, al, gt, gkg, gw, ma, pm, bfg, un] = loadedValues;
          if (p) setPantry(JSON.parse(p.value));
          if (l) setLog(normalizeMealKeys(JSON.parse(l.value)));
          if (t) setTrainingByDate(JSON.parse(t.value));
          if (w) setWeightHistory(JSON.parse(w.value));
          if (mt) setMealTemplates(JSON.parse(mt.value));
          if (n) setTodayNote(n.value || "");
          if (wg) setWaterGoal(JSON.parse(wg.value));
          if (wcp) setWaterCustomPreset(JSON.parse(wcp.value));
          if (wi) setWaterIntake(JSON.parse(wi.value));
          if (sp) setSuppPantry(JSON.parse(sp.value));
          if (sl) setSuppLog(JSON.parse(sl.value));
          if (cg) setCustomGoals(JSON.parse(cg.value));
          if (gh) setGoalHistory(JSON.parse(gh.value));
          if (un && un.value) setUserName(String(un.value).trim());
          setProfileData({
            birthDate: bd && bd.value ? bd.value : "",
            gender: gd && gd.value ? gd.value : "",
            height: ht && ht.value ? ht.value : ""
          });
          setNutritionPrefs({
            activityLevel: al && al.value ? al.value : "",
            goalType: gt && gt.value ? gt.value : "",
            goalKg: gkg && gkg.value ? gkg.value : "",
            goalWeeks: gw && gw.value ? gw.value : "",
            manualAdjustment: ma && ma.value ? ma.value : "",
            proteinMultiplier: pm && pm.value ? pm.value : "",
            bodyFatGoal: bfg && bfg.value ? bfg.value : ""
          });
        } catch (_) {}
        clearTimeout(_loadTimeout);
        setSyncing(false);
        setLoaded(true);
      }
      window._reloadNutritionData = loadAll;
      useEffect(() => {
        loadAll();
      }, []);
      // Hydrates the body-fat goal editor from persisted nutrition preferences.
      // The form stays editable after hydration; user input is only committed when
      // the explicit save action syncs body composition with the nutrition goal.
      useEffect(() => {
        setBodyGoalForm(f => ({
          ...f,
          targetFatPct: f.targetFatPct || nutritionPrefs.bodyFatGoal || "",
          weeks: f.weeks || nutritionPrefs.goalWeeks || ""
        }));
      }, [nutritionPrefs.bodyFatGoal, nutritionPrefs.goalWeeks]);
      useEffect(() => {
        if (typeof window === "undefined") return;
        const updateMobileView = () => setIsMobileView(window.innerWidth < 1024);
        updateMobileView();
        window.addEventListener("resize", updateMobileView);
        return () => window.removeEventListener("resize", updateMobileView);
      }, []);
      useEffect(() => {
        return () => stopBarcodeScanner();
      }, []);
      useEffect(() => {
        return () => {
          if (goalToastTimerRef.current) clearTimeout(goalToastTimerRef.current);
        };
      }, []);
      useEffect(() => {
        if (loaded && canPersistHydratedKey("pantry_v2", pantry, hydratedStorageKeysRef.current)) scheduleSave("pantry_v2", pantry);
      }, [pantry, loaded]);
      useEffect(() => {
        if (loaded) scheduleSave("log_v2_" + TODAY, log);
      }, [log, loaded]);
      useEffect(() => {
        if (loaded && canPersistHydratedKey("trainingByDate", trainingByDate, hydratedStorageKeysRef.current)) scheduleSave("trainingByDate", trainingByDate);
      }, [trainingByDate, loaded]);
      useEffect(() => {
        if (loaded && canPersistHydratedKey("weightHistory", weightHistory, hydratedStorageKeysRef.current)) scheduleSave("weightHistory", weightHistory);
      }, [weightHistory, loaded]);
      // Update function refs on every render (data refs set later, after activeLog is declared)
      window._exportFullBackup = exportFullBackup;
      window._importFullBackup = importFullBackup;
      window._exportAndDownload = exportAndDownload;
      useEffect(() => {
        if (loaded && canPersistHydratedKey("mealTemplates", mealTemplates, hydratedStorageKeysRef.current)) scheduleSave("mealTemplates", mealTemplates);
      }, [mealTemplates, loaded]);
      useEffect(() => {
        if (loaded) scheduleSave("notes_" + TODAY, todayNote, 1500);
      }, [todayNote, loaded]);
      useEffect(() => {
        if (loaded && viewDate !== TODAY) scheduleSave("notes_" + viewDate, historyNote, 1500);
      }, [historyNote, loaded]);
      useEffect(() => {
        if (loaded && canPersistHydratedKey("waterGoal", waterGoal, hydratedStorageKeysRef.current)) scheduleSave("waterGoal", waterGoal);
      }, [waterGoal, loaded]);
      useEffect(() => {
        if (loaded && waterCustomPreset) scheduleSave("waterCustomPreset", waterCustomPreset);
      }, [waterCustomPreset, loaded]);
      useEffect(() => {
        if (loaded) scheduleSave("waterIntake_" + TODAY, waterIntake);
      }, [waterIntake, loaded]);
      useEffect(() => {
        if (loaded && canPersistHydratedKey("suppPantry", suppPantry, hydratedStorageKeysRef.current)) scheduleSave("suppPantry", suppPantry);
      }, [suppPantry, loaded]);
      useEffect(() => {
        if (loaded) scheduleSave("suppLog_" + TODAY, suppLog);
      }, [suppLog, loaded]);
      useEffect(() => {
        if (loaded && canPersistHydratedKey("customGoals", customGoals, hydratedStorageKeysRef.current)) scheduleSave("customGoals", customGoals);
      }, [customGoals, loaded]);
      useEffect(() => {
        if (loaded && canPersistHydratedKey("goalHistory", goalHistory, hydratedStorageKeysRef.current)) scheduleSave("goalHistory", goalHistory);
      }, [goalHistory, loaded]);
      async function changeViewDate(date) {
        setViewDate(date);
        if (date) setCalendarMonth(date.slice(0, 7));
        setEditEntryId(null);
        setDetailFood(null);
        if (date !== TODAY) {
          const result = await loadHistoricalDate({ date, today: TODAY });
          setHistoryLog(result.historyLog);
          setHistoryNote(result.historyNote);
        }
      }
      // Calculates the goal snapshot for one date and one explicit day type.
      // This is used both for read-only historical views and for intentional
      // retroactive edits, such as changing a past day from training to rest.
      function computeDayGoalSnapshot(date, dayIsTraining) {
        return resolveHistoricalGoals({
          date,
          today: TODAY,
          dayIsTraining,
          weightHistory,
          currentWeight,
          currentHeight,
          profileData,
          nutritionPrefs,
          customGoals,
          frozenGoal: null
        }).computedGoal;
      }
      function dayGoalForDate(date) {
        const dayIsTraining = trainingByDate[date] ?? true;
        return resolveHistoricalGoals({
          date,
          today: TODAY,
          dayIsTraining,
          weightHistory,
          currentWeight,
          currentHeight,
          profileData,
          nutritionPrefs,
          customGoals,
          frozenGoal: goalHistory[date]
        }).effectiveGoal;
      }
      useEffect(() => {
        // Scroll to top when changing tabs
        window.scrollTo({ top: 0, behavior: 'instant' });
      }, [tab]);
      useEffect(() => {
        if (tab === "semana" && loaded) {
          loadWeekData();
          loadMealAnalysis();
        }
        if (tab === "metricas" && loaded) {
          loadWeekData();
        }
        if (tab === "adicionar" && loaded) loadRecentMeals();
      }, [tab, loaded, log, trainingByDate, goalHistory, weightHistory, customGoals, nutritionPrefs]);
      async function loadWeekData() {
        const days = await loadWeekRows({
          today: TODAY,
          todayLog: log,
          trainingByDate,
          goalContext: {
            weightHistory,
            currentWeight,
            currentHeight,
            profileData,
            nutritionPrefs,
            customGoals,
            goalHistory
          }
        });
        setWeekData(days);
      }
      async function loadMealAnalysis() {
        const avgs = await loadMealAnalysisData({ mealKeys: MEALS });
        setMealAverages(avgs);
      }
      async function loadRecentMeals() {
        const dailyLogs = [];
        for (let i = 0; i <= 14; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const date = d.toISOString().split("T")[0];
          const dayLog = date === TODAY ? log : (() => {
            return null;
          })();
          let parsed = dayLog;
          if (!parsed) {
            const l = await storage.get("log_v2_" + date).catch(() => null);
            if (!l) continue;
            parsed = JSON.parse(l.value);
          }
          dailyLogs.push({date, log: parsed});
        }
        setRecentMeals(aggregateRecentMeals({dailyLogs, mealKeys: MEALS}));
      }
      function notify(msg, duration = 3000) {
        setNotification(msg);
        setTimeout(() => setNotification(""), duration);
      }

      const BACKUP_IMPORTABLE_PROFILE_KEYS = new Set([
        "height",
        "activityLevel",
        "goalType",
        "goalKg",
        "goalWeeks",
        "manualCalorieAdjustment",
        "proteinMultiplier",
        "bodyFatGoal"
      ]);

      const BACKUP_CATEGORY_META = {
        profile: {
          pt: "Perfil nutricional",
          en: "Nutrition profile",
          ptDesc: "Altura, atividade, objetivo, prazo e multiplicador de proteina.",
          enDesc: "Height, activity, goal, deadline, and protein multiplier."
        },
        nutritionGoals: {
          pt: "Configuracoes nutricionais",
          en: "Nutrition settings",
          ptDesc: "Metas personalizadas, historico de metas e configuracoes de agua.",
          enDesc: "Custom goals, goal history, and water settings."
        },
        pantry: {
          pt: "Despensa",
          en: "Pantry",
          ptDesc: "Alimentos salvos para montar refeicoes.",
          enDesc: "Saved foods used to build meals."
        },
        mealTemplates: {
          pt: "Refeicoes salvas",
          en: "Saved meals",
          ptDesc: "Modelos de refeicao guardados pelo usuario.",
          enDesc: "Meal templates saved by the user."
        },
        supplements: {
          pt: "Suplementos",
          en: "Supplements",
          ptDesc: "Itens da despensa de suplementos.",
          enDesc: "Items in the supplement pantry."
        },
        diary: {
          pt: "Registros diarios",
          en: "Diary records",
          ptDesc: "Refeicoes e alimentos registrados por data.",
          enDesc: "Meals and foods logged by date."
        },
        dayTypes: {
          pt: "Tipo de dia",
          en: "Day type",
          ptDesc: "Treino ou descanso por data.",
          enDesc: "Training or rest day by date."
        },
        water: {
          pt: "Agua",
          en: "Water",
          ptDesc: "Registros diarios de agua.",
          enDesc: "Daily water records."
        },
        notes: {
          pt: "Notas",
          en: "Notes",
          ptDesc: "Notas registradas em dias especificos.",
          enDesc: "Notes saved for specific days."
        },
        supplementLog: {
          pt: "Uso de suplementos",
          en: "Supplement log",
          ptDesc: "Suplementos registrados por data.",
          enDesc: "Supplements logged by date."
        },
        bodyMetrics: {
          pt: "Metricas corporais",
          en: "Body metrics",
          ptDesc: "Peso, gordura corporal, cintura e massa muscular.",
          enDesc: "Weight, body fat, waist, and muscle mass."
        }
      };

      const BACKUP_CATEGORY_ORDER = Object.keys(BACKUP_CATEGORY_META);

      /**
       * Maps storage keys to account-data categories that can safely be moved
       * between accounts. UI state, auth identity, tutorials, and migration flags
       * are intentionally ignored so backups restore only useful user content.
       */
      function getBackupCategory(key) {
        if (!key || key.startsWith("_") || key.indexOf("tutorialSeen") === 0) return null;
        if (["uid", "userName", "birthDate", "gender", "language", "tutorialSeen", "tutorial_most_recent_version_seen", "lastLoginAt", "lastActivityAt"].includes(key)) return null;
        if (BACKUP_IMPORTABLE_PROFILE_KEYS.has(key)) return "profile";
        if (key === "customGoals" || key === "goalHistory" || key === "waterGoal" || key === "waterCustomPreset") return "nutritionGoals";
        if (key === "pantry_v2" || key === "pantry") return "pantry";
        if (key === "mealTemplates") return "mealTemplates";
        if (key === "suppPantry") return "supplements";
        if (key === "trainingByDate") return "dayTypes";
        if (key === "weightHistory") return "bodyMetrics";
        if (/^log_v2_\d{4}-\d{2}-\d{2}$/.test(key)) return "diary";
        if (/^notes_\d{4}-\d{2}-\d{2}$/.test(key)) return "notes";
        if (/^waterIntake_\d{4}-\d{2}-\d{2}$/.test(key)) return "water";
        if (/^suppLog_\d{4}-\d{2}-\d{2}$/.test(key)) return "supplementLog";
        return null;
      }

      function canonicalBackupKey(key) {
        return key === "pantry" ? "pantry_v2" : key;
      }

      function normalizeBackupPayload(parsed) {
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
        if (parsed.root || parsed.data || parsed.legacy) {
          return {
            ...(parsed.legacy || {}),
            ...(parsed.root || {}),
            ...(parsed.data || {})
          };
        }
        return {...parsed};
      }

      /**
       * Plays a tiny local cue for goal milestones.
       * It uses Web Audio instead of an asset file, and silently no-ops when the
       * browser blocks audio because the page has not received user interaction.
       */
      function playGoalToastCue(tone = "success") {
        if (typeof window === "undefined") return;
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return;
          const ctx = new AudioContext();
          const gain = ctx.createGain();
          const osc = ctx.createOscillator();
          const now = ctx.currentTime;
          osc.type = "sine";
          osc.frequency.setValueAtTime(tone === "warning" ? 520 : 660, now);
          osc.frequency.exponentialRampToValueAtTime(tone === "warning" ? 390 : 880, now + 0.12);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.18);
          setTimeout(() => ctx.close && ctx.close(), 260);
        } catch (_) {}
      }

      /**
       * Gives mobile users a short tactile cue when a goal toast is shown.
       * Desktop browsers and unsupported mobile browsers simply ignore it.
       */
      function vibrateGoalToast(tone = "success") {
        if (!isMobileView || typeof navigator === "undefined" || !navigator.vibrate) return;
        try {
          navigator.vibrate(tone === "warning" ? [35, 35, 35] : 45);
        } catch (_) {}
      }

      /**
       * Shows goal milestones as non-blocking toasts.
       * The queue prevents several nutrients from fighting for the same screen
       * space when a single meal crosses multiple targets at once.
       */
      function showNextGoalToast() {
        if (goalToastActiveRef.current) return;
        const next = goalToastQueueRef.current.shift();
        if (!next) return;
        goalToastActiveRef.current = true;
        playGoalToastCue(next.tone);
        vibrateGoalToast(next.tone);
        setGoalToast({...next, visible: true});
        if (goalToastTimerRef.current) clearTimeout(goalToastTimerRef.current);
        goalToastTimerRef.current = setTimeout(() => {
          setGoalToast(current => current ? {...current, visible: false} : null);
          goalToastTimerRef.current = setTimeout(() => {
            setGoalToast(null);
            goalToastActiveRef.current = false;
            showNextGoalToast();
          }, 450);
        }, 5000);
      }

      /**
       * Adds one milestone toast to the queue.
       * Each toast receives a ready-to-render text because the phrase is randomly
       * selected at the moment the goal is crossed.
       */
      function queueGoalToast(toast) {
        goalToastQueueRef.current.push(toast);
        showNextGoalToast();
      }

      function pickGoalToastPhrase(goalKey) {
        const copy = GOAL_TOAST_COPY[lang] || GOAL_TOAST_COPY.pt;
        const options = copy[goalKey] || copy.protein;
        return options[Math.floor(Math.random() * options.length)];
      }

      function formatGoalToastValue(value, target, unit) {
        const pct = target ? Math.round(value / target * 100) : 0;
        return `${rnd(value)}${unit} / ${rnd(target)}${unit} (${pct}%)`;
      }
      function applyFoodDbProduct(product) {
        setForm(formValue => mapOpenFoodFactsProductToForm(product, formValue));
        notify(pickLang(lang, "Valores importados do Open Food Facts. Revise antes de salvar.", "Values imported from Open Food Facts. Please review before saving.", "Valores importados de Open Food Facts. Revisa antes de guardar."), 6000);
      }
      function closeBarcodeModal() {
        stopBarcodeScanner();
        setBarcodeModalOpen(false);
      }
      async function fetchBarcodeProduct(rawBarcode) {
        const barcode = String(rawBarcode || barcodeInput || "").replace(/\D/g, "");
        if (!barcode) {
          setBarcodeMessage(pickLang(lang, "Digite um código de barras primeiro.", "Enter a barcode first.", "Introduce primero un código de barras."));
          return;
        }
        setBarcodeLoading(true);
        setBarcodeMessage("");
        try {
          const product = await getOpenFoodFactsProductByBarcode(barcode);
          if (!product) {
            setBarcodeMessage(pickLang(lang, "Produto não encontrado. Você pode preencher os dados manualmente.", "Product not found. You can enter the data manually.", "Producto no encontrado. Puedes completar los datos manualmente."));
            return;
          }
          applyFoodDbProduct(product);
          setBarcodeInput(barcode);
          setBarcodeMessage(pickLang(lang, "Produto encontrado. Revise os valores antes de salvar.", "Product found. Review the values before saving.", "Producto encontrado. Revisa los valores antes de guardar."));
          stopBarcodeScanner();
          setBarcodeModalOpen(false);
        } catch (e) {
          setBarcodeMessage(pickLang(lang, "Não foi possível buscar este código agora.", "Could not search this barcode right now.", "No se pudo buscar este código ahora."));
        } finally {
          setBarcodeLoading(false);
        }
      }
      async function searchFoodDatabase() {
        const query = form.name.trim();
        if (!query) {
          notify(pickLang(lang, "Escreva o nome do alimento primeiro.", "Enter the food name first.", "Escribe primero el nombre del alimento."));
          return;
        }
        setFoodDbLoading(true);
        setFoodDbResults([]);
        try {
          const products = await searchOpenFoodFactsProducts(query);
          setFoodDbResults(products);
          if (!products.length) notify(pickLang(lang, "Nenhum alimento correspondente encontrado no Open Food Facts.", "No matching food found in Open Food Facts.", "No se encontró ningún alimento correspondiente en Open Food Facts."), 5000);
          else applyFoodDbProduct(products[0]);
        } catch (e) {
          notify(pickLang(lang, "Não foi possível buscar no Open Food Facts agora.", "Could not search Open Food Facts right now.", "No se pudo buscar en Open Food Facts ahora."), 6000);
        }
        setFoodDbLoading(false);
      }
      async function autoFillNutrition() {
        if (!form.name.trim()) {
          notify(pickLang(lang, "Escreva o nome do alimento primeiro.", "Enter the food name first.", "Escribe primero el nombre del alimento."));
          return;
        }
        setAutoFillLoading(true);
        const unit = form.unit;
        const foodName = form.name.trim();
        const autofillRequest = requestFoodAutofill({ foodName, unit, lang });
        try {
          const result = await autofillRequest;
          if (result.status === "rejected") {
            notify(`${pickLang(lang, "Aviso", "Warning", "Aviso")}: ${result.reason}`, 7000);
          } else if (result.status === "success") {
            setForm(currentForm => applyFoodAutofillResult(currentForm, result));
            if (result.mode === "unit") {
              const w = result.unitWeightG;
              notify(pickLang(lang, `Campos preenchidos com base em ${w}g por unidade. Verifique se o peso está correto.`, `Fields filled based on ${w}g per unit. Check whether the weight looks right.`, `Campos completados con base en ${w}g por unidad. Verifica si el peso está correcto.`));
            } else {
              notify(text('notifFilled'));
            }
          }
        } catch (_) {
          notify(pickLang(lang, "Erro: ", "Error: ", "Error: ") + (_.message || pickLang(lang, "Não foi possível obter os valores.", "Could not get the values.", "No fue posible obtener los valores.")), 8000);
        }
        setAutoFillLoading(false);
      }
      async function estimateMealDescription() {
        if (!mealDescription.trim()) {
          notify(pickLang(lang, "Descreva o prato primeiro.", "Describe the dish first.", "Describe el plato primero."));
          return;
        }
        setDescribeLoading(true);
        setDescribeResult(null);
        const dishDescription = mealDescription.trim();
        const estimateRequest = requestDishEstimate({ description: dishDescription, lang });
        try {
          const estimate = await estimateRequest;
          if (estimate.status === "success") setDescribeResult(estimate.result);
        } catch (_) {
          notify(pickLang(lang, "Erro: ", "Error: ", "Error: ") + (_.message || pickLang(lang, "Não foi possível estimar.", "Could not estimate.", "No fue posible estimar.")), 8000);
        }
        setDescribeLoading(false);
      }
      function buildDescribedEntry() {
        return buildDishDescriptionEntry({
          estimate: describeResult,
          description: mealDescription
        });
      }
      function evaluateDescribedMeal() {
        const entry = buildDescribedEntry();
        if (!entry) return;
        openMealReview(describeMeal, [entry], "described");
      }
      function addDescribedToLog() {
        const entry = buildDescribedEntry();
        if (!entry) return;
        setActiveLog(previous => ({
          ...previous,
          [describeMeal]: [...(previous[describeMeal] || []), entry]
        }));
        setDescribeResult(null);
        setMealDescription("");
        notify(uiText("Refeição registrada.", "Meal logged.", "Comida registrada."));
      }

      // Water
      const totalWater = waterIntake.reduce((s, e) => s + e.ml, 0);
      function addWater(ml) {
        const n = parseFloat(ml || waterInput);
        if (isNaN(n) || n <= 0) return;
        setWaterIntake(w => [...w, {
          id: Date.now().toString(),
          ml: n,
          time: new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
          })
        }]);
        setWaterInput("");
      }
      function configureWaterCustomPreset() {
        const current = waterCustomPreset ? String(waterCustomPreset) : "";
        const message = uiText("Tamanho da garrafa em ml", "Bottle size in ml", "Tamaño de la botella en ml");
        const value = window.prompt(message, current);
        if (value === null) return;
        const parsed = Math.round(parseFloat(String(value).replace(",", ".")));
        if (isNaN(parsed) || parsed <= 0) return;
        setWaterCustomPreset(parsed);
      }
      function removeWater(id) {
        setWaterIntake(w => w.filter(e => e.id !== id));
      }

      // Supplements
      function addSuppToPantry() {
        if (!suppForm.name || !suppForm.dose) return;
        setSuppPantry(p => [...p, {
          id: Date.now().toString(),
          ...suppForm,
          dose: parseFloat(suppForm.dose)
        }]);
        setSuppForm({
          name: "",
          dose: "",
          unit: "un",
          notes: ""
        });
        setShowSuppForm(false);
        notify(uiText("Suplemento salvo.", "Supplement saved.", "Suplemento guardado."));
      }
      function logSupp() {
        const supp = suppPantry.find(s => s.id === suppAddId);
        if (!supp) return;
        const dose = parseFloat(suppAddDose) || supp.dose;
        setSuppLog(l => [...l, {
          id: Date.now().toString(),
          suppId: supp.id,
          name: supp.name,
          dose,
          unit: supp.unit,
          time: new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
          })
        }]);
        setSuppAddId("");
        setSuppAddDose("");
        setShowSuppAdd(false);
        notify(uiText(supp.name + " registrado.", supp.name + " logged.", supp.name + " registrado."));
      }
      function removeSuppLog(id) {
        setSuppLog(l => l.filter(e => e.id !== id));
      }
      function removeSuppPantry(id) {
        setSuppPantry(p => p.filter(s => s.id !== id));
      }

      // Custom goals
      function startEditGoals() {
        setGoalDraft({
          protein: customGoals.protein || "",
          kcal: customGoals.kcal || "",
          carbs: customGoals.carbs || "",
          fat: customGoals.fat || "",
          fiber: customGoals.fiber || "",
          salt: customGoals.salt || "",
          water: customGoals.water || ""
        });
        setEditingGoals(true);
      }
      function saveGoals() {
        const cg = {};
        Object.entries(goalDraft).forEach(([k, v]) => {
          if (v !== "") cg[k] = parseFloat(v);
        });
        setCustomGoals(cg);
        setEditingGoals(false);
        notify(uiText("Metas atualizadas.", "Targets updated.", "Metas actualizadas."));
      }
      // Persists nutrition and body-goal preferences. The object is kept flat because
      // Firestore stores these as profile fields under nutrition/{uid}; empty values
      // intentionally mean "not configured yet" and keep old accounts compatible.
      function saveNutritionPrefs(next, silent = true) {
        const clean = {
          activityLevel: next.activityLevel || "",
          goalType: next.goalType || "",
          goalKg: next.goalType === "maintenance" ? "" : (next.goalKg || ""),
          goalWeeks: next.goalType === "maintenance" ? "" : (next.goalWeeks || ""),
          manualAdjustment: next.manualAdjustment || "",
          proteinMultiplier: next.proteinMultiplier || "",
          bodyFatGoal: next.bodyFatGoal || ""
        };
        setNutritionPrefs(clean);
        storage.set("activityLevel", clean.activityLevel).catch(() => {});
        storage.set("goalType", clean.goalType).catch(() => {});
        storage.set("goalKg", clean.goalKg).catch(() => {});
        storage.set("goalWeeks", clean.goalWeeks).catch(() => {});
        storage.set("manualCalorieAdjustment", clean.manualAdjustment).catch(() => {});
        storage.set("proteinMultiplier", clean.proteinMultiplier).catch(() => {});
        storage.set("bodyFatGoal", clean.bodyFatGoal).catch(() => {});
        if (!silent) notify(uiText(
          "Preferências nutricionais atualizadas.",
          "Nutrition preferences updated.",
          "Preferencias nutricionales actualizadas."
        ));
      }

      /**
       * Stores height as stable profile data. Weight entries may still carry a
       * legacy height snapshot, but current calculations should prefer this value.
       */
      function saveProfileHeight(value) {
        setProfileData(prev => ({ ...prev, height: value }));
        storage.set("height", value || "").catch(() => {});
      }
      async function generateFoodPatterns() {
        setPatternsLoading(true);
        setPatternsText("");
        setPatternsSaved(false);
        try {
          const days = [];
          for (let i = 1; i <= 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const date = d.toISOString().split("T")[0];
            const l = await storage.get("log_v2_" + date).catch(() => null);
            if (!l) continue;
            const dayLog = JSON.parse(l.value);
            days.push({ date, log: dayLog });
          }
          const snapshot = {
            lang,
            today: TODAY,
            days,
            trainingByDate: { ...trainingByDate },
            weightHistory: weightHistory.map(entry => ({ ...entry })),
            currentWeight,
            currentHeight,
            profile: {
              birthDate: profileData.birthDate,
              gender: profileData.gender
            },
            nutritionPrefs: { ...nutritionPrefs },
            customGoals: {
              protein: customGoals.protein,
              kcal: customGoals.kcal,
              carbs: customGoals.carbs,
              fat: customGoals.fat,
              fiber: customGoals.fiber,
              salt: customGoals.salt
            },
            goalHistory: Object.fromEntries(Object.entries(goalHistory).map(([date, goal]) => [
              date,
              goal && typeof goal === "object" ? { ...goal } : goal
            ])),
            mealKeys: [...MEALS]
          };
          const result = await generateEatingPatterns(snapshot);
          if (result.status === "no-data") {
            notify(text('noDataPatterns'));
            setPatternsLoading(false);
            return;
          }
          setPatternsText(result.text);
        } catch (_) {
          notify(pickLang(lang, "Erro: ", "Error: ", "Error: ") + (_.message || pickLang(lang, "Não foi possível analisar.", "Could not analyze.", "No se pudo analizar.")), 8000);
        }
        setPatternsLoading(false);
      }
      function savePatterns() {
        if (!patternsText) return;
        const sepTitle = pickLang(lang, "PADRÕES ALIMENTARES", "EATING PATTERNS", "PATRONES ALIMENTARIOS");
        const sep = "\n\n---\n " + sepTitle + " (" + new Date().toLocaleDateString(localeForLang(lang)) + "):\n";
        setTodayNote(n => (n ? n + sep : sep.trim() + "\n") + patternsText);
        setPatternsSaved(true);
        notify(pickLang(lang, "Análise salva nas notas.", "Analysis saved to notes.", "Análisis guardado en las notas."));
      }
      async function generateMealSuggestions() {
        if (!pantry.length) {
          notify(pickLang(lang, "Adicione alimentos à despensa primeiro.", "Add foods to the pantry first.", "Añade alimentos a la despensa primero."));
          return;
        }
        setSuggestLoading(true);
        setSuggestions(null);
        const remainProt = Math.max(0, Math.round(goals.protein - tot.protein));
        const remainKcal = Math.max(0, Math.round(goals.kcal - tot.kcal));
        const remainCarbs = Math.max(0, Math.round(goals.carbs - tot.carbs));
        if (remainProt === 0 && remainKcal === 0) {
          notify(pickLang(lang, "Você já atingiu as metas de hoje!", "You have already hit today's targets!", "Ya alcanzaste las metas de hoy."));
          setSuggestLoading(false);
          return;
        }
        const pantryList = sortedAllPantry.map(f => {
          const div = f.unit === "un" ? 1 : 100;
          return f.name + " (" + f.protein100 + "g prot/" + (f.unit === "un" ? "un" : "100" + f.unit) + ", " + f.kcal100 + " kcal/" + (f.unit === "un" ? "un" : "100" + f.unit) + ")";
        }).join(", ");
        const prompt = pickLang(
          lang,
          "O usuário precisa fechar as metas nutricionais do dia. Sugira 3 combinações práticas de alimentos da despensa dele.\n\nO QUE AINDA FALTA HOJE:\n" + (remainProt > 0 ? "Proteína: " + remainProt + "g\n" : "") + (remainKcal > 0 ? "Calorias: " + remainKcal + " kcal\n" : "") + (remainCarbs > 0 ? "Carbs: " + remainCarbs + "g\n" : "") + "\nDESPENSA DISPONÍVEL:\n" + pantryList + "\n\nPara cada sugestão indique:\n- Nome da combinação\n- Alimentos com quantidades específicas (em gramas/ml/unidades)\n- Totais de proteína e calorias estimados\n\nResponda APENAS com JSON sem markdown:\n[{\"name\":\"nome\",\"items\":[{\"food\":\"nome exato da despensa\",\"qty\":X,\"unit\":\"g\"}],\"protein\":X,\"kcal\":X}]",
          "The user needs to finish today's nutrition targets. Suggest 3 practical food combinations using only foods from their pantry.\n\nSTILL MISSING TODAY:\n" + (remainProt > 0 ? "Protein: " + remainProt + "g\n" : "") + (remainKcal > 0 ? "Calories: " + remainKcal + " kcal\n" : "") + (remainCarbs > 0 ? "Carbs: " + remainCarbs + "g\n" : "") + "\nAVAILABLE PANTRY:\n" + pantryList + "\n\nFor each suggestion include:\n- Combination name\n- Foods with specific amounts (grams/ml/units)\n- Estimated protein and calorie totals\n\nRespond ONLY with JSON, no markdown:\n[{\"name\":\"name\",\"items\":[{\"food\":\"exact pantry food name\",\"qty\":X,\"unit\":\"g\"}],\"protein\":X,\"kcal\":X}]",
          "El usuario necesita completar las metas nutricionales de hoy. Sugiere 3 combinaciones prácticas usando solo alimentos de su despensa.\n\nLO QUE FALTA HOY:\n" + (remainProt > 0 ? "Proteína: " + remainProt + "g\n" : "") + (remainKcal > 0 ? "Calorías: " + remainKcal + " kcal\n" : "") + (remainCarbs > 0 ? "Carbohidratos: " + remainCarbs + "g\n" : "") + "\nDESPENSA DISPONIBLE:\n" + pantryList + "\n\nPara cada sugerencia incluye:\n- Nombre de la combinación\n- Alimentos con cantidades específicas (gramos/ml/unidades)\n- Totales estimados de proteína y calorías\n\nResponde SOLO con JSON, sin markdown:\n[{\"name\":\"nombre\",\"items\":[{\"food\":\"nombre exacto de la despensa\",\"qty\":X,\"unit\":\"g\"}],\"protein\":X,\"kcal\":X}]"
        );
        try {
          const text = await callAI(prompt, 800);
          const clean = text.replace(/```json|```/g, "").trim();
          setSuggestions(JSON.parse(clean));
        } catch (_) {
          notify(pickLang(lang, "Erro: ", "Error: ", "Error: ") + (_.message || pickLang(lang, "Não foi possível gerar sugestões.", "Could not generate suggestions.", "No se pudieron generar sugerencias.")), 8000);
        }
        setSuggestLoading(false);
      }
      function loadSuggestionToStaged(sugg) {
        const items = sugg.items.map(item => {
          const food = pantry.find(f => f.name.toLowerCase() === item.food.toLowerCase()) || pantry.find(f => f.name.toLowerCase().includes(item.food.toLowerCase().split(" ")[0]));
          if (!food) return null;
          return buildEntry(food, item.qty);
        }).filter(Boolean);
        if (!items.length) {
          notify(pickLang(lang, "Nenhum alimento da sugestão foi encontrado na despensa.", "No food from the suggestion was found in the pantry.", "No se encontró en la despensa ningún alimento de la sugerencia."));
          return;
        }
        setStaged({
          meal: addEntry.meal || "Outro",
          items
        });
        setBatchMode(true);
        openTab("adicionar");
        notify(pickLang(lang, "\"" + sugg.name + "\" carregada. Ajuste e registre.", "\"" + sugg.name + "\" loaded. Adjust and log it.", "\"" + sugg.name + "\" cargada. Ajusta y registra."));
      }
      function reportDateShift(date, days) {
        const d = new Date(date + "T12:00:00");
        d.setDate(d.getDate() + days);
        return d.toISOString().split("T")[0];
      }
      function reportDateRange(start, end) {
        const dates = [];
        let d = start;
        while (d <= end) {
          dates.push(d);
          d = reportDateShift(d, 1);
        }
        return dates;
      }
      async function loadReportDay(date) {
        let dayLog = date === TODAY ? log : {};
        if (date !== TODAY) {
          const saved = await storage.get("log_v2_" + date).catch(() => null);
          if (saved) dayLog = normalizeMealKeys(JSON.parse(saved.value));
        }
        const [noteRes, waterRes, suppRes] = await Promise.all([
          date === TODAY ? Promise.resolve({value: todayNote || ""}) : storage.get("notes_" + date).catch(() => null),
          date === TODAY ? Promise.resolve({value: JSON.stringify(waterIntake || [])}) : storage.get("waterIntake_" + date).catch(() => null),
          date === TODAY ? Promise.resolve({value: JSON.stringify(suppLog || [])}) : storage.get("suppLog_" + date).catch(() => null)
        ]);
        const weightEntry = getWeightForDate(weightHistory, date);
        return {
          date,
          isTraining: trainingByDate[date] ?? true,
          weight: weightEntry?.weight || null,
          height: weightEntry?.height || null,
          goals: dayGoalForDate(date),
          totals: buildDayTotals(dayLog),
          meals: dayLog,
          water: waterRes?.value ? JSON.parse(waterRes.value) : [],
          supplements: suppRes?.value ? JSON.parse(suppRes.value) : [],
          notes: noteRes?.value || ""
        };
      }
      async function buildAdvancedReportPayload(type, format) {
        const anchor = viewDate || TODAY;
        let dates = [];
        if (type === "day") {
          dates = [anchor];
        } else if (type === "week") {
          dates = reportDateRange(reportDateShift(anchor, -6), anchor);
        } else if (type === "month") {
          const first = anchor.slice(0, 8) + "01";
          const lastDate = new Date(anchor.slice(0, 7) + "-01T12:00:00");
          lastDate.setMonth(lastDate.getMonth() + 1);
          lastDate.setDate(0);
          const last = lastDate.toISOString().split("T")[0];
          dates = reportDateRange(first, last);
        } else {
          const listed = await storage.list("log_v2_").catch(() => ({keys: []}));
          dates = (listed.keys || [])
            .map(k => String(k).replace("log_v2_", "").slice(0, 10))
            .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
          if (!dates.includes(TODAY)) dates.push(TODAY);
          dates = Array.from(new Set(dates)).sort();
        }
        const days = await Promise.all(dates.map(loadReportDay));
        const nonEmptyDays = days.filter(d => Object.values(d.meals || {}).some(items => (items || []).length) || d.date === TODAY || type === "day");
        return {
          reportType: type,
          format,
          lang,
          generatedFromAppAt: new Date().toISOString(),
          profile: {
            userName,
            birthDate: profileData.birthDate,
            gender: profileData.gender,
            currentWeight,
            currentHeight
          },
          nutritionPrefs,
          customGoals,
          period: {
            start: dates[0],
            end: dates[dates.length - 1]
          },
          days: nonEmptyDays,
          pantry,
          mealTemplates,
          weightHistory
        };
      }
      async function generateAdvancedReport() {
        setReportLoading(true);
        setReportMessage("");
        try {
          if (!REPORTS_ENABLED) {
            throw new Error(pickLang(
              lang,
              "Recurso em manutenção. Os relatórios avançados voltarão quando um servidor seguro estiver configurado.",
              "Feature under maintenance. Advanced reports will return when a secure server is configured.",
              "Recurso en mantenimiento. Los informes avanzados volverán cuando haya un servidor seguro configurado."
            ));
          }
          const serverUrl = REPORT_SERVER_URL;
          const payload = await buildAdvancedReportPayload(reportType, reportFormat);
          const response = await fetch(serverUrl + "/reports/from-body", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.detail || pickLang(lang, "Não foi possível gerar o relatório.", "Could not generate report.", "No se pudo generar el informe."));
          const targetUrl = serverUrl + (reportFormat === "pdf" ? data.downloadUrl : data.htmlUrl);
          window.open(targetUrl, "_blank", "noopener,noreferrer");
          setReportMessage(pickLang(lang, "Relatório gerado e aberto em uma nova aba.", "Report generated and opened in a new tab.", "Informe generado y abierto en una nueva pestaña."));
        } catch (err) {
          let msg = err?.message || String(err);
          if (/NetworkError|Failed to fetch|Network request failed/i.test(msg)) {
            msg = pickLang(
              lang,
              "Não foi possível acessar o servidor seguro de relatórios. Tente novamente mais tarde.",
              "Could not reach the secure report server. Please try again later.",
              "No se pudo acceder al servidor seguro de informes. Inténtalo de nuevo más tarde."
            );
          }
          setReportMessage(msg);
          notify(msg, 8000);
        } finally {
          setReportLoading(false);
        }
      }
      async function runExport(period, format) {
        setShowExportPanel(null);
        let content = "";
        let filename = "";
        if (period === "day") {
          const date = viewDate;
          const dayLog = activeLog;
          const totals = buildDayTotals(dayLog);
          const note = isToday ? todayNote : historyNote;
          filename = "nutricao_" + date + "." + format;
          if (format === "json") {
            content = JSON.stringify({
              date,
              isTraining,
              goals,
              meals: dayLog,
              totals,
              note
            }, null, 2);
          } else if (format === "csv") {
            const rows = [[text('meal'), text('foodLabel'), text('qty'), text('unit'), text('protein') + "(g)", text('calories') + "(kcal)", text('carbs') + "(g)", text('fat') + "(g)", text('fiber') + "(g)", text('salt') + "(g)"]];
            MEAL_KEYS.forEach(meal => {
              (dayLog[meal] || []).forEach(e => {
                rows.push([mealDisplay(meal), '"' + e.name + '"', e.qty, e.unit, rnd(e.protein), rnd(e.kcal), rnd(e.carbs), rnd(e.fat), rnd(e.fiber), rnd(e.salt)]);
              });
            });
            rows.push([], []);
            rows.push([pickLang(lang, 'TOTAIS', 'TOTALS', 'TOTALES'), "", "", "", totals.protein, totals.kcal, totals.carbs, totals.fat, totals.fiber, totals.salt]);
            rows.push([pickLang(lang, 'META', 'GOAL', 'META'), "", "", "", goals.protein, goals.kcal, goals.carbs, goals.fat, goals.fiber, goals.salt]);
            content = rows.map(r => r.join(",")).join("\n");
          } else if (format === "html") {
            const mealRows = MEAL_KEYS.map(meal => {
              const items = dayLog[meal] || [];
              if (!items.length) return "";
              const itemRows = items.map(e => "<tr><td>" + e.name + "</td><td>" + e.qty + e.unit + "</td><td>" + rnd(e.protein) + "g</td><td>" + rnd(e.kcal) + "</td><td>" + rnd(e.carbs) + "g</td><td>" + rnd(e.fat) + "g</td></tr>").join("");
              return "<h3>" + mealDisplay(meal) + "</h3><table border='1' cellpadding='6' style='border-collapse:collapse;width:100%;margin-bottom:16px'><tr><th>" + text('foodLabel') + "</th><th>" + text('qty') + "</th><th>" + text('protein') + "</th><th>Kcal</th><th>" + text('carbs') + "</th><th>" + text('fat') + "</th></tr>" + itemRows + "</table>";
            }).join("");
            content = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>" + pickLang(lang, "Nutrição ", "Nutrition ", "Nutrición ") + date + "</title>" + "<style>body{font-family:sans-serif;padding:24px;max-width:800px;margin:auto}h1,h3{color:#333}table{width:100%}td,th{padding:6px 10px;text-align:left;border:1px solid #ddd}.box{background:#f5f5f5;padding:12px;border-radius:6px;margin-top:16px}</style></head><body>" + "<h1>" + pickLang(lang, "Relatório Nutricional - ", "Nutrition Report - ", "Informe nutricional - ") + date + "</h1><p><b>" + pickLang(lang, "Tipo:", "Type:", "Tipo:") + "</b> " + (isTraining ? text('training') : text('rest')) + "</p>" + mealRows + "<div class='box'><h3>" + pickLang(lang, "Totais", "Totals", "Totales") + "</h3><p>" + text('protein') + ": <b>" + totals.protein + "g</b> (" + pickLang(lang, "meta: ", "goal: ", "meta: ") + goals.protein + "g) &nbsp;|&nbsp; " + text('calories') + ": <b>" + totals.kcal + "</b> (" + pickLang(lang, "meta: ", "goal: ", "meta: ") + goals.kcal + ") &nbsp;|&nbsp; " + text('carbs') + ": " + totals.carbs + "g &nbsp;|&nbsp; " + text('fat') + ": " + totals.fat + "g &nbsp;|&nbsp; " + text('fiber') + ": " + totals.fiber + "g &nbsp;|&nbsp; " + text('salt') + ": " + totals.salt + "g</p></div>" + (note ? "<div class='box'><h3>" + pickLang(lang, "Notas", "Notes", "Notas") + "</h3><p>" + note.replace(/\n/g, "<br>") + "</p></div>" : "") + "</body></html>";
          } else {
            let txt = pickLang(lang, "RELATÓRIO NUTRICIONAL - ", "NUTRITION REPORT - ", "INFORME NUTRICIONAL - ") + date + "\n" + pickLang(lang, "Tipo: ", "Type: ", "Tipo: ") + (isTraining ? text('training') : text('rest')) + "\n\n";
            MEAL_KEYS.forEach(meal => {
              const items = dayLog[meal] || [];
              if (!items.length) return;
              txt += mealDisplay(meal).toUpperCase() + "\n";
              items.forEach(e => {
                txt += "  " + e.name + " " + e.qty + e.unit + " - " + rnd(e.protein) + "g " + pickLang(lang, "prot.", "protein", "prot.") + ", " + rnd(e.kcal) + " kcal\n";
              });
              txt += "\n";
            });
            txt += pickLang(lang, "TOTAIS\nProteína: ", "TOTALS\nProtein: ", "TOTALES\nProteína: ") + totals.protein + "g / " + goals.protein + "g\n" + text('calories') + ": " + totals.kcal + " / " + goals.kcal + "\n" + text('carbs') + ": " + totals.carbs + "g | " + text('fat') + ": " + totals.fat + "g | " + text('fiber') + ": " + totals.fiber + "g | " + text('salt') + ": " + totals.salt + "g";
            if (note) txt += "\n\n" + pickLang(lang, "NOTAS", "NOTES", "NOTAS") + "\n" + note;
            content = txt;
          }
        } else {
          // Week
          const days = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const date = d.toISOString().split("T")[0];
            let dayLog = date === TODAY ? log : {};
            if (date !== TODAY) {
              const l = await storage.get("log_v2_" + date).catch(() => null);
              if (l) dayLog = normalizeMealKeys(JSON.parse(l.value));
            }
            const totals = buildDayTotals(dayLog);
            const g = dayGoalForDate(date);
            days.push({
              date,
              isTraining: trainingByDate[date] ?? true,
              goals: g,
              totals
            });
          }
          filename = "semana_" + TODAY + "." + format;
          if (format === "json") {
            content = JSON.stringify(days, null, 2);
          } else if (format === "csv") {
            const rows = [[pickLang(lang, "Data", "Date", "Fecha"), pickLang(lang, "Tipo", "Type", "Tipo"), text('protein') + "(g)", pickLang(lang, "Meta Prot", "Protein goal", "Meta Prot"), text('calories'), "Meta Kcal", text('carbs') + "(g)", text('fat') + "(g)", text('fiber') + "(g)", text('salt') + "(g)"]];
            days.forEach(d => rows.push([d.date, d.isTraining ? text('training') : text('rest'), d.totals.protein, d.goals.protein, d.totals.kcal, d.goals.kcal, d.totals.carbs, d.totals.fat, d.totals.fiber, d.totals.salt]));
            content = rows.map(r => r.join(",")).join("\n");
          } else if (format === "html") {
            const rows = days.map(d => "<tr><td>" + d.date + "</td><td>" + (d.isTraining ? text('training') : text('rest')) + "</td><td>" + d.totals.protein + "g / " + d.goals.protein + "g</td><td>" + d.totals.kcal + " / " + d.goals.kcal + "</td><td>" + d.totals.carbs + "g</td><td>" + d.totals.fat + "g</td><td>" + d.totals.fiber + "g</td></tr>").join("");
            content = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>" + pickLang(lang, "Semana Nutricional", "Weekly Nutrition", "Semana nutricional") + "</title><style>body{font-family:sans-serif;padding:24px;max-width:900px;margin:auto}table{width:100%;border-collapse:collapse}td,th{padding:8px 12px;border:1px solid #ddd}th{background:#f0f0f0}tr:nth-child(even){background:#fafafa}</style></head><body><h1>" + pickLang(lang, "Relatório Semanal - ", "Weekly Report - ", "Informe semanal - ") + TODAY + "</h1><table><tr><th>" + pickLang(lang, "Data", "Date", "Fecha") + "</th><th>" + pickLang(lang, "Tipo", "Type", "Tipo") + "</th><th>" + text('protein') + "</th><th>" + text('calories') + "</th><th>" + text('carbs') + "</th><th>" + text('fat') + "</th><th>" + text('fiber') + "</th></tr>" + rows + "</table></body></html>";
          } else {
            let txt = pickLang(lang, "RELATÓRIO SEMANAL - ", "WEEKLY REPORT - ", "INFORME SEMANAL - ") + TODAY + "\n\n";
            days.forEach(d => {
              txt += d.date + " (" + (d.isTraining ? text('training') : text('rest')) + ")\n  " + text('protein') + ": " + d.totals.protein + "g / " + d.goals.protein + "g | " + text('calories') + ": " + d.totals.kcal + " / " + d.goals.kcal + "\n\n";
            });
            content = txt;
          }
        }
        setExportResult({
          content,
          filename,
          copied: false
        });
      }
      async function generateFeedback(type) {
        setFeedbackLoading(true);
        setFeedbackText("");
        setFeedbackPeriod(type);
        setFeedbackSaved(false);
        try {
          const storedUserName = await storage.get("userName").catch(() => null);
          const feedbackUserName = storedUserName?.value ? String(storedUserName.value).trim() : "";
          const snapshot = {
            type,
            lang,
            userName: feedbackUserName,
            profile: {
              birthDate: profileData.birthDate,
              gender: profileData.gender,
              currentWeight,
              viewWeight,
              currentHeight,
              viewHeight
            },
            preferences: {
              activityLevel: nutritionPrefs.activityLevel,
              goalType: nutritionPrefs.goalType,
              goalKg: nutritionPrefs.goalKg,
              goalWeeks: nutritionPrefs.goalWeeks
            },
            goalContext: {
              goals: {
                kcal: goals.kcal,
                protein: goals.protein,
                carbs: goals.carbs,
                fat: goals.fat,
                fiber: goals.fiber,
                salt: goals.salt
              },
              baseActivityFactor: baseGoals.fa,
              calorieBase,
              calorieAdjustment,
              proteinMultiplier
            },
            day: {
              viewDate,
              isTraining,
              mealOrder: [...MEALS],
              mealLabels: Object.fromEntries(MEALS.map(meal => [meal, mealLabel(meal)])),
              activeLog: Object.fromEntries(Object.entries(activeLog).map(([meal, items]) => [
                meal,
                (items || []).map(entry => ({
                  name: entry.name,
                  qty: entry.qty,
                  unit: entry.unit,
                  protein: entry.protein,
                  kcal: entry.kcal,
                  carbs: entry.carbs,
                  fat: entry.fat,
                  fiber: entry.fiber,
                  salt: entry.salt
                }))
              ]))
            },
            week: weekData.map(day => ({
              hasData: day.hasData,
              date: day.date,
              protein: day.protein,
              proteinGoal: day.proteinGoal,
              metProtein: day.metProtein,
              kcal: day.kcal,
              kcalGoal: day.kcalGoal,
              carbs: day.carbs,
              carbsGoal: day.carbsGoal,
              fat: day.fat,
              fatGoal: day.fatGoal,
              fiber: day.fiber,
              fiberGoal: day.fiberGoal,
              salt: day.salt,
              saltGoal: day.saltGoal
            }))
          };
          const result = await generateNutritionFeedback(snapshot);
          if (result.status === "no-week-data") {
            notify(text('noWeekData'));
            setFeedbackLoading(false);
            return;
          }
          setFeedbackText(result.text);
        } catch (_) {
          notify(pickLang(lang, "Erro: ", "Error: ", "Error: ") + (_.message || pickLang(lang, "Não foi possível gerar o feedback.", "Could not generate feedback.", "No fue posible generar el feedback.")), 8000);
        }
        setFeedbackLoading(false);
      }
      // Genetic Algorithm Meal Suggester
      function getAutomaticMealSuggestionLimits(now = new Date()) {
        return calculateAutomaticMealSuggestionLimits({
          activeLog,
          goals,
          tolerance: gaTolerance,
          now
        });
      }

      async function runGA() {
        setGARunning(true);
        setGAProgress(0);
        setGAResults([]);
        setGAHasSearched(true);

        const outcome = await runMealGA({
          pantry,
          activeLog,
          goals,
          useAll: gaUseAll,
          selectedIds: gaSelIds,
          limits: gaLimits,
          globalMax: gaGlobalMax,
          tolerance: gaTolerance,
          useProteinTolerance: gaUseProtTol,
          proteinTolerance: gaProtTolerance,
          kcalMin: gaKcalMin,
          kcalMax: gaKcalMax,
          proteinMin: gaProtMin,
          proteinMax: gaProtMax,
          onProgress: setGAProgress,
          onResults: setGAResults
        });

        if (outcome.status === "empty-pantry") {
          notify(uiText("Adicione alimentos \u00e0 despensa primeiro.", "Add foods to the pantry first.", "A\u00f1ade alimentos a la despensa primero."));
          setGARunning(false);
          return;
        }

        if (outcome.status === "no-solution") {
          notify(uiText(
            "Nenhuma combina\u00e7\u00e3o v\u00e1lida foi encontrada com os limites definidos.",
            "No valid combination was found with the selected limits.",
            "No se encontr\u00f3 ninguna combinaci\u00f3n v\u00e1lida con los l\u00edmites definidos."
          ));
        }

        setGAProgress(100);
        setGARunning(false);
      }

      async function runGASafely() {
        try {
          await runGA();
        } catch (err) {
          setGARunning(false);
          setGAProgress(0);
          setGAResults([]);
          notify(uiText(
            "N\u00e3o foi poss\u00edvel gerar sugest\u00f5es de refei\u00e7\u00e3o: ",
            "Could not generate meal suggestions: ",
            "No se pudieron generar sugerencias de comida: "
          ) + (err?.message || err), 8000);
        }
      }

      function openMealSuggestions() {
        if (!pantry.length) {
          notify(uiText("Adicione alimentos \u00e0 despensa primeiro.", "Add foods to the pantry first.", "A\u00f1ade alimentos a la despensa primero."));
          return;
        }
        setGAResults([]);
        setGAHasSearched(false);
        setGAProgress(0);
        setGATargetMeal(MEALS[1] || MEALS[0]);
        setShowGA(true);
      }

      function addGAResultToDiary(result) {
        const meal = applyGAResultToDiary({
          result,
          targetMeal: gaTargetMeal,
          meals: MEALS
        });
        notify(uiText("Refei\u00e7\u00e3o adicionada ao di\u00e1rio (", "Meal added to diary (", "Comida a\u00f1adida al diario (") + mealLabel(meal) + ")!");
        setShowGA(false);
      }

      function  saveFeedbackAsNote() {
        if (!feedbackText) return;
        const feedbackLabel = feedbackPeriod === "day"
          ? pickLang(lang, "DO DIA", "DAY", "DEL DÍA")
          : pickLang(lang, "DA SEMANA", "WEEK", "DE LA SEMANA");
        const separator = "\n\n---\n FEEDBACK " + feedbackLabel + " (" + new Date().toLocaleDateString(localeForLang(lang)) + "):\n";
        if (feedbackPeriod === "day") {
          if (isToday) setTodayNote(n => (n ? n + separator : separator.trim() + "\n") + feedbackText);else setHistoryNote(n => (n ? n + separator : separator.trim() + "\n") + feedbackText);
        } else {
          setTodayNote(n => (n ? n + separator : separator.trim() + "\n") + feedbackText);
        }
        notify(pickLang(lang, "Feedback salvo nas notas.", "Feedback saved to notes.", "Feedback guardado en las notas."));
        setFeedbackSaved(true);
      }
      const currentEntry = getWeightForDate(weightHistory, TODAY);
      const currentWeight = currentEntry?.weight || null;
      const profileHeight = profileData.height ? Number(profileData.height) : null;
      const currentHeight = profileHeight || currentEntry?.height || null;
      const bmrMeasurementContext = {
        profileData,
        currentHeight,
        nutritionPrefs,
        today: TODAY
      };
      const isTraining = trainingByDate[viewDate] ?? true;
      const viewEntry = getWeightForDate(weightHistory, viewDate);
      const viewWeight = viewEntry?.weight || currentWeight;
      const viewHeight = viewEntry?.height || currentHeight;
      const goalProfile = {
        height: viewHeight,
        birthDate: profileData.birthDate,
        gender: profileData.gender,
        prefs: nutritionPrefs
      };
      const baseGoals = computeGoals(viewWeight, isTraining, goalProfile);
      const dailyGoalModel = buildDailyGoalModel({
        baseGoals,
        customGoals,
        nutritionPrefs,
        viewWeight,
        isTraining
      });
      const {
        calorieBase,
        calorieAdjustment,
        proteinMultiplier,
        calculatedGoals
      } = dailyGoalModel;
      const calorieAdjustmentWarning = dailyGoalModel.adjustmentWarningLevel === "extreme"
        ? uiText(
          "Este ajuste calórico parece muito agressivo. Metas muito baixas ou déficits/superávits grandes podem ser pouco saudáveis e difíceis de sustentar; considere um ajuste menor ou um prazo mais longo.",
          "This calorie adjustment looks very aggressive. Very low targets or large deficits/surpluses can be unhealthy and hard to sustain; consider a smaller adjustment or a longer timeline.",
          "Este ajuste calórico parece muy agresivo. Metas muy bajas o déficits/superávits grandes pueden ser poco saludables y difíciles de mantener; considera un ajuste menor o un plazo más largo."
        )
        : dailyGoalModel.adjustmentWarningLevel === "high"
          ? uiText(
            "Este é um ajuste alto. Revise o prazo ou use um ajuste manual menor se a meta parecer extrema.",
            "This is a high adjustment. Review the timeline or use a smaller manual adjustment if the target feels too extreme.",
            "Este es un ajuste alto. Revisa el plazo o usa un ajuste manual menor si la meta parece extrema."
          )
          : "";
      const healthGuardrails = dailyGoalModel.healthGuardrailCodes.map(code => {
        if (code === "low-calories") return uiText("Meta final abaixo de 1200 kcal/dia: normalmente é baixa demais sem acompanhamento profissional.", "Final target below 1200 kcal/day: this is usually too low without professional supervision.", "Meta final por debajo de 1200 kcal/día: normalmente es demasiado baja sin supervisión profesional.");
        if (code === "large-adjustment") return uiText("Ajuste acima de 750 kcal/dia: considere um prazo maior para proteger aderência e recuperação.", "Adjustment above 750 kcal/day: consider a longer timeline to protect adherence and recovery.", "Ajuste superior a 750 kcal/día: considera un plazo mayor para proteger adherencia y recuperación.");
        if (code === "large-adjustment-percent") return uiText("Ajuste acima de 35% da base do dia: é uma mudança extrema em relação à manutenção estimada.", "Adjustment above 35% of your day base: this is an extreme change compared with your estimated maintenance.", "Ajuste superior al 35% de la base del día: es un cambio extremo frente al mantenimiento estimado.");
        if (code === "fast-loss") return uiText("Perda planejada acima de 1 kg/semana: pode aumentar fome, fadiga e risco de perda muscular.", "Planned loss above 1 kg/week: this may increase hunger, fatigue, and muscle-loss risk.", "Pérdida planificada por encima de 1 kg/semana: puede aumentar hambre, fatiga y riesgo de pérdida muscular.");
        return uiText("Ganho planejado acima de 0,5 kg/semana: um superávit grande pode aumentar ganho de gordura desnecessário.", "Planned gain above 0.5 kg/week: a large surplus may add unnecessary fat gain.", "Ganancia planificada por encima de 0,5 kg/semana: un superávit grande puede aumentar ganancia de grasa innecesaria.");
      });
      const isToday = viewDate === TODAY;
      const frozenGoals = goalHistory[viewDate];
      const goals = !isToday && frozenGoals ? {...calculatedGoals, ...frozenGoals} : calculatedGoals;
      useEffect(() => {
        if (!loaded || !calendarOpen) return;
        let cancelled = false;
        async function loadCalendarMonth() {
          setCalendarLoading(true);
          try {
            const nextData = await loadCalendarMonthData({
              calendarMonth,
              today: TODAY,
              todayLog: log,
              trainingByDate,
              goalContext: {
                weightHistory,
                currentWeight,
                currentHeight,
                profileData,
                nutritionPrefs,
                customGoals,
                goalHistory
              }
            });
            if (!cancelled) {
              setCalendarData(prev => ({...prev, [calendarMonth]: nextData}));
            }
          } catch (error) {
            console.error("Falha ao carregar dados do calendário mensal:", calendarMonth, error);
          } finally {
            if (!cancelled) setCalendarLoading(false);
          }
        }
        loadCalendarMonth();
        return () => {
          cancelled = true;
        };
      }, [loaded, calendarOpen, calendarMonth, log, goalHistory, trainingByDate, weightHistory, customGoals, nutritionPrefs]);
      useEffect(() => {
        if (!loaded) return;
        const snapshot = {
          protein: calculatedGoals.protein,
          kcal: calculatedGoals.kcal,
          carbs: calculatedGoals.carbs,
          fat: calculatedGoals.fat,
          fiber: calculatedGoals.fiber,
          salt: calculatedGoals.salt,
          water: calculatedGoals.water
        };
        setGoalHistory(prev => {
          const current = prev[TODAY];
          if (JSON.stringify(current) === JSON.stringify(snapshot)) return prev;
          return {...prev, [TODAY]: snapshot};
        });
      }, [loaded, calculatedGoals.protein, calculatedGoals.kcal, calculatedGoals.carbs, calculatedGoals.fat, calculatedGoals.fiber, calculatedGoals.salt, calculatedGoals.water]);
      const bmiNum = currentWeight && currentHeight ? currentWeight / (currentHeight / 100) ** 2 : null;
      const bmi = bmiNum ? bmiNum.toFixed(1) : null;
      const activeLog = isToday ? log : historyLog;
      // Update data refs now that all derived state is available
      window._exportData = {
        activeLog, log, TODAY, isTraining, goals, goalHistory, trainingByDate,
        buildDayTotals, normalizeMealKeys, exportFile, lang, notify,
        weightHistory
      };
      function setActiveLog(newLog) {
        if (isToday) {
          setLog(newLog);
        } else {
          const resolvedLog = typeof newLog === "function" ? newLog(historyLog) : newLog;
          setHistoryLog(resolvedLog);
          scheduleSave("log_v2_" + viewDate, resolvedLog);
        }
      }

      // Pantry
      function addFood() {
        if (!form.name || !form.protein100 || !form.kcal100) return;
        const portion = parseFloat(form.portionSize) || 100;
        const unitWeight = parseFloat(form.unitWeightG);
        const convertUnitFrom100g = form.unit === "un" && Number.isFinite(unitWeight) && unitWeight > 0;
        const scale = convertUnitFrom100g
          ? (v) => v !== "" && v != null ? Math.round(parseFloat(v) * unitWeight / 100 * 100) / 100 : ""
          : portion !== 100 ? (v) => v !== "" && v != null ? Math.round(parseFloat(v) / portion * 100 * 10) / 10 : "" : (v) => v;
        const food = {
          id: Date.now().toString(),
          name: form.name.trim(),
          unit: form.unit
        };
        if (convertUnitFrom100g) food.unitWeightG = unitWeight;
        ALL_FIELDS.forEach(f => {
          const raw = scale(form[f.key]);
          food[f.key] = raw === "" || raw == null ? null : parseFloat(raw);
        });
        setPantry(p => [...p, food]);
        setForm(emptyFood());
        setNewFoodOpen(false);
        notify(convertUnitFrom100g
          ? uiText(
            "Alimento salvo por unidade usando o peso médio informado.",
            "Food saved as units using the average unit weight.",
            "Alimento guardado por unidad usando el peso medio informado."
          )
          : uiText("Alimento salvo.", "Food saved.", "Alimento guardado."));
      }
      function removeFood(id) {
        setPantry(p => p.filter(f => f.id !== id));
      }
      function startEdit(food) {
        const f = {
          ...food
        };
        ALL_FIELDS.forEach(ff => {
          if (f[ff.key] == null) f[ff.key] = "";
        });
        setEditingId(food.id);
        setEditForm(f);
      }
      function saveEdit() {
        const u = {
          ...editForm
        };
        ALL_FIELDS_KEYS.forEach(f => {
          u[f.key] = editForm[f.key] === "" ? null : parseFloat(editForm[f.key]);
        });
        u.name = editForm.name.trim();
        setPantry(p => p.map(food => food.id === editingId ? u : food));
        setEditingId(null);
        setEditForm(null);
        notify(uiText("Alimento atualizado.", "Food updated.", "Alimento actualizado."));
      }
      // Diary entry edit
      function startEditEntry(entry) {
        setEditEntryId(entry.id);
        setEditEntryQty(String(entry.qty));
      }
      function saveEntryEdit(meal) {
        const qty = parseFloat(editEntryQty);
        if (isNaN(qty) || qty <= 0) {
          setEditEntryId(null);
          return;
        }
        setActiveLog({
          ...activeLog,
          [meal]: activeLog[meal].map(e => {
            if (e.id !== editEntryId) return e;
            return recalcEntryQuantity(e, qty);
          })
        });
        setEditEntryId(null);
        notify(uiText("Quantidade atualizada.", "Amount updated.", "Cantidad actualizada."));
      }
      function openAddForMeal(meal) {
        setAddEntry(a => ({
          ...a,
          meal,
          foodId: "",
          foodSearch: "",
          qty: ""
        }));
        setStaged(s => ({
          ...s,
          meal
        }));
        setDescribeMeal(meal);
        setBatchMode(pantry.length > 0);
        setDescribeMode(pantry.length === 0);
        openTab("adicionar");
      }
      function addToLog() {
        if (!pantry.length) {
          notify(uiText(
            "Cadastre alimentos na despensa primeiro, ou use Descrever prato.",
            "Add foods to the pantry first, or use Describe dish.",
            "Primero registra alimentos en la despensa o usa Describir plato."
          ));
          return;
        }
        if (!addEntry.foodId || !addEntry.qty) return;
        const food = pantry.find(f => f.id === addEntry.foodId);
        if (!food) return;
        const entry = buildEntry(food, parseFloat(addEntry.qty));
        setActiveLog({
          ...activeLog,
          [addEntry.meal]: [...(activeLog[addEntry.meal] || []), entry]
        });
        setAddEntry(e => ({
          ...e,
          qty: "",
          foodSearch: "",
          foodId: ""
        }));
        notify(uiText(`${food.name} adicionado.`, `${food.name} added.`, `${food.name} añadido.`));
      }
      function addToStaged() {
        if (!pantry.length) {
          notify(uiText(
            "Cadastre alimentos na despensa primeiro, ou use Descrever prato.",
            "Add foods to the pantry first, or use Describe dish.",
            "Primero registra alimentos en la despensa o usa Describir plato."
          ));
          return;
        }
        if (!addEntry.foodId || !addEntry.qty) return;
        const food = pantry.find(f => f.id === addEntry.foodId);
        if (!food) return;
        setStaged(s => ({
          ...s,
          items: [...s.items, buildEntry(food, parseFloat(addEntry.qty))]
        }));
        setAddEntry(e => ({
          ...e,
          foodId: "",
          foodSearch: "",
          qty: ""
        }));
      }
      function removeFromStaged(idx) {
        setStaged(s => ({
          ...s,
          items: s.items.filter((_, i) => i !== idx)
        }));
      }
      function commitStaged() {
        if (!pantry.length) {
          notify(uiText(
            "Cadastre alimentos na despensa primeiro, ou use Descrever prato.",
            "Add foods to the pantry first, or use Describe dish.",
            "Primero registra alimentos en la despensa o usa Describir plato."
          ));
          return;
        }
        if (!staged.items.length) return;
        const meal = staged.meal;
        const items = [...staged.items];
        setActiveLog(previous => ({
          ...previous,
          [meal]: [...(previous[meal] || []), ...items]
        }));
        setStaged(current => ({...current, items: []}));
        notify(uiText("Refeição registrada.", "Meal logged.", "Comida registrada."));
      }
      function evaluateStagedMeal() {
        if (!staged.items.length) return;
        openMealReview(staged.meal, staged.items, "staged");
      }
      function removeEntry(meal, id) {
        setActiveLog({
          ...activeLog,
          [meal]: activeLog[meal].filter(e => e.id !== id)
        });
        setEntryMenuId(null);
      }
      function duplicateEntry(meal, entry) {
        const copy = {
          ...entry,
          id: Date.now().toString() + Math.random(),
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        setActiveLog({
          ...activeLog,
          [meal]: [...(activeLog[meal] || []), copy]
        });
        setEntryMenuId(null);
        notify(uiText("Registro duplicado.", "Entry duplicated.", "Registro duplicado."));
      }

      // Templates
      function openSaveTemplateModal() {
        if (!staged.items.length) return;
        setTemplateName("");
        setShowSaveTemplateModal(true);
      }
      function saveTemplate() {
        if (!templateName.trim() || !staged.items.length) return;
        const t = {
          id: Date.now().toString(),
          name: templateName.trim(),
          meal: staged.meal,
          items: staged.items.map(e => ({
            foodId: e.foodId,
            name: e.name,
            qty: e.qty,
            unit: e.unit,
            protein: e.protein,
            kcal: e.kcal,
            carbs: e.carbs,
            fat: e.fat,
            fiber: e.fiber,
            salt: e.salt,
            foodSnapshot: e.foodSnapshot ? {...e.foodSnapshot} : null
          }))
        };
        setMealTemplates(mt => [...mt, t]);
        setTemplateName("");
        setShowSaveTemplateModal(false);
        notify(uiText("Modelo salvo.", "Meal template saved.", "Modelo guardado."));
      }
      function deleteTemplate(id) {
        const tmpl = mealTemplates.find(t => t.id === id);
        const ok = window.confirm(uiText(
          `Apagar a refeição salva "${tmpl?.name || ""}"?`,
          `Delete saved meal "${tmpl?.name || ""}"?`,
          `¿Eliminar la comida guardada "${tmpl?.name || ""}"?`
        ));
        if (!ok) return;
        if (editingTemplateId === id) cancelTemplateEdit();
        setMealTemplates(mt => mt.filter(t => t.id !== id));
        setExpandedTemplateIds(prev => {
          const next = {...prev};
          delete next[id];
          return next;
        });
        notify(uiText("Refeição salva apagada.", "Saved meal deleted.", "Comida guardada eliminada."));
      }
      function loadTemplate(t) {
        const items = templateEntries(t).filter(Boolean);
        setStaged({
          meal: t.meal,
          items
        });
        setBatchMode(true);
        notify(uiText(`"${t.name}" carregado.`, `"${t.name}" loaded.`, `"${t.name}" cargado.`));
      }
      function appendTemplateToStaged(t) {
        const items = templateEntries(t).filter(Boolean);
        if (!items.length) {
          notify(uiText(
            "Nenhum ingrediente da refeição salva foi encontrado na despensa.",
            "No ingredient from the saved meal was found in the pantry.",
            "No se encontró ningún ingrediente de la comida guardada en la despensa."
          ));
          return;
        }
        setStaged(s => ({
          meal: s.items.length ? s.meal : t.meal,
          items: [...s.items, ...items]
        }));
        setBatchMode(true);
        notify(uiText(`"${t.name}" adicionada à preparação.`, `"${t.name}" added to the meal in progress.`, `"${t.name}" añadida a la preparación.`));
      }
      function pctOf(value, target) {
        return target ? Math.round(value / target * 100) : 0;
      }
      function toggleTemplateExpanded(id) {
        setExpandedTemplateIds(prev => ({...prev, [id]: !prev[id]}));
      }
      function loadRecentMealToStaged(recentMeal) {
        const items = recentMeal.entries.map(e => ({
          ...e,
          id: Date.now().toString() + Math.random()
        }));
        setStaged({
          meal: recentMeal.meal,
          items
        });
        setBatchMode(true);
        setShowRecentMeals(false);
        notify(uiText(
          `"${recentMeal.meal}" de ${recentMeal.date} carregada. Ajuste e registre.`,
          `"${recentMeal.meal}" from ${recentMeal.date} loaded. Adjust and log it.`,
          `"${recentMeal.meal}" de ${recentMeal.date} cargada. Ajusta y registra.`
        ));
      }
      function saveEditStaged() {
        const qty = parseFloat(editStagedQty);
        if (isNaN(qty) || qty <= 0) {
          setEditStagedIdx(null);
          return;
        }
        setStaged(s => ({
          ...s,
          items: s.items.map((item, i) => {
            if (i !== editStagedIdx) return item;
            return recalcEntryQuantity(item, qty);
          })
        }));
        setEditStagedIdx(null);
      }

      // Backfills a dated BMR snapshot for existing weight measurements once the
      // required profile fields are available. Future edits keep it synchronized.
      useEffect(() => {
        if (!loaded || !profileData.birthDate || !profileData.gender || !profileData.height) return;
        setWeightHistory(history => {
          let changed = false;
          const next = normalizeWeightHistory(history).map(item => {
            const bmr = calculateBmrForMeasurement(item, bmrMeasurementContext);
            if (!bmr || Number(item.bmr) === bmr) return item;
            changed = true;
            return {...item, bmr};
          });
          return changed ? next : history;
        });
      }, [loaded, profileData.birthDate, profileData.gender, profileData.height]);

      // Saves the daily measurement record. Optional body-composition fields stay in
      // the same weightHistory entry so charts, forecasts and exports can read one
      // chronological source of truth.
      function saveWeight() {
        if (!weightForm.weight && !weightForm.height && !weightForm.bodyFatPct && !weightForm.waistCm && !weightForm.muscleMassKg) return;
        const entryDate = weightForm.date || TODAY;
        const existing = getWeightForDate(weightHistory, entryDate);
        const entry = {
          id: existing?.id || Date.now().toString(),
          date: entryDate,
          weight: optionalNumber(weightForm.weight) ?? existing?.weight ?? currentWeight ?? null,
          height: optionalNumber(weightForm.height) ?? existing?.height ?? currentHeight ?? null,
          bodyFatPct: optionalNumber(weightForm.bodyFatPct) ?? existing?.bodyFatPct ?? null,
          waistCm: optionalNumber(weightForm.waistCm) ?? existing?.waistCm ?? null,
          muscleMassKg: optionalNumber(weightForm.muscleMassKg) ?? existing?.muscleMassKg ?? null
        };
        entry.bmr = calculateBmrForMeasurement(entry, bmrMeasurementContext) ?? existing?.bmr ?? null;
        setWeightHistory(h => upsertWeightEntry(normalizeWeightHistory(h), entry));
        setWeightForm({
          weight: "",
          height: "",
          bodyFatPct: "",
          waistCm: "",
          muscleMassKg: "",
          date: TODAY
        });
        notify(uiText("Peso atualizado.", "Weight updated.", "Peso actualizado."));
      }
      function startEditWeight(e) {
        setEditingWeightId(e.date);
        setEditWeightForm({
          weight: String(e.weight),
          height: e.height ? String(e.height) : "",
          bodyFatPct: e.bodyFatPct ? String(e.bodyFatPct) : "",
          waistCm: e.waistCm ? String(e.waistCm) : "",
          muscleMassKg: e.muscleMassKg ? String(e.muscleMassKg) : "",
          date: e.date
        });
      }
      // Updates an existing measurement while keeping optional fields nullable.
      // Null values mean "not measured", not zero.
      function saveWeightEdit() {
        if (!editWeightForm.weight) return;
        const original = weightHistory.find(e => e.date === editingWeightId) || {};
        const entry = {
          ...original,
          id: original.id || Date.now().toString(),
          date: editWeightForm.date || original.date || TODAY,
          weight: optionalNumber(editWeightForm.weight),
          height: optionalNumber(editWeightForm.height) ?? original.height ?? null,
          bodyFatPct: optionalNumber(editWeightForm.bodyFatPct),
          waistCm: optionalNumber(editWeightForm.waistCm),
          muscleMassKg: optionalNumber(editWeightForm.muscleMassKg)
        };
        entry.bmr = calculateBmrForMeasurement(entry, bmrMeasurementContext) ?? original.bmr ?? null;

        setWeightHistory(h => upsertWeightEntry(normalizeWeightHistory(h), entry, editingWeightId));
        setEditingWeightId(null);
        notify(uiText("Registro atualizado.", "Record updated.", "Registro actualizado."));
      }

      // Export/Import
      // Gemini AI helper
      async function callAI(prompt, maxTokens) {
        try {
          return await requestGroqCompletion(prompt, maxTokens);
        } catch (error) {
          if (error instanceof GroqClientError && error.code === "missing-api-key") {
            throw new Error(uiText(
              "Chave API Groq não configurada. Abra as Configurações.",
              "Groq API key is not configured. Open Settings.",
              "La clave API de Groq no está configurada. Abre Configuración."
            ));
          }
          if (error instanceof GroqClientError && error.code === "api-error") {
            throw new Error(error.providerMessage || uiText("Erro na API Groq", "Groq API error", "Error en la API de Groq"));
          }
          throw error;
        }
      }
      function aiLang() {
        const normalizedLang = normalizeLanguage(lang);
        if (normalizedLang === 'en') return '\nRespond in American English.\n';
        if (normalizedLang === 'es') return '\nResponde en espa\u00f1ol.\n';
        return '\nResponda em portugu\u00eas do Brasil.\n';
      }

      // Normalizes LLM confidence labels across PT/EN/ES so UI color does not
      // depend on the exact language used by the model response.
      function confidenceColor(confidence) {
        const normalizedConfidence = String(confidence || "").trim().toLowerCase();
        if (["alta", "high"].includes(normalizedConfidence)) return "#6ec8a9";
        if (["media", "média", "medium"].includes(normalizedConfidence)) return "#c8a96e";
        return "#c86e8e";
      }

      /**
       * Fallback full-backup builder used only if the Firebase adapter has not
       * exposed exportFullAccountBackup yet. It cannot see legacy documents, so the
       * adapter-level exporter remains the authoritative complete backup path.
       */
      async function buildLegacyFullBackup() {
        const result = {};
        const listed = await storage.list();
        const allKeys = listed?.keys || [];
        const staticKeys = [
          'pantry_v2', 'suppPantry', 'waterGoal', 'waterCustomPreset', 'customGoals', 'goalHistory',
          'mealTemplates', 'weightHistory', 'trainingByDate',
          'activityLevel', 'goalType', 'goalKg', 'goalWeeks',
          'manualCalorieAdjustment', 'proteinMultiplier', 'bodyFatGoal'
        ];
        const toFetch = [...new Set([...staticKeys, ...allKeys])].filter(key => getBackupCategory(key));

        for (let i = 0; i < toFetch.length; i += 20) {
          await Promise.all(toFetch.slice(i, i + 20).map(async key => {
            try {
              const r = await storage.get(key);
              if (r && r.value !== undefined && r.value !== null) result[key] = r.value;
            } catch (_) {}
          }));
        }

        return {
          exportedAt: new Date().toISOString(),
          version: 2,
          data: result
        };
      }

      /**
       * Reads a selected backup file and parses it as JSON.
       * Input: File from an import input. Output: parsed JSON object.
       */
      function readBackupJsonFile(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = event => {
            try {
              resolve(JSON.parse(event.target.result));
            } catch (error) {
              reject(new Error(uiText("JSON de backup inválido.", "Invalid backup JSON.", "JSON de copia de seguridad inválido.")));
            }
          };
          reader.onerror = () => reject(new Error(uiText("Não foi possível ler o arquivo de backup.", "Could not read backup file.", "No se pudo leer el archivo de copia de seguridad.")));
          reader.readAsText(file);
        });
      }

      /**
       * Opens the dry-run import dialog and resolves with the selected categories.
       * Input: preview object returned by previewFullAccountBackupImport().
       * Output: null when cancelled, or {categories:{[categoryId]: "append"|"replace"}}.
       */
      function requestBackupImportConfirmation(preview) {
        return new Promise(resolve => {
          setBackupImportPreview({
            preview,
            selections: {},
            resolve
          });
        });
      }

      /**
       * Toggles one importable backup category in the preview dialog.
       * A checked category starts without a strategy so the user must explicitly
       * choose between appending and replacing before import can proceed.
       */
      function setBackupImportCategory(categoryId, checked) {
        setBackupImportPreview(current => {
          if (!current) return current;
          const selections = {...(current.selections || {})};
          if (checked) selections[categoryId] = "";
          else delete selections[categoryId];
          return {...current, selections};
        });
      }

      /**
       * Sets append/replace for a selected backup category in the preview dialog.
       */
      function setBackupImportStrategy(categoryId, strategy) {
        setBackupImportPreview(current => {
          if (!current) return current;
          return {
            ...current,
            selections: {
              ...(current.selections || {}),
              [categoryId]: strategy
            }
          };
        });
      }

      /**
       * Closes the dry-run import dialog and resolves the pending import flow.
       */
      function closeBackupImportPreview(result) {
        const resolver = backupImportPreview && typeof backupImportPreview.resolve === "function"
          ? backupImportPreview.resolve
          : null;
        setBackupImportPreview(null);
        if (resolver) resolver(result);
      }

      /**
       * Imports a complete account backup after a mandatory dry-run preview.
       * The backup file may come from the current v3 exporter or from older shapes;
       * only useful user data categories are offered for restoration.
       */
      async function importFullBackup(e) {
        const file = e.target.files?.[0];
        if (!file) return {cancelled: true};

        try {
          const rawBackup = await readBackupJsonFile(file);
          const preview = window.previewFullAccountBackupImport
            ? await window.previewFullAccountBackupImport(rawBackup)
            : null;

          if (!preview || preview.ok === false) {
            const errors = preview?.errors?.length ? preview.errors.join(" ") : "";
            notify(uiText("Backup inválido. ", "Invalid backup. ", "Copia de seguridad inválida. ") + errors);
            return {cancelled: true};
          }

          const categories = (preview.categories || []).filter(category => category.total > 0);
          if (!categories.length) {
            notify(uiText(
              "Nenhum dado restaurável foi encontrado neste backup.",
              "No restorable data was found in this backup.",
              "No se encontraron datos restaurables en esta copia de seguridad."
            ));
            return {cancelled: true};
          }

          const selectedOptions = await requestBackupImportConfirmation({...preview, categories});
          if (!selectedOptions) return {cancelled: true};

          if (!window.importFullAccountBackup) {
            notify(uiText("Importador de backup indisponível.", "Backup importer is not available.", "El importador de copias de seguridad no está disponible."));
            return {cancelled: true};
          }

          const result = await window.importFullAccountBackup(rawBackup, selectedOptions);
          notify(uiText(
            `Importação concluída: ${result.imported || 0} registros. Recarregue a página.`,
            `Import complete: ${result.imported || 0} records. Reload the page.`,
            `Importación completada: ${result.imported || 0} registros. Recarga la página.`
          ));
          return result;
        } catch (error) {
          notify(uiText("Erro ao importar: ", "Import error: ", "Error al importar: ") + (error?.message || String(error)));
          return {cancelled: true};
        } finally {
          e.target.value = "";
        }
      }
      // Export specific data types and download as .json
      async function exportAndDownload(type) {
        const L = uiText;
        const today = TODAY;
        try {
          let data = {};
          let filename = '';

          if (type === 'all') {
            const backup = window.exportFullAccountBackup
              ? await window.exportFullAccountBackup()
              : await buildLegacyFullBackup();
            filename = 'backup_completo_' + today + '.json';
            await exportFile({
              content: JSON.stringify(backup, null, 2),
              filename,
              mimeType: 'application/json'
            });

          } else if (type === 'pantry') {
            const r = await storage.get('pantry_v2');
            data = {pantry_v2: r?.value || '[]'};
            filename = 'despensa_' + today + '.json';
            await exportFile({
              content: JSON.stringify({exportedAt:new Date().toISOString(),type:'pantry',data},null,2),
              filename,
              mimeType: 'application/json'
            });

          } else if (type === 'today') {
            const entries = Object.values(activeLog).flat();
            data = {date:today, isTraining, goals, meals:activeLog, totals:buildDayTotals(activeLog)};
            filename = 'diario_' + today + '.json';
            await exportFile({
              content: JSON.stringify({exportedAt:new Date().toISOString(),type:'day',data},null,2),
              filename,
              mimeType: 'application/json'
            });

          } else if (type === 'week' || type === 'month') {
            const days_n = type === 'week' ? 7 : 30;
            const days = [];
            for (let i = days_n-1; i >= 0; i--) {
              const d = new Date(); d.setDate(d.getDate()-i);
              const date = d.toISOString().split('T')[0];
              let dayLog = date === TODAY ? log : {};
              if (date !== TODAY) {
                const l = await storage.get('log_v2_'+date).catch(()=>null);
                if (l) dayLog = normalizeMealKeys(JSON.parse(l.value));
              }
              days.push({date, isTraining:trainingByDate[date] ?? true, totals:buildDayTotals(dayLog), meals:dayLog});
            }
            filename = (type==='week'?'semana':'mes') + '_' + today + '.json';
            await exportFile({
              content: JSON.stringify({exportedAt:new Date().toISOString(),type,days},null,2),
              filename,
              mimeType: 'application/json'
            });

          } else if (type === 'weight') {
            const whr = await storage.get('weightHistory').catch(()=>null);
            const whData = whr?.value ? JSON.parse(whr.value) : weightHistory;
            data = {weightHistory: whData};
            filename = 'peso_' + today + '.json';
            await exportFile({
              content: JSON.stringify({exportedAt:new Date().toISOString(),type:'weight',data},null,2),
              filename,
              mimeType: 'application/json'
            });
          }

          notify(L('Arquivo baixado!', 'File downloaded!', 'Archivo descargado!'));
        } catch(e) {
          notify(L('Erro ao exportar: ', 'Export error: ', 'Error al exportar: ') + e.message);
        }
      }

      async function exportFullBackup(options = {}) {
        setBackupLoading(true);
        setBackupJson(null);
        try {
          const backup = window.exportFullAccountBackup
            ? await window.exportFullAccountBackup()
            : await buildLegacyFullBackup();
          const json = JSON.stringify(backup, null, 2);
          setBackupJson(json);
          const exportResult = await exportFile({
            content: json,
            filename: 'backup_completo_' + TODAY + '.json',
            mimeType: 'application/json',
            ...(options.destination ? {destination: options.destination} : {})
          });
          if (exportResult?.cancelled) return exportResult;
          notify(text('notifBackupDone'));
          return exportResult;
        } catch (e) {
          notify(uiText("Erro ao exportar: ", "Export error: ", "Error al exportar: ") + e.message);
          return {error: e};
        } finally {
          setBackupLoading(false);
        }
      }
      function exportCSV() {
        const headers = ["name", "unit", ...ALL_FIELDS_KEYS.map(f => f.key)];
        const rows = pantry.map(food => headers.map(h => {
          const v = food[h];
          if (v == null || v === "") return "";
          if (typeof v === "string" && v.includes(",")) return `"${v}"`;
          return v;
        }).join(","));
        const csv = [headers.join(","), ...rows].join("\n");
        navigator.clipboard.writeText(csv).then(() => notify(uiText("CSV da despensa copiado para a área de transferência!", "Pantry CSV copied to clipboard!", "CSV de despensa copiado al portapapeles!"))).catch(() => {
          setBackupJson(csv);
          notify(uiText("Copie o texto que apareceu abaixo.", "Copy the text shown below.", "Copia el texto que aparece abajo."));
        });
      }
      function importCSV(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = evt => {
          try {
            const lines = evt.target.result.split("\n").filter(l => l.trim());
            const headers = lines[0].split(",").map(h => h.trim());
            const imported = lines.slice(1).map(line => {
              const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
              const food = {
                id: Date.now().toString() + Math.random()
              };
              headers.forEach((h, i) => {
                const v = vals[i];
                if (h === "name" || h === "unit") food[h] = v || "";else food[h] = v === "" || v == null ? null : parseFloat(v);
              });
              return food;
            }).filter(f => f.name);
            if (!imported.length) {
              notify(text('notifNoFood'));
              return;
            }
            setPantry(p => {
              const ex = new Set(p.map(f => f.name.toLowerCase()));
              const news = imported.filter(f => !ex.has(f.name.toLowerCase()));
              notify(uiText(`${news.length} importado(s).`, `${news.length} imported.`, `${news.length} importado(s).`));
              return [...p, ...news];
            });
          } catch (_) {
            notify(uiText("Erro ao ler arquivo.", "Error reading file.", "Error al leer el archivo."));
          }
        };
        reader.readAsText(file);
        e.target.value = "";
      }
      function exportMeals() {
        const meals = {};
        Object.entries(activeLog).forEach(([m, en]) => {
          if (en?.length) meals[m] = en;
        });
        const json = JSON.stringify({
          date: viewDate,
          meals
        }, null, 2);
        setBackupJson(json);
      notify(uiText("JSON gerado. Copie a partir da seção Backup.", "JSON generated. Copy it from the Backup section.", "JSON generado. Cópialo desde la sección de copias de seguridad."));
      }
      function importMeals(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = evt => {
          try {
            const data = JSON.parse(evt.target.result);
            const meals = data.meals || data;
            let count = 0;
            const newLog = {
              ...activeLog
            };
            Object.entries(meals).forEach(([meal, entries]) => {
              const wi = entries.map(en => ({
                ...en,
                id: Date.now().toString() + Math.random()
              }));
              newLog[meal] = [...(newLog[meal] || []), ...wi];
              count += entries.length;
            });
            setActiveLog(newLog);
            notify(uiText(
              `${count} item(ns) importado(s).`,
              `${count} item(s) imported.`,
              `${count} elemento(s) importado(s).`
            ));
          } catch (_) {
            notify(uiText("Erro ao importar.", "Import error.", "Error al importar."));
          }
        };
        reader.readAsText(file);
        e.target.value = "";
      }
      function exportDayLog() {
        const json = JSON.stringify({
          date: viewDate,
          isTraining,
          goals,
          log: activeLog
        }, null, 2);
        setBackupJson(json);
      notify(uiText(
        "JSON do dia gerado. Copie a partir da seção Backup.",
        "Day JSON generated. Copy it from the Backup section.",
        "JSON del día generado. Cópialo desde la sección Backup."
      ));
      }
      function importDayLog(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = evt => {
          try {
            const data = JSON.parse(evt.target.result);
            if (!data.log) {
              notify(uiText("Formato inválido.", "Invalid format.", "Formato inválido."));
              return;
            }
            if (window.confirm(uiText(
              "Substituir o registro atual pelo arquivo importado?",
              "Replace the current record with the imported file?",
              "¿Sustituir el registro actual por el archivo importado?"
            ))) {
              setActiveLog(data.log);
              notify(uiText("Registro importado.", "Record imported.", "Registro importado."));
            }
          } catch (_) {
            notify(uiText("Erro ao importar.", "Import error.", "Error al importar."));
          }
        };
        reader.readAsText(file);
        e.target.value = "";
      }
      const allEntries = Object.values(activeLog).flat();
      const tot = buildActiveLogTotals(activeLog, text('kcalUnit'));
      function mealScoreGoals() {
        return {
          protein: Number(goals.protein) || 0,
          kcal: Number(goals.kcal) || 0,
          fiber: Number(goals.fiber) || 0,
          salt: Number(goals.salt) || 0
        };
      }
      function evaluateMealItems(items, now = new Date()) {
        if (!window.MealScore || typeof window.MealScore.calculateMealScore !== "function") return null;
        return window.MealScore.calculateMealScore({
          candidateEntries: items,
          consumedEntries: allEntries,
          goals: mealScoreGoals(),
          now
        });
      }
      function mealScoreLabel(key) {
        return {
          protein: text('protein'),
          kcal: text('calories'),
          fiber: text('fiber'),
          salt: text('salt')
        }[key] || key;
      }
      function mealScoreEvaluationCount(result) {
        const components = Object.values(result?.components || {});
        return {
          evaluated: components.filter(component => component.available).length,
          total: components.length
        };
      }
      function mealScoreEvaluationText(result) {
        const count = mealScoreEvaluationCount(result);
        return uiText("Nutrientes avaliados: ", "Nutrients evaluated: ", "Nutrientes evaluados: ") + count.evaluated + " " + uiText("de", "of", "de") + " " + count.total;
      }
      function mealScoreBrief(result) {
        if (!result || !result.valid) return uiText(
          "Não foi possível calcular a nota com os dados disponíveis.",
          "The available data is not enough to calculate a score.",
          "Los datos disponibles no permiten calcular la nota."
        );
        const available = Object.values(result.components).filter(component => component.available);
        const ordered = [...available].sort((a, b) => b.score - a.score);
        const best = ordered.filter(component => component.score >= 0.85).slice(0, 2).map(component => mealScoreLabel(component.key));
        const worst = [...available].sort((a, b) => a.score - b.score)[0];
        const positiveText = best.length
          ? uiText("Pontos fortes: ", "Strengths: ", "Puntos fuertes: ") + best.join(", ") + "."
          : uiText("A refeição ainda pode ser melhor alinhada ao restante do dia.", "The meal can be aligned better with the rest of the day.", "La comida puede alinearse mejor con el resto del día.");
        const cautionText = worst && worst.score < 0.8
          ? " " + uiText("Principal atenção: ", "Main concern: ", "Principal atención: ") + mealScoreLabel(worst.key) + "."
          : " " + uiText("Nenhum componente avaliado apresenta um desvio importante.", "No evaluated component has a major deviation.", "Ningún componente evaluado presenta un desvío importante.");
        return positiveText + cautionText;
      }
      function mealScoreSnapshot(result) {
        return {
          algorithmVersion: result.algorithmVersion,
          score: result.score,
          coverage: result.coverage,
          evaluatedAt: result.evaluatedAt,
          hoursLeft: result.hoursLeft,
          windowHours: result.windowHours,
          components: result.components
        };
      }
      async function generateMealReviewExplanation(review) {
        setMealReviewAiText("");
        setMealReviewAiLoading(true);
        const explanationRequest = requestMealReviewExplanation(review, lang);
        try {
          const explanation = await explanationRequest;
          setMealReviewAiText(explanation);
        } catch (_) {
          setMealReviewAiText("");
        } finally {
          setMealReviewAiLoading(false);
        }
      }
      function openMealReview(meal, items, source) {
        const candidateItems = [...(items || [])];
        const result = evaluateMealItems(candidateItems);
        if (!result || !result.valid) {
          notify(uiText(
            "A refeição precisa ter calorias e proteínas para ser avaliada.",
            "The meal needs calories and protein to be evaluated.",
            "La comida necesita calorías y proteínas para ser evaluada."
          ));
          return;
        }
        const review = { meal, items: candidateItems, source, result };
        setMealReviewHelpOpen(false);
        setMealReview(review);
        generateMealReviewExplanation(review);
      }
      function confirmMealReview() {
        if (!mealReview) return;
        const evaluationId = Date.now().toString() + Math.random();
        const snapshot = mealScoreSnapshot(mealReview.result);
        const savedItems = mealReview.items.map(item => ({
          ...item,
          mealEvaluationId: evaluationId,
          mealScoreSnapshot: snapshot
        }));
        setActiveLog({
          ...activeLog,
          [mealReview.meal]: [...(activeLog[mealReview.meal] || []), ...savedItems]
        });
        if (mealReview.source === "staged") {
          setStaged(current => ({...current, items: []}));
        }
        if (mealReview.source === "described") {
          setDescribeResult(null);
          setMealDescription("");
        }
        setMealReview(null);
        setMealReviewHelpOpen(false);
        setMealReviewAiText("");
        notify(uiText("Refeição registrada.", "Meal logged.", "Comida registrada."));
      }
      const stagedTot = {
        protein: staged.items.reduce((s, e) => s + (e.protein ?? 0), 0),
        kcal: staged.items.reduce((s, e) => s + (e.kcal ?? 0), 0),
        carbs: staged.items.reduce((s, e) => s + (e.carbs ?? 0), 0)
      };
      const dailyMicros = MICRO_FIELDS.map(field => ({
        ...field,
        value: allEntries.reduce((sum, entry) => sum + (Number(entry[field.key.replace("100", "")]) || 0), 0)
      }));
      const hasMicros = dailyMicros.some(field => field.value !== 0);

      const selectedFood = addEntry.foodId ? pantry.find(f => f.id === addEntry.foodId) : null;
      const scannerVideoElement = barcodeModalOpen ? /*#__PURE__*/React.createElement("video", {
        ref: videoRef,
        className: "phrona-barcode-video-anchor",
        playsInline: true,
        muted: true,
        style: {
          width: "100%",
          minHeight: 150,
          maxHeight: 220,
          objectFit: "cover",
          borderRadius: 8,
          background: "var(--bg)",
          border: "1px solid var(--border2)",
          display: barcodeScanning ? "block" : "none",
          marginBottom: 8
        }
      }) : null;
      const filteredPantry = pantrySearch ? pantry.filter(f => f.name.toLowerCase().includes(pantrySearch.toLowerCase())) : pantry;
      const sortedPantry = [...filteredPantry].sort((a, b) => (a.name || "").localeCompare(b.name || "", sortLocaleForLang(lang), { sensitivity: "base" }));
      const sortedAllPantry = [...pantry].sort((a, b) => (a.name || "").localeCompare(b.name || "", sortLocaleForLang(lang), { sensitivity: "base" }));
      const remainProtein = Math.max(0, Math.round(goals.protein - tot.protein));
      const remainKcal = Math.max(0, Math.round(goals.kcal - tot.kcal));
      const dayProteinPct = goals.protein ? Math.round(tot.protein / goals.protein * 100) : 0;
      const dayKcalPct = goals.kcal ? Math.round(tot.kcal / goals.kcal * 100) : 0;
      const diaryStatusCode = classifyDiaryStatus({
        entryCount: allEntries.length,
        proteinPercent: dayProteinPct,
        kcalPercent: dayKcalPct
      });
      const diaryStatus = (() => {
        if (diaryStatusCode === "empty") return {
          tone: "muted",
          title: uiText("Nenhuma refeição registrada ainda", "No meals logged yet", "Aún no hay comidas registradas"),
          text: uiText(
            "Registre sua primeira refeição do dia.",
            "Log your first meal of the day.",
            "Registra tu primera comida del día."
          )
        };
        if (diaryStatusCode === "calories-high") return {
          tone: "warn",
          title: uiText("Calorias acima do ideal", "Calories are running high", "Calorías por encima de lo ideal"),
          text: uiText(
            "Você passou da faixa confortável de hoje. Priorize escolhas mais leves e com boa proteína.",
            "You are past the comfortable range for today. Prioritize lighter, protein-focused choices.",
            "Ya pasaste la zona cómoda de hoy. Prioriza opciones más ligeras y con buena proteína."
          )
        };
        if (diaryStatusCode === "protein-lagging") return {
          tone: "warn",
          title: uiText("Proteína está ficando para trás", "Protein is lagging behind", "La proteína se está quedando atrás"),
        text: uiText(
          "As calorias estão avançando mais rápido que a proteína. Uma opção proteica magra pode equilibrar o dia.",
          "Calories are moving faster than protein. A lean protein option may help balance the day.",
          "Las calorías avanzan más rápido que la proteína. Una opción proteica magra puede equilibrar el día."
        )
        };
        if (diaryStatusCode === "on-target") return {
          tone: "ok",
          title: uiText("Bom caminho para hoje", "Good path for today", "Buen camino para hoy"),
          text: uiText(
            "A proteína está coberta e as calorias seguem controladas.",
            "Protein is covered and calories are still controlled.",
            "La proteína está cubierta y las calorías siguen controladas."
          )
        };
        return {
          tone: "info",
          title: uiText("No caminho", "On track", "En buen camino"),
          text: uiText(
            "Observe o que ainda falta antes de escolher a próxima refeição.",
            "Keep an eye on what remains before choosing the next meal.",
            "Mira lo que todavía falta antes de elegir la próxima comida."
          )
        };
      })();
      useEffect(() => {
        if (!loaded || !goals) return;
        const metrics = getReachedGoalMetrics({tot, goals, isToday, totalWater});
        metrics.forEach(metric => {
          const storageKey = `nutrition_goal_toast_seen_${viewDate}_${metric.key}`;
          if (typeof window !== "undefined" && window.localStorage.getItem(storageKey)) return;
          if (typeof window !== "undefined") window.localStorage.setItem(storageKey, "1");
          queueGoalToast({
            key: metric.key,
            tone: metric.tone,
            text: pickGoalToastPhrase(metric.key),
            detail: formatGoalToastValue(metric.value, metric.target, metric.unit)
          });
        });
      }, [
        loaded,
        viewDate,
        lang,
        isToday,
        totalWater,
        tot.protein,
        tot.kcal,
        tot.carbs,
        tot.fat,
        tot.fiber,
        tot.salt,
        goals.protein,
        goals.kcal,
        goals.carbs,
        goals.fat,
        goals.fiber,
        goals.salt,
        goals.water
      ]);
      const dateStr = formatHeaderDate(viewDate, lang);
      function beginTemplateEdit(tmpl) {
        setEditingTemplateId(tmpl.id);
        setExpandedTemplateIds(prev => ({...prev, [tmpl.id]: true}));
        setTemplateEditDraft({
          name: tmpl.name || "",
          meal: tmpl.meal || MEALS[0],
          addFoodId: "",
          addQty: "",
          items: (tmpl.items || []).map(item => ({...item}))
        });
      }
      function cancelTemplateEdit() {
        setEditingTemplateId(null);
        setTemplateEditDraft(null);
      }
      function updateTemplateDraftItem(idx, patch) {
        setTemplateEditDraft(d => ({
          ...d,
          items: d.items.map((item, i) => i === idx ? {...item, ...patch} : item)
        }));
      }
      function removeTemplateDraftItem(idx) {
        setTemplateEditDraft(d => ({
          ...d,
          items: d.items.filter((_, i) => i !== idx)
        }));
      }
      function addTemplateDraftItem() {
        if (!templateEditDraft?.addFoodId || !templateEditDraft?.addQty) return;
        const food = pantry.find(f => f.id === templateEditDraft.addFoodId);
        const qty = parseFloat(templateEditDraft.addQty);
        if (!food || isNaN(qty) || qty <= 0) return;
        const entry = buildEntry(food, qty);
        setTemplateEditDraft(d => ({
          ...d,
          addFoodId: "",
          addQty: "",
          items: [...d.items, {
            foodId: entry.foodId,
            name: entry.name,
            qty: entry.qty,
            unit: entry.unit,
            protein: entry.protein,
            kcal: entry.kcal,
            carbs: entry.carbs,
            fat: entry.fat,
            fiber: entry.fiber,
            salt: entry.salt,
            foodSnapshot: entry.foodSnapshot ? {...entry.foodSnapshot} : null
          }]
        }));
      }
      function saveTemplateEdit() {
        if (!editingTemplateId || !templateEditDraft || !templateEditDraft.name.trim() || !templateEditDraft.items.length) return;
        const updated = {
          id: editingTemplateId,
          name: templateEditDraft.name.trim(),
          meal: templateEditDraft.meal,
          items: templateEditDraft.items.map(item => {
            const qty = Number(item.qty) || 0;
            const refreshed = templateItemEntry({...item, qty});
            return {
              foodId: item.foodId,
              name: item.name,
              qty,
              unit: item.unit,
              protein: refreshed.protein,
              kcal: refreshed.kcal,
              carbs: refreshed.carbs,
              fat: refreshed.fat,
              fiber: refreshed.fiber,
              salt: refreshed.salt,
              foodSnapshot: item.foodSnapshot ? {...item.foodSnapshot} : null
            };
          })
        };
        setMealTemplates(list => list.map(t => t.id === editingTemplateId ? updated : t));
        cancelTemplateEdit();
        notify(uiText("Refeição salva atualizada.", "Saved meal updated.", "Comida guardada actualizada."));
      }
      function renderSavedMealCard(tmpl, context) {
        return React.createElement(SavedMealCard, {
          key: tmpl.id,
          template: tmpl,
          context,
          goals,
          lang,
          expanded: !!expandedTemplateIds[tmpl.id],
          isMobileView,
          isEditing: editingTemplateId === tmpl.id,
          editDraft: templateEditDraft,
          mealOptions: MEALS,
          pantryFoods: sortedAllPantry,
          getMealLabel: mealLabel,
          onToggleExpanded: toggleTemplateExpanded,
          onAppend: appendTemplateToStaged,
          onEdit: beginTemplateEdit,
          onLoad: loadTemplate,
          onDelete: deleteTemplate,
          onEditDraftChange: setTemplateEditDraft,
          onUpdateItem: updateTemplateDraftItem,
          onRemoveItem: removeTemplateDraftItem,
          onAddItem: addTemplateDraftItem,
          onCancelEdit: cancelTemplateEdit,
          onSaveEdit: saveTemplateEdit
        });
      }
      const bodyMetrics = buildBodyMetricsModel({
        weekData,
        weightHistory,
        currentWeight,
        currentHeight,
        profileData,
        nutritionPrefs,
        calorieAdjustment,
        today: TODAY
      });
      const {
        normalizedWeightEntries,
        weeklyProgress,
        weightTrend,
        bodyComposition,
        fieldAvailability: historyFieldAvailability,
        currentBmr,
        bodyFatGoalAutoKg
      } = bodyMetrics;
      const { daysWithData, avgProtein, avgKcal, daysMetProtein } = bodyMetrics.weeklyAverages;
      const calorieBankDays = bodyMetrics.calorieBank.days;
      const calorieBank = bodyMetrics.calorieBank.balance;
      const weightChartData = bodyMetrics.chartSeries.weight;
      const bmrChartData = bodyMetrics.chartSeries.bmr;

      /**
       * Chart configs for optional body metrics.
       * Input: weightHistory entries with optional bodyFatPct, waistCm and
       * muscleMassKg. Output: one config per metric that has at least one value.
       */
      const bodyMetricChartConfigs = [
        {
          key: "bodyFatPct",
          title: uiText("Evolução da gordura corporal", "Body-fat trend", "Evolución de la grasa corporal"),
          label: uiText("Gordura corporal", "Body fat", "Grasa corporal"),
          unit: "%",
          color: "#c86e8e",
          target: bodyComposition.targetPct || null
        },
        {
          key: "muscleMassKg",
          title: uiText("Evolução da massa muscular", "Muscle-mass trend", "Evolución de la masa muscular"),
          label: uiText("Massa muscular", "Muscle mass", "Masa muscular"),
          unit: "kg",
          color: "#6ec8a9"
        },
        {
          key: "waistCm",
          title: uiText("Evolução da cintura", "Waist trend", "Evolución de la cintura"),
          label: uiText("Cintura", "Waist", "Cintura"),
          unit: "cm",
          color: "#8ec8c8"
        }
      ].map(config => ({
        ...config,
        data: bodyMetrics.chartSeries[config.key]
      })).filter(config => config.data.length > 0);

      /**
       * Renders a compact Recharts line chart for optional body measurements.
       * Input: bodyMetricChartConfigs item. Output: React element.
       */
      function getSuggestedBodyGoalWeeks() {
        const currentFatPct = Number(bodyGoalForm.currentFatPct || bodyComposition.currentFatPct || 0);
        const targetPct = Number(bodyGoalForm.targetFatPct || nutritionPrefs.bodyFatGoal || 0);
        const baseWeight = Number(currentWeight || bodyComposition.latest?.weight || 0);
        if (!baseWeight || !currentFatPct || !targetPct || targetPct >= currentFatPct) return "";
        const fatKg = baseWeight * currentFatPct / 100;
        const leanMassKg = baseWeight - fatKg;
        const targetWeight = leanMassKg / (1 - targetPct / 100);
        const kgToLose = Math.max(0, baseWeight - targetWeight);
        return kgToLose ? Math.max(1, Math.ceil(kgToLose / 0.5)) : "";
      }

      // Updates the body-fat target from the nutrition profile. When current body
      // fat and weight are available, the target is translated into the existing
      // loss-goal fields so calorie adjustment, weekly planning and reports all
      // keep using one source of truth.
      function updateBodyFatGoalTarget(value) {
        const targetPct = Number(value || 0);
        const currentFatPct = Number(bodyComposition.currentFatPct || 0);
        const baseWeight = Number(bodyComposition.latest?.weight || currentWeight || 0);
        const nextPrefs = {
          ...nutritionPrefs,
          bodyFatGoal: value
        };

        if (targetPct > 0 && currentFatPct > 0 && targetPct < currentFatPct && baseWeight > 0) {
          const currentFatKg = baseWeight * currentFatPct / 100;
          const leanMassKg = baseWeight - currentFatKg;
          const targetWeight = leanMassKg / (1 - targetPct / 100);
          const kgToLose = Math.max(0, baseWeight - targetWeight);

          nextPrefs.goalType = "loss";
          nextPrefs.goalKg = kgToLose ? String(Math.round(kgToLose * 10) / 10) : "";
          if (!nextPrefs.goalWeeks) {
            nextPrefs.goalWeeks = String(Math.max(1, Math.ceil(kgToLose / 0.5)));
          }
        }

        saveNutritionPrefs(nextPrefs);
      }

      // Commits a body-fat target into the same goal fields used by the calorie
      // engine. Input is current body-fat %, desired body-fat %, and weeks; output
      // is a persisted measurement plus loss goal (kg and weeks) derived from an
      // estimated stable lean mass. This keeps body-composition goals and nutrition
      // targets in one consistent source of truth.
      function saveBodyFatGoal() {
        const currentFatPct = Number(bodyGoalForm.currentFatPct || bodyComposition.currentFatPct || 0);
        const targetPct = Number(bodyGoalForm.targetFatPct || nutritionPrefs.bodyFatGoal || 0);
        const weeks = Number(bodyGoalForm.weeks || getSuggestedBodyGoalWeeks() || nutritionPrefs.goalWeeks || 0);
        const baseWeight = Number(currentWeight || bodyComposition.latest?.weight || 0);
        if (!baseWeight || !currentFatPct || !targetPct || targetPct >= currentFatPct || !weeks) {
          notify(uiText(
            "Informe a gordura atual, uma meta menor e um prazo.",
            "Enter current body fat, a lower target, and a time frame.",
            "Informa tu grasa actual, una meta menor y un plazo."
          ));
          return;
        }
        const entryDate = TODAY;
        const existing = getWeightForDate(weightHistory, entryDate);
        const fatKg = baseWeight * currentFatPct / 100;
        const leanMassKg = baseWeight - fatKg;
        const targetWeight = leanMassKg / (1 - targetPct / 100);
        const kgToLose = Math.max(0, baseWeight - targetWeight);
        const measurement = {
          id: existing?.id || Date.now().toString(),
          date: entryDate,
          weight: existing?.weight || baseWeight,
          height: existing?.height || currentHeight || null,
          bodyFatPct: currentFatPct,
          waistCm: existing?.waistCm || null,
          muscleMassKg: existing?.muscleMassKg || null
        };
        setWeightHistory(h => [...h.filter(e => e.date !== entryDate), measurement].sort((a, b) => a.date.localeCompare(b.date)));
        const nextPrefs = {
          ...nutritionPrefs,
          goalType: "loss",
          goalKg: kgToLose ? String(Math.round(kgToLose * 10) / 10) : "",
          goalWeeks: String(Math.max(1, Math.round(weeks))),
          bodyFatGoal: String(targetPct)
        };
        saveNutritionPrefs(nextPrefs, false);
        setBodyGoalForm({
          currentFatPct: String(currentFatPct),
          targetFatPct: String(targetPct),
          weeks: String(Math.max(1, Math.round(weeks)))
        });
      }
      const THEME = darkMode ? {
        "--bg": "#111",
        "--surface": "#161616",
        "--surface3": "#141414",
        "--input": "#1e1e1e",
        "--track": "#1c1c1c",
        "--row": "#181818",
        "--border": "#222",
        "--border2": "#2a2a2a",
        "--border3": "#1e1e1e",
        "--border-info": "#2a2a4a",
        "--text": "#e8e0d5",
        "--text2": "#d5cfc8",
        "--text3": "#c9bfb0",
        "--muted": "#8a8a8a",
        "--muted2": "#7a7a7a",
        "--dim": "#444",
        "--faint": "#333",
        "--btn-ok": "#1e2e1e",
        "--btn-info": "#1a1e2a",
        "--tab-active": "#191919",
        "--btn-inactive": "#191919",
        "--btn-inactive-border": "#252525",
        "--btn-warn": "#2a1a1a",
        "--btn-teal": "#1a2a2a",
        "--btn-ok-border": "#3a5a3a",
        "--btn-ok-text": "#7ec87e",
        "--btn-info-border": "#3a3a6a",
        "--btn-info-text": "#8a9ec8",
        "--btn-warn-border": "#5a3a3a",
        "--btn-warn-text": "#c87e7e",
        "--btn-teal-border": "#3a6a6a",
        "--btn-teal-text": "#7ec8c8",
        "--protein": "#d2a85a",
        "--calories": "#62b9bd",
        "--ai-bg": "linear-gradient(135deg, rgba(126,200,126,0.16), rgba(126,158,200,0.16))",
        "--ai-border": "#3f6b58",
        "--ai-text": "#91d39a",
        "--toggle-train-bg": "#1e2e1e",
        "--toggle-train-border": "#3a6a3a",
        "--toggle-train-text": "var(--btn-ok-text)",
        "--toggle-rest-bg": "var(--btn-info)",
        "--toggle-rest-border": "#3a3a6a",
        "--toggle-rest-text": "var(--btn-info-text)",
        "--notif-ok-bg": "#1e2e1e",
        "--notif-ok-border": "#3a5a3a",
        "--notif-ok-text": "var(--btn-ok-text)",
        "--notif-err-bg": "#2e1a1a",
        "--notif-err-border": "#6a3a3a",
        "--notif-err-text": "var(--btn-warn-text)",
        "--chart-bg": "var(--btn-inactive)",
        "--chart-tick": "#888",
        "--chart-border": "#2a2a2a",
        "--chart-label": "#aaa"
      } : {
        "--bg": "#f2f1ed",
        "--surface": "#ffffff",
        "--surface3": "#f0eeea",
        "--card": "#ffffff",
        "--input": "#f5f3ef",
        "--track": "#dedad4",
        "--row": "#f8f7f3",
        "--border": "#ccc8c0",
        "--border2": "#b8b4ac",
        "--border3": "#d8d4cc",
        "--border-info": "#c8c8e0",
        "--text": "#252220",
        "--text1": "#252220",
        "--text2": "#2e2b28",
        "--text3": "#3a3733",
        "--muted": "#6a6662",
        "--muted2": "#7a7672",
        "--dim": "#8a8680",
        "--faint": "#aaa8a0",
        "--accent": "#4a9a4a",
        "--btn-ok": "#e8f4e8",
        "--btn-ok-border": "#a8cfa8",
        "--btn-ok-text": "#2a6a2a",
        "--btn-info": "#e8eaf4",
        "--btn-info-border": "#a8aed0",
        "--btn-info-text": "#3a4a8a",
        "--btn-warn": "#f4e8e8",
        "--btn-warn-border": "#d0a8a8",
        "--btn-warn-text": "#8a2a2a",
        "--btn-teal": "#e8f4f4",
        "--btn-teal-border": "#a8cece",
        "--btn-teal-text": "#2a6a6a",
        "--btn-inactive": "#ede9e3",
        "--btn-inactive-border": "#ccc8c0",
        "--tab-active": "#ffffff",
        "--protein": "#b88735",
        "--calories": "#2f9ca3",
        "--ai-bg": "linear-gradient(135deg, rgba(232,244,232,0.96), rgba(232,244,244,0.96))",
        "--ai-border": "#9dc7ae",
        "--ai-text": "#186c39",
        "--toggle-train-bg": "#e8f4e8",
        "--toggle-train-border": "#a8cfa8",
        "--toggle-train-text": "#2a6a2a",
        "--toggle-rest-bg": "#e8eaf4",
        "--toggle-rest-border": "#a8aed0",
        "--toggle-rest-text": "#3a4a8a",
        "--notif-ok-bg": "#e8f4e8",
        "--notif-ok-border": "#a8cfa8",
        "--notif-ok-text": "#2a6a2a",
        "--notif-err-bg": "#f4e8e8",
        "--notif-err-border": "#d0a8a8",
        "--notif-err-text": "#8a2a2a",
        "--chart-bg": "#ede9e3",
        "--chart-tick": "#888",
        "--chart-border": "#ccc8c0",
        "--chart-label": "#666"
      };
      const CT = {
        bg: darkMode ? "#1a1a1a" : "#ffffff",
        tick: darkMode ? "#888" : "#555",
        border: darkMode ? "#2a2a2a" : "#e0dbd3",
        label: darkMode ? "#aaa" : "#777"
      };
      const greetingHour = new Date().getHours();
      const greetingPeriod = getGreetingPeriod(greetingHour);
      const greetingKey = greetingPeriod === "morning" ? "greetingMorning" : greetingPeriod === "afternoon" ? "greetingAfternoon" : "greetingEvening";
      const greetingFirstName = userName.trim().split(/\s+/).filter(Boolean)[0] || "";
      const greetingText = text(greetingKey) + (greetingFirstName ? ", " + greetingFirstName : "") + "!";
      const greetingLine = getDailyGreetingPhrase(lang, greetingPeriod);
      const greetingEmoji = getGreetingEmoji(greetingPeriod);
      const tickerMetrics = [
        {key: "protein", label: text('protein'), value: tot.protein, target: goals.protein, unit: "g", group: "gain"},
        {key: "kcal", label: text('calories'), value: tot.kcal, target: goals.kcal, unit: "kcal", group: "limit"},
        {key: "carbs", label: text('carbs'), value: tot.carbs, target: goals.carbs, unit: "g", group: "limit"},
        {key: "fat", label: text('fat'), value: tot.fat, target: goals.fat, unit: "g", group: "limit"},
        {key: "satfat", label: text('satfat'), value: tot.satfat, target: customGoals.satfat || goals.satfat, unit: "g", group: "limit"},
        {key: "fiber", label: text('fiber'), value: tot.fiber, target: goals.fiber, unit: "g", group: "gain"},
        {key: "salt", label: text('salt'), value: tot.salt, target: goals.salt, unit: "g", group: "limit"},
        {key: "water", label: text('water'), value: totalWater, target: goals.water, unit: "ml", group: "gain"}
      ];
      const tickerSlides = [{
        key: "greeting",
        icon: greetingEmoji,
        text: greetingText + " " + greetingLine,
        tone: "neutral"
      }, ...tickerMetrics.map(metric => buildNutrientTickerSlide({...metric, lang})).filter(Boolean)];
      const safeTickerIndex = tickerSlides.length ? tickerIndex % tickerSlides.length : 0;
      const activeTickerSlide = tickerSlides[safeTickerIndex] || tickerSlides[0];
      const tickerToneColor = activeTickerSlide?.tone === "success"
        ? "var(--accent-action-text)"
        : activeTickerSlide?.tone === "alert"
          ? "var(--ticker-alert-text)"
          : "var(--text-secondary)";

      function moveTicker(direction, manual = false) {
        if (tickerSlides.length < 2 || tickerPhase === "exit" || tickerPhase === "prepare") return;
        if (manual) setTickerTimerReset(value => value + 1);
        clearTimeout(tickerSwapTimerRef.current);
        clearTimeout(tickerEnterTimerRef.current);
        setTickerDirection(direction);
        setTickerDragOffset(0);
        setTickerPhase("exit");
        tickerSwapTimerRef.current = setTimeout(() => {
          setTickerIndex(current => (current + direction + tickerSlides.length) % tickerSlides.length);
          setTickerPhase("prepare");
          requestAnimationFrame(() => requestAnimationFrame(() => {
            setTickerPhase("enter");
            tickerEnterTimerRef.current = setTimeout(() => setTickerPhase("idle"), 320);
          }));
        }, 150);
      }

      function handleTickerPointerDown(event) {
        setTickerTimerReset(value => value + 1);
        if (tickerSlides.length < 2) return;
        tickerPointerRef.current = {active: true, pointerId: event.pointerId, startX: event.clientX};
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }

      function handleTickerPointerMove(event) {
        if (!tickerPointerRef.current.active || tickerPointerRef.current.pointerId !== event.pointerId) return;
        const delta = Math.max(-54, Math.min(54, event.clientX - tickerPointerRef.current.startX));
        setTickerDragOffset(delta);
      }

      function finishTickerPointer(event) {
        if (!tickerPointerRef.current.active || tickerPointerRef.current.pointerId !== event.pointerId) return;
        const delta = event.clientX - tickerPointerRef.current.startX;
        tickerPointerRef.current.active = false;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        setTickerDragOffset(0);
        if (delta <= -30) moveTicker(1);
        else if (delta >= 30) moveTicker(-1);
      }

      useEffect(() => {
        if (tickerIndex < tickerSlides.length) return;
        setTickerIndex(0);
      }, [tickerIndex, tickerSlides.length]);

      useEffect(() => {
        clearTimeout(tickerAutoTimerRef.current);
        if (!loaded || tab !== "diario" || tickerSlides.length < 2 || tickerPhase !== "idle") return;
        tickerAutoTimerRef.current = setTimeout(() => moveTicker(1), 5000);
        return () => clearTimeout(tickerAutoTimerRef.current);
      }, [loaded, tab, tickerIndex, tickerTimerReset, tickerSlides.length, tickerPhase]);

      useEffect(() => () => {
        clearTimeout(tickerAutoTimerRef.current);
        clearTimeout(tickerSwapTimerRef.current);
        clearTimeout(tickerEnterTimerRef.current);
      }, []);
      const tabNavItems = [["diario", text('tabDiary')], ["despensa", text('tabPantry')], ["semana", text('tabWeek')], ["metricas", text('tabMetrics')]];
      const proteinColor = "var(--protein)";
      const caloriesColor = "var(--calories)";
      // Toggles the visible day type and, for past dates, refreshes only that
      // day's frozen target snapshot. Future preference changes still cannot
      // rewrite old days unless the user edits that day intentionally.
      function toggleDayType() {
        const nextIsTraining = !isTraining;
        setTrainingByDate(prev => ({...prev, [viewDate]: nextIsTraining}));
        if (viewDate !== TODAY) {
          setGoalHistory(prev => ({
            ...prev,
            [viewDate]: computeDayGoalSnapshot(viewDate, nextIsTraining)
          }));
        }
      }
      const aiButtonStyle = {
        background: "var(--ai-bg)",
        border: "1px solid var(--ai-border)",
        color: "var(--ai-text)",
        borderRadius: 8,
        letterSpacing: 1,
        textTransform: "uppercase",
        fontWeight: 650
      };
      const miniProgressItems = [{
        label: text('protein'),
        value: tot.protein,
        goal: goals.protein,
        unit: "g",
        color: proteinColor
      }, {
        label: text('calories'),
        value: tot.kcal,
        goal: goals.kcal,
        unit: text('kcalUnit'),
        color: caloriesColor
      }];
      const latestWeekPoint = weekData.length ? weekData[weekData.length - 1] : null;
      /**
       * Renders the app version as normal page content.
       * It is intentionally not fixed: the footer should only appear after the
       * active tab content, using the same page background as the rest of the app.
       */
      function renderAppFooter() {
        return /*#__PURE__*/React.createElement("footer", {
          style: {
            width: "100%",
            boxSizing: "border-box",
            padding: isMobileView ? "30px 16px calc(112px + env(safe-area-inset-bottom, 0px))" : "34px 16px 40px",
            marginTop: 18,
            textAlign: "center",
            color: "var(--muted)",
            background: "var(--bg)",
            fontSize: 13,
            letterSpacing: 0.6,
            borderTop: "1px solid var(--border3)"
          }
        }, APP_VERSION_LABEL);
      }
      function renderMealReviewModal() {
        const closeMealReview = () => {
          setMealReview(null);
          setMealReviewHelpOpen(false);
        };
        return React.createElement(MealReviewModal, {
          review: mealReview,
          lang,
          darkMode,
          isMobileView,
          helpOpen: mealReviewHelpOpen,
          aiLoading: mealReviewAiLoading,
          aiText: mealReviewAiText,
          getMealLabel: mealLabel,
          getEvaluationText: mealScoreEvaluationText,
          getBrief: mealScoreBrief,
          getScoreLabel: mealScoreLabel,
          onClose: closeMealReview,
          onToggleHelp: () => setMealReviewHelpOpen(open => !open),
          onReevaluate: () => openMealReview(mealReview.meal, mealReview.items, mealReview.source),
          onConfirm: confirmMealReview
        });
      }

      useEffect(() => {
        if (!loaded || typeof window.hideInitialLoading !== "function") return;
        window.hideInitialLoading();
      }, [loaded]);

      if (!loaded) {
        // Keep the static HTML loading layer visible until this component finishes
        // loading user data. This avoids the old intermediate blank/dark screens.
        return null;
      }
      const addScreenProps = {
        lang,
        isMobileView,
        text,
        openTab,
        showRecentMeals,
        setShowRecentMeals,
        recentMeals,
        MEALS,
        mealDisplay,
        loadRecentMealToStaged,
        TODAY,
        showSaveTemplateModal,
        setShowSaveTemplateModal,
        staged,
        templateName,
        setTemplateName,
        saveTemplate,
        addTemplatesOpen,
        describeMode,
        pantry,
        selectAddMode,
        mealTemplates,
        addTemplateSearch,
        setAddTemplateSearch,
        SavedMealCard,
        goals,
        expandedTemplateIds,
        editingTemplateId,
        templateEditDraft,
        sortedAllPantry,
        mealLabel,
        toggleTemplateExpanded,
        appendTemplateToStaged,
        beginTemplateEdit,
        loadTemplate,
        deleteTemplate,
        setTemplateEditDraft,
        updateTemplateDraftItem,
        removeTemplateDraftItem,
        addTemplateDraftItem,
        cancelTemplateEdit,
        saveTemplateEdit,
        describeMeal,
        setDescribeMeal,
        mealDescription,
        setMealDescription,
        describeLoading,
        estimateMealDescription,
        describeResult,
        addDescribedToLog,
        evaluateDescribedMeal,
        batchMode,
        addEntry,
        setAddEntry,
        selectedFood,
        ALL_FIELDS,
        addToLog,
        addToStaged,
        setStaged,
        editStagedIdx,
        editStagedQty,
        setEditStagedQty,
        saveEditStaged,
        setEditStagedIdx,
        removeFromStaged,
        stagedTot,
        commitStaged,
        evaluateStagedMeal,
        openSaveTemplateModal
      };
      const diaryScreenProps = {
        tab,
        lang,
        isMobileView,
        darkMode,
        text,
        uiText,
        tickerPhase,
        tickerDirection,
        safeTickerIndex,
        activeTickerSlide,
        tickerTimerReset,
        handleTickerPointerDown,
        handleTickerPointerMove,
        finishTickerPointer,
        tickerToneColor,
        tickerDragOffset,
        tickerSlides,
        setTickerTimerReset,
        moveTicker,
        greetingText,
        greetingLine,
        tot,
        goals,
        remainProtein,
        remainKcal,
        allEntries,
        dayProteinPct,
        dayKcalPct,
        openMealSuggestions,
        gaRunning,
        suggestLoading,
        showGA,
        setShowGA,
        gaTolerance,
        setGATolerance,
        gaTargetMeal,
        setGATargetMeal,
        MEALS,
        mealLabel,
        gaUseAll,
        setGAUseAll,
        runGASafely,
        gaProgress,
        gaResults,
        gaHasSearched,
        expandMicros,
        setExpandMicros,
        dailyMicros,
        hasMicros,
        getAutomaticMealSuggestionLimits,
        gaKcalMin,
        setGAKcalMin,
        gaProtMin,
        setGAProtMin,
        gaKcalMax,
        setGAKcalMax,
        gaProtMax,
        setGAProtMax,
        gaFoodSearch,
        setGAFoodSearch,
        pantry,
        gaSelIds,
        setGASelIds,
        gaAdvancedOpen,
        setGAAdvancedOpen,
        gaGlobalMax,
        setGAGlobalMax,
        gaUseProtTol,
        setGAUseProtTol,
        gaProtTolerance,
        setGAProtTolerance,
        activeLog,
        evaluateMealItems,
        mealScoreBrief,
        mealScoreEvaluationText,
        addGAResultToDiary,
        TODAY,
        diaryStatus,
        dateLabel,
        viewDate,
        calendarOpen,
        setCalendarOpen,
        changeViewDate,
        setCalendarMonth,
        calendarMonth,
        calendarData,
        calendarLoading,
        isToday,
        viewWeight,
        isTraining,
        totalWater,
        editWaterGoal,
        setEditWaterGoal,
        waterGoalInput,
        setWaterGoalInput,
        setWaterGoal,
        addWater,
        waterCustomPreset,
        configureWaterCustomPreset,
        waterInput,
        setWaterInput,
        waterIntake,
        removeWater,
        suppLog,
        removeSuppLog,
        entryMenuId,
        editEntryId,
        editEntryQty,
        setEditEntryQty,
        saveEntryEdit,
        setEditEntryId,
        openAddForMeal,
        setEntryMenuId,
        detailFood,
        setDetailFood,
        startEditEntry,
        duplicateEntry,
        removeEntry,
        notesOpen,
        setNotesOpen,
        todayNote,
        historyNote,
        setTodayNote,
        setHistoryNote,
        suppPantry,
        showSuppAdd,
        setShowSuppAdd,
        suppAddId,
        setSuppAddId,
        suppAddDose,
        setSuppAddDose,
        logSupp,
        feedbackLoading,
        feedbackPeriod,
        generateFeedback,
        feedbackText,
        feedbackSaved,
        saveFeedbackAsNote,
        setTab
      };
      return /*#__PURE__*/React.createElement(React.Fragment, null, renderMealReviewModal(), /*#__PURE__*/React.createElement("div", {
        "data-one-ui-root": "true",
        "data-theme": darkMode ? "dark" : "light",
        style: {
          background: "var(--bg)",
          color: "#ffffff",
          fontFamily: "system-ui,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
          minHeight: "100vh",
          paddingBottom: 60,
          overflowX: "hidden",
          ...THEME
        }
      }, /*#__PURE__*/React.createElement(AppHeaderNavigation, {
        activeTab: tab,
        isMobileView,
        title: text('appTitle'),
        dateText: dateStr,
        menuOpen,
        languageMenuOpen: headerLanguageMenuOpen,
        onToggleMenu: () => setMenuOpen(m => !m),
        onCloseMenu: () => {
          setMenuOpen(false);
          setHeaderLanguageMenuOpen(false);
        },
        onToggleLanguageMenu: () => setHeaderLanguageMenuOpen(open => !open),
        languageFlag: getLanguageOption(lang).flag,
        languageLabel: uiText("Idioma", "Language", "Idioma"),
        languageOptions: LANGUAGE_OPTIONS.map(option => ({
          ...option,
          isCurrent: option.code === normalizeLanguage(lang)
        })),
        onSelectLanguage: code => {
          toggleLang(code);
          setHeaderLanguageMenuOpen(false);
        },
        darkModeLabel: darkMode
          ? uiText("Modo claro", "Light mode", "Modo claro")
          : uiText("Modo escuro", "Dark mode", "Modo oscuro"),
        onToggleDarkMode: () => {
          if (onDarkModeChange) {
            onDarkModeChange();
          } else {
            setDarkMode(d => {
              const next = !d;
              localStorage.setItem('appDarkMode', String(next));
              return next;
            });
          }
          setMenuOpen(false);
        },
        menuActions: onOpenSettings ? [{
            key: "settings",
            icon: "🔑",
            label: uiText("IA / Chave de API", "AI / API key", "IA / Clave de API"),
            onClick: () => { onOpenSettings(); setMenuOpen(false); }
          }, ...(onOpenBackup ? [{
            key: "backup",
            icon: "💾",
            label: uiText("Backup e restaurar", "Backup & restore", "Copia y restauración"),
            onClick: () => { onOpenBackup(); setMenuOpen(false); }
          }] : []), ...(onOpenPrivacy ? [{
            key: "privacy",
            icon: "🔒",
            label: uiText("Privacidade e segurança", "Privacy & security", "Privacidad y seguridad"),
            onClick: () => { onOpenPrivacy(); setMenuOpen(false); }
          }] : []),
          ...(onStartTutorial ? [{
            key: "tutorial",
            icon: "🎓",
            label: uiText("Ajuda rápida", "Quick help", "Ayuda rápida"),
            onClick: () => { onStartTutorial(); setMenuOpen(false); }
          }] : []),
          {
            key: "feedback",
            icon: "💬",
            label: uiText("Enviar feedback", "Send feedback", "Enviar comentarios"),
            onClick: () => {
              const shouldOpenFeedback = window.confirm(uiText(
                "Você será redirecionado para um Google Forms em uma nova aba. Deseja continuar?",
                "You will be redirected to a Google Forms page in a new tab. Continue?",
                "Se abrirá Google Forms en una nueva pestaña. ¿Quieres continuar?"
              ));
              if (!shouldOpenFeedback) return;
              window.open(
                normalizeLanguage(lang) === "en" || normalizeLanguage(lang) === "es"
                  ? "https://forms.gle/4WUAXiWHAWd5vJ94A"
                  : "https://forms.gle/KYg6WKRDzgWkKC5U7",
                "_blank",
                "noopener,noreferrer"
              );
              setMenuOpen(false);
            }
          },
          ...(onLogout ? [{
            key: "logout",
            icon: "⏻",
            label: uiText("Sair da conta", "Sign out", "Cerrar sesión"),
            tone: "danger",
            onClick: () => { onLogout(); setMenuOpen(false); }
          }] : [])
        ] : [],
        tickerNode: /*#__PURE__*/React.createElement(DiaryScreen, { ...diaryScreenProps, section: "ticker" }),
        dayOfLabel: text('dayOf'),
        isTraining,
        onToggleDayType: toggleDayType,
        trainingLabel: text('trainDay'),
        restLabel: text('restDay'),
        currentWeight,
        bmi,
        bmiLabel: text('bmi'),
        metricsTitle: uiText("Abrir métricas", "Open metrics", "Abrir métricas"),
        onOpenMetrics: () => openTab("metricas"),
        navItems: tabNavItems.map(([key, label]) => ({ key, label })),
        onOpenTab: openTab,
        miniProgressItems,
        summaryNode: /*#__PURE__*/React.createElement(DiaryScreen, { ...diaryScreenProps, section: "summary" }),
        goalToast,
        notification
      }), /*#__PURE__*/React.createElement("div", {
        "data-add-meal-backdrop": "true",
        onClick: () => openTab("diario"),
        style: {
          display: tab === "adicionar" ? "block" : "none",
          position: "fixed",
          inset: 0,
          zIndex: 840,
          background: "rgba(0,0,0,0.36)",
          backdropFilter: "blur(2px)",
          animation: "softIn 180ms ease-out both"
        }
      }), /*#__PURE__*/React.createElement("div", {
        key: tab,
        "data-app-main": tab,
        style: {
          padding: tab === "adicionar" ? (isMobileView ? "18px 18px calc(22px + env(safe-area-inset-bottom,0px))" : "22px 24px 26px") : (tab === "metricas" && isMobileView ? "14px 10px calc(90px + env(safe-area-inset-bottom,0px))" : "20px clamp(18px, 3vw, 34px) 32px"),
          order: 9,
          boxSizing: "border-box",
          width: tab === "adicionar" ? (isMobileView ? "100%" : 720) : "100%",
          maxWidth: tab === "adicionar" ? (isMobileView ? "100%" : "calc(100vw - 48px)") : (tab === "metricas" && isMobileView ? "100%" : 1180),
          margin: tab === "adicionar" ? (isMobileView ? 0 : "0 auto") : "0 auto",
          position: tab === "adicionar" ? "fixed" : "relative",
          left: tab === "adicionar" ? (isMobileView ? 0 : 24) : "auto",
          right: tab === "adicionar" ? (isMobileView ? 0 : 24) : "auto",
          top: tab === "adicionar" ? (isMobileView ? "auto" : 78) : "auto",
          bottom: tab === "adicionar" ? (isMobileView ? 0 : 28) : "auto",
          transform: "none",
          maxHeight: tab === "adicionar" ? (isMobileView ? "86vh" : "calc(100vh - 110px)") : "none",
          overflowY: tab === "adicionar" ? "auto" : "visible",
          background: tab === "adicionar" ? "var(--surface)" : "transparent",
          border: tab === "adicionar" ? "1px solid var(--border2)" : "none",
          borderRadius: tab === "adicionar" ? (isMobileView ? "18px 18px 0 0" : 18) : 0,
          boxShadow: tab === "adicionar" ? "0 24px 80px rgba(0,0,0,0.36)" : "none",
          zIndex: tab === "adicionar" ? 850 : "auto",
          animation: tab === "adicionar" ? "softIn 220ms ease-out both" : "softIn 260ms ease-out both",
          transition: "width 260ms ease, max-height 260ms ease, transform 260ms ease, border-radius 260ms ease, background-color 220ms ease"
        }
      }, tab === "adicionar" && /*#__PURE__*/React.createElement(AddScreen, {
        ...addScreenProps,
        section: "header"
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          position: "absolute",
          top: 12,
          right: "clamp(18px, 3vw, 34px)",
          zIndex: 5
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: reopenTabTutorial,
        title: uiText("Ver tutorial desta aba", "Show this tab tutorial", "Ver tutorial de esta pestaña"),
        "aria-label": uiText("Ver tutorial desta aba", "Show this tab tutorial", "Ver tutorial de esta pestaña"),
        style: {
          minWidth: isMobileView ? 24 : 64,
          height: 24,
          padding: isMobileView ? 0 : "0 9px",
          borderRadius: 999,
          border: "1px solid var(--border3)",
          background: "var(--surface3)",
          color: "var(--muted)",
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "inherit",
          cursor: "pointer",
          lineHeight: "22px",
          textAlign: "center",
          letterSpacing: 0.7,
          textTransform: "uppercase",
          opacity: 0.88,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
        }
      }, isMobileView ? "i" : uiText("i Ajuda", "i Help", "i Ayuda"))), tab === "diario" && /*#__PURE__*/React.createElement(DiaryScreen, { ...diaryScreenProps, section: "content", opaqueTrailingNode: /*#__PURE__*/React.createElement(React.Fragment, null, backupImportPreview && (() => {
        const preview = backupImportPreview.preview || {};
        const selections = backupImportPreview.selections || {};
        const previewLang = normalizeLanguage(lang);
        const L = (pt, en, es) => pickLang(previewLang, pt, en, es);
        const isValid = preview.ok !== false;
        const categories = (preview.categories || []).filter(category => category.total > 0);
        const selectedIds = Object.keys(selections);
        const hasMissingStrategy = selectedIds.some(id => !["append", "replace"].includes(selections[id]));
        const canImport = isValid && selectedIds.length > 0 && !hasMissingStrategy;

        const categoryLabel = category => {
          const meta = BACKUP_CATEGORY_META[category.id] || {};
          if (previewLang === "en") return meta.en || category.id;
          if (previewLang === "es") return meta.es || meta.en || category.id;
          return meta.pt || category.id;
        };

        const categoryDetail = category => {
          return L(
            `${category.total} itens no backup - ${category.newItems || 0} novos - ${category.existingItems || 0} já existem`,
            `${category.total} backup items - ${category.newItems || 0} new - ${category.existingItems || 0} already exist`,
            `${category.total} elementos en la copia - ${category.newItems || 0} nuevos - ${category.existingItems || 0} ya existen`
          );
        };

        const strategyButton = (categoryId, strategy, label) => /*#__PURE__*/React.createElement("button", {
          type: "button",
          onClick: () => setBackupImportStrategy(categoryId, strategy),
          style: {
            ...btn,
            flex: "1 1 130px",
            background: selections[categoryId] === strategy ? "var(--btn-info)" : "var(--surface)",
            color: selections[categoryId] === strategy ? "var(--btn-info-text)" : "var(--text)",
            border: selections[categoryId] === strategy ? "1px solid var(--btn-info-border)" : "1px solid var(--border)"
          }
        }, label);

        const categoryRow = category => {
          const isSelected = Object.prototype.hasOwnProperty.call(selections, category.id);
          return /*#__PURE__*/React.createElement("div", {
            key: category.id,
            style: {
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 12,
              background: "var(--surface)",
              display: "grid",
              gap: 10
            }
          }, /*#__PURE__*/React.createElement("label", {
            style: {
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              cursor: "pointer"
            }
          }, /*#__PURE__*/React.createElement("input", {
            type: "checkbox",
            checked: isSelected,
            onChange: event => setBackupImportCategory(category.id, event.target.checked),
            style: {marginTop: 4}
          }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, categoryLabel(category)), /*#__PURE__*/React.createElement("div", {
            style: {
              color: "var(--muted)",
              fontSize: 14,
              marginTop: 2
            }
          }, categoryDetail(category)))),
          isSelected && /*#__PURE__*/React.createElement("div", {
            style: {
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              paddingLeft: 28
            }
          }, strategyButton(category.id, "append", L("Anexar", "Append", "Anexar")),
            strategyButton(category.id, "replace", L("Substituir", "Replace", "Sustituir"))));
        };

        return /*#__PURE__*/React.createElement("div", {
          style: {
            position: "fixed",
            inset: 0,
            zIndex: 100004,
            background: "rgba(0,0,0,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            width: "min(760px, 96vw)",
            maxHeight: "88vh",
            overflow: "auto",
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 20px 60px rgba(0,0,0,.28)",
            padding: 22
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "start",
            marginBottom: 14
          }
        }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 22,
            letterSpacing: 2,
            color: "var(--text)",
            textTransform: "uppercase"
          }
        }, L("Revisar importação", "Review import", "Revisar importación")), /*#__PURE__*/React.createElement("div", {
          style: {
            marginTop: 8,
            color: "var(--muted)",
            lineHeight: 1.45
          }
        }, L(
          "Escolha o que importar e defina se cada categoria deve anexar ou substituir dados.",
          "Choose what to import and decide whether each category should append or replace data.",
          "Elige qué importar y define si cada categoría debe anexar o sustituir datos."
        ))), /*#__PURE__*/React.createElement("button", {
          onClick: () => closeBackupImportPreview(null),
          style: {
            ...btn,
            width: 42,
            minWidth: 42,
            height: 42,
            padding: 0,
            fontSize: 22
          }
        }, "x")), !isValid && /*#__PURE__*/React.createElement("div", {
          style: {
            border: "1px solid #d99",
            background: "rgba(200,60,60,.08)",
            color: "#b45",
            borderRadius: 8,
            padding: 10,
            marginBottom: 14
          }
        }, (preview.errors || []).join(" ")), /*#__PURE__*/React.createElement("div", {
          style: {
            display: "grid",
            gap: 10,
            marginBottom: 14
          }
        }, categories.length ? categories.map(categoryRow) : /*#__PURE__*/React.createElement("div", {
          style: {color: "var(--muted)"}
        }, L("Nenhum dado restaurável encontrado neste backup.", "No restorable data was found in this backup.", "No se encontraron datos restaurables en esta copia de seguridad."))), hasMissingStrategy && /*#__PURE__*/React.createElement("div", {
          style: {
            color: "#b45",
            marginBottom: 12
          }
        }, L("Escolha anexar ou substituir para cada categoria marcada.", "Choose append or replace for each selected category.", "Elige anexar o sustituir para cada categoría marcada.")), /*#__PURE__*/React.createElement("div", {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            flexWrap: "wrap"
          }
        }, /*#__PURE__*/React.createElement("button", {
          onClick: () => closeBackupImportPreview(null),
          style: {...btn, minWidth: 150}
        }, L("Cancelar", "Cancel", "Cancelar")), /*#__PURE__*/React.createElement("button", {
          disabled: !canImport,
          onClick: () => closeBackupImportPreview({categories: selections}),
          style: {
            ...btn,
            minWidth: 180,
            background: "var(--btn-ok)",
            border: "1px solid var(--btn-ok-border)",
            color: "var(--btn-ok-text)",
            opacity: canImport ? 1 : .55
          }
        }, L("Importar agora", "Import now", "Importar ahora")))));
      })(),

      backupOpen && /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 24,
          borderTop: "1px solid var(--border3)",
          paddingTop: 14
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          letterSpacing: 1,
          color: "var(--dim)",
          textTransform: "uppercase",
          marginBottom: 10
        }
      }, text('backupTitle')), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          color: "var(--muted)",
          marginBottom: 10
        }
      }, text('backupDesc')), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 6,
          marginBottom: 8
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: exportFullBackup,
        disabled: backupLoading,
        style: {
          flex: 1,
          background: "var(--btn-ok)",
          border: "1px solid var(--btn-ok-border)",
          color: "var(--btn-ok-text)",
          borderRadius: 6,
          padding: "10px",
          fontSize: 14,
          letterSpacing: 1,
          textTransform: "uppercase",
          cursor: "pointer"
        }
      }, backupLoading ? text('exportingBackup') : text('exportBackup')), /*#__PURE__*/React.createElement("label", {
        style: {
          flex: 1,
          background: "var(--btn-info)",
          border: "1px solid var(--btn-info-border)",
          color: "var(--btn-info-text)",
          borderRadius: 6,
          padding: "10px",
          fontSize: 14,
          letterSpacing: 1,
          textTransform: "uppercase",
          cursor: "pointer",
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      }, uiText("\u2191 Importar backup", "\u2191 Import backup", "\u2191 Importar copia"), /*#__PURE__*/React.createElement("input", {
        type: "file",
        accept: ".json",
        onChange: importFullBackup,
        style: {
          display: "none"
        }
      }))), backupJson && /*#__PURE__*/React.createElement("div", {
        style: {
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "10px"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          color: "var(--muted)",
          marginBottom: 6
        }
      }, text('copyJsonAs'), " ", /*#__PURE__*/React.createElement("code", null, "backup.json"), ":"), /*#__PURE__*/React.createElement("textarea", {
        readOnly: true,
        value: backupJson,
        style: {
          width: "100%",
          height: 120,
          fontFamily: "monospace",
          fontSize: 14,
          background: "#0a0a0a",
          border: "1px solid var(--border2)",
          color: "var(--muted2)",
          borderRadius: 4,
          padding: 8,
          boxSizing: "border-box",
          resize: "vertical",
          marginBottom: 6
        }
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 6
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          navigator.clipboard.writeText(backupJson).then(() => notify(text('notifCopied'))).catch(() => notify(text('copyManual')));
        },
        style: {
          flex: 1,
          background: "#1a2a2a",
          border: "1px solid #3a5a5a",
          color: "#7ec8c8",
          borderRadius: 6,
          padding: "8px",
          fontSize: 14,
          cursor: "pointer",
          letterSpacing: 1,
          textTransform: "uppercase"
        }
      }, uiText("Copiar", "Copy", "Copiar")), /*#__PURE__*/React.createElement("button", {
        onClick: () => setBackupJson(null),
        style: {
          background: "none",
          border: "1px solid var(--border3)",
          color: "var(--muted)",
          borderRadius: 6,
          padding: "8px 12px",
          fontSize: 14,
          cursor: "pointer"
        }
      }, "\xD7")))), tab === "adicionar" && /*#__PURE__*/React.createElement(AddScreen, {
        ...addScreenProps,
        section: "recent"
      })) }), tab === "adicionar" && /*#__PURE__*/React.createElement(AddScreen, {
        ...addScreenProps,
        section: "content",
        legacyTransferPanel: /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 28,
          borderTop: "1px solid var(--border3)",
          paddingTop: 14,
          display: "none"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          letterSpacing: 1,
          color: "var(--dim)",
          textTransform: "uppercase",
          marginBottom: 10
        }
      }, text('exportImportTitle')), /*#__PURE__*/React.createElement("div", {
        style: {
          background: "var(--surface)",
          border: "1px solid #2a3a2a",
          borderRadius: 6,
          padding: "10px 12px",
          marginBottom: 10
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          letterSpacing: 1,
          color: "#7ec87e",
          textTransform: "uppercase",
          marginBottom: 6
        }
      }, uiText('Backup completo', 'Full Backup', 'Backup completo')), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          color: "var(--muted)",
          marginBottom: 8
        }
      }, uiText("Exporta todos os dados para migrar para o site do GitHub.", "Exports all data to migrate to the GitHub site.", "Exporta todos los datos para migrar al sitio de GitHub.")), /*#__PURE__*/React.createElement("button", {
        onClick: exportFullBackup,
        disabled: backupLoading,
        style: {
          ...sBtn("var(--btn-ok)", "var(--btn-ok-border)", "#7ec87e"),
          marginBottom: 0
        }
      }, backupLoading ? text('exportingBackup') : uiText('Gerar Backup Completo', 'Generate Full Backup', 'Generar backup completo')), backupJson && /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          color: "var(--muted)",
          marginBottom: 4
        }
      }, text('copyJson')), /*#__PURE__*/React.createElement("textarea", {
        readOnly: true,
        value: backupJson,
        style: {
          ...inp,
          height: 100,
          fontSize: 14,
          fontFamily: "monospace",
          resize: "vertical",
          marginTop: 0,
          color: "var(--muted2)"
        }
      }), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          navigator.clipboard.writeText(backupJson).then(() => notify(text('notifCopied'))).catch(() => notify(text('selectCopyManual')));
        },
        style: {
          ...sBtn("var(--btn-teal)", "var(--btn-teal-border)", "#7ec8c8"),
          marginTop: 4,
          width: "100%"
        }
      }, uiText("Copiar JSON", "Copy JSON", "Copiar JSON"))), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 6,
          marginBottom: 8,
          flexWrap: "wrap"
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => setShowExportPanel(showExportPanel === "day" ? null : "day"),
        style: sBtn("var(--btn-ok)", "var(--btn-ok-border)", "#7ec87e")
      }, uiText("\u2193 Exportar dia", "\u2193 Export day", "\u2193 Exportar día")), /*#__PURE__*/React.createElement("button", {
        onClick: () => setShowExportPanel(showExportPanel === "week" ? null : "week"),
        style: sBtn("var(--btn-info)", "var(--btn-info-border)", "#7e7ec8")
      }, uiText("\u2193 Exportar semana", "\u2193 Export week", "\u2193 Exportar semana")), /*#__PURE__*/React.createElement("label", {
        style: sBtnLbl("var(--btn-teal)", "var(--btn-teal-border)", "var(--btn-teal-text)")
      }, uiText("\u2191 Importar refeições", "\u2191 Import meals", "\u2191 Importar comidas"), /*#__PURE__*/React.createElement("input", {
        type: "file",
        accept: ".json",
        onChange: importMeals,
        style: {
          display: "none"
        }
      })), !gaUseAll && /*#__PURE__*/React.createElement("div", {
        style: {
          background: "var(--bg)",
          border: "1px solid var(--border3)",
          borderRadius: 8,
          padding: 10,
          marginBottom: 10,
          maxHeight: 180,
          overflowY: "auto"
        }
      }, /*#__PURE__*/React.createElement("input", {
        type: "search",
        value: gaFoodSearch,
        onChange: e => setGAFoodSearch(e.target.value),
        placeholder: uiText("Pesquisar alimento pelo nome", "Search food by name", "Buscar alimento por nombre"),
        style: {
          ...inp,
          marginTop: 0,
          marginBottom: 8
        }
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          color: "var(--muted)",
          fontSize: 12,
          marginBottom: 8
        }
      }, uiText("Selecione os alimentos a incluir:", "Select foods to include:", "Selecciona los alimentos que quieres incluir:")), (() => {
        const q = gaFoodSearch.trim().toLowerCase();
        const foods = pantry.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", sortLocaleForLang(lang), {sensitivity: "base"})).filter(f => !q || (f.name || "").toLowerCase().includes(q));
        if (!foods.length) return /*#__PURE__*/React.createElement("div", {
          style: {
            color: "var(--muted)",
            fontSize: 12
          }
        }, uiText("Nenhum alimento encontrado.", "No foods found.", "No se encontraron alimentos."));
        return foods.map(f => /*#__PURE__*/React.createElement("label", {
          key: f.id,
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 0",
            color: "var(--text2)",
            fontSize: 13,
            cursor: "pointer"
          }
        }, /*#__PURE__*/React.createElement("input", {
          type: "checkbox",
          checked: !!gaSelIds[f.id],
          onChange: e => setGASelIds(prev => ({
            ...prev,
            [f.id]: e.target.checked
          }))
        }), /*#__PURE__*/React.createElement("span", null, f.name), /*#__PURE__*/React.createElement("span", {
          style: {
            color: "var(--muted)",
            fontSize: 12
          }
        }, "(", f.kcal100 || 0, "kcal, ", f.protein100 || 0, "g prot)")));
      })()), /*#__PURE__*/React.createElement("button", {
        onClick: () => setGAAdvancedOpen(v => !v),
        style: {
          width: "100%",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid var(--border2)",
          background: "transparent",
          color: "var(--text2)",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 13,
          marginBottom: gaAdvancedOpen ? 10 : 12,
          textAlign: "left"
        }
      }, (gaAdvancedOpen ? "▼ " : "▶ ") + uiText("Ajustes avançados opcionais", "Advanced optional adjustments", "Ajustes avanzados opcionales")), gaAdvancedOpen && /*#__PURE__*/React.createElement("div", {
        style: {
          background: "var(--bg)",
          border: "1px solid var(--border3)",
          borderRadius: 8,
          padding: 10,
          marginBottom: 12
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: isMobileView ? "1fr" : "120px 1fr",
          gap: 10,
          alignItems: "center",
          marginBottom: 12
        }
      }, /*#__PURE__*/React.createElement("label", {
        style: {
          color: "var(--text2)",
          fontSize: 12
        }
      }, uiText("Máx. unidades por alimento", "Global max units per food", "Máx. unidades por alimento")), /*#__PURE__*/React.createElement("input", {
        type: "number",
        min: 1,
        max: 20,
        value: gaGlobalMax,
        onChange: e => setGAGlobalMax(parseInt(e.target.value) || 5),
        style: {
          ...inp,
          marginTop: 0
        }
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          marginBottom: 14
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
          marginBottom: 4
        }
      }, /*#__PURE__*/React.createElement("label", {
        style: {
          color: "var(--text2)",
          fontSize: 12
        }
      }, uiText("Ajuste calórico", "Calorie adjustment", "Ajuste calórico")), /*#__PURE__*/React.createElement("span", {
        style: {
          color: gaTolerance > 0 ? "#c8b47e" : gaTolerance < 0 ? "#7ec8c8" : "var(--text2)",
          fontSize: 12,
          fontWeight: 700
        }
      }, (gaTolerance > 0 ? "+" : "") + gaTolerance + "%")), /*#__PURE__*/React.createElement("input", {
        type: "range",
        min: -40,
        max: 40,
        value: gaTolerance,
        onChange: e => setGATolerance(parseInt(e.target.value)),
        style: {
          width: "100%"
        }
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          color: "var(--muted)",
          fontSize: 12
        }
      }, /*#__PURE__*/React.createElement("span", null, uiText("- déficit", "- deficit", "- déficit")), /*#__PURE__*/React.createElement("span", null, "0%"), /*#__PURE__*/React.createElement("span", null, uiText("+ superávit", "+ surplus", "+ superávit")))), /*#__PURE__*/React.createElement("label", {
        style: {
          color: "var(--text2)",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          marginBottom: 10
        }
      }, /*#__PURE__*/React.createElement("input", {
        type: "checkbox",
        checked: gaUseProtTol,
        onChange: e => setGAUseProtTol(e.target.checked)
      }), uiText("Definir flexibilidade de proteína", "Set protein flexibility", "Definir flexibilidad de proteína")), gaUseProtTol && /*#__PURE__*/React.createElement("div", {
        style: {
          marginBottom: 12
        }
      }, /*#__PURE__*/React.createElement("label", {
        style: {
          color: "var(--text2)",
          fontSize: 12
        }
      }, uiText("Flexibilidade de proteína: ", "Protein flexibility: ", "Flexibilidad de proteína: ") + gaProtTolerance + "%"), /*#__PURE__*/React.createElement("input", {
        type: "range",
        min: 5,
        max: 50,
        value: gaProtTolerance,
        onChange: e => setGAProtTolerance(parseInt(e.target.value)),
        style: {
          width: "100%"
        }
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          borderTop: "1px solid var(--border2)",
          paddingTop: 10
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 8
        }
      }, uiText("Limites absolutos (opcional)", "Absolute limits (optional)", "Límites absolutos (opcional)")), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: isMobileView ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: 8
        }
      }, [{
        key: "kmin",
        label: uiText("Calorias mín.", "Min calories", "Calorías mín."),
        unit: "kcal",
        value: gaKcalMin,
        set: setGAKcalMin,
        ph: uiText("auto: sem mínimo", "auto: no minimum", "auto: sin mínimo")
      }, {
        key: "kmax",
        label: uiText("Calorias máx.", "Max calories", "Calorías máx."),
        unit: "kcal",
        value: gaKcalMax,
        set: setGAKcalMax,
        ph: "auto: " + Math.round(Math.max(50, (goals.kcal || 2000) - Object.values(activeLog).flat().reduce((s, e) => s + (e.kcal || 0), 0)) * (1 + gaTolerance / 100)) + " kcal"
      }, {
        key: "pmin",
        label: uiText("Proteína mín.", "Min protein", "Proteína mín."),
        unit: "g",
        value: gaProtMin,
        set: setGAProtMin,
        ph: uiText("auto: aprox. ", "auto: approx. ", "auto: aprox. ") + Math.round(Math.max(10, (goals.protein || 150) - Object.values(activeLog).flat().reduce((s, e) => s + (e.protein || 0), 0)) * 0.5) + "g"
      }, {
        key: "pmax",
        label: uiText("Proteína máx.", "Max protein", "Proteína máx."),
        unit: "g",
        value: gaProtMax,
        set: setGAProtMax,
        ph: uiText("auto: aprox. ", "auto: approx. ", "auto: aprox. ") + Math.round(Math.max(10, (goals.protein || 150) - Object.values(activeLog).flat().reduce((s, e) => s + (e.protein || 0), 0)) * 1.5) + "g"
      }].map(item => /*#__PURE__*/React.createElement("label", {
        key: item.key,
        style: {
          display: "block",
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: "block",
          color: "var(--text2)",
          fontSize: 12,
          marginBottom: 4
        }
      }, item.label), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6
        }
      }, /*#__PURE__*/React.createElement("input", {
        type: "number",
        min: 0,
        value: item.value,
        placeholder: item.ph,
        onChange: e => item.set(e.target.value),
        style: {
          ...inp,
          marginTop: 0,
          minWidth: 0,
          flex: 1
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          color: "var(--muted)",
          fontSize: 11,
          width: 28
        }
      }, item.unit))))))), /*#__PURE__*/React.createElement("label", {
        style: sBtnLbl("var(--btn-warn)", "var(--btn-warn-border)", "#c87e7e")
      }, uiText("\u2191 Importar dia", "\u2191 Import day", "\u2191 Importar día"), /*#__PURE__*/React.createElement("input", {
        type: "file",
        accept: ".json",
        onChange: importDayLog,
        style: {
          display: "none"
        }
      }))), showExportPanel && /*#__PURE__*/React.createElement("div", {
        style: {
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "12px",
          marginBottom: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          color: "var(--muted)",
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: 8
        }
      }, uiText("Formato \u2014 ", "Format \u2014 ", "Formato \u2014 "), showExportPanel === "day" ? uiText("dia ", "day ", "día ") + viewDate : uiText("últimos 7 dias", "last 7 days", "últimos 7 días")), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6
        }
      }, [["json", "JSON", uiText("dados completos", "full data", "datos completos")], ["csv", "CSV", uiText("para Excel", "for Excel", "para Excel")], ["html", "HTML", uiText("relatório web", "web report", "informe web")], ["txt", "TXT", uiText("texto simples", "plain text", "texto simple")]].map(([fmt, label, desc]) => /*#__PURE__*/React.createElement("button", {
        key: fmt,
        onClick: () => runExport(showExportPanel, fmt),
        style: {
          background: "var(--input)",
          border: "1px solid var(--border2)",
          borderRadius: 6,
          padding: "8px 10px",
          cursor: "pointer",
          textAlign: "left"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          color: "var(--text3)",
          fontWeight: 600
        }
      }, label), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          color: "var(--muted)",
          marginTop: 2
        }
      }, desc))))), exportResult && /*#__PURE__*/React.createElement("div", {
        style: {
          background: "var(--surface)",
          border: "1px solid #2a3a2a",
          borderRadius: 6,
          padding: "12px"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14,
          color: "var(--btn-ok-text)"
        }
      }, "\u2713 ", exportResult.filename), /*#__PURE__*/React.createElement("button", {
        onClick: () => setExportResult(null),
        style: {
          background: "none",
          border: "none",
          color: "var(--muted)",
          cursor: "pointer",
          fontSize: 14
        }
      }, "\xD7")), /*#__PURE__*/React.createElement("textarea", {
        readOnly: true,
        value: exportResult.content,
        style: {
          ...inp,
          height: 120,
          fontSize: 14,
          fontFamily: "monospace",
          resize: "vertical",
          marginTop: 0,
          color: "var(--muted2)"
        }
      }), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          navigator.clipboard.writeText(exportResult.content).then(() => {
            setExportResult(r => ({
              ...r,
              copied: true
            }));
            setTimeout(() => setExportResult(r => r ? {
              ...r,
              copied: false
            } : r), 3000);
          }).catch(() => notify(text('selectCopyManual')));
        },
        style: {
          ...btn,
          marginTop: 8,
          background: "var(--btn-ok)",
          border: "1px solid var(--btn-ok-border)",
          color: "var(--btn-ok-text)",
          fontSize: 14,
          letterSpacing: 1
        }
      }, exportResult.copied ? uiText("Copiado!", "Copied!", "Copiado!") : uiText("Copiar para área de transferência", "Copy to clipboard", "Copiar al portapapeles")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          color: "var(--dim)",
          marginTop: 6,
          textAlign: "center"
        }
      }, uiText("Cole em um editor de texto e salve como ", "Paste into a text editor and save as ", "Pega en un editor de texto y guarda como "), /*#__PURE__*/React.createElement("b", {
        style: {
          color: "var(--muted)"
        }
      }, exportResult.filename)))))
      }), tab === "despensa" && /*#__PURE__*/React.createElement(PantryScreen, {
        lang,
        isMobileView,
        text,
        form,
        setForm,
        showMicroForm,
        setShowMicroForm,
        editingId,
        setEditingId,
        editForm,
        setEditForm,
        autoFillLoading,
        foodDbLoading,
        foodDbResults,
        barcodeModalOpen,
        setBarcodeModalOpen,
        barcodeInput,
        setBarcodeInput,
        barcodeLoading,
        barcodeScanning,
        barcodeTorchAvailable,
        barcodeTorchEnabled,
        barcodeMessage,
        setBarcodeMessage,
        scannerVideoElement,
        closeBarcodeModal,
        startBarcodeScanner,
        stopBarcodeScanner,
        toggleBarcodeTorch,
        fetchBarcodeProduct,
        searchFoodDatabase,
        autoFillNutrition,
        pantrySearch,
        setPantrySearch,
        pantryItemsOpen,
        setPantryItemsOpen,
        mealTemplatesOpen,
        setMealTemplatesOpen,
        newFoodOpen,
        setNewFoodOpen,
        expandedTemplateIds,
        expandedPantryIds,
        setExpandedPantryIds,
        suppPantryOpen,
        setSuppPantryOpen,
        pantry,
        filteredPantry,
        sortedPantry,
        sortedAllPantry,
        mealTemplates,
        suppPantry,
        suppForm,
        setSuppForm,
        showSuppForm,
        setShowSuppForm,
        weightForm,
        setWeightForm,
        bodyComposition,
        macroFieldsOrdered: MACRO_FIELDS_ORDERED,
        macroFields: MACRO_FIELDS,
        microFields: MICRO_FIELDS,
        allFields: ALL_FIELDS,
        addFood,
        startEdit,
        saveEdit,
        removeFood,
        addSuppToPantry,
        removeSuppPantry,
        SavedMealCard,
        goals,
        editingTemplateId,
        templateEditDraft,
        mealOptions: MEALS,
        getMealLabel: mealLabel,
        toggleTemplateExpanded,
        appendTemplateToStaged,
        beginTemplateEdit,
        loadTemplate,
        deleteTemplate,
        setTemplateEditDraft,
        updateTemplateDraftItem,
        removeTemplateDraftItem,
        addTemplateDraftItem,
        cancelTemplateEdit,
        saveTemplateEdit
      }), tab === "semana" && /*#__PURE__*/React.createElement(WeekScreen, {
        lang,
        isMobileView,
        text,
        getMealLabel: mealLabel,
        chartTheme: CT,
        weekData,
        mealAverages,
        goals,
        latestWeekPoint,
        weekSummary: {
          avgProtein,
          avgKcal,
          daysMetProtein,
          daysWithData,
          calorieBank,
          calorieBankDays
        },
        patternsLoading,
        patternsText,
        patternsSaved,
        feedbackLoading,
        feedbackText,
        feedbackPeriod,
        feedbackSaved,
        showExportPanel,
        exportResult,
        onOpenDay: date => {
          setTab("diario");
          changeViewDate(date);
        },
        onToggleWeekExport: () => setShowExportPanel(showExportPanel === "week" ? null : "week"),
        onRunWeekExport: format => runExport("week", format),
        onDismissExportResult: () => setExportResult(null),
        onCopyExportResult: () => {
          navigator.clipboard.writeText(exportResult.content).then(() => {
            setExportResult(r => ({
              ...r,
              copied: true
            }));
            setTimeout(() => setExportResult(r => r ? {
              ...r,
              copied: false
            } : r), 3000);
          }).catch(() => notify(text('selectCopyManual')));
        },
        onGeneratePatterns: generateFoodPatterns,
        onSavePatterns: savePatterns,
        onGenerateWeekFeedback: () => generateFeedback("week"),
        onSaveFeedback: saveFeedbackAsNote
      }), tab === "metricas" && /*#__PURE__*/React.createElement(MetricsScreen, {
        lang,
        isMobileView,
        metricsSection,
        setMetricsSection,
        text,
        activityLevels: ACTIVITY_LEVELS,
        nutritionPrefs,
        saveNutritionPrefs,
        profileData,
        saveProfileHeight,
        currentHeight,
        bodyComposition,
        updateBodyFatGoalTarget,
        bodyFatGoalAutoKg,
        baseGoals,
        calorieBase,
        calorieAdjustment,
        goals,
        automaticGoalAdjustment: getGoalAdjustment(nutritionPrefs),
        automaticProteinMultiplier: defaultProteinMultiplier(nutritionPrefs.goalType).toFixed(1),
        editingGoals,
        saveGoals,
        startEditGoals,
        goalDraft,
        setGoalDraft,
        customGoals,
        calorieAdjustmentWarning,
        weightForm,
        setWeightForm,
        currentWeight,
        today: TODAY,
        saveWeight,
        bmi,
        bmiNum,
        currentBmr,
        currentTrainingGoals: computeGoals(currentWeight, true, {
          height: currentHeight,
          birthDate: profileData.birthDate,
          gender: profileData.gender,
          prefs: nutritionPrefs
        }),
        currentRestGoals: computeGoals(currentWeight, false, {
          height: currentHeight,
          birthDate: profileData.birthDate,
          gender: profileData.gender,
          prefs: nutritionPrefs
        }),
        weightChartData,
        bmrChartData,
        bodyMetricChartConfigs,
        chartTheme: CT,
        bodyMetrics,
        normalizedWeightEntries,
        editingWeightId,
        editWeightForm,
        setEditWeightForm,
        expandedWeightHistoryIds,
        setExpandedWeightHistoryIds,
        historyFieldAvailability,
        saveWeightEdit,
        startEditWeight,
        setWeightHistory,
        weightHistory,
        bodyCompositionOpen,
        setBodyCompositionOpen,
        bodyGoalForm,
        setBodyGoalForm,
        suggestedBodyGoalWeeks: getSuggestedBodyGoalWeeks(),
        saveBodyFatGoal,
        weeklyProgress,
        weightTrend,
        metricsProgressOpen,
        setMetricsProgressOpen,
        metricsProgressInfoOpen,
        setMetricsProgressInfoOpen,
        reportsEnabled: REPORTS_ENABLED,
        onOpenAdvancedReports: () => {
          setReportMessage("");
          setReportModalOpen(true);
        }
      }))));
    }
    const inp = {
      width: "100%",
      background: "var(--input)",
      border: "1px solid var(--border2)",
      color: "var(--text2)",
      padding: "9px 12px",
      borderRadius: 6,
      fontSize: 14,
      fontFamily: "inherit",
      boxSizing: "border-box",
      outline: "none",
      marginTop: 3
    };
    const lbl = {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      display: "block"
    };
    const btn = {
      width: "100%",
      background: "var(--btn-ok)",
      border: "1px solid var(--btn-ok-border)",
      color: "var(--btn-ok-text)",
      padding: "11px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: "inherit",
      marginTop: 4
    };
    function sBtn(bg, border, color, extra = {}) {
      return {
        background: bg,
        border: "1px solid " + border,
        color,
        borderRadius: 4,
        padding: "6px 10px",
        fontSize: 14,
        letterSpacing: 1,
        textTransform: "uppercase",
        cursor: "pointer",
        ...extra
      };
    }
    function sBtnLbl(bg, border, color, extra = {}) {
      return {
        ...sBtn(bg, border, color, extra),
        display: "inline-block"
      };
    }

    return { NutritionTracker };
  }

  return { createNutritionTrackerController };
});
