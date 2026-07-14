// Diario Nutricional application script.
// This file is intentionally kept outside index.html so the app code is readable
// and third-party bundles remain isolated in vendor/. New feature code should keep
// calculation helpers documented where inputs/outputs are not immediately obvious.
const {useState,useEffect,useRef}=React;
const {LineChart,Line,XAxis,YAxis,Tooltip,ResponsiveContainer,ReferenceLine}=Recharts;
const APP_VERSION_LABEL = window.APP_VERSION_LABEL || "Diário Nutricional v0.8.0 Beta";
const MOST_RECENT_TUTORIAL_KEY = "tutorial_most_recent_version_seen";
const CURRENT_RELEASE_TUTORIAL_VERSION = "0.8.0-beta";
const RELEASE_TUTORIAL_TYPE = "release080";
const tutorialSeenKey = type => "tutorialSeen_" + type;

/**
 * Reads tutorial flags safely across legacy/string and current/boolean values.
 * Input: storage record shaped like { value }. Output: true only when the user
 * has explicitly completed the tutorial/release cycle.
 */
function hasSeenTutorial(record) {
  return record && (record.value === true || record.value === "true");
}

const TODAY = new Date().toISOString().split("T")[0];
function rnd(value) {
  const n = Number(value) || 0;
  return Math.round(n * 10) / 10;
}

const LANGUAGE_OPTIONS = [
  { code: "pt", flag: "🇧🇷", label: "Português (Brasil)", short: "PT-BR" },
  { code: "en", flag: "🇺🇸", label: "English (US)", short: "EN-US" },
  { code: "es", flag: "🇪🇸", label: "Español (España)", short: "ES" }
];

function normalizeLanguage(lang) {
  return LANGUAGE_OPTIONS.some(option => option.code === lang) ? lang : "pt";
}

function getLanguageOption(lang) {
  const normalized = normalizeLanguage(lang);
  return LANGUAGE_OPTIONS.find(option => option.code === normalized) || LANGUAGE_OPTIONS[0];
}

function pickLang(lang, pt, en, es) {
  const normalized = normalizeLanguage(lang);
  if (normalized === "en") return en !== undefined ? en : pt;
  if (normalized === "es") return es !== undefined ? es : pt;
  return pt;
}

/**
 * Reads a nested translation value by dot path.
 * Input: dictionary object, language code, and a key such as "backup.title".
 * Output: localized value or undefined when the key does not exist.
 */
function getLocalizedValue(dictionary, language, key) {
  const root = dictionary && dictionary[normalizeLanguage(language)];
  if (!root) return undefined;
  return String(key).split(".").reduce((value, part) => value == null ? undefined : value[part], root);
}

/**
 * Applies simple {token} interpolation to localized strings.
 * Input: translated template and replacement params. Output: display string.
 */
function formatLocalizedText(template, params = {}) {
  if (template == null) return template;
  if (typeof template !== "string") return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    return params[name] == null ? "" : String(params[name]);
  });
}

/**
 * Creates the app translation reader for the active language.
 * It falls back to Portuguese and finally to the key itself, so incomplete
 * Spanish/English coverage never crashes the UI.
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
 * Centralizes browser locale selection for dates and sorting.
 * Input: app language code. Output: a BCP-47 locale string safe for Intl APIs.
 */
function localeForLang(lang) {
  const normalized = normalizeLanguage(lang);
  if (normalized === "en") return "en-US";
  if (normalized === "es") return "es-ES";
  return "pt-BR";
}

function sortLocaleForLang(lang) {
  const normalized = normalizeLanguage(lang);
  if (normalized === "en") return "en";
  if (normalized === "es") return "es";
  return "pt";
}

/**
 * Release notices use an explicit version marker. Legacy boolean values mean
 * that an older release was acknowledged, so existing users still receive the
 * 0.8.0 welcome once without resetting their completed tab tutorials.
 */
function hasSeenCurrentRelease(record) {
  return !!record && record.value === CURRENT_RELEASE_TUTORIAL_VERSION;
}

async function markCurrentReleaseSeen() {
  await storage.set(MOST_RECENT_TUTORIAL_KEY, CURRENT_RELEASE_TUTORIAL_VERSION).catch(() => {});
}

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

function getGreetingPeriod(hour = new Date().getHours()) {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 19) return "afternoon";
  return "night";
}

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

// MEALS is now in STRINGS[lang].meals - resolved inside component
// MEAL_KEYS: fixed storage keys (always Portuguese, data was saved with these)
const MEAL_KEYS = ["Café da manhã", "Pré-treino", "Pós-treino", "Almoço", "Café da tarde", "Jantar", "Ceia", "Outro"];

/**
 * Returns meal labels for the current UI language while keeping MEAL_KEYS as
 * the only values used for storage. This avoids accidental string indexing
 * when a translation lookup fails.
 */
function getMealLabelsForLanguage(language) {
  const normalized = normalizeLanguage(language);
  const labels = STRINGS[normalized] && STRINGS[normalized].meals;
  return Array.isArray(labels) ? labels : MEAL_KEYS;
}

/**
 * Keeps navigation state on internal tab ids even when a translated label is
 * accidentally passed by a menu/tutorial.
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

const MACRO_FIELDS_BASE = [{
  key: "protein100",
  labelKey: "protein",
  unit: "g",
  color: "#c8a96e",
  required: true
}, {
  key: "kcal100",
  labelKey: "calories",
  unit: "kcal",
  color: "#8ec8c8",
  required: true
}, {
  key: "carbs100",
  labelKey: "carbs",
  unit: "g",
  color: "#a96ec8",
  required: false
}, {
  key: "sugars100",
  labelKey: "sugars",
  unit: "g",
  color: "#a96ec8",
  required: false,
  sub: true,
  group: "carbs"
}, {
  key: "fat100",
  labelKey: "fat",
  unit: "g",
  color: "#c86e8e",
  required: false
}, {
  key: "satfat100",
  labelKey: "satfat",
  unit: "g",
  color: "#c86e8e",
  required: false,
  sub: true,
  group: "fat"
}, {
  key: "fiber100",
  labelKey: "fiber",
  unit: "g",
  color: "#3a9a7a",
  required: false
}, {
  key: "salt100",
  labelKey: "salt",
  unit: "g",
  color: "var(--muted2)",
  required: false
}];
const MICRO_FIELDS_BASE = [{
  key: "b12_100",
  labelKey: "vitB12",
  unit: "µg"
}, {
  key: "niacin100",
  labelKey: "niacin",
  unit: "mg"
}, {
  key: "phosphorus100",
  labelKey: "phosphorus",
  unit: "mg"
}, {
  key: "vitd100",
  labelKey: "vitD",
  unit: "µg"
}, {
  key: "calcium100",
  labelKey: "calcium",
  unit: "mg"
}, {
  key: "iron100",
  labelKey: "iron",
  unit: "mg"
}, {
  key: "potassium100",
  labelKey: "potassium",
  unit: "mg"
}, {
  key: "magnesium100",
  labelKey: "magnesium",
  unit: "mg"
}, {
  key: "zinc100",
  labelKey: "zinc",
  unit: "mg"
}, {
  key: "vitc100",
  labelKey: "vitC",
  unit: "mg"
}];
const ALL_FIELDS_KEYS = [...MACRO_FIELDS_BASE, ...MICRO_FIELDS_BASE]; // keys only, no labels

const ACTIVITY_LEVELS = {
  sedentary: {
    factor: 1.2,
    pt: "Sedentario",
    en: "Sedentary",
    es: "Sedentario",
    descPt: "Pouco ou nenhum exercicio estruturado",
    descEn: "Little or no structured exercise",
    descEs: "Poco o ningún ejercicio estructurado"
  },
  light: {
    factor: 1.375,
    pt: "Levemente ativo",
    en: "Lightly active",
    es: "Ligeramente activo",
    descPt: "Exercicios leves 1 a 3 vezes por semana",
    descEn: "Light exercise 1 to 3 times per week",
    descEs: "Ejercicio ligero 1 a 3 veces por semana"
  },
  moderate: {
    factor: 1.55,
    pt: "Moderadamente ativo",
    en: "Moderately active",
    es: "Moderadamente activo",
    descPt: "Exercicios moderados 3 a 5 vezes por semana",
    descEn: "Moderate exercise 3 to 5 times per week",
    descEs: "Ejercicio moderado 3 a 5 veces por semana"
  },
  very: {
    factor: 1.725,
    pt: "Muito ativo",
    en: "Very active",
    es: "Muy activo",
    descPt: "Exercicios intensos 6 a 7 vezes por semana ou trabalho fisico exigente",
    descEn: "Intense exercise 6 to 7 times per week or demanding physical work",
    descEs: "Ejercicio intenso 6 a 7 veces por semana o trabajo físico exigente"
  },
  extreme: {
    factor: 1.9,
    pt: "Extremamente ativo",
    en: "Extremely active",
    es: "Extremadamente activo",
    descPt: "Atletas ou rotina extremamente ativa",
    descEn: "Athletes or extremely active routines",
    descEs: "Atletas o rutina extremadamente activa"
  }
};
const REST_FACTORS = {
  sedentary: 1.05,
  light: 1.25,
  moderate: 1.35,
  very: 1.45,
  extreme: 1.55
};
function calculateAge(birthDate, refDate = new Date()) {
  if (!birthDate) return null;
  const d = new Date(birthDate + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  let age = refDate.getFullYear() - d.getFullYear();
  const m = refDate.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < d.getDate())) age--;
  return age > 0 ? age : null;
}
function getGoalAdjustment(prefs) {
  const manual = prefs && prefs.manualAdjustment !== "" && prefs.manualAdjustment != null ? Number(prefs.manualAdjustment) : null;
  if (Number.isFinite(manual)) return Math.round(manual);
  const type = prefs?.goalType || "maintenance";
  if (type === "maintenance") return 0;
  const kg = Number(prefs?.goalKg);
  const weeks = Number(prefs?.goalWeeks);
  if (!kg || !weeks || kg <= 0 || weeks <= 0) return 0;
  const daily = Math.round(kg * 7700 / (weeks * 7));
  return type === "loss" ? -daily : daily;
}
function defaultProteinMultiplier(goalType) {
  return goalType === "loss" ? 2.0 : goalType === "gain" ? 2.2 : 1.6;
}
function getProteinMultiplier(prefs) {
  const manual = prefs && prefs.proteinMultiplier !== "" && prefs.proteinMultiplier != null ? Number(prefs.proteinMultiplier) : null;
  return Number.isFinite(manual) && manual > 0 ? manual : defaultProteinMultiplier(prefs?.goalType);
}
function computeGoals(weight, train, profile = {}) {
  const height = Number(profile.height);
  const referenceDate = profile.referenceDate ? new Date(profile.referenceDate + "T12:00:00") : new Date();
  const age = calculateAge(profile.birthDate, referenceDate);
  const gender = profile.gender;
  const prefs = profile.prefs || {};
  const activityLevel = prefs.activityLevel || "moderate";
  if (weight && height && age && (gender === "male" || gender === "female")) {
    const bmr = 10 * weight + 6.25 * height - 5 * age + (gender === "male" ? 5 : -161);
    const fa = train ? (ACTIVITY_LEVELS[activityLevel]?.factor || 1.55) : (REST_FACTORS[activityLevel] || 1.35);
    const baseCalories = Math.round(bmr * fa);
    const adjustment = getGoalAdjustment(prefs);
    const kcal = Math.max(1200, Math.round(baseCalories + adjustment));
    const proteinFactor = getProteinMultiplier(prefs);
    return {
      protein: Math.round(weight * proteinFactor),
      kcal,
      bmr: Math.round(bmr),
      fa,
      baseCalories,
      adjustment,
      proteinMultiplier: proteinFactor,
      carbs: Math.round(weight * (train ? 4.0 : 3.0)),
      fat: Math.round(weight * 0.9),
      fiber: 30,
      salt: 5
    };
  }
  if (!weight) return train ? {
    protein: 160,
    kcal: 3100,
    carbs: 330,
    fat: 75,
    fiber: 30,
    salt: 5
  } : {
    protein: 130,
    kcal: 2700,
    carbs: 230,
    fat: 65,
    fiber: 30,
    salt: 5
  };
  return train ? {
    protein: Math.round(weight * 2.2),
    kcal: Math.round(weight * 42),
    carbs: Math.round(weight * 4.5),
    fat: Math.round(weight * 1.0),
    fiber: 30,
    salt: 5
  } : {
    protein: Math.round(weight * 1.8),
    kcal: Math.round(weight * 37),
    carbs: Math.round(weight * 3.1),
    fat: Math.round(weight * 0.9),
    fiber: 30,
    salt: 5
  };
}

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

function getWeightForDate(history, date) {
  return [...history].filter(e => e.date <= date).sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}
function emptyFood() {
  const f = {
    name: "",
    unit: "g",
    portionSize: "100",
    unitWeightG: ""
  };
  ALL_FIELDS_KEYS.forEach(ff => {
    f[ff.key] = "";
  });
  return f;
}
function downloadFile(content, filename, mime) {
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
function downloadText(content, filename, type) {
  downloadFile(content, filename, type);
}
function quickQtys(unit) {
  if (unit === "ml") return [100, 150, 200, 250, 300, 500];
  if (unit === "un") return [1, 2, 3, 4];
  return [50, 100, 150, 200, 250, 300];
}
function divisor(unit) {
  return unit === "un" ? 1 : 100;
}
function portionLabel(unit, lang) {
  const currentLang = normalizeLanguage(lang);
  return unit === "un"
    ? pickLang(currentLang, "por 1 unidade", "per unit", "por unidad")
    : pickLang(currentLang, "por 100" + unit, "per 100" + unit, "por 100" + unit);
}
function dateLabel(date, lang) {
  const s = STRINGS[lang || 'pt'];
  if (date === TODAY) return `${s.today} ${formatDateDMY(date)}`;
  const d = new Date(date + "T12:00:00");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `${s.yesterday} ${formatDateDMY(date)}`;
  return formatDateDMY(date);
}

// Formats stored ISO dates for human-readable history rows. Storage keeps
// YYYY-MM-DD because it sorts correctly; the UI shows DD-MM-YYYY as requested.
function formatDateDMY(date) {
  if (!date || typeof date !== "string") return "—";
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}-${month}-${year}` : date;
}

function formatDateDM(date) {
  if (!date || typeof date !== "string") return "—";
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}-${month}` : date;
}

function capitalizeFirst(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function formatHeaderDate(date, lang) {
  if (!date || typeof date !== "string") return "—";
  const locale = localeForLang(lang);
  const d = new Date(date + "T12:00:00");
  const formatted = d.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
  return capitalizeFirst(formatted);
}

function addDays(date, n) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}
function Ring({
  value,
  max,
  color,
  size = 76,
  stroke = 7
}) {
  const r = (size - stroke) / 2,
    circ = 2 * Math.PI * r,
    offset = circ * (1 - Math.min(value / max, 1));
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    style: {
      transform: "rotate(-90deg)"
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: "var(--track)",
    strokeWidth: stroke
  }), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: value > max ? "#ff4d4d" : color,
    strokeWidth: stroke,
    strokeDasharray: circ,
    strokeDashoffset: offset,
    strokeLinecap: "round",
    style: {
      transition: "stroke-dashoffset 0.5s ease"
    }
  }));
}
function Bar({
  value,
  max,
  color,
  label,
  unit,
  sub
}) {
  if (!max) return null;
  const over = value > max;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: sub ? 4 : 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: sub ? 10 : 11,
      color: sub ? "#555" : "#777",
      paddingLeft: sub ? 10 : 0
    }
  }, sub ? "\u21B3 " : "", label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: over ? "#ff4d4d" : color
    }
  }, value % 1 === 0 ? value : value.toFixed(1), unit, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--dim)",
      fontSize: 10
    }
  }, " / ", max, unit))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: sub ? 3 : 5,
      background: "var(--track)",
      borderRadius: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: Math.min(value / max * 100, 100) + "%",
      borderRadius: 4,
      background: over ? "#ff4d4d" : color,
      transition: "width 0.4s ease"
    }
  })));
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

  // Temporary bridge for inline strings that are not yet in STRINGS.
  // Input: pt/en/es variants. Output: the variant for the active app language.
  const uiText = (pt, en, es) => pickLang(lang, pt, en, es);
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
  /**
   * Returns whether a key is safe to persist after startup.
   * If a large data key was not hydrated, saving its default empty state could
   * overwrite real Firestore data after a transient read failure.
   */
  function canPersistHydratedKey(key, value) {
    if (hydratedStorageKeysRef.current.has(key)) return true;
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return typeof value === "string" ? value.length > 0 : value !== null && value !== undefined;
  }

  function scheduleSave(key, value, delay = 800) {
    if (saveTimeout.current[key]) clearTimeout(saveTimeout.current[key]);
    saveTimeout.current[key] = setTimeout(() => {
      storage.set(key, typeof value === "string" ? value : JSON.stringify(value))
        .then(() => hydratedStorageKeysRef.current.add(key))
        .catch(() => {});
    }, delay);
  }
  useEffect(() => {
    if (loaded && canPersistHydratedKey("pantry_v2", pantry)) scheduleSave("pantry_v2", pantry);
  }, [pantry, loaded]);
  useEffect(() => {
    if (loaded) scheduleSave("log_v2_" + TODAY, log);
  }, [log, loaded]);
  useEffect(() => {
    if (loaded && canPersistHydratedKey("trainingByDate", trainingByDate)) scheduleSave("trainingByDate", trainingByDate);
  }, [trainingByDate, loaded]);
  useEffect(() => {
    if (loaded && canPersistHydratedKey("weightHistory", weightHistory)) scheduleSave("weightHistory", weightHistory);
  }, [weightHistory, loaded]);
  // Update function refs on every render (data refs set later, after activeLog is declared)
  window._exportFullBackup = exportFullBackup;
  window._importFullBackup = importFullBackup;
  window._exportAndDownload = exportAndDownload;
  useEffect(() => {
    if (loaded && canPersistHydratedKey("mealTemplates", mealTemplates)) scheduleSave("mealTemplates", mealTemplates);
  }, [mealTemplates, loaded]);
  useEffect(() => {
    if (loaded) scheduleSave("notes_" + TODAY, todayNote, 1500);
  }, [todayNote, loaded]);
  useEffect(() => {
    if (loaded && viewDate !== TODAY) scheduleSave("notes_" + viewDate, historyNote, 1500);
  }, [historyNote, loaded]);
  useEffect(() => {
    if (loaded && canPersistHydratedKey("waterGoal", waterGoal)) scheduleSave("waterGoal", waterGoal);
  }, [waterGoal, loaded]);
  useEffect(() => {
    if (loaded && waterCustomPreset) scheduleSave("waterCustomPreset", waterCustomPreset);
  }, [waterCustomPreset, loaded]);
  useEffect(() => {
    if (loaded) scheduleSave("waterIntake_" + TODAY, waterIntake);
  }, [waterIntake, loaded]);
  useEffect(() => {
    if (loaded && canPersistHydratedKey("suppPantry", suppPantry)) scheduleSave("suppPantry", suppPantry);
  }, [suppPantry, loaded]);
  useEffect(() => {
    if (loaded) scheduleSave("suppLog_" + TODAY, suppLog);
  }, [suppLog, loaded]);
  useEffect(() => {
    if (loaded && canPersistHydratedKey("customGoals", customGoals)) scheduleSave("customGoals", customGoals);
  }, [customGoals, loaded]);
  useEffect(() => {
    if (loaded && canPersistHydratedKey("goalHistory", goalHistory)) scheduleSave("goalHistory", goalHistory);
  }, [goalHistory, loaded]);
  async function changeViewDate(date) {
    setViewDate(date);
    if (date) setCalendarMonth(date.slice(0, 7));
    setEditEntryId(null);
    setDetailFood(null);
    if (date !== TODAY) {
      const [l, n] = await Promise.all([storage.get("log_v2_" + date).catch(() => null), storage.get("notes_" + date).catch(() => null)]);
      setHistoryLog(l ? normalizeMealKeys(JSON.parse(l.value)) : {});
      setHistoryNote(n ? n.value || "" : "");
    }
  }
  // Calculates the goal snapshot for one date and one explicit day type.
  // This is used both for read-only historical views and for intentional
  // retroactive edits, such as changing a past day from training to rest.
  function computeDayGoalSnapshot(date, dayIsTraining) {
    const we = getWeightForDate(weightHistory, date);
    const rawGoal = computeGoals(we?.weight || currentWeight, dayIsTraining, {
      height: we?.height || currentHeight,
      birthDate: profileData.birthDate,
      gender: profileData.gender,
      prefs: nutritionPrefs
    });
    const computedGoal = {
      ...rawGoal,
      protein: customGoals.protein || rawGoal.protein,
      kcal: customGoals.kcal || rawGoal.kcal,
      carbs: customGoals.carbs || rawGoal.carbs,
      fat: customGoals.fat || rawGoal.fat,
      fiber: customGoals.fiber || rawGoal.fiber,
      salt: customGoals.salt || rawGoal.salt
    };
  }
  function dayGoalForDate(date) {
    const dayIsTraining = trainingByDate[date] ?? true;
    const computedGoal = computeDayGoalSnapshot(date, dayIsTraining);
    return date !== TODAY && goalHistory[date] ? {...computedGoal, ...goalHistory[date]} : computedGoal;
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
    const days = [];
    // Week charts intentionally use 7 completed days plus today.
    // Today's value is projected and drawn as an in-progress segment, so the
    // chart does not look like nutrition suddenly collapsed before the day ends.
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split("T")[0];
      let dayLog = date === TODAY ? log : {};
      if (date !== TODAY) {
        const l = await storage.get("log_v2_" + date).catch(() => null);
        if (l) dayLog = normalizeMealKeys(JSON.parse(l.value));
      }
      const entries = Object.values(dayLog).flat();
      const we = getWeightForDate(weightHistory, date);
      const dayIsTraining = trainingByDate[date] ?? true;
      const rawGoal = computeGoals(we?.weight || currentWeight, dayIsTraining, {height: we?.height || currentHeight, birthDate: profileData.birthDate, gender: profileData.gender, prefs: nutritionPrefs});
      const computedGoal = {...rawGoal, protein: customGoals.protein || rawGoal.protein, kcal: customGoals.kcal || rawGoal.kcal, carbs: customGoals.carbs || rawGoal.carbs, fat: customGoals.fat || rawGoal.fat, fiber: customGoals.fiber || rawGoal.fiber, salt: customGoals.salt || rawGoal.salt};
      const g = date !== TODAY && goalHistory[date] ? {...computedGoal, ...goalHistory[date]} : computedGoal;
      const protein = entries.reduce((s, e) => s + (e.protein ?? 0), 0);
      const kcal = entries.reduce((s, e) => s + (e.kcal ?? 0), 0);
      const isTodayEntry = date === TODAY;
      const proteinTrend = Math.round(protein);
      const kcalTrend = Math.round(kcal);
      const carbs = entries.reduce((s, e) => s + (e.carbs ?? 0), 0);
      const fat = entries.reduce((s, e) => s + (e.fat ?? 0), 0);
      const fiber = entries.reduce((s, e) => s + (e.fiber ?? 0), 0);
      const salt = entries.reduce((s, e) => s + (e.salt ?? 0), 0);
      days.push({
        date,
        label: formatDateDM(date),
        day: d.getDate(),
        protein: Math.round(protein),
        proteinTrend,
        proteinPastLine: isTodayEntry ? null : proteinTrend,
        proteinTodayLine: null,
        kcal: Math.round(kcal),
        kcalTrend,
        kcalPastLine: isTodayEntry ? null : kcalTrend,
        kcalTodayLine: null,
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        fiber: Math.round(fiber),
        salt: Math.round(salt * 10) / 10,
        carbsGoal: g.carbs,
        fatGoal: g.fat,
        fiberGoal: g.fiber,
        saltGoal: g.salt,
        proteinGoal: g.protein,
        kcalGoal: g.kcal,
        baseCalories: rawGoal.baseCalories || g.kcal,
        adjustment: rawGoal.adjustment || 0,
        metProtein: protein >= g.protein,
        metKcal: kcal >= g.kcal * 0.85 && kcal <= g.kcal * 1.15,
        hasData: entries.length > 0,
        isToday: isTodayEntry
      });
    }
    const todayIdx = days.findIndex(d => d.isToday);
    if (todayIdx > 0) {
      days[todayIdx - 1].proteinTodayLine = days[todayIdx - 1].proteinTrend;
      days[todayIdx].proteinTodayLine = days[todayIdx].proteinTrend;
      days[todayIdx - 1].kcalTodayLine = days[todayIdx - 1].kcalTrend;
      days[todayIdx].kcalTodayLine = days[todayIdx].kcalTrend;
    }
    setWeekData(days);
  }
  async function loadMealAnalysis() {
    const acc = {};
    for (let i = 1; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split("T")[0];
      const l = await storage.get("log_v2_" + date).catch(() => null);
      if (!l) continue;
      const dayLog = JSON.parse(l.value);
      MEALS.forEach(meal => {
        const entries = dayLog[meal] || [];
        if (!entries.length) return;
        if (!acc[meal]) acc[meal] = {
          count: 0,
          protein: 0,
          kcal: 0,
          carbs: 0
        };
        acc[meal].count++;
        acc[meal].protein += entries.reduce((s, e) => s + (e.protein ?? 0), 0);
        acc[meal].kcal += entries.reduce((s, e) => s + (e.kcal ?? 0), 0);
        acc[meal].carbs += entries.reduce((s, e) => s + (e.carbs ?? 0), 0);
      });
    }
    const avgs = {};
    Object.entries(acc).forEach(([meal, d]) => {
      avgs[meal] = {
        count: d.count,
        avgProtein: Math.round(d.protein / d.count),
        avgKcal: Math.round(d.kcal / d.count),
        avgCarbs: Math.round(d.carbs / d.count)
      };
    });
    setMealAverages(avgs);
  }
  async function loadRecentMeals() {
    const results = [];
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
      MEALS.forEach(meal => {
        const entries = parsed[meal] || [];
        if (!entries.length) return;
        const protein = entries.reduce((s, e) => s + (e.protein ?? 0), 0);
        const kcal = entries.reduce((s, e) => s + (e.kcal ?? 0), 0);
        results.push({
          date,
          meal,
          entries,
          protein: Math.round(protein),
          kcal: Math.round(kcal)
        });
      });
    }
    setRecentMeals(results.slice(0, 30));
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
    const n = product.nutriments || {};
    const val = (...keys) => {
      for (const key of keys) {
        const v = n[key];
        if (v !== undefined && v !== null && v !== "") return Number(v);
      }
      return null;
    };
    const kcal = val("energy-kcal_100g", "energy-kcal", "energy_100g");
    const mapped = {
      protein100: val("proteins_100g", "proteins"),
      kcal100: kcal && kcal > 1000 ? Math.round(kcal / 4.184) : kcal,
      carbs100: val("carbohydrates_100g", "carbohydrates"),
      sugars100: val("sugars_100g", "sugars"),
      fat100: val("fat_100g", "fat"),
      satfat100: val("saturated-fat_100g", "saturated-fat"),
      fiber100: val("fiber_100g", "fiber"),
      salt100: val("salt_100g", "salt")
    };
    setForm(f => {
      const next = {
        ...f,
        name: product.product_name || product.generic_name || product.brands || f.name,
        unit: f.unit === "un" ? "g" : f.unit,
        portionSize: "100",
        unitWeightG: ""
      };
      Object.entries(mapped).forEach(([key, value]) => {
        if (Number.isFinite(value)) next[key] = String(Math.round(value * 10) / 10);
      });
      return next;
    });
    notify(pickLang(lang, "Valores importados do Open Food Facts. Revise antes de salvar.", "Values imported from Open Food Facts. Please review before saving.", "Valores importados de Open Food Facts. Revisa antes de guardar."), 6000);
  }
  function stopBarcodeScanner() {
    barcodeScanRef.current = false;
    if (barcodeControlsRef.current && typeof barcodeControlsRef.current.stop === "function") {
      try { barcodeControlsRef.current.stop(); } catch (_) {}
      barcodeControlsRef.current = null;
    }
    if (barcodeReaderRef.current && typeof barcodeReaderRef.current.reset === "function") {
      try { barcodeReaderRef.current.reset(); } catch (_) {}
    }
    if (barcodeStreamRef.current) {
      barcodeStreamRef.current.getTracks().forEach(track => track.stop());
      barcodeStreamRef.current = null;
    }
    setBarcodeScanning(false);
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
      const url = "https://world.openfoodfacts.org/api/v2/product/" + encodeURIComponent(barcode) + ".json?fields=product_name,generic_name,brands,nutriments,quantity";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Open Food Facts");
      const data = await res.json();
      if (!data || data.status !== 1 || !data.product) {
        setBarcodeMessage(pickLang(lang, "Produto não encontrado. Você pode preencher os dados manualmente.", "Product not found. You can enter the data manually.", "Producto no encontrado. Puedes completar los datos manualmente."));
        return;
      }
      applyFoodDbProduct(data.product);
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
  let barcodeLibPromise = null;
  function loadBarcodeFallbackLibrary() {
    const getLoaded = () => {
      const lib = window.ZXingBrowser || window.ZXing;
      if (lib && (lib.BrowserMultiFormatReader || lib.BrowserBarcodeReader)) return lib;
      return null;
    };
    const loaded = getLoaded();
    if (loaded) return Promise.resolve(loaded);
    if (barcodeLibPromise) return barcodeLibPromise;
    const urls = [
      "https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/index.min.js",
      "https://unpkg.com/@zxing/browser@0.1.5/umd/index.min.js",
      "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js",
      "https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js"
    ];
    barcodeLibPromise = new Promise((resolve, reject) => {
      let idx = 0;
      const tryNext = () => {
        const current = getLoaded();
        if (current) return resolve(current);
        if (idx >= urls.length) return reject(new Error("ZXing unavailable"));
        const script = document.createElement("script");
        script.src = urls[idx++];
        script.async = true;
        script.onload = () => {
          const lib = getLoaded();
          lib ? resolve(lib) : tryNext();
        };
        script.onerror = tryNext;
        document.head.appendChild(script);
      };
      tryNext();
    });
    return barcodeLibPromise;
  }
  async function startNativeBarcodeScanner() {
    const detector = new BarcodeDetector({formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"]});
    const stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: "environment"}, audio: false});
    barcodeStreamRef.current = stream;
    barcodeScanRef.current = true;
    setBarcodeScanning(true);
    setTimeout(async () => {
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      try { await videoRef.current.play(); } catch (_) {}
      const scan = async () => {
        if (!barcodeScanRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length) {
            const code = codes[0].rawValue;
            setBarcodeInput(code);
            await fetchBarcodeProduct(code);
            return;
          }
        } catch (_) {}
        if (barcodeScanRef.current) requestAnimationFrame(scan);
      };
      scan();
    }, 0);
  }
  async function startFallbackBarcodeScanner() {
    setBarcodeMessage(pickLang(lang, "Carregando leitor compatível...", "Loading compatible barcode scanner...", "Cargando lector compatible..."));
    const lib = await loadBarcodeFallbackLibrary();
    const Reader = lib.BrowserMultiFormatReader || lib.BrowserBarcodeReader;
    if (!Reader) throw new Error("ZXing reader unavailable");
    const reader = new Reader();
    barcodeReaderRef.current = reader;
    barcodeScanRef.current = true;
    setBarcodeScanning(true);
    setBarcodeMessage(pickLang(lang, "Aponte a câmera para o código de barras.", "Point the camera at the barcode.", "Apunta la cámara al código de barras."));
    setTimeout(async () => {
      if (!videoRef.current || !barcodeScanRef.current) return;
      try {
        if (typeof reader.decodeFromVideoDevice === "function") {
          const maybeControls = await reader.decodeFromVideoDevice(null, videoRef.current, async (result, err, controls) => {
            if (controls && !barcodeControlsRef.current) barcodeControlsRef.current = controls;
            if (!result || !barcodeScanRef.current) return;
            const code = typeof result.getText === "function" ? result.getText() : (result.text || result.rawValue || String(result));
            if (!code) return;
            setBarcodeInput(code);
            if (controls && typeof controls.stop === "function") {
              try { controls.stop(); } catch (_) {}
            }
            await fetchBarcodeProduct(code);
          });
          if (maybeControls && typeof maybeControls.stop === "function") barcodeControlsRef.current = maybeControls;
        } else if (typeof reader.decodeOnceFromVideoDevice === "function") {
          const result = await reader.decodeOnceFromVideoDevice(null, videoRef.current);
          const code = typeof result.getText === "function" ? result.getText() : (result.text || result.rawValue || String(result));
          setBarcodeInput(code);
          await fetchBarcodeProduct(code);
        } else {
          throw new Error("ZXing video API unavailable");
        }
      } catch (e) {
        stopBarcodeScanner();
        setBarcodeMessage(pickLang(lang, "O leitor compatível pela câmera falhou. Digite o código manualmente abaixo.", "Compatible camera scanner failed. Type the barcode manually below.", "El lector compatible por cámara falló. Introduce el código manualmente abajo."));
      }
    }, 0);
  }
  async function startBarcodeScanner() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setBarcodeMessage(pickLang(lang, "O acesso à câmera não está disponível. Use a digitação manual abaixo.", "Camera access is not available. Use manual entry below.", "El acceso a la cámara no está disponible. Usa la entrada manual abajo."));
      return;
    }
    stopBarcodeScanner();
    setBarcodeMessage(pickLang(lang, "Aponte a câmera para o código de barras.", "Point the camera at the barcode.", "Apunta la cámara al código de barras."));
    try {
      if ("BarcodeDetector" in window) await startNativeBarcodeScanner();
      else await startFallbackBarcodeScanner();
    } catch (e) {
      stopBarcodeScanner();
      setBarcodeMessage(pickLang(lang, "A permissão da câmera foi negada, não está disponível ou não é compatível. Use a digitação manual abaixo.", "Camera permission was denied, unavailable, or unsupported. Use manual entry below.", "El permiso de cámara fue denegado, no está disponible o no es compatible. Usa la entrada manual abajo."));
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
      const url = "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" + encodeURIComponent(query) + "&search_simple=1&action=process&json=1&page_size=8&fields=product_name,generic_name,brands,nutriments,quantity";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Open Food Facts");
      const data = await res.json();
      const products = (data.products || []).filter(p => p.nutriments && (p.nutriments["energy-kcal_100g"] || p.nutriments["proteins_100g"]));
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
    const normalizedLang = normalizeLanguage(lang);
    const _basePrompt = normalizedLang === "en"
      ? (unit === "un" ? "Check whether the food \"" + foodName + "\" exists and whether it makes sense to measure it as individual units.\n\nIMPORTANT: Because the unit is \"un\", you must:\n1. Check whether this food makes sense as an individual unit (1 egg, 1 banana, 1 strawberry, etc.).\n2. If yes, provide nutrition values per 100g AND the average gram weight of one typical unit.\n   Final per-unit values will be calculated as: value_per_100g x unit_weight / 100\n3. If it does not make sense (for example milk, olive oil, flour), reject it and explain.\n\nRespond ONLY with JSON, no markdown:\n- If valid: {\"ok\":true,\"per100\":{\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X},\"unitWeightG\":X}\n- If invalid: {\"ok\":false,\"reason\":\"brief explanation\"}" : "The user wants to log \"" + foodName + "\" with unit \"" + unit + "\".\n\nCheck whether the unit \"" + unit + "\" makes sense for this food.\nIf yes, provide values per 100" + unit + " based on reliable nutrition reference tables (USDA, TACO, INSA, and European nutrition tables).\nIf not (for example tuna in ml, milk in units), reject it and explain.\n\nRespond ONLY with JSON, no markdown:\n- If valid: {\"ok\":true,\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X}\n- If invalid: {\"ok\":false,\"reason\":\"brief explanation\"}\nUse null for unknown fields.")
      : normalizedLang === "es"
        ? (unit === "un" ? "Verifica si existe el alimento \"" + foodName + "\" y si tiene sentido medirlo en unidades individuales.\n\nIMPORTANTE: Como la unidad es \"un\", debes:\n1. Verificar si este alimento tiene sentido como unidad individual (1 huevo, 1 banana, 1 fresa, etc.).\n2. Si sí, entregar valores nutricionales por 100g Y el peso medio en gramos de una unidad típica.\n   Los valores finales por unidad se calcularán como: valor_100g x peso_unidad / 100\n3. Si no tiene sentido (por ejemplo leche, aceite de oliva, harina), recházalo y explica brevemente.\n\nResponde SOLO con JSON, sin markdown:\n- Si es válido: {\"ok\":true,\"per100\":{\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X},\"unitWeightG\":X}\n- Si no es válido: {\"ok\":false,\"reason\":\"explicación breve\"}" : "El usuario quiere registrar \"" + foodName + "\" con unidad \"" + unit + "\".\n\nVerifica si la unidad \"" + unit + "\" tiene sentido para este alimento.\nSi sí, entrega valores por 100" + unit + " basados en tablas nutricionales confiables (USDA, TACO, INSA y tablas europeas).\nSi no (por ejemplo atún en ml, leche en unidades), recházalo y explica brevemente.\n\nResponde SOLO con JSON, sin markdown:\n- Si es válido: {\"ok\":true,\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X}\n- Si no es válido: {\"ok\":false,\"reason\":\"explicación breve\"}\nUsa null para campos desconocidos.")
        : (unit === "un" ? "Verifique se existe o alimento \"" + foodName + "\" e se faz sentido medir em unidades individuais.\n\nIMPORTANTE: Como a unidade é \"un\", você deve:\n1. Verificar se faz sentido medir este alimento por unidade individual (1 ovo, 1 banana, 1 morango, etc.).\n2. Se sim, fornecer os valores nutricionais por 100g E o peso médio em gramas de 1 unidade típica.\n   Os valores finais por unidade serão calculados como: valor_100g x peso_unidade / 100\n3. Se não fizer sentido (ex: leite, azeite, farinha), recuse e explique.\n\nResponda APENAS com JSON sem markdown:\n- Se válido: {\"ok\":true,\"per100\":{\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X},\"unitWeightG\":X}\n- Se inválido: {\"ok\":false,\"reason\":\"explicação breve\"}" : "O usuário quer registrar \"" + foodName + "\" com unidade \"" + unit + "\".\n\nVerifique se a unidade \"" + unit + "\" faz sentido para este alimento.\nSe sim, forneça valores por 100" + unit + " baseados em tabelas nutricionais de referência (TACO, USDA, INSA, tabelas nutricionais brasileiras, americanas e europeias).\nSe não (ex: atum em ml, leite em un), recuse e explique.\n\nResponda APENAS com JSON sem markdown:\n- Se válido: {\"ok\":true,\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X}\n- Se inválido: {\"ok\":false,\"reason\":\"explicação breve\"}\nUse null para campos desconhecidos.");
    const prompt = aiLang() + _basePrompt;
    try {
      const text = await callAI(prompt, 600);
      const clean = text.replace(/```json|```/g, "").trim();
      const vals = JSON.parse(clean);
      if (!vals.ok) {
        notify(`${pickLang(lang, "Aviso", "Warning", "Aviso")}: ${vals.reason}`, 7000);
      } else if (unit === "un" && vals.per100 && vals.unitWeightG) {
        // Calculate per-unit values proportionally from 100g values
        const w = vals.unitWeightG;
        const p = vals.per100;
        const scale = v => v != null ? Math.round(v * w / 100 * 100) / 100 : null;
        setForm(f => ({
          ...f,
          protein100: scale(p.protein100) != null ? String(scale(p.protein100)) : f.protein100,
          kcal100: scale(p.kcal100) != null ? String(scale(p.kcal100)) : f.kcal100,
          carbs100: scale(p.carbs100) != null ? String(scale(p.carbs100)) : f.carbs100,
          sugars100: scale(p.sugars100) != null ? String(scale(p.sugars100)) : f.sugars100,
          fat100: scale(p.fat100) != null ? String(scale(p.fat100)) : f.fat100,
          satfat100: scale(p.satfat100) != null ? String(scale(p.satfat100)) : f.satfat100,
          fiber100: scale(p.fiber100) != null ? String(scale(p.fiber100)) : f.fiber100,
          salt100: scale(p.salt100) != null ? String(scale(p.salt100)) : f.salt100,
          unitWeightG: ""
        }));
        notify(pickLang(lang, `Campos preenchidos com base em ${w}g por unidade. Verifique se o peso está correto.`, `Fields filled based on ${w}g per unit. Check whether the weight looks right.`, `Campos completados con base en ${w}g por unidad. Verifica si el peso está correcto.`));
      } else {
        setForm(f => ({
          ...f,
          protein100: vals.protein100 != null ? String(vals.protein100) : f.protein100,
          kcal100: vals.kcal100 != null ? String(vals.kcal100) : f.kcal100,
          carbs100: vals.carbs100 != null ? String(vals.carbs100) : f.carbs100,
          sugars100: vals.sugars100 != null ? String(vals.sugars100) : f.sugars100,
          fat100: vals.fat100 != null ? String(vals.fat100) : f.fat100,
          satfat100: vals.satfat100 != null ? String(vals.satfat100) : f.satfat100,
          fiber100: vals.fiber100 != null ? String(vals.fiber100) : f.fiber100,
          salt100: vals.salt100 != null ? String(vals.salt100) : f.salt100
        }));
        notify(text('notifFilled'));
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
    // Prompt for free-text dish estimation. It favors explicit quantities,
    // conservative assumptions, and a short audit trail in the JSON note.
    const dishDescription = mealDescription.trim();
    const normalizedDishLang = normalizeLanguage(lang);
    const prompt = aiLang() + (normalizedDishLang === 'en' ? `Analyze the following dish and estimate its total nutrition values.

Dish description:
"${dishDescription}"

Instructions:

1. Identify every ingredient mentioned in the description.

2. Prioritize the quantities provided by the user.

3. When explicit quantities are missing, use realistic and consistent standard portions based on common restaurants, home-cooked meals, and typical serving sizes. Avoid exaggerated, rare, or unusual portions.

4. Never invent ingredients that are not described or clearly indicated in the meal.

5. When the user states rice, pasta, beans, lentils, oats, grains, or similar foods as raw/dry, you must use the raw/dry weight for nutrition calculations. Any cooked-weight conversion is only for describing the dish in the note. Never replace the raw/dry weight with cooked weight during calculation.

6. For cooked, grilled, baked, fried, or prepared foods, always consider the weight in the form they are consumed, unless the user explicitly says the weight is raw.

7. Consider sauces, olive oil, butter, frying oil, and other calorie-dense additions only when mentioned or clearly indicated. When uncertain, use a conservative and realistic estimate.

8. When you assume additional ingredients such as oil, butter, cream, sauces, sugar, or similar items to make the estimate more realistic, they MUST appear explicitly in the "note" field with approximate quantities. Never include calories or macronutrients from ingredients that are not listed in the note.

9. Use average values from official and reliable nutrition references:
- USDA (United States)
- TACO (Brazil)
- INSA (Portugal)

10. Sum all ingredients to obtain the total nutrition values for the dish.

11. Confidence must be defined as:
- high: ingredients and quantities are well specified;
- medium: ingredients are known, but some quantities were estimated;
- low: many quantities or ingredients had to be inferred.

12. In the "note" field, briefly explain how the values were estimated, listing the assumed quantities for the main ingredients. Example: "160 g grilled chicken, 90 g cooked rice, 25 g sauce, 10 g olive oil".

13. If the dish has many ingredients, keep the note short and objective, showing only the ingredients with the biggest nutritional impact.

14. Respond ONLY with valid JSON, no markdown, no comments, and no extra text.

Required format:

{
  "name":"short dish name",
  "protein":0,
  "kcal":0,
  "carbs":0,
  "fat":0,
  "fiber":0,
  "salt":0,
  "confidence":"high|medium|low",
  "note":"..."
}` : normalizedDishLang === 'es' ? `Analiza el siguiente plato y estima sus valores nutricionales totales.

Descripción del plato:
"${dishDescription}"

Instrucciones:

1. Identifica todos los ingredientes mencionados en la descripción.

2. Utiliza prioritariamente las cantidades informadas por el usuario.

3. Cuando no haya cantidades explícitas, utiliza porciones estándar realistas y consistentes, basadas en restaurantes comunes, comidas caseras y porciones típicas del alimento. Evita asumir porciones exageradas, raras o poco comunes.

4. Nunca inventes ingredientes que no estén descritos o claramente indicados en la comida.

5. Cuando el usuario informe arroz, pasta, frijoles, lentejas, avena, granos o alimentos similares como crudos/secos, utiliza obligatoriamente el peso crudo/seco en el cálculo nutricional. La conversión a peso cocido sirve solo para describir el plato en la nota. Nunca sustituyas el peso crudo/seco por el peso cocido durante el cálculo.

6. Para alimentos cocidos, a la plancha, asados, fritos o preparados, considera siempre el peso en la forma en que se consumen, salvo cuando el usuario especifique explícitamente peso crudo.

7. Considera salsas, aceite de oliva, mantequilla, fritura y otros ingredientes ricos en calorías solo cuando sean mencionados o claramente indicados. Cuando haya incertidumbre, utiliza una estimación conservadora y realista.

8. Cuando asumas ingredientes adicionales como aceite, aceite de oliva, mantequilla, crema, salsas, azúcar o similares para hacer la estimación más realista, DEBEN aparecer explícitamente en el campo "note" con sus cantidades aproximadas. Nunca incluyas calorías ni macronutrientes de ingredientes que no estén listados en la nota.

9. Utiliza como referencia valores medios de tablas nutricionales oficiales y confiables:
- USDA (Estados Unidos)
- TACO (Brasil)
- INSA (Portugal)

10. Suma todos los ingredientes para obtener los valores nutricionales totales del plato.

11. La confianza debe definirse así:
- alta: ingredientes y cantidades bien especificados;
- media: ingredientes conocidos, pero algunas cantidades fueron estimadas;
- baja: muchas cantidades o ingredientes tuvieron que inferirse.

12. En el campo "note", explica brevemente cómo se estimaron los valores, indicando las cantidades asumidas para los ingredientes principales. Ejemplo: "160 g de pollo a la plancha, 90 g de arroz cocido, 25 g de salsa, 10 g de aceite de oliva".

13. Si el plato tiene muchos ingredientes, mantén la nota corta y objetiva, mostrando solo los ingredientes que más influyen en los valores nutricionales.

14. Responde SOLO con JSON válido, sin markdown, sin comentarios y sin texto adicional.

Formato obligatorio:

{
  "name":"nombre corto del plato",
  "protein":0,
  "kcal":0,
  "carbs":0,
  "fat":0,
  "fiber":0,
  "salt":0,
  "confidence":"alta|media|baja",
  "note":"..."
}` : `Analise o seguinte prato e estime seus valores nutricionais totais.

Descrição do prato:
"${dishDescription}"

Instruções:

1. Identifique todos os ingredientes mencionados na descrição.

2. Utilize prioritariamente as quantidades informadas pelo usuário.

3. Quando não houver quantidades explícitas, utilize porções padrão realistas e consistentes, baseadas em restaurantes comuns, refeições caseiras e porções típicas do alimento. Evite assumir porções exageradas, raras ou incomuns.

4. Nunca invente ingredientes que não estejam descritos ou claramente indicados na refeição.

5. Quando o usuário informar arroz, massa, feijão, lentilha, aveia, grãos ou alimentos semelhantes como cru/seco, utilize obrigatoriamente o peso cru/seco no cálculo nutricional. A conversão para peso cozido serve apenas para descrever o prato na nota. Nunca substitua o peso cru/seco pelo peso cozido durante o cálculo.

6. Para alimentos cozidos, grelhados, assados, fritos ou preparados, considere sempre o peso na forma em que são consumidos, salvo quando o usuário especificar explicitamente peso cru.

7. Considere molhos, azeite, manteiga, fritura e outros ingredientes ricos em calorias apenas quando forem mencionados ou claramente indicados. Quando houver incerteza, utilize uma estimativa conservadora e realista.

8. Quando assumir ingredientes adicionais como óleo, azeite, manteiga, creme, molhos, açúcar ou similares para tornar a estimativa mais realista, eles DEVEM aparecer explicitamente no campo "note" com suas quantidades aproximadas. Nunca inclua calorias ou macronutrientes provenientes de ingredientes que não estejam listados na nota.

9. Utilize como referência valores médios de tabelas nutricionais oficiais e confiáveis:
- TACO (Brasil)
- USDA (Estados Unidos)
- INSA (Portugal)

10. Some todos os ingredientes para obter os valores nutricionais totais do prato.

11. A confiança deve ser definida assim:
- alta: ingredientes e quantidades bem especificados;
- media: ingredientes conhecidos, mas algumas quantidades estimadas;
- baixa: muitas quantidades ou ingredientes precisaram ser inferidos.

12. No campo "note", explique resumidamente como os valores foram estimados, indicando as quantidades assumidas para os principais ingredientes. Exemplo: "160 g de frango grelhado, 90 g de arroz cozido, 25 g de molho, 10 g de azeite".

13. Se o prato possuir muitos ingredientes, mantenha a nota curta e objetiva, mostrando apenas os ingredientes que mais influenciam nos valores nutricionais.

14. Responda APENAS com JSON válido, sem markdown, sem comentários e sem texto adicional.

Formato obrigatório:

{
  "name":"nome curto do prato",
  "protein":0,
  "kcal":0,
  "carbs":0,
  "fat":0,
  "fiber":0,
  "salt":0,
  "confidence":"alta|media|baixa",
  "note":"..."
}`);
    try {
      const text = await callAI(prompt, 600);
      const clean = text.replace(/```json|```/g, "").trim();
      const vals = JSON.parse(clean);
      setDescribeResult(vals);
    } catch (_) {
      notify(pickLang(lang, "Erro: ", "Error: ", "Error: ") + (_.message || pickLang(lang, "Não foi possível estimar.", "Could not estimate.", "No fue posible estimar.")), 8000);
    }
    setDescribeLoading(false);
  }
  function buildDescribedEntry() {
    if (!describeResult) return;
    return {
      id: Date.now().toString() + Math.random(),
      foodId: null,
      name: describeResult.name || "Prato estimado",
      qty: 1,
      unit: "un",
      protein: describeResult.protein || 0,
      kcal: describeResult.kcal || 0,
      carbs: describeResult.carbs || 0,
      fat: describeResult.fat || 0,
      fiber: describeResult.fiber || 0,
      salt: describeResult.salt || 0,
      sugars: null,
      satfat: null,
      _estimated: true,
      _description: mealDescription.trim()
    };
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
      const acc = {};
      const dayData = [];
      for (let i = 1; i <= 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const date = d.toISOString().split("T")[0];
        const l = await storage.get("log_v2_" + date).catch(() => null);
        if (!l) continue;
        const dayLog = JSON.parse(l.value);
        const entries = Object.values(dayLog).flat();
        if (!entries.length) continue;
        const p = Math.round(entries.reduce((s, e) => s + (e.protein ?? 0), 0));
        const k = Math.round(entries.reduce((s, e) => s + (e.kcal ?? 0), 0));
        const c = Math.round(entries.reduce((s, e) => s + (e.carbs ?? 0), 0));
        const f = Math.round(entries.reduce((s, e) => s + (e.fiber ?? 0), 0));
        const isTrain = trainingByDate[date] ?? true;
        const wE = getWeightForDate(weightHistory, date);
        const rawGoal = computeGoals(wE?.weight || currentWeight, isTrain, {height: wE?.height || currentHeight, birthDate: profileData.birthDate, gender: profileData.gender, prefs: nutritionPrefs});
        const computedGoal = {...rawGoal, protein: customGoals.protein || rawGoal.protein, kcal: customGoals.kcal || rawGoal.kcal, carbs: customGoals.carbs || rawGoal.carbs, fat: customGoals.fat || rawGoal.fat, fiber: customGoals.fiber || rawGoal.fiber, salt: customGoals.salt || rawGoal.salt};
        const g = date !== TODAY && goalHistory[date] ? {...computedGoal, ...goalHistory[date]} : computedGoal;
        dayData.push({
          date,
          protein: p,
          kcal: k,
          carbs: c,
          fiber: f,
          isTraining: isTrain,
          metProtein: p >= g.protein,
          metKcal: k >= g.kcal * 0.85 && k <= g.kcal * 1.15
        });
        MEALS.forEach(meal => {
          const items = dayLog[meal] || [];
          if (!items.length) return;
          if (!acc[meal]) acc[meal] = {
            count: 0,
            protein: 0,
            kcal: 0
          };
          acc[meal].count++;
          acc[meal].protein += entries.filter(e => dayLog[meal]?.find(m => m.id === e.id)).reduce((s, e) => s + (e.protein ?? 0), 0);
        });
      }
      if (!dayData.length) {
        notify(text('noDataPatterns'));
        setPatternsLoading(false);
        return;
      }
      const avgProt = Math.round(dayData.reduce((s, d) => s + d.protein, 0) / dayData.length);
      const avgKcal = Math.round(dayData.reduce((s, d) => s + d.kcal, 0) / dayData.length);
      const daysMetProt = dayData.filter(d => d.metProtein).length;
      const trainDays = dayData.filter(d => d.isTraining);
      const restDays = dayData.filter(d => !d.isTraining);
      const trainSummary = trainDays.length ? pickLang(lang, "Dias de treino", "Training days", "Días de entrenamiento") + " (" + trainDays.length + "): " + pickLang(lang, "média ", "average ", "media ") + Math.round(trainDays.reduce((s, d) => s + d.protein, 0) / trainDays.length) + "g " + pickLang(lang, "proteína", "protein", "proteína") + ", " + Math.round(trainDays.reduce((s, d) => s + d.kcal, 0) / trainDays.length) + " kcal\n" : "";
      const restSummary = restDays.length ? pickLang(lang, "Dias de descanso", "Rest days", "Días de descanso") + " (" + restDays.length + "): " + pickLang(lang, "média ", "average ", "media ") + Math.round(restDays.reduce((s, d) => s + d.protein, 0) / restDays.length) + "g " + pickLang(lang, "proteína", "protein", "proteína") + ", " + Math.round(restDays.reduce((s, d) => s + d.kcal, 0) / restDays.length) + " kcal\n" : "";
      const prompt = pickLang(
        lang,
        "Analise os padrões alimentares dos últimos 30 dias e forneça insights detalhados em português brasileiro.\n\nDADOS (" + dayData.length + " dias registrados de 30):\nMédia diária: " + avgProt + "g proteína, " + avgKcal + " kcal\nDias que atingiram meta de proteína: " + daysMetProt + "/" + dayData.length + "\n" + trainSummary + restSummary + "Variação de proteína: mín " + Math.min(...dayData.map(d => d.protein)) + "g, máx " + Math.max(...dayData.map(d => d.protein)) + "g\n\n" + (currentWeight ? "Peso atual: " + currentWeight + "kg\n\n" : "") + "Identifique padrões concretos como:\n- Diferença entre dias de treino e descanso\n- Consistência ou inconsistência ao longo do tempo\n- Tendências preocupantes ou positivas\n- áreas de melhoria com sugestões específicas\n\nEstruture com seções claras: Padrões positivos, Padrões a melhorar, Tendências identificadas, Recomendações.",
        "Analyze the user's eating patterns over the last 30 days and provide detailed insights in American English.\n\nDATA (" + dayData.length + " logged days out of 30):\nDaily average: " + avgProt + "g protein, " + avgKcal + " kcal\nDays that hit the protein target: " + daysMetProt + "/" + dayData.length + "\n" + trainSummary + restSummary + "Protein range: min " + Math.min(...dayData.map(d => d.protein)) + "g, max " + Math.max(...dayData.map(d => d.protein)) + "g\n\n" + (currentWeight ? "Current weight: " + currentWeight + "kg\n\n" : "") + "Identify concrete patterns such as:\n- Difference between training and rest days\n- Consistency or inconsistency over time\n- Positive or concerning trends\n- Improvement areas with specific suggestions\n\nStructure with clear sections: Positive Patterns, Patterns to Improve, Identified Trends, Recommendations.",
        "Analiza los patrones alimentarios del usuario durante los últimos 30 días y entrega conclusiones detalladas en español.\n\nDATOS (" + dayData.length + " días registrados de 30):\nMedia diaria: " + avgProt + "g de proteína, " + avgKcal + " kcal\nDías que alcanzaron la meta de proteína: " + daysMetProt + "/" + dayData.length + "\n" + trainSummary + restSummary + "Rango de proteína: mín " + Math.min(...dayData.map(d => d.protein)) + "g, máx " + Math.max(...dayData.map(d => d.protein)) + "g\n\n" + (currentWeight ? "Peso actual: " + currentWeight + "kg\n\n" : "") + "Identifica patrones concretos como:\n- Diferencias entre días de entrenamiento y descanso\n- Consistencia o inconsistencia a lo largo del tiempo\n- Tendencias positivas o preocupantes\n- Áreas de mejora con sugerencias específicas\n\nEstructura con secciones claras: Patrones positivos, Patrones a mejorar, Tendencias identificadas, Recomendaciones."
      );
      const _pText = await callAI(prompt, 1200);
      setPatternsText(_pText);
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
  function buildDayTotals(log) {
    const entries = Object.values(log).flat();
    return {
      protein: rnd(entries.reduce((s, e) => s + (e.protein ?? 0), 0)),
      kcal: rnd(entries.reduce((s, e) => s + (e.kcal ?? 0), 0)),
      carbs: rnd(entries.reduce((s, e) => s + (e.carbs ?? 0), 0)),
      fat: rnd(entries.reduce((s, e) => s + (e.fat ?? 0), 0)),
      fiber: rnd(entries.reduce((s, e) => s + (e.fiber ?? 0), 0)),
      salt: rnd(entries.reduce((s, e) => s + (e.salt ?? 0), 0))
    };
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
      const serverUrl = REPORT_SERVER_URL.replace(/\/$/, "");
      if (window.location.protocol === "https:" && serverUrl.startsWith("http://")) {
        throw new Error(pickLang(
          lang,
          "O app está aberto em HTTPS, mas o servidor de relatórios está em HTTP. O navegador bloqueia essa conexão. Use o app localmente/em HTTP ou exponha o servidor de relatórios com HTTPS.",
          "The app is open over HTTPS, but the report server is HTTP. Browsers block this request. Use the local file/app over HTTP, or expose the report server with HTTPS.",
          "La app está abierta por HTTPS, pero el servidor de informes está en HTTP. El navegador bloquea esta conexión. Usa la app localmente/en HTTP o expón el servidor de informes con HTTPS."
        ));
      }
      if (/^http:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(serverUrl) && window.location.protocol !== "file:" && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
        throw new Error(pickLang(
          lang,
          "O servidor de relatórios está como localhost/127.0.0.1. Em outro dispositivo isso aponta para o próprio dispositivo, não para o PC servidor. Use o IP local do PC servidor no código.",
          "The report server is set to localhost/127.0.0.1. On another device this points to that device itself, not to the server PC. Use the server PC LAN IP in the code.",
          "El servidor de informes está configurado como localhost/127.0.0.1. En otro dispositivo eso apunta al propio dispositivo, no al PC servidor. Usa la IP local del PC servidor en el código."
        ));
      }
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
          "Não foi possível acessar o servidor de relatórios. Confira se o servidor está ligado, se o IP/porta estão acessíveis por este dispositivo e se uma página HTTPS não está tentando chamar um servidor HTTP.",
          "Could not reach the report server. Check that the server is running, that the IP/port are reachable from this device, and that HTTPS pages are not trying to call an HTTP server.",
          "No se pudo acceder al servidor de informes. Comprueba que el servidor esté encendido, que la IP/puerto sean accesibles desde este dispositivo y que una página HTTPS no esté intentando llamar a un servidor HTTP."
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
        const wEntry = getWeightForDate(weightHistory, date);
        const rawGoal = computeGoals(wEntry?.weight || currentWeight, trainingByDate[date] ?? true, {height: wEntry?.height || currentHeight, birthDate: profileData.birthDate, gender: profileData.gender, prefs: nutritionPrefs});
        const computedGoal = {...rawGoal, protein: customGoals.protein || rawGoal.protein, kcal: customGoals.kcal || rawGoal.kcal, carbs: customGoals.carbs || rawGoal.carbs, fat: customGoals.fat || rawGoal.fat, fiber: customGoals.fiber || rawGoal.fiber, salt: customGoals.salt || rawGoal.salt};
        const g = date !== TODAY && goalHistory[date] ? {...computedGoal, ...goalHistory[date]} : computedGoal;
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
      let prompt = "";
      const storedUserName = await storage.get("userName").catch(() => null);
      const feedbackUserName = storedUserName?.value ? String(storedUserName.value).trim() : "";
      const feedbackLang = normalizeLanguage(lang);
      const feedbackEnglish = feedbackLang === "en";
      const feedbackSpanish = feedbackLang === "es";
      const fbText = (pt, en, es) => pickLang(feedbackLang, pt, en, es);
      const activityInfo = ACTIVITY_LEVELS[nutritionPrefs.activityLevel || "moderate"];
      const objectiveLabel = nutritionPrefs.goalType === "loss"
        ? fbText("perda de peso", "weight loss", "pérdida de peso")
        : nutritionPrefs.goalType === "gain"
          ? fbText("ganho de peso/massa", "weight/muscle gain", "ganancia de peso/masa")
          : fbText("manutenção do peso", "weight maintenance", "mantenimiento de peso");
      const objectiveDetails = nutritionPrefs.goalType === "loss" || nutritionPrefs.goalType === "gain"
        ? (nutritionPrefs.goalKg || "?") + "kg " + fbText("em ", "in ", "en ") + (nutritionPrefs.goalWeeks || "?") + fbText(" semanas", " weeks", " semanas")
        : fbText("sem ajuste de peso planejado", "no planned weight adjustment", "sin ajuste de peso planificado");
      const userAge = calculateAge(profileData.birthDate);
      const latestWeight = currentWeight || viewWeight;
      const latestHeight = currentHeight || viewHeight;
      const profileLines = [
        feedbackUserName ? fbText("Nome: ", "Name: ", "Nombre: ") + feedbackUserName : "",
        latestWeight ? fbText("Último peso registrado: ", "Latest recorded weight: ", "Último peso registrado: ") + latestWeight + "kg" : "",
        latestHeight ? fbText("Altura: ", "Height: ", "Altura: ") + latestHeight + "cm" : "",
        userAge ? fbText("Idade calculada: " + userAge + " anos", "Calculated age: " + userAge + " years", "Edad calculada: " + userAge + " años") : "",
        profileData.gender ? fbText("Gênero informado: ", "Reported sex: ", "Sexo informado: ") + (profileData.gender === "male" ? fbText("masculino", "male", "masculino") : fbText("feminino", "female", "femenino")) : "",
        latestWeight && latestHeight ? fbText("IMC atual: ", "Current BMI: ", "IMC actual: ") + (latestWeight / ((latestHeight/100)**2)).toFixed(1) : "",
        fbText("Objetivo atual: ", "Current goal: ", "Objetivo actual: ") + objectiveLabel + " (" + objectiveDetails + ")",
        activityInfo ? fbText(
          "Nível de atividade física: " + activityInfo.pt + " - " + activityInfo.descPt + " | FA: ",
          "Physical activity level: " + activityInfo.en + " - " + activityInfo.descEn + " | AF: ",
          "Nivel de actividad física: " + activityInfo.en + " - " + activityInfo.descEn + " | FA: "
        ) + (baseGoals.fa || activityInfo.factor) : "",
        fbText("Dia analisado como: ", "Day classified as: ", "Día analizado como: ") + (isTraining ? fbText("dia de treino/atividade", "training/activity day", "día de entrenamiento/actividad") : fbText("dia de descanso", "rest day", "día de descanso")),
        fbText("Calorias de base calculadas antes do ajuste: ", "Calculated base calories before adjustment: ", "Calorías base calculadas antes del ajuste: ") + (calorieBase || "—") + " kcal",
        fbText("Ajuste calórico do objetivo: ", "Goal calorie adjustment: ", "Ajuste calórico del objetivo: ") + (calorieAdjustment > 0 ? "+" : "") + calorieAdjustment + fbText(" kcal/dia", " kcal/day", " kcal/día"),
        fbText("Metas em uso: ", "Targets in use: ", "Metas en uso: ") + (goals.kcal || "—") + " kcal, " + (goals.protein || "—") + fbText("g proteína, ", "g protein, ", "g proteína, ") + (goals.carbs || "—") + fbText("g carboidratos, ", "g carbs, ", "g carbohidratos, ") + (goals.fat || "—") + fbText("g gorduras, ", "g fat, ", "g grasas, ") + (goals.fiber || "—") + fbText("g fibra, ", "g fiber, ", "g fibra, ") + (goals.salt || "—") + fbText("g sal", "g sodium/salt", "g sal"),
        fbText("Multiplicador de proteína: ", "Protein multiplier: ", "Multiplicador de proteína: ") + Number(proteinMultiplier).toFixed(1) + "g/kg"
      ].filter(Boolean).join("\n");
      const feedbackRules = (feedbackEnglish ? [
        "Use the user's name naturally when available, without overusing it.",
        "Analyze the data against the current goal, latest recorded weight, calorie/protein targets, and all available nutrient targets.",
        "Be balanced: highlight real strengths and realistic improvement areas without alarmism.",
        "Do not frame small differences as major problems. Deviations under 5% of the target, or just a few grams for nutrients, should be treated at most as a light observation.",
        "Prioritize relevant patterns, consistency, food choices, protein/calorie distribution, fiber, sodium/salt, fats, and alignment with the user's goal.",
        "Avoid medical diagnosis. Give practical, realistic guidance based only on the provided data.",
        "When data is missing, state that the conclusion is limited instead of inventing."
      ] : feedbackSpanish ? [
        "Usa el nombre del usuario de forma natural cuando esté disponible, sin repetirlo en exceso.",
        "Analiza los datos en relación con el objetivo actual, el último peso registrado, las metas de calorías/proteína y los demás nutrientes disponibles.",
        "Sé equilibrado: destaca fortalezas reales y áreas de mejora realistas sin alarmismo.",
        "No trates diferencias pequeñas como grandes problemas. Desvíos menores al 5% de la meta, o pocos gramos en nutrientes, deben aparecer como máximo como una observación leve.",
        "Prioriza patrones relevantes, consistencia, elecciones de alimentos, distribución de proteína/calorías, fibra, sal, grasas y alineación con el objetivo.",
        "Evita diagnósticos médicos. Da orientación práctica y realista basada solo en los datos proporcionados.",
        "Cuando falten datos, indica que la conclusión es limitada en lugar de inventar."
      ] : [
        "Use o nome do usuário de forma natural quando ele estiver disponível, sem repetir em excesso.",
        "Analise os dados em relação ao objetivo atual, ao último peso registrado, às metas calóricas/proteicas e aos demais nutrientes disponíveis.",
        "Seja equilibrado: destaque pontos fortes reais e pontos passíveis de melhora sem alarmismo.",
        "Não trate diferenças pequenas como problema grande. Desvios menores que 5% da meta, ou poucos gramas em nutrientes, devem aparecer no máximo como observação leve.",
        "Priorize padrões relevantes, consistência, escolhas alimentares, distribuição de proteína/calorias, fibra, sal, gorduras e adequação ao objetivo.",
        "Evite diagnóstico médico. Dê orientação prática e realista baseada apenas nos dados fornecidos.",
        "Quando faltar dado, diga que a conclusão é limitada em vez de inventar."
      ]).join("\n");
      if (type === "day") {
        const entries = Object.values(activeLog).flat();
        const mealSummary = MEALS.map(meal => {
          const items = activeLog[meal] || [];
          if (!items.length) return null;
          const label = mealLabel(meal);
          return label + ":\n" + items.map(e => "  - " + e.name + " (" + e.qty + e.unit + ") - prot: " + Math.round(e.protein ?? 0) + "g, " + Math.round(e.kcal ?? 0) + "kcal, carbs: " + Math.round(e.carbs ?? 0) + "g, gord: " + Math.round(e.fat ?? 0) + "g").join("\n");
        }).filter(Boolean).join("\n");
        const p  = entries.reduce((s, e) => s + (e.protein ?? 0), 0);
        const k  = entries.reduce((s, e) => s + (e.kcal ?? 0), 0);
        const c  = entries.reduce((s, e) => s + (e.carbs ?? 0), 0);
        const f  = entries.reduce((s, e) => s + (e.fat ?? 0), 0);
        const fi = entries.reduce((s, e) => s + (e.fiber ?? 0), 0);
        const sa = entries.reduce((s, e) => s + (e.salt ?? 0), 0);
        const currentBMI = (currentWeight && currentHeight) ? (currentWeight / ((currentHeight/100)**2)).toFixed(1) : null;
        const perfProt = goals.protein > 0 ? Math.round(p / goals.protein * 100) : null;
        const perfKcal = goals.kcal    > 0 ? Math.round(k / goals.kcal    * 100) : null;
        const lines = (feedbackEnglish ? [
          "You are a nutrition analyst reviewing one day of food logging. Be specific, proportional, and practical.",
          "",
          "=== USER PROFILE, GOAL, AND TARGETS ===",
          profileLines,
          "",
          "=== DAY CONTEXT ===",
          "Date: " + viewDate + " | " + (isTraining ? "TRAINING DAY" : "REST DAY"),
          "",
          "=== FOOD LOG ===",
          mealSummary || "No foods logged",
          "",
          "=== ACTUAL DAILY TOTALS ===",
          "Protein: " + Math.round(p) + "g (" + (perfProt !== null ? perfProt + "% of target" : "no target") + ")",
          "Calories: " + Math.round(k) + "kcal (" + (perfKcal !== null ? perfKcal + "% of target" : "no target") + ")",
          "Carbs: " + Math.round(c) + "g | Fat: " + Math.round(f) + "g | Fiber: " + Math.round(fi) + "g | Sodium/salt: " + (Math.round(sa*10)/10) + "g",
          "",
          "=== ANALYSIS RULES ===",
          feedbackRules,
          "",
          "=== INSTRUCTIONS ===",
          "Structure the feedback like this:",
          "STRENGTHS: cite foods, meals, or choices that supported the goal",
          "OBSERVATIONS: mention small deviations lightly and in context, without dramatizing",
          "IMPROVEMENT AREAS: only point out relevant excesses, deficits, or habits, with real numbers and proportion",
          "NEXT STEPS: give 2-3 concrete adjustments for the next day that fit the goal",
          "OVERALL SUMMARY: realistic assessment of the day in 2-3 sentences",
          "",
          "Respond in American English. Use the data above and do not generalize."
        ] : feedbackSpanish ? [
          "Eres un analista nutricional evaluando el registro alimentario de un día. Sé específico, proporcional y práctico.",
          "",
          "=== PERFIL, OBJETIVO Y METAS DEL USUARIO ===",
          profileLines,
          "",
          "=== CONTEXTO DEL DÍA ===",
          "Fecha: " + viewDate + " | " + (isTraining ? "DÍA DE ENTRENAMIENTO" : "DÍA DE DESCANSO"),
          "",
          "=== LO QUE COMIÓ ===",
          mealSummary || "Ningún alimento registrado",
          "",
          "=== TOTALES REALES DEL DÍA ===",
          "Proteína: " + Math.round(p) + "g (" + (perfProt !== null ? perfProt + "% de la meta" : "sin meta") + ")",
          "Calorías: " + Math.round(k) + "kcal (" + (perfKcal !== null ? perfKcal + "% de la meta" : "sin meta") + ")",
          "Carbohidratos: " + Math.round(c) + "g | Grasas: " + Math.round(f) + "g | Fibra: " + Math.round(fi) + "g | Sal: " + (Math.round(sa*10)/10) + "g",
          "",
          "=== REGLAS DE ANÁLISIS ===",
          feedbackRules,
          "",
          "=== INSTRUCCIONES ===",
          "Estructura el feedback así:",
          "PUNTOS FUERTES: cita alimentos, comidas o elecciones que ayudaron al objetivo",
          "OBSERVACIONES: comenta desvíos pequeños de forma leve y contextual, sin dramatizar",
          "PUNTOS A MEJORAR: señala solo excesos, déficits o hábitos relevantes, con números reales y proporción",
          "PRÓXIMOS PASOS: da 2-3 ajustes concretos para el próximo día, compatibles con el objetivo",
          "RESUMEN GENERAL: evaluación realista del día en 2-3 frases",
          "",
          "Responde en español. Usa los datos anteriores y no generalices."
        ] : [
          "Você é um analista nutricional avaliando o diário alimentar de um dia. Seja específico, proporcional e prático.",
          "",
          "=== PERFIL, OBJETIVO E METAS DO USUÁRIO ===",
          profileLines,
          "",
          "=== CONTEXTO DO DIA ===",
          "Data: " + viewDate + " | " + (isTraining ? "DIA DE TREINO" : "DIA DE DESCANSO"),
          "",
          "=== O QUE COMEU ===",
          mealSummary || "Nenhum alimento registrado",
          "",
          "=== TOTAIS REAIS DO DIA ===",
          "Proteína: " + Math.round(p) + "g (" + (perfProt !== null ? perfProt + "% da meta" : "sem meta") + ")",
          "Calorias: " + Math.round(k) + "kcal (" + (perfKcal !== null ? perfKcal + "% da meta" : "sem meta") + ")",
          "Carbs: " + Math.round(c) + "g | Gordura: " + Math.round(f) + "g | Fibra: " + Math.round(fi) + "g | Sal: " + (Math.round(sa*10)/10) + "g",
          "",
          "=== REGRAS DE ANÁLISE ===",
          feedbackRules,
          "",
          "=== INSTRUÇÕES ===",
          "Estruture o feedback assim:",
          "PONTOS FORTES: cite alimentos, refeições ou escolhas que ajudaram o objetivo",
          "OBSERVAÇÕES: comente desvios pequenos de forma leve e contextual, sem dramatizar",
          "PONTOS A MELHORAR: aponte apenas excessos, déficits ou hábitos relevantes, com números reais e proporção",
          "PRÓXIMOS PASSOS: dê 2-3 ajustes concretos para o próximo dia, compatíveis com o objetivo",
          "RESUMO GERAL: avaliação realista do dia em 2-3 frases",
          "",
          "Responda em português do Brasil. Use os dados acima e não generalize."
        ]).filter(l => l !== null && l !== undefined).join("\n");
        prompt = lines;
      } else {
        const days = weekData.filter(d => d.hasData);
        if (!days.length) {
          notify(text('noWeekData'));
          setFeedbackLoading(false);
          return;
        }
        const avg = {
          protein: Math.round(days.reduce((s, d) => s + d.protein, 0) / days.length),
          kcal:    Math.round(days.reduce((s, d) => s + d.kcal,    0) / days.length),
          carbs:   Math.round(days.reduce((s, d) => s + (d.carbs || 0), 0) / days.length),
          fat:     Math.round(days.reduce((s, d) => s + (d.fat || 0), 0) / days.length),
          fiber:   Math.round(days.reduce((s, d) => s + (d.fiber || 0), 0) / days.length),
          salt:    Math.round(days.reduce((s, d) => s + (d.salt || 0), 0) / days.length * 10) / 10
        };
        const daySummary = days.map(d => feedbackEnglish ?
          d.date + " - protein: " + d.protein + "g/" + d.proteinGoal + "g (" + (d.metProtein ? "target" : "below") + "), " +
          "calories: " + d.kcal + "/" + d.kcalGoal + "kcal, carbs: " + (d.carbs || 0) + "g/" + (d.carbsGoal || "—") + "g, fat: " + (d.fat || 0) + "g/" + (d.fatGoal || "—") + "g, fiber: " + (d.fiber || 0) + "g/" + (d.fiberGoal || "—") + "g, sodium/salt: " + (d.salt || 0) + "g/" + (d.saltGoal || "—") + "g"
          : feedbackSpanish ?
          d.date + " - proteína: " + d.protein + "g/" + d.proteinGoal + "g (" + (d.metProtein ? "meta" : "por debajo") + "), " +
          "calorías: " + d.kcal + "/" + d.kcalGoal + "kcal, carbohidratos: " + (d.carbs || 0) + "g/" + (d.carbsGoal || "—") + "g, grasas: " + (d.fat || 0) + "g/" + (d.fatGoal || "—") + "g, fibra: " + (d.fiber || 0) + "g/" + (d.fiberGoal || "—") + "g, sal: " + (d.salt || 0) + "g/" + (d.saltGoal || "—") + "g"
          :
          d.date + " - proteína: " + d.protein + "g/" + d.proteinGoal + "g (" + (d.metProtein ? "meta" : "abaixo") + "), " +
          "calorias: " + d.kcal + "/" + d.kcalGoal + "kcal, carbs: " + (d.carbs || 0) + "g/" + (d.carbsGoal || "—") + "g, gordura: " + (d.fat || 0) + "g/" + (d.fatGoal || "—") + "g, fibra: " + (d.fiber || 0) + "g/" + (d.fiberGoal || "—") + "g, sal: " + (d.salt || 0) + "g/" + (d.saltGoal || "—") + "g"
        ).join("\n");
        const daysMetProt = days.filter(d => d.metProtein).length;
        const currentBMI2 = (currentWeight && currentHeight) ? (currentWeight / ((currentHeight/100)**2)).toFixed(1) : null;
        const weekLines = (feedbackEnglish ? [
          "You are a nutrition analyst reviewing a user's weekly food intake. Be specific, proportional, and practical.",
          "",
          "=== USER PROFILE, GOAL, AND TARGETS ===",
          profileLines,
          "",
          "=== WEEK SUMMARY (" + days.length + " logged days) ===",
          daySummary,
          "",
          "=== AVERAGES ===",
          "Protein: " + avg.protein + "g/day | Calories: " + avg.kcal + "kcal/day | Carbs: " + avg.carbs + "g/day | Fat: " + avg.fat + "g/day | Fiber: " + avg.fiber + "g/day | Sodium/salt: " + avg.salt + "g/day",
          "Days that hit the protein target: " + daysMetProt + "/" + days.length,
          "",
          "=== ANALYSIS RULES ===",
          feedbackRules,
          "",
          "=== INSTRUCTIONS ===",
          "Structure the feedback like this:",
          "STRENGTHS: days, patterns, or choices that supported the goal; cite dates when useful",
          "OBSERVATIONS: mention small variations as observations, not meaningful failures",
          "IMPROVEMENT AREAS: highlight only genuinely important patterns, with numbers and proportion",
          "NEXT STEPS: 2-3 practical adjustments for next week, aligned with the goal",
          "WEEKLY ASSESSMENT: realistic summary of progress and the main focus",
          "",
          "Respond in American English. Use the data above and do not generalize."
        ] : feedbackSpanish ? [
          "Eres un analista nutricional evaluando la alimentación semanal de un usuario. Sé específico, proporcional y práctico.",
          "",
          "=== PERFIL, OBJETIVO Y METAS DEL USUARIO ===",
          profileLines,
          "",
          "=== RESUMEN DE LA SEMANA (" + days.length + " días registrados) ===",
          daySummary,
          "",
          "=== PROMEDIOS ===",
          "Proteína: " + avg.protein + "g/día | Calorías: " + avg.kcal + "kcal/día | Carbohidratos: " + avg.carbs + "g/día | Grasas: " + avg.fat + "g/día | Fibra: " + avg.fiber + "g/día | Sal: " + avg.salt + "g/día",
          "Días que alcanzó la meta de proteína: " + daysMetProt + "/" + days.length,
          "",
          "=== REGLAS DE ANÁLISIS ===",
          feedbackRules,
          "",
          "=== INSTRUCCIONES ===",
          "Estructura el feedback así:",
          "PUNTOS FUERTES - días, patrones o elecciones que ayudaron al objetivo; cita fechas cuando tenga sentido",
          "OBSERVACIONES - comenta pequeñas variaciones como observaciones, no como fallos importantes",
          "PUNTOS A MEJORAR - destaca solo patrones realmente importantes, con números y proporción",
          "PRÓXIMOS PASOS - 2-3 ajustes prácticos para la próxima semana, alineados con el objetivo",
          "EVALUACIÓN DE LA SEMANA - síntesis realista del progreso y del foco principal",
          "",
          "Responde en español. Usa los datos anteriores y no generalices."
        ] : [
          "Você é um analista nutricional avaliando a alimentação semanal de um usuário. Seja específico, proporcional e prático.",
          "",
          "=== PERFIL, OBJETIVO E METAS DO USUÁRIO ===",
          profileLines,
          "",
          "=== RESUMO DA SEMANA (" + days.length + " dias registrados) ===",
          daySummary,
          "",
          "=== MÉDIAS ===",
          "Proteína: " + avg.protein + "g/dia | Calorias: " + avg.kcal + "kcal/dia | Carbs: " + avg.carbs + "g/dia | Gordura: " + avg.fat + "g/dia | Fibra: " + avg.fiber + "g/dia | Sal: " + avg.salt + "g/dia",
          "Dias que atingiu a meta de proteína: " + daysMetProt + "/" + days.length,
          "",
          "=== REGRAS DE ANÁLISE ===",
          feedbackRules,
          "",
          "=== INSTRUÇÕES ===",
          "Estruture o feedback assim:",
          "PONTOS FORTES - dias, padrões ou escolhas que ajudaram o objetivo; cite datas quando fizer sentido",
          "OBSERVAÇÕES - comente pequenas variações como observações, não como falhas relevantes",
          "PONTOS A MELHORAR - destaque apenas padrões realmente importantes, com números e proporção",
          "PRÓXIMOS PASSOS - 2-3 ajustes práticos para a próxima semana, alinhados ao objetivo",
          "AVALIAÇÃO DA SEMANA - síntese realista do progresso e do principal foco",
          "",
          "Responda em português do Brasil. Use os dados acima e não generalize."
        ]).filter(l => l !== null && l !== undefined).join("\n");
        prompt = weekLines;
      }
      const text = await callAI(prompt, 1000);
      setFeedbackText(text);
    } catch (_) {
      notify(pickLang(lang, "Erro: ", "Error: ", "Error: ") + (_.message || pickLang(lang, "Não foi possível gerar o feedback.", "Could not generate feedback.", "No fue posible generar el feedback.")), 8000);
    }
    setFeedbackLoading(false);
  }
  // Genetic Algorithm Meal Suggester
  function getAutomaticMealSuggestionLimits(now = new Date()) {
    const entries = Object.values(activeLog).flat();
    const eatenProtein = entries.reduce((sum, entry) => sum + (Number(entry.protein) || 0), 0);
    const eatenKcal = entries.reduce((sum, entry) => sum + (Number(entry.kcal) || 0), 0);
    const remainingProtein = Math.max(0, (Number(goals.protein) || 150) - eatenProtein);
    const remainingKcal = Math.max(0, (Number(goals.kcal) || 2000) - eatenKcal);
    const hoursLeft = window.MealScore && typeof window.MealScore.hoursUntilLocalMidnight === "function"
      ? window.MealScore.hoursUntilLocalMidnight(now)
      : Math.max(0.25, (new Date(now).setHours(24, 0, 0, 0) - new Date(now).getTime()) / 3600000);
    const timeShare = window.MealScore && typeof window.MealScore.timeShare === "function"
      ? window.MealScore.timeShare(hoursLeft, 3)
      : Math.min(1, 3 / Math.max(0.25, hoursLeft));
    const sizeMultiplier = Math.max(0.2, 1 + gaTolerance / 100);
    return {
      remainingProtein,
      remainingKcal,
      hoursLeft,
      timeShare,
      proteinMax: Math.max(5, Math.round(remainingProtein * timeShare * sizeMultiplier)),
      kcalMax: Math.max(50, Math.round(remainingKcal * timeShare * sizeMultiplier))
    };
  }

  async function runGA() {
    setGARunning(true);
    setGAProgress(0);
    setGAResults([]);
    setGAHasSearched(true);

    // Build food list
    const foods = pantry.filter(f =>
      gaUseAll ? true : gaSelIds[f.id]
    ).filter(f => (f.protein100 ?? 0) > 0 || (f.kcal100 ?? 0) > 0);

    if (foods.length === 0) {
      notify(uiText("Adicione alimentos à despensa primeiro.", "Add foods to the pantry first.", "Añade alimentos a la despensa primero."));
      setGARunning(false); return;
    }

    // Remaining nutritional budget for the day
    const automaticLimits = getAutomaticMealSuggestionLimits();
    const readLimit = v => {
      if (v === "" || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const kcalMinLimit = readLimit(gaKcalMin);
    const kcalMaxLimit = readLimit(gaKcalMax);
    const protMinLimit = readLimit(gaProtMin);
    const protMaxLimit = readLimit(gaProtMax);
    const hasKcalMin = kcalMinLimit !== null;
    const hasKcalMax = kcalMaxLimit !== null;
    const hasProtMin = protMinLimit !== null;
    const hasProtMax = protMaxLimit !== null;
    const kcalBudget = hasKcalMax ? kcalMaxLimit : automaticLimits.kcalMax;
    const targetProt = hasProtMax ? protMaxLimit : automaticLimits.proteinMax;
    const effectiveProtMax = targetProt;
    const protBudget = effectiveProtMax;

    /**
     * Computes a safe search range for each food before the GA starts.
     *
     * Input: pantry foods plus user kcal/protein limits.
     * Output: one integer gene interval per food.
     *
     * Important: the serving step is intentionally unchanged here. For now,
     * g/ml foods still use 100g/ml per gene and "un" foods use 1 item per
     * gene. Future portion-fraction work should change only geneStep.
     */
    const computeSuggestionBounds = () => {
      const fallbackGeneCap = food => food.unit === 'un' ? 100 : 20; // 100 units or 2000g/ml.
      const safeInt = (value, fallback) => {
        const n = Number(value);
        return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
      };

      return foods.map(food => {
        const manual = gaLimits[food.id] || {};
        const userMax = safeInt(manual.max ?? gaGlobalMax, 5);
        const userMin = safeInt(manual.min ?? 0, 0);
        const kcalPerGene = Number(food.kcal100) || 0;
        const protPerGene = Number(food.protein100) || 0;
        const maxCandidates = [userMax];
        let usedVariableCap = false;

        const kcalCeiling = kcalBudget;
        if (Number.isFinite(kcalCeiling) && kcalCeiling >= 0 && kcalPerGene > 0) {
          maxCandidates.push(Math.floor(kcalCeiling / kcalPerGene));
          usedVariableCap = true;
        }

        const protCeiling = effectiveProtMax;
        if (protCeiling !== null && Number.isFinite(protCeiling) && protCeiling >= 0 && protPerGene > 0) {
          maxCandidates.push(Math.floor(protCeiling / protPerGene));
          usedVariableCap = true;
        }

        if (!usedVariableCap) {
          maxCandidates.push(fallbackGeneCap(food));
        }

        const max = Math.max(0, Math.min(...maxCandidates.filter(Number.isFinite)));
        const min = Math.min(userMin, max);
        return { min, max };
      });
    };

    const bounds = computeSuggestionBounds();

    // Per-food gene bounds. Gene unit: "un" = 1 item; g/ml = 100g/ml.
    const geneMax = i => bounds[i]?.max ?? 0;
    const geneMin = i => bounds[i]?.min ?? 0;
    const safeRound = value => {
      const n = Number(value);
      return Number.isFinite(n) ? Math.round(n) : 0;
    };
    const clampGene = (value, i) => Math.max(geneMin(i), Math.min(geneMax(i), safeRound(value)));
    const randGene = i => {
      const min = geneMin(i);
      const max = geneMax(i);
      if (max <= min) return min;
      return min + Math.floor(Math.random() * (max - min + 1));
    };

    // Totals from gene array
    const totals = genes => {
      let p=0,k=0,c=0,f=0;
      genes.forEach((g,i)=>{
        // Pantry macros are stored as protein100/kcal100/etc.
        // For g/ml foods, one gene is 100g/ml; for unit foods, one gene is one unit.
        p += (Number(foods[i].protein100) || 0) * g;
        k += (Number(foods[i].kcal100) || 0) * g;
        c += (Number(foods[i].carbs100) || 0) * g;
        f += (Number(foods[i].fat100) || 0) * g;
      });
      return {protein:p, kcal:k, carbs:c, fat:f};
    };

    // Fitness functions
    // Helper: penalty for being outside [lo, hi] interval
    // Inside ? 0; outside ? grows proportionally
    const intervalPen = (val, lo, hi, hardness) => {
      if (val < lo) return hardness * (lo - val) / Math.max(lo, 1);
      if (val > hi) return hardness * (val - hi) / Math.max(hi, 1);
      return 0;
    };

    // Determine effective kcal interval
    // Tolerance slider now ranges -40% to +40%, allowing deficit targets
    const kcalLo = hasKcalMin ? kcalMinLimit : 0;
    const kcalHi = kcalBudget;

    const protLo = hasProtMin ? protMinLimit : 0;
    const protHi = effectiveProtMax;

    // Decide which fitness variant to use
    const hasAbsLimits = hasKcalMin || hasKcalMax || hasProtMin || hasProtMax;

    const fitness = genes => {
      const t = totals(genes);
      if (genes.every(g=>g===0)) return 999;

      if (hasAbsLimits) {
        // Fitness B: interval-based
        // Penalize being outside user-defined [min, max] ranges
        // Inside the interval ? small reward for being centered
        const kPen = intervalPen(t.kcal,
          hasKcalMin ? kcalLo : Math.max(0, kcalHi*0.2),
          hasKcalMax ? kcalHi : kcalBudget,
          8);
        const pPen = intervalPen(t.protein,
          hasProtMin ? protLo : (gaUseProtTol ? 0 : targetProt*0.5),
          protHi,
          8);
        // Soft centering bonus (pulls solution toward middle of interval)
        const kMid = ((hasKcalMin?kcalLo:kcalHi*0.2) + (hasKcalMax?kcalHi:kcalBudget)) / 2;
        const pMid = ((hasProtMin?protLo:targetProt*0.5) + protHi) / 2;
        const kCenter = 0.1 * Math.abs(t.kcal - kMid) / Math.max(kMid, 1);
        const pCenter = 0.1 * Math.abs(t.protein - pMid) / Math.max(pMid, 1);
        return kPen + pPen + kCenter + pCenter;

      } else {
        // Fitness A: target-based
        const protDev = gaUseProtTol
          ? (t.protein > protBudget
              ? 10*(t.protein-protBudget)/Math.max(protBudget,1)
              : Math.abs(t.protein-targetProt)/Math.max(targetProt,1))
          : Math.abs(t.protein - targetProt) / Math.max(targetProt,1);
        const kcalPen = t.kcal > kcalBudget
          ? 10*(t.kcal-kcalBudget)/Math.max(kcalBudget,1)
          : 0.3*(1 - t.kcal/Math.max(kcalBudget,1));
        return protDev + kcalPen;
      }
    };

    // GA params - adaptive to N (number of foods)
    const N = foods.length;

    // Population: grows gently with N, capped for browser performance
    const POP = Math.min(200, Math.max(80, N * 7));

    // Stagnation threshold: how many generations without bestFit improvement
    // before triggering a restart. More genes = more patience.
    const STAG_LIMIT = Math.max(150, N * 20);

    // Max generations per restart ? generous since stagnation is the real brake
    const GENS_PER_RESTART = Math.max(600, N * 60);

    // Number of full restarts before giving up
    const MAX_RESTARTS = N <= 10 ? 3 : N <= 20 ? 4 : 5;

    // Fitness target: relaxes slightly as N grows (harder to nail exactly)
    const STOP_FIT = Math.min(0.18, 0.06 + N * 0.004);

    const MUT_RATE = 0.15;
    const N_SOLS = 5;

    const solutions=[], solKeys=new Set();
    let bestFit=Infinity, bestInd=null;

    const solKey = g => g.join(',');
    const isSolutionAllowed = genes => {
      if (!genes.some(g => g > 0)) return false;
      const t = totals(genes);
      if (hasKcalMin && t.kcal < kcalMinLimit) return false;
      if (t.kcal > kcalBudget) return false;
      if (hasProtMin && t.protein < protMinLimit) return false;
      if (t.protein > effectiveProtMax) return false;
      return genes.every((g, i) => g >= geneMin(i) && g <= geneMax(i));
    };

    const makeSolution = ind => {
      const t = totals(ind.genes);
      return {
        genes:ind.genes, fit:ind.fit,
        protein:Math.round(t.protein), kcal:Math.round(t.kcal),
        carbs:Math.round(t.carbs), fat:Math.round(t.fat),
        items: foods.map((f,i)=>({food:f, gene:ind.genes[i]})).filter(x=>x.gene>0)
      };
    };

    const select = p => {
      p.sort((a,b)=>a.fit-b.fit);
      return p.slice(0, Math.floor(p.length/2));
    };

    const cross = (a,b) => {
      const pt = Math.floor(Math.random()*a.genes.length);
      const g = [...a.genes.slice(0,pt), ...b.genes.slice(pt)].map((gene, i) => clampGene(gene, i));
      return {genes:g, fit:fitness(g)};
    };

    const mutate = ind => {
      const g = [...ind.genes];
      if (Math.random()>0.5) {
        const sw = Math.max(1, Math.floor(g.length*0.1));
        for(let k=0;k<sw;k++){
          const a=Math.floor(Math.random()*g.length);
          const b=Math.floor(Math.random()*g.length);
          [g[a],g[b]]=[g[b],g[a]];
        }
      } else {
        const ch = Math.floor(Math.random()*Math.ceil(g.length/2))+1;
        for(let k=0;k<ch;k++){
          const j=Math.floor(Math.random()*g.length);
          const x=randGene(j);
          g[j]=clampGene(Math.abs(g[j]-x), j);
        }
      }
      return {genes:g, fit:fitness(g)};
    };

    // Multi-restart loop with stagnation detection
    let totalGens = 0;
    const totalGensEstimate = MAX_RESTARTS * GENS_PER_RESTART;

    for(let restart=0; restart<MAX_RESTARTS; restart++){
      // Fresh population, but seed with best known individual if we have one
      let pop = Array.from({length:POP}, (_,pi) => {
        if(pi===0 && bestInd) return bestInd;
        const g = foods.map((_,i)=>randGene(i));
        return {genes:g, fit:fitness(g)};
      });

      let stagCount = 0;
      let restartBestFit = bestFit;

      for(let gen=0; gen<GENS_PER_RESTART; gen++){
        totalGens++;

        if(totalGens % 20 === 0){
          setGAProgress(Math.min(99, Math.round(totalGens/totalGensEstimate*100)));
          await new Promise(r=>setTimeout(r,0));
        }

        const parents = select([...pop]);
        const genBest = parents[0].fit;

        if(genBest < bestFit){
          bestFit = genBest;
          bestInd = parents[0];
        }

        // Stagnation detection
        if(genBest < restartBestFit - 0.001){
          restartBestFit = genBest;
          stagCount = 0;
        } else {
          stagCount++;
        }

        // Collect valid solutions
        for(const ind of parents){
          if(ind.fit < STOP_FIT){
            const k=solKey(ind.genes);
            if(!solKeys.has(k) && isSolutionAllowed(ind.genes)){
              solKeys.add(k);
              solutions.push(makeSolution(ind));
              solutions.sort((a,b)=>a.fit-b.fit);
              setGAResults([...solutions].slice(0,N_SOLS));
            }
          }
        }

        // Early exit: enough good solutions found
        if(solutions.length>=N_SOLS && bestFit<STOP_FIT) break;

        // Stagnation ? end this restart early
        if(stagCount >= STAG_LIMIT) break;

        // Crossover + mutation
        const sons = parents.map(()=>{
          const xi=Math.floor(Math.random()*parents.length);
          let yi; do{yi=Math.floor(Math.random()*parents.length);}while(yi===xi&&parents.length>1);
          const son=cross(parents[xi],parents[yi]);
          return Math.random()<MUT_RATE ? mutate(son) : son;
        });
        pop=[...parents,...sons];
      }

      // Stop all restarts if we have enough solutions
      if(solutions.length>=N_SOLS && bestFit<STOP_FIT) break;
    }

    // Fallback: show best attempt if no solution met STOP_FIT
    if(solutions.length===0 && bestInd && isSolutionAllowed(bestInd.genes)){
      solutions.push(makeSolution(bestInd));
      setGAResults(solutions);
    }
    if(solutions.length===0){
      notify(uiText(
        "Nenhuma combinação válida foi encontrada com os limites definidos.",
        "No valid combination was found with the selected limits.",
        "No se encontró ninguna combinación válida con los límites definidos."
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
        "Não foi possível gerar sugestões de refeição: ",
        "Could not generate meal suggestions: ",
        "No se pudieron generar sugerencias de comida: "
      ) + (err?.message || err), 8000);
    }
  }

  function openMealSuggestions() {
    if (!pantry.length) {
      notify(uiText("Adicione alimentos à despensa primeiro.", "Add foods to the pantry first.", "Añade alimentos a la despensa primero."));
      return;
    }
    setGAResults([]);
    setGAHasSearched(false);
    setGAProgress(0);
    setGATargetMeal(MEALS[1] || MEALS[0]);
    setShowGA(true);
  }

  function addGAResultToDiary(result) {
    const meal = gaTargetMeal || MEALS[1]; // default almo?o
    result.items.forEach(({food, gene}) => {
      // Convert gene back to real qty
      const qty = food.unit === 'un' ? gene : gene * 100;
      const entry = buildEntry(food, qty);
      setActiveLog(prev => ({
        ...prev,
        [meal]: [...(prev[meal]||[]), entry]
      }));
    });
    notify(uiText("Refeição adicionada ao diário (", "Meal added to diary (", "Comida añadida al diario (") + mealLabel(meal) + ")!");
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
  const baseWaterGoal = viewWeight ? Math.round(viewWeight * (isTraining ? 40 : 35) / 50) * 50 : 2500;
  const baseGoals = computeGoals(viewWeight, isTraining, goalProfile);
  const calorieBase = baseGoals.baseCalories || (baseGoals.kcal - getGoalAdjustment(nutritionPrefs));
  const calorieAdjustment = baseGoals.adjustment ?? getGoalAdjustment(nutritionPrefs);
  const proteinMultiplier = baseGoals.proteinMultiplier || getProteinMultiplier(nutritionPrefs);
  const adjustmentPct = calorieBase ? Math.round(Math.abs(calorieAdjustment) / calorieBase * 100) : 0;
  const aggressiveAdjustment = adjustmentPct >= 25;
  const calculatedGoals = {
    protein: customGoals.protein || baseGoals.protein,
    kcal: customGoals.kcal || baseGoals.kcal,
    carbs: customGoals.carbs || baseGoals.carbs,
    fat: customGoals.fat || baseGoals.fat,
    fiber: customGoals.fiber || baseGoals.fiber,
    salt: customGoals.salt || baseGoals.salt,
    water: customGoals.water || baseWaterGoal
  };
  const extremeAdjustment = Math.abs(calorieAdjustment) >= 750 || adjustmentPct >= 35 || calculatedGoals.kcal < 1200;
  const calorieAdjustmentWarning = extremeAdjustment
    ? uiText(
      "Este ajuste calórico parece muito agressivo. Metas muito baixas ou déficits/superávits grandes podem ser pouco saudáveis e difíceis de sustentar; considere um ajuste menor ou um prazo mais longo.",
      "This calorie adjustment looks very aggressive. Very low targets or large deficits/surpluses can be unhealthy and hard to sustain; consider a smaller adjustment or a longer timeline.",
      "Este ajuste calórico parece muy agresivo. Metas muy bajas o déficits/superávits grandes pueden ser poco saludables y difíciles de mantener; considera un ajuste menor o un plazo más largo."
    )
    : aggressiveAdjustment
      ? uiText(
        "Este é um ajuste alto. Revise o prazo ou use um ajuste manual menor se a meta parecer extrema.",
        "This is a high adjustment. Review the timeline or use a smaller manual adjustment if the target feels too extreme.",
        "Este es un ajuste alto. Revisa el plazo o usa un ajuste manual menor si la meta parece extrema."
      )
      : "";
  const weeklyGoalRate = Number(nutritionPrefs.goalKg) && Number(nutritionPrefs.goalWeeks) ? Number(nutritionPrefs.goalKg) / Number(nutritionPrefs.goalWeeks) : 0;
  const healthGuardrails = [
    calculatedGoals.kcal < 1200 && uiText("Meta final abaixo de 1200 kcal/dia: normalmente é baixa demais sem acompanhamento profissional.", "Final target below 1200 kcal/day: this is usually too low without professional supervision.", "Meta final por debajo de 1200 kcal/día: normalmente es demasiado baja sin supervisión profesional."),
    Math.abs(calorieAdjustment) >= 750 && uiText("Ajuste acima de 750 kcal/dia: considere um prazo maior para proteger aderência e recuperação.", "Adjustment above 750 kcal/day: consider a longer timeline to protect adherence and recovery.", "Ajuste superior a 750 kcal/día: considera un plazo mayor para proteger adherencia y recuperación."),
    adjustmentPct >= 35 && uiText("Ajuste acima de 35% da base do dia: é uma mudança extrema em relação à manutenção estimada.", "Adjustment above 35% of your day base: this is an extreme change compared with your estimated maintenance.", "Ajuste superior al 35% de la base del día: es un cambio extremo frente al mantenimiento estimado."),
    nutritionPrefs.goalType === "loss" && weeklyGoalRate > 1 && uiText("Perda planejada acima de 1 kg/semana: pode aumentar fome, fadiga e risco de perda muscular.", "Planned loss above 1 kg/week: this may increase hunger, fatigue, and muscle-loss risk.", "Pérdida planificada por encima de 1 kg/semana: puede aumentar hambre, fatiga y riesgo de pérdida muscular."),
    nutritionPrefs.goalType === "gain" && weeklyGoalRate > 0.5 && uiText("Ganho planejado acima de 0,5 kg/semana: um superávit grande pode aumentar ganho de gordura desnecessário.", "Planned gain above 0.5 kg/week: a large surplus may add unnecessary fat gain.", "Ganancia planificada por encima de 0,5 kg/semana: un superávit grande puede aumentar ganancia de grasa innecesaria.")
  ].filter(Boolean);
  const isToday = viewDate === TODAY;
  const frozenGoals = goalHistory[viewDate];
  const goals = !isToday && frozenGoals ? {...calculatedGoals, ...frozenGoals} : calculatedGoals;
  function monthDays(monthKey) {
    const [year, month] = monthKey.split("-").map(Number);
    const first = new Date(year, month - 1, 1, 12);
    const startOffset = first.getDay();
    const lastDay = new Date(year, month, 0, 12).getDate();
    const cells = Array.from({length: startOffset}, () => null);
    for (let day = 1; day <= lastDay; day++) {
      cells.push(`${monthKey}-${String(day).padStart(2, "0")}`);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }
  function shiftMonth(monthKey, delta) {
    const [year, month] = monthKey.split("-").map(Number);
    const d = new Date(year, month - 1 + delta, 1, 12);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  function calendarMarkerFor(logForDay, targetGoals) {
    const entries = Object.values(logForDay || {}).flat();
    const protein = entries.reduce((s, e) => s + (e.protein ?? 0), 0);
    const kcal = entries.reduce((s, e) => s + (e.kcal ?? 0), 0);
    return {
      hasData: entries.length > 0,
      proteinMet: entries.length > 0 && protein >= targetGoals.protein,
      kcalGood: entries.length > 0 && kcal >= targetGoals.kcal * 0.85 && kcal <= targetGoals.kcal * 1.15,
      kcalOver: entries.length > 0 && kcal > targetGoals.kcal * 1.15,
      protein: Math.round(protein),
      kcal: Math.round(kcal)
    };
  }
  useEffect(() => {
    if (!loaded || !calendarOpen) return;
    let cancelled = false;
    async function loadCalendarMonth() {
      setCalendarLoading(true);
      const nextData = {};
      const dates = monthDays(calendarMonth).filter(Boolean).filter(date => date <= TODAY);
      await Promise.all(dates.map(async date => {
        let dayLog = date === TODAY ? log : {};
        if (date !== TODAY) {
          const saved = await storage.get("log_v2_" + date).catch(() => null);
          if (saved?.value) {
            try {
              const parsed = typeof saved.value === "string" ? JSON.parse(saved.value) : saved.value;
              dayLog = normalizeMealKeys(parsed || {});
            } catch (error) {
              console.warn("Registro diário inválido no calendário:", date, error);
            }
          }
        }
        nextData[date] = calendarMarkerFor(dayLog, dayGoalForDate(date));
      }));
      if (!cancelled) {
        setCalendarData(prev => ({...prev, [calendarMonth]: nextData}));
        setCalendarLoading(false);
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
    buildDayTotals, normalizeMealKeys, downloadFile, lang, notify,
    weightHistory
  };
  function setActiveLog(newLog) {
    if (isToday) {
      setLog(newLog);
    } else {
      setHistoryLog(newLog);
      scheduleSave("log_v2_" + viewDate, newLog);
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
  function buildFoodSnapshot(food) {
    const snap = {
      id: food.id || null,
      name: food.name,
      unit: food.unit
    };
    ALL_FIELDS_KEYS.forEach(f => {
      snap[f.key] = food[f.key] != null ? food[f.key] : null;
    });
    return snap;
  }
  function buildEntryFromSnapshot(snapshot, qty) {
    const e = {
      id: Date.now().toString() + Math.random(),
      foodId: snapshot.id || null,
      name: snapshot.name,
      qty,
      unit: snapshot.unit,
      foodSnapshot: {
        ...snapshot
      }
    };
    const div = divisor(snapshot.unit);
    ALL_FIELDS_KEYS.forEach(f => {
      e[f.key.replace("100", "")] = snapshot[f.key] != null ? snapshot[f.key] * qty / div : null;
    });
    e.time = new Date().toTimeString().slice(0,5);
    return e;
  }
  function buildEntry(food, qty) {
    return buildEntryFromSnapshot(buildFoodSnapshot(food), qty);
  }
  function recalcEntryQuantity(entry, qty) {
    if (entry.foodSnapshot) {
      const ne = buildEntryFromSnapshot(entry.foodSnapshot, qty);
      return {
        ...ne,
        id: entry.id,
        time: entry.time || ne.time
      };
    }
    const ratio = entry.qty ? qty / entry.qty : 1;
    const upd = {
      ...entry,
      qty
    };
    ALL_FIELDS_KEYS.forEach(f => {
      const k = f.key.replace("100", "");
      if (entry[k] != null) upd[k] = entry[k] * ratio;
    });
    return upd;
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
  function templateItemEntry(item) {
    const qty = Number(item.qty) || 0;
    if (item.foodSnapshot) return buildEntryFromSnapshot(item.foodSnapshot, qty);
    if (item.kcal != null || item.protein != null) {
      return {
        ...item,
        id: item.foodId || item.name,
        qty,
        protein: item.protein || 0,
        kcal: item.kcal || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        fiber: item.fiber || 0,
        salt: item.salt || 0
      };
    }
    const food = pantry.find(f => f.id === item.foodId || f.name === item.name);
    return food ? buildEntry(food, qty) : {
      ...item,
      id: item.foodId || item.name,
      qty,
      protein: 0,
      kcal: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      salt: 0
    };
  }
  function templateEntries(tmpl) {
    return (tmpl.items || []).map(templateItemEntry);
  }
  function templateTotals(tmpl) {
    return buildDayTotals({items: templateEntries(tmpl)});
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

  // Converts optional numeric inputs to either a number or null. Empty fields
  // mean "not measured"; they should not become zero because zero is a real
  // value in chart calculations.
  function optionalNumber(value) {
    if (value === "" || value == null) return null;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  // Upserts one measurement by date. Firestore stores weightHistory as one
  // array, so this helper keeps the invariant "one record per date" and avoids
  // accidental loss when editing historical entries.
  function upsertWeightEntry(history, entry, previousDate) {
    const byDate = new Map();

    history.forEach(item => {
      if (!previousDate || item.date !== previousDate) {
        byDate.set(item.date, item);
      }
    });

    const existingForDate = byDate.get(entry.date);
    byDate.set(entry.date, {
      ...existingForDate,
      ...entry,
      id: existingForDate?.id || entry.id || Date.now().toString()
    });

    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  // Cleans older duplicated weight rows at render/save time. Some previous
  // versions reused IDs, so date is the reliable identity for measurements.
  function normalizeWeightHistory(history) {
    return [...(history || [])].reduce((acc, item) => upsertWeightEntry(acc, item), []);
  }

  function calculateBmrForMeasurement(entry) {
    if (!entry || !Number(entry.weight)) return null;
    const goal = computeGoals(Number(entry.weight), true, {
      height: Number(entry.height || profileData.height || currentHeight),
      birthDate: profileData.birthDate,
      gender: profileData.gender,
      prefs: nutritionPrefs,
      referenceDate: entry.date || TODAY
    });
    return Number(goal.bmr) || null;
  }

  // Backfills a dated BMR snapshot for existing weight measurements once the
  // required profile fields are available. Future edits keep it synchronized.
  useEffect(() => {
    if (!loaded || !profileData.birthDate || !profileData.gender || !profileData.height) return;
    setWeightHistory(history => {
      let changed = false;
      const next = normalizeWeightHistory(history).map(item => {
        const bmr = calculateBmrForMeasurement(item);
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
    entry.bmr = calculateBmrForMeasurement(entry) ?? existing?.bmr ?? null;
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
    entry.bmr = calculateBmrForMeasurement(entry) ?? original.bmr ?? null;

    setWeightHistory(h => upsertWeightEntry(normalizeWeightHistory(h), entry, editingWeightId));
    setEditingWeightId(null);
    notify(uiText("Registro atualizado.", "Record updated.", "Registro actualizado."));
  }

  // Export/Import
  // Gemini AI helper
  async function callAI(prompt, maxTokens) {
    const key = localStorage.getItem('groq_key') || '';
  if (!key) throw new Error(uiText(
    "Chave API Groq não configurada. Abra as Configurações.",
    "Groq API key is not configured. Open Settings.",
    "La clave API de Groq no está configurada. Abre Configuración."
  ));
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens || 800,
        temperature: 0
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || uiText('Erro na API Groq', 'Groq API error', 'Error en la API de Groq'));
    return data.choices?.[0]?.message?.content || '';
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
        downloadFile(JSON.stringify(backup, null, 2), filename, 'application/json');

      } else if (type === 'pantry') {
        const r = await storage.get('pantry_v2');
        data = {pantry_v2: r?.value || '[]'};
        filename = 'despensa_' + today + '.json';
        downloadFile(JSON.stringify({exportedAt:new Date().toISOString(),type:'pantry',data},null,2), filename, 'application/json');

      } else if (type === 'today') {
        const entries = Object.values(activeLog).flat();
        data = {date:today, isTraining, goals, meals:activeLog, totals:buildDayTotals(activeLog)};
        filename = 'diario_' + today + '.json';
        downloadFile(JSON.stringify({exportedAt:new Date().toISOString(),type:'day',data},null,2), filename, 'application/json');

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
        downloadFile(JSON.stringify({exportedAt:new Date().toISOString(),type,days},null,2), filename, 'application/json');

      } else if (type === 'weight') {
        const whr = await storage.get('weightHistory').catch(()=>null);
        const whData = whr?.value ? JSON.parse(whr.value) : weightHistory;
        data = {weightHistory: whData};
        filename = 'peso_' + today + '.json';
        downloadFile(JSON.stringify({exportedAt:new Date().toISOString(),type:'weight',data},null,2), filename, 'application/json');
      }

      notify(L('Arquivo baixado!', 'File downloaded!', 'Archivo descargado!'));
    } catch(e) {
      notify(L('Erro ao exportar: ', 'Export error: ', 'Error al exportar: ') + e.message);
    }
  }

  async function exportFullBackup() {
    setBackupLoading(true);
    setBackupJson(null);
    try {
      const backup = window.exportFullAccountBackup
        ? await window.exportFullAccountBackup()
        : await buildLegacyFullBackup();
      const json = JSON.stringify(backup, null, 2);
      setBackupJson(json);
      downloadFile(json, 'backup_completo_' + TODAY + '.json', 'application/json');
      notify(text('notifBackupDone'));
    } catch (e) {
      notify(uiText("Erro ao exportar: ", "Export error: ", "Error al exportar: ") + e.message);
    }
    setBackupLoading(false);
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
  function total(key) {
    const k = key.replace("100", "");
    return allEntries.reduce((s, e) => s + (e[k] ?? 0), 0);
  }
  const tot = {
    protein: total("protein"),
    kcal: total(text('kcalUnit')),
    carbs: total("carbs"),
    fat: total("fat"),
    fiber: total("fiber"),
    salt: total("salt"),
    sugars: total("sugars"),
    satfat: total("satfat")
  };
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
    const payload = {
      algorithmVersion: review.result.algorithmVersion,
      finalScore: Math.round(review.result.score * 100) / 100,
      coverage: Math.round(review.result.coverage * 100),
      evaluatedNutrients: mealScoreEvaluationCount(review.result),
      hoursUntilMidnight: Math.round(review.result.hoursLeft * 100) / 100,
      nutrients: review.result.components,
      missingNutrients: review.result.missing,
      foods: review.items.map(item => ({name: item.name, quantity: item.qty, unit: item.unit}))
    };
    const prompt = uiText(
      "Explique brevemente a avaliação nutricional abaixo em português do Brasil. A nota foi calculada pelo aplicativo e é definitiva: não recalcule, não altere e não proponha outra nota. Em no máximo 120 palavras, apresente pontos positivos, principal excesso ou carência, impacto nas metas do dia e até duas alterações práticas. Não critique nutrientes ausentes e diferencie problemas desta refeição de excessos acumulados anteriormente.\n\nDADOS:\n",
      "Briefly explain the nutrition assessment below in American English. The app calculated the final score: do not recalculate, change, or suggest another score. In no more than 120 words, cover strengths, the main excess or shortfall, impact on today's targets, and up to two practical changes. Do not criticize missing nutrients, and distinguish this meal from excess accumulated earlier.\n\nDATA:\n",
      "Explica brevemente en español la evaluación nutricional siguiente. La nota final fue calculada por la app: no la recalcules, cambies ni propongas otra. En un máximo de 120 palabras, indica puntos positivos, el principal exceso o carencia, impacto en las metas del día y hasta dos cambios prácticos. No critiques nutrientes ausentes y diferencia esta comida de excesos acumulados anteriormente.\n\nDATOS:\n"
    ) + JSON.stringify(payload, null, 2);
    try {
      const explanation = await callAI(prompt, 350);
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
  const hasMicros = MICRO_FIELDS.some(f => allEntries.some(e => e[f.key.replace("100", "")]));
  const selectedFood = addEntry.foodId ? pantry.find(f => f.id === addEntry.foodId) : null;
  const filteredPantry = pantrySearch ? pantry.filter(f => f.name.toLowerCase().includes(pantrySearch.toLowerCase())) : pantry;
  const sortedPantry = [...filteredPantry].sort((a, b) => (a.name || "").localeCompare(b.name || "", sortLocaleForLang(lang), { sensitivity: "base" }));
  const sortedAllPantry = [...pantry].sort((a, b) => (a.name || "").localeCompare(b.name || "", sortLocaleForLang(lang), { sensitivity: "base" }));
  const remainProtein = Math.max(0, Math.round(goals.protein - tot.protein));
  const remainKcal = Math.max(0, Math.round(goals.kcal - tot.kcal));
  const dayProteinPct = goals.protein ? Math.round(tot.protein / goals.protein * 100) : 0;
  const dayKcalPct = goals.kcal ? Math.round(tot.kcal / goals.kcal * 100) : 0;
  const diaryStatus = (() => {
    if (!allEntries.length) return {
      tone: "muted",
      title: uiText("Nenhuma refeição registrada ainda", "No meals logged yet", "Aún no hay comidas registradas"),
      text: uiText(
        "Registre sua primeira refeição do dia.",
        "Log your first meal of the day.",
        "Registra tu primera comida del día."
      )
    };
    if (dayKcalPct > 115) return {
      tone: "warn",
      title: uiText("Calorias acima do ideal", "Calories are running high", "Calorías por encima de lo ideal"),
      text: uiText(
        "Você passou da faixa confortável de hoje. Priorize escolhas mais leves e com boa proteína.",
        "You are past the comfortable range for today. Prioritize lighter, protein-focused choices.",
        "Ya pasaste la zona cómoda de hoy. Prioriza opciones más ligeras y con buena proteína."
      )
    };
    if (dayProteinPct < 60 && dayKcalPct > 60) return {
      tone: "warn",
      title: uiText("Proteína está ficando para trás", "Protein is lagging behind", "La proteína se está quedando atrás"),
    text: uiText(
      "As calorias estão avançando mais rápido que a proteína. Uma opção proteica magra pode equilibrar o dia.",
      "Calories are moving faster than protein. A lean protein option may help balance the day.",
      "Las calorías avanzan más rápido que la proteína. Una opción proteica magra puede equilibrar el día."
    )
    };
    if (dayProteinPct >= 100 && dayKcalPct <= 115) return {
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
    const metrics = [
      {key: "protein", value: tot.protein, target: goals.protein, unit: "g", tone: "success"},
      {key: "kcal", value: tot.kcal, target: goals.kcal, unit: "kcal", tone: "success"},
      {key: "carbs", value: tot.carbs, target: goals.carbs, unit: "g", tone: "success"},
      {key: "fat", value: tot.fat, target: goals.fat, unit: "g", tone: "success"},
      {key: "fiber", value: tot.fiber, target: goals.fiber, unit: "g", tone: "success"},
      {key: "salt", value: tot.salt, target: goals.salt, unit: "g", tone: "warning"}
    ];
    if (isToday) {
      metrics.push({key: "water", value: totalWater, target: goals.water, unit: "ml", tone: "success"});
    }
    metrics.forEach(metric => {
      if (!metric.target || metric.value < metric.target) return;
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
    const entries = templateEntries(tmpl);
    const totals = templateTotals(tmpl);
    const expanded = !!expandedTemplateIds[tmpl.id];
    const isEditingTemplate = context === "pantry" && editingTemplateId === tmpl.id && templateEditDraft;
    const proteinPct = pctOf(totals.protein, goals.protein);
    const kcalPct = pctOf(totals.kcal, goals.kcal);
    const cardHeader = /*#__PURE__*/React.createElement("div", {
      style: {display: "flex", alignItems: "center", gap: 8}
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => toggleTemplateExpanded(tmpl.id),
      title: expanded ? uiText("Recolher", "Collapse", "Contraer") : uiText("Expandir", "Expand", "Expandir"),
      style: {
        background: "none",
        border: "1px solid var(--border3)",
        color: "var(--muted)",
        borderRadius: 6,
        width: 28,
        height: 28,
        cursor: "pointer",
        flexShrink: 0
      }
    }, expanded ? "-" : "+"), /*#__PURE__*/React.createElement("div", {
      style: {flex: 1, minWidth: 0}
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--text2)",
        marginBottom: 4,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, tmpl.name), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: "6px 10px",
        fontSize: 12,
        color: "var(--muted)"
      }
    }, /*#__PURE__*/React.createElement("span", null, Math.round(totals.kcal), " kcal · ", kcalPct, "%"), /*#__PURE__*/React.createElement("span", null, Math.round(totals.protein), "g ", uiText("proteína", "protein", "proteína"), " · ", proteinPct, "%"), /*#__PURE__*/React.createElement("span", null, (tmpl.items || []).length, " item", (tmpl.items || []).length !== 1 ? "s" : ""))), /*#__PURE__*/React.createElement("div", {
      style: {display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end"}
    }, context === "add" && /*#__PURE__*/React.createElement("button", {
      onClick: () => appendTemplateToStaged(tmpl),
      style: sBtn("var(--btn-ok)", "var(--btn-ok-border)", "var(--btn-ok-text)")
    }, uiText("Adicionar", "Add", "Añadir")), /*#__PURE__*/React.createElement("button", {
      onClick: () => context === "pantry" ? beginTemplateEdit(tmpl) : loadTemplate(tmpl),
      style: sBtn("var(--btn-info)", "var(--btn-info-border)", "var(--btn-info-text)")
    }, uiText("Editar", "Edit", "Editar")), context === "pantry" && /*#__PURE__*/React.createElement("button", {
      onClick: () => deleteTemplate(tmpl.id),
      title: uiText("Apagar", "Delete", "Eliminar"),
      style: {
        background: "none",
        border: "1px solid var(--border3)",
        color: "var(--dim)",
        borderRadius: 6,
        padding: "4px 8px",
        fontSize: 14,
        cursor: "pointer"
      }
    }, "\u00D7")));

    const templateEditRows = isEditingTemplate && templateEditDraft.items.length === 0
      ? /*#__PURE__*/React.createElement("div", {
          style: {color: "var(--faint)", fontSize: 13, fontStyle: "italic", padding: "8px 0"}
        }, uiText("Sem ingredientes neste modelo.", "No ingredients in this template.", "Sin ingredientes en este modelo."))
      : isEditingTemplate && templateEditDraft.items.map((item, idx) => {
          const refreshed = templateItemEntry(item);
          return /*#__PURE__*/React.createElement("div", {
            key: (item.foodId || item.name || "item") + idx,
            style: {
              display: "grid",
              gridTemplateColumns: isMobileView ? "1fr" : "minmax(150px, 1fr) 96px 34px",
              gap: 8,
              alignItems: "end",
              marginBottom: 8
            }
          }, /*#__PURE__*/React.createElement("div", {
            style: {color: "var(--text2)", fontSize: 14, minWidth: 0}
          }, item.name, /*#__PURE__*/React.createElement("div", {
            style: {color: "var(--muted)", fontSize: 12, marginTop: 2}
          }, Math.round(refreshed.kcal || 0), " kcal · ", Math.round(refreshed.protein || 0), "g ", uiText("proteína", "protein", "proteína"))), /*#__PURE__*/React.createElement("input", {
            type: "number",
            value: item.qty,
            onChange: e => updateTemplateDraftItem(idx, {qty: e.target.value}),
            style: {...inp, marginTop: 0}
          }), /*#__PURE__*/React.createElement("button", {
            onClick: () => removeTemplateDraftItem(idx),
            title: uiText("Remover ingrediente", "Remove ingredient", "Eliminar ingrediente"),
            style: {
              height: 36,
              background: "none",
              border: "1px solid var(--border3)",
              color: "var(--dim)",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 16
            }
          }, "\u00D7"));
        });

    const editContent = isEditingTemplate && /*#__PURE__*/React.createElement("div", {
      style: {marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border3)"}
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: isMobileView ? "1fr" : "minmax(180px, 1fr) minmax(160px, 220px)",
        gap: 8,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: lbl
    }, uiText("Nome da refeição", "Template name", "Nombre de la comida")), /*#__PURE__*/React.createElement("input", {
      value: templateEditDraft.name,
      onChange: e => setTemplateEditDraft(d => ({...d, name: e.target.value})),
      style: inp
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: lbl
    }, uiText("Refeição padrão", "Default meal", "Comida predeterminada")), /*#__PURE__*/React.createElement("select", {
      value: templateEditDraft.meal,
      onChange: e => setTemplateEditDraft(d => ({...d, meal: e.target.value})),
      style: inp
    }, MEALS.map(m => /*#__PURE__*/React.createElement("option", {key: m, value: m}, mealLabel(m)))))), templateEditRows, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: isMobileView ? "1fr" : "minmax(180px, 1fr) 96px auto",
        gap: 8,
        alignItems: "end",
        marginTop: 10,
        paddingTop: 10,
        borderTop: "1px solid var(--border3)"
      }
    }, /*#__PURE__*/React.createElement("select", {
      value: templateEditDraft.addFoodId,
      onChange: e => setTemplateEditDraft(d => ({...d, addFoodId: e.target.value})),
      style: inp
    }, /*#__PURE__*/React.createElement("option", {value: ""}, uiText("Adicionar ingrediente...", "Add ingredient...", "Añadir ingrediente...")), sortedAllPantry.map(f => /*#__PURE__*/React.createElement("option", {key: f.id, value: f.id}, f.name))), /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: templateEditDraft.addQty,
      onChange: e => setTemplateEditDraft(d => ({...d, addQty: e.target.value})),
      placeholder: uiText("Qtd", "Qty", "Cant."),
      style: inp
    }), /*#__PURE__*/React.createElement("button", {
      onClick: addTemplateDraftItem,
      disabled: !templateEditDraft.addFoodId || !templateEditDraft.addQty,
      style: {
        ...sBtn("var(--btn-info)", "var(--btn-info-border)", "var(--btn-info-text)"),
        height: 36,
        opacity: templateEditDraft.addFoodId && templateEditDraft.addQty ? 1 : 0.45
      }
    }, uiText("Adicionar", "Add", "Añadir"))), /*#__PURE__*/React.createElement("div", {
      style: {display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12}
    }, /*#__PURE__*/React.createElement("button", {
      onClick: cancelTemplateEdit,
      style: sBtn("transparent", "var(--border2)", "var(--muted)")
    }, uiText("Cancelar", "Cancel", "Cancelar")), /*#__PURE__*/React.createElement("button", {
      onClick: saveTemplateEdit,
      disabled: !templateEditDraft.name.trim() || !templateEditDraft.items.length,
      style: {
        ...sBtn("var(--btn-ok)", "var(--btn-ok-border)", "var(--btn-ok-text)"),
        opacity: templateEditDraft.name.trim() && templateEditDraft.items.length ? 1 : 0.45
      }
    }, uiText("Salvar alterações", "Save changes", "Guardar cambios"))));

    const detailsContent = expanded && !isEditingTemplate && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        paddingTop: 10,
        borderTop: "1px solid var(--border3)",
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, entries.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {fontSize: 12, color: "var(--faint)", fontStyle: "italic"}
    }, uiText("Sem ingredientes salvos.", "No ingredients saved.", "Sin ingredientes guardados.")) : entries.map((item, idx) => /*#__PURE__*/React.createElement("div", {
      key: item.foodId || item.name || idx,
      style: {
        display: "grid",
        gridTemplateColumns: "minmax(120px, 1fr) auto",
        gap: 10,
        alignItems: "start",
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {color: "var(--text2)", minWidth: 0}
    }, item.name, /*#__PURE__*/React.createElement("div", {
      style: {color: "var(--muted)", fontSize: 12, marginTop: 2}
    }, item.qty, item.unit)), /*#__PURE__*/React.createElement("div", {
      style: {color: "var(--muted2)", fontSize: 12, textAlign: "right", lineHeight: 1.45}
    }, Math.round(item.kcal || 0), " kcal · ", Math.round(item.protein || 0), "g prot", /*#__PURE__*/React.createElement("br", null), Math.round(item.carbs || 0), "g carb · ", Math.round(item.fat || 0), "g gord"))));

    return /*#__PURE__*/React.createElement("div", {
      key: tmpl.id,
      style: {
        border: "1px solid var(--border3)",
        borderRadius: 8,
        padding: "10px 12px",
        background: "var(--surface2, var(--surface))"
      }
    }, cardHeader, editContent, detailsContent);
  }
  function calendarMonthStats() {
    const markers = Object.values(calendarData[calendarMonth] || {}).filter(m => m && m.hasData);
    const registered = markers.length;
    const proteinDays = markers.filter(m => m.proteinMet).length;
    const kcalOverDays = markers.filter(m => m.kcalOver).length;
    const avgKcalMonth = registered ? Math.round(markers.reduce((s, m) => s + (m.kcal || 0), 0) / registered) : 0;
    const avgProteinMonth = registered ? Math.round(markers.reduce((s, m) => s + (m.protein || 0), 0) / registered) : 0;
    return {registered, proteinDays, kcalOverDays, avgKcalMonth, avgProteinMonth};
  }
  const normalizedWeightEntries = normalizeWeightHistory(weightHistory);
  const historyFieldAvailability = {
    bmi: normalizedWeightEntries.some(e => Number(e.weight) > 0 && Number(e.height) > 0),
    bodyFatPct: normalizedWeightEntries.some(e => Number(e.bodyFatPct) > 0),
    muscleMassKg: normalizedWeightEntries.some(e => Number(e.muscleMassKg) > 0),
    waistCm: normalizedWeightEntries.some(e => Number(e.waistCm) > 0)
  };
  const weightChartData = normalizedWeightEntries.map(e => ({
    date: formatDateDM(e.date),
    weight: e.weight
  }));
  const currentBmr = computeGoals(currentWeight, true, {
    height: currentHeight,
    birthDate: profileData.birthDate,
    gender: profileData.gender,
    prefs: nutritionPrefs,
    referenceDate: TODAY
  }).bmr || null;
  const bmrChartData = normalizeWeightHistory(weightHistory).map(entry => ({
    date: formatDateDM(entry.date),
    bmr: Number(entry.bmr) || calculateBmrForMeasurement(entry)
  })).filter(entry => Number(entry.bmr) > 0);
  const daysWithData = weekData.filter(d => d.hasData);
  const avgProtein = daysWithData.length ? Math.round(daysWithData.reduce((s, d) => s + d.protein, 0) / daysWithData.length) : 0;
  const avgKcal = daysWithData.length ? Math.round(daysWithData.reduce((s, d) => s + d.kcal, 0) / daysWithData.length) : 0;
  const daysMetProtein = daysWithData.filter(d => d.metProtein).length;
  const completedWeekDays = weekData.filter(d => d.hasData && !d.isToday);
  const calorieBankDays = weekData.filter(d => !d.isToday).slice(-7).filter(d => d.hasData);
  const calorieBankTarget = calorieBankDays.reduce((sum, day) => sum + (Number(day.kcalGoal) || 0), 0);
  const calorieBankConsumed = calorieBankDays.reduce((sum, day) => sum + (Number(day.kcal) || 0), 0);
  const calorieBank = Math.round(calorieBankTarget - calorieBankConsumed);
  const weeklyProgress = (() => {
    const deficit = completedWeekDays.reduce((s, d) => s + Math.max(0, (d.baseCalories || d.kcalGoal || 0) - d.kcal), 0);
    const surplus = completedWeekDays.reduce((s, d) => s + Math.max(0, d.kcal - (d.baseCalories || d.kcalGoal || 0)), 0);
    const plannedDaily = Math.abs(calorieAdjustment || 0);
    const plannedWeek = plannedDaily * 7;
    const relevant = nutritionPrefs.goalType === "gain" ? surplus : nutritionPrefs.goalType === "loss" ? deficit : Math.abs(surplus - deficit);
    const adherence = plannedWeek ? Math.round(Math.min(999, relevant / plannedWeek * 100)) : 0;
    const avgDaily = completedWeekDays.length ? Math.round((nutritionPrefs.goalType === "gain" ? surplus : deficit) / completedWeekDays.length) : 0;
    return {
      days: completedWeekDays.length,
      deficit: Math.round(deficit),
      surplus: Math.round(surplus),
      plannedWeek: Math.round(plannedWeek),
      avgDaily,
      adherence
    };
  })();
  const weightTrend = (() => {
    const sorted = [...weightHistory].filter(e => Number(e.weight) > 0).sort((a, b) => a.date.localeCompare(b.date));
    const avg = arr => arr.length ? arr.reduce((s, e) => s + Number(e.weight || 0), 0) / arr.length : null;
    const avg7 = avg(sorted.slice(-7));
    const avg14 = avg(sorted.slice(-14));
    const recent = sorted.slice(-14);
    let weeklyRate = 0;
    if (recent.length >= 2) {
      const first = recent[0];
      const last = recent[recent.length - 1];
      const days = Math.max(1, (new Date(last.date + "T12:00:00") - new Date(first.date + "T12:00:00")) / 86400000);
      weeklyRate = (Number(last.weight) - Number(first.weight)) / days * 7;
    }
    const goalKg = Number(nutritionPrefs.goalKg || 0);
    const directionOk = nutritionPrefs.goalType === "loss" ? weeklyRate < -0.05 : nutritionPrefs.goalType === "gain" ? weeklyRate > 0.05 : false;
    const weeksRemaining = directionOk && goalKg > 0 ? goalKg / Math.abs(weeklyRate) : null;
    return {
      avg7,
      avg14,
      weeklyRate,
      weeksRemaining,
      hasEnough: recent.length >= 2
    };
  })();
  // Body-composition model. These calculations are estimates: body-fat scales
  // and bioimpedance can be noisy, so the UI treats them as trend signals. If a
  // target body-fat percentage exists, weightTarget assumes lean mass is stable.
  const bodyComposition = (() => {
    const sorted = [...weightHistory].filter(e => Number(e.weight) > 0).sort((a, b) => a.date.localeCompare(b.date));
    const measured = sorted.filter(e => Number(e.bodyFatPct) > 0 || Number(e.waistCm) > 0 || Number(e.muscleMassKg) > 0);
    const latest = [...measured].reverse()[0] || null;
    const currentFatPct = latest && Number(latest.bodyFatPct) > 0 ? Number(latest.bodyFatPct) : null;
    const currentWeightForBody = latest?.weight || currentWeight || null;
    const fatKg = currentFatPct && currentWeightForBody ? currentWeightForBody * currentFatPct / 100 : null;
    const leanMassKg = fatKg && currentWeightForBody ? currentWeightForBody - fatKg : null;
    const targetPct = Number(nutritionPrefs.bodyFatGoal || 0);
    const weightTarget = leanMassKg && targetPct > 0 && targetPct < 60 ? leanMassKg / (1 - targetPct / 100) : null;
    const fatToLose = weightTarget && currentWeightForBody ? Math.max(0, currentWeightForBody - weightTarget) : null;
    const fatEntries = sorted.filter(e => Number(e.bodyFatPct) > 0 && Number(e.weight) > 0).map(e => ({
      ...e,
      fatKg: Number(e.weight) * Number(e.bodyFatPct) / 100
    }));
    const recentFat = fatEntries.slice(-6);
    let fatWeeklyRate = 0;
    if (recentFat.length >= 3) {
      const first = recentFat[0];
      const last = recentFat[recentFat.length - 1];
      const days = Math.max(1, (new Date(last.date + "T12:00:00") - new Date(first.date + "T12:00:00")) / 86400000);
      fatWeeklyRate = (last.fatKg - first.fatKg) / days * 7;
    }
    const weeksRemaining = fatToLose && fatWeeklyRate < -0.03 ? fatToLose / Math.abs(fatWeeklyRate) : null;
    const fatChartData = fatEntries.map(e => ({
      date: e.date,
      label: formatDateDM(e.date),
      bodyFatPct: Number(e.bodyFatPct),
      fatKg: Math.round(e.fatKg * 10) / 10
    }));
    return {
      latest,
      measured,
      fatEntries,
      fatChartData,
      currentFatPct,
      fatKg,
      leanMassKg,
      targetPct,
      weightTarget,
      fatToLose,
      fatWeeklyRate,
      weeksRemaining,
      hasEnoughFatTrend: recentFat.length >= 3
    };
  })();
  const bodyFatGoalAutoKg = bodyComposition.fatToLose
    ? Math.round(bodyComposition.fatToLose * 10) / 10
    : "";

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
    data: normalizeWeightHistory(weightHistory)
      .filter(entry => Number(entry[config.key]) > 0)
      .map(entry => ({
        date: formatDateDM(entry.date),
        value: Number(entry[config.key])
      }))
  })).filter(config => config.data.length > 0);

  /**
   * Renders a compact Recharts line chart for optional body measurements.
   * Input: bodyMetricChartConfigs item. Output: React element.
   */
  function renderBodyMetricChart(config) {
    return /*#__PURE__*/React.createElement("div", {
      key: config.key,
      style: {
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "14px",
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        letterSpacing: 1,
        color: "var(--muted)",
        textTransform: "uppercase",
        marginBottom: 12
      }
    }, config.title), /*#__PURE__*/React.createElement(ResponsiveContainer, {
      width: "100%",
      height: isMobileView ? 190 : 150
    }, /*#__PURE__*/React.createElement(LineChart, {
      data: config.data
    }, /*#__PURE__*/React.createElement(XAxis, {
      dataKey: "date",
      tick: { fontSize: 12, fill: CT.tick },
      axisLine: false,
      tickLine: false
    }), /*#__PURE__*/React.createElement(YAxis, {
      tick: { fontSize: 12, fill: CT.tick },
      axisLine: false,
      tickLine: false,
      domain: ["auto", "auto"],
      width: 38
    }), /*#__PURE__*/React.createElement(Tooltip, {
      contentStyle: {
        background: CT.bg,
        border: "1px solid " + CT.border,
        borderRadius: 4,
        fontSize: 14,
        color: CT.label
      },
      labelStyle: { color: CT.label },
      formatter: value => [
        Math.round(Number(value) * 10) / 10 + config.unit,
        config.label
      ]
    }), config.target ? /*#__PURE__*/React.createElement(ReferenceLine, {
      y: config.target,
      stroke: "#8ec8c8",
      strokeDasharray: "4 4",
      label: {
        value: uiText("Meta ", "Target ", "Meta ") + config.target + config.unit,
        fill: CT.tick,
        fontSize: 11
      }
    }) : null, /*#__PURE__*/React.createElement(Line, {
      type: "monotone",
      dataKey: "value",
      stroke: config.color,
      strokeWidth: 2,
      dot: { fill: config.color, r: 3 },
      activeDot: { r: 5 }
    }))));
  }

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
  const renderMiniProgress = item => {
    const pct = Math.max(0, Math.min(100, item.goal ? item.value / item.goal * 100 : 0));
    return /*#__PURE__*/React.createElement("div", {
      key: item.label,
      style: {
        minWidth: isMobileView ? 120 : 180,
        flex: "1 1 180px",
        padding: "0 4px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        alignItems: "baseline",
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--muted)",
        fontSize: 11,
        letterSpacing: 1,
        textTransform: "uppercase"
      }
    }, item.label), /*#__PURE__*/React.createElement("span", {
      style: {
        color: item.value > item.goal ? "var(--btn-warn-text)" : item.color,
        fontSize: 12,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap"
      }
    }, Math.round(item.value), " / ", item.goal, item.unit)), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 5,
        borderRadius: 999,
        background: "var(--track)",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: pct + "%",
        height: "100%",
        borderRadius: 999,
        background: item.value > item.goal ? "var(--btn-warn-text)" : item.color
      }
    })));
  };

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

  /**
   * Entry point for the external Python report server.
   * Kept as a small helper because the report card is part of Tracking, not of
   * the nutrition-goal form, and should remain easy to move between layouts.
   */
  function renderReportsCard() {
    return /*#__PURE__*/React.createElement("div", {
      "data-tutorial": "advanced-reports",
      style: {
        display: metricsSection === "tracking" ? "flex" : "none",
        marginTop: 16,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "14px 16px",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        letterSpacing: 1,
        color: "var(--muted)",
        textTransform: "uppercase",
        marginBottom: 6
      }
    }, uiText("Relatórios avançados", "Advanced reports", "Informes avanzados")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--dim)",
        lineHeight: 1.45
      }
    }, uiText("Gere relatórios em HTML ou PDF com gráficos e análise do período.", "Generate HTML or PDF reports with charts and period analysis.", "Genera informes en HTML o PDF con gráficos y análisis del período."))), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setReportMessage("");
        setReportModalOpen(true);
      },
      style: sBtn("var(--btn-info)", "var(--btn-info-border)", "var(--btn-info-text)")
    }, uiText("Gerar relatório", "Generate report", "Generar informe")));
  }

  /**
   * Advanced controls for the genetic-algorithm meal suggestions.
   * The empty numeric fields intentionally defer to runGASafely(), which
   * derives safe defaults from the user's remaining calories and protein.
   */
  function renderMealSuggestionAdvancedControls() {
    const automaticLimits = getAutomaticMealSuggestionLimits();
    const autoMaxKcal = automaticLimits.kcalMax;
    const autoMaxProtein = automaticLimits.proteinMax;
    const autoMinProtein = Math.round(autoMaxProtein * 0.5);
    const compactLabel = {
      display: "block",
      color: "var(--text2)",
      fontSize: 12,
      marginBottom: 4
    };

    const limitFields = [
      {
        key: "kcalMin",
        label: uiText("Calorias min.", "Min calories", "Calorías mín."),
        unit: "kcal",
        value: gaKcalMin,
        set: setGAKcalMin,
        placeholder: uiText("auto: sem mínimo", "auto: no minimum", "auto: sin mínimo")
      },
      {
        key: "protMin",
        label: uiText("Proteína min.", "Min protein", "Proteína mín."),
        unit: "g",
        value: gaProtMin,
        set: setGAProtMin,
        placeholder: uiText("auto: aprox. ", "auto: about ", "auto: aprox. ") + autoMinProtein + "g"
      }
    ];

    const automaticMaxControls = React.createElement("div", {
      style: {
        background: "var(--surface3)",
        border: "1px solid var(--border3)",
        borderRadius: 8,
        padding: 10,
        marginBottom: 10
      }
    },
      React.createElement("div", {
        style: {fontSize: 12, color: "var(--muted)", marginBottom: 8, lineHeight: 1.45}
      }, uiText(
        "Limites automáticos para uma refeição agora, calculados pelo que falta no dia e pelas horas até meia-noite. Você pode substituí-los.",
        "Automatic limits for one meal now, based on what remains today and the hours until midnight. You can override them.",
        "Límites automáticos para una comida ahora, calculados según lo que falta hoy y las horas hasta medianoche. Puedes modificarlos."
      )),
      React.createElement("div", {
        style: {display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 8}
      }, [
        {
          key: "kcalMax",
          label: uiText("Calorias máximas da refeição", "Maximum meal calories", "Calorías máximas de la comida"),
          unit: "kcal",
          value: gaKcalMax,
          set: setGAKcalMax,
          placeholder: autoMaxKcal
        },
        {
          key: "protMax",
          label: uiText("Proteína máxima da refeição", "Maximum meal protein", "Proteína máxima de la comida"),
          unit: "g",
          value: gaProtMax,
          set: setGAProtMax,
          placeholder: autoMaxProtein
        }
      ].map(item => React.createElement("label", {key: item.key, style: {display: "block", minWidth: 0}},
        React.createElement("span", {style: compactLabel}, item.label),
        React.createElement("div", {style: {display: "flex", alignItems: "center", gap: 6}},
          React.createElement("input", {
            type: "number",
            min: 0,
            value: item.value,
            placeholder: uiText("automático: ", "automatic: ", "automático: ") + item.placeholder,
            onChange: event => item.set(event.target.value),
            style: {...inp, marginTop: 0, minWidth: 0, flex: 1}
          }),
          React.createElement("span", {style: {color: "var(--muted)", fontSize: 11, width: 28}}, item.unit)
        )
      ))),
      React.createElement("div", {style: {fontSize: 11, color: "var(--dim)", marginTop: 7}},
        uiText("Referência temporal: ", "Time reference: ", "Referencia temporal: "),
        Math.round(automaticLimits.hoursLeft * 10) / 10,
        uiText("h restantes · ", "h left · ", "h restantes · "),
        Math.round(automaticLimits.timeShare * 100),
        uiText("% do restante do dia nesta refeição.", "% of today's remainder in this meal.", "% de lo que queda del día en esta comida.")
      )
    );

    const q = gaFoodSearch.trim().toLowerCase();
    const filteredFoods = pantry
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", sortLocaleForLang(lang), { sensitivity: "base" }))
      .filter(food => !q || (food.name || "").toLowerCase().includes(q));

    const foodPicker = !gaUseAll && React.createElement("div", {
      style: {
        background: "var(--surface3)",
        border: "1px solid var(--border3)",
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        maxHeight: 190,
        overflowY: "auto"
      }
    },
      React.createElement("input", {
        type: "search",
        value: gaFoodSearch,
        onChange: e => setGAFoodSearch(e.target.value),
        placeholder: uiText("Pesquisar alimento pelo nome", "Search food by name", "Buscar alimento por nombre"),
        style: { ...inp, marginTop: 0, marginBottom: 8 }
      }),
      React.createElement("div", {
        style: { color: "var(--muted)", fontSize: 12, marginBottom: 8 }
      }, uiText("Selecione os alimentos a incluir:", "Select foods to include:", "Selecciona los alimentos que se incluirán:")),
      filteredFoods.length
        ? filteredFoods.map(food => React.createElement("label", {
          key: food.id,
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 0",
            color: "var(--text2)",
            fontSize: 13,
            cursor: "pointer"
          }
        },
          React.createElement("input", {
            type: "checkbox",
            checked: !!gaSelIds[food.id],
            onChange: e => setGASelIds(prev => ({ ...prev, [food.id]: e.target.checked }))
          }),
          React.createElement("span", null, food.name),
          React.createElement("span", {
            style: { color: "var(--muted)", fontSize: 12 }
          }, "(", food.kcal100 || 0, "kcal, ", food.protein100 || 0, "g prot)")
        ))
        : React.createElement("div", {
          style: { color: "var(--muted)", fontSize: 12 }
        }, uiText("Nenhum alimento encontrado.", "No foods found.", "No se encontraron alimentos."))
    );

    const advancedPanel = gaAdvancedOpen && React.createElement("div", {
      style: {
        background: "var(--surface3)",
        border: "1px solid var(--border3)",
        borderRadius: 8,
        padding: 10,
        marginBottom: 12
      }
    },
      React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: isMobileView ? "1fr" : "140px 1fr",
          gap: 10,
          alignItems: "center",
          marginBottom: 12
        }
      },
        React.createElement("label", { style: compactLabel }, uiText("Máx. unidades por alimento", "Global max units per food", "Máx. unidades por alimento")),
        React.createElement("input", {
          type: "number",
          min: 1,
          max: 20,
          value: gaGlobalMax,
          onChange: e => setGAGlobalMax(parseInt(e.target.value) || 5),
          style: { ...inp, marginTop: 0 }
        })
      ),
      React.createElement("div", { style: { marginBottom: 14 } },
        React.createElement("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 8,
            marginBottom: 4
          }
        },
          React.createElement("label", { style: compactLabel }, uiText("Ajuste fino do tamanho", "Fine-tune meal size", "Ajuste fino del tamaño")),
          React.createElement("span", {
            style: {
              color: gaTolerance > 0 ? "#c8b47e" : gaTolerance < 0 ? "#7ec8c8" : "var(--text2)",
              fontSize: 12,
              fontWeight: 700
            }
          }, (gaTolerance > 0 ? "+" : "") + gaTolerance + "% · " + autoMaxKcal + " kcal")
        ),
        React.createElement("input", {
          type: "range",
          min: -40,
          max: 40,
          value: gaTolerance,
          onChange: e => setGATolerance(parseInt(e.target.value)),
          style: { width: "100%" }
        }),
        React.createElement("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            color: "var(--muted)",
            fontSize: 12
          }
        },
          React.createElement("span", null, uiText("- déficit", "- deficit", "- déficit")),
          React.createElement("span", null, "0%"),
          React.createElement("span", null, uiText("+ superávit", "+ surplus", "+ superávit"))
        )
      ),
      React.createElement("label", {
        style: {
          color: "var(--text2)",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          marginBottom: 10
        }
      },
        React.createElement("input", {
          type: "checkbox",
          checked: gaUseProtTol,
          onChange: e => setGAUseProtTol(e.target.checked)
        }),
        uiText("Definir flexibilidade de proteína", "Set protein flexibility", "Definir flexibilidad de proteína")
      ),
      gaUseProtTol && React.createElement("div", { style: { marginBottom: 12 } },
        React.createElement("label", { style: compactLabel }, uiText("Flexibilidade de proteína: ", "Protein flexibility: ", "Flexibilidad de proteína: ") + gaProtTolerance + "%"),
        React.createElement("input", {
          type: "range",
          min: 5,
          max: 50,
          value: gaProtTolerance,
          onChange: e => setGAProtTolerance(parseInt(e.target.value)),
          style: { width: "100%" }
        })
      ),
      React.createElement("div", {
        style: {
          borderTop: "1px solid var(--border2)",
          paddingTop: 10
        }
      },
        React.createElement("div", {
          style: {
            fontSize: 12,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 8
          }
        }, uiText("Limites mínimos (opcional)", "Minimum limits (optional)", "Límites mínimos (opcional)")),
        React.createElement("div", {
          style: {
            display: "grid",
            gridTemplateColumns: isMobileView ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 8
          }
        }, limitFields.map(item => React.createElement("label", {
          key: item.key,
          style: { display: "block", minWidth: 0 }
        },
          React.createElement("span", { style: compactLabel }, item.label),
          React.createElement("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 6
            }
          },
            React.createElement("input", {
              type: "number",
              min: 0,
              value: item.value,
              placeholder: item.placeholder,
              onChange: e => item.set(e.target.value),
              style: { ...inp, marginTop: 0, minWidth: 0, flex: 1 }
            }),
            React.createElement("span", {
              style: { color: "var(--muted)", fontSize: 11, width: 28 }
            }, item.unit)
          )
        )))
      )
    );

    return React.createElement(React.Fragment, null,
      automaticMaxControls,
      foodPicker,
      React.createElement("button", {
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
    }, (gaAdvancedOpen ? "▼ " : "▶ ") + uiText("Ajustes avançados opcionais", "Advanced optional adjustments", "Ajustes avanzados opcionales")),
      advancedPanel
    );
  }

  /**
   * Renders one genetic-algorithm meal suggestion with decision metrics.
   * Input: a GA result containing macro totals and food/gene pairs.
   * Output: a React card showing ranking, item macros, and how the meal changes today's goals.
   */
  function renderGAResultCard(result, index) {
    const currentEntries = Object.values(activeLog).flat();
    const scoreEntries = result.items.map(({food, gene}) => ({
      protein: food.protein100 == null ? null : Number(food.protein100) * gene,
      kcal: food.kcal100 == null ? null : Number(food.kcal100) * gene,
      fiber: food.fiber100 == null ? null : Number(food.fiber100) * gene,
      satfat: food.satfat100 == null ? null : Number(food.satfat100) * gene,
      salt: food.salt100 == null ? null : Number(food.salt100) * gene
    }));
    const mealQuality = evaluateMealItems(scoreEntries);
    const eatenProtein = currentEntries.reduce((sum, entry) => sum + (Number(entry.protein) || 0), 0);
    const eatenKcal = currentEntries.reduce((sum, entry) => sum + (Number(entry.kcal) || 0), 0);
    const proteinGoal = Number(goals.protein) || 0;
    const kcalGoal = Number(goals.kcal) || 0;
    const afterProtein = eatenProtein + (Number(result.protein) || 0);
    const afterKcal = eatenKcal + (Number(result.kcal) || 0);
    const proteinRemaining = Math.max(0, proteinGoal - eatenProtein);
    const kcalRemaining = Math.max(0, kcalGoal - eatenKcal);
    const proteinOver = Math.max(0, afterProtein - proteinGoal);
    const kcalOver = Math.max(0, afterKcal - kcalGoal);
    const proteinPercent = proteinGoal ? Math.round(afterProtein / proteinGoal * 100) : 0;
    const kcalPercent = kcalGoal ? Math.round(afterKcal / kcalGoal * 100) : 0;
    const optionLabel = index === 0
      ? uiText("Melhor opção", "Best option", "Mejor opción")
      : uiText("Uma das melhores", "Strong option", "Una de las mejores");
    const fitLabel = Number.isFinite(result.fit)
      ? uiText("ajuste ", "fit ", "ajuste ") + Math.round(result.fit * 100) / 100
      : "";
    const metricChip = (label, value, color) => React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 7px",
        borderRadius: 999,
        background: "var(--surface)",
        border: "1px solid var(--border2)",
        color,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap"
      }
    }, label, " ", value);

    return React.createElement("div", {
      key: index,
      style: {
        background: "var(--surface3)",
        border: "1px solid var(--border3)",
        borderRadius: 10,
        padding: isMobileView ? 10 : 12
      }
    },
      React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 8
        }
      },
        React.createElement("div", null,
          React.createElement("div", {
            style: {
              color: "var(--text2)",
              fontWeight: 800,
              fontSize: 15
            }
          }, uiText("Opção ", "Option ", "Opción ") + (index + 1)),
          React.createElement("div", {
            style: {
              marginTop: 3,
              color: index === 0 ? "var(--btn-ok-text)" : "var(--muted)",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.8
            }
          }, optionLabel, fitLabel ? " · " + fitLabel : "")
        ),
        React.createElement("div", {
          style: {
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            gap: 6
          }
        },
          metricChip("kcal", Math.round(result.kcal || 0), "#8ec8c8"),
          metricChip("prot", Math.round(result.protein || 0) + "g", "#c8a24f")
        )
      ),
      React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: isMobileView ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: 8,
          marginBottom: 10
        }
      },
        React.createElement("div", {
          style: {
            background: "var(--surface)",
            border: "1px solid var(--border2)",
            borderRadius: 8,
            padding: 8,
            color: "var(--text3)",
            fontSize: 12,
            lineHeight: 1.45
          }
        },
          React.createElement("b", {
            style: { color: "var(--text2)" }
          }, uiText("Impacto no dia", "Impact today", "Impacto en el día")),
          React.createElement("div", null, uiText("Proteína depois: ", "Protein after: ", "Proteína después: "), Math.round(afterProtein), " / ", Math.round(proteinGoal), "g (", proteinPercent, "%)", proteinOver ? " +" + Math.round(proteinOver) + "g" : ""),
          React.createElement("div", null, uiText("Calorias depois: ", "Calories after: ", "Calorías después: "), Math.round(afterKcal), " / ", Math.round(kcalGoal), "kcal (", kcalPercent, "%)", kcalOver ? " +" + Math.round(kcalOver) + "kcal" : "")
        ),
        React.createElement("div", {
          style: {
            background: "var(--surface)",
            border: "1px solid var(--border2)",
            borderRadius: 8,
            padding: 8,
            color: "var(--text3)",
            fontSize: 12,
            lineHeight: 1.45
          }
        },
          React.createElement("b", {
            style: { color: "var(--text2)" }
          }, uiText("Parcela do que faltava no dia", "Share of what was left today", "Parte de lo que faltaba hoy")),
          React.createElement("div", null, uiText("Usa ", "Uses ", "Usa "), proteinRemaining ? Math.round((result.protein || 0) / proteinRemaining * 100) : 100, uiText("% da proteína restante", "% of remaining protein", "% de la proteína restante")),
          React.createElement("div", null, uiText("Usa ", "Uses ", "Usa "), kcalRemaining ? Math.round((result.kcal || 0) / kcalRemaining * 100) : 100, uiText("% das calorias restantes", "% of remaining calories", "% de las calorías restantes"))
        )
      ),
      mealQuality && mealQuality.valid && React.createElement("div", {
        style: {
          background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 8,
          padding: 9, marginBottom: 10, fontSize: 12, color: "var(--text3)", lineHeight: 1.45
        }
      },
        React.createElement("div", {style: {display: "flex", justifyContent: "flex-start", flexWrap: "wrap", gap: 8, alignItems: "baseline", marginBottom: 4}},
          React.createElement("b", {style: {color: "var(--text2)"}}, uiText("Nota da refeição", "Meal score", "Nota de la comida")),
          React.createElement("span", {style: {fontSize: 17, fontWeight: 800, color: mealQuality.score >= 4 ? "var(--btn-ok-text)" : mealQuality.score >= 3 ? "#c8a96e" : "#c86e8e"}}, mealQuality.score.toFixed(2), "/5")
        ),
        React.createElement("div", null, mealScoreBrief(mealQuality)),
        React.createElement("div", {style: {color: "var(--dim)", marginTop: 3}}, mealScoreEvaluationText(mealQuality))
      ),
      React.createElement("div", {
        style: {
          display: "grid",
          gap: 5,
          marginBottom: 10
        }
      }, result.items.map((item, itemIndex) => {
        const qty = item.food.unit === "un" ? item.gene : item.gene * 100;
        const itemProtein = (Number(item.food.protein100) || 0) * item.gene;
        const itemKcal = (Number(item.food.kcal100) || 0) * item.gene;
        return React.createElement("div", {
          key: itemIndex,
          style: {
            display: "flex",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: "3px 10px",
            color: "var(--text3)",
            fontSize: 13,
            padding: "3px 0",
            borderBottom: itemIndex === result.items.length - 1 ? "none" : "1px solid var(--border3)"
          }
        },
          React.createElement("span", null, "• ", item.food.name, ": ", qty, item.food.unit === "un" ? " un" : "g"),
          React.createElement("span", {
            style: {
              color: "var(--muted)",
              whiteSpace: "nowrap"
            }
          }, Math.round(itemKcal), " kcal · ", Math.round(itemProtein), "g")
        );
      })),
      React.createElement("button", {
        onClick: () => addGAResultToDiary(result),
        style: {
          ...sBtn("var(--btn-ok)", "var(--btn-ok-border)", "var(--btn-ok-text)"),
          marginTop: 4
        }
      }, uiText("Adicionar ao diário", "Add to diary", "Añadir al diario"))
    );
  }

  function renderMealReviewModal() {
    if (!mealReview) return null;
    const result = mealReview.result;
    const availableComponents = Object.values(result.components).filter(component => component.available);
    const scoreColor = result.score >= 4 ? "var(--btn-ok-text)" : result.score >= 3 ? "#c8a96e" : "#c86e8e";
    const closeMealReview = () => {
      setMealReview(null);
      setMealReviewHelpOpen(false);
    };
    return React.createElement("div", {
      "data-meal-review-modal": "true",
      "data-theme": darkMode ? "dark" : "light",
      onClick: closeMealReview,
      style: {
        position: "fixed", inset: 0, zIndex: 10020, background: "rgba(0,0,0,0.72)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16
      }
    }, React.createElement("div", {
      "data-meal-review-panel": "true",
      onClick: event => event.stopPropagation(),
      style: {
        width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto",
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
        padding: isMobileView ? 14 : 20, boxShadow: "0 18px 60px rgba(0,0,0,0.4)"
      }
    },
      React.createElement("div", {style: {display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14}},
        React.createElement("div", null,
          React.createElement("div", {style: {fontSize: 14, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted)"}}, uiText("Avaliação da refeição", "Meal assessment", "Evaluación de la comida")),
          React.createElement("div", {style: {fontSize: 12, color: "var(--dim)", marginTop: 4}}, mealLabel(mealReview.meal), " · ", Math.round(result.hoursLeft * 10) / 10, "h ", uiText("até meia-noite", "until midnight", "hasta medianoche"))
        ),
        React.createElement("button", {onClick: closeMealReview, style: {background: "none", border: "none", color: "var(--muted)", fontSize: 22, cursor: "pointer"}}, "×")
      ),
      React.createElement("div", {style: {display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "160px 1fr", gap: 12, marginBottom: 14}},
        React.createElement("div", {style: {background: "var(--bg)", border: "1px solid var(--border3)", borderRadius: 10, padding: 14, textAlign: "center"}},
          React.createElement("div", {style: {fontSize: 34, fontWeight: 800, color: scoreColor}}, result.score.toFixed(2)),
          React.createElement("div", {style: {fontSize: 12, color: "var(--muted)", marginTop: 3}}, uiText("de 5,00", "out of 5.00", "de 5,00")),
          React.createElement("div", {style: {fontSize: 11, color: "var(--dim)", marginTop: 8}}, mealScoreEvaluationText(result))
        ),
        React.createElement("div", {style: {background: "var(--bg)", border: "1px solid var(--border3)", borderRadius: 10, padding: 12, color: "var(--text3)", fontSize: 13, lineHeight: 1.5}}, mealScoreBrief(result), result.missing.length ? React.createElement("div", {style: {color: "var(--dim)", marginTop: 7}}, uiText("Não avaliados: ", "Not evaluated: ", "No evaluados: "), result.missing.map(mealScoreLabel).join(", "), ".") : null)
      ),
      React.createElement("button", {
        type: "button",
        onClick: () => setMealReviewHelpOpen(open => !open),
        style: {
          background: "var(--btn-info)", border: "1px solid var(--btn-info-border)", color: "var(--btn-info-text)",
          borderRadius: 999, padding: "7px 11px", margin: "0 0 8px", cursor: "pointer",
          fontFamily: "inherit", fontSize: 12, fontWeight: 700
        }
      }, "ⓘ ", uiText("O que estou vendo?", "What am I seeing?", "¿Qué estoy viendo?")),
      React.createElement("div", {
        style: {fontSize: 12, color: "var(--dim)", lineHeight: 1.45, marginBottom: 12}
      }, uiText(
        "“Referência para agora” é a quantidade sugerida para uma refeição neste momento, calculada pelo que ainda falta nas metas e pelo tempo até meia-noite.",
        "“Reference for now” is the suggested amount for one meal at this moment, calculated from what remains in your targets and the time until midnight.",
        "“Referencia para ahora” es la cantidad sugerida para una comida en este momento, calculada según lo que falta en tus metas y el tiempo hasta medianoche."
      )),
      mealReviewHelpOpen && React.createElement("div", {
        style: {
          background: "var(--ai-bg)", border: "1px solid var(--ai-border)", borderRadius: 8,
          padding: 10, marginBottom: 12, color: "var(--text3)", fontSize: 12, lineHeight: 1.5
        }
      },
        React.createElement("div", null, React.createElement("b", null, uiText("Nota: ", "Score: ", "Nota: ")), uiText("mede de 0 a 5 o alinhamento desta refeição com o restante das metas de hoje.", "measures from 0 to 5 how well this meal fits the rest of today's targets.", "mide de 0 a 5 cuánto encaja esta comida con el resto de las metas de hoy.")),
        React.createElement("div", {style: {marginTop: 5}}, React.createElement("b", null, uiText("Nutrientes avaliados: ", "Nutrients evaluated: ", "Nutrientes evaluados: ")), uiText("indica quantos nutrientes tinham dados suficientes. Um nutriente opcional ausente é excluído da conta, nunca tratado como zero.", "shows how many nutrients had enough data. A missing optional nutrient is excluded, never treated as zero.", "indica cuántos nutrientes tenían datos suficientes. Un nutriente opcional ausente se excluye, nunca se trata como cero.")),
        React.createElement("div", {style: {marginTop: 5}}, React.createElement("b", null, uiText("Referência para agora: ", "Reference for now: ", "Referencia para ahora: ")), uiText("é a parcela do que ainda falta no dia ajustada pelas horas até meia-noite; não é um limite diário nem uma cota fixa por refeição.", "is the share of what remains today adjusted by the hours until midnight; it is neither a daily limit nor a fixed per-meal quota.", "es la parte de lo que falta hoy ajustada por las horas hasta medianoche; no es un límite diario ni una cuota fija por comida."))
      ),
      React.createElement("div", {style: {display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 14}}, availableComponents.map(component => React.createElement("div", {key: component.key, style: {background: "var(--surface3)", border: "1px solid var(--border3)", borderRadius: 8, padding: "9px 10px"}},
        React.createElement("div", {style: {fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.8}}, mealScoreLabel(component.key)),
        React.createElement("div", {style: {fontSize: 18, color: component.score >= 0.85 ? "var(--btn-ok-text)" : component.score >= 0.6 ? "#c8a96e" : "#c86e8e", fontWeight: 750, marginTop: 3}}, (component.score * 5).toFixed(2)),
        React.createElement("div", {style: {fontSize: 11, color: "var(--dim)", marginTop: 4}},
          Math.round(component.mealAmount * 10) / 10, component.key === "kcal" ? " kcal" : "g",
          " · ", uiText("referência para agora ", "reference for now ", "referencia para ahora "), Math.round(component.quota * 10) / 10, component.key === "kcal" ? " kcal" : "g",
          component.candidateComplete === false ? " · " + uiText("dados de ", "data from ", "datos de ") + component.candidateKnownCount + "/" + component.candidateItemCount + uiText(" itens", " items", " ítems") : ""
        )
      ))),
      React.createElement("div", {style: {background: "var(--ai-bg)", border: "1px solid var(--ai-border)", borderRadius: 10, padding: 12, marginBottom: 14}},
        React.createElement("div", {style: {fontSize: 12, color: "var(--ai-text)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6}}, "✦ ", uiText("Explicação", "Explanation", "Explicación")),
        React.createElement("div", {style: {fontSize: 13, color: "var(--text3)", lineHeight: 1.55, whiteSpace: "pre-wrap"}}, mealReviewAiLoading ? uiText("Analisando...", "Analyzing...", "Analizando...") : mealReviewAiText || uiText("A nota foi calculada localmente. Configure a chave de IA para receber uma explicação personalizada.", "The score was calculated locally. Configure the AI key for a personalized explanation.", "La nota fue calculada localmente. Configura la clave de IA para recibir una explicación personalizada."))
      ),
      React.createElement("div", {style: {display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr 1.3fr", gap: 8}},
        React.createElement("button", {onClick: closeMealReview, style: sBtn("transparent", "var(--border2)", "var(--text2)")}, uiText("Editar", "Edit", "Editar")),
        React.createElement("button", {onClick: () => openMealReview(mealReview.meal, mealReview.items, mealReview.source), style: sBtn("var(--btn-info)", "var(--btn-info-border)", "var(--btn-info-text)")}, uiText("Reavaliar", "Re-evaluate", "Reevaluar")),
        React.createElement("button", {onClick: confirmMealReview, style: sBtn("var(--btn-ok)", "var(--btn-ok-border)", "var(--btn-ok-text)")}, uiText("Registrar mesmo assim", "Log anyway", "Registrar igualmente"))
      )
    ));
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
  }, /*#__PURE__*/React.createElement("div", {
    "data-app-header": "true",
    style: {
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      padding: isMobileView ? "10px 14px 8px" : "12px 20px 10px",
      position: "sticky",
      top: 0,
      zIndex: 80,
      boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
      transition: "padding 240ms ease, box-shadow 240ms ease, background-color 240ms ease",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      order: 0
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 2
    }
  }, text('appTitle')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      color: "var(--text3)",
      fontStyle: "italic"
    }
  }, dateStr)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: loadAll,
    style: {
      display: "flex",
      alignItems: "center",
      background: "none",
      border: "1px solid var(--border2)",
      color: syncing ? "var(--btn-ok-text)" : "var(--muted)",
      borderRadius: 6,
      padding: "6px 9px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      animation: syncing ? "spin 1s linear infinite" : "none"
    }
  }, "\u21BB")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMenuOpen(m => !m),
    style: {
      background: menuOpen ? "var(--input)" : "none",
      border: "1px solid var(--border2)",
      color: "var(--muted)",
      borderRadius: 6,
      padding: "6px 10px",
      fontSize: 14,
      cursor: "pointer",
      lineHeight: 1
    }
  , "data-tutorial": "menu-settings"}, "\u2699"), menuOpen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    onClick: () => {
      setMenuOpen(false);
      setHeaderLanguageMenuOpen(false);
    },
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 99
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "calc(100% + 8px)",
      right: 0,
      zIndex: 100,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "6px",
      minWidth: 200,
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 6px",
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setHeaderLanguageMenuOpen(open => !open),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: "100%",
      background: "none",
      border: "none",
      color: "var(--text2)",
      padding: "10px 12px",
      borderRadius: 6,
      fontSize: 14,
      cursor: "pointer",
      textAlign: "left",
      fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      width: 22,
      textAlign: "center"
    }
  }, getLanguageOption(lang).flag), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, uiText("Idioma", "Language", "Idioma")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      transform: headerLanguageMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 160ms ease"
    }
  }, "\u25BE")), /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: "hidden",
      maxHeight: headerLanguageMenuOpen ? 180 : 0,
      opacity: headerLanguageMenuOpen ? 1 : 0,
      transform: headerLanguageMenuOpen ? "translateY(0)" : "translateY(-4px)",
      transition: "max-height 180ms ease, opacity 160ms ease, transform 160ms ease",
      border: headerLanguageMenuOpen ? "1px solid var(--border2)" : "1px solid transparent",
      borderRadius: 8,
      background: "var(--bg)",
      marginTop: 4
    }
  }, LANGUAGE_OPTIONS.map(option => {
    const isCurrentLanguage = option.code === normalizeLanguage(lang);
    return /*#__PURE__*/React.createElement("button", {
      key: option.code,
      onClick: () => {
        toggleLang(option.code);
        setHeaderLanguageMenuOpen(false);
      },
      style: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        background: isCurrentLanguage ? "var(--btn-ok)" : "transparent",
        border: "none",
        borderTop: "1px solid var(--border2)",
        color: isCurrentLanguage ? "var(--btn-ok-text)" : "var(--text2)",
        padding: "10px 12px",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 13,
        textAlign: "left"
      }
    }, /*#__PURE__*/React.createElement("span", null, option.flag + " " + option.label), isCurrentLanguage ? /*#__PURE__*/React.createElement("span", null, "\u2713") : null);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: "1px",
      background: "var(--border3)",
      margin: "2px 6px"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
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
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: "100%",
      background: "none",
      border: "none",
      color: "var(--text2)",
      padding: "10px 12px",
      borderRadius: 6,
      fontSize: 14,
      cursor: "pointer",
      textAlign: "left",
      fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16
    }
  }, darkMode ? "" : ""), /*#__PURE__*/React.createElement("span", null, darkMode
    ? uiText("Modo claro", "Light mode", "Modo claro")
    : uiText("Modo escuro", "Dark mode", "Modo oscuro"))), onOpenSettings && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: { height: "1px", background: "var(--border3)", margin: "2px 6px" }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => { onOpenSettings(); setMenuOpen(false); },
    style: {
      display: "flex", alignItems: "center", gap: 10,
      width: "100%", background: "none", border: "none",
      color: "var(--text2)", padding: "10px 12px",
      borderRadius: 6, fontSize: 14, cursor: "pointer",
      textAlign: "left", fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", { style: { fontSize: 16 } }, "\uD83D\uDD11"),
    /*#__PURE__*/React.createElement("span", null, uiText("IA / Chave de API", "AI / API key", "IA / Clave de API"))
  ), /*#__PURE__*/React.createElement("div", {
    style: { height: "1px", background: "var(--border3)", margin: "2px 6px" }
  }), onOpenBackup && /*#__PURE__*/React.createElement("button", {
    onClick: () => { onOpenBackup(); setMenuOpen(false); },
    style: {
      display: "flex", alignItems: "center", gap: 10,
      width: "100%", background: "none", border: "none",
      color: "var(--text2)", padding: "10px 12px",
      borderRadius: 6, fontSize: 14, cursor: "pointer",
      textAlign: "left", fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", { style: { fontSize: 16 } }, "\uD83D\uDCBE"),
    /*#__PURE__*/React.createElement("span", null, uiText("Backup e restaurar", "Backup & restore", "Copia y restauración"))
  ), /*#__PURE__*/React.createElement("div", {
    style: { height: "1px", background: "var(--border3)", margin: "2px 6px" }
  }), onOpenPrivacy && /*#__PURE__*/React.createElement("button", {
    onClick: () => { onOpenPrivacy(); setMenuOpen(false); },
    style: {
      display: "flex", alignItems: "center", gap: 10,
      width: "100%", background: "none", border: "none",
      color: "var(--text2)", padding: "10px 12px",
      borderRadius: 6, fontSize: 14, cursor: "pointer",
      textAlign: "left", fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", { style: { fontSize: 16 } }, "\uD83D\uDD12"),
    /*#__PURE__*/React.createElement("span", null, uiText("Privacidade e segurança", "Privacy & security", "Privacidad y seguridad"))
  ), /*#__PURE__*/React.createElement("div", {
    style: { height: "1px", background: "var(--border3)", margin: "2px 6px" }
  }), onStartTutorial && /*#__PURE__*/React.createElement("button", {
    onClick: () => { onStartTutorial(); setMenuOpen(false); },
    style: {
      display: "flex", alignItems: "center", gap: 10,
      width: "100%", background: "none", border: "none",
      color: "var(--text2)", padding: "10px 12px",
      borderRadius: 6, fontSize: 14, cursor: "pointer",
      textAlign: "left", fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", { style: { fontSize: 16 } }, "\uD83C\uDF93"),
    /*#__PURE__*/React.createElement("span", null, uiText("Ajuda rápida", "Quick help", "Ayuda rápida"))
  ), /*#__PURE__*/React.createElement("div", {
    style: { height: "1px", background: "var(--border3)", margin: "2px 6px" }
  }), /*#__PURE__*/React.createElement("button", {
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
    },
    style: {
      display: "flex", alignItems: "center", gap: 10,
      width: "100%", background: "none", border: "none",
      color: "var(--text2)", padding: "10px 12px",
      borderRadius: 6, fontSize: 14, cursor: "pointer",
      textAlign: "left", fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", { style: { fontSize: 16 } }, "\uD83D\uDCAC"),
    /*#__PURE__*/React.createElement("span", null, uiText("Enviar feedback", "Send feedback", "Enviar comentarios"))
  ), /*#__PURE__*/React.createElement("div", {
    style: { height: "1px", background: "var(--border3)", margin: "2px 6px" }
  }), onLogout && /*#__PURE__*/React.createElement("button", {
    onClick: () => { onLogout(); setMenuOpen(false); },
    style: {
      display: "flex", alignItems: "center", gap: 10,
      width: "100%", background: "none", border: "none",
      color: "#c87e7e", padding: "10px 12px",
      borderRadius: 6, fontSize: 14, cursor: "pointer",
      textAlign: "left", fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", { style: { fontSize: 16 } }, "\u23FB"),
    /*#__PURE__*/React.createElement("span", null, uiText("Sair da conta", "Sign out", "Cerrar sesión"))
  )))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginTop: 10,
      order: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--muted)"
    }
  }, text('dayOf')),
  /*#__PURE__*/React.createElement("button", {
    "data-tutorial": "day-type",
    onClick: toggleDayType,
    style: {
      display: "flex", alignItems: "center", gap: 6,
      background: "none", border: "none", cursor: "pointer",
      padding: 0, fontFamily: "inherit"
    }
  },
    /* Track ? One UI style */
    /*#__PURE__*/React.createElement("div", {
      style: {
        width: 52, height: 28, borderRadius: 14,
        background: isTraining ? "var(--toggle-train-border)" : "var(--toggle-rest-border)",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)"
      }
    },
      /* Thumb ? One UI: grande, quase enche o track */
      /*#__PURE__*/React.createElement("div", {
        style: {
          position: "absolute", top: 3,
          left: isTraining ? 27 : 3,
          width: 22, height: 22, borderRadius: 11,
          background: "#ffffff",
          transition: "left 0.2s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "none"
        }
      })
    ),
    /* Label */
    /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14, fontWeight: 600, letterSpacing: 1,
        color: isTraining ? "var(--toggle-train-text)" : "var(--toggle-rest-text)"
      }
    }, isTraining ? text('trainDay') : text('restDay'))
  ), currentWeight && /*#__PURE__*/React.createElement("button", {
    onClick: () => openTab("metricas"),
    title: uiText("Abrir métricas", "Open metrics", "Abrir métricas"),
    style: {
      background: "none",
      border: "none",
      fontSize: 14,
      color: "var(--muted)",
      marginLeft: "auto",
      cursor: "pointer",
      fontFamily: "inherit",
      padding: 0
    }
  }, currentWeight, "kg", bmi ? ` · ${text('bmi')} ${bmi}` : ""))), tab === "diario" && /*#__PURE__*/React.createElement("div", {
    "data-app-nav": "true",
    style: {
      display: "flex",
      gap: isMobileView ? 8 : 0,
      borderTop: "1px solid var(--border3)",
      borderBottom: "1px solid var(--border)",
      marginTop: 10,
      marginLeft: isMobileView ? -14 : -20,
      marginRight: isMobileView ? -14 : -20,
      overflowX: isMobileView ? "auto" : "visible",
      overflowY: "hidden",
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: isMobileView ? "none" : "auto",
      padding: isMobileView ? "0 12px" : 0,
      background: "var(--surface)",
      animation: "softIn 220ms ease-out both"
    }
  }, tabNavItems.map(([t, label]) => /*#__PURE__*/React.createElement("button", {
    "data-tutorial": "tab-" + t,
    key: t,
    onClick: () => openTab(t),
    style: {
      flex: isMobileView ? "0 0 auto" : 1,
      minWidth: isMobileView ? 96 : 0,
      padding: isMobileView ? "10px 14px" : "10px 0",
      background: tab === t ? "var(--tab-active)" : "transparent",
      border: "none",
      borderBottom: tab === t ? "2px solid #c8a96e" : "2px solid transparent",
      color: tab === t ? "#c8a96e" : "#444",
      fontSize: 14,
      fontWeight: 400,
      letterSpacing: 1,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      cursor: "pointer"
    }
  }, label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: tab === "diario" ? "none" : "flex",
      gap: isMobileView ? 10 : 18,
      alignItems: "center",
      marginTop: 10,
      padding: isMobileView ? "0 4px" : "0 8px",
      boxSizing: "border-box",
      animation: "softIn 240ms ease-out both",
      order: 3
    }
  }, miniProgressItems.map(renderMiniProgress)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: isMobileView ? "10px 20px 12px" : "10px 28px 14px",
      background: "var(--surface)",
      display: tab === "diario" ? "block" : "none",
      order: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: isMobileView ? 18 : 20,
      lineHeight: 1.2,
      color: "var(--text)",
      fontWeight: 700,
      letterSpacing: 0,
      overflowWrap: "anywhere"
    }
  }, greetingText), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      fontSize: 13,
      color: "var(--muted)",
      lineHeight: 1.35
    }
  }, greetingLine)), /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    "data-diary-metrics": "true",
    style: {
      display: tab === "diario" ? "flex" : "none",
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      order: 5
    }
  }, [{
    label: text('protein'),
    val: tot.protein,
    goal: goals.protein,
    color: proteinColor,
    unit: "g"
  }, {
    label: text('calories'),
    val: tot.kcal,
    goal: goals.kcal,
    color: caloriesColor,
    unit: text('kcalUnit')
  }].map(({
    label,
    val,
    goal,
    color,
    unit
  }) => /*#__PURE__*/React.createElement("div", {
    key: label,
    "data-metric-category": label === text('protein') ? "protein" : "kcal",
    className: "focus-block--no-transparency",
    style: {
      flex: 1,
      padding: "14px 8px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 5,
      borderRight: "1px solid var(--border)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    "data-metric-ring": "true",
    style: {
      position: "relative",
      width: 76,
      height: 76
    }
  }, /*#__PURE__*/React.createElement(Ring, {
    value: val,
    max: goal,
    color: color
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: val > goal ? "#ff4d4d" : color
    }
  }, Math.round(val)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--dim)"
    }
  }, unit))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      letterSpacing: 1,
      textTransform: "uppercase"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--faint)"
    }
  }, uiText('meta ', 'goal ', 'meta '), goal, unit), label === text('protein') && remainProtein > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 13,
      color: proteinColor
    }
  }, uiText("Faltam ", "Missing ", "Faltan "), /*#__PURE__*/React.createElement("b", null, remainProtein, "g"), uiText(" proteína", " protein", " de proteína")), label === text('calories') && remainKcal > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 13,
      color: caloriesColor
    }
  }, uiText("Faltam ", "Missing ", "Faltan "), /*#__PURE__*/React.createElement("b", null, remainKcal), " kcal")), /*#__PURE__*/React.createElement("div", {
    "data-metric-progress": "true",
    style: { width: "100%", height: 7, borderRadius: 8, overflow: "hidden", background: "color-mix(in srgb, " + color + " 18%, transparent)" }
  }, /*#__PURE__*/React.createElement("div", {
    style: { width: Math.min(100, goal > 0 ? val / goal * 100 : 0) + "%", height: "100%", borderRadius: 8, background: color, transition: "width var(--dur-base) var(--ease-spring)" }
  })))), allEntries.length > 0 && /*#__PURE__*/React.createElement("div", {
    "data-day-progress-top": "true",
    style: {
      flex: "1 0 100%",
      display: "flex",
      justifyContent: "center",
      gap: 8,
      padding: "8px 12px",
      color: "var(--muted)",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", null, dayProteinPct, "% ", uiText("proteína", "protein", "proteína")), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "·"), /*#__PURE__*/React.createElement("span", null, dayKcalPct, "% kcal"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface3)",
      borderBottom: "1px solid var(--border3)",
      padding: "7px 20px",
      display: tab === "diario" ? "block" : "none",
      order: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    "data-tutorial": "suggest-meal-button",
    onClick: openMealSuggestions,
    disabled: gaRunning || suggestLoading,
    style: {
      width: "100%",
      ...aiButtonStyle,
      background: gaRunning || suggestLoading ? "var(--btn-inactive)" : aiButtonStyle.background,
      color: gaRunning || suggestLoading ? "var(--muted)" : aiButtonStyle.color,
      padding: "7px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: gaRunning || suggestLoading ? "default" : "pointer",
      fontFamily: "inherit"
    }
  }, gaRunning || suggestLoading ? text('suggesting') : text('suggestBtn')), showGA && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      background: "var(--surface)",
      border: "1px solid var(--border2)",
      borderRadius: 10,
      padding: isMobileView ? 12 : 14,
      boxShadow: "0 10px 28px rgba(0,0,0,0.08)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      fontWeight: 700
    }
  }, uiText("Sugestões de refeição", "Meal suggestions", "Sugerencias de comida")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--dim)",
      marginTop: 4
    }
  }, uiText(
    "Escolha os parâmetros e gere combinações com a despensa.",
    "Choose parameters and generate combinations from your pantry.",
    "Elige los parámetros y genera combinaciones desde tu despensa."
  ))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowGA(false),
    style: {
      background: "var(--btn-inactive)",
      border: "1px solid var(--btn-inactive-border)",
      color: "var(--muted)",
      borderRadius: 999,
      width: 32,
      height: 32,
      fontSize: 18,
      cursor: "pointer",
      flexShrink: 0
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Tamanho", "Meal size", "Tamaño")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 6,
      marginTop: 4
    }
  }, [[-20, uiText("Leve", "Light", "Ligera")], [0, uiText("Equilibrada", "Balanced", "Equilibrada")], [20, uiText("Reforçada", "Reinforced", "Reforzada")]].map(([value, label]) => /*#__PURE__*/React.createElement("button", {
    key: value,
    onClick: () => setGATolerance(value),
    style: {
      ...sBtn(Math.abs(gaTolerance - value) <= 10 ? "var(--btn-ok)" : "transparent", Math.abs(gaTolerance - value) <= 10 ? "var(--btn-ok-border)" : "var(--border2)", Math.abs(gaTolerance - value) <= 10 ? "var(--btn-ok-text)" : "var(--muted)"),
      marginTop: 0,
      padding: "7px 6px",
      fontSize: 12
    }
  }, label)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Refeição alvo", "Target meal", "Comida objetivo")), /*#__PURE__*/React.createElement("select", {
    value: gaTargetMeal || MEALS[1],
    onChange: e => setGATargetMeal(e.target.value),
    style: {
      ...inp,
      marginTop: 4
    }
  }, MEALS.map(m => /*#__PURE__*/React.createElement("option", {
    key: m,
    value: m
  }, mealLabel(m)))))), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "flex-start",
      color: "var(--text2)",
      fontSize: 13,
      lineHeight: 1.35,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: gaUseAll,
    onChange: e => setGAUseAll(e.target.checked)
  }), /*#__PURE__*/React.createElement("span", null, uiText("Usar todos os alimentos da despensa automaticamente.", "Use all pantry foods automatically.", "Usar todos los alimentos de la despensa automáticamente."))), renderMealSuggestionAdvancedControls(), /*#__PURE__*/React.createElement("button", {
    onClick: runGASafely,
    disabled: gaRunning,
    style: {
      ...btn,
      marginTop: 0,
      opacity: gaRunning ? 0.65 : 1
    }
  }, gaRunning ? uiText("Buscando... ", "Searching... ", "Buscando... ") + gaProgress + "%" : uiText("Buscar sugestões", "Find suggestions", "Buscar sugerencias")), gaRunning && /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: "var(--track)",
      borderRadius: 999,
      overflow: "hidden",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: gaProgress + "%",
      height: "100%",
      background: "var(--btn-ok-text)",
      transition: "width 240ms ease"
    }
  })), gaResults.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: "grid",
      gap: 10
    }
  }, gaResults.map(renderGAResultCard)), gaHasSearched && !gaRunning && gaResults.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: 10,
      border: "1px solid var(--border2)",
      borderRadius: 8,
      background: "var(--surface2)",
      color: "var(--muted)",
      fontSize: 13,
      lineHeight: 1.4
    }
  }, uiText(
    "Nenhuma combinação encontrou esses critérios. Tente flexibilizar os limites ou usar mais alimentos da despensa.",
    "No combination matched these criteria. Try relaxing the limits or using more pantry foods.",
    "Ninguna combinación coincidió con estos criterios. Prueba flexibilizar los límites o usar más alimentos de la despensa."
  ))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      padding: "12px 20px",
      display: tab === "diario" ? "block" : "none",
      order: 7
    }
  }, /*#__PURE__*/React.createElement("button", {
    "data-tutorial": "microLabel",
    onClick: () => setExpandMicros(e => !e),
    style: {
      width: "100%",
      background: "none",
      border: "none",
      color: "var(--muted)",
      padding: "2px 0 8px",
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      textAlign: "left",
      display: "flex",
      justifyContent: "space-between",
      fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", null, uiText("Nutrientes", "Nutrients", "Nutrientes")), /*#__PURE__*/React.createElement("span", null, expandMicros ? "\u25B2" : "\u25BC")), expandMicros && /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: "hidden",
      animation: "softIn 220ms ease-out both"
    }
  }, /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.carbs * 10) / 10,
    max: goals.carbs,
    color: "#a96ec8",
    label: text('carbs'),
    unit: "g"
  }), tot.sugars > 0 && /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.sugars * 10) / 10,
    max: 0,
    color: "#a96ec8",
    label: text('sugars'),
    unit: "g",
    sub: true
  }), /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.fat * 10) / 10,
    max: goals.fat,
    color: "#c86e8e",
    label: text('fat'),
    unit: "g"
  }), tot.satfat > 0 && /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.satfat * 10) / 10,
    max: 20,
    color: "#c86e8e",
    label: text('satfat'),
    unit: "g",
    sub: true
  }), /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.fiber * 10) / 10,
    max: goals.fiber,
    color: "#6ec8a9",
    label: text('fiber'),
    unit: "g"
  }), /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.salt * 100) / 100,
    max: goals.salt,
    color: "#888",
    label: text('salt'),
    unit: "g"
  }))), tab === "diario" && expandMicros && hasMicros && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface3)",
      borderBottom: "1px solid var(--border3)",
      order: 7,
      animation: "softIn 220ms ease-out both"
    }
  }, /*#__PURE__*/React.createElement("button", {
    "data-tutorial": "microLabel",
    onClick: () => setExpandMicros(e => !e),
    style: {
      width: "100%",
      background: "none",
      border: "none",
      color: "var(--muted)",
      padding: "8px 20px",
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      textAlign: "left",
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", null, text('microLabel')), /*#__PURE__*/React.createElement("span", null, expandMicros ? "v" : ">")), expandMicros && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px 12px"
    }
  }, MICRO_FIELDS.map(f => {
    const val = allEntries.reduce((s, e) => s + (e[f.key.replace("100", "")] ?? 0), 0);
    if (!val) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: f.key,
      style: {
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 0",
        borderBottom: "1px solid var(--border3)",
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, f.label), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--muted2)"
      }
    }, val % 1 === 0 ? val : val.toFixed(2), " ", f.unit));
  })))), goalToast && (() => {
    const isWarning = goalToast.tone === "warning";
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        top: isMobileView ? 10 : 14,
        left: "50%",
        zIndex: 10050,
        width: isMobileView ? "calc(100% - 24px)" : "min(560px, calc(100% - 32px))",
        transform: `translate(-50%, ${goalToast.visible ? "0" : "-120%"})`,
        opacity: goalToast.visible ? 1 : 0,
        transition: "transform 420ms ease, opacity 420ms ease",
        pointerEvents: "none",
        background: isWarning ? "#fff7df" : "#e7f5e8",
        border: `1px solid ${isWarning ? "#d9bd6a" : "#91cf96"}`,
        color: isWarning ? "#7a5b13" : "#1f6b2b",
        borderRadius: 8,
        boxShadow: "0 10px 26px rgba(0,0,0,0.12)",
        padding: isMobileView ? "10px 12px" : "12px 16px",
        display: "flex",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: isMobileView ? 13 : 14,
        fontWeight: 700,
        lineHeight: 1.25
      }
    }, goalToast.text), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: isMobileView ? 12 : 13,
        color: isWarning ? "#8b6a1c" : "#2f7b39",
        marginTop: 2
      }
    }, goalToast.detail)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: "0 0 auto",
        fontSize: 18,
        lineHeight: 1
      }
    }, isWarning ? "!" : "\u2713"));
  })(), notification && (() => {
    const isErr = notification.startsWith("Erro") || notification.startsWith("Error");
    return /*#__PURE__*/React.createElement("div", {
      style: {
        margin: "8px 16px 0",
        background: isErr ? "var(--notif-err-bg)" : "var(--notif-ok-bg)",
        border: `1px solid ${isErr ? "var(--notif-err-border)" : "var(--notif-ok-border)"}`,
        color: isErr ? "var(--notif-err-text)" : "var(--notif-ok-text)",
        padding: "7px 14px",
        borderRadius: 6,
        fontSize: 14,
        textAlign: "center",
        order: 8
      }
    }, notification);
  })(), tab !== "diario" && /*#__PURE__*/React.createElement("div", {
    "data-app-nav": "true",
    style: {
      display: "flex",
      gap: isMobileView ? 8 : 0,
      borderBottom: "1px solid var(--border)",
      marginTop: 0,
      overflowX: isMobileView ? "auto" : "visible",
      overflowY: "hidden",
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: isMobileView ? "none" : "auto",
      padding: isMobileView ? "0 12px" : 0,
      background: "var(--surface)",
      order: 2,
      animation: "softIn 220ms ease-out both"
    }
  }, tabNavItems.map(([t, label]) => /*#__PURE__*/React.createElement("button", {
    "data-tutorial": "tab-" + t,
    key: t,
    onClick: () => openTab(t),
    style: {
      flex: isMobileView ? "0 0 auto" : 1,
      minWidth: isMobileView ? (t === "adicionar" ? 58 : 96) : 0,
      padding: isMobileView ? "10px 14px" : "10px 0",
      background: tab === t ? "var(--tab-active)" : "transparent",
      border: "none",
      borderBottom: tab === t ? "2px solid #c8a96e" : "2px solid transparent",
      color: tab === t ? "#c8a96e" : "#444",
      fontSize: 14,
      fontWeight: 400,
      letterSpacing: 1,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      cursor: "pointer"
    }
  }, label))), /*#__PURE__*/React.createElement("div", {
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
  }, tab === "adicionar" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: "1px solid var(--border3)",
      position: "sticky",
      top: isMobileView ? -18 : -22,
      background: "var(--surface)",
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: "var(--muted)",
      marginBottom: 3
    }
  }, uiText("Registrar refeição", "Log meal", "Registrar comida")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text3)"
    }
  }, uiText("Escolha um método e salve no diário de hoje.", "Choose a method and save it to today's diary.", "Elige un método y guárdalo en el diario de hoy."))), /*#__PURE__*/React.createElement("button", {
    onClick: () => openTab("diario"),
    style: {
      background: "var(--btn-inactive)",
      border: "1px solid var(--btn-inactive-border)",
      color: "var(--muted)",
      borderRadius: 999,
      width: 34,
      height: 34,
      cursor: "pointer",
      fontSize: 18,
      lineHeight: "30px"
    }
  }, "\u00D7")), /*#__PURE__*/React.createElement("div", {
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
  }, isMobileView ? "i" : uiText("i Ajuda", "i Help", "i Ayuda"))), tab === "diario" && /*#__PURE__*/React.createElement("div", {
    "data-screen": "diario",
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, allEntries.length === 0 && /*#__PURE__*/React.createElement("div", {
    "data-day-progress-summary": allEntries.length ? "progress" : "empty",
    style: {
      marginBottom: 14,
      order: -1,
      background: diaryStatus.tone === "ok" ? "var(--notif-ok-bg)" : diaryStatus.tone === "warn" ? "var(--notif-err-bg)" : "var(--surface)",
      border: "1px solid " + (diaryStatus.tone === "ok" ? "var(--notif-ok-border)" : diaryStatus.tone === "warn" ? "var(--notif-err-border)" : "var(--border)"),
      borderRadius: 8,
      padding: "12px 14px",
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "1fr auto",
      gap: 10,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: diaryStatus.tone === "warn" ? "var(--notif-err-text)" : "var(--text2)",
      fontSize: 15,
      fontWeight: 700,
      marginBottom: 4
    }
  }, diaryStatus.title), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13,
      lineHeight: 1.4
    }
  }, diaryStatus.text)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      justifyContent: isMobileView ? "flex-start" : "flex-end",
      fontSize: 12,
      color: "var(--muted)"
    }
  }, /*#__PURE__*/React.createElement("span", null, dayProteinPct, "% ", uiText("proteína", "protein", "proteína")), /*#__PURE__*/React.createElement("span", null, dayKcalPct, "% kcal"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14,
      order: -2,
      background: "var(--surface)",
      borderRadius: 8,
      padding: "8px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => changeViewDate(addDays(viewDate, -1)),
    style: {
      background: "none",
      border: "none",
      color: "var(--muted)",
      cursor: "pointer",
      fontSize: 18,
      padding: "0 8px"
    }
  }, "\u2039"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCalendarOpen(v => !v),
    style: {
      background: "none",
      border: "none",
      textAlign: "center",
      cursor: "pointer",
      fontFamily: "inherit",
      flex: "1 1 180px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: isToday ? "#c8a96e" : "#c9bfb0"
    }
  }, dateLabel(viewDate, lang))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (viewDate < TODAY) changeViewDate(addDays(viewDate, 1));
    },
    style: {
      background: "none",
      border: "none",
      color: viewDate >= TODAY ? "var(--faint)" : "var(--muted)",
      cursor: viewDate >= TODAY ? "default" : "pointer",
      fontSize: 18,
      padding: "0 8px"
    }
  }, "\u203A"), /*#__PURE__*/React.createElement("button", {
    onClick: () => changeViewDate(TODAY),
    disabled: isToday,
    style: {
      ...sBtn("var(--btn-info)", "var(--btn-info-border)", "var(--btn-info-text)"),
      display: isToday ? "none" : "inline-flex",
      opacity: isToday ? 0.45 : 1,
      cursor: isToday ? "default" : "pointer"
    }
  }, uiText("Hoje", "Today", "Hoy"))), calendarOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      borderTop: "1px solid var(--border3)",
      paddingTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCalendarMonth(m => shiftMonth(m, -1)),
    style: sBtn("transparent", "var(--border3)", "var(--muted)")
  }, "\u2039"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text2)",
      textTransform: "uppercase",
      letterSpacing: 1
    }
  }, new Date(calendarMonth + "-01T12:00:00").toLocaleDateString(localeForLang(lang), {month: "long", year: "numeric"})), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const next = shiftMonth(calendarMonth, 1);
      if (next <= TODAY.slice(0, 7)) setCalendarMonth(next);
    },
    disabled: calendarMonth >= TODAY.slice(0, 7),
    style: {
      ...sBtn("transparent", "var(--border3)", "var(--muted)"),
      opacity: calendarMonth >= TODAY.slice(0, 7) ? 0.4 : 1
    }
  }, "\u203A")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
      gap: 4
    }
  }, pickLang(lang, ["D","S","T","Q","Q","S","S"], ["S","M","T","W","T","F","S"], ["D","L","M","X","J","V","S"]).map((d, idx) => /*#__PURE__*/React.createElement("div", {
    key: d + idx,
    style: {
      textAlign: "center",
      color: "var(--muted)",
      fontSize: 11,
      padding: "4px 0"
    }
  }, d)), monthDays(calendarMonth).map((date, idx) => {
    const marker = date ? (calendarData[calendarMonth] || {})[date] : null;
    const selected = date === viewDate;
    const disabled = !date || date > TODAY;
    return /*#__PURE__*/React.createElement("button", {
      key: date || "blank-" + idx,
      disabled,
      onClick: () => date && changeViewDate(date),
      title: marker && marker.hasData ? `${marker.kcal} kcal ? ${marker.protein}g` : "",
      style: {
        minHeight: 40,
        borderRadius: 6,
        border: selected ? "1px solid #c8a96e" : "1px solid var(--border3)",
        background: selected ? "var(--btn-info)" : "transparent",
        color: disabled ? "var(--faint)" : "var(--text2)",
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit",
        padding: 4
      }
    }, date ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13
      }
    }, Number(date.slice(-2))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "center",
        gap: 3,
        marginTop: 4,
        minHeight: 5
      }
    }, marker && /*#__PURE__*/React.createElement("span", {
      "data-calendar-indicator": "protein",
      style: {
        display: "inline-block",
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: marker.proteinMet ? "var(--accent-protein-fill)" : "var(--text-muted)"
      }
    }), marker && /*#__PURE__*/React.createElement("span", {
      "data-calendar-indicator": "kcal",
      style: {
        display: "inline-block",
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: marker.kcalOver ? "var(--accent-danger-fill)" : marker.kcalGood ? "var(--accent-kcal-fill)" : "var(--text-muted)"
      }
    }))) : "");
  })), (() => {
    const ms = calendarMonthStats();
    const legendItem = (color, label) => /*#__PURE__*/React.createElement("span", {
      style: { display: "inline-flex", alignItems: "center", gap: 5 }
    }, /*#__PURE__*/React.createElement("span", {
      style: { width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }
    }), label);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        borderTop: "1px solid var(--border3)",
        paddingTop: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 14px",
        fontSize: 12,
        color: "var(--muted)",
        marginBottom: 10
      }
    }, legendItem("var(--accent-protein-fill)", uiText("Proteína batida", "Protein hit", "Proteína alcanzada")), legendItem("var(--accent-kcal-fill)", uiText("Calorias na faixa", "Calories in range", "Calorías en rango")), legendItem("var(--accent-danger-fill)", uiText("Excesso calórico", "High calorie excess", "Exceso calórico")), legendItem("var(--text-muted)", uiText("Não batido / sem registro", "Not hit / no record", "No alcanzado / sin registro"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 8,
        fontSize: 12,
        color: "var(--text2)"
      }
    }, [
      [uiText("Dias registrados", "Logged days", "Días registrados"), ms.registered],
      [uiText("Dias com proteína", "Protein days", "Días con proteína"), ms.proteinDays],
      [uiText("Média kcal", "Avg kcal", "Media kcal"), ms.avgKcalMonth],
      [uiText("Média proteína", "Avg protein", "Media proteína"), ms.avgProteinMonth + "g"],
      [uiText("Dias com excesso", "Excess days", "Días con exceso"), ms.kcalOverDays]
    ].map(([label, value]) => /*#__PURE__*/React.createElement("div", {
      key: label,
      style: {
        background: "var(--bg)",
        border: "1px solid var(--border3)",
        borderRadius: 6,
        padding: "7px 8px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: { color: "var(--muted)", marginBottom: 2 }
    }, label), /*#__PURE__*/React.createElement("b", null, value)))));
  })(), calendarLoading && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 12,
      textAlign: "center",
      marginTop: 8
    }
  }, uiText("Carregando...", "Loading...", "Cargando..."))), !isToday && (() => {
    const entries = Object.values(activeLog).flat();
    const p = entries.reduce((s, e) => s + (e.protein ?? 0), 0);
    const k = entries.reduce((s, e) => s + (e.kcal ?? 0), 0);
    if (!entries.length) return /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        color: "var(--faint)",
        fontSize: 14,
        fontStyle: "italic",
        marginBottom: 12
      }
    }, text('noRecords'));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--surface)",
        borderRadius: 6,
        padding: "10px 14px",
        marginBottom: 14,
        display: "flex",
        gap: 20,
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#c8a96e"
      }
    }, Math.round(p), text('proteinUnit')), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#8ec8c8"
      }
    }, Math.round(k), " kcal"));
  })(), isToday && /*#__PURE__*/React.createElement("div", {
    "data-water-block": "true",
    style: {
      display: "block",
      background: "var(--surface)",
      border: "1px solid var(--border3)",
      borderRadius: 10,
      padding: "13px 15px",
      marginBottom: 14,
      animation: "softIn 240ms ease-out both"
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
      letterSpacing: 1,
      color: darkMode ? "#3ab88a" : "#1a8a6a",
      textTransform: "uppercase"
    }
    }, text('water')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: totalWater >= goals.water ? "#6ec8a9" : caloriesColor
    }
  }, totalWater, "ml"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--dim)"
    }
  }, "/ ", goals.water, "ml"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--faint)"
    }
  }, "(", viewWeight ? `${isTraining ? 40 : 35}ml/kg` : uiText('padrão', 'default', 'predeterminado'), ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditWaterGoal(e => !e),
    style: {
      background: "none",
      border: "none",
      color: "var(--dim)",
      cursor: "pointer",
      fontSize: 11
    }
  }, "\u2699"))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 7,
      background: "var(--track)",
      borderRadius: 999,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: Math.min(totalWater / goals.water * 100, 100) + "%",
      borderRadius: 999,
      background: totalWater >= goals.water ? "#6ec8a9" : caloriesColor,
      transition: "width 420ms cubic-bezier(0.2,0.8,0.2,1), background-color 220ms ease"
    }
  })), editWaterGoal && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 8,
      animation: "softIn 180ms ease-out both"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: waterGoalInput,
    onChange: e => setWaterGoalInput(e.target.value),
    placeholder: text('currentGoal') + ' ' + goals.water + 'ml',
    style: {
      ...inp,
      flex: 1,
      marginTop: 0,
      padding: "6px 10px",
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const v = parseFloat(waterGoalInput);
      if (!isNaN(v) && v > 0) {
        setWaterGoal(v);
        setWaterGoalInput("");
        setEditWaterGoal(false);
      }
    },
    style: {
      background: "var(--btn-ok)",
      border: "1px solid var(--btn-ok-border)",
      color: "var(--btn-ok-text)",
      borderRadius: 999,
      padding: "6px 12px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, "ok")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 5,
      flexWrap: "wrap",
      marginBottom: 8
    }
  }, [150, 200, 250, 330, 500].map(ml => /*#__PURE__*/React.createElement("button", {
    key: ml,
    onClick: () => addWater(ml),
    style: {
      background: "var(--btn-teal)",
      border: "1px solid var(--btn-teal-border)",
      color: darkMode ? "#3ab88a" : "#1a8a6a",
      borderRadius: 999,
      padding: "4px 10px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, ml, "ml")).concat(waterCustomPreset ? /*#__PURE__*/React.createElement("button", {
    key: "custom-water-preset",
    onClick: () => addWater(waterCustomPreset),
    onDoubleClick: configureWaterCustomPreset,
    title: uiText("Medida personalizada. Clique duas vezes para editar.", "Custom bottle size. Double-click to edit.", "Medida personalizada. Haz doble clic para editar."),
    style: {
      background: "var(--btn-teal)",
      border: "1px solid var(--btn-teal-border)",
      color: darkMode ? "#3ab88a" : "#1a8a6a",
      borderRadius: 999,
      padding: "4px 10px",
      fontSize: 14,
      cursor: "pointer",
      fontWeight: 700
    }
  }, waterCustomPreset, "ml") : []).concat(/*#__PURE__*/React.createElement("button", {
    key: "configure-water-preset",
    onClick: configureWaterCustomPreset,
    title: uiText("Salvar uma medida rápida personalizada", "Save a custom quick amount", "Guardar una medida rápida personalizada"),
    style: {
      background: "transparent",
      border: "1px dashed var(--btn-teal-border)",
      color: darkMode ? "#3ab88a" : "#1a8a6a",
      borderRadius: 999,
      padding: "4px 11px",
      fontSize: 14,
      cursor: "pointer",
      fontWeight: 700
    }
  }, "+"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: waterInput,
    onChange: e => setWaterInput(e.target.value),
    placeholder: uiText('outro valor em ml', 'other value in ml', 'otro valor en ml'),
    style: {
      ...inp,
      flex: 1,
      marginTop: 0,
      padding: "6px 10px",
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => addWater(),
    style: {
      background: "var(--btn-teal)",
      border: "1px solid var(--btn-teal-border)",
      color: darkMode ? "#3ab88a" : "#1a8a6a",
      borderRadius: 6,
      padding: "6px 12px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, "+")), waterIntake.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: "flex",
      flexWrap: "wrap",
      gap: 5
    }
  }, waterIntake.map(e => /*#__PURE__*/React.createElement("div", {
    key: e.id,
    style: {
      background: "var(--btn-teal)",
      border: "1px solid var(--btn-teal-border)",
      borderRadius: 999,
      padding: "3px 8px",
      fontSize: 14,
      color: darkMode ? "#3ab88a" : "#1a8a6a",
      display: "flex",
      gap: 5,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", null, e.ml, "ml ", e.time), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeWater(e.id),
    style: {
      background: "none",
      border: "none",
      color: "#3a6a6a",
      cursor: "pointer",
      fontSize: 14,
      padding: 0
    }
  }, "\xD7"))))), suppLog.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      borderBottom: "1px solid var(--border3)",
      paddingBottom: 5,
      marginBottom: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted2)",
      textTransform: "uppercase"
    }
  }, ` ${text('suppTitle')}`)), suppLog.map(e => /*#__PURE__*/React.createElement("div", {
    key: e.id,
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "6px 0",
      borderBottom: "1px solid #181818"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--text2)"
    }
  }, e.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--dim)",
      marginLeft: 8
    }
  }, e.dose, e.unit), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--faint)",
      marginLeft: 8
    }
  }, e.time)), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeSuppLog(e.id),
    style: {
      background: "none",
      border: "none",
      color: "var(--dim)",
      cursor: "pointer",
      fontSize: 16
    }
  }, "\xD7")))), MEALS.map(meal => {
    const entries = activeLog[meal] || [];
    const mp = entries.reduce((s, e) => s + (e.protein ?? 0), 0);
    const mk = entries.reduce((s, e) => s + (e.kcal ?? 0), 0);
    const mealHasOpenMenu = entries.some(e => e.id === entryMenuId);
    return /*#__PURE__*/React.createElement("div", {
      key: meal,
      "data-diary-meal-card": "true",
      className: "meal-section-card",
      style: {
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
        zIndex: mealHasOpenMenu ? 500 : "auto",
        overflow: "visible",
        marginBottom: 12,
        background: "var(--surface)",
        border: "1px solid var(--border3)",
        borderRadius: 10,
        padding: isMobileView ? "12px" : "13px 15px",
        animation: "softIn 260ms ease-out both"
      }
    }, /*#__PURE__*/React.createElement("div", {
      "data-diary-meal-header": "true",
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
        paddingBottom: entries.length ? 9 : 0,
        borderBottom: entries.length ? "1px solid var(--border3)" : "none"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        letterSpacing: 1,
        color: "var(--muted2)",
        textTransform: "uppercase",
        marginBottom: 3
      }
    }, mealLabel(meal)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: entries.length ? "var(--muted)" : "var(--faint)"
      }
    }, entries.length ? entries.length + " item" + (entries.length !== 1 ? "s" : "") : uiText("Sem alimentos registrados", "No food logged", "Sin alimentos registrados"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginLeft: "auto"
      }
    }, entries.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right",
        fontSize: 12,
        lineHeight: 1.35,
        whiteSpace: "nowrap"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: proteinColor,
        fontWeight: 700
      }
    }, Math.round(mp), "g ", uiText("prot.", "protein", "prot.")), /*#__PURE__*/React.createElement("div", {
      style: {
        color: caloriesColor,
        fontWeight: 700
      }
    }, Math.round(mk), " kcal")), /*#__PURE__*/React.createElement("button", {
      "data-tutorial": "open-log-sheet",
      onClick: () => openAddForMeal(meal),
      style: {
        background: "var(--btn-ok)",
        border: "1px solid var(--btn-ok-border)",
        color: "var(--btn-ok-text)",
        borderRadius: 999,
        padding: isMobileView ? "7px 10px" : "7px 12px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontFamily: "inherit"
      }
    }, "+ ", uiText("Adicionar", "Add", "Agregar"))), /*#__PURE__*/React.createElement("div", {
      "data-diary-meal-items": "true",
      style: {
        display: "block",
        width: "100%",
        clear: "both"
      }
    }, entries.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--faint)",
        fontSize: 13,
        paddingTop: 10,
        lineHeight: 1.4
      }
    }, uiText("Use + Adicionar para registrar algo aqui.", "Use + Add to log something here.", "Usa + Agregar para registrar algo aquí.")) : entries.map(e => /*#__PURE__*/React.createElement("div", {
      key: e.id,
      style: {
        position: "relative",
        zIndex: entryMenuId === e.id ? 300 : "auto"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        padding: "9px 0",
        borderBottom: "1px solid var(--border3)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, editEntryId === e.id ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: editEntryQty,
      onChange: ev => setEditEntryQty(ev.target.value),
      style: {
        ...inp,
        width: 80,
        marginTop: 0,
        padding: "4px 8px",
        fontSize: 13
      },
      autoFocus: true
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: "var(--muted)"
      }
    }, e.unit), /*#__PURE__*/React.createElement("button", {
      onClick: () => saveEntryEdit(meal),
      style: {
        background: "var(--btn-ok)",
        border: "1px solid var(--btn-ok-border)",
        color: "var(--btn-ok-text)",
        borderRadius: 4,
        padding: "3px 8px",
        fontSize: 14,
        cursor: "pointer"
      }
    }, "\u2713"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setEditEntryId(null),
      style: {
        background: "none",
        border: "none",
        color: "var(--muted)",
        cursor: "pointer",
        fontSize: 13
      }
    }, "\u2715")) : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--text2)",
        fontWeight: 600,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, e.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--muted)"
      }
    }, e.qty, e.unit, e.time ? " · " + e.time : ""))), editEntryId !== e.id && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        position: "relative",
        zIndex: entryMenuId === e.id ? 200 : 1,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: proteinColor,
        fontWeight: 700
      }
    }, Math.round(e.protein ?? 0), "g"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: caloriesColor,
        fontWeight: 700
      }
    }, Math.round(e.kcal ?? 0), "kcal"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setEntryMenuId(entryMenuId === e.id ? null : e.id),
      style: {
        background: "var(--btn-inactive)",
        border: "1px solid var(--btn-inactive-border)",
        color: "var(--muted)",
        borderRadius: 999,
        cursor: "pointer",
        fontSize: 16,
        width: 30,
        height: 28,
        lineHeight: "22px"
      }
    }, "\u22EF"), entryMenuId === e.id && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        zIndex: 1000,
        minWidth: 150,
        background: "var(--surface)",
        border: "1px solid var(--border2)",
        borderRadius: 8,
        padding: 5,
        boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
        animation: "softScaleIn 160ms ease-out both"
      }
    }, [[uiText("Detalhes", "Details", "Detalles"), () => {
      setDetailFood(detailFood === e.id ? null : e.id);
      setEntryMenuId(null);
    }], [uiText("Editar quantidade", "Edit amount", "Editar cantidad"), () => {
      startEditEntry(e);
      setEntryMenuId(null);
    }], [uiText("Duplicar", "Duplicate", "Duplicar"), () => duplicateEntry(meal, e)], [uiText("Excluir", "Delete", "Eliminar"), () => removeEntry(meal, e.id)]].map(([label, action], idx) => /*#__PURE__*/React.createElement("button", {
      key: label,
      onClick: action,
      style: {
        width: "100%",
        background: "none",
        border: "none",
        borderTop: idx === 3 ? "1px solid var(--border3)" : "none",
        color: idx === 3 ? "var(--btn-warn-text)" : "var(--text2)",
        padding: "8px 9px",
        textAlign: "left",
        borderRadius: 6,
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 13
      }
    }, label))))))))))
  }), false && allEntries.length === 0 && isToday && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center", padding: "32px 16px 16px",
    }
  },
    /*#__PURE__*/React.createElement("div", { style: { fontSize: 40, marginBottom: 12 } }, "\uD83C\uDF7D\uFE0F"),
    /*#__PURE__*/React.createElement("p", { style: {
      color: "var(--text2)", fontSize: 15, fontWeight: 500, margin: "0 0 6px"
    } }, uiText("Nenhum alimento registrado hoje", "Nothing logged yet today", "Ningún alimento registrado hoy")),
    /*#__PURE__*/React.createElement("p", { style: {
      color: "var(--muted)", fontSize: 14, margin: "0 0 20px", lineHeight: 1.5
    } }, uiText(
      "Toque em + para registrar o que você comeu",
      "Tap + to add what you've eaten",
      "Toca + para registrar lo que comiste"
    )),
    pantry.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--btn-ok)", border: "1px solid var(--btn-ok-border)",
        borderRadius: 12, padding: "14px 16px", marginBottom: 12, textAlign: "left"
      }
    },
      /*#__PURE__*/React.createElement("p", { style: {
        color: "var(--btn-ok-text)", fontSize: 14, margin: "0 0 10px", fontWeight: 500
      } }, "\uD83D\uDCA1 " + uiText("Dica: Comece adicionando alimentos em Alimentos", "Tip: Start by adding foods to Foods", "Consejo: empieza agregando alimentos en Alimentos")),
      /*#__PURE__*/React.createElement("button", {
        onClick: () => setTab("despensa"),
        style: {
          background: "var(--btn-ok-text)", border: "none", color: "#fff",
          borderRadius: 8, padding: "8px 16px", fontSize: 14,
          cursor: "pointer", fontFamily: "inherit", fontWeight: 500
        }
      }, uiText("Ir para Alimentos \u2192", "Go to Foods \u2192", "Ir a Alimentos \u2192"))
    ),
    /*#__PURE__*/React.createElement("button", {
      onClick: () => openAddForMeal(MEALS[0]),
      style: {
        background: "var(--accent, #4a9a4a)", border: "none", color: "#fff",
        borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600,
        cursor: "pointer", fontFamily: "inherit"
      }
    }, uiText("+ Adicionar alimento", "+ Add food", "+ Agregar alimento"))
  ), /*#__PURE__*/React.createElement("div", {
    style: { marginTop: 20 }
  },
    /*#__PURE__*/React.createElement("button", {
      onClick: () => setNotesOpen(o => !o),
      style: {
        width: "100%", background: "none", border: "none",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 0", cursor: "pointer", fontFamily: "inherit"
      }
    },
      /*#__PURE__*/React.createElement("span", { style: lbl }, text('notesTitle')),
      /*#__PURE__*/React.createElement("span", {
        style: { color: "var(--muted)", fontSize: 14, transition: "transform 0.2s",
          display: "inline-block", transform: notesOpen ? "rotate(180deg)" : "rotate(0deg)" }
      }, notesOpen ? "\u25B2" : "\u25BC")
    ),
    notesOpen && /*#__PURE__*/React.createElement("textarea", {
      value: isToday ? todayNote : historyNote,
      onChange: e => isToday ? setTodayNote(e.target.value) : setHistoryNote(e.target.value),
      placeholder: text('notesPlaceholder'),
      style: { ...inp, height: 72, resize: "vertical", marginTop: 4 }
    })
  ), suppPantry.length > 0 && isToday && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowSuppAdd(s => !s),
    style: {
      ...btn,
      background: "var(--btn-info)",
      border: "1px solid var(--border-info)",
      color: "var(--btn-info-text)",
      fontSize: 14,
      letterSpacing: 1,
      marginTop: 0
    }
  }, text('suppRegister')), showSuppAdd && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: suppAddId,
    onChange: e => setSuppAddId(e.target.value),
    style: {
      ...inp,
      flex: 2,
      marginTop: 0,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, uiText("\u2014 selecione \u2014", "\u2014 select \u2014", "\u2014 seleccionar \u2014")), suppPantry.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name, " (", s.dose, s.unit, ")"))), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: suppAddDose,
    onChange: e => setSuppAddDose(e.target.value),
    placeholder: "dose",
    style: {
      ...inp,
      flex: 1,
      marginTop: 0,
      padding: "8px 10px"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: logSupp,
    style: {
      background: "var(--btn-ok)",
      border: "1px solid var(--btn-ok-border)",
      color: "var(--btn-ok-text)",
      borderRadius: 6,
      padding: "0 12px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, "\u2713"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => generateFeedback("day"),
    "data-action-insight": "true",
    disabled: feedbackLoading && feedbackPeriod === "day",
    style: {
      width: "100%",
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: feedbackLoading && feedbackPeriod === "day" ? "#555" : "#c8a0e8",
      padding: "10px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: "inherit"
    }
  }, feedbackLoading && feedbackPeriod === "day" ? text('analyzing') : text('analyzeDayBtn'))), feedbackText && feedbackPeriod === "day" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      background: "var(--surface)",
      border: "1px solid var(--border2)",
      borderRadius: 8,
      padding: "14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 10
    }
  }, "Feedback \u2014 ", viewDate), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text3)",
      lineHeight: 1.7,
      whiteSpace: "pre-wrap"
    }
  }, feedbackText), feedbackSaved ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      fontSize: 14,
      color: "#3a6a3a",
      textAlign: "center",
      padding: "8px",
      background: "var(--btn-ok)",
      borderRadius: 6,
      border: "1px solid var(--btn-ok-border)"
    }
  }, uiText("\u2713 Já salvo nas notas", "\u2713 Already saved to notes", "\u2713 Ya guardado en las notas")) : /*#__PURE__*/React.createElement("button", {
    onClick: saveFeedbackAsNote,
    style: {
      ...btn,
      marginTop: 12,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "#7e9ec8",
      fontSize: 14,
      letterSpacing: 1
    }
  }, text('savedNote'))),
  
  backupImportPreview && (() => {
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
  }, "\xD7"))))), tab === "adicionar" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowRecentMeals(s => !s),
    style: {
      width: "100%",
      background: "var(--btn-inactive)",
      border: "1px solid var(--btn-inactive-border)",
      color: "var(--muted)",
      padding: "8px 12px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      textAlign: "left",
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", null, text('repeatRecent')), /*#__PURE__*/React.createElement("span", null, showRecentMeals ? "\u25BE" : "\u25B8")), showRecentMeals && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderTop: "none",
      borderRadius: "0 0 6px 6px",
      maxHeight: 280,
      overflowY: "auto"
    }
  }, recentMeals.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px",
      color: "var(--dim)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center"
    }
  }, "Sem refei\xE7\xF5es recentes.") : MEALS.map(meal => {
    const byMeal = recentMeals.filter(r => r.meal === meal);
    if (!byMeal.length) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: meal
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "6px 12px",
        fontSize: 14,
        letterSpacing: 1,
        color: "var(--muted)",
        textTransform: "uppercase",
        borderBottom: "1px solid var(--border3)",
        background: "var(--surface3)"
      }
    }, mealDisplay(meal)), byMeal.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: () => loadRecentMealToStaged(r),
      style: {
        padding: "9px 12px",
        borderBottom: "1px solid var(--border3)",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      },
      onMouseEnter: e => e.currentTarget.style.background = "var(--btn-inactive)",
      onMouseLeave: e => e.currentTarget.style.background = "transparent"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--text3)"
      }
    }, r.date === TODAY ? text('today') : r.date), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--muted)",
        marginTop: 2
      }
    }, r.entries.length, " item", r.entries.length !== 1 ? "s" : "", ": ", r.entries.map(e => e.name).join(", ").slice(0, 50), r.entries.map(e => e.name).join(", ").length > 50 ? "..." : "")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right",
        flexShrink: 0,
        marginLeft: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "#c8a96e"
      }
    }, r.protein, "g"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "#8ec8c8"
      }
    }, r.kcal, " kcal")))));
  })))), tab === "adicionar" && /*#__PURE__*/React.createElement(React.Fragment, null, showSaveTemplateModal && /*#__PURE__*/React.createElement("div", {
    style:{position:"fixed",inset:0,zIndex:100003,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(3px)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:16},
    onClick: e => { if(e.target===e.currentTarget) setShowSaveTemplateModal(false); }
  },
    /*#__PURE__*/React.createElement("div", {
      style:{background:"var(--surface)",borderRadius:14,padding:"24px",
        width:"100%",maxWidth:380,border:"1px solid var(--border2)",
        boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}
    },
      /*#__PURE__*/React.createElement("h3", {
        style:{margin:"0 0 6px",fontSize:16,color:"var(--text)",fontWeight:600}
      }, uiText("Salvar refeição", "Save meal template", "Guardar plantilla")),
      /*#__PURE__*/React.createElement("p", {
        style:{margin:"0 0 16px",fontSize:13,color:"var(--muted)"}
      }, staged.items.map(i=>i.name).join(", ")),
      /*#__PURE__*/React.createElement("input", {
        type:"text", value:templateName,
        onChange: e => setTemplateName(e.target.value),
        onKeyDown: e => { if(e.key==='Enter'){ saveTemplate(); }},
        placeholder: uiText("Nome (ex: Shake pré-treino)", "Name (e.g. Pre-workout shake)", "Nombre (ej.: batido preentreno)"),
        autoFocus: true,
        style:{...inp,marginBottom:14}
      }),
      /*#__PURE__*/React.createElement("div",{style:{display:"flex",gap:8}},
        /*#__PURE__*/React.createElement("button",{
          onClick:()=>setShowSaveTemplateModal(false),
          style:{flex:1,padding:"10px",borderRadius:8,background:"none",
            border:"1px solid var(--border2)",color:"var(--text2)",
            cursor:"pointer",fontFamily:"inherit",fontSize:13}
        }, uiText("Cancelar", "Cancel", "Cancelar")),
        /*#__PURE__*/React.createElement("button",{
          onClick: saveTemplate,
          disabled: !templateName.trim(),
          style:{flex:2,padding:"10px",borderRadius:8,
            background:templateName.trim()?"var(--btn-ok)":"var(--btn-inactive)",
            border:"none",color:templateName.trim()?"var(--btn-ok-text)":"var(--muted)",
            cursor:templateName.trim()?"pointer":"default",fontFamily:"inherit",
            fontSize:13,fontWeight:600}
        }, uiText("Salvar", "Save", "Guardar"))
      )
    )
  ), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "add-modes",
    style: {
      display: "flex",
      gap: 4,
      marginBottom: 16,
      padding: 4,
      background: "var(--surface3)",
      border: "1px solid var(--border3)",
      borderRadius: 999
    }
  }, [["batch", text('modeBatch')], ["describe", text('modeDescribe')], ["saved", isMobileView ? uiText("Salvas", "Saved", "Guardadas") : uiText("Refeições salvas", "Saved meals", "Comidas guardadas")]].map(([m, l]) => {
    const active = m === "saved" ? addTemplatesOpen : m === "describe" ? describeMode : !describeMode && !addTemplatesOpen;
    const unavailable = m !== "saved" && pantry.length === 0 && m !== "describe";
    return /*#__PURE__*/React.createElement("button", {
      key: m,
      onClick: () => selectAddMode(m),
      style: {
        flex: 1,
        padding: isMobileView ? "9px 8px" : "9px 12px",
        background: active ? (m === "describe" ? "var(--ai-bg)" : "var(--btn-ok)") : "transparent",
        border: "1px solid " + (active ? (m === "describe" ? "var(--ai-border)" : "var(--btn-ok-border)") : "transparent"),
        color: active ? (m === "describe" ? "var(--ai-text)" : "var(--btn-ok-text)") : "var(--muted)",
        borderRadius: 999,
        fontSize: isMobileView ? 12 : 14,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        letterSpacing: 0,
        whiteSpace: "nowrap",
        opacity: unavailable ? 0.55 : 1
      }
    }, m === "describe" ? "\u2726 " + l : m === "saved" ? "\u2630 " + l : l);
  })), addTemplatesOpen && /*#__PURE__*/React.createElement("div", {
    "data-add-saved-meals": "true",
    style: {
      marginTop: -4,
      marginBottom: 16,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "12px 14px"
    }
  }, mealTemplates.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      textAlign: "center",
      padding: "10px 0"
    }
  }, uiText("Nenhuma refeição salva ainda.", "No saved meals yet.", "Todavía no hay comidas guardadas.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    value: addTemplateSearch,
    onChange: e => setAddTemplateSearch(e.target.value),
    placeholder: uiText("Pesquisar refeição salva...", "Search saved meal...", "Buscar comida guardada..."),
    style: {
      ...inp,
      marginTop: 0,
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, mealTemplates.filter(tmpl => tmpl.name.toLowerCase().includes(addTemplateSearch.trim().toLowerCase())).length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center",
      padding: "10px 0"
    }
  }, uiText("Nenhuma refeição salva encontrada.", "No saved meals found.", "No se encontraron comidas guardadas.")) : mealTemplates.filter(tmpl => tmpl.name.toLowerCase().includes(addTemplateSearch.trim().toLowerCase())).map(tmpl => renderSavedMealCard(tmpl, "add"))))), describeMode && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Refei\xE7\xE3o"), /*#__PURE__*/React.createElement("select", {
    value: describeMeal,
    onChange: e => setDescribeMeal(e.target.value),
    style: inp
  }, MEALS.map(m => /*#__PURE__*/React.createElement("option", {
    key: m,
    value: m
  }, mealLabel(m))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('describeDish')), /*#__PURE__*/React.createElement("textarea", {
    value: mealDescription,
    onChange: e => setMealDescription(e.target.value),
    placeholder: "Ex: Frango grelhado com arroz branco e feijão, porção normal de refeitório. Tinha salada de alface com tomate e um fio de azeite. Sobremesa: uma laranja.",
    style: {
      ...inp,
      height: 100,
      resize: "vertical",
      marginTop: 4,
      fontSize: 13
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--dim)",
      marginTop: 4
    }
  }, uiText(
    "Descreva o que comeu e, se souber, as quantidades aproximadas. Caso contrário, indique apenas o contexto (refeitório, restaurante, caseiro, etc.).",
    "Describe what you ate and approximate amounts. Otherwise describe the context (restaurant, homemade, cafeteria, etc.).",
    "Describe lo que comiste y, si puedes, las cantidades aproximadas. Si no, indica el contexto (restaurante, casero, comedor, etc.)."
  ))), /*#__PURE__*/React.createElement("button", {
    onClick: estimateMealDescription,
    disabled: describeLoading,
    style: {
      ...btn,
      ...aiButtonStyle,
      background: describeLoading ? "var(--btn-inactive)" : aiButtonStyle.background,
      color: describeLoading ? "var(--muted)" : aiButtonStyle.color
    }
  }, describeLoading ? text('estimating') : uiText("Estimar valores nutricionais", "Estimate nutritional values", "Estimar valores nutricionales")), describeResult && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--text3)"
    }
  }, describeResult.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: confidenceColor(describeResult.confidence),
      letterSpacing: 1
    }
  }, uiText("confiança ", "confidence ", "confianza "), describeResult.confidence)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "6px 20px",
      marginBottom: 10
    }
  }, [{
    l: text('protein'),
    v: describeResult.protein,
    u: "g",
    c: "#c8a96e"
  }, {
    l: text('calories'),
    v: describeResult.kcal,
    u: text('kcalUnit'),
    c: "#8ec8c8"
  }, {
    l: text('carbs'),
    v: describeResult.carbs,
    u: "g",
    c: "#a96ec8"
  }, {
    l: uiText('Gordura', 'Fat', 'Grasa'),
    v: describeResult.fat,
    u: "g",
    c: "#c86e8e"
  }, {
    l: text('fiber'),
    v: describeResult.fiber,
    u: "g",
    c: "#6ec8a9"
  }, {
    l: text('salt'),
    v: describeResult.salt,
    u: "g",
    c: "#888"
  }].filter(x => x.v != null).map(x => /*#__PURE__*/React.createElement("div", {
    key: x.l,
    style: {
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--muted)"
    }
  }, x.l, " "), /*#__PURE__*/React.createElement("span", {
    style: {
      color: x.c,
      fontWeight: 600
    }
  }, x.v, x.u)))), describeResult.note && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      fontStyle: "italic",
      marginBottom: 10,
      padding: "6px 10px",
      background: "var(--input)",
      borderRadius: 4
    }
  }, describeResult.note), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: addDescribedToLog,
    style: {
      ...btn,
      marginTop: 0,
      background: "var(--btn-ok)",
      border: "1px solid var(--btn-ok-border)",
      color: "var(--btn-ok-text)"
    }
  }, uiText('Registrar', 'Log meal', 'Registrar')), /*#__PURE__*/React.createElement("button", {
    onClick: evaluateDescribedMeal,
    "data-action-insight": "true",
    style: {
      ...btn,
      marginTop: 0,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "var(--btn-info-text)"
    }
  }, uiText('Avaliar refeição', 'Evaluate meal', 'Evaluar comida'))))), !describeMode && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Refei\xE7\xE3o"), /*#__PURE__*/React.createElement("select", {
    value: batchMode ? staged.meal : addEntry.meal,
    onChange: e => batchMode ? setStaged(s => ({
      ...s,
      meal: e.target.value
    })) : setAddEntry(a => ({
      ...a,
      meal: e.target.value
    })),
    style: inp
  }, MEALS.map(m => /*#__PURE__*/React.createElement("option", {
    key: m,
    value: m
  }, mealLabel(m))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Alimento"), /*#__PURE__*/React.createElement("input", {
    value: addEntry.foodSearch || "",
    onChange: e => setAddEntry(a => ({
      ...a,
      foodSearch: e.target.value,
      foodId: ""
    })),
    placeholder: text('searchFood'),
    style: inp
  }), addEntry.foodSearch && (() => {
    const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const results = sortedAllPantry.filter(f => norm(f.name).includes(norm(addEntry.foodSearch)));
    if (!results.length) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--dim)",
        padding: "8px 12px",
        background: "var(--input)",
        borderRadius: "0 0 6px 6px",
        marginTop: -3
      }
    }, "Nenhum resultado.");
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--input)",
        border: "1px solid var(--border2)",
        borderTop: "none",
        borderRadius: "0 0 6px 6px",
        marginTop: -3,
        maxHeight: 200,
        overflowY: "auto"
      }
    }, results.map(f => /*#__PURE__*/React.createElement("div", {
      key: f.id,
      onClick: () => setAddEntry(a => ({
        ...a,
        foodId: f.id,
        foodSearch: f.name
      })),
      style: {
        padding: "9px 12px",
        cursor: "pointer",
        borderBottom: "1px solid var(--border3)",
        fontSize: 14,
        color: addEntry.foodId === f.id ? "var(--btn-ok-text)" : "var(--text)",
        background: addEntry.foodId === f.id ? "var(--btn-ok)" : "transparent"
      }
    },
    /*#__PURE__*/React.createElement("span", {style:{fontSize:14,fontWeight:500,color:"var(--text)"}}, f.name),
    /*#__PURE__*/React.createElement("span", {style:{fontSize:12,color:proteinColor,marginLeft:8}},
      f.protein100, f.unit==="un" ? "g" : "g", " prot"
    ),
    /*#__PURE__*/React.createElement("span", {style:{fontSize:12,color:caloriesColor,marginLeft:6}},
      f.kcal100, f.unit==="un" ? " kcal/un" : " kcal/100"+f.unit
    ))));
  })(), !addEntry.foodSearch && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      marginTop: 5,
      lineHeight: 1.35
    }
  }, uiText("Comece a digitar para buscar nos alimentos salvos.", "Start typing to search your saved foods.", "Empieza a escribir para buscar en tus alimentos guardados.")), selectedFood && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('qty') + ' (' + selectedFood.unit + ')'), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: addEntry.qty,
    onChange: e => setAddEntry(a => ({
      ...a,
      qty: e.target.value
    })),
    placeholder: '250 ' + selectedFood.unit,
    style: inp
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 5,
      marginTop: 6
    }
  }, quickQtys(selectedFood.unit).map(q => /*#__PURE__*/React.createElement("button", {
    key: q,
    onClick: () => setAddEntry(a => ({
      ...a,
      qty: String(q)
    })),
    style: {
      background: addEntry.qty === String(q) ? "var(--btn-ok)" : "var(--btn-inactive)",
      border: `1px solid ${addEntry.qty === String(q) ? "#3a6a3a" : "#252525"}`,
      color: addEntry.qty === String(q) ? "#7ec87e" : "#555",
      borderRadius: 4,
      padding: "3px 10px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, q, selectedFood.unit)))), selectedFood && addEntry.qty && (() => {
    const q = parseFloat(addEntry.qty);
    if (isNaN(q)) return null;
    const preview = ALL_FIELDS.filter(f => selectedFood[f.key] != null).map(f => ({
      label: f.label,
      val: selectedFood[f.key] * q / divisor(selectedFood.unit),
      unit: f.unit,
      color: f.color || "#888"
    }));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--input)",
        borderRadius: 6,
        padding: "9px 12px",
        marginBottom: 10,
        display: "flex",
        flexWrap: "wrap",
        gap: "5px 16px"
      }
    }, preview.map(x => /*#__PURE__*/React.createElement("div", {
      key: x.label,
      style: {
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, x.label, " "), /*#__PURE__*/React.createElement("span", {
      style: {
        color: x.color
      }
    }, x.val % 1 === 0 ? Math.round(x.val) : x.val.toFixed(1), x.unit))));
  })(), !batchMode ? /*#__PURE__*/React.createElement("button", {
    "data-tutorial": "add-log-button",
    onClick: addToLog,
    style: btn
  }, text('logToDiary')) : /*#__PURE__*/React.createElement("button", {
    onClick: addToStaged,
    style: {
      ...btn,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "var(--btn-info-text)"
    }
  }, uiText('+ Adicionar à refeição', '+ Add to meal', '+ Agregar a la comida')), batchMode && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, staged.items.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center",
      marginTop: 8
    }
  }, uiText("Selecione alimentos e vá adicionando.", "Select foods and add them one by one.", "Selecciona alimentos y agrégalos uno por uno.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 8
    }
  }, "Na refei\xE7\xE3o \u2014 ", staged.meal), staged.items.map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    style: {
      padding: "6px 0",
      borderBottom: "1px solid var(--border3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "pantry-food-name",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--text2)",
      flex: 1
    }
  }, item.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, editStagedIdx === idx ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editStagedQty,
    onChange: e => setEditStagedQty(e.target.value),
    style: {
      ...inp,
      width: 70,
      marginTop: 0,
      padding: "3px 8px",
      fontSize: 12
    },
    autoFocus: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--muted)"
    }
  }, item.unit), /*#__PURE__*/React.createElement("button", {
    onClick: saveEditStaged,
    style: {
      background: "var(--btn-ok)",
      border: "1px solid var(--btn-ok-border)",
      color: "var(--btn-ok-text)",
      borderRadius: 4,
      padding: "2px 7px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, "\u2713"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditStagedIdx(null),
    style: {
      background: "none",
      border: "none",
      color: "var(--muted)",
      cursor: "pointer",
      fontSize: 13
    }
  }, "\u2715")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    onClick: () => {
      setEditStagedIdx(idx);
      setEditStagedQty(String(item.qty));
    },
    style: {
      fontSize: 14,
      color: "var(--muted)",
      cursor: "pointer",
      borderBottom: "1px dashed #333"
    }
  }, item.qty, item.unit), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "#c8a96e"
    }
  }, Math.round(item.protein ?? 0), "g"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "#8ec8c8"
    }
  }, Math.round(item.kcal ?? 0), "kcal"), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeFromStaged(idx),
    style: {
      background: "none",
      border: "none",
      color: "var(--dim)",
      cursor: "pointer",
      fontSize: 16
    }
  }, "\xD7")))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 16,
      padding: "7px 0",
      borderTop: "1px solid var(--border2)",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--muted)"
    }
  }, "Total:"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#c8a96e"
    }
  }, Math.round(stagedTot.protein), "g prot"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#8ec8c8"
    }
  }, Math.round(stagedTot.kcal), " kcal"), stagedTot.carbs > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#a96ec8"
    }
  }, Math.round(stagedTot.carbs), "g carbs")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 8,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: commitStaged,
    style: {
      ...btn,
      marginTop: 0,
      background: "var(--btn-ok)",
      border: "1px solid var(--btn-ok-border)",
      color: "var(--btn-ok-text)"
    }
  }, uiText("Registrar", "Log meal", "Registrar")), /*#__PURE__*/React.createElement("button", {
    onClick: evaluateStagedMeal,
    "data-action-insight": "true",
    style: {
      ...btn,
      marginTop: 0,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "var(--btn-info-text)"
    }
  }, uiText("Avaliar refeição", "Evaluate meal", "Evaluar comida"))),
  /*#__PURE__*/React.createElement("button", {
    onClick: openSaveTemplateModal,
    disabled: !staged.items.length,
    style: {
      ...btn,
      marginTop: 6,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "var(--btn-info-text)",
      opacity: staged.items.length ? 1 : 0.4
    }
  }, uiText("\uD83D\uDCBE Salvar como refeição", "\uD83D\uDCBE Save as meal template", "\uD83D\uDCBE Guardar como comida")), pantry.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      color: "var(--faint)",
      fontSize: 14,
      textAlign: "center",
      fontStyle: "italic"
    }
  }, text('pantryEmpty'))), /*#__PURE__*/React.createElement("div", {
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
  }, exportResult.filename))))))))), tab === "despensa" && /*#__PURE__*/React.createElement("div", {
    "data-screen": "despensa",
    style: {
      padding: "2px 16px 28px",
      boxSizing: "border-box",
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "1fr auto",
      gap: 10,
      alignItems: "center",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: pantrySearch,
    onChange: e => setPantrySearch(e.target.value),
    placeholder: text('pantrySearch'),
    style: {
      ...inp,
      marginTop: 0,
      marginBottom: 0
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewFoodOpen(v => !v),
    style: {
      ...btn,
      marginTop: 0,
      minWidth: isMobileView ? "100%" : 180
    }
  }, newFoodOpen ? uiText("Fechar cadastro", "Close form", "Cerrar registro") : uiText("+ Novo alimento", "+ New food", "+ Nuevo alimento"))), newFoodOpen && /*#__PURE__*/React.createElement("div", {
    onClick: () => setNewFoodOpen(false),
    style: {
      display: "none"
    }
  }), newFoodOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: "100%",
      maxWidth: "100%",
      maxHeight: "none",
      overflowY: "visible",
      margin: "0 0 18px",
      transform: "none",
      background: "var(--surface)",
      border: "1px solid var(--border2)",
      borderRadius: 10,
      boxShadow: "0 12px 32px rgba(0,0,0,0.10)",
      padding: isMobileView ? "14px 14px 18px" : "18px 20px 22px",
      boxSizing: "border-box",
      animation: "softIn 220ms ease-out both"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: "1px solid var(--border3)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: "var(--muted)",
      marginBottom: 3
    }
  }, uiText("Novo alimento", "New food", "Nuevo alimento")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text3)"
    }
  }, uiText("Cadastre macros para reutilizar nas refeições.", "Save food macros to reuse in meals.", "Guarda macros para reutilizarlos en comidas."))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewFoodOpen(false),
    style: {
      background: "var(--btn-inactive)",
      border: "1px solid var(--btn-inactive-border)",
      color: "var(--muted)",
      borderRadius: 999,
      width: 34,
      height: 34,
      cursor: "pointer",
      fontSize: 18,
      lineHeight: "30px"
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('foodName')), /*#__PURE__*/React.createElement("input", {
    value: form.name,
    onChange: e => setForm(f => ({
      ...f,
      name: e.target.value
    })),
    placeholder: text('foodNamePh'),
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 90
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('unit')), /*#__PURE__*/React.createElement("select", {
    value: form.unit,
    onChange: e => setForm(f => ({
      ...f,
      unit: e.target.value,
      unitWeightG: e.target.value === "un" ? f.unitWeightG : ""
    })),
    style: inp
  }, /*#__PURE__*/React.createElement("option", {
    value: "g"
  }, "g"), /*#__PURE__*/React.createElement("option", {
    value: "ml"
  }, "ml"), /*#__PURE__*/React.createElement("option", {
    value: "un"
  }, "un")))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: form.unit === "un" ? "var(--btn-ok)" : "var(--surface)",
      border: "1px solid " + (form.unit === "un" ? "var(--btn-ok-border)" : "var(--border2)"),
      borderRadius: 8,
      padding: "10px 12px",
      marginBottom: 8,
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "1fr auto",
      gap: 10,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: form.unit === "un" ? "var(--btn-ok-text)" : "var(--text2)",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 3
    }
  }, uiText("Cadastrar por unidade", "Register by unit", "Registrar por unidad")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      lineHeight: 1.4
    }
  }, uiText(
    "Use para pães, barras, bolachas e itens parecidos quando a tabela informa valores por 100g e você sabe o peso médio da unidade.",
    "Use this for breads, bars, cookies and similar items when the label gives values per 100g and you know the average unit weight.",
    "Úsalo para panes, barras, galletas y alimentos similares cuando la etiqueta informa valores por 100g y sabes el peso medio de cada unidad."
  ))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setForm(f => ({...f, unit: "un"})),
    style: sBtn(form.unit === "un" ? "transparent" : "var(--btn-info)", form.unit === "un" ? "var(--btn-ok-border)" : "var(--btn-info-border)", form.unit === "un" ? "var(--btn-ok-text)" : "var(--btn-info-text)")
  }, form.unit === "un" ? uiText("Ativo", "Active", "Activo") : uiText("Usar unidades", "Use units", "Usar unidades"))), /*#__PURE__*/React.createElement("button", {
    "data-tutorial": "barcode-scan-button",
    onClick: () => {
      setBarcodeModalOpen(true);
      setBarcodeMessage("");
    },
    style: {
      width: "100%",
      background: "var(--btn-ok)",
      border: "1px solid var(--btn-ok-border)",
      color: "var(--btn-ok-text)",
      padding: "9px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: "inherit",
      marginBottom: 8
    }
  }, uiText("Ler código de barras", "Scan barcode", "Leer código de barras")), barcodeModalOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: 12,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text2)",
      fontWeight: 600
    }
  }, uiText("Buscar por código de barras", "Barcode lookup", "Buscar por código de barras")), /*#__PURE__*/React.createElement("button", {
    onClick: closeBarcodeModal,
    style: {
      background: "none",
      border: "none",
      color: "var(--muted)",
      cursor: "pointer",
      fontSize: 18
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("video", {
    ref: videoRef,
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
  }), /*#__PURE__*/React.createElement("button", {
    onClick: barcodeScanning ? stopBarcodeScanner : startBarcodeScanner,
    disabled: barcodeLoading,
    style: {
      ...sBtn(barcodeScanning ? "var(--btn-warn)" : "var(--btn-ok)", barcodeScanning ? "var(--btn-warn-border)" : "var(--btn-ok-border)", barcodeScanning ? "var(--btn-warn-text)" : "var(--btn-ok-text)"),
      width: "100%",
      marginBottom: 8
    }
  }, barcodeScanning ? uiText("Parar câmera", "Stop camera", "Detener cámara") : uiText("Usar câmera", "Use camera", "Usar cámara")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: barcodeInput,
    onChange: e => setBarcodeInput(e.target.value.replace(/\D/g, "")),
    inputMode: "numeric",
    placeholder: uiText("Número do código", "Barcode number", "Número del código"),
    style: {
      ...inp,
      flex: 1,
      marginTop: 0
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => fetchBarcodeProduct(),
    disabled: barcodeLoading,
    style: {
      ...sBtn("var(--btn-teal)", "var(--btn-teal-border)", "var(--btn-teal-text)"),
      minWidth: 86
    }
  }, barcodeLoading ? uiText("Buscando", "Searching", "Buscando") : uiText("Buscar", "Search", "Buscar"))), barcodeMessage && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 12,
      color: "var(--muted)",
      lineHeight: 1.45
    }
  }, barcodeMessage)), /*#__PURE__*/React.createElement("button", {
    onClick: searchFoodDatabase,
    disabled: foodDbLoading,
    style: {
      width: "100%",
      background: "var(--btn-teal)",
      border: "1px solid var(--btn-teal-border)",
      color: foodDbLoading ? "var(--muted)" : "var(--btn-teal-text)",
      padding: "9px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: foodDbLoading ? "default" : "pointer",
      fontFamily: "inherit",
      marginBottom: 8
    }
  }, foodDbLoading
    ? uiText("Buscando na base...", "Searching database...", "Buscando en la base...")
    : uiText("Buscar na base nutricional", "Search nutrition database", "Buscar en la base nutricional")), /*#__PURE__*/React.createElement("button", {
    onClick: autoFillNutrition,
    disabled: autoFillLoading,
    style: {
      width: "100%",
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: autoFillLoading ? "var(--muted)" : "var(--btn-info-text)",
      padding: "9px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: autoFillLoading ? "default" : "pointer",
      fontFamily: "inherit",
      marginBottom: 10
    }
  }, autoFillLoading ? uiText("Buscando...", "Searching...", "Buscando...") : text('autofillBtn')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 8,
      marginTop: 12
    }
  }, text('macros') + ' (' + (form.unit === 'un' && parseFloat(form.unitWeightG||'0') > 0 ? uiText('por 100g \u2192 por unidade', 'per 100g \u2192 per unit', 'por 100g \u2192 por unidad') : portionLabel(form.unit, lang)) + ')' + ((form.unit === 'g' || form.unit === 'ml') && parseFloat(form.portionSize||'100') !== 100 ? ' \u2192 base 100' + form.unit : ''), " "),
  /* Porção base é só para g e ml */
  (form.unit === 'g' || form.unit === 'ml') && /*#__PURE__*/React.createElement("div", {
    style: { marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border2)' }
  },
    /*#__PURE__*/React.createElement("span", { style: { fontSize: 14, color: 'var(--text2)', flex: 1 } },
      uiText('Valores para uma porção de:', 'Values for a portion of:', 'Valores para una porción de:')
    ),
    /*#__PURE__*/React.createElement("input", {
      type: 'number', min: 1, max: 2000,
      value: form.portionSize,
      onChange: e => setForm(ff => ({ ...ff, portionSize: e.target.value })),
      style: { ...inp, width: 70, marginBottom: 0, textAlign: 'center' }
    }),
    /*#__PURE__*/React.createElement("span", { style: { fontSize: 14, color: 'var(--text2)' } }, form.unit)
  ),
  form.unit === 'un' && /*#__PURE__*/React.createElement("div", {
    style: { marginBottom: 10, display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1fr 120px',
      gap: 10, alignItems: 'end', background: 'var(--bg)', borderRadius: 8,
      padding: '8px 12px', border: '1px solid var(--border2)' }
  },
    /*#__PURE__*/React.createElement("div", null,
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 14, color: 'var(--text2)', lineHeight: 1.35 } },
        uiText('Opcional: peso médio da unidade', 'Optional: average unit weight', 'Opcional: peso medio de la unidad')
      ),
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: 'var(--muted)', lineHeight: 1.35, marginTop: 2 } },
        uiText(
          'Preencha apenas quando os valores acima estiverem por 100g. O app salvará o alimento como 1 unidade.',
          'Fill this only when the label values above are per 100g. The app will save the food as one unit.',
          'Rellena esto solo cuando los valores anteriores estén por 100g. La app guardará el alimento como 1 unidad.'
        )
      )
    ),
    /*#__PURE__*/React.createElement("div", null,
      /*#__PURE__*/React.createElement("input", {
        type: 'number', min: 1, step: '0.1',
        value: form.unitWeightG || '',
        onChange: e => setForm(ff => ({ ...ff, unitWeightG: e.target.value })),
        placeholder: '25',
        style: { ...inp, marginTop: 0, textAlign: 'center' }
      }),
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 3 } }, 'g/un')
    )
  ),
  /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }
  }, MACRO_FIELDS_ORDERED.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.key,
    style: { flex: "1 1 calc(50% - 4px)", minWidth: 120 }
  }, /*#__PURE__*/React.createElement("label", {
    style: Object.assign({}, lbl, { color: f.sub ? "var(--dim)" : f.required ? "#888" : "#555" },
      f.sub ? { paddingLeft: 8, borderLeft: "2px solid var(--border2)", display: "block" } : {})
  }, f.sub ? "\u21B3 " + f.label : f.label, f.required ? " *" : ""), /*#__PURE__*/React.createElement("input", {
    type: "number", value: form[f.key],
    onChange: e => setForm(ff => ({ ...ff, [f.key]: e.target.value })),
    placeholder: f.unit, style: inp
  })))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMicroForm(m => !m),
    style: {
      background: "none",
      border: "1px solid var(--border2)",
      color: "var(--muted)",
      width: "100%",
      padding: "7px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      marginBottom: 8
    }
  }, showMicroForm ? text('hideMicro') : text('showMicro')), showMicroForm && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginBottom: 10
    }
  }, MICRO_FIELDS.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.key,
    style: {
      flex: "1 1 calc(50% - 4px)",
      minWidth: 120
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      ...lbl,
      color: "var(--dim)"
    }
  }, f.label, " (", f.unit, ")"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: form[f.key],
    onChange: e => setForm(ff => ({
      ...ff,
      [f.key]: e.target.value
    })),
    placeholder: f.unit,
    style: inp
  })))), /*#__PURE__*/React.createElement("button", {
    "data-tutorial": "pantry-save-button",
    onClick: addFood,
    style: btn
  }, text('savePantry'))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "pantry-saved-foods",
    style: {
      marginTop: 24,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      marginBottom: pantryItemsOpen ? 10 : 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPantryItemsOpen(v => !v),
    style: {
      flex: 1,
      background: "none",
      border: "none",
      padding: 0,
      textAlign: "left",
      cursor: "pointer",
      fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--dim)",
      textTransform: "uppercase"
    }
  }, pantryItemsOpen ? "▼ " : "▶ ", text('pantryTitle'), " (", pantry.length, ")"))), pantryItemsOpen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    value: pantrySearch,
    onChange: e => setPantrySearch(e.target.value),
    placeholder: text('pantrySearch'),
    style: {
      ...inp,
      marginBottom: 10,
      display: "none"
    }
  }), filteredPantry.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center",
      marginTop: 12
    }
  }, pantrySearch ? text('noResults') : text('pantryEmpty')), sortedPantry.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.id,
    style: {
      borderBottom: "1px solid var(--border3)",
      padding: "8px 6px"
    }
  }, editingId === f.id ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('suppNameLabel')), /*#__PURE__*/React.createElement("input", {
    value: editForm.name,
    onChange: e => setEditForm(ef => ({
      ...ef,
      name: e.target.value
    })),
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 90
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('unit')), /*#__PURE__*/React.createElement("select", {
    value: editForm.unit,
    onChange: e => setEditForm(ef => ({
      ...ef,
      unit: e.target.value
    })),
    style: inp
  }, /*#__PURE__*/React.createElement("option", {
    value: "g"
  }, "g"), /*#__PURE__*/React.createElement("option", {
    value: "ml"
  }, "ml"), /*#__PURE__*/React.createElement("option", {
    value: "un"
  }, "un")))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 6
    }
  }, text('macros') + ' (' + portionLabel(editForm.unit, lang) + ')', " "), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginBottom: 6
    }
  }, MACRO_FIELDS.filter(ff => !ff.sub).map(ff => /*#__PURE__*/React.createElement("div", {
    key: ff.key,
    style: {
      flex: "1 1 calc(50% - 4px)",
      minWidth: 110
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      ...lbl,
      color: ff.required ? "#888" : "#555"
    }
  }, ff.label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editForm[ff.key],
    onChange: e => setEditForm(ef => ({
      ...ef,
      [ff.key]: e.target.value
    })),
    style: inp
  }))), MACRO_FIELDS.filter(ff => ff.sub).map(ff => /*#__PURE__*/React.createElement("div", {
    key: ff.key,
    style: {
      flex: "1 1 calc(50% - 4px)",
      minWidth: 110
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      ...lbl,
      color: "var(--dim)"
    }
  }, ff.label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editForm[ff.key],
    onChange: e => setEditForm(ef => ({
      ...ef,
      [ff.key]: e.target.value
    })),
    style: inp
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: saveEdit,
    style: {
      ...btn,
      flex: 1,
      marginTop: 0
    }
  }, text('pantrySave')), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setEditingId(null);
      setEditForm(null);
    },
    style: {
      flex: 1,
      background: "none",
      border: "1px solid var(--border2)",
      color: "var(--muted)",
      padding: "10px",
      borderRadius: 6,
      fontSize: 14,
      textTransform: "uppercase",
      cursor: "pointer"
    }
  }, "Cancelar"))) : /*#__PURE__*/React.createElement("div", {
    "data-pantry-food": "true",
    style: {
      padding: "9px 17px",
      display: "flex",
      gap: 10,
      justifyContent: "space-between",
      alignItems: "flex-start",
      flexWrap: isMobileView ? "wrap" : "nowrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setExpandedPantryIds(current => ({...current, [f.id]: !current[f.id]})),
    "aria-expanded": !!expandedPantryIds[f.id],
    style: {
      flex: "1 1 260px",
      minWidth: 0,
      background: "none",
      border: "none",
      padding: 0,
      textAlign: "left",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text2)",
      marginBottom: 2
    }
  }, f.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      lineHeight: 1.45
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {fontSize: 13, color: "var(--accent-protein-text)"}
  }, f.protein100 || 0, "g ", uiText("proteína", "protein", "proteína")), /*#__PURE__*/React.createElement("span", {
    style: {fontSize: 13, color: "var(--accent-kcal-text)"}
  }, f.kcal100 || 0, " kcal"), /*#__PURE__*/React.createElement("span", {
    style: {fontSize: 12, color: "var(--dim)", marginLeft: "auto"}
  }, expandedPantryIds[f.id] ? "▲" : "▼")), /*#__PURE__*/React.createElement("div", {
    "data-pantry-expanded-nutrients": "true",
    style: {
      maxHeight: expandedPantryIds[f.id] ? 420 : 0,
      opacity: expandedPantryIds[f.id] ? 1 : 0,
      overflow: "hidden",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
      columnGap: 14,
      rowGap: 12,
      lineHeight: 1.45,
      marginTop: expandedPantryIds[f.id] ? 8 : 0,
      padding: expandedPantryIds[f.id] ? "12px 0 14px" : 0,
      transition: "max-height var(--dur-base) var(--ease-spring), opacity var(--dur-base) var(--ease-spring), margin-top var(--dur-base) var(--ease-spring), padding var(--dur-base) var(--ease-spring)"
    }
  }, ALL_FIELDS.filter(ff => ff.key !== "protein100" && ff.key !== "kcal100" && f[ff.key] != null).map(ff => /*#__PURE__*/React.createElement("span", {
    key: ff.key,
    style: {
      fontSize: 14,
      color: "var(--muted)"
    }
  }, (ff.label || ff.key).replace('', "").replace('', "").replace("of which ", ""), " ", f[ff.key], ff.unit)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--dim)"
    }
  }, portionLabel(f.unit, lang)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 5,
      flexShrink: 0,
      marginLeft: isMobileView ? 0 : 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: event => { event.stopPropagation(); startEdit(f); },
    style: {
      background: "none",
      border: "1px solid var(--border2)",
      color: "var(--muted)",
      borderRadius: 4,
      padding: "3px 8px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, text('editItem')), /*#__PURE__*/React.createElement("button", {
    onClick: event => { event.stopPropagation(); removeFood(f.id); },
    style: {
      background: "none",
      border: "1px solid var(--border3)",
      color: "var(--dim)",
      borderRadius: 4,
      padding: "3px 8px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, "\xD7"))))))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "pantry-meal-templates",
    style: {
      marginTop: 12,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMealTemplatesOpen(v => !v),
    style: {
      width: "100%",
      background: "none",
      border: "none",
      padding: 0,
      textAlign: "left",
      cursor: "pointer",
      fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--dim)",
      textTransform: "uppercase"
    }
  }, mealTemplatesOpen ? "▼ " : "▶ ", uiText("Refeições salvas", "Saved meals", "Comidas guardadas"), " (", mealTemplates.length, ")")), mealTemplatesOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, mealTemplates.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center",
      padding: "10px 0"
    }
  }, uiText("Nenhuma refeição salva.", "No saved meals.", "No hay comidas guardadas.")) : mealTemplates.map(tmpl => renderSavedMealCard(tmpl, "pantry")))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "pantry-supplements",
    style: {
      marginTop: 12,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSuppPantryOpen(v => !v),
    style: {
      flex: 1,
      background: "none",
      border: "none",
      padding: 0,
      textAlign: "left",
      cursor: "pointer",
      fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase"
    }
  }, suppPantryOpen ? "\u25BE " : "\u25B8 ", `\uD83D\uDC8A ${text('suppPantryTitle')} (${suppPantry.length})`)), /*#__PURE__*/React.createElement("button", {
    onClick: () => { setSuppPantryOpen(true); setShowSuppForm(s => !s); },
    title: showSuppForm
      ? uiText("Fechar formulário", "Close supplement form", "Cerrar formulario")
      : uiText("Adicionar suplemento", "Add supplement", "Añadir suplemento"),
    style: sBtn("var(--btn-info)", "var(--btn-info-border)", "#9090c8", isMobileView ? {
      padding: "5px 8px",
      fontSize: 10,
      letterSpacing: 0.5,
      whiteSpace: "nowrap"
    } : {})
  }, isMobileView ? (showSuppForm ? "\u25B2" : "+") : showSuppForm
    ? uiText("\u25B2 fechar", "\u25B2 close", "\u25B2 cerrar")
    : uiText("+ adicionar", "+ add", "+ añadir"))), suppPantryOpen && showSuppForm && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 6,
      padding: "12px",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 2
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('suppNameLabel')), /*#__PURE__*/React.createElement("input", {
    value: suppForm.name,
    onChange: e => setSuppForm(f => ({
      ...f,
      name: e.target.value
    })),
    placeholder: uiText("ex: Creatina", "e.g. Creatine", "ej.: Creatina"),
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "none"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('suppDoseLabel')), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: suppForm.dose,
    onChange: e => setSuppForm(f => ({
      ...f,
      dose: e.target.value
    })),
    placeholder: "5",
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 80
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('unit')), /*#__PURE__*/React.createElement("select", {
    value: suppForm.unit,
    onChange: e => setSuppForm(f => ({
      ...f,
      unit: e.target.value
    })),
    style: inp
  }, /*#__PURE__*/React.createElement("option", {
    value: "g"
  }, "g"), /*#__PURE__*/React.createElement("option", {
    value: "mg"
  }, "mg"), /*#__PURE__*/React.createElement("option", {
    value: "\xB5g"
  }, "\xB5g"), /*#__PURE__*/React.createElement("option", {
    value: "ml"
  }, "ml"), /*#__PURE__*/React.createElement("option", {
    value: "un"
  }, "un"), /*#__PURE__*/React.createElement("option", {
    value: "c\xE1ps"
  }, "c\xE1ps")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Notas (opcional)", "Notes (optional)", "Notas (opcional)")), /*#__PURE__*/React.createElement("input", {
    value: suppForm.notes,
    onChange: e => setSuppForm(f => ({
      ...f,
      notes: e.target.value
    })),
    placeholder: uiText("ex: tomar com água, em jejum...", "e.g. take with water, fasting...", "ej.: tomar con agua, en ayunas..."),
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      padding: "10px 12px",
      border: "1px solid var(--border3)",
      borderRadius: 8,
      background: "var(--surface)",
      display: "none",
      gridTemplateColumns: isMobileView ? "1fr" : "repeat(3, 1fr)",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { gridColumn: isMobileView ? "auto" : "1 / -1", color: "var(--muted)", fontSize: 12, lineHeight: 1.4 }
  }, uiText(
    "Dados opcionais de composição corporal. Use como tendência, não como diagnóstico exato.",
    "Optional body-composition data. Use it as a trend, not as an exact diagnosis.",
    "Datos opcionales de composición corporal. Úsalos como tendencia, no como diagnóstico exacto."
  )), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Gordura corporal %", "Body fat %", "Grasa corporal %")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "70",
    step: "0.1",
    value: weightForm.bodyFatPct,
    onChange: e => setWeightForm(f => ({...f, bodyFatPct: e.target.value})),
    placeholder: bodyComposition.currentFatPct ? String(Math.round(bodyComposition.currentFatPct * 10) / 10) : "",
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Cintura (cm)", "Waist (cm)", "Cintura (cm)")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "30",
    step: "0.1",
    value: weightForm.waistCm,
    onChange: e => setWeightForm(f => ({...f, waistCm: e.target.value})),
    placeholder: bodyComposition.latest?.waistCm ? String(bodyComposition.latest.waistCm) : "",
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Massa muscular (kg)", "Muscle mass (kg)", "Masa muscular (kg)")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    step: "0.1",
    value: weightForm.muscleMassKg,
    onChange: e => setWeightForm(f => ({...f, muscleMassKg: e.target.value})),
    placeholder: bodyComposition.latest?.muscleMassKg ? String(bodyComposition.latest.muscleMassKg) : "",
    style: inp
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: addSuppToPantry,
    style: btn
  }, text('suppSave'))), suppPantryOpen && suppPantry.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center",
      padding: "10px 0"
    }
  }, uiText("Nenhum suplemento adicionado.", "No supplements added.", "No hay suplementos añadidos.")), suppPantryOpen && suppPantry.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 6px",
      borderBottom: "1px solid var(--border3)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text2)"
    }
  }, s.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      marginTop: 2
    }
    }, text('defaultDose'), " ", s.dose, s.unit, s.notes ? " · " + s.notes : "")), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeSuppPantry(s.id),
    style: {
      background: "none",
      border: "1px solid var(--border3)",
      color: "var(--dim)",
      borderRadius: 4,
      padding: "3px 8px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, "\xD7"))))), tab === "semana" && /*#__PURE__*/React.createElement("div", {
    "data-screen": "semana"
  }, weekData.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      color: "var(--faint)",
      fontSize: 14,
      marginTop: 40,
      fontStyle: "italic"
    }
  }, text('loading')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "week-summary",
    style: {
      display: "grid",
      gridTemplateColumns: calorieBankDays.length ? (isMobileView ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))") : "repeat(3, minmax(0, 1fr))",
      gap: 0,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      margin: "0 16px 16px",
      overflow: "hidden"
    }
  }, [{
    l: text('avgProtein'),
    v: `${avgProtein}g`,
    c: "var(--accent-protein-text)",
    bg: "var(--accent-protein-bg)"
  }, {
    l: text('avgCalories'),
    v: String(avgKcal),
    c: "var(--accent-kcal-text)",
    bg: "var(--accent-kcal-bg)"
  }, {
    l: text('daysProtGoal'),
    v: `${daysMetProtein}/${daysWithData.length}`,
    c: "var(--accent-protein-text)",
    bg: "var(--accent-protein-bg)"
  }, {
    l: uiText("Banco de calorias", "Calorie bank", "Banco de calorías"),
    v: calorieBankDays.length ? `${calorieBank > 0 ? "+" : ""}${calorieBank} kcal` : "—",
    c: calorieBank >= 0 ? "var(--accent-kcal-text)" : "var(--accent-danger-text)",
    bg: "var(--accent-kcal-bg)",
    detail: `${calorieBankDays.length}/7 ${uiText("dias registrados", "logged days", "días registrados")}`
  }].filter(x => x.v !== "—").map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: x.l,
    style: {
      flex: 1,
      padding: "12px 8px",
      textAlign: "center",
      background: x.bg,
      borderRight: !isMobileView && i < 3 ? "1px solid var(--border)" : i % 2 === 0 ? "1px solid var(--border)" : "none",
      borderBottom: isMobileView && i < 2 ? "1px solid var(--border)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      color: x.c
    }
  }, x.v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      letterSpacing: 1,
      marginTop: 3,
      textTransform: "uppercase"
    }
  }, x.l), x.detail && /*#__PURE__*/React.createElement("div", {style: {fontSize: 11, color: "var(--dim)", marginTop: 6}}, x.detail), i === 2 && /*#__PURE__*/React.createElement("div", {
    title: uiText("Meta de proteína por dia", "Protein goal by day", "Meta de proteína por día"),
    style: {
      display: "flex",
      justifyContent: "center",
      gap: 4,
      marginTop: 8
    }
  }, weekData.filter(d => !d.isToday).slice(-7).map(d => /*#__PURE__*/React.createElement("span", {
    key: d.date,
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: d.hasData && d.metProtein ? "var(--btn-ok-text)" : "var(--border2)",
      display: "inline-block"
    }
  })))))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "week-days",
    style: {
      display: "flex",
      gap: 10,
      overflowX: "auto",
      padding: "0 16px 10px",
      margin: "0 auto 16px",
      justifyContent: "center",
      boxSizing: "border-box",
      maxWidth: "100%"
    }
  }, weekData.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.date,
    onClick: () => {
      setTab("diario");
      changeViewDate(d.date);
    },
    style: {
      minWidth: 68,
      background: d.isToday ? "var(--btn-ok)" : "var(--surface3)",
      border: `1px solid ${d.isToday ? "var(--btn-ok-border)" : "var(--border)"}`,
      borderRadius: 8,
      padding: "10px 6px",
      textAlign: "center",
      cursor: "pointer",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      textTransform: "uppercase"
    }
  }, d.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: d.hasData ? d.metProtein ? "var(--btn-ok-text)" : "#c8a96e" : "var(--dim)",
      marginTop: 6,
      fontWeight: 600
    }
  }, d.hasData ? `${d.protein}g` : "—"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: d.hasData ? "#8ec8c8" : "var(--dim)",
      marginTop: 2
    }
  }, d.hasData ? d.kcal : ""), d.hasData && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: d.metProtein ? "var(--btn-ok-text)" : "var(--muted)",
      margin: "6px auto 0"
    }
  })))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "week-protein-chart",
    style: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "14px",
      margin: "0 16px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 10
    }
  }, uiText("Proteína (g) \u2014 últimos 7 dias", "Protein (g) \u2014 last 7 days", "Proteína (g) \u2014 últimos 7 días")), /*#__PURE__*/React.createElement(ResponsiveContainer, {
    width: "100%",
    height: 130
  }, /*#__PURE__*/React.createElement(LineChart, {
    data: weekData
  }, /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "label",
    tick: {
      fontSize: 14,
      fill: CT.tick
    },
    axisLine: false,
    tickLine: false
  }), /*#__PURE__*/React.createElement(YAxis, {
    tick: {
      fontSize: 14,
      fill: CT.tick
    },
    axisLine: false,
    tickLine: false,
    domain: [0, "auto"],
    width: 30
  }), /*#__PURE__*/React.createElement(Tooltip, {
    contentStyle: {
      background: CT.bg,
      border: "1px solid " + CT.border,
      borderRadius: 4,
      fontSize: 14,
      color: CT.label
    },
    labelStyle: {
      color: CT.label
    },
    itemStyle: {
      color: "#c8a96e"
    },
    formatter: v => [`${v}g`, text('protein')]
  }), latestWeekPoint && /*#__PURE__*/React.createElement(ReferenceLine, {
    y: latestWeekPoint.proteinGoal,
    stroke: "#c8a96e",
    strokeDasharray: "3 3",
    strokeOpacity: 0.65,
    label: {
      value: uiText("meta ", "goal ", "meta ") + latestWeekPoint.proteinGoal + "g",
      fill: CT.label,
      fontSize: 11,
      position: "insideTopRight",
      dx: -10,
      dy: -8
    }
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "proteinPastLine",
    stroke: "#c8a96e",
    strokeWidth: 2,
    dot: {
      fill: "#c8a96e",
      r: 3
    },
    activeDot: {
      r: 5
    },
    connectNulls: false
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "proteinTodayLine",
    stroke: "#c8a96e",
    strokeWidth: 2,
    strokeDasharray: "5 5",
    dot: {
      fill: "#c8a96e",
      r: 3
    },
    activeDot: {
      r: 5
    },
    connectNulls: false
  })))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "week-calories-chart",
    style: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "14px",
      margin: "0 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 10
    }
  }, uiText("Calorias \u2014 últimos 7 dias", "Calories \u2014 last 7 days", "Calorías \u2014 últimos 7 días")), /*#__PURE__*/React.createElement(ResponsiveContainer, {
    width: "100%",
    height: 130
  }, /*#__PURE__*/React.createElement(LineChart, {
    data: weekData
  }, /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "label",
    tick: {
      fontSize: 14,
      fill: CT.tick
    },
    axisLine: false,
    tickLine: false
  }), /*#__PURE__*/React.createElement(YAxis, {
    tick: {
      fontSize: 14,
      fill: CT.tick
    },
    axisLine: false,
    tickLine: false,
    domain: [0, "auto"],
    width: 35
  }), /*#__PURE__*/React.createElement(Tooltip, {
    contentStyle: {
      background: CT.bg,
      border: "1px solid " + CT.border,
      borderRadius: 4,
      fontSize: 14,
      color: CT.label
    },
    labelStyle: {
      color: CT.label
    },
    itemStyle: {
      color: "#8ec8c8"
    },
    formatter: v => [`${v} kcal`, text('calories')]
  }), latestWeekPoint && /*#__PURE__*/React.createElement(ReferenceLine, {
    y: latestWeekPoint.kcalGoal,
    stroke: "#8ec8c8",
    strokeDasharray: "3 3",
    strokeOpacity: 0.65,
    label: {
      value: uiText("meta ", "goal ", "meta ") + latestWeekPoint.kcalGoal + " kcal",
      fill: CT.label,
      fontSize: 11,
      position: "insideTopRight",
      dx: -10,
      dy: -8
    }
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "kcalPastLine",
    stroke: "#8ec8c8",
    strokeWidth: 2,
    dot: {
      fill: "#8ec8c8",
      r: 3
    },
    activeDot: {
      r: 5
    },
    connectNulls: false
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "kcalTodayLine",
    stroke: "#8ec8c8",
    strokeWidth: 2,
    strokeDasharray: "5 5",
    dot: {
      fill: "#8ec8c8",
      r: 3
    },
    activeDot: {
      r: 5
    },
    connectNulls: false
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--faint)",
      textAlign: "center",
      marginTop: 10,
      fontStyle: "italic"
    }
  }, uiText("Clica num dia para ver o detalhe", "Click a day to see details", "Haz clic en un día para ver el detalle")), Object.keys(mealAverages).length > 0 && /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "week-meal-averages",
    style: {
      margin: "20px 16px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 10
    }
  }, uiText("Médias por refeição (últimos 30 dias)", "Meal averages (last 30 days)", "Promedios por comida (últimos 30 días)")), Object.entries(mealAverages).sort((a, b) => b[1].avgProtein - a[1].avgProtein).map(([meal, d]) => {
    const maxProt = Math.max(1, ...Object.values(mealAverages).map(item => item.avgProtein || 0));
    const daysLabel = uiText(
      d.count + " dia" + (d.count !== 1 ? "s" : "") + " registrado" + (d.count !== 1 ? "s" : ""),
      d.count + " logged day" + (d.count !== 1 ? "s" : ""),
      d.count + " día" + (d.count !== 1 ? "s" : "") + " registrado" + (d.count !== 1 ? "s" : "")
    );
    return /*#__PURE__*/React.createElement("div", {
      key: meal,
      style: {
        marginBottom: 12,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "10px 14px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: "var(--text3)"
      }
    }, mealLabel(meal)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: "var(--muted)"
      }
    }, daysLabel)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 16,
        marginBottom: 6,
        fontSize: 11
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#c8a96e"
      }
    }, d.avgProtein, "g prot"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#8ec8c8"
      }
    }, d.avgKcal, " kcal"), d.avgCarbs > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#a96ec8"
      }
    }, d.avgCarbs, "g carbs"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--muted)",
        marginLeft: "auto"
      }
    }, Math.round(d.avgProtein / goals.protein * 100), uiText("% meta prot", "% protein goal", "% meta prot"))), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 4,
        background: "var(--track)",
        borderRadius: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: "100%",
        width: Math.min(d.avgProtein / maxProt * 100, 100) + "%",
        borderRadius: 4,
        background: "#c8a96e",
        transition: "width 0.4s ease"
      }
    })));
  })), weekData.some(d => d.hasData) && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      borderTop: "1px solid var(--border3)",
      paddingTop: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowExportPanel(showExportPanel === "week" ? null : "week"),
    style: {
      ...btn,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "var(--btn-info-text)",
      marginTop: 0,
      display: "none"
    }
  }, "\u2193 Exportar semana"), showExportPanel === "week" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 6,
      padding: "12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 8
    }
  }, "Escolha o formato"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6
    }
  }, [["json", "JSON", uiText("dados completos", "full data", "datos completos")], ["csv", "CSV", uiText("para Excel", "for Excel", "para Excel")], ["html", "HTML", uiText("relatório", "report", "informe")], ["txt", "TXT", uiText("texto simples", "plain text", "texto simple")]].map(([fmt, label, desc]) => /*#__PURE__*/React.createElement("button", {
    key: fmt,
    onClick: () => runExport("week", fmt),
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
      marginTop: 8,
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
      height: 100,
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
  }, exportResult.copied ? pickLang(lang, "Copiado!", "Copied!", "Copiado!") : pickLang(lang, "Copiar para área de transferência", "Copy to clipboard", "Copiar al portapapeles")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      borderTop: "1px solid var(--border3)",
      paddingTop: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: generateFoodPatterns,
    "data-action-insight": "true",
    disabled: patternsLoading,
    style: {
      width: "100%",
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: patternsLoading ? "#555" : "#c8a0e8",
      padding: "10px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: patternsLoading ? "default" : "pointer",
      fontFamily: "inherit"
    }
  }, patternsLoading ? text('analyzingPatterns') : text('aiPatterns')), patternsText && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      background: "var(--surface)",
      border: "1px solid var(--border2)",
      borderRadius: 8,
      padding: "14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 10
    }
  }, pickLang(lang, "Padrões — últimos 30 dias", "Patterns — last 30 days", "Patrones — últimos 30 días")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text3)",
      lineHeight: 1.7,
      whiteSpace: "pre-wrap"
    }
  }, patternsText), patternsSaved ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      fontSize: 14,
      color: "#3a6a3a",
      textAlign: "center",
      padding: "8px",
      background: "var(--btn-ok)",
      borderRadius: 6,
      border: "1px solid var(--btn-ok-border)"
    }
  }, pickLang(lang, "✓ Salvo nas notas", "✓ Saved to notes", "✓ Guardado en notas")) : /*#__PURE__*/React.createElement("button", {
    onClick: savePatterns,
    style: {
      ...btn,
      marginTop: 12,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "#7e9ec8",
      fontSize: 14,
      letterSpacing: 1
    }
  }, text('savedNote'))), weekData.some(d => d.hasData) && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => generateFeedback("week"),
    "data-action-insight": "true",
    disabled: feedbackLoading && feedbackPeriod === "week",
    style: {
      width: "100%",
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: feedbackLoading && feedbackPeriod === "week" ? "#555" : "#c8a0e8",
      padding: "10px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: "inherit"
    }
  }, feedbackLoading && feedbackPeriod === "week" ? text('analyzing') : text('aiAnalyzeWeek')), feedbackText && feedbackPeriod === "week" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      background: "var(--surface)",
      border: "1px solid var(--border2)",
      borderRadius: 8,
      padding: "14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 10
    }
  }, pickLang(lang, "Feedback semanal", "Weekly feedback", "Feedback semanal")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text3)",
      lineHeight: 1.7,
      whiteSpace: "pre-wrap"
    }
  }, feedbackText), feedbackSaved ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      fontSize: 14,
      color: "#3a6a3a",
      textAlign: "center",
      padding: "8px",
      background: "var(--btn-ok)",
      borderRadius: 6,
      border: "1px solid var(--btn-ok-border)"
    }
  }, pickLang(lang, "✓ Já salvo nas notas", "✓ Already saved to notes", "✓ Ya guardado en notas")) : /*#__PURE__*/React.createElement("button", {
    onClick: saveFeedbackAsNote,
    style: {
      ...btn,
      marginTop: 12,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "#7e9ec8",
      fontSize: 14,
      letterSpacing: 1
    }
  }, pickLang(lang, "Salvar nas notas de hoje", "Save to today's notes", "Guardar en las notas de hoy"))))))), tab === "metricas" && /*#__PURE__*/React.createElement("div", {
    "data-screen": "metricas",
    style: {
      padding: isMobileView ? "0 0 calc(76px + env(safe-area-inset-bottom, 0px))" : "2px 16px 30px",
      boxSizing: "border-box",
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      margin: isMobileView ? "6px 0 12px" : "8px 0 16px"
    }
  }, [["tracking", pickLang(lang, "Acompanhamento", "Tracking", "Seguimiento")], ["goals", pickLang(lang, "Metas", "Goals", "Metas")]].map(([key, label]) => /*#__PURE__*/React.createElement("button", {
    key,
    onClick: () => setMetricsSection(key),
    style: {
      ...sBtn(metricsSection === key ? "var(--btn-ok)" : "transparent", metricsSection === key ? "var(--btn-ok-border)" : "var(--border2)", metricsSection === key ? "var(--btn-ok-text)" : "var(--muted)"),
      padding: "10px",
      fontWeight: metricsSection === key ? 700 : 500
    }
  }, label))), metricsSection === "goals" && /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "nutrition-profile",
    style: {
      margin: "4px 0 18px",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: isMobileView ? 12 : 8,
      padding: isMobileView ? "12px" : "14px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 6
    }
  }, pickLang(lang, "Perfil nutricional", "Nutrition profile", "Perfil nutricional")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--dim)",
      lineHeight: 1.45,
      marginBottom: 12
    }
  }, pickLang(lang, "Configure atividade, objetivo, meta de gordura, ajuste calórico e metas personalizadas usadas pelo app.", "Configure the activity, goal, body-fat target, calorie adjustment, and custom targets used by the app.", "Configura actividad, objetivo, meta de grasa corporal, ajuste calórico y metas personalizadas usadas por la app.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "repeat(3, minmax(180px, 1fr))",
      gap: 10,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Atividade física", "Physical activity", "Actividad física")), /*#__PURE__*/React.createElement("select", {
    value: nutritionPrefs.activityLevel || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, activityLevel: e.target.value}),
    style: inp
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, pickLang(lang, "Selecionar", "Select", "Seleccionar")), Object.entries(ACTIVITY_LEVELS).map(([key, data]) => /*#__PURE__*/React.createElement("option", {
    key,
    value: key
  }, pickLang(lang, data.pt + " - " + data.descPt, data.en + " - " + data.descEn, data.es + " - " + data.descEs))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Objetivo", "Goal", "Objetivo")), /*#__PURE__*/React.createElement("select", {
    value: nutritionPrefs.goalType || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, goalType: e.target.value}),
    style: inp
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, pickLang(lang, "Selecionar", "Select", "Seleccionar")), /*#__PURE__*/React.createElement("option", {
    value: "maintenance"
  }, pickLang(lang, "Manutenção", "Maintenance", "Mantenimiento")), /*#__PURE__*/React.createElement("option", {
    value: "loss"
  }, pickLang(lang, "Perda de peso", "Weight loss", "Pérdida de peso")), /*#__PURE__*/React.createElement("option", {
    value: "gain"
  }, pickLang(lang, "Ganho de peso", "Weight gain", "Ganancia de peso")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Altura do perfil (cm)", "Profile height (cm)", "Altura del perfil (cm)")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "80",
    max: "240",
    step: "0.1",
    value: profileData.height || "",
    onChange: e => saveProfileHeight(e.target.value),
    placeholder: currentHeight ? String(currentHeight) : text('heightPh'),
    style: inp
  })), nutritionPrefs.goalType === "loss" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Meta de gordura corporal %", "Target body fat %", "Meta de grasa corporal %")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "3",
    max: "60",
    step: "0.1",
    value: nutritionPrefs.bodyFatGoal || "",
    onChange: e => updateBodyFatGoalTarget(e.target.value),
    placeholder: bodyComposition.currentFatPct ? pickLang(lang, "abaixo de ", "below ", "por debajo de ") + (Math.round(bodyComposition.currentFatPct * 10) / 10) : pickLang(lang, "ex: 13", "e.g. 13", "ej: 13"),
    style: inp
  }), bodyFatGoalAutoKg && /*#__PURE__*/React.createElement("div", {
    style: { marginTop: 4, color: "var(--muted)", fontSize: 12 }
  }, pickLang(lang, "Estimativa auto: " + bodyFatGoalAutoKg + " kg a perder.", "Auto estimate: " + bodyFatGoalAutoKg + " kg to lose.", "Estimación automática: " + bodyFatGoalAutoKg + " kg por perder."))), (nutritionPrefs.goalType === "loss" || nutritionPrefs.goalType === "gain") && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, nutritionPrefs.goalType === "loss" ? pickLang(lang, "Kg a perder", "Kg to lose", "Kg por perder") : pickLang(lang, "Kg a ganhar", "Kg to gain", "Kg por ganar")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0.1",
    step: "0.1",
    value: nutritionPrefs.goalKg || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, goalKg: e.target.value}),
    placeholder: nutritionPrefs.goalType === "loss" && bodyFatGoalAutoKg ? "auto: " + bodyFatGoalAutoKg : "",
    style: inp
  })), (nutritionPrefs.goalType === "loss" || nutritionPrefs.goalType === "gain") && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Semanas", "Weeks", "Semanas")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    step: "1",
    value: nutritionPrefs.goalWeeks || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, goalWeeks: e.target.value}),
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Ajuste manual kcal/dia", "Manual adjustment kcal/day", "Ajuste manual kcal/día")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: nutritionPrefs.manualAdjustment || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, manualAdjustment: e.target.value}),
    placeholder: "auto: " + getGoalAdjustment(nutritionPrefs),
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Proteína g/kg", "Protein g/kg", "Proteína g/kg")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0.8",
    step: "0.1",
    value: nutritionPrefs.proteinMultiplier || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, proteinMultiplier: e.target.value}),
    placeholder: "auto: " + defaultProteinMultiplier(nutritionPrefs.goalType).toFixed(1),
    style: inp
  }))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "metrics-target-summary",
    style: {
      marginTop: 12,
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "repeat(5, minmax(140px, 1fr))",
      gap: 8
    }
  }, [{
    l: pickLang(lang, "TMB", "BMR", "TMB"),
    v: (baseGoals.bmr || "-") + " kcal",
    c: "#c8a96e"
  }, {
    l: pickLang(lang, "Base do dia", "Day base", "Base del día"),
    v: (calorieBase || "-") + " kcal",
    c: "#8ec8c8"
  }, {
    l: pickLang(lang, "Ajuste", "Adjustment", "Ajuste"),
    v: (calorieAdjustment > 0 ? "+" : "") + calorieAdjustment + " kcal",
    c: calorieAdjustment < 0 ? "#c86e8e" : "#6ec8a9"
  }, {
    l: pickLang(lang, "Meta final", "Final target", "Meta final"),
    v: goals.kcal + " kcal",
    c: "#8ec8c8"
  }, {
    l: pickLang(lang, "Proteína", "Protein", "Proteína"),
    v: goals.protein + "g",
    c: "#c8a96e"
  }].map(card => /*#__PURE__*/React.createElement("div", {
    key: card.l,
    style: {
      border: "1px solid var(--border3)",
      borderRadius: 8,
      background: "var(--bg)",
      padding: "10px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 11, letterSpacing: 1, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }
  }, card.l), /*#__PURE__*/React.createElement("div", {
    style: { color: card.c, fontSize: 16, fontWeight: 650 }
  }, card.v)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      borderTop: "1px solid var(--border3)",
      paddingTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 14, letterSpacing: 1, color: "var(--muted)", textTransform: "uppercase" }
  }, text('customGoals')), /*#__PURE__*/React.createElement("button", {
    onClick: editingGoals ? saveGoals : startEditGoals,
    style: sBtn("var(--btn-ok)", "var(--btn-ok-border)", "var(--btn-ok-text)")
  }, editingGoals ? pickLang(lang, "Salvar", "Save", "Guardar") : text('editGoals'))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr 1fr" : "repeat(7, minmax(90px, 1fr))",
      gap: 8
    }
  }, [{
    k: "protein",
    l: text('protein'),
    u: "g",
    c: "#c8a96e"
  }, {
    k: "kcal",
    l: text('calories'),
    u: text('kcalUnit'),
    c: "#8ec8c8"
  }, {
    k: "carbs",
    l: text('carbs'),
    u: "g",
    c: "#a96ec8"
  }, {
    k: "fat",
    l: text('fat'),
    u: "g",
    c: "#c86e8e"
  }, {
    k: "fiber",
    l: text('fiber'),
    u: "g",
    c: "#6ec8a9"
  }, {
    k: "salt",
    l: text('salt'),
    u: "g",
    c: "#888"
  }, {
    k: "water",
    l: text('water'),
    u: "ml",
    c: "#6ec8a9"
  }].map(item => editingGoals ? /*#__PURE__*/React.createElement("div", {
    key: item.k
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, item.l, " (", item.u, ")"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: goalDraft[item.k] || "",
    onChange: e => setGoalDraft(d => ({...d, [item.k]: e.target.value})),
    placeholder: "auto: " + (baseGoals[item.k] || ""),
    style: inp
  })) : /*#__PURE__*/React.createElement("div", {
    key: item.k,
    style: {
      border: "1px solid var(--border3)",
      borderRadius: 8,
      background: "var(--bg)",
      padding: "9px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }
  }, item.l), /*#__PURE__*/React.createElement("div", {
    style: { color: customGoals[item.k] ? "#c8a96e" : item.c, fontSize: 15, marginTop: 4 }
  }, goals[item.k] || baseGoals[item.k] || "-", item.u))))), calorieAdjustmentWarning && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: "8px 10px",
      border: "1px solid var(--notif-err-border)",
      background: "var(--notif-err-bg)",
      color: "var(--notif-err-text)",
      borderRadius: 6,
      fontSize: 12
    }
  }, calorieAdjustmentWarning)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: metricsSection === "tracking" ? "block" : "none",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 10
    }
  }, text('logMeasurements')), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "metrics-measures",
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Peso (kg)", "Weight (kg)", "Peso (kg)")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: weightForm.weight,
    onChange: e => setWeightForm(f => ({
      ...f,
      weight: e.target.value
    })),
    placeholder: currentWeight ? String(currentWeight) : text('weightPh'),
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "none"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Altura (cm)", "Height (cm)", "Altura (cm)")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: weightForm.height,
    onChange: e => setWeightForm(f => ({
      ...f,
      height: e.target.value
    })),
    placeholder: currentHeight ? String(currentHeight) : text('heightPh'),
    style: inp
  }))), /*#__PURE__*/React.createElement("div", {style:{marginTop:8}}, /*#__PURE__*/React.createElement("label", {style:lbl}, pickLang(lang, "Data", "Date", "Fecha")), /*#__PURE__*/React.createElement("input", {
    type: "date",
    max: TODAY,
    value: weightForm.date || TODAY,
    onChange: e => setWeightForm(f => ({...f, date: e.target.value})),
    style: {...inp, colorScheme:"dark"}
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      padding: "10px 12px",
      border: "1px solid var(--border3)",
      borderRadius: 8,
      background: "var(--surface)",
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "repeat(3, 1fr)",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: isMobileView ? "auto" : "1 / -1",
      color: "var(--muted)",
      fontSize: 12,
      lineHeight: 1.4
    }
  }, pickLang(lang, "Medidas opcionais de composição corporal para gráficos de tendência e estimativas.", "Optional body-composition measurements for trend charts and estimates.", "Medidas opcionales de composición corporal para gráficos de tendencia y estimaciones.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Gordura corporal %", "Body fat %", "Grasa corporal %")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "70",
    step: "0.1",
    value: weightForm.bodyFatPct,
    onChange: e => setWeightForm(f => ({...f, bodyFatPct: e.target.value})),
    placeholder: bodyComposition.currentFatPct ? String(Math.round(bodyComposition.currentFatPct * 10) / 10) : "",
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Cintura (cm)", "Waist (cm)", "Cintura (cm)")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "30",
    step: "0.1",
    value: weightForm.waistCm,
    onChange: e => setWeightForm(f => ({...f, waistCm: e.target.value})),
    placeholder: bodyComposition.latest?.waistCm ? String(bodyComposition.latest.waistCm) : "",
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Massa muscular (kg)", "Muscle mass (kg)", "Masa muscular (kg)")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    step: "0.1",
    value: weightForm.muscleMassKg,
    onChange: e => setWeightForm(f => ({...f, muscleMassKg: e.target.value})),
    placeholder: bodyComposition.latest?.muscleMassKg ? String(bodyComposition.latest.muscleMassKg) : "",
    style: inp
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: saveWeight,
    style: btn
  }, text('suppLogToday'))), currentWeight && /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "metrics-current",
    style: {
      display: metricsSection === "tracking" ? "block" : "none",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: isMobileView ? 12 : 8,
      padding: isMobileView ? "12px" : "14px 16px",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 12
    }
  }, uiText("Métricas atuais", "Current metrics", "Métricas actuales")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
      gap: 10
    }
  }, [{
    l: text('weight'),
    v: `${currentWeight} kg`,
    c: "#c8a96e"
  }, {
    l: text('heightLabel'),
    hide: true,
    v: currentHeight ? `${currentHeight} cm` : "—",
    c: "#8ec8c8"
  }, {
    l: "IMC",
    v: bmi || "—",
    sub: bmiNum < 18.5 ? text('bmiUnderweight') : bmiNum < 25 ? text('bmiNormal') : bmiNum < 30 ? text('bmiOverweight') : text('bmiObese'),
    c: bmiNum < 18.5 ? "#c86e8e" : bmiNum < 25 ? "#6ec8a9" : bmiNum < 30 ? "#c8a96e" : "#c86e8e"
  }, {
    l: "TMB",
    v: currentBmr ? `${currentBmr} kcal` : "—",
    c: "#8ec8c8"
  }, {
    l: text('goalProtTrain'),
    hide: true,
    v: `${computeGoals(currentWeight, true, {height: currentHeight, birthDate: profileData.birthDate, gender: profileData.gender, prefs: nutritionPrefs}).protein}g`,
    c: "#c8a96e"
  }, {
    l: text('goalProtRest'),
    hide: true,
    v: `${computeGoals(currentWeight, false, {height: currentHeight, birthDate: profileData.birthDate, gender: profileData.gender, prefs: nutritionPrefs}).protein}g`,
    c: "#a9c8a9"
  }, {
    l: text('goalKcalTrain'),
    hide: true,
    v: String(computeGoals(currentWeight, true, {height: currentHeight, birthDate: profileData.birthDate, gender: profileData.gender, prefs: nutritionPrefs}).kcal),
    c: "#8ec8c8"
  }, {
    l: text('goalKcalRest'),
    hide: true,
    v: String(computeGoals(currentWeight, false, {height: currentHeight, birthDate: profileData.birthDate, gender: profileData.gender, prefs: nutritionPrefs}).kcal),
    c: "#8ec8a9"
  }].filter(x => !x.hide && x.v !== "—").map(x => /*#__PURE__*/React.createElement("div", {
    key: x.l,
    style: {background: "var(--bg)", border: "1px solid var(--border3)", borderRadius: 8, padding: "10px 12px"}
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      letterSpacing: 1
    }
  }, x.l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: x.c,
      marginTop: 2
    }
  }, x.v), x.sub && /*#__PURE__*/React.createElement("div", {
    style: {fontSize: 12, color: "var(--text-secondary)", marginTop: 4}
  }, x.sub))))), weightChartData.length > 1 && /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "weight-chart",
    style: {
      display: metricsSection === "tracking" ? "block" : "none",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: isMobileView ? 12 : 8,
      padding: isMobileView ? "12px" : "14px",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 12
    }
  }, uiText("Evolução do peso", "Weight trend", "Evolución del peso")), /*#__PURE__*/React.createElement(ResponsiveContainer, {
    width: "100%",
    height: isMobileView ? 210 : 150
  }, /*#__PURE__*/React.createElement(LineChart, {
    data: weightChartData
  }, /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "date",
    tick: {
      fontSize: 14,
      fill: CT.tick
    },
    axisLine: false,
    tickLine: false
  }), /*#__PURE__*/React.createElement(YAxis, {
    tick: {
      fontSize: 14,
      fill: CT.tick
    },
    axisLine: false,
    tickLine: false,
    domain: ["auto", "auto"],
    width: 32
  }), /*#__PURE__*/React.createElement(Tooltip, {
    contentStyle: {
      background: CT.bg,
      border: "1px solid " + CT.border,
      borderRadius: 4,
      fontSize: 14,
      color: CT.label
    },
    labelStyle: {
      color: CT.label
    },
    itemStyle: {
      color: "#c8a96e"
    }
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "weight",
    stroke: "#c8a96e",
    strokeWidth: 2,
    dot: {
      fill: "#c8a96e",
      r: 3
    },
    activeDot: {
      r: 5
    }
  })))), bmrChartData.length > 1 && /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "bmr-chart",
    style: {
      display: metricsSection === "tracking" ? "block" : "none",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: isMobileView ? 12 : 8,
      padding: isMobileView ? "12px" : "14px",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {fontSize: 14, letterSpacing: 1, color: "var(--muted)", textTransform: "uppercase", marginBottom: 12}
  }, uiText("Evolução da TMB", "BMR trend", "Evolución de la TMB")), /*#__PURE__*/React.createElement(ResponsiveContainer, {
    width: "100%",
    height: isMobileView ? 210 : 150
  }, /*#__PURE__*/React.createElement(LineChart, {data: bmrChartData}, /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "date", tick: {fontSize: 14, fill: CT.tick}, axisLine: false, tickLine: false
  }), /*#__PURE__*/React.createElement(YAxis, {
    tick: {fontSize: 14, fill: CT.tick}, axisLine: false, tickLine: false, domain: ["auto", "auto"], width: 42
  }), /*#__PURE__*/React.createElement(Tooltip, {
    contentStyle: {background: CT.bg, border: "1px solid " + CT.border, borderRadius: 4, fontSize: 14, color: CT.label},
    labelStyle: {color: CT.label}, itemStyle: {color: "#8ec8c8"}, formatter: value => [value + " kcal", "TMB"]
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone", dataKey: "bmr", stroke: "#8ec8c8", strokeWidth: 2,
    dot: {fill: "#8ec8c8", r: 3}, activeDot: {r: 5}
  })))), bodyMetricChartConfigs.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: metricsSection === "tracking" ? "grid" : "none",
      gridTemplateColumns: isMobileView ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))",
      gap: 12,
      marginBottom: 14
    }
  }, bodyMetricChartConfigs.map(renderBodyMetricChart)), normalizeWeightHistory(weightHistory).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: metricsSection === "tracking" ? "block" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--dim)",
      textTransform: "uppercase",
      marginBottom: 8
    }
  }, uiText("Histórico", "History", "Historial")), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: "auto",
      maxHeight: 285,
      borderTop: "1px solid var(--border3)",
      borderBottom: "1px solid var(--border3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "none",
      gridTemplateColumns: isMobileView ? "92px 82px 72px 84px 86px 96px 84px 104px" : "1fr 1fr 1fr 1fr 1fr 1fr 1fr 120px",
      gap: 10,
      minWidth: isMobileView ? 740 : 0,
      alignItems: "center",
      padding: "8px 6px",
      fontSize: 11,
      letterSpacing: 1,
      color: "var(--dim)",
      textTransform: "uppercase",
      borderBottom: "1px solid var(--border3)",
      position: "sticky",
      top: 0,
      background: "var(--bg)",
      zIndex: 1
    }
  }, [uiText("Data", "Date", "Fecha"), uiText("Peso", "Weight", "Peso"), text('bmi'), uiText("Gordura", "Fat", "Grasa"), uiText("Músculo", "Muscle", "Músculo"), uiText("Cintura", "Waist", "Cintura"), uiText("Proteína", "Protein", "Proteína"), ""].map(label => /*#__PURE__*/React.createElement("span", {
    key: label || "actions"
  }, label))), [...normalizedWeightEntries].reverse().map(e => {
    const bE = e.height ? (e.weight / (e.height / 100) ** 2).toFixed(1) : null;
    const isEd = editingWeightId === e.date;
    return /*#__PURE__*/React.createElement("div", {
      key: e.date,
      "data-history-card": "true",
      style: {
        borderBottom: "none",
        padding: "0",
        marginBottom: 8
      }
    }, isEd ? /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "10px 0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("label", {
      style: lbl
    }, uiText("Data", "Date", "Fecha")), /*#__PURE__*/React.createElement("input", {
      type: "date",
      max: TODAY,
      value: editWeightForm.date,
      onChange: ev => setEditWeightForm(f => ({
        ...f,
        date: ev.target.value
      })),
      style: {
        ...inp,
        colorScheme: "dark"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("label", {
      style: lbl
    }, uiText("Peso (kg)", "Weight (kg)", "Peso (kg)")), /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: editWeightForm.weight,
      onChange: ev => setEditWeightForm(f => ({
        ...f,
        weight: ev.target.value
      })),
      style: inp
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("label", {
      style: lbl
    }, uiText("Altura (cm)", "Height (cm)", "Altura (cm)")), /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: editWeightForm.height,
      onChange: ev => setEditWeightForm(f => ({
        ...f,
        height: ev.target.value
      })),
      style: inp
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: isMobileView ? "1fr" : "repeat(3, 1fr)",
        gap: 8,
        marginBottom: 8
      }
    }, [["bodyFatPct", uiText("Gordura %", "Body fat %", "Grasa %")], ["waistCm", uiText("Cintura (cm)", "Waist (cm)", "Cintura (cm)")], ["muscleMassKg", uiText("Massa muscular (kg)", "Muscle mass (kg)", "Masa muscular (kg)")]].map(([key, label]) => /*#__PURE__*/React.createElement("div", {
      key
    }, /*#__PURE__*/React.createElement("label", {
      style: lbl
    }, label), /*#__PURE__*/React.createElement("input", {
      type: "number",
      step: "0.1",
      value: editWeightForm[key] || "",
      onChange: ev => setEditWeightForm(f => ({
        ...f,
        [key]: ev.target.value
      })),
      style: inp
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: saveWeightEdit,
      style: {
        ...btn,
        flex: 1,
        marginTop: 0,
        padding: "8px"
      }
    }, uiText("Salvar", "Save", "Guardar")), /*#__PURE__*/React.createElement("button", {
      onClick: () => setEditingWeightId(null),
      style: {
        flex: 1,
        background: "none",
        border: "1px solid var(--border2)",
        color: "var(--muted)",
        padding: "8px",
        borderRadius: 6,
        fontSize: 14,
        textTransform: "uppercase",
        cursor: "pointer"
      }
    }, uiText("Cancelar", "Cancel", "Cancelar")))) : /*#__PURE__*/React.createElement("div", {
      "data-history-entry": "true",
      "aria-expanded": !!expandedWeightHistoryIds[e.date]
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-history-row": "true",
      onClick: () => setExpandedWeightHistoryIds(current => ({...current, [e.date]: !current[e.date]})),
      "aria-expanded": !!expandedWeightHistoryIds[e.date],
      style: {
        width: "100%",
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: "10px 12px",
        background: "transparent",
        border: "none",
        color: "var(--text-primary)",
        cursor: "pointer",
        textAlign: "left"
      }
    }, /*#__PURE__*/React.createElement("span", null, formatDateDMY(e.date)), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: { color: "var(--text-muted)" }
    }, "—"), /*#__PURE__*/React.createElement("strong", {
      style: { fontWeight: 600 }
    }, e.weight, " kg"), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: { marginLeft: "auto", color: "var(--text-muted)" }
    }, expandedWeightHistoryIds[e.date] ? "▲" : "▼")), /*#__PURE__*/React.createElement("div", {
      "data-history-details": "true",
      style: {
        maxHeight: expandedWeightHistoryIds[e.date] ? 180 : 0,
        opacity: expandedWeightHistoryIds[e.date] ? 1 : 0,
        overflow: "hidden",
        transition: "max-height var(--dur-base) var(--ease-spring), opacity var(--dur-fast) var(--ease-spring)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 16px",
        padding: "4px 12px 12px",
        color: "var(--text-secondary)",
        fontSize: 12
      }
    }, historyFieldAvailability.bmi && bE && /*#__PURE__*/React.createElement("span", null, "IMC: ", bE), historyFieldAvailability.bodyFatPct && e.bodyFatPct && /*#__PURE__*/React.createElement("span", null, uiText("Gordura: ", "Fat: ", "Grasa: "), e.bodyFatPct, "%"), historyFieldAvailability.muscleMassKg && e.muscleMassKg && /*#__PURE__*/React.createElement("span", null, uiText("Músculo: ", "Muscle: ", "Músculo: "), e.muscleMassKg, " kg"), historyFieldAvailability.waistCm && e.waistCm && /*#__PURE__*/React.createElement("span", null, uiText("Cintura: ", "Waist: ", "Cintura: "), e.waistCm, " cm"), /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", gap: 6, flexBasis: "100%", marginTop: 2 }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => startEditWeight(e),
      style: { background: "transparent", border: "1px solid var(--text-muted)", color: "var(--text-secondary)", padding: "5px 10px", cursor: "pointer" }
    }, text('editItem')), /*#__PURE__*/React.createElement("button", {
      onClick: () => setWeightHistory(h => h.filter(x => x.date !== e.date)),
      "aria-label": uiText("Excluir registro", "Delete entry", "Eliminar registro"),
      style: { background: "transparent", border: "none", color: "var(--text-muted)", padding: "5px 10px", cursor: "pointer" }
    }, "\xD7"))))));
  }))), weightHistory.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center",
      marginTop: 20
    }
  }, text('noWeightData')), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "body-composition",
    style: {
      display: metricsSection === "tracking" ? "block" : "none",
      marginTop: 20,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: isMobileView ? 12 : 8,
      padding: isMobileView ? "12px" : "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setBodyCompositionOpen(v => !v),
    style: {
      width: "100%",
      background: "none",
      border: "none",
      padding: 0,
      cursor: "pointer",
      fontFamily: "inherit",
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 14, letterSpacing: 1, color: "var(--muted)", textTransform: "uppercase" }
  }, bodyCompositionOpen ? "▼ " : "▶ ", uiText("Composição corporal", "Body composition", "Composición corporal")), /*#__PURE__*/React.createElement("div", {
    style: { marginTop: 4, fontSize: 12, color: "var(--dim)", lineHeight: 1.35 }
  }, uiText("Medidas opcionais para acompanhar gordura corporal e cintura.", "Optional measurements for body-fat and waist trends.", "Medidas opcionales para seguir la grasa corporal y la cintura."))), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 12, color: "var(--muted)", flexShrink: 0 }
  }, bodyComposition.measured.length, uiText(" registros", " records", " registros")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))",
      gap: 8
    }
  }, [{
    l: uiText("Gordura corporal", "Body fat", "Grasa corporal"),
    v: bodyComposition.currentFatPct ? (Math.round(bodyComposition.currentFatPct * 10) / 10) + "%" : "—",
    c: "#c86e8e"
  }, {
    l: uiText("Gordura em kg", "Fat mass", "Grasa en kg"),
    v: bodyComposition.fatKg ? (Math.round(bodyComposition.fatKg * 10) / 10) + " kg" : "—",
    c: "#c8a96e"
  }, {
    l: uiText("Massa livre", "Lean mass", "Masa libre"),
    v: bodyComposition.leanMassKg ? (Math.round(bodyComposition.leanMassKg * 10) / 10) + " kg" : "—",
    c: "#6ec8a9"
  }, {
    l: uiText("Peso alvo estimado", "Target weight", "Peso objetivo estimado"),
    v: bodyComposition.weightTarget ? (Math.round(bodyComposition.weightTarget * 10) / 10) + " kg" : "—",
    c: "#8ec8c8"
  }].filter(card => card.v !== "—").map(card => /*#__PURE__*/React.createElement("div", {
    "data-body-composition-card": "true",
    key: card.l,
    style: {
      border: "1px solid var(--border3)",
      borderRadius: 8,
      padding: "10px 12px",
      background: "var(--bg)",
      minHeight: 58
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 11, letterSpacing: 1, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }
  }, card.l), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 17, color: card.c, fontWeight: 600 }
  }, card.v)))), bodyCompositionOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      borderTop: "1px solid var(--border3)",
      paddingTop: 12,
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: 14,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "none",
      gap: 8,
      background: "var(--bg)",
      border: "1px solid var(--border3)",
      borderRadius: 8,
      padding: "12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 13, fontWeight: 700, color: "var(--text2)" }
  }, uiText("Meta por gordura corporal", "Body-fat goal", "Meta por grasa corporal")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Gordura corporal atual %", "Current body fat %", "Grasa corporal actual %")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "3",
    max: "60",
    step: "0.1",
    value: bodyGoalForm.currentFatPct,
    onChange: e => setBodyGoalForm(f => ({...f, currentFatPct: e.target.value})),
    placeholder: bodyComposition.currentFatPct ? String(Math.round(bodyComposition.currentFatPct * 10) / 10) : uiText("ex: 15,2", "e.g. 15.2", "ej: 15,2"),
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Meta de gordura corporal %", "Target body fat %", "Meta de grasa corporal %")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "3",
    max: "60",
    step: "0.1",
    value: bodyGoalForm.targetFatPct,
    onChange: e => setBodyGoalForm(f => ({...f, targetFatPct: e.target.value})),
    placeholder: nutritionPrefs.bodyFatGoal || uiText("ex: 13", "e.g. 13", "ej: 13"),
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Semanas até a meta", "Weeks to target", "Semanas hasta la meta")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    step: "1",
    value: bodyGoalForm.weeks,
    onChange: e => setBodyGoalForm(f => ({...f, weeks: e.target.value})),
    placeholder: getSuggestedBodyGoalWeeks() ? String(getSuggestedBodyGoalWeeks()) : uiText("sugerido", "suggested", "sugerido"),
    style: inp
  }), getSuggestedBodyGoalWeeks() && /*#__PURE__*/React.createElement("div", {
    style: { color: "var(--muted)", fontSize: 12, lineHeight: 1.35, marginTop: 5 }
  }, uiText("Prazo saudável sugerido: cerca de ", "Suggested healthy pace: about ", "Plazo saludable sugerido: cerca de ") + getSuggestedBodyGoalWeeks() + uiText(" semanas.", " weeks.", " semanas."))), /*#__PURE__*/React.createElement("button", {
    onClick: saveBodyFatGoal,
    style: { ...btn, marginTop: 4 }
  }, uiText("Salvar meta de gordura", "Save body-fat goal", "Guardar meta de grasa")), /*#__PURE__*/React.createElement("div", {
    style: { color: "var(--muted)", fontSize: 12, lineHeight: 1.45, marginTop: 6 }
  }, uiText("Isso sincroniza a gordura estimada a perder e o prazo com sua meta nutricional.", "This syncs the estimated fat to lose and time frame with your nutrition goal.", "Esto sincroniza la grasa estimada por perder y el plazo con tu meta nutricional."))), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }
  }, bodyComposition.fatToLose ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", {
    style: { color: "var(--text2)" }
  }, uiText("Previsão", "Forecast", "Previsión")), /*#__PURE__*/React.createElement("br", null), uiText("Gordura estimada a perder: ", "Estimated fat to lose: ", "Grasa estimada por perder: ") + (Math.round(bodyComposition.fatToLose * 10) / 10) + " kg.", /*#__PURE__*/React.createElement("div", {
    style: { marginTop: 6, color: "var(--muted)" }
  }, bodyComposition.weeksRemaining
    ? uiText("Pela tendência recente de gordura, isso levaria cerca de ", "At the recent fat-mass trend, this would take about ", "Con la tendencia reciente de grasa, esto tomaría cerca de ") + (Math.round(bodyComposition.weeksRemaining * 10) / 10) + uiText(" semanas.", " weeks.", " semanas.")
    : uiText("Ainda não há tendência de gordura alinhada suficiente para estimar uma data.", "There is not enough aligned body-fat trend yet for a date estimate.", "Todavía no hay una tendencia de grasa corporal suficiente para estimar una fecha."))) : uiText("Registre gordura corporal e uma meta para liberar estimativas de gordura.", "Add body-fat percentage and a target to unlock fat-mass estimates.", "Registra grasa corporal y una meta para activar estimaciones de grasa."), bodyComposition.fatChartData.length > 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      height: isMobileView ? 230 : 180,
      border: "1px solid var(--border3)",
      borderRadius: 8,
      padding: "8px 8px 2px",
      background: "var(--bg)",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }
  }, uiText("Evolução da gordura corporal", "Body-fat evolution", "Evolución de la grasa corporal")), /*#__PURE__*/React.createElement(ResponsiveContainer, {
    width: "100%",
    height: isMobileView ? 190 : 140
  }, /*#__PURE__*/React.createElement(LineChart, {
    data: bodyComposition.fatChartData
  }, /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "label",
    stroke: "var(--muted)",
    tick: { fill: "var(--muted)", fontSize: 11 }
  }), /*#__PURE__*/React.createElement(YAxis, {
    stroke: "var(--muted)",
    tick: { fill: "var(--muted)", fontSize: 11 },
    domain: ["auto", "auto"],
    unit: "%"
  }), /*#__PURE__*/React.createElement(Tooltip, {
    contentStyle: { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" },
    formatter: v => [Math.round(v * 10) / 10 + "%", pickLang(lang, "Gordura corporal", "Body fat", "Grasa corporal")]
  }), bodyComposition.targetPct ? /*#__PURE__*/React.createElement(ReferenceLine, {
    y: bodyComposition.targetPct,
    stroke: "#8ec8c8",
    strokeDasharray: "4 4",
    label: { value: pickLang(lang, "Meta", "Target", "Meta"), fill: "var(--muted)", fontSize: 11 }
  }) : null, /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "bodyFatPct",
    stroke: "#c86e8e",
    strokeWidth: 2,
    dot: { r: 3 },
    activeDot: { r: 5 }
  }))))), bodyCompositionOpen && bodyComposition.measured.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: { marginTop: 10, display: "grid", gap: 6 }
  }, bodyComposition.measured.slice(-6).reverse().map(e => /*#__PURE__*/React.createElement("div", {
    key: "body-" + e.id,
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "space-between",
      borderTop: "1px solid var(--border3)",
      paddingTop: 6,
      fontSize: 12,
      color: "var(--muted)"
    }
  }, /*#__PURE__*/React.createElement("span", null, formatDateDMY(e.date)), /*#__PURE__*/React.createElement("span", null, e.bodyFatPct ? e.bodyFatPct + "%" : "—"), /*#__PURE__*/React.createElement("span", null, e.waistCm ? e.waistCm + "cm" : "—"), /*#__PURE__*/React.createElement("span", null, e.muscleMassKg ? e.muscleMassKg + "kg" : "—"))))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "metrics-progress",
    style: {
      display: metricsSection === "tracking" ? "block" : "none",
      marginTop: 20,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: isMobileView ? 12 : 8,
      padding: isMobileView ? "12px" : "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setMetricsProgressOpen(v => !v),
    "data-progress-heading": "true",
    role: "button",
    tabIndex: 0,
    style: {
      flex: "1 1 auto",
      minWidth: 0,
      background: "none",
      border: "none",
      padding: 0,
      cursor: "pointer",
      fontFamily: "inherit",
      textAlign: "left",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase"
    }
  }, metricsProgressOpen ? "▼ " : "▶ ", pickLang(lang, "Progresso e previsão", "Progress and forecast", "Progreso y previsión")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      fontSize: 12,
      color: "var(--dim)",
      lineHeight: 1.35
    }
  }, pickLang(lang, "Visão rolante dos dias concluídos, sem contar hoje.", "Rolling view of completed days, excluding today.", "Vista móvil de los días completados, sin contar hoy."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      setMetricsProgressInfoOpen(v => !v);
    },
    style: {
      background: metricsProgressInfoOpen ? "var(--btn-info)" : "var(--surface3)",
      border: "1px solid " + (metricsProgressInfoOpen ? "var(--btn-info-border)" : "var(--border3)"),
      color: metricsProgressInfoOpen ? "var(--btn-info-text)" : "var(--muted)",
      borderRadius: 999,
      padding: isMobileView ? "4px 8px" : "4px 10px",
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      fontFamily: "inherit",
      cursor: "pointer",
      whiteSpace: "nowrap"
    }
  }, pickLang(lang, "Mais info", "More info", "Más info"))), /*#__PURE__*/React.createElement("div", {
    "data-progress-grid": "true",
    style: {
      marginTop: 12,
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "repeat(auto-fit, minmax(130px, 1fr))",
      gap: 8
    }
  }, [{
    l: pickLang(lang, "Meta semanal", "Weekly target", "Meta semanal"),
    v: weeklyProgress.plannedWeek ? weeklyProgress.plannedWeek + " kcal" : "—",
    c: "#8ec8c8"
  }, {
    l: pickLang(lang, "Déficit", "Deficit", "Déficit"),
    v: weeklyProgress.deficit + " kcal",
    c: "#c8a96e"
  }, {
    l: pickLang(lang, "Superávit", "Surplus", "Superávit"),
    v: weeklyProgress.surplus + " kcal",
    c: "#c86e8e"
  }, {
    l: pickLang(lang, "Aderência", "Adherence", "Adherencia"),
    v: weeklyProgress.plannedWeek ? weeklyProgress.adherence + "%" : "—",
    c: weeklyProgress.adherence >= 80 && weeklyProgress.adherence <= 120 ? "#6ec8a9" : "#c8a96e"
  }, {
    l: pickLang(lang, "Tendência", "Trend", "Tendencia"),
    v: weightTrend.hasEnough ? (weightTrend.weeklyRate > 0 ? "+" : "") + (Math.round(weightTrend.weeklyRate * 100) / 100) + pickLang(lang, " kg/sem", " kg/wk", " kg/sem") : "—",
    c: weightTrend.weeklyRate < 0 ? "#6ec8a9" : weightTrend.weeklyRate > 0 ? "#c86e8e" : "var(--muted)"
  }].filter(card => card.v !== "—").map(card => /*#__PURE__*/React.createElement("div", {
    key: card.l,
    style: {
      border: "1px solid var(--border3)",
      borderRadius: 8,
      padding: "10px 12px",
      background: "var(--bg)",
      minHeight: 58
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 5
    }
  }, card.l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      color: card.c,
      fontWeight: 600
    }
  }, card.v)))), metricsProgressInfoOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      background: "var(--bg)",
      border: "1px solid var(--border3)",
      borderRadius: 8,
      padding: "12px 14px",
      fontSize: 13,
      color: "var(--text3)",
      lineHeight: 1.55
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--text2)",
      fontWeight: 700,
      marginBottom: 8
    }
  }, pickLang(lang, "Como interpretar estes valores", "How to read these values", "Cómo interpretar estos valores")), (lang === 'en' ? [
    ["Weekly target", "The total calorie adjustment planned for the last 7 completed days. It comes from your current objective and does not include today."],
    ["Deficit", "Calories below the estimated maintenance base across completed days. This is mainly useful for weight-loss goals."],
    ["Surplus", "Calories above the estimated maintenance base across completed days. This is mainly useful for weight-gain goals."],
    ["Adherence", "How close the accumulated deficit or surplus is to the planned weekly target. Around 100% means the pace is close to the plan; much lower or higher suggests the pace is slower or faster."],
    ["Trend", "Estimated weekly weight change from recent records. Treat it as a direction signal, because water, glycogen, sodium, and digestion can move weight day to day."]
  ] : lang === 'es' ? [
    ["Meta semanal", "El ajuste calórico total planificado para los últimos 7 días completados. Viene de tu objetivo actual y no incluye hoy."],
    ["Déficit", "Calorías por debajo de la base estimada de mantenimiento en los días completados. Es más útil para objetivos de pérdida de peso."],
    ["Superávit", "Calorías por encima de la base estimada de mantenimiento en los días completados. Es más útil para objetivos de ganancia de peso."],
    ["Adherencia", "Qué tan cerca está el déficit o superávit acumulado de la meta semanal planificada. Cerca de 100% indica un ritmo alineado al plan; muy por debajo o por encima sugiere un ritmo más lento o más rápido."],
    ["Tendencia", "Cambio semanal estimado a partir de los registros recientes. Úsalo como señal de dirección, porque agua, glucógeno, sodio y digestión pueden mover el peso día a día."]
  ] : [
    ["Meta semanal", "O ajuste calórico total planejado para os últimos 7 dias concluídos. Ele vem do objetivo atual e não inclui hoje."],
    ["Déficit", "Calorias abaixo da base estimada de manutenção nos dias concluídos. É mais útil para objetivos de perda de peso."],
    ["Superávit", "Calorias acima da base estimada de manutenção nos dias concluídos. É mais útil para objetivos de ganho de peso."],
    ["Aderência", "Quão perto o déficit ou superávit acumulado está da meta semanal planejada. Perto de 100% indica um ritmo alinhado ao plano; muito abaixo ou acima sugere ritmo mais lento ou mais rápido."],
    ["Tendência", "Mudança semanal estimada a partir dos registros recentes. Use como sinal de direção, porque água, glicogênio, sódio e digestão podem alterar o peso no dia a dia."]
  ]).map(([title, text]) => /*#__PURE__*/React.createElement("div", {
    key: title,
    style: { marginTop: 6 }
  }, /*#__PURE__*/React.createElement("b", {
    style: { color: "var(--text2)" }
  }, title, ": "), text)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      color: "var(--muted)"
    }
  }, pickLang(lang, "Use esta seção para ler tendência, não como julgamento diário. Pequenos desvios são normais.", "Use this section as a trend reader, not as a daily judgment. Small deviations are normal.", "Usa esta sección para leer tendencias, no como juicio diario. Pequeñas desviaciones son normales."))), metricsProgressOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      borderTop: "1px solid var(--border3)",
      paddingTop: 12,
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text3)",
      lineHeight: 1.55
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: { color: "var(--text2)" }
  }, pickLang(lang, "Saldo semanal", "Weekly balance", "Balance semanal")), /*#__PURE__*/React.createElement("br", null), pickLang(lang, "Déficit e superávit são calculados contra a base estimada de manutenção de cada dia concluído. A meta semanal usa o ajuste atual do seu objetivo.", "Deficit and surplus are calculated against the estimated maintenance base for each completed day. The weekly target uses your current goal adjustment.", "Déficit y superávit se calculan contra la base estimada de mantenimiento de cada día completado. La meta semanal usa el ajuste actual de tu objetivo."), weeklyProgress.days === 0 && /*#__PURE__*/React.createElement("div", {
      style: { marginTop: 8, color: "var(--muted)" }
  }, pickLang(lang, "Registre dias anteriores para preencher esta seção.", "Log past days to see this section fill in.", "Registra días anteriores para completar esta sección."))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text3)",
      lineHeight: 1.55
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: { color: "var(--text2)" }
  }, pickLang(lang, "Previsão", "Forecast", "Previsión")), /*#__PURE__*/React.createElement("br", null), nutritionPrefs.goalType === "maintenance"
    ? pickLang(lang, "A previsão é mais útil para objetivos de perda ou ganho.", "Forecast is most useful for loss or gain goals.", "La previsión es más útil para objetivos de pérdida o ganancia.")
    : weightTrend.weeksRemaining
      ? pickLang(lang, "No ritmo atual do peso, a mudança planejada levaria cerca de " + (Math.round(weightTrend.weeksRemaining * 10) / 10) + " semanas.", "At the current weight trend, the planned change would take about " + (Math.round(weightTrend.weeksRemaining * 10) / 10) + " weeks.", "Con la tendencia actual del peso, el cambio planificado tardaría cerca de " + (Math.round(weightTrend.weeksRemaining * 10) / 10) + " semanas.")
      : pickLang(lang, "Ainda não há tendência alinhada suficiente para estimar uma data de chegada.", "There is not enough aligned trend yet to estimate an arrival date.", "Todavía no hay una tendencia suficientemente alineada para estimar una fecha de llegada."), weightTrend.avg14 && /*#__PURE__*/React.createElement("div", {
      style: { marginTop: 8, color: "var(--muted)" }
  }, pickLang(lang, "Média 14 registros: ", "14-entry average: ", "Media de 14 registros: "), Math.round(weightTrend.avg14 * 10) / 10, " kg")))), renderReportsCard()))))))));
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

// Login / Register Screen



// Email Verification Screen
function VerifyEmailScreen({ email, name, lang, onVerified, onBack }) {
  const isPt = (lang || localStorage.getItem('appLang') || 'pt') !== 'en';
  const [status, setStatus] = React.useState(''); // '', 'resent', 'error'
  const [checking, setChecking] = React.useState(false);
  const isNew = !!name; // name only passed on new registrations

  // Poll every 5s to check if email was verified
  React.useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      try {
        const verified = await fbCheckEmailVerified();
        if (verified && active) {
          clearInterval(interval);
          onVerified(isNew);
        }
      } catch(e) {}
    }, 5000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  async function resend() {
    setStatus('');
    try {
      await fbSendVerificationEmail();
      setStatus('resent');
    } catch(e) {
      setStatus('error');
    }
  }

  const inp = {
    width:'100%', background:'var(--input,#1e1e1e)',
    border:'1px solid var(--border2,#333)', color:'var(--text1,#fff)',
    padding:'11px 14px', borderRadius:10, fontSize:14,
    fontFamily:'inherit', boxSizing:'border-box'
  };

  return React.createElement('div', {
    style: {
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg,#111)', padding:20
    }
  },
    React.createElement('div', {
      style: {
        background:'var(--surface,#fff)', borderRadius:20, padding:'36px 28px',
        width:'100%', maxWidth:420, textAlign:'center',
        boxShadow:'0 8px 40px rgba(0,0,0,0.5)',
        border:'1px solid var(--border2,#333)'
      }
    },
      // Icon
      React.createElement('div', {style:{fontSize:52, marginBottom:16}}, '\uD83D\uDCE7'),

      // Title
      React.createElement('h2', {
        style:{margin:'0 0 8px', fontSize:20, color:'var(--text1,#fff)', fontWeight: 600}
      }, isPt
        ? (name ? 'Ol\xe1, ' + name + '! Verifique seu email \uD83D\uDC4B' : 'Verifique seu email')
        : (name ? 'Hi, ' + name + '! Verify your email \uD83D\uDC4B' : 'Verify your email')
      ),

      // Subtitle
      React.createElement('p', {
        style:{margin:'0 0 24px', fontSize:13, color:'var(--text2,#aaa)', lineHeight:1.6}
      }, isPt
        ? 'Env\xe1mos um link de verifica\xe7\xe3o para '
        : 'We sent a verification link to '
      ,
        React.createElement('strong', {style:{color:'var(--accent,#7ec87e)'}}, email),
        isPt
          ? '. Clique no link para ativar sua conta. Se n\xe3o encontrar o email, verifique a pasta de spam ou lixo eletr\xf4nico. Esta p\xe1gina atualiza automaticamente.'
          : '. Click the link to activate your account. If you don\'t see it, check your spam or junk folder. This page updates automatically.'
      ),

      // Spinner / waiting indicator
      React.createElement('div', {
        style:{
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          marginBottom:24, color:'var(--text2,#aaa)', fontSize:12
        }
      },
        React.createElement('div', {
          style:{
            width:14, height:14, borderRadius:'50%',
            border:'2px solid var(--accent,#7ec87e)',
            borderTopColor:'transparent',
            animation:'spin 1s linear infinite'
          }
        }),
        isPt ? 'Aguardando verifica\xe7\xe3o...' : 'Waiting for verification...'
      ),

      // Status message
      status === 'resent' && React.createElement('p', {
        style:{color:'var(--accent,#7ec87e)', fontSize:12, marginBottom:12}
      }, isPt ? '\u2713 Email reenviado!' : '\u2713 Email resent!'),
      status === 'error' && React.createElement('p', {
        style:{color:'#c87e7e', fontSize:12, marginBottom:12}
      }, isPt ? 'Erro ao reenviar. Tente novamente.' : 'Error resending. Please try again.'),

      // Resend button
      React.createElement('button', {
        onClick: resend,
        style:{
          width:'100%', padding:'12px', borderRadius:10, marginBottom:12,
          background:'var(--accent,#7ec87e)', border:'none',
          color:'#111', fontSize:13, fontWeight: 600,
          cursor:'pointer', fontFamily:'inherit', letterSpacing:0.5
        }
      }, isPt ? 'Reenviar email de verifica\xe7\xe3o' : 'Resend verification email'),

      // Back button
      React.createElement('button', {
        onClick: onBack,
        style:{
          width:'100%', padding:'11px', borderRadius:10,
          background:'none', border:'1px solid var(--border2,#333)',
          color:'var(--text2,#aaa)', fontSize:13,
          cursor:'pointer', fontFamily:'inherit'
        }
      }, isPt ? '\u2190 Voltar para o login' : '\u2190 Back to login')
    )
  );
}

// Privacy & Security Panel
function PrivacyPanel({ lang, onClose, onLogout }) {
  const isPt = lang === 'pt';
  const [section, setSection] = React.useState('main'); // main | changePassword | deleteAccount
  const [status, setStatus]   = React.useState('');
  const [err, setErr]         = React.useState('');

  // Change password
  const [curPwd,  setCurPwd]  = React.useState('');
  const [newPwd,  setNewPwd]  = React.useState('');
  const [newPwd2, setNewPwd2] = React.useState('');

  // Delete account
  const [delPwd,  setDelPwd]  = React.useState('');
  const [delConf, setDelConf] = React.useState('');

  const overlay = {
    position:'fixed', inset:0, zIndex:99998,
    background:'rgba(0,0,0,0.75)', backdropFilter:'blur(3px)',
    display:'flex', alignItems:'center', justifyContent:'center', padding:16
  };
  const box = {
    background:'var(--surface)', borderRadius:16, padding:'24px',
    width:'100%', maxWidth:420,
    boxShadow:'0 8px 40px rgba(0,0,0,0.6)',
    border:'1px solid var(--border2)',
    maxHeight:'85vh', overflowY:'auto'
  };
  const inp = {
    width:'100%', background:'var(--input)', border:'1px solid var(--border2)',
    color:'var(--text2)', padding:'10px 12px', borderRadius:8,
    fontSize:13, fontFamily:'inherit', boxSizing:'border-box', marginBottom:10
  };
  const btn = (col) => ({
    width:'100%', padding:'11px', borderRadius:8,
    background:col||'var(--accent)', border:'none',
    color: col ? '#fff' : '#111', fontSize:13,
    cursor:'pointer', fontFamily:'inherit', fontWeight:600,
    marginBottom:8
  });

  async function changePassword() {
    setErr(''); setStatus('');
    if (!curPwd || !newPwd || !newPwd2) { setErr(isPt?'Preencha todos os campos.':'Fill all fields.'); return; }
    if (newPwd !== newPwd2) { setErr(isPt?'As senhas não coincidem.':'Passwords do not match.'); return; }
    if (newPwd.length < 6) { setErr(isPt?'A senha deve ter pelo menos 6 caracteres.':'Password must be at least 6 characters.'); return; }
    try {
      // Re-authenticate via REST to get fresh token
      const email = localStorage.getItem('fb_email') || '';
      await fbSignIn(email, curPwd); // throws if wrong password
      // Update password via REST
      const token = await fbToken();
      const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:update?key=' + FB_KEY, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({idToken: token, password: newPwd, returnSecureToken: true})
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message || 'error');
      // Save new session tokens
      if (d.idToken) window._saveSession && window._saveSession(d);
      setStatus(isPt?'Senha alterada com sucesso!':'Password changed successfully!');
      setCurPwd(''); setNewPwd(''); setNewPwd2('');
      setTimeout(()=>setSection('main'),1500);
    } catch(e) {
      setErr(isPt?'Senha atual incorreta ou erro ao alterar.':'Current password incorrect or error changing password.');
    }
  }

  async function deleteAccount() {
    setErr(''); setStatus('');
    if (!delPwd) { setErr(isPt?'Digite sua senha para confirmar.':'Enter your password to confirm.'); return; }
    if (delConf !== (isPt?'APAGAR':'DELETE')) { setErr(isPt?'Digite APAGAR para confirmar.':'Type DELETE to confirm.'); return; }
    try {
      const email = localStorage.getItem('fb_email') || '';
      await fbSignIn(email, delPwd); // throws if wrong password
      // Firestore data must be deleted before Auth deletion; Firebase Auth does
      // not cascade-delete user documents after accounts:delete.
      if (typeof window.deleteCurrentUserFirestoreData === 'function') {
        await window.deleteCurrentUserFirestoreData();
      }
      // Delete account via REST
      const token = await fbToken();
      await fetch('https://identitytoolkit.googleapis.com/v1/accounts:delete?key=' + FB_KEY, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({idToken: token})
      });
      fbSignOut();
      onLogout();
    } catch(e) {
      setErr(isPt?'Senha incorreta ou erro ao apagar conta.':'Incorrect password or error deleting account.');
    }
  }

  const header = (title) => React.createElement('div', {
    style:{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}
  },
    React.createElement('h2', {style:{margin:0, fontSize:16, color:'var(--text1)'}}, title),
    React.createElement('button', {
      onClick: section==='main' ? onClose : ()=>{ setSection('main'); setErr(''); setStatus(''); },
      style:{background:'none', border:'none', color:'var(--text2)', fontSize:20, cursor:'pointer'}
    }, section==='main' ? '\u00D7' : '\u2190')
  );

  if (section === 'changePassword') return React.createElement('div', {style:overlay},
    React.createElement('div', {style:box},
      header(isPt?'Alterar senha':'Change password'),
      err && React.createElement('p', {style:{color:'#c87e7e', fontSize:12, marginBottom:10}}, err),
      status && React.createElement('p', {style:{color:'#7ec87e', fontSize:12, marginBottom:10}}, status),
      React.createElement('input', {type:'password', value:curPwd, onChange:e=>setCurPwd(e.target.value),
        placeholder:isPt?'Senha atual':'Current password', style:inp}),
      React.createElement('input', {type:'password', value:newPwd, onChange:e=>setNewPwd(e.target.value),
        placeholder:isPt?'Nova senha':'New password', style:inp}),
      React.createElement('input', {type:'password', value:newPwd2, onChange:e=>setNewPwd2(e.target.value),
        placeholder:isPt?'Confirmar nova senha':'Confirm new password', style:{...inp,marginBottom:16}}),
      React.createElement('button', {onClick:changePassword, style:btn()},
        isPt?'Salvar nova senha':'Save new password')
    )
  );

  if (section === 'deleteAccount') return React.createElement('div', {style:overlay},
    React.createElement('div', {style:box},
      header(isPt?'Apagar conta':'Delete account'),
      React.createElement('p', {style:{color:'#c87e7e', fontSize:13, marginBottom:12, lineHeight:1.5}},
        isPt
          ? 'Esta ação é irreversível. Todos os seus dados serão permanentemente excluídos.'
          : 'This action is irreversible. All your data will be permanently deleted.'),
      err && React.createElement('p', {style:{color:'#c87e7e', fontSize:12, marginBottom:10}}, err),
      React.createElement('input', {type:'password', value:delPwd, onChange:e=>setDelPwd(e.target.value),
        placeholder:isPt?'Sua senha':'Your password', style:inp}),
      React.createElement('input', {type:'text', value:delConf, onChange:e=>setDelConf(e.target.value),
        placeholder:isPt?'Digite APAGAR para confirmar':'Type DELETE to confirm',
        style:{...inp, marginBottom:16}}),
      React.createElement('button', {onClick:deleteAccount,
        style:{...btn('#8b1a1a'), border:'1px solid #c87e7e'}},
        isPt?'\uD83D\uDDD1 Apagar conta permanentemente':'\uD83D\uDDD1 Delete account permanently')
    )
  );

  // Main panel
  return React.createElement('div', {style:overlay},
    React.createElement('div', {style:box},
      header(isPt?'\uD83D\uDD12 Privacidade e seguran\xe7a':'\uD83D\uDD12 Privacy & security'),

      React.createElement('p', {style:{color:'var(--text2)', fontSize:12, marginBottom:16, lineHeight:1.5}},
        isPt
          ? 'Aqui voc\xea pode gerenciar as configura\xe7\xf5es de seguran\xe7a e privacidade da sua conta.'
          : 'Here you can manage your account security and privacy settings.'),

      // Change password
      React.createElement('button', {
        onClick:()=>setSection('changePassword'),
        style:{
          width:'100%', padding:'13px 16px', borderRadius:10, marginBottom:10,
          background:'var(--bg)', border:'1px solid var(--border2)',
          color:'var(--text1)', fontSize:13, cursor:'pointer',
          fontFamily:'inherit', display:'flex', alignItems:'center', gap:12, textAlign:'left'
        }
      },
        React.createElement('span', {style:{fontSize:20}}, '\uD83D\uDD11'),
        React.createElement('div', null,
          React.createElement('div', {style:{fontWeight:600, marginBottom:2}},
            isPt?'Alterar senha':'Change password'),
          React.createElement('div', {style:{fontSize:11, color:'var(--text2)'}},
            isPt?'Atualize a senha da sua conta':'Update your account password')
        )
      ),

      // Divider
      React.createElement('div', {style:{height:1, background:'var(--border2)', margin:'8px 0 16px'}}),

      // Delete account
      React.createElement('button', {
        onClick:()=>setSection('deleteAccount'),
        style:{
          width:'100%', padding:'13px 16px', borderRadius:10,
          background:'rgba(139,26,26,0.15)', border:'1px solid rgba(200,126,126,0.3)',
          color:'#c87e7e', fontSize:13, cursor:'pointer',
          fontFamily:'inherit', display:'flex', alignItems:'center', gap:12, textAlign:'left'
        }
      },
        React.createElement('span', {style:{fontSize:20}}, '\uD83D\uDDD1'),
        React.createElement('div', null,
          React.createElement('div', {style:{fontWeight:600, marginBottom:2}},
            isPt?'Apagar conta':'Delete account'),
          React.createElement('div', {style:{fontSize:11}},
            isPt?'Remove permanentemente todos os seus dados':'Permanently removes all your data')
        )
      )
    )
  );
}


// Backup Screen
function BackupModal({ lang, darkMode, onClose }) {
  const normalizedLang = normalizeLanguage(lang);
  const isPt = normalizedLang === 'pt';
  const L = (pt, en, es) => pickLang(normalizedLang, pt, en, es);
  const [loading, setLoading] = React.useState(null);
  const [importDone, setImportDone] = React.useState('');
  const [downloaded, setDownloaded] = React.useState(null);
  const [pendingImportBackup, setPendingImportBackup] = React.useState(null);
  const [importPreview, setImportPreview] = React.useState(null);
  const [importSelections, setImportSelections] = React.useState({});
  const [importingBackup, setImportingBackup] = React.useState(false);

  const backupCategoryLabels = {
    profile: L('Perfil nutricional', 'Nutrition profile', 'Perfil nutricional'),
    nutritionGoals: L('Configurações nutricionais', 'Nutrition settings', 'Configuración nutricional'),
    pantry: L('Despensa', 'Pantry', 'Despensa'),
    mealTemplates: L('Refeições salvas', 'Saved meals', 'Comidas guardadas'),
    supplements: L('Suplementos', 'Supplements', 'Suplementos'),
    diary: L('Registros diários', 'Daily logs', 'Registros diarios'),
    dayTypes: L('Dias de treino/descanso', 'Training/rest days', 'Días de entrenamiento/descanso'),
    water: L('Água', 'Water', 'Agua'),
    notes: L('Notas', 'Notes', 'Notas'),
    supplementLog: L('Registro de suplementos', 'Supplement logs', 'Registro de suplementos'),
    bodyMetrics: L('Métricas corporais', 'Body metrics', 'Métricas corporales')
  };

  const exportOptions = [
    { key:'today',  icon:'', title:L('Diário - hoje', 'Diary - today', 'Diario - hoy'), desc:L('Refeições e totais do dia atual', 'Meals and totals for today', 'Comidas y totales del día actual') },
    { key:'week',   icon:'', title:L('Últimos 7 dias', 'Last 7 days', 'Últimos 7 días'), desc:L('Histórico da semana com refeições e macros', 'Weekly history with meals and macros', 'Historial semanal con comidas y macros') },
    { key:'month',  icon:'', title:L('Último mês (30 dias)', 'Last 30 days', 'Último mes (30 días)'), desc:L('Histórico do mês com totais diários', 'Monthly history with daily totals', 'Historial mensual con totales diarios') },
    { key:'pantry', icon:'', title:L('Alimentos', 'Pantry', 'Alimentos'), desc:L('Todos os alimentos cadastrados', 'All registered foods', 'Todos los alimentos registrados') },
    { key:'weight', icon:'', title:L('Histórico de peso', 'Weight history', 'Historial de peso'), desc:L('Peso e altura registrados', 'Logged weight and height data', 'Peso y altura registrados') },
    { key:'all',    icon:'', title:L('Exportar dados', 'Export data', 'Exportar datos'), desc:L('Backup completo: diário, alimentos, peso, metas e água', 'Full backup: diary, foods, weight, goals, and water', 'Backup completo: diario, alimentos, peso, metas y agua'), highlight:true },
  ];

  async function doExport(key) {
    setLoading(key);
    try {
      const d = window._exportData || {};
      const {activeLog, log, TODAY, isTraining, goals, goalHistory, trainingByDate,
             buildDayTotals, normalizeMealKeys, downloadFile, lang, notify,
             weightHistory} = d;
      const today = TODAY || new Date().toISOString().split('T')[0];
      const exportLang = normalizeLanguage(lang || normalizedLang || 'pt');
      const E = (pt, en, es) => pickLang(exportLang, pt, en, es);

      if (key === 'all') {
        if (window._exportFullBackup) await window._exportFullBackup();

      } else if (key === 'today') {
        if (!activeLog || !buildDayTotals) throw new Error(E('App ainda não está pronto', 'App not ready', 'La app aún no está lista'));
        const ae = Object.values(activeLog||{}).flat();
        const totDay = {
          protein: Math.round(ae.reduce((s,e)=>s+(e.protein ?? 0),0)*10)/10,
          kcal:    Math.round(ae.reduce((s,e)=>s+(e.kcal ?? 0),0)*10)/10,
          carbs:   Math.round(ae.reduce((s,e)=>s+(e.carbs ?? 0),0)*10)/10,
          fat:     Math.round(ae.reduce((s,e)=>s+(e.fat ?? 0),0)*10)/10,
          fiber:   Math.round(ae.reduce((s,e)=>s+(e.fiber ?? 0),0)*10)/10,
          salt:    Math.round(ae.reduce((s,e)=>s+(e.salt ?? 0),0)*10)/10
        };
        const data = {date:today, isTraining, goals, meals:activeLog, totals:totDay};
        downloadFile(JSON.stringify({exportedAt:new Date().toISOString(),type:'day',data},null,2),
          'diario_'+today+'.json', 'application/json');
        if (notify) notify(E('Arquivo baixado!', 'File downloaded!', 'Archivo descargado!'));

      } else if (key === 'week' || key === 'month') {
        if (!buildDayTotals || !normalizeMealKeys || !downloadFile) throw new Error(E('App ainda não está pronto', 'App not ready', 'La app aún no está lista'));
        const n = key === 'week' ? 7 : 30;
        const days = [];
        for (let i = n-1; i >= 0; i--) {
          const dt = new Date(); dt.setDate(dt.getDate()-i);
          const date = dt.toISOString().split('T')[0];
          let dayLog = date === today ? (log||{}) : {};
          if (date !== today) {
            const l = await storage.get('log_v2_'+date).catch(()=>null);
            if (l) dayLog = normalizeMealKeys(JSON.parse(l.value));
          }
          const dtEntries = Object.values(dayLog).flat();
          const tot = {
            protein: Math.round(dtEntries.reduce((s,e)=>s+(e.protein ?? 0),0)*10)/10,
            kcal:    Math.round(dtEntries.reduce((s,e)=>s+(e.kcal ?? 0),0)*10)/10,
            carbs:   Math.round(dtEntries.reduce((s,e)=>s+(e.carbs ?? 0),0)*10)/10,
            fat:     Math.round(dtEntries.reduce((s,e)=>s+(e.fat ?? 0),0)*10)/10,
            fiber:   Math.round(dtEntries.reduce((s,e)=>s+(e.fiber ?? 0),0)*10)/10,
            salt:    Math.round(dtEntries.reduce((s,e)=>s+(e.salt ?? 0),0)*10)/10
          };
          days.push({date, isTraining:trainingByDate?.[date] ?? true, goals: goalHistory?.[date] || null, totals:tot, meals:dayLog});
        }
        const fname = (key==='week'?'semana':'mes')+'_'+today+'.json';
        downloadFile(JSON.stringify({exportedAt:new Date().toISOString(),type:key,days},null,2), fname, 'application/json');
        if (notify) notify(E('Arquivo baixado!', 'File downloaded!', 'Archivo descargado!'));

      } else if (key === 'pantry') {
        const r = await storage.get('pantry_v2');
        const data = {pantry_v2: r?.value || '[]'};
        downloadFile(JSON.stringify({exportedAt:new Date().toISOString(),type:'pantry',data},null,2),
          'despensa_'+today+'.json', 'application/json');
        if (notify) notify(E('Arquivo baixado!', 'File downloaded!', 'Archivo descargado!'));

      } else if (key === 'weight') {
        const whr = await storage.get('weightHistory').catch(()=>null);
        const whData = whr?.value ? JSON.parse(whr.value) : (weightHistory||[]);
        downloadFile(JSON.stringify({exportedAt:new Date().toISOString(),type:'weight',data:{weightHistory:whData}},null,2),
          'peso_'+today+'.json', 'application/json');
        if (notify) notify(E('Arquivo baixado!', 'File downloaded!', 'Archivo descargado!'));
      }
      setDownloaded(key);
    } catch(e) {
      console.error('Export error:', e);
      alert(L('Erro ao exportar: ', 'Export error: ', 'Error al exportar: ') + e.message);
    }
    setLoading(null);
  }

  /**
   * Reads the selected backup file and opens the category-level dry-run dialog
   * inside this modal. Keeping the state local avoids a hidden confirmation
   * flow when the backup screen is mounted above the main app shell.
   */
  function readBackupFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(String(reader.result || '{}')));
        } catch (error) {
          reject(new Error(L('Arquivo JSON inválido.', 'Invalid JSON file.', 'Archivo JSON inválido.')));
        }
      };
      reader.onerror = () => reject(reader.error || new Error(L('Não foi possível ler o arquivo.', 'Could not read file.', 'No se pudo leer el archivo.')));
      reader.readAsText(file, 'utf-8');
    });
  }

  async function doImport(e) {
    const file = e?.target?.files?.[0];
    setImportDone('');
    if (!file) return;

    try {
      const rawBackup = await readBackupFile(file);
      if (!window.previewFullAccountBackupImport) {
        throw new Error(L('Pré-visualização de importação indisponível.', 'Import preview is unavailable.', 'La vista previa de importación no está disponible.'));
      }

      const preview = await window.previewFullAccountBackupImport(rawBackup);
      if (!preview?.ok) {
        const message = preview?.errors?.join(', ') || L('Backup inválido.', 'Invalid backup.', 'Backup inválido.');
        throw new Error(message);
      }

      setPendingImportBackup(rawBackup);
      setImportPreview(preview);
      setImportSelections({});
    } catch (error) {
      setImportDone(L('Erro ao importar: ', 'Import error: ', 'Error al importar: ') + (error?.message || String(error)));
    } finally {
      if (e?.target) e.target.value = '';
    }
  }

  function setImportCategory(categoryId, checked) {
    setImportSelections(current => {
      const next = {...current};
      if (checked) next[categoryId] = '';
      else delete next[categoryId];
      return next;
    });
  }

  function setImportCategoryStrategy(categoryId, strategy) {
    setImportSelections(current => ({...current, [categoryId]: strategy}));
  }

  function closeImportPreview() {
    setPendingImportBackup(null);
    setImportPreview(null);
    setImportSelections({});
    setImportingBackup(false);
  }

  async function confirmImportPreview() {
    if (!pendingImportBackup || !window.importFullAccountBackup) return;

    const selected = Object.fromEntries(
      Object.entries(importSelections).filter(([, strategy]) => strategy === 'append' || strategy === 'replace')
    );

    if (!Object.keys(selected).length) {
      setImportDone(L('Selecione pelo menos uma categoria e uma estratégia.', 'Select at least one category and strategy.', 'Selecciona al menos una categoría y una estrategia.'));
      return;
    }

    setImportingBackup(true);
    try {
      const result = await window.importFullAccountBackup(pendingImportBackup, {categories: selected});
      const count = Number(result?.imported ?? 0);
      closeImportPreview();
      setImportDone(L(
        `Importação concluída: ${count} registros. Recarregue a página.`,
        `Import complete: ${count} records. Reload the page.`,
        `Importación completada: ${count} registros. Recarga la página.`
      ));
    } catch (error) {
      setImportDone(L('Erro ao importar: ', 'Import error: ', 'Error al importar: ') + (error?.message || String(error)));
      setImportingBackup(false);
    }
  }
  // Read theme from localStorage (same as App and LoginScreen)
  const bDark = darkMode !== undefined ? darkMode : localStorage.getItem('appDarkMode') === 'true';
  const bTheme = bDark ? {
    '--bg':'#111','--surface':'#161616','--border2':'#2a2a2a',
    '--text':'#e8e0d5','--text1':'#e8e0d5','--muted':'#8a8a8a',
    '--btn-ok':'#1e2e1e','--btn-ok-border':'#3a5a3a','--btn-ok-text':'#7ec87e',
    '--btn-info':'#1a1e2a','--btn-info-border':'#3a3a6a','--btn-info-text':'#8a9ec8',
    '--dim':'#555'
  } : {
    '--bg':'#f2f1ed','--surface':'#ffffff','--border2':'#b8b4ac',
    '--text':'#252220','--text1':'#252220','--muted':'#6a6662',
    '--btn-ok':'#e8f4e8','--btn-ok-border':'#a8cfa8','--btn-ok-text':'#2a6a2a',
    '--btn-info':'#e8eaf4','--btn-info-border':'#a8aed0','--btn-info-text':'#3a4a8a',
    '--dim':'#8a8680'
  };

  return React.createElement('div', {style: Object.assign({
    position:'fixed', inset:0, zIndex:99998,
    background: bDark?'#111':'#f2f1ed', overflowY:'auto',
    display:'flex', flexDirection:'column'
  }, bTheme)},
    // Header
    React.createElement('div', {style:{
      display:'flex', alignItems:'center', gap:12,
      padding:'16px 20px', borderBottom:'1px solid var(--border2)',
      background:'var(--surface)', position:'sticky', top:0, zIndex:1
    }},
      React.createElement('button', {onClick:onClose, style:{
        background:'none', border:'none', color:'var(--text2)',
        fontSize:22, cursor:'pointer', padding:'0 4px', lineHeight:1
      }}, '\u2190'),
      React.createElement('div', null,
        React.createElement('h2', {style:{margin:0, fontSize:17, color:'var(--text)', fontWeight:600}},
          L('Backup e restaurar', 'Backup & restore', 'Backup y restauración')),
        React.createElement('p', {style:{margin:0, fontSize:12, color:'var(--muted)'}},
          L('Escolha o que exportar ou importe um arquivo', 'Choose what to export or import a file', 'Elige qué exportar o importa un archivo'))
      )
    ),

    // Export section
    React.createElement('div', {style:{padding:'20px 16px 8px'}},
      React.createElement('p', {style:{
        fontSize:12, fontWeight:600, letterSpacing:1, textTransform:'uppercase',
        color:'var(--muted)', margin:'0 0 12px'
      }}, L('Exportar', 'Export', 'Exportar')),
      React.createElement('div', {style:{display:'flex', flexDirection:'column', gap:8}},
        exportOptions.map(opt =>
          React.createElement('button', {
            key: opt.key,
            onClick: () => doExport(opt.key),
            disabled: loading === opt.key,
            style:{
              display:'flex', alignItems:'center', gap:14,
              padding:'14px 16px', borderRadius:opt.highlight ? 999 : 12, cursor:'pointer',
              fontFamily:'inherit', textAlign:'left',
              background: opt.highlight ? 'var(--btn-ok)' : 'var(--surface)',
              border: '1px solid ' + (opt.highlight ? 'var(--btn-ok-border)' : 'var(--border2)'),
              opacity: loading && loading !== opt.key ? 0.5 : 1,
              transition: 'opacity 0.2s'
            }
          },
            React.createElement('span', {style:{fontSize:24, flexShrink:0}}, opt.icon),
            React.createElement('div', {style:{flex:1}},
              React.createElement('div', {style:{
                fontSize:14, fontWeight:500,
                color: opt.highlight ? 'var(--btn-ok-text)' : 'var(--text)'
              }}, opt.title),
              React.createElement('div', {style:{fontSize:12, color:'var(--muted)', marginTop:2}}, opt.desc)
            ),
            loading === opt.key
              ? React.createElement('div', {style:{
                  width:16, height:16, borderRadius:'50%',
                  border:'2px solid var(--btn-ok-text)',
                  borderTopColor:'transparent',
                  animation:'spin 0.8s linear infinite', flexShrink:0
                }})
              : React.createElement('span', {style:{color:'var(--muted)', fontSize:16, flexShrink:0}}, '\u2193')
          )
        )
      )
    ),

    // Divider
    React.createElement('div', {style:{height:1, background:'var(--border2)', margin:'8px 16px'}}),

    // Import section
    React.createElement('div', {style:{padding:'8px 16px 32px'}},
      React.createElement('p', {style:{
        fontSize:12, fontWeight:600, letterSpacing:1, textTransform:'uppercase',
        color:'var(--muted)', margin:'0 0 12px'
      }}, L('Importar', 'Import', 'Importar')),
      React.createElement('label', {style:{
        display:'flex', alignItems:'center', gap:14,
        padding:'14px 16px', borderRadius:999, cursor:'pointer',
        background:'var(--surface)', border:'1px dashed var(--border2)'
      }},
        React.createElement('span', {style:{fontSize:24}}, '\uD83D\uDCC2'),
        React.createElement('div', {style:{flex:1}},
          React.createElement('div', {style:{fontSize:14, fontWeight:500, color:'var(--text)'}},
            L('Importar dados', 'Import data', 'Importar datos')),
          React.createElement('div', {style:{fontSize:12, color:'var(--muted)', marginTop:2}},
            L('Restaura dados de um backup anterior', 'Restore data from a previous backup', 'Restaura datos de un backup anterior'))
        ),
        React.createElement('span', {style:{color:'var(--muted)', fontSize:16}}, '\u2191'),
        React.createElement('input', {type:'file', accept:'.json', onChange:doImport, style:{display:'none'}})
      ),
      importDone && React.createElement('div', {style:{
        marginTop:10, padding:'14px 16px', borderRadius:12,
        background:'var(--btn-ok)', border:'1px solid var(--btn-ok-border)',
        color:'var(--btn-ok-text)', fontSize:14
      }}, importDone),
      React.createElement('p', {style:{
        fontSize:12, color:'var(--muted)', marginTop:10, lineHeight:1.5
      }}, L(
        ' A importação pode anexar ou substituir os grupos selecionados.',
        ' Import can append or replace the selected groups.',
        ' La importación puede anexar o sustituir los grupos seleccionados.'
      ))
    ),

    importPreview && (() => {
      const categories = Array.isArray(importPreview.categories) ? importPreview.categories : [];
      const selectedKeys = Object.keys(importSelections);
      const selectedCount = selectedKeys.length;
      const needsStrategy = selectedKeys.some(key => !importSelections[key]);
      const canImport = selectedCount > 0 && !needsStrategy && !importingBackup;

      return React.createElement('div', {style:{
        position:'fixed', inset:0, zIndex:100006,
        background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:16
      }},
        React.createElement('div', {style:{
          width:'min(760px, 100%)', maxHeight:'90vh', overflowY:'auto',
          background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14,
          boxShadow:'0 20px 70px rgba(0,0,0,0.32)', padding:20, color:'var(--text)'
        }},
          React.createElement('div', {style:{display:'flex', alignItems:'flex-start', gap:12, marginBottom:14}},
            React.createElement('div', {style:{flex:1}},
              React.createElement('h3', {style:{margin:'0 0 8px', fontSize:18, letterSpacing:1.4, textTransform:'uppercase'}},
                L('Revisar importação', 'Review import', 'Revisar importación')),
              React.createElement('p', {style:{margin:0, color:'var(--muted)', fontSize:13, lineHeight:1.45}},
                L(
                  'Escolha quais dados deseja restaurar e defina se cada grupo deve anexar dados novos ou substituir os dados atuais.',
                  'Choose which data to restore and decide whether each group should append new data or replace current data.',
                  'Elige qué datos quieres restaurar y define si cada grupo debe anexar datos nuevos o sustituir los datos actuales.'
                ))
            ),
            React.createElement('button', {onClick:closeImportPreview, style:{
              border:'1px solid var(--border2)', background:'var(--surface)', color:'var(--text)',
              borderRadius:10, width:42, height:42, cursor:'pointer', fontSize:22
            }}, '×')
          ),

          React.createElement('div', {style:{display:'grid', gap:10}},
            categories.length
              ? categories.map(category => {
                  const checked = Object.prototype.hasOwnProperty.call(importSelections, category.id);
                  const strategy = importSelections[category.id] || '';
                  const label = backupCategoryLabels[category.id] || category.id;
                  const summary = L(
                    `${category.total || 0} registros · ${category.newItems || 0} novos · ${category.existing || 0} existentes`,
                    `${category.total || 0} records · ${category.newItems || 0} new · ${category.existing || 0} existing`,
                    `${category.total || 0} registros · ${category.newItems || 0} nuevos · ${category.existing || 0} existentes`
                  );

                  return React.createElement('div', {key:category.id, style:{
                    border:'1px solid var(--border2)', borderRadius:12, padding:12,
                    background:checked ? 'var(--btn-ok)' : 'var(--surface)'
                  }},
                    React.createElement('label', {style:{display:'flex', alignItems:'center', gap:10, cursor:'pointer'}},
                      React.createElement('input', {
                        type:'checkbox', checked,
                        onChange:event => setImportCategory(category.id, event.target.checked)
                      }),
                      React.createElement('div', {style:{flex:1}},
                        React.createElement('div', {style:{fontSize:14, fontWeight:700, color:'var(--text)'}}, label),
                        React.createElement('div', {style:{fontSize:12, color:'var(--muted)', marginTop:2}}, summary)
                      )
                    ),
                    checked && React.createElement('div', {style:{display:'flex', gap:8, marginTop:10, flexWrap:'wrap'}},
                      React.createElement('button', {onClick:()=>setImportCategoryStrategy(category.id, 'append'), style:{
                        flex:'1 1 150px', padding:'10px 12px', borderRadius:9, cursor:'pointer', fontFamily:'inherit',
                        background:strategy === 'append' ? 'var(--btn-ok)' : 'var(--surface)',
                        border:'1px solid ' + (strategy === 'append' ? 'var(--btn-ok-border)' : 'var(--border2)'),
                        color:strategy === 'append' ? 'var(--btn-ok-text)' : 'var(--text)'
                      }}, L('Anexar', 'Append', 'Anexar')),
                      React.createElement('button', {onClick:()=>setImportCategoryStrategy(category.id, 'replace'), style:{
                        flex:'1 1 150px', padding:'10px 12px', borderRadius:9, cursor:'pointer', fontFamily:'inherit',
                        background:strategy === 'replace' ? 'var(--btn-info)' : 'var(--surface)',
                        border:'1px solid ' + (strategy === 'replace' ? 'var(--btn-info-border)' : 'var(--border2)'),
                        color:strategy === 'replace' ? 'var(--btn-info-text)' : 'var(--text)'
                      }}, L('Substituir', 'Replace', 'Sustituir'))
                    )
                  );
                })
              : React.createElement('div', {style:{color:'var(--muted)', fontSize:14}},
                  L('Nenhum dado importável foi encontrado neste arquivo.', 'No importable data was found in this file.', 'No se encontraron datos importables en este archivo.'))
          ),

          React.createElement('div', {style:{display:'flex', gap:10, marginTop:18, flexWrap:'wrap'}},
            React.createElement('button', {onClick:closeImportPreview, disabled:importingBackup, style:{
              flex:'1 1 180px', padding:'13px 16px', borderRadius:10, cursor:'pointer', fontFamily:'inherit',
              background:'var(--surface)', border:'1px solid var(--border2)', color:'var(--text)',
              textTransform:'uppercase', letterSpacing:1.2
            }}, L('Cancelar', 'Cancel', 'Cancelar')),
            React.createElement('button', {onClick:confirmImportPreview, disabled:!canImport, style:{
              flex:'1 1 220px', padding:'13px 16px', borderRadius:10,
              cursor:canImport ? 'pointer' : 'not-allowed', fontFamily:'inherit',
              background:'var(--btn-ok)', border:'1px solid var(--btn-ok-border)', color:'var(--btn-ok-text)',
              opacity:canImport ? 1 : 0.5, textTransform:'uppercase', letterSpacing:1.2
            }}, importingBackup
              ? L('Importando...', 'Importing...', 'Importando...')
              : L('Importar selecionados', 'Import selected', 'Importar seleccionados'))
          )
        )
      );
    })()
  );
}

// Tutorial Overlay
function ReleaseNoticeModal({ lang, onStartTutorial }) {
  const normalizedLang = normalizeLanguage(lang);
  const textByLang = {
    pt: {
      title: "Bem-vindo \u00e0 vers\u00e3o 0.8.0 Beta! \ud83c\udf89\ud83e\udd73",
      body: "O Di\u00e1rio Nutricional agora tamb\u00e9m est\u00e1 dispon\u00edvel em espanhol e ganhou novas ferramentas para ajudar nas suas decis\u00f5es: voc\u00ea pode avaliar uma refei\u00e7\u00e3o antes de registr\u00e1-la, acompanhar melhor sua semana e suas m\u00e9tricas corporais e enviar feedback diretamente pelas Configura\u00e7\u00f5es. Preparamos um guia r\u00e1pido com as principais novidades.",
      btn: "Ver novidades"
    },
    en: {
      title: "Welcome to version 0.8.0 Beta! \ud83c\udf89\ud83e\udd73",
      body: "Nutrition Tracker is now also available in Spanish and includes new tools to support your daily decisions: you can evaluate a meal before logging it, follow your weekly and body metrics more clearly, and send feedback directly from Settings. We prepared a quick tour of the main updates.",
      btn: "See what's new"
    },
    es: {
      title: "\u00a1Bienvenido a la versi\u00f3n 0.8.0 Beta! \ud83c\udf89\ud83e\udd73",
      body: "Diario Nutricional ya est\u00e1 disponible en espa\u00f1ol e incluye nuevas herramientas para ayudarte en tus decisiones diarias: puedes evaluar una comida antes de registrarla, seguir con m\u00e1s claridad tu semana y tus m\u00e9tricas corporales y enviar comentarios directamente desde Configuraci\u00f3n. Preparamos una gu\u00eda r\u00e1pida con las principales novedades.",
      btn: "Ver novedades"
    }
  };
  const text = textByLang[normalizedLang] || textByLang.pt;  return React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 100000,
      background: "rgba(0,0,0,0.48)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 18,
      backdropFilter: "blur(3px)"
    }
  }, React.createElement("div", {
    style: {
      width: "min(560px, 100%)",
      background: "var(--surface,#fffdf8)",
      border: "1px solid var(--border2,#d0ccc4)",
      borderRadius: 12,
      padding: 22,
      boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 18,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: "var(--text2,#252220)",
      marginBottom: 12,
      fontWeight: 700
    }
  }, text.title), React.createElement("div", {
    style: {
      color: "var(--text3,#5f5a54)",
      lineHeight: 1.55,
      fontSize: 14,
      marginBottom: 18
    }
  }, text.body), React.createElement("button", {
    onClick: onStartTutorial,
    style: {
      width: "100%",
      border: "1px solid var(--btn-ok-border,#9ac99f)",
      background: "var(--btn-ok,#e9f6ea)",
      color: "var(--btn-ok-text,#236b2e)",
      borderRadius: 8,
      padding: "12px 14px",
      textTransform: "uppercase",
      letterSpacing: 1.3,
      fontFamily: "inherit",
      cursor: "pointer"
    }
  }, text.btn)));
}

function TutorialOverlay({ lang, type = 'main', onDone }) {
  const normalizedLang = normalizeLanguage(lang);
  const isPt = normalizedLang === 'pt';
  const isEs = normalizedLang === 'es';
  const [step, setStep] = React.useState(0);
  const [rect, setRect] = React.useState(null);

  const stepSets = isPt ? {
    main: [
      { title: 'Visão geral', text: 'O app é dividido em abas. Este primeiro guia é curto; cada aba terá uma explicação própria quando você abrir pela primeira vez.', highlight: null },
      { title: 'Diário', text: 'Aqui você acompanha o dia: refeições, água, metas, progresso e sugestões do que comer.', highlight: 'tab-diario' },
      { title: 'Registrar', text: 'Use os botões de adicionar nas refeições para montar uma refeição com vários itens ou descrever um prato.', highlight: 'open-log-sheet' },
      { title: 'Alimentos', text: 'Consulte alimentos salvos, crie novos itens, leia códigos de barras, organize refeições salvas e acompanhe suplementos.', highlight: 'tab-despensa' },
      { title: 'Semana', text: 'Veja tendências recentes, o banco de calorias, gráficos e médias por refeição.', highlight: 'tab-semana' },
      { title: 'Métricas', text: 'Registre medidas, acompanhe peso, IMC e TMB, ajuste metas e gere relatórios.', highlight: 'tab-metricas' },
      { title: 'Configurações e idiomas', text: 'Na engrenagem você pode escolher PT-BR, inglês ou espanhol. Nas Configurações também ficam backup, privacidade, recursos de IA e o envio de feedback.', highlight: 'menu-settings' },
      { title: 'Ajuda por aba', text: 'Em cada aba há um botão discreto com "i". Toque nele para rever o tutorial daquela área.', highlight: null }
    ],
    diario: [
      { title: 'Diário do dia', text: 'Esta aba mostra o que você registrou no dia selecionado e compara com as metas daquele dia.', tab: 'diario', highlight: 'tab-diario' },
      { title: 'Treino ou descanso', text: 'O tipo do dia altera a meta calórica. Use treino para dias ativos e descanso quando quiser aplicar a regra reduzida.', tab: 'diario', highlight: 'day-type' },
      { title: 'Sugerir o que comer', text: 'Este botão combina o que falta nas suas metas com os alimentos salvos. Cada sugestão mostra uma nota e o que favorece ou prejudica o resultado.', tab: 'diario', highlight: 'suggest-meal-button' },
      { title: 'Micronutrientes', text: 'Abra esta área para conferir vitaminas e minerais registrados pelos alimentos do dia.', tab: 'diario', highlight: 'microLabel' }
    ],
    adicionar: [
      { title: 'Adicionar refeições', text: 'Escolha entre montar uma refeição com vários itens ou descrever um prato.', tab: 'adicionar', highlight: 'add-modes' },
      { title: 'Registrar ou avaliar', text: 'Registrar envia a refeição diretamente ao diário. Avaliar refeição é opcional e calcula uma nota de 0 a 5 antes do registro.', tab: 'adicionar', highlight: 'add-modes' },
      { title: 'Entender e ajustar', text: 'Ao avaliar, a explicação destaca pontos positivos e o principal desvio. Você pode editar ingredientes ou quantidades, reavaliar ou registrar mesmo assim.', tab: 'adicionar', highlight: null }
    ],
    despensa: [
      { title: 'Criar alimento', text: 'Use + Novo alimento para abrir o cadastro. Comece por nome e unidade; depois preencha macros manualmente ou use preenchimento automático.', tab: 'despensa', highlight: 'pantry-food-name' },
      { title: 'Código de barras', text: 'Use a câmera para buscar no Open Food Facts. Se o navegador não permitir, digite o código manualmente.', tab: 'despensa', highlight: 'barcode-scan-button' },
      { title: 'Salvar alimento', text: 'Quando os valores estiverem corretos, salve para usar nos registros e sugestões.', tab: 'despensa', highlight: 'pantry-save-button' },
      { title: 'Itens salvos', text: 'A lista de alimentos fica aqui. Você pode buscar, editar e remover itens.', tab: 'despensa', highlight: 'pantry-saved-foods' },
      { title: 'Refeições salvas', text: 'Modelos guardam combinações frequentes para repetir depois com poucos toques.', tab: 'despensa', highlight: 'pantry-meal-templates' },
      { title: 'Suplementos', text: 'Suplementos ficam separados dos alimentos para facilitar o acompanhamento.', tab: 'despensa', highlight: 'pantry-supplements' }
    ],
    semana: [
      { title: 'Resumo semanal', text: 'Estes cartões mostram médias, dias que bateram proteína e o banco de calorias dos sete dias concluídos. O banco usa a meta específica de cada dia e informa quantos dias tinham registros.', tab: 'semana', highlight: 'week-summary' },
      { title: 'Dias da semana', text: 'Toque em um dia para abrir o diário daquele dia e ver os detalhes.', tab: 'semana', highlight: 'week-days' },
      { title: 'Proteína', text: 'Este gráfico mostra a ingestão de proteína e a linha de referência da meta.', tab: 'semana', highlight: 'week-protein-chart' },
      { title: 'Calorias', text: 'Aqui você acompanha a variação calórica recente em relação à meta. O dia atual aparece como andamento, separado dos sete dias já concluídos.', tab: 'semana', highlight: 'week-calories-chart' },
      { title: 'Médias por refeição', text: 'Quando houver dados suficientes, esta área mostra quais refeições concentram mais calorias, proteína e carboidratos.', tab: 'semana', highlight: 'week-meal-averages' }
    ],
    metricas: [
      { title: 'Acompanhamento e metas', text: 'A aba foi dividida em duas áreas: Acompanhamento para olhar a evolução e Metas para configurar objetivos.', tab: 'metricas', highlight: null },
      { title: 'Registro rápido', text: 'Em Acompanhamento, registre peso e medidas opcionais como gordura corporal, cintura e massa muscular. A altura fica como dado de perfil.', tab: 'metricas', highlight: 'metrics-measures' },
      { title: 'Atuais e gráficos', text: 'Veja peso, IMC e TMB atual em cartões organizados, além da composição corporal, evolução do peso e histórico.', tab: 'metricas', highlight: 'metrics-current' },
      { title: 'Evolução da TMB', text: 'A TMB é registrada junto às medidas corporais. Quando houver histórico suficiente, este gráfico mostra como ela mudou ao longo do tempo.', tab: 'metricas', highlight: 'bmr-chart' },
      { title: 'Composição corporal', text: 'Use gordura corporal, cintura e massa muscular como tendência. Esses dados são opcionais e podem variar conforme o método de medição.', tab: 'metricas', highlight: 'body-composition' },
      { title: 'Progresso e previsão', text: 'A seção mostra déficit, superávit, aderência semanal e tendência usando dias concluídos, sem contar o dia atual.', tab: 'metricas', highlight: 'metrics-progress' },
      { title: 'Metas', text: 'Na subárea Metas ficam atividade física, objetivo, meta de gordura, kg a perder, semanas, ajuste calórico, proteína por kg e metas personalizadas.', tab: 'metricas', highlight: 'nutrition-profile' },
      { title: 'Memória de cálculo', text: 'O resumo mostra TMB, base do dia, ajuste do objetivo, meta final e proteína calculada para manter transparência.', tab: 'metricas', highlight: 'metrics-target-summary' },
      { title: 'Relatórios', text: 'Gere relatórios HTML ou PDF para dia, semana, mês ou histórico completo.', tab: 'metricas', highlight: 'advanced-reports' }
    ],
    release080: [
      { title: 'Avaliação opcional', text: 'Refeições montadas e pratos descritos podem receber uma nota de 0 a 5 antes do registro. Se não quiser avaliar, use Registrar para enviá-las diretamente ao diário.', tab: 'adicionar', highlight: 'add-modes' },
      { title: 'Sugestões com nota', text: 'As sugestões de refeição também mostram uma nota breve, indicando o que está puxando cada opção para cima ou para baixo.', tab: 'diario', highlight: 'suggest-meal-button' },
      { title: 'Banco de calorias', text: 'O resumo da Semana mostra sua folga ou excesso calórico nos sete dias concluídos, respeitando a meta individual de cada dia.', tab: 'semana', highlight: 'week-summary' },
      { title: 'TMB nas métricas', text: 'Acompanhamento agora destaca sua TMB atual e, quando houver registros suficientes, mostra também a evolução desse valor.', tab: 'metricas', highlight: 'metrics-current' },
      { title: 'Espanhol e feedback', text: 'O app agora está disponível em espanhol. Use a engrenagem para trocar o idioma e abra Configurações quando quiser enviar sugestões ou reportar erros.', highlight: 'menu-settings', action: 'menu-settings', done: 'Abrir menu' }
    ]
  } : {
    main: [
      { title: 'Overview', text: 'The app is organized into tabs. This first guide is short; each tab has its own tutorial the first time you open it.', highlight: null },
      { title: 'Diary', text: "Track today's meals, water, goals, progress, and food suggestions.", highlight: 'tab-diario' },
      { title: 'Log', text: 'Use the add buttons inside meals to build a multi-item meal or describe a dish.', highlight: 'open-log-sheet' },
      { title: 'Foods', text: 'Search saved foods, create new items, scan barcodes, organize saved meals, and track supplements.', highlight: 'tab-despensa' },
      { title: 'Week', text: 'Review recent trends, the calorie bank, charts, and meal averages.', highlight: 'tab-semana' },
      { title: 'Metrics', text: 'Log measurements, follow weight, BMI, and BMR, adjust goals, and generate reports.', highlight: 'tab-metricas' },
      { title: 'Settings and languages', text: 'Use the gear to choose Brazilian Portuguese, English, or Spanish. Settings also contains backup, privacy, AI features, and feedback.', highlight: 'menu-settings' },
      { title: 'Help by tab', text: 'Each tab has a discreet "i" button. Tap it to reopen that tab tutorial.', highlight: null }
    ],
    diario: [
      { title: 'Daily diary', text: "This tab shows what you logged for the selected day and compares it with that day's goals.", tab: 'diario', highlight: 'tab-diario' },
      { title: 'Training or rest', text: 'Day type changes the calorie target. Use training for active days and rest for the reduced-day rule.', tab: 'diario', highlight: 'day-type' },
      { title: 'Suggest what to eat', text: 'This combines what is still missing from your goals with saved foods. Each suggestion shows a score and what helps or hurts the result.', tab: 'diario', highlight: 'suggest-meal-button' },
      { title: 'Micronutrients', text: "Open this area to review vitamins and minerals logged from the day's foods.", tab: 'diario', highlight: 'microLabel' }
    ],
    adicionar: [
      { title: 'Add meals', text: 'Choose between building a multi-item meal or describing a dish.', tab: 'adicionar', highlight: 'add-modes' },
      { title: 'Log or evaluate', text: 'Log meal sends it directly to the diary. Evaluate meal is optional and calculates a 0-to-5 score first.', tab: 'adicionar', highlight: 'add-modes' },
      { title: 'Understand and adjust', text: 'When you evaluate, the explanation highlights strengths and the main deviation. You can edit amounts, re-evaluate, or log anyway.', tab: 'adicionar', highlight: null }
    ],
    despensa: [
      { title: 'Create a food', text: 'Use + New food to open the form. Start with name and unit, then fill macros manually or use auto-fill.', tab: 'despensa', highlight: 'pantry-food-name' },
      { title: 'Barcode', text: 'Use the camera to search Open Food Facts. If the browser blocks it, type the code manually.', tab: 'despensa', highlight: 'barcode-scan-button' },
      { title: 'Save food', text: 'Once values look right, save it for logging and suggestions.', tab: 'despensa', highlight: 'pantry-save-button' },
      { title: 'Saved items', text: 'Your food list lives here. Search, edit, or remove items as needed.', tab: 'despensa', highlight: 'pantry-saved-foods' },
      { title: 'Saved meals', text: 'Templates save frequent combinations so you can repeat them with fewer taps.', tab: 'despensa', highlight: 'pantry-meal-templates' },
      { title: 'Supplements', text: 'Supplements are separate from foods so they are easier to track.', tab: 'despensa', highlight: 'pantry-supplements' }
    ],
    semana: [
      { title: 'Weekly summary', text: 'These cards show averages, protein-goal days, and the calorie bank for the seven completed days. The bank uses each day\'s own target and shows how many days had logs.', tab: 'semana', highlight: 'week-summary' },
      { title: 'Week days', text: "Tap a day to open that day's diary and inspect details.", tab: 'semana', highlight: 'week-days' },
      { title: 'Protein', text: 'This chart shows protein intake and the goal reference line.', tab: 'semana', highlight: 'week-protein-chart' },
      { title: 'Calories', text: 'Follow recent calorie variation against the goal. Today is shown as in progress, separate from the seven completed days.', tab: 'semana', highlight: 'week-calories-chart' },
      { title: 'Meal averages', text: 'When enough data exists, this area shows which meals concentrate more calories, protein, and carbs.', tab: 'semana', highlight: 'week-meal-averages' }
    ],
    metricas: [
      { title: 'Tracking and goals', text: 'The tab is split into two areas: Tracking for progress and Goals for objective settings.', tab: 'metricas', highlight: null },
      { title: 'Quick log', text: 'In Tracking, log weight and optional measurements like body fat, waist, and muscle mass. Height stays as profile data.', tab: 'metricas', highlight: 'metrics-measures' },
      { title: 'Current and charts', text: 'Review current weight, BMI, and BMR in organized cards, plus body composition, weight trend, and history.', tab: 'metricas', highlight: 'metrics-current' },
      { title: 'BMR trend', text: 'BMR is stored with body measurements. Once enough history exists, this chart shows how it changed over time.', tab: 'metricas', highlight: 'bmr-chart' },
      { title: 'Body composition', text: 'Use body fat, waist, and muscle mass as trends. These values are optional and can vary by measurement method.', tab: 'metricas', highlight: 'body-composition' },
      { title: 'Progress and forecast', text: 'This section shows deficit, surplus, weekly adherence, and trend using completed days, excluding today.', tab: 'metricas', highlight: 'metrics-progress' },
      { title: 'Goals', text: 'The Goals area contains activity, objective, body-fat target, kg to lose, weeks, calorie adjustment, protein per kg, and custom goals.', tab: 'metricas', highlight: 'nutrition-profile' },
      { title: 'Calculation memory', text: 'The summary shows BMR, day base, goal adjustment, final target, and calculated protein for transparency.', tab: 'metricas', highlight: 'metrics-target-summary' },
      { title: 'Reports', text: 'Generate HTML or PDF reports for day, week, month, or full history.', tab: 'metricas', highlight: 'advanced-reports' }
    ],
    release080: [
      { title: 'Optional assessment', text: 'Built meals and described dishes can receive a 0-to-5 score before logging. If you do not want an assessment, use Log meal to send it directly to the diary.', tab: 'adicionar', highlight: 'add-modes' },
      { title: 'Scored suggestions', text: 'Meal suggestions now include a brief score showing what pulls each option up or down.', tab: 'diario', highlight: 'suggest-meal-button' },
      { title: 'Calorie bank', text: 'The Week summary shows your calorie buffer or excess across the seven completed days while respecting each day\'s individual target.', tab: 'semana', highlight: 'week-summary' },
      { title: 'BMR in Metrics', text: 'Tracking now highlights your current BMR and, when enough records exist, its trend over time.', tab: 'metricas', highlight: 'metrics-current' },
      { title: 'Spanish and feedback', text: 'The app is now available in Spanish. Use the gear to change language, and open Settings whenever you want to send suggestions or report a problem.', highlight: 'menu-settings', action: 'menu-settings', done: 'Open menu' }
    ]
  };
  const spanishStepSets = {
    main: [
      { title: 'Vista general', text: 'La app est\u00e1 organizada por pesta\u00f1as. Esta primera gu\u00eda es corta; cada pesta\u00f1a tendr\u00e1 su propia explicaci\u00f3n la primera vez que la abras.', highlight: null },
      { title: 'Diario', text: 'Aqu\u00ed sigues el d\u00eda: comidas, agua, metas, progreso y sugerencias de qu\u00e9 comer.', highlight: 'tab-diario' },
      { title: 'Registrar', text: 'Usa los botones de a\u00f1adir en las comidas para montar una comida con varios \u00edtems o describir un plato.', highlight: 'open-log-sheet' },
      { title: 'Alimentos', text: 'Consulta alimentos guardados, crea nuevos, escanea c\u00f3digos de barras, organiza comidas guardadas y registra suplementos.', highlight: 'tab-despensa' },
      { title: 'Semana', text: 'Revisa tendencias recientes, el banco de calor\u00edas, gr\u00e1ficos y promedios por comida.', highlight: 'tab-semana' },
      { title: 'M\u00e9tricas', text: 'Registra medidas, sigue peso, IMC y TMB, ajusta metas y genera informes.', highlight: 'tab-metricas' },
      { title: 'Configuraci\u00f3n e idiomas', text: 'Usa el engranaje para elegir portugu\u00e9s de Brasil, ingl\u00e9s o espa\u00f1ol. En Configuraci\u00f3n tambi\u00e9n est\u00e1n la copia de seguridad, privacidad, funciones de IA y comentarios.', highlight: 'menu-settings' },
      { title: 'Ayuda por pesta\u00f1a', text: 'En cada pesta\u00f1a hay un bot\u00f3n discreto con "i". T\u00f3calo para volver a ver el tutorial de esa zona.', highlight: null }
    ],
    diario: [
      { title: 'Diario del d\u00eda', text: 'Esta pesta\u00f1a muestra lo que registraste en el d\u00eda seleccionado y lo compara con las metas de ese d\u00eda.', tab: 'diario', highlight: 'tab-diario' },
      { title: 'Entrenamiento o descanso', text: 'El tipo de d\u00eda cambia la meta cal\u00f3rica. Usa entrenamiento para d\u00edas activos y descanso para aplicar la regla reducida.', tab: 'diario', highlight: 'day-type' },
      { title: 'Sugerir qu\u00e9 comer', text: 'Combina lo que falta en tus metas con los alimentos guardados. Cada sugerencia muestra una nota y qu\u00e9 mejora o perjudica el resultado.', tab: 'diario', highlight: 'suggest-meal-button' },
      { title: 'Micronutrientes', text: 'Abre esta zona para revisar vitaminas y minerales registrados por los alimentos del d\u00eda.', tab: 'diario', highlight: 'microLabel' }
    ],
    adicionar: [
      { title: 'A\u00f1adir comidas', text: 'Elige entre montar una comida con varios \u00edtems o describir un plato.', tab: 'adicionar', highlight: 'add-modes' },
      { title: 'Registrar o evaluar', text: 'Registrar env\u00eda la comida directamente al diario. Evaluar comida es opcional y calcula antes una nota de 0 a 5.', tab: 'adicionar', highlight: 'add-modes' },
      { title: 'Entender y ajustar', text: 'Al evaluar, la explicaci\u00f3n destaca puntos fuertes y el principal desv\u00edo. Puedes editar cantidades, reevaluar o registrar igualmente.', tab: 'adicionar', highlight: null }
    ],
    despensa: [
      { title: 'Crear alimento', text: 'Usa + Nuevo alimento para abrir el formulario. Empieza por nombre y unidad, despu\u00e9s rellena macros manualmente o con IA.', tab: 'despensa', highlight: 'pantry-food-name' },
      { title: 'C\u00f3digo de barras', text: 'Usa la c\u00e1mara para buscar en Open Food Facts. Si el navegador lo bloquea, escribe el c\u00f3digo manualmente.', tab: 'despensa', highlight: 'barcode-scan-button' },
      { title: 'Guardar alimento', text: 'Cuando los valores est\u00e9n correctos, gu\u00e1rdalo para usarlo en registros y sugerencias.', tab: 'despensa', highlight: 'pantry-save-button' },
      { title: 'Alimentos guardados', text: 'Tu lista de alimentos vive aqu\u00ed. Puedes buscar, editar o eliminar \u00edtems.', tab: 'despensa', highlight: 'pantry-saved-foods' },
      { title: 'Comidas guardadas', text: 'Las plantillas guardan combinaciones frecuentes para repetirlas con pocos toques.', tab: 'despensa', highlight: 'pantry-meal-templates' },
      { title: 'Suplementos', text: 'Los suplementos est\u00e1n separados de los alimentos para facilitar el seguimiento.', tab: 'despensa', highlight: 'pantry-supplements' }
    ],
    semana: [
      { title: 'Resumen semanal', text: 'Estas tarjetas muestran promedios, d\u00edas que alcanzaron la prote\u00edna y el banco de calor\u00edas de los siete d\u00edas completados. El banco usa la meta propia de cada d\u00eda e indica cu\u00e1ntos ten\u00edan registros.', tab: 'semana', highlight: 'week-summary' },
      { title: 'D\u00edas de la semana', text: 'Toca un d\u00eda para abrir su diario y ver los detalles.', tab: 'semana', highlight: 'week-days' },
      { title: 'Prote\u00edna', text: 'Este gr\u00e1fico muestra la ingesta de prote\u00edna y la l\u00ednea de referencia de la meta.', tab: 'semana', highlight: 'week-protein-chart' },
      { title: 'Calor\u00edas', text: 'Sigue la variaci\u00f3n cal\u00f3rica reciente respecto a la meta. Hoy aparece como d\u00eda en curso, separado de los siete d\u00edas completados.', tab: 'semana', highlight: 'week-calories-chart' },
      { title: 'Promedios por comida', text: 'Cuando haya datos suficientes, esta zona muestra qu\u00e9 comidas concentran m\u00e1s calor\u00edas, prote\u00edna y carbohidratos.', tab: 'semana', highlight: 'week-meal-averages' }
    ],
    metricas: [
      { title: 'Seguimiento y metas', text: 'La pesta\u00f1a est\u00e1 dividida en dos \u00e1reas: Seguimiento para ver la evoluci\u00f3n y Metas para configurar objetivos.', tab: 'metricas', highlight: null },
      { title: 'Registro r\u00e1pido', text: 'En Seguimiento registra peso y medidas opcionales como grasa corporal, cintura y masa muscular. La altura queda como dato de perfil.', tab: 'metricas', highlight: 'metrics-measures' },
      { title: 'Actuales y gr\u00e1ficos', text: 'Revisa peso, IMC y TMB actual en tarjetas organizadas, adem\u00e1s de composici\u00f3n corporal, evoluci\u00f3n del peso e historial.', tab: 'metricas', highlight: 'metrics-current' },
      { title: 'Evoluci\u00f3n de la TMB', text: 'La TMB se guarda con las medidas corporales. Cuando haya historial suficiente, este gr\u00e1fico muestra c\u00f3mo cambi\u00f3 con el tiempo.', tab: 'metricas', highlight: 'bmr-chart' },
      { title: 'Composici\u00f3n corporal', text: 'Usa grasa corporal, cintura y masa muscular como tendencia. Son datos opcionales y pueden variar seg\u00fan el m\u00e9todo de medici\u00f3n.', tab: 'metricas', highlight: 'body-composition' },
      { title: 'Progreso y previsi\u00f3n', text: 'Muestra d\u00e9ficit, super\u00e1vit, adherencia semanal y tendencia usando d\u00edas completados, sin contar hoy.', tab: 'metricas', highlight: 'metrics-progress' },
      { title: 'Metas', text: 'En Metas est\u00e1n actividad, objetivo, meta de grasa, kg a perder, semanas, ajuste cal\u00f3rico, prote\u00edna por kg y metas personalizadas.', tab: 'metricas', highlight: 'nutrition-profile' },
      { title: 'Memoria de c\u00e1lculo', text: 'El resumen muestra TMB, base del d\u00eda, ajuste del objetivo, meta final y prote\u00edna calculada para mantener transparencia.', tab: 'metricas', highlight: 'metrics-target-summary' },
      { title: 'Informes', text: 'Genera informes HTML o PDF para d\u00eda, semana, mes o historial completo.', tab: 'metricas', highlight: 'advanced-reports' }
    ],
    release080: [
      { title: 'Evaluaci\u00f3n opcional', text: 'Las comidas montadas y los platos descritos pueden recibir una nota de 0 a 5 antes del registro. Si no quieres evaluarlas, usa Registrar para enviarlas directamente al diario.', tab: 'adicionar', highlight: 'add-modes' },
      { title: 'Sugerencias con nota', text: 'Las sugerencias de comida ahora incluyen una nota breve que indica qu\u00e9 mejora o perjudica cada opci\u00f3n.', tab: 'diario', highlight: 'suggest-meal-button' },
      { title: 'Banco de calor\u00edas', text: 'El resumen de Semana muestra tu margen o exceso cal\u00f3rico en los siete d\u00edas completados, respetando la meta individual de cada d\u00eda.', tab: 'semana', highlight: 'week-summary' },
      { title: 'TMB en M\u00e9tricas', text: 'Seguimiento ahora destaca tu TMB actual y, cuando haya registros suficientes, tambi\u00e9n muestra su evoluci\u00f3n.', tab: 'metricas', highlight: 'metrics-current' },
      { title: 'Espa\u00f1ol y comentarios', text: 'La app ya est\u00e1 disponible en espa\u00f1ol. Usa el engranaje para cambiar el idioma y abre Configuraci\u00f3n cuando quieras enviar sugerencias o reportar errores.', highlight: 'menu-settings', action: 'menu-settings', done: 'Abrir men\u00fa' }
    ]
  };
  const activeStepSets = isEs ? spanishStepSets : stepSets;
  const steps = activeStepSets[type] || activeStepSets.main;

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;
  const doneLabel = current.done || (isPt ? 'Concluir' : isEs ? 'Finalizar' : 'Done');
  const PAD = 10;
  function finishTutorial() {
    const action = current.action;
    onDone();
    if (action) {
      setTimeout(() => {
        const el = document.querySelector('[data-tutorial="' + action + '"]');
        if (el) el.click();
      }, 0);
    }
  }

  // Measure element and lock scroll
  React.useEffect(() => {
    // Lock scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Navigate to the step tab, then measure the highlighted element.
  React.useEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const key = current.highlight;
      if (!key) { setRect(null); return; }
      const el = document.querySelector('[data-tutorial="' + key + '"]');
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    if (current.tab) {
      const tabEl = document.querySelector('[data-tutorial="tab-' + current.tab + '"]');
      if (tabEl) {
        window.__tutorialNavigating = true;
        tabEl.click();
        setTimeout(() => { window.__tutorialNavigating = false; }, 180);
      }
      setRect(null);
      const timer = setTimeout(measure, 80);
      return () => { cancelled = true; clearTimeout(timer); };
    }
    measure();
    return () => { cancelled = true; };
  }, [step]);

  const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const R = 8;

  // SVG cutout path
  const cutout = rect
    ? 'M0,0 H' + vw + ' V' + vh + ' H0 Z ' +
      'M' + (rect.left - PAD + R) + ',' + (rect.top - PAD) + ' ' +
      'H' + (rect.left + rect.width + PAD - R) + ' ' +
      'Q' + (rect.left + rect.width + PAD) + ',' + (rect.top - PAD) + ' ' + (rect.left + rect.width + PAD) + ',' + (rect.top - PAD + R) + ' ' +
      'V' + (rect.top + rect.height + PAD - R) + ' ' +
      'Q' + (rect.left + rect.width + PAD) + ',' + (rect.top + rect.height + PAD) + ' ' + (rect.left + rect.width + PAD - R) + ',' + (rect.top + rect.height + PAD) + ' ' +
      'H' + (rect.left - PAD + R) + ' ' +
      'Q' + (rect.left - PAD) + ',' + (rect.top + rect.height + PAD) + ' ' + (rect.left - PAD) + ',' + (rect.top + rect.height + PAD - R) + ' ' +
      'V' + (rect.top - PAD + R) + ' ' +
      'Q' + (rect.left - PAD) + ',' + (rect.top - PAD) + ' ' + (rect.left - PAD + R) + ',' + (rect.top - PAD) + ' Z'
    : 'M0,0 H' + vw + ' V' + vh + ' H0 Z';

  // Tooltip positioning: prefer the open side of the highlight and avoid covering it.
  const TOOLTIP_W = Math.min(320, vw - 32);
  const TOOLTIP_H = Math.min(240, vh - 32);
  const GAP = 20; // gap between highlight and tooltip

  let tooltipTop, tooltipLeft;
  if (!rect) {
    tooltipTop = vh / 2 - TOOLTIP_H / 2;
    tooltipLeft = vw / 2 - TOOLTIP_W / 2;
  } else {
    const rectBottom = rect.top + rect.height;
    const spaceBelow = vh - (rectBottom + PAD);
    const spaceAbove = rect.top - PAD;
    if (spaceBelow >= TOOLTIP_H + GAP || spaceBelow >= spaceAbove) {
      tooltipTop = rectBottom + PAD + GAP;
    } else {
      tooltipTop = rect.top - PAD - GAP - TOOLTIP_H;
    }
    tooltipTop = Math.max(16, Math.min(tooltipTop, vh - TOOLTIP_H - 16));
    const overlapsHighlight = tooltipTop < rectBottom + GAP && tooltipTop + TOOLTIP_H > rect.top - GAP;
    if (overlapsHighlight) {
      tooltipTop = rect.top > vh / 2
        ? Math.max(16, rect.top - PAD - GAP - TOOLTIP_H)
        : Math.min(vh - TOOLTIP_H - 16, rectBottom + PAD + GAP);
    }
    tooltipLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 16));
  }

  return React.createElement(React.Fragment, null,
    // SVG overlay with cutout
    React.createElement('svg', {
      style: { position:'fixed', inset:0, zIndex:100000, pointerEvents:'none', overflow:'visible' },
      width: vw, height: vh, viewBox: '0 0 ' + vw + ' ' + vh
    },
      React.createElement('path', { d: cutout, fill:'rgba(0,0,0,0.75)', fillRule:'evenodd' }),
      rect && React.createElement('rect', {
        x: rect.left - PAD, y: rect.top - PAD,
        width: rect.width + PAD*2, height: rect.height + PAD*2,
        rx: R, ry: R, fill:'none', stroke:'#7ec87e', strokeWidth:2
      })
    ),
    // Click/scroll blocker
    React.createElement('div', {
      style:{ position:'fixed', inset:0, zIndex:100001 },
      onClick: e => e.stopPropagation(),
      onMouseDown: e => e.stopPropagation(),
      onTouchMove: e => e.preventDefault(),
      onWheel: e => e.preventDefault()
    }),
    // Tooltip
    React.createElement('div', {
      style:{
        position:'fixed', zIndex:100002,
        top: tooltipTop, left: tooltipLeft,
        width: TOOLTIP_W,
        background:'var(--surface,#1a1a1a)',
        borderRadius:14, padding:'18px 18px 14px',
        boxShadow:'0 8px 32px rgba(0,0,0,0.3)',
        border:'1px solid var(--border2,#333)',
        maxHeight: TOOLTIP_H,
        overflowY: 'auto',
        boxSizing: 'border-box'
      }
    },
      // Progress dots
      React.createElement('div', {style:{display:'flex',gap:4,marginBottom:12}},
        steps.map((_, i) => React.createElement('div', {key:i, style:{
          width: i===step?16:5, height:5, borderRadius:3,
          background: i===step?'#7ec87e':'var(--border2,#444)',
          transition:'all 0.25s'
        }}))
      ),
      React.createElement('div', {style:{fontSize:15,fontWeight:600,color:'var(--text,#fff)',marginBottom:6}}, current.title),
      React.createElement('div', {style:{fontSize:13,color:'var(--muted,#888)',lineHeight:1.5,marginBottom:16,whiteSpace:'pre-line'}}, current.text),
      React.createElement('div', {style:{display:'flex',gap:8,alignItems:'center'}},
        React.createElement('button', {
          onClick: onDone,
          style:{fontSize:12,color:'var(--muted,#888)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',padding:'6px 0',marginRight:'auto'}
        }, isPt?'Pular':'Skip'),
        !isFirst && React.createElement('button', {
          onClick: () => setStep(s=>s-1),
          style:{fontSize:13,padding:'8px 14px',borderRadius:8,background:'none',border:'1px solid var(--border2,#444)',color:'var(--text2,#aaa)',cursor:'pointer',fontFamily:'inherit'}
        }, '<'),
        React.createElement('button', {
          onClick: isLast ? finishTutorial : ()=>setStep(s=>s+1),
          style:{fontSize:13,padding:'8px 18px',borderRadius:8,background:'#7ec87e',border:'none',color:'#111',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}
        }, isLast ? doneLabel : (isPt?'Próximo':'Next'))
      )
    )
  );
}

function isValidBirthDate(value) {
  if (!value) return false;
  const d = new Date(value + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  const min = new Date('1900-01-01T00:00:00');
  return d <= today && d >= min;
}

function isValidGender(value) {
  return value === 'male' || value === 'female';
}

function isValidActivityLevel(value) {
  return !!ACTIVITY_LEVELS[value];
}

function isValidGoalProfile(profile) {
  if (!profile || !['maintenance','loss','gain'].includes(profile.goalType)) return false;
  if (!isValidActivityLevel(profile.activityLevel)) return false;
  if (profile.goalType === 'maintenance') return true;
  return Number(profile.goalKg) > 0 && Number(profile.goalWeeks) > 0;
}

async function getRequiredProfileData() {
  const [birthDate, gender, activityLevel, goalType, goalKg, goalWeeks, manualAdjustment] = await Promise.all([
    storage.get('birthDate').catch(()=>null),
    storage.get('gender').catch(()=>null),
    storage.get('activityLevel').catch(()=>null),
    storage.get('goalType').catch(()=>null),
    storage.get('goalKg').catch(()=>null),
    storage.get('goalWeeks').catch(()=>null),
    storage.get('manualCalorieAdjustment').catch(()=>null)
  ]);
  return {
    birthDate: birthDate && birthDate.value ? birthDate.value : '',
    gender: gender && gender.value ? gender.value : '',
    activityLevel: activityLevel && activityLevel.value ? activityLevel.value : '',
    goalType: goalType && goalType.value ? goalType.value : '',
    goalKg: goalKg && goalKg.value ? goalKg.value : '',
    goalWeeks: goalWeeks && goalWeeks.value ? goalWeeks.value : '',
    manualAdjustment: manualAdjustment && manualAdjustment.value ? manualAdjustment.value : ''
  };
}

function hasRequiredProfileData(profile) {
  return !!profile && isValidBirthDate(profile.birthDate) && isValidGender(profile.gender) && isValidGoalProfile(profile);
}

function RequiredProfileModal({lang, profile, onComplete}) {
  const normalizedLang = normalizeLanguage(lang || 'pt');
  const isPt = normalizedLang === 'pt';
  const isEs = normalizedLang === 'es';
  const [birthDate, setBirthDate] = React.useState(profile?.birthDate || '');
  const [gender, setGender] = React.useState(profile?.gender || '');
  const [activityLevel, setActivityLevel] = React.useState(profile?.activityLevel || '');
  const [goalType, setGoalType] = React.useState(profile?.goalType || '');
  const [goalKg, setGoalKg] = React.useState(profile?.goalKg || '');
  const [goalWeeks, setGoalWeeks] = React.useState(profile?.goalWeeks || '');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const S = isPt
    ? {title:'Completar perfil nutricional', text:'Para calcular suas metas, estes dados s\u00e3o obrigat\u00f3rios.', birth:'Data de nascimento *', gender:'G\u00eanero *', activity:'Atividade f\u00edsica *', goal:'Objetivo *', choose:'Selecionar', male:'Masculino', female:'Feminino', maintenance:'Manuten\u00e7\u00e3o do peso', loss:'Perda de peso', gain:'Ganho de peso', kgLoss:'Quantos kg deseja perder?', kgGain:'Quantos kg deseja ganhar?', weeks:'Em quantas semanas?', save:'Salvar e continuar', saving:'Salvando...', err:'Preencha todos os dados obrigat\u00f3rios.', readErr:'Os dados n\u00e3o foram encontrados depois de salvar.', saveErr:'N\u00e3o foi poss\u00edvel salvar no banco de dados: '}
    : isEs
      ? {title:'Completar perfil nutricional', text:'Estos datos son obligatorios para calcular tus metas.', birth:'Fecha de nacimiento *', gender:'G\u00e9nero *', activity:'Actividad f\u00edsica *', goal:'Objetivo *', choose:'Seleccionar', male:'Masculino', female:'Femenino', maintenance:'Mantenimiento del peso', loss:'P\u00e9rdida de peso', gain:'Ganancia de peso', kgLoss:'\u00bfCu\u00e1ntos kg quieres perder?', kgGain:'\u00bfCu\u00e1ntos kg quieres ganar?', weeks:'\u00bfEn cu\u00e1ntas semanas?', save:'Guardar y continuar', saving:'Guardando...', err:'Completa todos los datos obligatorios.', readErr:'Los datos no se encontraron despu\u00e9s de guardar.', saveErr:'No fue posible guardar en la base de datos: '}
      : {title:'Complete nutrition profile', text:'These details are required to calculate your targets.', birth:'Date of birth *', gender:'Gender *', activity:'Physical activity *', goal:'Goal *', choose:'Select', male:'Male', female:'Female', maintenance:'Weight maintenance', loss:'Weight loss', gain:'Weight gain', kgLoss:'How many kg do you want to lose?', kgGain:'How many kg do you want to gain?', weeks:'In how many weeks?', save:'Save and continue', saving:'Saving...', err:'Fill all required details.', readErr:'Saved details could not be read back.', saveErr:'Could not save to the database: '};
  const inp = {width:'100%',background:'#f5f3ef',border:'1px solid #b8b4ac',color:'#252220',padding:'12px 14px',borderRadius:8,fontSize:15,fontFamily:'inherit',boxSizing:'border-box',outline:'none',marginTop:6,marginBottom:14};
  const labelStyle = {fontSize:10,letterSpacing:1.5,color:'#6a6662',textTransform:'uppercase'};
  async function saveProfile(e) {
    e.preventDefault();
    setError('');
    const nextProfile = {birthDate, gender, activityLevel, goalType, goalKg, goalWeeks};
    if (!isValidBirthDate(birthDate) || !isValidGender(gender) || !isValidGoalProfile(nextProfile)) { setError(S.err); return; }
    setSaving(true);
    try {
      await Promise.all([
        storage.set('birthDate', birthDate),
        storage.set('gender', gender),
        storage.set('activityLevel', activityLevel),
        storage.set('goalType', goalType),
        storage.set('goalKg', goalType === 'maintenance' ? '' : goalKg),
        storage.set('goalWeeks', goalType === 'maintenance' ? '' : goalWeeks)
      ]);
      const savedProfile = await getRequiredProfileData().catch(()=>null);
      if (!hasRequiredProfileData(savedProfile)) throw new Error(S.readErr);
      setSaving(false);
      onComplete(savedProfile);
    } catch (err) {
      setSaving(false);
      setError(S.saveErr + (err?.message || err));
    }
  }
  return React.createElement('div', {style:{position:'fixed',inset:0,zIndex:100000,background:'rgba(242,241,237,0.94)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto'}},
    React.createElement('form', {onSubmit:saveProfile, style:{width:'100%',maxWidth:420,background:'#ffffff',border:'1px solid #ccc8c0',borderRadius:14,padding:24,boxShadow:'0 20px 80px rgba(60,50,40,0.18)',margin:'auto'}},
      React.createElement('div', {style:{fontSize:20,color:'#3a3733',marginBottom:8}}, S.title),
      React.createElement('div', {style:{fontSize:13,color:'#6a6662',lineHeight:1.5,marginBottom:20}}, S.text),
      React.createElement('label', {style:labelStyle}, S.birth),
      React.createElement('input', {type:'date', value:birthDate, onChange:e=>setBirthDate(e.target.value), required:true, max:new Date().toISOString().split('T')[0], min:'1900-01-01', style:inp}),
      React.createElement('label', {style:labelStyle}, S.gender),
      React.createElement('select', {value:gender, onChange:e=>setGender(e.target.value), required:true, style:inp},
        React.createElement('option', {value:'', style:{background:'#f5f3ef',color:'#252220'}}, S.choose),
        React.createElement('option', {value:'male', style:{background:'#f5f3ef',color:'#252220'}}, S.male),
        React.createElement('option', {value:'female', style:{background:'#f5f3ef',color:'#252220'}}, S.female)
      ),
      React.createElement('label', {style:labelStyle}, S.activity),
      React.createElement('select', {value:activityLevel, onChange:e=>setActivityLevel(e.target.value), required:true, style:inp},
        React.createElement('option', {value:'', style:{background:'#f5f3ef',color:'#252220'}}, S.choose),
        Object.entries(ACTIVITY_LEVELS).map(([key, data]) => {
          const label = pickLang(normalizedLang, data.pt, data.en, data.es);
          const desc = pickLang(normalizedLang, data.descPt, data.descEn, data.descEs);
          return React.createElement('option', {key, value:key, style:{background:'#f5f3ef',color:'#252220'}}, label + ' - ' + desc);
        })
      ),
      React.createElement('label', {style:labelStyle}, S.goal),
      React.createElement('select', {value:goalType, onChange:e=>setGoalType(e.target.value), required:true, style:inp},
        React.createElement('option', {value:'', style:{background:'#f5f3ef',color:'#252220'}}, S.choose),
        React.createElement('option', {value:'maintenance', style:{background:'#f5f3ef',color:'#252220'}}, S.maintenance),
        React.createElement('option', {value:'loss', style:{background:'#f5f3ef',color:'#252220'}}, S.loss),
        React.createElement('option', {value:'gain', style:{background:'#f5f3ef',color:'#252220'}}, S.gain)
      ),
      (goalType === 'loss' || goalType === 'gain') && React.createElement(React.Fragment, null,
        React.createElement('label', {style:labelStyle}, goalType === 'loss' ? S.kgLoss : S.kgGain),
        React.createElement('input', {type:'number', min:'0.1', step:'0.1', value:goalKg, onChange:e=>setGoalKg(e.target.value), required:true, style:inp}),
        React.createElement('label', {style:labelStyle}, S.weeks),
        React.createElement('input', {type:'number', min:'1', step:'1', value:goalWeeks, onChange:e=>setGoalWeeks(e.target.value), required:true, style:inp})
      ),
      error && React.createElement('div', {style:{color:'#c87e7e',fontSize:12,marginBottom:14,padding:'8px 12px',background:'rgba(200,80,80,0.1)',borderRadius:6,border:'1px solid rgba(200,80,80,0.2)'}}, error),
      React.createElement('button', {type:'submit', disabled:saving, style:{width:'100%',background:saving?'#ede9e3':'#e8f4e8',border:'1px solid #a8cfa8',color:saving?'#8a8680':'#2a6a2a',padding:'13px',borderRadius:8,fontSize:12,letterSpacing:1,textTransform:'uppercase',cursor:saving?'default':'pointer',fontFamily:'inherit'}}, saving ? S.saving : S.save)
    )
  );
}
function LoginScreen({onLogin, onPendingVerification}) {
  const [mode, setMode] = React.useState('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [password2, setPassword2] = React.useState('');
  const [error, setError] = React.useState('');
  const [resetMessage, setResetMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [resetLoading, setResetLoading] = React.useState(false);
  const [loginLang, setLoginLang] = React.useState(() => normalizeLanguage(localStorage.getItem('appLang') || 'pt'));
  const [regWeight, setRegWeight] = React.useState('');
  const [regHeight, setRegHeight] = React.useState('');
  const [regName, setRegName] = React.useState('');
  const [regBirthDate, setRegBirthDate] = React.useState('');
  const [regGender, setRegGender] = React.useState('');
  const [loginDark, setLoginDark] = React.useState(() => {
    const saved = localStorage.getItem('appDarkMode');
    return saved !== null ? saved === 'true' : false;
  });
  React.useEffect(() => {
    document.documentElement.dataset.theme = loginDark ? 'dark' : 'light';
  }, [loginDark]);

  const normalizedLoginLang = normalizeLanguage(loginLang);
  const loginCopy = {
    pt: {
      title: 'Di\u00e1rio Nutricional', login: 'Entrar', register: 'Criar conta',
      subtitle: 'Acompanhe sua nutri\u00e7\u00e3o di\u00e1ria e alcance seus objetivos.',
      email: 'Email', password: 'Senha', confirm: 'Confirmar senha',
      loginBtn: 'Entrar', registerBtn: 'Criar conta', processing: 'Processando...',
      forgotPassword: 'Esqueci minha senha', resetSending: 'Enviando...',
      resetSent: 'Se existir uma conta com esse e-mail, enviaremos as instru\u00e7\u00f5es de recupera\u00e7\u00e3o.',
      resetEmailRequired: 'Digite seu e-mail para recuperar a senha.',
      tabLogin: 'Entrar', tabRegister: 'Criar conta', name: 'Seu nome *', birthTitle: 'Data de nascimento *',
      genderPlaceholder: 'G\u00eanero *', weightPlaceholder: 'Peso (kg)', heightPlaceholder: 'Altura (cm)',
      male: 'Masculino', female: 'Feminino', errPrefix: 'Erro: ',
      errCredentials: 'Email ou senha incorretos.', errPassword: 'Senha incorreta.',
      errTooMany: 'Muitas tentativas. Tente novamente mais tarde.',
      errExists: 'Este email j\u00e1 tem uma conta. Entre.', errWeak: 'A senha deve ter pelo menos 6 caracteres.',
      errInvalid: 'Email inv\u00e1lido.', errMatch: 'As senhas n\u00e3o coincidem.', errShort: 'A senha deve ter pelo menos 6 caracteres.',
      errName: 'O nome \u00e9 obrigat\u00f3rio.', errBirth: 'A data de nascimento \u00e9 obrigat\u00f3ria e deve ser v\u00e1lida.',
      errGender: 'O g\u00eanero \u00e9 obrigat\u00f3rio.'
    },
    en: {
      title: 'Nutrition Tracker', login: 'Sign in', register: 'Create account',
      subtitle: 'Track your daily nutrition and reach your goals.',
      email: 'Email', password: 'Password', confirm: 'Confirm password',
      loginBtn: 'Sign in', registerBtn: 'Create account', processing: 'Processing...',
      forgotPassword: 'Forgot password?', resetSending: 'Sending...',
      resetSent: 'If an account exists for this email, password recovery instructions will be sent.',
      resetEmailRequired: 'Enter your email to recover your password.',
      tabLogin: 'Sign in', tabRegister: 'Create account', name: 'Your name *', birthTitle: 'Date of birth *',
      genderPlaceholder: 'Gender *', weightPlaceholder: 'Weight (kg)', heightPlaceholder: 'Height (cm)',
      male: 'Male', female: 'Female', errPrefix: 'Error: ',
      errCredentials: 'Incorrect email or password.', errPassword: 'Incorrect password.',
      errTooMany: 'Too many attempts. Try again later.', errExists: 'This email already has an account. Sign in instead.',
      errWeak: 'Password must be at least 6 characters.', errInvalid: 'Invalid email.', errMatch: "Passwords don't match.",
      errShort: 'Password must be at least 6 characters.', errName: 'Name is required.',
      errBirth: 'Date of birth is required and must be valid.', errGender: 'Gender is required.'
    },
    es: {
      title: 'Diario Nutricional', login: 'Iniciar sesi\u00f3n', register: 'Crear cuenta',
      subtitle: 'Registra tu nutrici\u00f3n diaria y avanza hacia tus objetivos.',
      email: 'Email', password: 'Contrase\u00f1a', confirm: 'Confirmar contrase\u00f1a',
      loginBtn: 'Entrar', registerBtn: 'Crear cuenta', processing: 'Procesando...',
      forgotPassword: 'Olvid\u00e9 mi contrase\u00f1a', resetSending: 'Enviando...',
      resetSent: 'Si existe una cuenta con este email, enviaremos las instrucciones de recuperaci\u00f3n.',
      resetEmailRequired: 'Escribe tu email para recuperar la contrase\u00f1a.',
      tabLogin: 'Entrar', tabRegister: 'Crear cuenta', name: 'Tu nombre *', birthTitle: 'Fecha de nacimiento *',
      genderPlaceholder: 'G\u00e9nero *', weightPlaceholder: 'Peso (kg)', heightPlaceholder: 'Altura (cm)',
      male: 'Masculino', female: 'Femenino', errPrefix: 'Error: ',
      errCredentials: 'Email o contrase\u00f1a incorrectos.', errPassword: 'Contrase\u00f1a incorrecta.',
      errTooMany: 'Demasiados intentos. Int\u00e9ntalo m\u00e1s tarde.', errExists: 'Este email ya tiene una cuenta. Inicia sesi\u00f3n.',
      errWeak: 'La contrase\u00f1a debe tener al menos 6 caracteres.', errInvalid: 'Email inv\u00e1lido.', errMatch: 'Las contrase\u00f1as no coinciden.',
      errShort: 'La contrase\u00f1a debe tener al menos 6 caracteres.', errName: 'El nombre es obligatorio.',
      errBirth: 'La fecha de nacimiento es obligatoria y debe ser v\u00e1lida.', errGender: 'El g\u00e9nero es obligatorio.'
    }
  };
  const S = loginCopy[normalizedLoginLang] || loginCopy.pt;

  function toggleLoginDark() {
    setLoginDark(d => {
      const next = !d;
      localStorage.setItem('appDarkMode', String(next));
      return next;
    });
  }

  function setLoginLanguage(nextLang) {
    const normalized = normalizeLanguage(nextLang);
    localStorage.setItem('appLang', normalized);
    setLoginLang(normalized);
  }

  function friendlyError(msg) {
    const raw = String(msg || '');
    if (raw.includes('EMAIL_NOT_FOUND') || raw.includes('INVALID_LOGIN_CREDENTIALS') || raw.includes('INVALID_EMAIL')) return S.errCredentials;
    if (raw.includes('WRONG_PASSWORD')) return S.errPassword;
    if (raw.includes('TOO_MANY_ATTEMPTS')) return S.errTooMany;
    if (raw.includes('EMAIL_EXISTS')) return S.errExists;
    if (raw.includes('WEAK_PASSWORD')) return S.errWeak;
    return S.errPrefix + raw;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResetMessage('');
    if (mode === 'register' && password !== password2) { setError(S.errMatch); return; }
    if (mode === 'register' && password.length < 6) { setError(S.errShort); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        await fbSignIn(email, password);
        const verified = await fbCheckEmailVerified().catch(()=>true);
        if (!verified) { onPendingVerification(email); return; }
        onLogin(false);
      } else {
        if (!regName.trim()) { setError(S.errName); setLoading(false); return; }
        if (!isValidBirthDate(regBirthDate)) { setError(S.errBirth); setLoading(false); return; }
        if (!isValidGender(regGender)) { setError(S.errGender); setLoading(false); return; }
        await fbSignUp(email, password);
        localStorage.setItem('fb_email', email);
        await fbUpdateProfile(regName.trim()).catch(()=>{});
        const today = new Date().toISOString().split('T')[0];
        if (regWeight || regHeight) {
          const entry = {
            id: Date.now().toString(),
            date: today,
            weight: regWeight ? parseFloat(regWeight) : null,
            height: regHeight ? parseFloat(regHeight) : null
          };
          await fbSet('weightHistory', JSON.stringify([entry])).catch(()=>{});
        }
        await fbSet('userName', regName.trim()).catch(()=>{});
        await fbSet('birthDate', regBirthDate).catch(()=>{});
        await fbSet('gender', regGender).catch(()=>{});
        await fbSet('language', normalizedLoginLang).catch(()=>{});
        await fbSendVerificationEmail().catch(()=>{});
        onPendingVerification(email, regName.trim());
      }
    } catch(err) {
      setError(friendlyError(err.message));
    }
    setLoading(false);
  }

  /**
   * Sends a Firebase password reset request without exposing whether the email
   * exists. Reads the current email input and writes a local status message.
   */
  async function handlePasswordReset() {
    const cleanEmail = String(email || '').trim();
    setError('');
    setResetMessage('');
    if (!cleanEmail) { setError(S.resetEmailRequired); return; }
    setResetLoading(true);
    try {
      await fbSendPasswordResetEmail(cleanEmail);
      setResetMessage(S.resetSent);
    } catch (err) {
      if (String(err.message || '').includes('EMAIL_NOT_FOUND')) setResetMessage(S.resetSent);
      else setError(friendlyError(err.message));
    } finally {
      setResetLoading(false);
    }
  }

  function switchMode(m) {
    setMode(m);
    setError('');
    setResetMessage('');
    setPassword('');
    setPassword2('');
  }

  const inp = {width:'100%',background:'var(--input)',border:'1px solid var(--border2)',color:'var(--text)',padding:'12px 14px',borderRadius:8,fontSize:15,fontFamily:'inherit',boxSizing:'border-box',outline:'none',marginBottom:12};
  const tabStyle = active => ({flex:1,padding:'10px',background:'none',border:'none',borderBottom:active?'2px solid var(--btn-ok-text,#4a9a4a)':'2px solid var(--border2)',color:active?'var(--btn-ok-text,#4a9a4a)':'var(--muted)',fontSize:11,letterSpacing:1,textTransform:'uppercase',cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s'});
  const loginTheme = loginDark
    ? {'--bg':'#111','--surface':'#161616','--input':'#1e1e1e','--border2':'#2a2a2a','--text':'#e8e0d5','--text3':'#c9bfb0','--muted':'#8a8a8a','--btn-ok':'#1e2e1e','--btn-ok-border':'#3a5a3a','--btn-ok-text':'#7ec87e','--btn-info':'#1a1e2a','--btn-info-border':'#3a3a6a','--btn-info-text':'#8a9ec8','--btn-inactive':'#191919','--btn-warn-text':'#c87e7e'}
    : {'--bg':'#f2f1ed','--surface':'#ffffff','--input':'#f5f3ef','--border2':'#b8b4ac','--text':'#252220','--text3':'#3a3733','--muted':'#6a6662','--btn-ok':'#e8f4e8','--btn-ok-border':'#a8cfa8','--btn-ok-text':'#2a6a2a','--btn-info':'#e8eaf4','--btn-info-border':'#a8aed0','--btn-info-text':'#3a4a8a','--btn-inactive':'#ede9e3','--btn-warn-text':'#8a2a2a'};
  const loginVars = Object.assign({position:'fixed',inset:0,background:loginDark?'#111':'#f2f1ed',display:'flex',alignItems:'center',justifyContent:'center',padding:24,zIndex:99999}, loginTheme);

  return React.createElement('div', {style: loginVars},
    React.createElement('div', {style:{width:'100%',maxWidth:380}},
      React.createElement('div', {style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:16}},
        React.createElement('button', {onClick:toggleLoginDark, style:{background:'none',border:'1px solid var(--border2)',color:'var(--muted)',borderRadius:6,padding:'5px 10px',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}, loginDark ? '\u2600' : '\u263e'),
        React.createElement('div', {style:{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}},
          LANGUAGE_OPTIONS.map(option => React.createElement('button', {
            key: option.code,
            onClick:()=>setLoginLanguage(option.code),
            style:{background:option.code===normalizedLoginLang?'var(--btn-info)':'none',border:'1px solid var(--border2)',color:option.code===normalizedLoginLang?'var(--btn-info-text)':'var(--muted)',borderRadius:6,padding:'5px 8px',fontSize:11,cursor:'pointer',fontFamily:'inherit'}
          }, option.flag + ' ' + option.short))
        )
      ),
      React.createElement('div', {style:{textAlign:'center',marginBottom:32}},
        React.createElement('div', {style:{fontSize:11,letterSpacing:1,color:'var(--muted)',textTransform:'uppercase',marginBottom:6}}, S.title),
        React.createElement('div', {style:{fontSize:22,color:'var(--text3)',fontWeight:400,marginBottom:8}}, mode === 'login' ? S.login : S.register),
        mode === 'login' && React.createElement('p', {style:{fontSize:13,color:'var(--muted)',margin:0,lineHeight:1.5}}, S.subtitle)
      ),
      React.createElement('div', {style:{display:'flex',marginBottom:28,borderBottom:'2px solid var(--border2)'}},
        React.createElement('button', {onClick:()=>switchMode('login'), style:tabStyle(mode==='login')}, S.tabLogin),
        React.createElement('button', {onClick:()=>switchMode('register'), style:tabStyle(mode==='register')}, S.tabRegister)
      ),
      React.createElement('form', {onSubmit:handleSubmit},
        React.createElement('input', {type:'email',value:email,onChange:e=>setEmail(e.target.value),placeholder:S.email,required:true,style:inp,autoComplete:'email'}),
        React.createElement('input', {type:'password',value:password,onChange:e=>setPassword(e.target.value),placeholder:S.password,required:true,style:{...inp,marginBottom:mode==='register'?12:error?8:20},autoComplete:mode==='login'?'current-password':'new-password'}),
        mode === 'login' && React.createElement('button', {type:'button',onClick:handlePasswordReset,disabled:resetLoading || loading,style:{width:'100%',background:'none',border:'none',color:'var(--btn-info-text)',cursor:(resetLoading||loading)?'default':'pointer',fontSize:12,fontFamily:'inherit',textAlign:'right',padding:'0 2px 14px',opacity:(resetLoading||loading)?0.65:1}}, resetLoading ? S.resetSending : S.forgotPassword),
        mode === 'register' && React.createElement('input', {type:'password',value:password2,onChange:e=>setPassword2(e.target.value),placeholder:S.confirm,required:true,style:{...inp,marginBottom:12},autoComplete:'new-password'}),
        mode === 'register' && React.createElement('input', {type:'text',value:regName,onChange:e=>setRegName(e.target.value),placeholder:S.name,style:{...inp,marginBottom:12},autoComplete:'name'}),
        mode === 'register' && React.createElement('input', {type:'date',value:regBirthDate,onChange:e=>setRegBirthDate(e.target.value),required:true,max:new Date().toISOString().split('T')[0],min:'1900-01-01',title:S.birthTitle,style:{...inp,marginBottom:12},autoComplete:'bday'}),
        mode === 'register' && React.createElement('select', {value:regGender,onChange:e=>setRegGender(e.target.value),required:true,style:{...inp,marginBottom:12}},
          React.createElement('option', {value:''}, S.genderPlaceholder),
          React.createElement('option', {value:'male'}, S.male),
          React.createElement('option', {value:'female'}, S.female)
        ),
        mode === 'register' && React.createElement('div', {style:{display:'flex',gap:8,marginBottom:error?8:20}},
          React.createElement('input', {type:'number',value:regWeight,onChange:e=>setRegWeight(e.target.value),placeholder:S.weightPlaceholder,min:30,max:300,step:0.1,style:{...inp,marginBottom:0,flex:1}}),
          React.createElement('input', {type:'number',value:regHeight,onChange:e=>setRegHeight(e.target.value),placeholder:S.heightPlaceholder,min:100,max:250,style:{...inp,marginBottom:0,flex:1}})
        ),
        error && React.createElement('div', {style:{color:'#c87e7e',fontSize:12,marginBottom:16,padding:'8px 12px',background:'rgba(200,80,80,0.1)',borderRadius:6,border:'1px solid rgba(200,80,80,0.2)'}}, error),
        resetMessage && React.createElement('div', {style:{color:'var(--btn-ok-text)',fontSize:12,marginBottom:16,padding:'8px 12px',background:'rgba(80,160,80,0.1)',borderRadius:6,border:'1px solid var(--btn-ok-border)',lineHeight:1.4}}, resetMessage),
        React.createElement('button', {type:'submit',disabled:loading,style:{width:'100%',background:loading?'var(--btn-inactive)':mode==='login'?'var(--btn-ok)':'var(--btn-info)',border:'1px solid ' + (mode==='login'?'var(--btn-ok-border)':'var(--btn-info-border)'),color:loading?'var(--muted)':mode==='login'?'var(--btn-ok-text)':'var(--btn-info-text)',padding:'13px',borderRadius:8,fontSize:12,letterSpacing:1,textTransform:'uppercase',cursor:loading?'default':'pointer',fontFamily:'inherit',transition:'all 0.2s'}}, loading ? S.processing : mode==='login' ? S.loginBtn : S.registerBtn)
      )
    )
  );
}
// Settings Panel
function SettingsPanel({onClose, onLogout, onOpenBackup, onOpenPrivacy, lang, darkMode, toggleLang, toggleDark, directKey}) {
  const [showKey, setShowKey] = React.useState(!!directKey);
  const [showFeedbackConfirm, setShowFeedbackConfirm] = React.useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = React.useState(false);
  const [groqKey, setGroqKey] = React.useState(()=>localStorage.getItem('groq_key')||'');
  const [proxy, setProxy] = React.useState(()=>localStorage.getItem('cors_proxy')||'');

  const normalizedLang = normalizeLanguage(lang || 'pt');
  const currentLanguage = getLanguageOption(normalizedLang);
  const feedbackFormUrl = normalizedLang === 'pt'
    ? 'https://forms.gle/KYg6WKRDzgWkKC5U7'
    : 'https://forms.gle/4WUAXiWHAWd5vJ94A';

  const S = {
    title: pickLang(normalizedLang, 'Configura\u00e7\u00f5es', 'Settings', 'Configuraci\u00f3n'),
    appearance: pickLang(normalizedLang, 'Apar\u00eancia', 'Appearance', 'Apariencia'),
    languageTitle: pickLang(normalizedLang, 'Idioma', 'Language', 'Idioma'),
    languageHint: pickLang(normalizedLang, 'Escolha o idioma da interface.', 'Choose the interface language.', 'Elige el idioma de la interfaz.'),
    darkMode: darkMode
      ? pickLang(normalizedLang, 'Modo claro', 'Light mode', 'Modo claro')
      : pickLang(normalizedLang, 'Modo escuro', 'Dark mode', 'Modo oscuro'),
    data: pickLang(normalizedLang, 'Dados', 'Data', 'Datos'),
    backup: pickLang(normalizedLang, 'Backup e restaurar', 'Backup & restore', 'Copia de seguridad y restauraci\u00f3n'),
    privacy: pickLang(normalizedLang, 'Privacidade e seguran\u00e7a', 'Privacy & security', 'Privacidad y seguridad'),
    intelligence: pickLang(normalizedLang, 'Intelig\u00eancia', 'Intelligence', 'Inteligencia'),
    apiKey: pickLang(normalizedLang, 'IA / Chave de API (avan\u00e7ado)', 'AI / API key (advanced)', 'IA / Clave API (avanzado)'),
    aiHint: pickLang(
      normalizedLang,
      'Habilita as fun\u00e7\u00f5es com \u2726, como an\u00e1lises e preenchimento por IA.',
      'Enables \u2726 features such as AI analysis and automatic filling.',
      'Activa las funciones con \u2726, como an\u00e1lisis y relleno con IA.'
    ),
    feedbackSupport: pickLang(normalizedLang, 'Feedback e suporte', 'Feedback & support', 'Comentarios y soporte'),
    feedbackLabel: pickLang(normalizedLang, 'Enviar feedback / reportar erro', 'Send feedback / report a bug', 'Enviar comentarios / reportar error'),
    feedbackHint: pickLang(normalizedLang, 'Abre um formul\u00e1rio em uma nova aba.', 'Opens a form in a new tab.', 'Abre un formulario en una nueva pesta\u00f1a.'),
    feedbackTitle: pickLang(normalizedLang, 'Enviar feedback', 'Send feedback', 'Enviar comentarios'),
    feedbackMessage: pickLang(
      normalizedLang,
      'Voc\u00ea ser\u00e1 redirecionado para um Google Forms em uma nova aba. Use o formul\u00e1rio para enviar sugest\u00f5es, reportar erros ou anexar imagens.',
      'You will be redirected to a Google Forms page in a new tab. Use the form to send suggestions, report bugs, or attach screenshots.',
      'Se abrir\u00e1 Google Forms en una nueva pesta\u00f1a. Usa el formulario para enviar sugerencias, reportar errores o adjuntar capturas.'
    ),
    feedbackCancel: pickLang(normalizedLang, 'Cancelar', 'Cancel', 'Cancelar'),
    feedbackOpen: pickLang(normalizedLang, 'Abrir formul\u00e1rio', 'Open form', 'Abrir formulario'),
    account: pickLang(normalizedLang, 'Conta', 'Account', 'Cuenta'),
    logout: pickLang(normalizedLang, 'Sair da conta', 'Sign out', 'Cerrar sesi\u00f3n'),
    save: pickLang(normalizedLang, 'Salvar', 'Save', 'Guardar'),
    keyLabel: pickLang(normalizedLang, 'Chave API Groq', 'Groq API Key', 'Clave API de Groq'),
    keyHint: pickLang(
      normalizedLang,
      'Cole aqui sua chave da Groq. Ela fica salva apenas neste navegador.',
      'Paste your Groq key here. It is stored only in this browser.',
      'Pega aqu\u00ed tu clave de Groq. Se guarda solo en este navegador.'
    ),
    proxyLabel: pickLang(normalizedLang, 'Proxy CORS (opcional)', 'CORS proxy (optional)', 'Proxy CORS (opcional)'),
    proxyHint: pickLang(
      normalizedLang,
      'Use somente se os recursos de IA falharem por bloqueio de CORS.',
      'Use only if AI features fail because of CORS blocking.',
      '\u00dasalo solo si las funciones de IA fallan por bloqueo CORS.'
    )
  };

  function closeKey() { directKey ? onClose() : setShowKey(false); }
  function saveKey() {
    localStorage.setItem('groq_key', groqKey);
    localStorage.setItem('cors_proxy', proxy);
    closeKey();
  }
  async function doLogout() {
    try {
      await Promise.resolve(fbSignOut());
    } catch (_) {}
    onLogout();
    onClose();
  }
  function openFeedbackForm() {
    window.open(feedbackFormUrl, '_blank', 'noopener,noreferrer');
    setShowFeedbackConfirm(false);
    onClose();
  }
  function chooseLanguage(code) {
    toggleLang(code);
    setLanguageMenuOpen(false);
  }

  const inp = {width:'100%',background:'var(--surface)',border:'1px solid var(--border2)',color:'var(--text)',padding:'11px 12px',borderRadius:8,fontSize:13,boxSizing:'border-box',outline:'none',fontFamily:'inherit'};

  const sectionTitle = label => React.createElement('div', {
    style:{padding:'16px 20px 6px',fontSize:11,letterSpacing:2,textTransform:'uppercase',color:'var(--muted)',fontWeight:700}
  }, label);

  const rowBtn = (label, onClick, danger, hint, leading) => React.createElement('button', {onClick, style:{
    display:'flex',alignItems:'center',gap:12,width:'100%',background:'none',border:'none',borderTop:'1px solid var(--border2)',
    color:danger?'var(--btn-warn-text)':'var(--text2)',padding:'15px 20px',fontSize:14,cursor:'pointer',fontFamily:'inherit',textAlign:'left'
  }},
    leading ? React.createElement('span', {style:{fontSize:17,width:22,textAlign:'center',flex:'0 0 22px'}}, leading) : null,
    React.createElement('span', {style:{flex:1}},
      React.createElement('span', null, label),
      hint ? React.createElement('span', {style:{display:'block',fontSize:12,color:'var(--muted)',marginTop:4,lineHeight:1.35}}, hint) : null
    )
  );

  const languageButton = React.createElement('div', {style:{borderTop:'1px solid var(--border2)',padding:'0 20px 12px'}},
    React.createElement('button', {
      onClick:()=>setLanguageMenuOpen(open=>!open),
      style:{width:'100%',display:'flex',alignItems:'center',gap:12,background:'none',border:'none',color:'var(--text2)',padding:'15px 0 8px',fontSize:14,cursor:'pointer',fontFamily:'inherit',textAlign:'left'}
    },
      React.createElement('span', {style:{fontSize:18,width:24,textAlign:'center'}}, currentLanguage.flag),
      React.createElement('span', {style:{flex:1}},
        React.createElement('span', null, S.languageTitle + ': ' + currentLanguage.label),
        React.createElement('span', {style:{display:'block',fontSize:12,color:'var(--muted)',marginTop:4,lineHeight:1.35}}, S.languageHint)
      ),
      React.createElement('span', {style:{transform:languageMenuOpen?'rotate(180deg)':'rotate(0deg)',transition:'transform 160ms ease'}}, '\u25be')
    ),
    React.createElement('div', {style:{
      overflow:'hidden',maxHeight:languageMenuOpen?170:0,opacity:languageMenuOpen?1:0,transform:languageMenuOpen?'translateY(0)':'translateY(-4px)',
      transition:'max-height 180ms ease, opacity 160ms ease, transform 160ms ease',border:languageMenuOpen?'1px solid var(--border2)':'1px solid transparent',borderRadius:10,background:'var(--bg)'
    }},
      LANGUAGE_OPTIONS.map(option => React.createElement('button', {
        key: option.code,
        onClick:()=>chooseLanguage(option.code),
        style:{width:'100%',display:'flex',alignItems:'center',gap:10,justifyContent:'space-between',background:option.code===normalizedLang?'var(--btn-ok)':'transparent',border:'none',borderTop:'1px solid var(--border2)',color:option.code===normalizedLang?'var(--btn-ok-text)':'var(--text2)',padding:'11px 12px',cursor:'pointer',fontFamily:'inherit',fontSize:13,textAlign:'left'}
      },
        React.createElement('span', null, option.flag + ' ' + option.label),
        option.code === normalizedLang ? React.createElement('span', null, '\u2713') : null
      ))
    )
  );

  if (showKey) return React.createElement('div', {style:{position:'fixed',inset:0,background:'rgba(0,0,0,0.94)',zIndex:10002,display:'flex',alignItems:'center',justifyContent:'center',padding:20}},
    React.createElement('div', {style:{background:'var(--surface,#fff)',borderRadius:14,width:'100%',maxWidth:400,padding:24,border:'1px solid var(--border2)'}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}},
        React.createElement('span',{style:{fontSize:11,letterSpacing:1,color:'var(--muted)',textTransform:'uppercase'}}, S.keyLabel),
        React.createElement('button',{onClick:closeKey,style:{background:'none',border:'none',color:'var(--text2)',fontSize:22,cursor:'pointer',lineHeight:1}},'x')
      ),
      React.createElement('input',{type:'text',value:groqKey,onChange:e=>setGroqKey(e.target.value),placeholder:'gsk_...',style:{...inp,fontFamily:'monospace',fontSize:11,marginBottom:4}}),
      React.createElement('div',{style:{fontSize:12,color:'var(--muted)',marginBottom:14}},S.keyHint),
      React.createElement('input',{type:'text',value:proxy,onChange:e=>setProxy(e.target.value),placeholder:'https://corsproxy.io/?',style:{...inp,marginBottom:4}}),
      React.createElement('div',{style:{fontSize:12,color:'var(--muted)',marginBottom:20}},S.proxyLabel + ' - ' + S.proxyHint),
      React.createElement('button',{onClick:saveKey,style:{width:'100%',background:'var(--btn-ok)',border:'1px solid var(--btn-ok-border)',color:'var(--btn-ok-text)',padding:'12px',borderRadius:8,fontSize:11,letterSpacing:1,textTransform:'uppercase',cursor:'pointer',fontFamily:'inherit'}}, S.save)
    )
  );

  return React.createElement(React.Fragment, null,
    React.createElement('div', {onClick:onClose, style:{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:9999,display:'flex',alignItems:'flex-end'}},
      React.createElement('div', {onClick:e=>e.stopPropagation(), style:{background:'var(--surface,#fff)',borderRadius:'18px 18px 0 0',width:'100%',maxHeight:'86vh',paddingBottom:'env(safe-area-inset-bottom,20px)',overflowY:'auto',boxShadow:'0 -4px 40px rgba(0,0,0,0.6)'}},
        React.createElement('div',{style:{textAlign:'center',padding:'14px 0 4px',cursor:'pointer'},onClick:onClose},
          React.createElement('div',{style:{width:32,height:4,background:'var(--border2)',borderRadius:2,margin:'0 auto'}})
        ),
        React.createElement('div',{style:{paddingBottom:8}},
          sectionTitle(S.appearance),
          languageButton,
          rowBtn(S.darkMode, toggleDark, false, null, darkMode ? '\u2600' : '\u263e'),
          sectionTitle(S.data),
          rowBtn(S.backup, ()=>{onClose(); onOpenBackup && onOpenBackup();}, false, null, '\ud83d\udcbe'),
          rowBtn(S.privacy, ()=>{onClose(); onOpenPrivacy && onOpenPrivacy();}, false, null, '\ud83d\udd12'),
          sectionTitle(S.intelligence),
          rowBtn(S.apiKey, ()=>setShowKey(true), false, S.aiHint, '\ud83d\udd11'),
          sectionTitle(S.feedbackSupport),
          rowBtn(S.feedbackLabel, ()=>setShowFeedbackConfirm(true), false, S.feedbackHint, '\ud83d\udcac'),
          sectionTitle(S.account),
          rowBtn(S.logout, doLogout, true, null, '\u23fb')
        )
      )
    ),
    showFeedbackConfirm ? React.createElement('div', {
      onClick:()=>setShowFeedbackConfirm(false),
      style:{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:10001,display:'flex',alignItems:'center',justifyContent:'center',padding:20}
    },
      React.createElement('div', {
        onClick:e=>e.stopPropagation(),
        style:{background:'var(--surface,#fff)',color:'var(--text)',border:'1px solid var(--border2)',borderRadius:14,width:'100%',maxWidth:420,padding:22,boxShadow:'0 18px 60px rgba(0,0,0,0.35)'}
      },
        React.createElement('div', {style:{fontSize:13,letterSpacing:2,textTransform:'uppercase',color:'var(--text2)',marginBottom:12}}, S.feedbackTitle),
        React.createElement('div', {style:{fontSize:14,lineHeight:1.5,color:'var(--muted)',marginBottom:20}}, S.feedbackMessage),
        React.createElement('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}},
          React.createElement('button', {onClick:()=>setShowFeedbackConfirm(false), style:{background:'var(--surface)',border:'1px solid var(--border2)',color:'var(--text2)',borderRadius:8,padding:'12px 10px',fontSize:11,letterSpacing:1,textTransform:'uppercase',cursor:'pointer',fontFamily:'inherit'}}, S.feedbackCancel),
          React.createElement('button', {onClick:openFeedbackForm, style:{background:'var(--btn-ok)',border:'1px solid var(--btn-ok-border)',color:'var(--btn-ok-text)',borderRadius:8,padding:'12px 10px',fontSize:11,letterSpacing:1,textTransform:'uppercase',cursor:'pointer',fontFamily:'inherit'}}, S.feedbackOpen)
        )
      )
    ) : null
  );
}
// Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = {error: null}; }
  static getDerivedStateFromError(e) { return {error: e}; }
  componentDidCatch(e, info) { console.error('App crash:', e, info); }
  render() {
    if (this.state.error) {
      return React.createElement('div', {style:{
        position:'fixed',top:0,left:0,right:0,bottom:0,background:'var(--surface)',
        display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
        gap:12,padding:20,textAlign:'center'
      }},
        React.createElement('div', {style:{color:'#c87e7e',fontSize:13,letterSpacing:2}}, 'ERRO'),
        React.createElement('div', {style:{color:'#c87e7e',fontSize:11,maxWidth:360}},
          (this.state.error.message||String(this.state.error)).toUpperCase()
        ),
        React.createElement('button', {
          onClick:()=>this.setState({error:null}),
          style:{marginTop:20,background:'none',border:'1px solid #333',color:'#555',
            borderRadius:6,padding:'8px 16px',fontSize:11,cursor:'pointer'}
        }, 'RETRY / TENTAR')
      );
    }
    return this.props.children;
  }
}

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
  const [profileChecking, setProfileChecking] = React.useState(fbIsLoggedIn());
  const [lang, setLang]         = React.useState(()=>normalizeLanguage(localStorage.getItem('appLang')||'pt'));
  const [showReleaseNotice, setShowReleaseNotice] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState(() => {
    const saved = localStorage.getItem('appDarkMode');
    return saved !== null ? saved === 'true' : false; // padrão: modo claro
  });
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
    setShowSettings(false);
    setShowPrivacy(false);
    setShowBackup(false);
    setShowTutorial(false);
    setShowReleaseNotice(false);
  }
  async function checkRequiredProfile() {
    setProfileChecking(true);
    const profile = await getRequiredProfileData().catch(()=>({birthDate:'', gender:'', activityLevel:'', goalType:'', goalKg:'', goalWeeks:'', manualAdjustment:''}));
    setRequiredProfile(hasRequiredProfileData(profile) ? null : profile);
    setProfileChecking(false);
  }

  /**
   * Runs the temporary Firestore account normalizer after authentication.
   * It copies legacy nutrition/{uid}_{key} data into the current structure and,
   * when Firestore rules allow it, removes only this user's old legacy docs.
   * Remove this call once all beta accounts have been normalized.
   */
  async function normalizeStorageAfterLogin() {
    if (typeof window.normalizeCurrentUserStorage !== 'function') return null;
    try {
      const migration = window.normalizeCurrentUserStorage({cleanup: true});
      const result = await Promise.race([
        migration,
        new Promise(resolve => setTimeout(() => resolve({skipped: 0, background: true}), 2500))
      ]);
      migration.catch(error => console.warn('Background storage normalization failed', error));
      migration
        .then(() => {
          if (typeof window.cleanupLegacyNutritionDocs === 'function') {
            return window.cleanupLegacyNutritionDocs();
          }
          return null;
        })
        .catch(error => console.warn('Background legacy cleanup failed', error));
      if (result?.error || result?.cleanupFailures) {
        console.warn('Storage normalization completed with warnings', result);
      }
      return result;
    } catch (error) {
      console.warn('Storage normalization failed', error);
      return null;
    }
  }

  async function afterAuthenticated(isNew) {
    setAuthed(true);
    await normalizeStorageAfterLogin();
    storage.set('lastLoginAt', new Date().toISOString()).catch(()=>{});
    const savedLang = await storage.get('language').catch(()=>null);
    const normalizedSavedLang = normalizeLanguage(savedLang?.value || localStorage.getItem('appLang') || lang || 'pt');
    localStorage.setItem('appLang', normalizedSavedLang);
    setLang(normalizedSavedLang);
    if (savedLang?.value !== normalizedSavedLang) {
      storage.set('language', normalizedSavedLang).catch(()=>{});
    }
    await checkRequiredProfile();
    const tutorialVersion = await storage.get(MOST_RECENT_TUTORIAL_KEY).catch(()=>null);
    if (isNew) {
      await markCurrentReleaseSeen();
      setTutorialType('main');
      setShowTutorial(true);
      return;
    }
    if (!hasSeenCurrentRelease(tutorialVersion)) {
      await markCurrentReleaseSeen();
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
        await normalizeStorageAfterLogin();
        const savedLang = await storage.get('language').catch(()=>null);
        const normalizedSavedLang = normalizeLanguage(savedLang?.value || localStorage.getItem('appLang') || 'pt');
        localStorage.setItem('appLang', normalizedSavedLang);
        setLang(normalizedSavedLang);
        if (savedLang?.value !== normalizedSavedLang) {
          storage.set('language', normalizedSavedLang).catch(()=>{});
        }
        storage.set('lastLoginAt', new Date().toISOString()).catch(()=>{});
        const tutorialVersion = await storage.get(MOST_RECENT_TUTORIAL_KEY).catch(()=>null);
        if (!hasSeenCurrentRelease(tutorialVersion)) {
          await markCurrentReleaseSeen();
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
    if (!authed || pendingEmail || requiredProfile) {
      const timer = setTimeout(() => {
        if (typeof window.hideInitialLoading === "function") window.hideInitialLoading();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [checking, profileChecking, authed, pendingEmail, requiredProfile, lang]);

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
      requiredProfile ? React.createElement(RequiredProfileModal, {
        lang,
        profile: requiredProfile,
        onComplete: () => setRequiredProfile(null)
      }) : null,
      !requiredProfile && React.createElement(NutritionTracker, {
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
      showReleaseNotice && !requiredProfile ? React.createElement(ReleaseNoticeModal, {
        lang,
        onStartTutorial: () => {
          setShowReleaseNotice(false);
          setTutorialType(RELEASE_TUTORIAL_TYPE);
          setShowTutorial(true);
        }
      }) : null,
      showTutorial && !requiredProfile ? React.createElement(TutorialOverlay, {
        lang,
        type: tutorialType,
        onDone: () => {
          storage.set(tutorialSeenKey(tutorialType), 'true').catch(()=>{});
          setShowTutorial(false);
        }
      }) : null,
      showSettings ? React.createElement(SettingsPanel, {
        onClose:  () => setShowSettings(false),
        onLogout: handleLogout,
        onOpenBackup: () => setShowBackup(true),
        onOpenPrivacy: () => setShowPrivacy(true),
        lang, darkMode, toggleLang, toggleDark,
        directKey: false
      }) : null
    )
  );
}

const _root = ReactDOM.createRoot(document.getElementById('root'));
_root.render(React.createElement(App));

