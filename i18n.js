/**
 * Internationalization dictionaries, locale selection, and navigation-key helpers.
 *
 * The UMD module exposes a `createI18n` factory and requires no injected
 * dependencies. It accepts language codes, translation dictionaries, dot-path
 * keys, interpolation parameters, meal-storage keys, and tab aliases, and
 * returns normalized codes, localized values, display labels, and stable keys.
 *
 * DATA-SCHEMA WARNING: `MEAL_KEYS` contains the exact Portuguese keys stored in
 * users' Firestore diary logs and meal templates. Its values and order, together
 * with the positional `STRINGS.pt/en/es.meals` arrays, must not change without
 * an explicit data-migration plan.
 *
 * @module I18n
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.I18n = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the complete i18n API without external runtime dependencies.
   *
   * @returns {Object} Language options, dictionaries, stable keys, and localization helpers.
   */
  function createI18n() {
    const LANGUAGE_OPTIONS = [
      { code: "pt", flag: "🇧🇷", label: "Português", short: "PT" },
      { code: "en", flag: "🇺🇸", label: "English", short: "EN" },
      { code: "es", flag: "🇪🇸", label: "Español", short: "ES" }
    ];

    /**
     * Normalizes an app language code against the persisted-language allowlist.
     *
     * @param {string} lang Candidate language code.
     * @returns {"pt"|"en"|"es"} Supported language code, falling back to Portuguese.
     */
    function normalizeLanguage(lang) {
      return LANGUAGE_OPTIONS.some(option => option.code === lang) ? lang : "pt";
    }

    /**
     * Returns the UI metadata for a normalized language.
     *
     * @param {string} lang Candidate language code.
     * @returns {Object} Language option containing code, flag, label, and abbreviation.
     */
    function getLanguageOption(lang) {
      const normalized = normalizeLanguage(lang);
      return LANGUAGE_OPTIONS.find(option => option.code === normalized) || LANGUAGE_OPTIONS[0];
    }

    /**
     * Selects one of three language variants with Portuguese fallback.
     *
     * @param {string} lang Candidate language code.
     * @param {*} pt Portuguese value and fallback.
     * @param {*} en English value.
     * @param {*} es Spanish value.
     * @returns {*} Selected language value.
     */
    function pickLang(lang, pt, en, es) {
      const normalized = normalizeLanguage(lang);
      if (normalized === "en") return en !== undefined ? en : pt;
      if (normalized === "es") return es !== undefined ? es : pt;
      return pt;
    }

    /**
     * Reads a nested translation value by dot path.
     *
     * @param {Object} dictionary Translation dictionary keyed by language.
     * @param {string} language Candidate language code.
     * @param {string} key Dot path such as `backup.title`.
     * @returns {*} Localized value, or `undefined` when the path does not exist.
     */
    function getLocalizedValue(dictionary, language, key) {
      const root = dictionary && dictionary[normalizeLanguage(language)];
      if (!root) return undefined;
      return String(key).split(".").reduce((value, part) => value == null ? undefined : value[part], root);
    }

    /**
     * Applies simple token interpolation to a localized string.
     *
     * @param {*} template Translated template, normally containing `{token}` placeholders.
     * @param {Object} [params={}] Replacement values keyed by token name.
     * @returns {*} Interpolated string, or the original nullish/non-string value.
     */
    function formatLocalizedText(template, params = {}) {
      if (template == null) return template;
      if (typeof template !== "string") return template;
      return template.replace(/\{(\w+)\}/g, (_, name) => {
        return params[name] == null ? "" : String(params[name]);
      });
    }

    /**
     * Creates a translation reader with Portuguese and key-name fallbacks.
     *
     * @param {string} language Active app language.
     * @param {Object} dictionary Translation dictionary keyed by language.
     * @returns {function(string, Object=): *} Translation reader with interpolation support.
     */
    function createTextGetter(language, dictionary) {
      return function text(key, params = {}) {
        const value =
          getLocalizedValue(dictionary, language, key) ??
          getLocalizedValue(dictionary, "pt", key) ??
          key;
        return formatLocalizedText(value, params);
        };
    }

    /**
     * Selects the browser locale used by dates and number formatting.
     *
     * @param {string} lang Candidate language code.
     * @returns {"pt-BR"|"en-US"|"es-ES"} BCP-47 locale for Intl APIs.
     */
    function localeForLang(lang) {
      const normalized = normalizeLanguage(lang);
      if (normalized === "en") return "en-US";
      if (normalized === "es") return "es-ES";
      return "pt-BR";
    }

    /**
     * Selects the compact locale used for language-aware sorting.
     *
     * @param {string} lang Candidate language code.
     * @returns {"pt"|"en"|"es"} Locale passed to string comparison APIs.
     */
    function sortLocaleForLang(lang) {
      const normalized = normalizeLanguage(lang);
      if (normalized === "en") return "en";
      if (normalized === "es") return "es";
      return "pt";
    }

    const STRINGS = {
      pt: {
        // App
        appTitle: "Diário Nutricional",
        langBtn: "English",
        // Header
        dayOf: "Dia de",
        trainDay: "Treino",
        restDay: "Descanso",
        syncDone: "sync",
        syncing: "sync...",
        lightMode: "",
        darkMode: "",
        settings: "Configurações",
        greetingMorning: "Bom dia",
        greetingAfternoon: "Boa tarde",
        greetingEvening: "Boa noite",
        greetingLine: "Vamos cuidar do plano de hoje.",
        // Tabs
        tabDiary: "Diário",
        tabAdd: "Registrar",
        tabPantry: "Alimentos",
        tabWeek: "Semana",
        tabMetrics: "Métricas",
        // Nutrients
        protein: "Proteína",
        calories: "Calorias",
        carbs: "Carboidratos",
        sugars: "dos quais açúcares",
        fat: "Gorduras",
        satfat: "das quais saturadas",
        fiber: "Fibra",
        salt: "Sal",
        water: "Água",
        // Micro
        vitB12: "Vitamina B12",
        niacin: "Niacina",
        phosphorus: "Fósforo",
        vitD: "Vitamina D",
        calcium: "Cálcio",
        iron: "Ferro",
        potassium: "Potássio",
        magnesium: "Magnésio",
        zinc: "Zinco",
        vitC: "Vitamina C",
        // Meals
        meals: ["Café da manhã", "Pré-treino", "Pós-treino", "Almoço", "Café da tarde", "Jantar", "Ceia", "Outro"],
        // Stats
        missing: "Faltam",
        exceeded: "Excedido",
        bmi: "IMC",
        // Goals
        proteinGoal: "proteína",
        kcalGoal: "kcal",
        // Diary
        noRecords: "Sem registros para este dia.",
        noFood: "Sem alimentos registrados.",
        todayNote: "Notas do dia...",
        histNote: "Notas do dia...",
        addToMeal: "Adicionar à refeição",
        selectFood: "Selecionar alimento",
        qty: "Quantidade",
        unit: "Unidade",
        addFood: "Adicionar",
        addManual: "Entrada manual",
        describeMealBtn: "Descrever refeição",
        describePlaceholder: "Ex: frango grelhado com arroz e salada",
        estimateBtn: "Estimar",
        estimating: "Estimando...",
        addEstimate: "Adicionar à refeição",
        staged: "Refeição em preparação",
        addAll: "Adicionar tudo",
        clearStaged: "Limpar",
        suggestBtn: "Sugerir o que comer",
        suggesting: "Sugerindo...",
        analyzeDayBtn: "Analisar alimentação do dia",
        analyzing: "Analisando...",
        saveNote: " Salvar nas notas",
        prevDay: "‹",
        nextDay: "›",
        // Water
        waterGoalLabel: "Meta de Água",
        waterToday: "hoje",
        waterAdd: "Adicionar",
        waterGoalEdit: "Meta:",
        waterGoalSave: "✓",
        // Supplements
        suppTitle: "Suplementos",
        suppName: "Nome",
        suppDose: "Dose padrão",
        suppUnit: "Unidade",
        suppNotes: "Notas (opcional)",
        suppAdd: "Adicionar suplemento",
        suppRegister: " Registrar suplemento",
        // Add tab modes
        modeOneByOne: "Um por um",
        modeBatch: "Montar refeição",
        modeDescribe: "Descrever prato",
        repeatRecent: "Repetir refeição recente",
        noRecentMeals: "Sem refeições recentes.",
        selectAndAdd: "Selecione alimentos e vá adicionando.",
        foodLabel: "Alimento",
        searchFood: " Pesquisar alimento...",
        logToDiary: "Registrar no diário",
        describeDish: "Descreva o prato",
        descPlaceholder: "Ex: frango grelhado com arroz e salada",
        confidence: "Confiança",
        noteLabel: "Nota",
        // Pantry detail
        defaultDose: "dose padrão:",
        pantryTitleCount: "Salvos",
        editItem: "editar",
        pantryTitleLabel: "Salvos",
        // Supplement
        suppSave: "Salvar suplemento",
        suppDoseLabel: "Dose padrão",
        suppNameLabel: "Nome",
        suppUnitLabel: "Unidade",
        suppNotesLabel: "Notas (opcional)",
        suppLogToday: "Registrar hoje",
        suppLoggedToday: "Suplementos registrados hoje",
        // Backup
        backupFull: "Backup Completo",
        copyJsonAs: "Copie este JSON e salve como",
        copyJson: "Copie este JSON:",
        copyManual: "Selecione o texto acima e copie manualmente.",
        // Diary
        noFoodToday: "Nenhum alimento registrado hoje.",
        microLabel: "Micronutrientes",
        notesPlaceholder: "Observações, contexto do dia, como te sentiste...",
        notesTitle: "Notas do dia",
        // History banner
        proteinUnit: "g proteína",
        kcalUnit: "kcal",
        // Week charts
        proteinChart: "proteinChart",
        kcalChart: "kcalChart",
        chooseFmt: "Escolha o formato",
        noRecentData: "Sem refeições recentes.",
        noWeekData: "Sem dados suficientes para esta semana.",
        // Metrics
        currentMetrics: "Métricas atuais",
        weightEvolution: "Evolução do peso",
        heightLabel: "Altura (cm)",
        heightPh: "ex: 175",
        logMeasurements: "Registrar medidas de hoje",
        customGoals: "Metas personalizadas",
        editGoals: "Editar metas",
        currentGoal: "Meta atual:",
        mealAverages: "Médias por refeição (últimos 30 dias)",
        patternsTitle: "Padrões - últimos 30 dias",
        historyLabel: "Histórico",
        avgProtein: "Média proteína",
        avgCalories: "Média calorias",
        daysProtGoal: "Dias meta prot.",
        goalKcalTrain: "Kcal treino",
        goalKcalRest: "Kcal descanso",
        goalProtTrain: "Prot. treino",
        goalProtRest: "Prot. descanso",
        bmiUnderweight: "Abaixo do peso",
        bmiNormal: "Peso normal",
        bmiOverweight: "Sobrepeso",
        bmiObese: "Obesidade",
        totalLabel: "Total:",
        loading: "Carregando...",
        selectCopyManual: "Selecione o texto e copie manualmente.",
        templates2: "Modelos rápidos",
        // AI
        aiAnalyze: "Analisar alimentação do dia",
        aiAnalyzeWeek: "Analisar alimentação da semana",
        aiPatterns: "Analisar padrões alimentares (30 dias)",
        analyzingPatterns: "Analisando 30 dias...",
        savedNote: " Salvar nas notas",
        // Add tab
        addTabTitle: "Adicionar alimento",
        foodName: "Nome do alimento",
        foodNamePh: "ex: Banana, Frango grelhado...",
        unitLabel: "Unidade",
        autofillBtn: "Preencher automaticamente",
        autofilling: "Preenchendo...",
        macros: "macros",
        micros: "Micronutrientes",
        hideMicro: "Ocultar micronutrientes",
        showMicro: "Micronutrientes (opcional)",
        savePantry: "Salvar alimento",
        meal: "Refeição",
        // Pantry
        pantryTitle: "Salvos",
        pantrySearch: "Pesquisar alimentos salvos...",
        pantryEmpty: "Nenhum alimento salvo.",
        noResults: "Nenhum resultado.",
        pantryEdit: "Editar",
        pantryDelete: "Apagar",
        pantrySave: "Salvar",
        pantryCancel: "Cancelar",
        pantryImport: "Importar",
        pantryExport: "Exportar",
        templates: "Modelos de refeição",
        templateName: "Nome do modelo...",
        saveTemplate: "Salvar modelo",
        applyTemplate: "Aplicar",
        deleteTemplate: "×",
        suppPantryTitle: "Suplementos",
        suppEmpty: "Nenhum suplemento adicionado.",
        // Export/Import
        exportImportTitle: "Exportar / Importar",
        exportDay: "Exportar dia",
        exportWeek: "Exportar semana",
        importMeals: "Importar refeições",
        importDay: "Importar dia",
        backupTitle: "Backup",
        backupDesc: "Exporta ou importa TODOS os dados: despensa, registros diários, peso, Água, suplementos.",
        exportBackup: "Exportar backup",
        exportingBackup: "Exportando...",
        importBackup: "Importar backup",
        backupCopyJson: "Copie este JSON e salve como",
        copyBtn: "Copiar",
        close: "Fechar",
        // Week
        weekNoData: "Ainda não há dados suficientes.",
        weekTitle: "últimos 7 dias",
        exportWeekBtn: "Exportar semana",
        // Metrics
        metricsTitle: "Métricas",
        weight: "Peso",
        weightUnit: "kg",
        weightPh: "ex: 73.5",
        addWeight: "Registrar peso",
        weightHistory: "Histórico de peso",
        noWeightData: "Nenhum registro de peso.",
        deleteWeight: "×",
        goals: "Metas",
        goalProtein: "Proteína (g)",
        goalKcal: "Calorias (kcal)",
        goalCarbs: "Carboidratos (g)",
        goalFat: "Gorduras (g)",
        goalFiber: "Fibra (g)",
        goalSalt: "Sal (g)",
        goalWater: "Água (ml)",
        saveGoals: "Salvar metas",
        resetGoals: "Repor padrão",
        training: "Treino",
        rest: "Descanso",
        // Notifications
        notifFilled: "Campos preenchidos automaticamente. Confira os valores!",
        notifSaved: "Salvo.",
        notifDeleted: "Removido.",
        notifImported: "importado(s).",
        notifCopied: "JSON copiado!",
        notifBackupDone: "Backup gerado! Copie o JSON abaixo.",
        notifRestored: "registros importados. Recarregue a página para ver tudo.",
        notifEmpty: "Arquivo vazio ou inválido.",
        notifNoFood: "Nenhum alimento encontrado.",
        notifWeightSaved: "Peso salvo.",
        notifGoalsSaved: "Metas salvas.",
        notifNotesSaved: "Nota salva.",
        // Date
        today: "Hoje",
        yesterday: "Ontem",
        weekDays: ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"],
        months: ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
        // Format strings
        exportFormat: "Formato",
        formatJson: "dados completos",
        formatCsv: "para Excel",
        formatHtml: "relatório web",
        formatTxt: "texto simples",
        // Misc
        syncing2: "Sincronizando...",
        confirmImport: "Importar %d registros? Os dados existentes com as mesmas chaves serão substituídos.",
        confirmDelete: "Apagar?",
        noDataPatterns: "Sem dados suficientes paranalisando."
      },
      en: {
        // App
        appTitle: "Nutrition Tracker",
        langBtn: "Português",
        // Header
        dayOf: "Day type",
        trainDay: "Training",
        restDay: "Rest",
        syncDone: "sync",
        syncing: "syncing...",
        lightMode: "",
        darkMode: "",
        settings: "Settings",
        greetingMorning: "Good morning",
        greetingAfternoon: "Good afternoon",
        greetingEvening: "Good evening",
        greetingLine: "Let's keep today's plan on track.",
        // Tabs
        tabDiary: "Diary",
        tabAdd: "Log",
        tabPantry: "Foods",
        tabWeek: "Week",
        tabMetrics: "Metrics",
        // Nutrients
        protein: "Protein",
        calories: "Calories",
        carbs: "Carbohydrates",
        sugars: "of which sugars",
        fat: "Fats",
        satfat: "of which saturated",
        fiber: "Fiber",
        salt: "Sodium",
        water: "Water",
        // Micro
        vitB12: "Vitamin B12",
        niacin: "Niacin",
        phosphorus: "Phosphorus",
        vitD: "Vitamin D",
        calcium: "Calcium",
        iron: "Iron",
        potassium: "Potassium",
        magnesium: "Magnesium",
        zinc: "Zinc",
        vitC: "Vitamin C",
        // Meals
        meals: ["Breakfast", "Pre-workout", "Post-workout", "Lunch", "Afternoon snack", "Dinner", "Supper", "Other"],
        // Stats
        missing: "Missing",
        exceeded: "Exceeded",
        bmi: "BMI",
        // Goals
        proteinGoal: "protein",
        kcalGoal: "kcal",
        // Diary
        noRecords: "No records for this day.",
        noFood: "No foods logged.",
        todayNote: "Notes for today...",
        histNote: "Notes for this day...",
        addToMeal: "Add to meal",
        selectFood: "Select food",
        qty: "Amount",
        unit: "Unit",
        addFood: "Add",
        addManual: "Manual entry",
        describeMealBtn: "Describe meal",
        describePlaceholder: "e.g. grilled chicken with rice and salad",
        estimateBtn: "Estimate",
        estimating: "Estimating...",
        addEstimate: "Add to meal",
        staged: "Meal in progress",
        addAll: "Add all",
        clearStaged: "Clear",
        suggestBtn: "Suggest what to eat",
        suggesting: "Suggesting...",
        analyzeDayBtn: "Analyze today's nutrition",
        analyzing: "Analyzing...",
        saveNote: " Save to notes",
        prevDay: "‹",
        nextDay: "›",
        // Water
        waterGoalLabel: "Water goal",
        waterToday: "today",
        waterAdd: "Add",
        waterGoalEdit: "Goal:",
        waterGoalSave: "✓",
        // Supplements
        suppTitle: "Supplements",
        suppName: "Name",
        suppDose: "Default dose",
        suppUnit: "Unit",
        suppNotes: "Notes (optional)",
        suppAdd: "Add supplement",
        suppRegister: " Log supplement",
        // Add tab modes
        modeOneByOne: "One by one",
        modeBatch: "Build a meal",
        modeDescribe: "Describe dish",
        repeatRecent: "Repeat recent meal",
        noRecentMeals: "No recent meals.",
        selectAndAdd: "Select foods and add them one by one.",
        foodLabel: "Food",
        searchFood: " Search food...",
        logToDiary: "Log to diary",
        describeDish: "Describe the dish",
        descPlaceholder: "e.g. grilled chicken with rice and salad",
        confidence: "Confidence",
        noteLabel: "Note",
        // Pantry detail
        defaultDose: "default dose:",
        pantryTitleCount: "Saved items",
        editItem: "edit",
        pantryTitleLabel: "Saved items",
        // Supplement
        suppSave: "Save supplement",
        suppDoseLabel: "Default dose",
        suppNameLabel: "Name",
        suppUnitLabel: "Unit",
        suppNotesLabel: "Notes (optional)",
        suppLogToday: "Log today",
        suppLoggedToday: "Supplements logged today",
        // Backup
        backupFull: "Full Backup",
        copyJsonAs: "Copy this JSON and save as",
        copyJson: "Copy this JSON:",
        copyManual: "Select the text above and copy manually.",
        // Diary
        noFoodToday: "No foods logged today.",
        microLabel: "MICRONUTRIENTS",
        notesPlaceholder: "Notes, context, how you felt today...",
        notesTitle: "Day notes",
        // History banner
        proteinUnit: "g protein",
        kcalUnit: "kcal",
        // Week charts
        proteinChart: "Protein (g) - 7 days",
        kcalChart: "Calories - 7 days",
        chooseFmt: "Choose format",
        noRecentData: "No recent meals.",
        noWeekData: "Not enough data for this week.",
        // Metrics
        currentMetrics: "Current metrics",
        weightEvolution: "Weight evolution",
        heightLabel: "Height (cm)",
        heightPh: "e.g. 175",
        logMeasurements: "Log today's measurements",
        customGoals: "Custom goals",
        editGoals: "Edit goals",
        currentGoal: "Current goal:",
        mealAverages: "Meal averages (last 30 days)",
        patternsTitle: "Patterns - last 30 days",
        historyLabel: "History",
        avgProtein: "Avg protein",
        avgCalories: "Avg calories",
        daysProtGoal: "Days protein goal met",
        goalKcalTrain: "Kcal training",
        goalKcalRest: "Kcal rest",
        goalProtTrain: "Prot. training",
        goalProtRest: "Prot. rest",
        bmiUnderweight: "Underweight",
        bmiNormal: "Normal weight",
        bmiOverweight: "Overweight",
        bmiObese: "Obese",
        totalLabel: "Total:",
        loading: "Loading...",
        selectCopyManual: "Select the text and copy manually.",
        templates2: "Quick templates",
        // AI
        aiAnalyze: "Analyze today's nutrition",
        aiAnalyzeWeek: "Analyze this week's nutrition",
        aiPatterns: "Analyze eating patterns (30 days)",
        analyzingPatterns: "Analyzing 30 days...",
        savedNote: " Save to notes",
        // Add tab
        addTabTitle: "Add food",
        foodName: "Food name",
        foodNamePh: "e.g. Banana, Grilled chicken...",
        unitLabel: "Unit",
        autofillBtn: "Auto-fill",
        autofilling: "Filling...",
        macros: "Macronutrients",
        micros: "Micronutrients",
        hideMicro: "Hide micronutrients",
        showMicro: "Micronutrients (optional)",
        savePantry: "Save food",
        meal: "Meal",
        // Pantry
        pantryTitle: "Saved items",
        pantrySearch: "Search saved foods...",
        pantryEmpty: "No saved foods.",
        noResults: "No results.",
        pantryEdit: "Edit",
        pantryDelete: "Delete",
        pantrySave: "Save",
        pantryCancel: "Cancel",
        pantryImport: "Import",
        pantryExport: "Export",
        templates: "Meal templates",
        templateName: "Template name...",
        saveTemplate: "Save template",
        applyTemplate: "Apply",
        deleteTemplate: "×",
        suppPantryTitle: "Supplements",
        suppEmpty: "No supplements added.",
        // Export/Import
        exportImportTitle: "Export / Import",
        exportDay: "Export day",
        exportWeek: "Export week",
        importMeals: "Import meals",
        importDay: "Import day",
        backupTitle: "Backup / Restore data",
        backupDesc: "Export or import ALL data: pantry, daily logs, weight, water, supplements.",
        exportBackup: "Export backup",
        exportingBackup: "Exporting...",
        importBackup: "Import backup",
        backupCopyJson: "Copy this JSON and save as",
        copyBtn: "Copy",
        close: "Close",
        // Week
        weekNoData: "Not enough data yet.",
        weekTitle: "Last 7 days",
        exportWeekBtn: "Export week",
        // Metrics
        metricsTitle: "Metrics",
        weight: "Weight",
        weightUnit: "kg",
        weightPh: "e.g. 73.5",
        addWeight: "Log weight",
        weightHistory: "Weight history",
        noWeightData: "No weight records.",
        deleteWeight: "×",
        goals: "Goals",
        goalProtein: "Protein (g)",
        goalKcal: "Calories (kcal)",
        goalCarbs: "Carbs (g)",
        goalFat: "Fat (g)",
        goalFiber: "Fiber (g)",
        goalSalt: "Sodium (g)",
        goalWater: "Water (ml)",
        saveGoals: "Save goals",
        resetGoals: "Reset to default",
        training: "Training",
        rest: "Rest",
        // Notifications
        notifFilled: "Fields filled. Review and adjust if needed.",
        notifSaved: "Saved.",
        notifDeleted: "Deleted.",
        notifImported: "imported.",
        notifCopied: "JSON copied!",
        notifBackupDone: "Backup ready! Copy the JSON below.",
        notifRestored: "records imported. Reload the page to see everything.",
        notifEmpty: "Empty or invalid file.",
        notifNoFood: "No foods found.",
        notifWeightSaved: "Weight logged.",
        notifGoalsSaved: "Goals saved.",
        notifNotesSaved: "Notes saved.",
        // Date
        today: "Today",
        yesterday: "Yesterday",
        weekDays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        // Format strings
        exportFormat: "Format",
        formatJson: "full data",
        formatCsv: "for Excel",
        formatHtml: "web report",
        formatTxt: "plain text",
        // Misc
        syncing2: "Syncing...",
        confirmImport: "Import %d records? Existing data with the same keys will be replaced.",
        confirmDelete: "Delete?",
        noDataPatterns: "Not enough data to analyze."
      }
    };

    STRINGS.es = {
      ...STRINGS.pt,
      appTitle: "Diario Nutricional",
      langBtn: "Idioma",
      dayOf: "Día de",
      trainDay: "Entreno",
      restDay: "Descanso",
      syncDone: "sincronizado",
      syncing: "sincronizando...",
      settings: "Configuración",
      greetingMorning: "Buenos días",
      greetingAfternoon: "Buenas tardes",
      greetingEvening: "Buenas noches",
      greetingLine: "Cuidemos el plan de hoy.",
      tabDiary: "Diario",
      tabAdd: "Registrar",
      tabPantry: "Alimentos",
      tabWeek: "Semana",
      tabMetrics: "Métricas",
      protein: "Proteína",
      calories: "Calorías",
      carbs: "Carbohidratos",
      sugars: "de los cuales azúcares",
      fat: "Grasas",
      satfat: "de las cuales saturadas",
      fiber: "Fibra",
      salt: "Sal",
      water: "Agua",
      vitB12: "Vitamina B12",
      niacin: "Niacina",
      phosphorus: "Fósforo",
      vitD: "Vitamina D",
      calcium: "Calcio",
      iron: "Hierro",
      potassium: "Potasio",
      magnesium: "Magnesio",
      zinc: "Zinc",
      vitC: "Vitamina C",
      meals: ["Desayuno", "Pre-entreno", "Post-entreno", "Almuerzo", "Merienda", "Cena", "Colación", "Otro"],
      missing: "Faltan",
      exceeded: "Excedido",
      bmi: "IMC",
      proteinGoal: "proteína",
      kcalGoal: "kcal",
      noRecords: "Sin registros para este día.",
      noFood: "Sin alimentos registrados.",
      todayNote: "Notas del día...",
      histNote: "Notas del día...",
      addToMeal: "Agregar a la comida",
      selectFood: "Seleccionar alimento",
      qty: "Cantidad",
      unit: "Unidad",
      addFood: "Agregar",
      addManual: "Entrada manual",
      describeMealBtn: "Describir comida",
      describePlaceholder: "Ej.: pollo a la plancha con arroz y ensalada",
      estimateBtn: "Estimar",
      estimating: "Estimando...",
      addEstimate: "Agregar a la comida",
      staged: "Comida en preparación",
      addAll: "Agregar todo",
      clearStaged: "Limpiar",
      suggestBtn: "Sugerir qué comer",
      suggesting: "Sugiriendo...",
      analyzeDayBtn: "Analizar alimentación del día",
      analyzing: "Analizando...",
      saveNote: "Guardar en notas",
      waterGoalLabel: "Meta de agua",
      waterToday: "hoy",
      waterAdd: "Agregar",
      suppTitle: "Suplementos",
      suppName: "Nombre",
      suppUnit: "Unidad",
      suppDose: "Dosis predeterminada",
      suppNotes: "Notas (opcional)",
      suppAdd: "Agregar suplemento",
      suppRegister: "Registrar suplemento",
      modeOneByOne: "Uno por uno",
      modeBatch: "Montar comida",
      modeDescribe: "Describir plato",
      repeatRecent: "Repetir comida reciente",
      noRecentMeals: "Sin comidas recientes.",
      selectAndAdd: "Selecciona alimentos y agrégalos.",
      foodLabel: "Alimento",
      searchFood: "Buscar alimento...",
      logToDiary: "Registrar en el diario",
      describeDish: "Describe el plato",
      descPlaceholder: "Ej.: pollo a la plancha con arroz y ensalada",
      confidence: "Confianza",
      noteLabel: "Nota",
      pantryTitleCount: "Guardados",
      editItem: "editar",
      pantryTitleLabel: "Guardados",
      defaultDose: "dosis predeterminada:",
      suppSave: "Guardar suplemento",
      suppDoseLabel: "Dosis predeterminada",
      suppNameLabel: "Nombre",
      suppUnitLabel: "Unidad",
      suppNotesLabel: "Notas (opcional)",
      suppLogToday: "Registrar hoy",
      suppLoggedToday: "Suplementos registrados hoy",
      backupFull: "Backup completo",
      copyJsonAs: "Copia este JSON y guárdalo como",
      copyJson: "Copia este JSON:",
      copyManual: "Selecciona el texto anterior y cópialo manualmente.",
      noFoodToday: "Ningún alimento registrado hoy.",
      microLabel: "Micronutrientes",
      notesPlaceholder: "Observaciones, contexto del día, cómo te sentiste...",
      notesTitle: "Notas del día",
      proteinUnit: "g proteína",
      kcalUnit: "kcal",
      proteinChart: "Proteína (g) - últimos 7 días",
      kcalChart: "Calorías - últimos 7 días",
      chooseFmt: "Elige el formato",
      noRecentData: "Sin comidas recientes.",
      noWeekData: "No hay datos suficientes para esta semana.",
      currentMetrics: "Métricas actuales",
      weightEvolution: "Evolución del peso",
      heightLabel: "Altura (cm)",
      heightPh: "ej.: 175",
      logMeasurements: "Registrar medidas de hoy",
      customGoals: "Metas personalizadas",
      editGoals: "Editar metas",
      currentGoal: "Meta actual:",
      mealAverages: "Promedios por comida (últimos 30 días)",
      patternsTitle: "Patrones - últimos 30 días",
      historyLabel: "Historial",
      avgProtein: "Media proteína",
      avgCalories: "Media calorías",
      daysProtGoal: "Días meta prot.",
      totalLabel: "Total:",
      loading: "Cargando...",
      templates2: "Modelos rápidos",
      aiAnalyze: "Analizar alimentación del día",
      aiAnalyzeWeek: "Analizar alimentación de la semana",
      aiPatterns: "Analizar patrones alimentarios (30 días)",
      analyzingPatterns: "Analizando 30 días...",
      addTabTitle: "Agregar alimento",
      foodName: "Nombre del alimento",
      foodNamePh: "ej.: Banana, pollo a la plancha...",
      autofillBtn: "Rellenar automáticamente",
      autofilling: "Rellenando...",
      macros: "Macronutrientes",
      micros: "Micronutrientes",
      hideMicro: "Ocultar micronutrientes",
      showMicro: "Micronutrientes (opcional)",
      savePantry: "Guardar alimento",
      meal: "Comida",
      pantryTitle: "Guardados",
      pantrySearch: "Buscar alimentos guardados...",
      pantryEmpty: "Ningún alimento guardado.",
      noResults: "Sin resultados.",
      pantryEdit: "Editar",
      pantryDelete: "Eliminar",
      pantrySave: "Guardar",
      pantryCancel: "Cancelar",
      pantryImport: "Importar",
      pantryExport: "Exportar",
      templates: "Modelos de comida",
      templateName: "Nombre del modelo...",
      saveTemplate: "Guardar modelo",
      applyTemplate: "Aplicar",
      suppPantryTitle: "Suplementos",
      suppEmpty: "Ningún suplemento añadido.",
      exportImportTitle: "Exportar / Importar",
      exportDay: "Exportar día",
      exportWeek: "Exportar semana",
      importMeals: "Importar comidas",
      importDay: "Importar día",
      backupTitle: "Backup / Restaurar datos",
      backupDesc: "Exporta o importa datos restaurables: despensa, registros diarios, métricas, agua y suplementos.",
      exportBackup: "Exportar backup",
      exportingBackup: "Exportando...",
      importBackup: "Importar backup",
      backupCopyJson: "Copia este JSON y guárdalo como",
      copyBtn: "Copiar",
      close: "Cerrar",
      weekNoData: "Todavía no hay datos suficientes.",
      weekTitle: "Últimos 7 días",
      exportWeekBtn: "Exportar semana",
      metricsTitle: "Métricas",
      weight: "Peso",
      weightUnit: "kg",
      weightPh: "ej.: 73.5",
      addWeight: "Registrar peso",
      weightHistory: "Historial de peso",
      noWeightData: "Sin registros de peso.",
      goals: "Metas",
      goalProtein: "Proteína (g)",
      goalKcal: "Calorías (kcal)",
      goalKcalTrain: "Kcal entreno",
      goalKcalRest: "Kcal reposo",
      goalProtTrain: "Prot. entreno",
      goalProtRest: "Prot. reposo",
      goalCarbs: "Carbohidratos (g)",
      goalFat: "Grasas (g)",
      goalFiber: "Fibra (g)",
      goalSalt: "Sal (g)",
      goalWater: "Agua (ml)",
      saveGoals: "Guardar metas",
      resetGoals: "Restablecer valores",
      bmiUnderweight: "Bajo peso",
      bmiNormal: "Peso normal",
      bmiOverweight: "Sobrepeso",
      bmiObese: "Obesidad",
      selectCopyManual: "Selecciona el texto y cópialo manualmente.",
      savedNote: " Guardar en notas",
      unitLabel: "Unidad",
      training: "Entreno",
      rest: "Descanso",
      notifFilled: "Campos rellenados automáticamente. Revisa los valores.",
      notifSaved: "Guardado.",
      notifDeleted: "Eliminado.",
      notifImported: "importado(s).",
      notifCopied: "JSON copiado.",
      notifBackupDone: "Backup generado.",
      notifRestored: "registros importados. Recarga la página para verlo todo.",
      notifEmpty: "Archivo vacío o inválido.",
      notifNoFood: "No se encontró ningún alimento.",
      notifWeightSaved: "Peso guardado.",
      notifGoalsSaved: "Metas guardadas.",
      notifNotesSaved: "Nota guardada.",
      today: "Hoy",
      yesterday: "Ayer",
      weekDays: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
      months: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
      exportFormat: "Formato",
      formatJson: "datos completos",
      formatCsv: "para Excel",
      formatHtml: "informe web",
      formatTxt: "texto simple",
      syncing2: "Sincronizando...",
      confirmImport: "¿Importar %d registros? Los datos existentes con las mismas claves serán sustituidos.",
      confirmDelete: "¿Eliminar?",
      noDataPatterns: "No hay datos suficientes para analizar."
    };

    // Fixed Portuguese storage-schema keys. Do not reorder or translate without migration.
    const MEAL_KEYS = ["Café da manhã", "Pré-treino", "Pós-treino", "Almoço", "Café da tarde", "Jantar", "Ceia", "Outro"];

    /**
     * Returns positional display labels without changing the stable storage keys.
     *
     * @param {string} language Candidate language code.
     * @returns {Array<string>} Ordered meal labels, falling back to `MEAL_KEYS`.
     */
    function getMealLabelsForLanguage(language) {
      const normalized = normalizeLanguage(language);
      const labels = STRINGS[normalized] && STRINGS[normalized].meals;
      return Array.isArray(labels) ? labels : MEAL_KEYS;
    }

    /**
     * Normalizes translated tab aliases to stable navigation and tutorial IDs.
     *
     * @param {*} tabKey Candidate tab identifier or label.
     * @returns {*} Stable tab identifier, or the original unknown value.
     */
    function normalizeTabKey(tabKey) {
      const value = String(tabKey || "").trim().toLowerCase();
      const map = {
        diario: "diario",
        "di\u00e1rio": "diario",
        diary: "diario",
        adicionar: "adicionar",
        add: "adicionar",
        agregar: "adicionar",
        despensa: "despensa",
        alimentos: "despensa",
        pantry: "despensa",
        semana: "semana",
        week: "semana",
        metricas: "metricas",
        "m\u00e9tricas": "metricas",
        metrics: "metricas",
        metas: "metricas"
      };
      return map[value] || tabKey;
    }

    return {
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
    };
  }

  return { createI18n };
});
