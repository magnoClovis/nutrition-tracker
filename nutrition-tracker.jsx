// Diario Nutricional application script.
// This file is intentionally kept outside index.html so the app code is readable
// and third-party bundles remain isolated in vendor/. New feature code should keep
// calculation helpers documented where inputs/outputs are not immediately obvious.
const {useState,useEffect,useRef}=React;
const {LineChart,Line,XAxis,YAxis,Tooltip,ResponsiveContainer,ReferenceLine}=Recharts;
const APP_VERSION_LABEL = window.APP_VERSION_LABEL || "Diário Nutricional v0.7.5 Beta";
const TUTORIAL_TYPES = ["main", "diario", "adicionar", "despensa", "semana", "metricas"];
const MOST_RECENT_TUTORIAL_KEY = "tutorial_most_recent_version_seen";
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

/**
 * Resets the reusable tutorial flags for a major UI update.
 * Input: none. Output: Promise that resolves after best-effort persistence.
 * The version flag is intentionally a single field so future releases can
 * reuse the same flow without creating one Firestore field per tab/version.
 */
async function resetTutorialsForCurrentVersion() {
  const writes = [
    storage.set(MOST_RECENT_TUTORIAL_KEY, "pending"),
    ...TUTORIAL_TYPES.map(type => storage.set(tutorialSeenKey(type), "false"))
  ];
  await Promise.all(writes.map(p => p.catch(() => {})));
}

/**
 * Marks the current release notice/tutorial cycle as acknowledged.
 * Tab tutorials still use their normal reusable tutorialSeen_* fields.
 */
async function markCurrentVersionTutorialSeen() {
  await storage.set(MOST_RECENT_TUTORIAL_KEY, "true").catch(() => {});
}

/**
 * Puts the release tutorial in a pending state without resetting tab tutorial
 * flags on every reload. Input: stored flag value. Output: persisted pending
 * state when needed.
 */
async function ensureCurrentVersionTutorialPending(currentValue) {
  if (currentValue === "pending") return;
  await resetTutorialsForCurrentVersion();
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
  const language = GREETING_PHRASES[lang] ? lang : "pt";
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
    trainDay: "TREINO",
    restDay: "DESCANSO",
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
    selectAndAdd: "Selecione alimentos e vÁ adicionando.",
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
    microLabel: "MICRONUTRIENTES",
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
    trainDay: "TRAINING",
    restDay: "REST",
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

// MEALS is now in STRINGS[lang].meals - resolved inside component
// MEAL_KEYS: fixed storage keys (always Portuguese, data was saved with these)
const MEAL_KEYS = ["Café da manhã", "Pré-treino", "Pós-treino", "Almoço", "Café da tarde", "Jantar", "Ceia", "Outro"];
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
  sedentary: { factor: 1.2, pt: "Sedentario", en: "Sedentary", descPt: "Pouco ou nenhum exercicio estruturado", descEn: "Little or no structured exercise" },
  light: { factor: 1.375, pt: "Levemente ativo", en: "Lightly active", descPt: "Exercicios leves 1 a 3 vezes por semana", descEn: "Light exercise 1 to 3 times per week" },
  moderate: { factor: 1.55, pt: "Moderadamente ativo", en: "Moderately active", descPt: "Exercicios moderados 3 a 5 vezes por semana", descEn: "Moderate exercise 3 to 5 times per week" },
  very: { factor: 1.725, pt: "Muito ativo", en: "Very active", descPt: "Exercicios intensos 6 a 7 vezes por semana ou trabalho fisico exigente", descEn: "Intense exercise 6 to 7 times per week or demanding physical work" },
  extreme: { factor: 1.9, pt: "Extremamente ativo", en: "Extremely active", descPt: "Atletas ou rotina extremamente ativa", descEn: "Athletes or extremely active routines" }
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
  const age = calculateAge(profile.birthDate);
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
  return unit === "un" ? (lang === 'en' ? 'per unit' : 'por 1 unidade') : (lang === 'en' ? 'per 100'+unit : 'por 100'+unit);
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
  const locale = lang === "en" ? "en-US" : "pt-BR";
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
  }, sub ? "↳ " : "", label), /*#__PURE__*/React.createElement("span", {
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
  externalDarkMode
}) {
  const [lang, setLang] = useState(() => externalLang || localStorage.getItem('appLang') || 'pt');
  const [menuOpen, setMenuOpen] = useState(false);
  const t = key => {
    const s = STRINGS[lang];
    return s && s[key] !== undefined ? s[key] : STRINGS.pt[key] !== undefined ? STRINGS.pt[key] : key;
  };
  function toggleLang() {
    const nl = lang === 'pt' ? 'en' : 'pt';
    localStorage.setItem('appLang', nl);
    setLang(nl);
    Promise.resolve(storage.set('language', nl))
      .catch(() => {})
      .finally(() => setTimeout(() => window.location.reload(), 0));
  }
  // Sync external lang changes
  useEffect(() => {
    if (externalLang && externalLang !== lang) {
      localStorage.setItem('appLang', externalLang);
      storage.set('language', externalLang).catch(() => {});
      setLang(externalLang);
    }
  }, [externalLang]);
  useEffect(() => {
    storage.set('lastActivityAt', new Date().toISOString()).catch(() => {});
  }, []);
  // MEALS always uses PT names as storage keys (data compatibility)
  const MEALS = STRINGS.pt.meals;
  const mealLabel = m => {
    const i = STRINGS.pt.meals.indexOf(m);
    return i >= 0 ? t('meals')[i] : m;
  };
  // Normalize log keys: map EN/any lang meal names back to PT storage keys
  function normalizeMealKeys(rawLog) {
    if (!rawLog) return {};
    const enMeals = STRINGS.en.meals;
    const ptMeals = STRINGS.pt.meals;
    const normalized = {};
    for (const [key, entries] of Object.entries(rawLog)) {
      const enIdx = enMeals.indexOf(key);
      const ptKey = enIdx >= 0 ? ptMeals[enIdx] : key;
      normalized[ptKey] = (normalized[ptKey] || []).concat(entries || []);
    }
    return normalized;
  }
  // Maps storage key -> display name
  const mealDisplay = key => {
    const i = MEAL_KEYS.indexOf(key);
    return i >= 0 ? mealLabel(MEALS[i]) : key;
  };
  const MACRO_FIELDS = MACRO_FIELDS_BASE.map(f => ({
    ...f,
    label: t(f.labelKey)
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
    label: t(f.labelKey)
  }));
  const ALL_FIELDS = [...MACRO_FIELDS, ...MICRO_FIELDS]; // labeled version for render
  const [darkMode, setDarkMode] = useState(() => externalDarkMode !== undefined ? externalDarkMode : false);
  // Sync external darkMode changes
  useEffect(() => {
    if (externalDarkMode !== undefined) setDarkMode(externalDarkMode);
  }, [externalDarkMode]);
  const [pantry, setPantry] = useState([]);
  const [log, setLog] = useState({});
  const [tab, setTab] = useState("diario");
  function openTab(nextTab, opts = {}) {
    setTab(nextTab);
    if (opts.skipTutorial || window.__tutorialNavigating) return;
    storage.get(tutorialSeenKey(nextTab)).then(r => {
      if (!hasSeenTutorial(r)) {
        setTimeout(() => onStartTutorial && onStartTutorial(nextTab), 120);
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
    if (mode !== "describe" && pantry.length === 0) {
      notify(lang === 'en' ? "Add foods to the pantry first, or use Describe dish." : "Cadastre alimentos na despensa primeiro, ou use Descrever prato.");
      setDescribeMode(true);
      setBatchMode(false);
      return;
    }
    if (mode === "describe") {
      setDescribeMode(true);
      setBatchMode(false);
    } else {
      setDescribeMode(false);
      setBatchMode(mode === "batch");
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
  const [batchMode, setBatchMode] = useState(false);
  const [staged, setStaged] = useState({
    meal: "Café da manhã",
    items: []
  });
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
    const updateMobileView = () => setIsMobileView(window.innerWidth <= 520);
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
  function dayGoalForDate(date) {
    const we = getWeightForDate(weightHistory, date);
    const dayIsTraining = trainingByDate[date] ?? true;
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
  }, [tab, loaded, log]);
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
    notify(lang === 'en' ? "Values imported from Open Food Facts. Please review before saving." : "Valores importados do Open Food Facts. Revise antes de salvar.", 6000);
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
      setBarcodeMessage(lang === 'en' ? "Enter a barcode first." : "Digite um código de barras primeiro.");
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
        setBarcodeMessage(lang === 'en' ? "Product not found. You can enter the data manually." : "Produto não encontrado. Você pode preencher os dados manualmente.");
        return;
      }
      applyFoodDbProduct(data.product);
      setBarcodeInput(barcode);
      setBarcodeMessage(lang === 'en' ? "Product found. Review the values before saving." : "Produto encontrado. Revise os valores antes de salvar.");
      stopBarcodeScanner();
      setBarcodeModalOpen(false);
    } catch (e) {
      setBarcodeMessage(lang === 'en' ? "Could not search this barcode right now." : "Não foi possível buscar este código agora.");
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
    setBarcodeMessage(lang === 'en' ? "Loading compatible barcode scanner..." : "Carregando leitor compatível...");
    const lib = await loadBarcodeFallbackLibrary();
    const Reader = lib.BrowserMultiFormatReader || lib.BrowserBarcodeReader;
    if (!Reader) throw new Error("ZXing reader unavailable");
    const reader = new Reader();
    barcodeReaderRef.current = reader;
    barcodeScanRef.current = true;
    setBarcodeScanning(true);
    setBarcodeMessage(lang === 'en' ? "Point the camera at the barcode." : "Aponte a câmera para o código de barras.");
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
        setBarcodeMessage(lang === 'en' ? "Compatible camera scanner failed. Type the barcode manually below." : "O leitor compatível pela câmera falhou. Digite o código manualmente abaixo.");
      }
    }, 0);
  }
  async function startBarcodeScanner() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setBarcodeMessage(lang === 'en' ? "Camera access is not available. Use manual entry below." : "O acesso à câmera não está disponível. Use a digitação manual abaixo.");
      return;
    }
    stopBarcodeScanner();
    setBarcodeMessage(lang === 'en' ? "Point the camera at the barcode." : "Aponte a câmera para o código de barras.");
    try {
      if ("BarcodeDetector" in window) await startNativeBarcodeScanner();
      else await startFallbackBarcodeScanner();
    } catch (e) {
      stopBarcodeScanner();
      setBarcodeMessage(lang === 'en' ? "Camera permission was denied, unavailable, or unsupported. Use manual entry below." : "A permissão da câmera foi negada, não está disponível ou não é compatível. Use a digitação manual abaixo.");
    }
  }  async function searchFoodDatabase() {
    const query = form.name.trim();
    if (!query) {
      notify(lang === 'en' ? "Enter the food name first." : "Escreva o nome do alimento primeiro.");
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
      if (!products.length) notify(lang === 'en' ? "No matching food found in Open Food Facts." : "Nenhum alimento correspondente encontrado no Open Food Facts.", 5000);
      else applyFoodDbProduct(products[0]);
    } catch (e) {
      notify(lang === 'en' ? "Could not search Open Food Facts right now." : "Não foi possível buscar no Open Food Facts agora.", 6000);
    }
    setFoodDbLoading(false);
  }
  async function autoFillNutrition() {
    if (!form.name.trim()) {
      notify(lang === 'en' ? "Enter the food name first." : "Escreva o nome do alimento primeiro.");
      return;
    }
    setAutoFillLoading(true);
    const unit = form.unit;
    const foodName = form.name.trim();
    const _basePrompt = lang === 'en'
      ? (unit === "un" ? "Check whether the food \"" + foodName + "\" exists and whether it makes sense to measure it as individual units.\n\nIMPORTANT: Because the unit is \"un\", you must:\n1. Check whether this food makes sense as an individual unit (1 egg, 1 banana, 1 strawberry, etc.).\n2. If yes, provide nutrition values per 100g AND the average gram weight of one typical unit.\n   Final per-unit values will be calculated as: value_per_100g x unit_weight / 100\n3. If it does not make sense (for example milk, olive oil, flour), reject it and explain.\n\nRespond ONLY with JSON, no markdown:\n- If valid: {\"ok\":true,\"per100\":{\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X},\"unitWeightG\":X}\n- If invalid: {\"ok\":false,\"reason\":\"brief explanation\"}" : "The user wants to log \"" + foodName + "\" with unit \"" + unit + "\".\n\nCheck whether the unit \"" + unit + "\" makes sense for this food.\nIf yes, provide values per 100" + unit + " based on reliable nutrition reference tables (USDA, TACO, INSA, and European nutrition tables).\nIf not (for example tuna in ml, milk in units), reject it and explain.\n\nRespond ONLY with JSON, no markdown:\n- If valid: {\"ok\":true,\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X}\n- If invalid: {\"ok\":false,\"reason\":\"brief explanation\"}\nUse null for unknown fields.")
      : (unit === "un" ? "Verifique se existe o alimento \"" + foodName + "\" e se faz sentido medir em unidades individuais.\n\nIMPORTANTE: Como a unidade é \"un\", você deve:\n1. Verificar se faz sentido medir este alimento por unidade individual (1 ovo, 1 banana, 1 morango, etc.).\n2. Se sim, fornecer os valores nutricionais por 100g E o peso médio em gramas de 1 unidade típica.\n   Os valores finais por unidade serão calculados como: valor_100g x peso_unidade / 100\n3. Se não fizer sentido (ex: leite, azeite, farinha), recuse e explique.\n\nResponda APENAS com JSON sem markdown:\n- Se válido: {\"ok\":true,\"per100\":{\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X},\"unitWeightG\":X}\n- Se inválido: {\"ok\":false,\"reason\":\"explicação breve\"}" : "O usuário quer registrar \"" + foodName + "\" com unidade \"" + unit + "\".\n\nVerifique se a unidade \"" + unit + "\" faz sentido para este alimento.\nSe sim, forneça valores por 100" + unit + " baseados em tabelas nutricionais de referência (TACO, USDA, INSA, tabelas nutricionais brasileiras, americanas e europeias).\nSe não (ex: atum em ml, leite em un), recuse e explique.\n\nResponda APENAS com JSON sem markdown:\n- Se válido: {\"ok\":true,\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X}\n- Se inválido: {\"ok\":false,\"reason\":\"explicação breve\"}\nUse null para campos desconhecidos.");
    const prompt = aiLang() + _basePrompt;
    try {
      const text = await callAI(prompt, 600);
      const clean = text.replace(/```json|```/g, "").trim();
      const vals = JSON.parse(clean);
      if (!vals.ok) {
        notify(`Aviso: ${vals.reason}`, 7000);
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
        notify(lang === 'en' ? `Fields filled based on ${w}g per unit. Check whether the weight looks right.` : `Campos preenchidos com base em ${w}g por unidade. Verifique se o peso está correto.`);
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
        notify(t('notifFilled'));
      }
    } catch (_) {
      notify((lang === 'en' ? "Error: " : "Erro: ") + (_.message || (lang === 'en' ? "Could not get the values." : "Não foi possível obter os valores.")), 8000);
    }
    setAutoFillLoading(false);
  }
  async function estimateMealDescription() {
    if (!mealDescription.trim()) {
      notify(lang === 'en' ? 'Describe the dish first.' : 'Descreva o prato primeiro.');
      return;
    }
    setDescribeLoading(true);
    setDescribeResult(null);
    const prompt = aiLang() + (lang === 'en' ? "Analyze the following dish and calculate total nutrition values based on reliable nutrition reference tables (USDA, TACO, INSA):\n\n\"" + mealDescription.trim() + "\"\n\nInstructions:\n1. Identify the ingredients and quantities provided. If quantities are missing, use realistic typical portions.\n2. Use nutrition reference values (USDA for general foods, TACO for Brazilian foods when relevant).\n3. Sum all ingredient values to get the dish total.\n4. Respond ONLY with JSON, no markdown, no extra text:\n{\"name\":\"short dish name\",\"protein\":X,\"kcal\":X,\"carbs\":X,\"fat\":X,\"fiber\":X,\"salt\":X,\"confidence\":\"high|medium|low\",\"note\":\"brief explanation of calculated values\"}" : "Analise o seguinte prato e calcule os valores nutricionais totais com base em tabelas nutricionais oficiais (TACO, USDA, INSA):\n\n\"" + mealDescription.trim() + "\"\n\nInstruções:\n1. Identifique os ingredientes e as quantidades indicadas. Se não houver quantidade, use porções realistas e típicas.\n2. Consulte valores de tabelas nutricionais de referência (TACO para alimentos brasileiros, USDA para os demais).\n3. Some os valores de todos os ingredientes para obter o total do prato.\n4. Responda APENAS com JSON sem markdown, sem texto extra:\n{\"name\":\"nome curto do prato\",\"protein\":X,\"kcal\":X,\"carbs\":X,\"fat\":X,\"fiber\":X,\"salt\":X,\"confidence\":\"alta|media|baixa\",\"note\":\"explicação breve dos valores calculados\"}");
    try {
      const text = await callAI(prompt, 400);
      const clean = text.replace(/```json|```/g, "").trim();
      const vals = JSON.parse(clean);
      setDescribeResult(vals);
    } catch (_) {
      notify((lang === 'en' ? "Error: " : "Erro: ") + (_.message || (lang === 'en' ? "Could not estimate." : "Não foi possível estimar.")), 8000);
    }
    setDescribeLoading(false);
  }
  function addDescribedToLog() {
    if (!describeResult) return;
    const entry = {
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
    setActiveLog({
      ...activeLog,
      [describeMeal]: [...(activeLog[describeMeal] || []), entry]
    });
    setDescribeResult(null);
    setMealDescription("");
    notify(lang === 'en' ? describeResult.name + " added to diary." : describeResult.name + " adicionado ao diário.");
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
    const message = lang === "en"
      ? "Bottle size in ml"
      : "Tamanho da garrafa em ml";
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
    notify(lang === 'en' ? "Supplement saved." : "Suplemento salvo.");
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
    notify(lang === 'en' ? supp.name + " logged." : supp.name + " registrado.");
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
    notify(lang === 'en' ? "Targets updated." : "Metas atualizadas.");
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
    if (!silent) notify(lang === 'en' ? "Nutrition preferences updated." : "Preferências nutricionais atualizadas.");
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
        notify(t('noDataPatterns'));
        setPatternsLoading(false);
        return;
      }
      const avgProt = Math.round(dayData.reduce((s, d) => s + d.protein, 0) / dayData.length);
      const avgKcal = Math.round(dayData.reduce((s, d) => s + d.kcal, 0) / dayData.length);
      const daysMetProt = dayData.filter(d => d.metProtein).length;
      const trainDays = dayData.filter(d => d.isTraining);
      const restDays = dayData.filter(d => !d.isTraining);
      const trainSummary = trainDays.length ? (lang === 'en' ? "Training days (" + trainDays.length + "): average " : "Dias de treino (" + trainDays.length + "): média ") + Math.round(trainDays.reduce((s, d) => s + d.protein, 0) / trainDays.length) + "g protein, " + Math.round(trainDays.reduce((s, d) => s + d.kcal, 0) / trainDays.length) + " kcal\n" : "";
      const restSummary = restDays.length ? (lang === 'en' ? "Rest days (" + restDays.length + "): average " : "Dias de descanso (" + restDays.length + "): média ") + Math.round(restDays.reduce((s, d) => s + d.protein, 0) / restDays.length) + "g protein, " + Math.round(restDays.reduce((s, d) => s + d.kcal, 0) / restDays.length) + " kcal\n" : "";
      const prompt = lang === 'en'
        ? "Analyze the user's eating patterns over the last 30 days and provide detailed insights in American English.\n\nDATA (" + dayData.length + " logged days out of 30):\nDaily average: " + avgProt + "g protein, " + avgKcal + " kcal\nDays that hit the protein target: " + daysMetProt + "/" + dayData.length + "\n" + trainSummary + restSummary + "Protein range: min " + Math.min(...dayData.map(d => d.protein)) + "g, max " + Math.max(...dayData.map(d => d.protein)) + "g\n\n" + (currentWeight ? "Current weight: " + currentWeight + "kg\n\n" : "") + "Identify concrete patterns such as:\n- Difference between training and rest days\n- Consistency or inconsistency over time\n- Positive or concerning trends\n- Improvement areas with specific suggestions\n\nStructure with clear sections: Positive Patterns, Patterns to Improve, Identified Trends, Recommendations."
        : "Analise os padrões alimentares dos últimos 30 dias e forneça insights detalhados em português brasileiro.\n\nDADOS (" + dayData.length + " dias registrados de 30):\nMédia diária: " + avgProt + "g proteína, " + avgKcal + " kcal\nDias que atingiram meta de proteína: " + daysMetProt + "/" + dayData.length + "\n" + trainSummary + restSummary + "Variação de proteína: mín " + Math.min(...dayData.map(d => d.protein)) + "g, máx " + Math.max(...dayData.map(d => d.protein)) + "g\n\n" + (currentWeight ? "Peso atual: " + currentWeight + "kg\n\n" : "") + "Identifique padrões concretos como:\n- Diferença entre dias de treino e descanso\n- Consistência ou inconsistência ao longo do tempo\n- Tendências preocupantes ou positivas\n- áreas de melhoria com sugestões específicas\n\nEstruture com seções claras: Padrões positivos, Padrões a melhorar, Tendências identificadas, Recomendações.";
      const _pText = await callAI(prompt, 1200);
      setPatternsText(_pText);
    } catch (_) {
      notify((lang === 'en' ? "Error: " : "Erro: ") + (_.message || (lang === 'en' ? "Could not analyze." : "Não foi possível analisar.")), 8000);
    }
    setPatternsLoading(false);
  }
  function savePatterns() {
    if (!patternsText) return;
    const sep = "\n\n---\n PADRÕES ALIMENTARES (" + new Date().toLocaleDateString("pt-BR") + "):\n";
    setTodayNote(n => (n ? n + sep : sep.trim() + "\n") + patternsText);
    setPatternsSaved(true);
    notify(lang === 'en' ? "Analysis saved to notes." : "Análise salva nas notas.");
  }
  async function generateMealSuggestions() {
    if (!pantry.length) {
      notify(lang === 'en' ? "Add foods to the pantry first." : "Adicione alimentos à despensa primeiro.");
      return;
    }
    setSuggestLoading(true);
    setSuggestions(null);
    const remainProt = Math.max(0, Math.round(goals.protein - tot.protein));
    const remainKcal = Math.max(0, Math.round(goals.kcal - tot.kcal));
    const remainCarbs = Math.max(0, Math.round(goals.carbs - tot.carbs));
    if (remainProt === 0 && remainKcal === 0) {
      notify(lang === 'en' ? "You have already hit today's targets!" : "Você já atingiu as metas de hoje!");
      setSuggestLoading(false);
      return;
    }
    const pantryList = sortedAllPantry.map(f => {
      const div = f.unit === "un" ? 1 : 100;
      return f.name + " (" + f.protein100 + "g prot/" + (f.unit === "un" ? "un" : "100" + f.unit) + ", " + f.kcal100 + " kcal/" + (f.unit === "un" ? "un" : "100" + f.unit) + ")";
    }).join(", ");
    const prompt = lang === 'en'
      ? "The user needs to finish today's nutrition targets. Suggest 3 practical food combinations using only foods from their pantry.\n\nSTILL MISSING TODAY:\n" + (remainProt > 0 ? "Protein: " + remainProt + "g\n" : "") + (remainKcal > 0 ? "Calories: " + remainKcal + " kcal\n" : "") + (remainCarbs > 0 ? "Carbs: " + remainCarbs + "g\n" : "") + "\nAVAILABLE PANTRY:\n" + pantryList + "\n\nFor each suggestion include:\n- Combination name\n- Foods with specific amounts (grams/ml/units)\n- Estimated protein and calorie totals\n\nRespond ONLY with JSON, no markdown:\n[{\"name\":\"name\",\"items\":[{\"food\":\"exact pantry food name\",\"qty\":X,\"unit\":\"g\"}],\"protein\":X,\"kcal\":X}]"
      : "O usuário precisa fechar as metas nutricionais do dia. Sugira 3 combinações práticas de alimentos da despensa dele.\n\nO QUE AINDA FALTA HOJE:\n" + (remainProt > 0 ? "Proteína: " + remainProt + "g\n" : "") + (remainKcal > 0 ? "Calorias: " + remainKcal + " kcal\n" : "") + (remainCarbs > 0 ? "Carbs: " + remainCarbs + "g\n" : "") + "\nDESPENSA DISPONÍVEL:\n" + pantryList + "\n\nPara cada sugestão indique:\n- Nome da combinação\n- Alimentos com quantidades específicas (em gramas/ml/unidades)\n- Totais de proteína e calorias estimados\n\nResponda APENAS com JSON sem markdown:\n[{\"name\":\"nome\",\"items\":[{\"food\":\"nome exato da despensa\",\"qty\":X,\"unit\":\"g\"}],\"protein\":X,\"kcal\":X}]";
    try {
      const text = await callAI(prompt, 800);
      const clean = text.replace(/```json|```/g, "").trim();
      setSuggestions(JSON.parse(clean));
    } catch (_) {
      notify((lang === 'en' ? "Error: " : "Erro: ") + (_.message || (lang === 'en' ? "Could not generate suggestions." : "Não foi possível gerar sugestões.")), 8000);
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
      notify(lang === 'en' ? "No food from the suggestion was found in the pantry." : "Nenhum alimento da sugestão foi encontrado na despensa.");
      return;
    }
    setStaged({
      meal: addEntry.meal || "Outro",
      items
    });
    setBatchMode(true);
    openTab("adicionar");
    notify(lang === 'en' ? "\"" + sugg.name + "\" loaded. Adjust and log it." : "\"" + sugg.name + "\" carregada. Ajuste e registre.");
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
        throw new Error(lang === 'en'
          ? "The app is open over HTTPS, but the report server is HTTP. Browsers block this request. Use the local file/app over HTTP, or expose the report server with HTTPS."
          : "O app está aberto em HTTPS, mas o servidor de relatórios está em HTTP. O navegador bloqueia essa conexão. Use o app localmente/em HTTP ou exponha o servidor de relatórios com HTTPS.");
      }
      if (/^http:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(serverUrl) && window.location.protocol !== "file:" && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
        throw new Error(lang === 'en'
          ? "The report server is set to localhost/127.0.0.1. On another device this points to that device itself, not to the server PC. Use the server PC LAN IP in the code."
          : "O servidor de relatórios está como localhost/127.0.0.1. Em outro dispositivo isso aponta para o próprio dispositivo, não para o PC servidor. Use o IP local do PC servidor no código.");
      }
      const payload = await buildAdvancedReportPayload(reportType, reportFormat);
      const response = await fetch(serverUrl + "/reports/from-body", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || (lang === 'en' ? "Could not generate report." : "Não foi possível gerar o relatório."));
      const targetUrl = serverUrl + (reportFormat === "pdf" ? data.downloadUrl : data.htmlUrl);
      window.open(targetUrl, "_blank", "noopener,noreferrer");
      setReportMessage(lang === 'en' ? "Report generated and opened in a new tab." : "Relatório gerado e aberto em uma nova aba.");
    } catch (err) {
      let msg = err?.message || String(err);
      if (/NetworkError|Failed to fetch|Network request failed/i.test(msg)) {
        msg = lang === 'en'
          ? "Could not reach the report server. Check that the server is running, that the IP/port are reachable from this device, and that HTTPS pages are not trying to call an HTTP server."
          : "Não foi possível acessar o servidor de relatórios. Confira se o servidor está ligado, se o IP/porta estão acessíveis por este dispositivo e se uma página HTTPS não está tentando chamar um servidor HTTP.";
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
        const rows = [[t('meal'), t('foodLabel'), t('qty'), t('unit'), t('protein') + "(g)", t('calories') + "(kcal)", t('carbs') + "(g)", t('fat') + "(g)", t('fiber') + "(g)", t('salt') + "(g)"]];
        MEAL_KEYS.forEach(meal => {
          (dayLog[meal] || []).forEach(e => {
            rows.push([mealDisplay(meal), '"' + e.name + '"', e.qty, e.unit, rnd(e.protein), rnd(e.kcal), rnd(e.carbs), rnd(e.fat), rnd(e.fiber), rnd(e.salt)]);
          });
        });
        rows.push([], []);
        rows.push([lang === 'en' ? 'TOTALS' : 'TOTAIS', "", "", "", totals.protein, totals.kcal, totals.carbs, totals.fat, totals.fiber, totals.salt]);
        rows.push([lang === 'en' ? 'GOAL' : 'META', "", "", "", goals.protein, goals.kcal, goals.carbs, goals.fat, goals.fiber, goals.salt]);
        content = rows.map(r => r.join(",")).join("\n");
      } else if (format === "html") {
        const mealRows = MEAL_KEYS.map(meal => {
          const items = dayLog[meal] || [];
          if (!items.length) return "";
          const itemRows = items.map(e => "<tr><td>" + e.name + "</td><td>" + e.qty + e.unit + "</td><td>" + rnd(e.protein) + "g</td><td>" + rnd(e.kcal) + "</td><td>" + rnd(e.carbs) + "g</td><td>" + rnd(e.fat) + "g</td></tr>").join("");
          return "<h3>" + mealDisplay(meal) + "</h3><table border='1' cellpadding='6' style='border-collapse:collapse;width:100%;margin-bottom:16px'><tr><th>" + (lang === 'en' ? "Food" : "Alimento") + "</th><th>" + (lang === 'en' ? "Qty" : "Qtd") + "</th><th>" + t('protein') + "</th><th>Kcal</th><th>" + t('carbs') + "</th><th>" + t('fat') + "</th></tr>" + itemRows + "</table>";
        }).join("");
        content = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>" + (lang === 'en' ? "Nutrition " : "Nutrição ") + date + "</title>" + "<style>body{font-family:sans-serif;padding:24px;max-width:800px;margin:auto}h1,h3{color:#333}table{width:100%}td,th{padding:6px 10px;text-align:left;border:1px solid #ddd}.box{background:#f5f5f5;padding:12px;border-radius:6px;margin-top:16px}</style></head><body>" + "<h1>" + (lang === 'en' ? "Nutrition Report - " : "Relatório Nutricional - ") + date + "</h1><p><b>" + (lang === 'en' ? "Type:" : "Tipo:") + "</b> " + (isTraining ? t('training') : t('rest')) + "</p>" + mealRows + "<div class='box'><h3>" + (lang === 'en' ? "Totals" : "Totais") + "</h3><p>" + t('protein') + ": <b>" + totals.protein + "g</b> (" + (lang === 'en' ? "goal: " : "meta: ") + goals.protein + "g) &nbsp;|&nbsp; " + t('calories') + ": <b>" + totals.kcal + "</b> (" + (lang === 'en' ? "goal: " : "meta: ") + goals.kcal + ") &nbsp;|&nbsp; " + t('carbs') + ": " + totals.carbs + "g &nbsp;|&nbsp; " + t('fat') + ": " + totals.fat + "g &nbsp;|&nbsp; " + t('fiber') + ": " + totals.fiber + "g &nbsp;|&nbsp; " + t('salt') + ": " + totals.salt + "g</p></div>" + (note ? "<div class='box'><h3>" + (lang === 'en' ? "Notes" : "Notas") + "</h3><p>" + note.replace(/\n/g, "<br>") + "</p></div>" : "") + "</body></html>";
      } else {
        let txt = (lang === 'en' ? "NUTRITION REPORT - " : "RELATÓRIO NUTRICIONAL - ") + date + "\n" + (lang === 'en' ? "Type: " : "Tipo: ") + (isTraining ? t('training') : t('rest')) + "\n\n";
        MEAL_KEYS.forEach(meal => {
          const items = dayLog[meal] || [];
          if (!items.length) return;
          txt += mealDisplay(meal).toUpperCase() + "\n";
          items.forEach(e => {
            txt += "  " + e.name + " " + e.qty + e.unit + " - " + rnd(e.protein) + "g " + (lang === 'en' ? "protein" : "prot.") + ", " + rnd(e.kcal) + " kcal\n";
          });
          txt += "\n";
        });
        txt += (lang === 'en' ? "TOTALS\nProtein: " : "TOTAIS\nProteína: ") + totals.protein + "g / " + goals.protein + "g\n" + t('calories') + ": " + totals.kcal + " / " + goals.kcal + "\n" + t('carbs') + ": " + totals.carbs + "g | " + t('fat') + ": " + totals.fat + "g | " + t('fiber') + ": " + totals.fiber + "g | " + t('salt') + ": " + totals.salt + "g";
        if (note) txt += "\n\n" + (lang === 'en' ? "NOTES" : "NOTAS") + "\n" + note;
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
        const rows = [[lang === 'en' ? "Date" : "Data", lang === 'en' ? "Type" : "Tipo", t('protein') + "(g)", lang === 'en' ? "Protein goal" : "Meta Prot", t('calories'), "Meta Kcal", t('carbs') + "(g)", t('fat') + "(g)", t('fiber') + "(g)", t('salt') + "(g)"]];
        days.forEach(d => rows.push([d.date, d.isTraining ? t('training') : t('rest'), d.totals.protein, d.goals.protein, d.totals.kcal, d.goals.kcal, d.totals.carbs, d.totals.fat, d.totals.fiber, d.totals.salt]));
        content = rows.map(r => r.join(",")).join("\n");
      } else if (format === "html") {
        const rows = days.map(d => "<tr><td>" + d.date + "</td><td>" + (d.isTraining ? t('training') : t('rest')) + "</td><td>" + d.totals.protein + "g / " + d.goals.protein + "g</td><td>" + d.totals.kcal + " / " + d.goals.kcal + "</td><td>" + d.totals.carbs + "g</td><td>" + d.totals.fat + "g</td><td>" + d.totals.fiber + "g</td></tr>").join("");
        content = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>" + (lang === 'en' ? "Weekly Nutrition" : "Semana Nutricional") + "</title><style>body{font-family:sans-serif;padding:24px;max-width:900px;margin:auto}table{width:100%;border-collapse:collapse}td,th{padding:8px 12px;border:1px solid #ddd}th{background:#f0f0f0}tr:nth-child(even){background:#fafafa}</style></head><body><h1>" + (lang === 'en' ? "Weekly Report - " : "Relatório Semanal - ") + TODAY + "</h1><table><tr><th>" + (lang === 'en' ? "Date" : "Data") + "</th><th>" + (lang === 'en' ? "Type" : "Tipo") + "</th><th>" + t('protein') + "</th><th>" + t('calories') + "</th><th>" + t('carbs') + "</th><th>" + t('fat') + "</th><th>" + t('fiber') + "</th></tr>" + rows + "</table></body></html>";
      } else {
        let txt = (lang === 'en' ? "WEEKLY REPORT - " : "RELATÓRIO SEMANAL - ") + TODAY + "\n\n";
        days.forEach(d => {
          txt += d.date + " (" + (d.isTraining ? t('training') : t('rest')) + ")\n  " + t('protein') + ": " + d.totals.protein + "g / " + d.goals.protein + "g | " + t('calories') + ": " + d.totals.kcal + " / " + d.goals.kcal + "\n\n";
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
      const feedbackEnglish = lang === "en";
      const activityInfo = ACTIVITY_LEVELS[nutritionPrefs.activityLevel || "moderate"];
      const objectiveLabel = feedbackEnglish ? (nutritionPrefs.goalType === "loss" ? "weight loss" : nutritionPrefs.goalType === "gain" ? "weight/muscle gain" : "weight maintenance") : (nutritionPrefs.goalType === "loss" ? "perda de peso" : nutritionPrefs.goalType === "gain" ? "ganho de peso/massa" : "manutenção do peso");
      const objectiveDetails = nutritionPrefs.goalType === "loss" || nutritionPrefs.goalType === "gain" ? (nutritionPrefs.goalKg || "?") + "kg " + (feedbackEnglish ? "in " : "em ") + (nutritionPrefs.goalWeeks || "?") + (feedbackEnglish ? " weeks" : " semanas") : (feedbackEnglish ? "no planned weight adjustment" : "sem ajuste de peso planejado");
      const userAge = calculateAge(profileData.birthDate);
      const latestWeight = currentWeight || viewWeight;
      const latestHeight = currentHeight || viewHeight;
      const profileLines = [
        feedbackUserName ? (feedbackEnglish ? "Name: " : "Nome: ") + feedbackUserName : "",
        latestWeight ? (feedbackEnglish ? "Latest recorded weight: " : "último peso registrado: ") + latestWeight + "kg" : "",
        latestHeight ? (feedbackEnglish ? "Height: " : "Altura: ") + latestHeight + "cm" : "",
        userAge ? (feedbackEnglish ? "Calculated age: " + userAge + " years" : "Idade calculada: " + userAge + " anos") : "",
        profileData.gender ? (feedbackEnglish ? "Reported sex: " + (profileData.gender === "male" ? "male" : "female") : "Gênero informado: " + (profileData.gender === "male" ? "masculino" : "feminino")) : "",
        latestWeight && latestHeight ? (feedbackEnglish ? "Current BMI: " : "IMC atual: ") + (latestWeight / ((latestHeight/100)**2)).toFixed(1) : "",
        (feedbackEnglish ? "Current goal: " : "Objetivo atual: ") + objectiveLabel + " (" + objectiveDetails + ")",
        activityInfo ? (feedbackEnglish ? "Physical activity level: " + activityInfo.en + " - " + activityInfo.descEn + " | AF: " : "Nível de atividade física: " + activityInfo.pt + " - " + activityInfo.descPt + " | FA: ") + (baseGoals.fa || activityInfo.factor) : "",
        feedbackEnglish ? "Day classified as: " + (isTraining ? "training/activity day" : "rest day") : "Dia analisado como: " + (isTraining ? "dia de treino/atividade" : "dia de descanso"),
        (feedbackEnglish ? "Calculated base calories before adjustment: " : "Calorias de base calculadas antes do ajuste: ") + (calorieBase || "—") + " kcal",
        (feedbackEnglish ? "Goal calorie adjustment: " : "Ajuste calórico do objetivo: ") + (calorieAdjustment > 0 ? "+" : "") + calorieAdjustment + (feedbackEnglish ? " kcal/day" : " kcal/dia"),
        feedbackEnglish ? "Targets in use: " + (goals.kcal || "—") + " kcal, " + (goals.protein || "—") + "g protein, " + (goals.carbs || "—") + "g carbs, " + (goals.fat || "—") + "g fat, " + (goals.fiber || "—") + "g fiber, " + (goals.salt || "—") + "g sodium/salt" : "Metas em uso: " + (goals.kcal || "—") + " kcal, " + (goals.protein || "—") + "g proteína, " + (goals.carbs || "—") + "g carboidratos, " + (goals.fat || "—") + "g gorduras, " + (goals.fiber || "—") + "g fibra, " + (goals.salt || "—") + "g sal",
        (feedbackEnglish ? "Protein multiplier: " : "Multiplicador de proteína: ") + Number(proteinMultiplier).toFixed(1) + "g/kg"
      ].filter(Boolean).join("\n");
      const feedbackRules = (feedbackEnglish ? [
        "Use the user's name naturally when available, without overusing it.",
        "Analyze the data against the current goal, latest recorded weight, calorie/protein targets, and all available nutrient targets.",
        "Be balanced: highlight real strengths and realistic improvement areas without alarmism.",
        "Do not frame small differences as major problems. Deviations under 5% of the target, or just a few grams for nutrients, should be treated at most as a light observation.",
        "Prioritize relevant patterns, consistency, food choices, protein/calorie distribution, fiber, sodium/salt, fats, and alignment with the user's goal.",
        "Avoid medical diagnosis. Give practical, realistic guidance based only on the provided data.",
        "When data is missing, state that the conclusion is limited instead of inventing."
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
          notify(t('noWeekData'));
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
      notify((lang === 'en' ? "Error: " : "Erro: ") + (_.message || (lang === 'en' ? "Could not generate feedback." : "Não foi possível gerar o feedback.")), 8000);
    }
    setFeedbackLoading(false);
  }
  // Genetic Algorithm Meal Suggester
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
      notify(lang === 'en' ? "Add foods to the pantry first." : "Adicione alimentos à despensa primeiro.");
      setGARunning(false); return;
    }

    // Remaining nutritional budget for the day
    const entries = Object.values(activeLog).flat();
    const eatenProt = entries.reduce((s,e)=>s+(e.protein ?? 0),0);
    const eatenKcal = entries.reduce((s,e)=>s+(e.kcal ?? 0),0);
    const targetProt = Math.max(10, (goals.protein||150) - eatenProt);
    const targetKcal = Math.max(50, (goals.kcal||2000) - eatenKcal);
    const kcalBudget = targetKcal * (1 + gaTolerance/100);
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

    const protBudget = gaUseProtTol
      ? targetProt * (1 + gaProtTolerance/100)
      : Infinity;

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

        const kcalCeiling = hasKcalMax ? kcalMaxLimit : kcalBudget;
        if (Number.isFinite(kcalCeiling) && kcalCeiling >= 0 && kcalPerGene > 0) {
          maxCandidates.push(Math.floor(kcalCeiling / kcalPerGene));
          usedVariableCap = true;
        }

        const protCeiling = hasProtMax ? protMaxLimit : (gaUseProtTol ? protBudget : null);
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
    const kcalHi = hasKcalMax ? kcalMaxLimit : kcalBudget;

    const protLo = hasProtMin ? protMinLimit : 0;
    const protHi = hasProtMax ? protMaxLimit : Infinity;

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
          hasProtMax ? protHi : (gaUseProtTol ? protBudget : targetProt*1.5),
          8);
        // Soft centering bonus (pulls solution toward middle of interval)
        const kMid = ((hasKcalMin?kcalLo:kcalHi*0.2) + (hasKcalMax?kcalHi:kcalBudget)) / 2;
        const pMid = ((hasProtMin?protLo:targetProt*0.5) + (hasProtMax?protHi:targetProt*1.5)) / 2;
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
      if (hasKcalMax && t.kcal > kcalMaxLimit) return false;
      if (hasProtMin && t.protein < protMinLimit) return false;
      if (hasProtMax && t.protein > protMaxLimit) return false;
      if (gaUseProtTol && Number.isFinite(protBudget) && t.protein > protBudget) return false;
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
      notify(lang === 'en'
        ? "No valid combination was found with the selected limits."
        : "Nenhuma combinacao valida foi encontrada com os limites definidos.");
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
      notify((lang === 'en' ? "Could not generate meal suggestions: " : "Não foi possível gerar sugestões de refeição: ") + (err?.message || err), 8000);
    }
  }

  function openMealSuggestions() {
    if (!pantry.length) {
      notify(lang === 'en' ? "Add foods to the pantry first." : "Adicione alimentos à despensa primeiro.");
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
    notify(lang === 'en' ? "Meal added to diary (" + mealLabel(meal) + ")!" : "Refeição adicionada ao diário (" + mealLabel(meal) + ")!");
    setShowGA(false);
  }

  function  saveFeedbackAsNote() {
    if (!feedbackText) return;
    const separator = "\n\n---\n FEEDBACK " + (feedbackPeriod === "day" ? "DO DIA" : "DA SEMANA") + " (" + new Date().toLocaleDateString("pt-BR") + "):\n";
    if (feedbackPeriod === "day") {
      if (isToday) setTodayNote(n => (n ? n + separator : separator.trim() + "\n") + feedbackText);else setHistoryNote(n => (n ? n + separator : separator.trim() + "\n") + feedbackText);
    } else {
      setTodayNote(n => (n ? n + separator : separator.trim() + "\n") + feedbackText);
    }
    notify(lang === 'en' ? "Feedback saved to notes." : "Feedback salvo nas notas.");
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
    ? (lang === 'en'
      ? "This calorie adjustment looks very aggressive. Very low targets or large deficits/surpluses can be unhealthy and hard to sustain; consider a smaller adjustment or a longer timeline."
      : "Este ajuste calórico parece muito agressivo. Metas muito baixas ou déficits/superávits grandes podem ser pouco saudáveis e difíceis de sustentar; considere um ajuste menor ou um prazo mais longo.")
    : aggressiveAdjustment
      ? (lang === 'en'
        ? "This is a high adjustment. Review the timeline or use a smaller manual adjustment if the target feels too extreme."
        : "Este é um ajuste alto. Revise o prazo ou use um ajuste manual menor se a meta parecer extrema.")
      : "";
  const weeklyGoalRate = Number(nutritionPrefs.goalKg) && Number(nutritionPrefs.goalWeeks) ? Number(nutritionPrefs.goalKg) / Number(nutritionPrefs.goalWeeks) : 0;
  const healthGuardrails = [
    calculatedGoals.kcal < 1200 && (lang === 'en' ? "Final target below 1200 kcal/day: this is usually too low without professional supervision." : "Meta final abaixo de 1200 kcal/dia: normalmente é baixa demais sem acompanhamento profissional."),
    Math.abs(calorieAdjustment) >= 750 && (lang === 'en' ? "Adjustment above 750 kcal/day: consider a longer timeline to protect adherence and recovery." : "Ajuste acima de 750 kcal/dia: considere um prazo maior para proteger aderência e recuperação."),
    adjustmentPct >= 35 && (lang === 'en' ? "Adjustment above 35% of your day base: this is an extreme change compared with your estimated maintenance." : "Ajuste acima de 35% da base do dia: é uma mudança extrema em relação à manutenção estimada."),
    nutritionPrefs.goalType === "loss" && weeklyGoalRate > 1 && (lang === 'en' ? "Planned loss above 1 kg/week: this may increase hunger, fatigue, and muscle-loss risk." : "Perda planejada acima de 1 kg/semana: pode aumentar fome, fadiga e risco de perda muscular."),
    nutritionPrefs.goalType === "gain" && weeklyGoalRate > 0.5 && (lang === 'en' ? "Planned gain above 0.5 kg/week: a large surplus may add unnecessary fat gain." : "Ganho planejado acima de 0,5 kg/semana: um superávit grande pode aumentar ganho de gordura desnecessário.")
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
      proteinMet: protein >= targetGoals.protein,
      kcalGood: kcal >= targetGoals.kcal * 0.85 && kcal <= targetGoals.kcal * 1.15,
      kcalOver: kcal > targetGoals.kcal * 1.15,
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
      for (const date of dates) {
        let dayLog = date === TODAY ? log : {};
        if (date !== TODAY) {
          const saved = await storage.get("log_v2_" + date).catch(() => null);
          if (saved) dayLog = normalizeMealKeys(JSON.parse(saved.value));
        }
        nextData[date] = calendarMarkerFor(dayLog, dayGoalForDate(date));
      }
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
      ? (lang === 'en' ? 'Food saved as units using the average unit weight.' : 'Alimento salvo por unidade usando o peso médio informado.')
      : (lang === 'en' ? 'Food saved.' : 'Alimento salvo.'));
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
    notify(lang === 'en' ? "Food updated." : "Alimento atualizado.");
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
    notify(lang === 'en' ? "Amount updated." : "Quantidade atualizada.");
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
    setBatchMode(false);
    setDescribeMode(pantry.length === 0);
    openTab("adicionar");
  }
  function addToLog() {
    if (!pantry.length) {
      notify(lang === 'en' ? "Add foods to the pantry first, or use Describe dish." : "Cadastre alimentos na despensa primeiro, ou use Descrever prato.");
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
    notify(lang === 'en' ? `${food.name} added.` : `${food.name} adicionado.`);
  }
  function addToStaged() {
    if (!pantry.length) {
      notify(lang === 'en' ? "Add foods to the pantry first, or use Describe dish." : "Cadastre alimentos na despensa primeiro, ou use Descrever prato.");
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
      notify(lang === 'en' ? "Add foods to the pantry first, or use Describe dish." : "Cadastre alimentos na despensa primeiro, ou use Descrever prato.");
      return;
    }
    if (!staged.items.length) return;
    const meal = staged.meal,
      items = [...staged.items];
    setActiveLog({
      ...activeLog,
      [meal]: [...(activeLog[meal] || []), ...items]
    });
    setStaged(s => ({
      ...s,
      items: []
    }));
    notify(lang === 'en' ? `${items.length} item(s) logged to ${meal}.` : `${items.length} item(ns) registrado(s) em ${meal}.`);
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
    notify(lang === 'en' ? "Entry duplicated." : "Registro duplicado.");
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
    notify(lang === 'en' ? "Meal template saved." : "Modelo salvo.");
  }
  function deleteTemplate(id) {
    const tmpl = mealTemplates.find(t => t.id === id);
    const ok = window.confirm(lang === 'en'
      ? `Delete saved meal "${tmpl?.name || ""}"?`
      : `Apagar a refeição salva "${tmpl?.name || ""}"?`);
    if (!ok) return;
    if (editingTemplateId === id) cancelTemplateEdit();
    setMealTemplates(mt => mt.filter(t => t.id !== id));
    setExpandedTemplateIds(prev => {
      const next = {...prev};
      delete next[id];
      return next;
    });
    notify(lang === 'en' ? "Saved meal deleted." : "Refeição salva apagada.");
  }
  function loadTemplate(t) {
    const items = templateEntries(t).filter(Boolean);
    setStaged({
      meal: t.meal,
      items
    });
    setBatchMode(true);
    notify(lang === 'en' ? `"${t.name}" loaded.` : `"${t.name}" carregado.`);
  }
  function appendTemplateToStaged(t) {
    const items = templateEntries(t).filter(Boolean);
    if (!items.length) {
      notify(lang === 'en' ? "No ingredient from the saved meal was found in the pantry." : "Nenhum ingrediente da refeição salva foi encontrado na despensa.");
      return;
    }
    setStaged(s => ({
      meal: s.items.length ? s.meal : t.meal,
      items: [...s.items, ...items]
    }));
    setBatchMode(true);
    notify(lang === 'en' ? `"${t.name}" added to the meal in progress.` : `"${t.name}" adicionada à preparação.`);
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
    notify(lang === 'en' ? `"${recentMeal.meal}" from ${recentMeal.date} loaded. Adjust and log it.` : `"${recentMeal.meal}" de ${recentMeal.date} carregada. Ajuste e registre.`);
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
    setWeightHistory(h => upsertWeightEntry(normalizeWeightHistory(h), entry));
    setWeightForm({
      weight: "",
      height: "",
      bodyFatPct: "",
      waistCm: "",
      muscleMassKg: "",
      date: TODAY
    });
    notify(lang === 'en' ? "Weight updated." : "Peso atualizado.");
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

    setWeightHistory(h => upsertWeightEntry(normalizeWeightHistory(h), entry, editingWeightId));
    setEditingWeightId(null);
    notify(lang === 'en' ? "Record updated." : "Registro atualizado.");
  }

  // Export/Import
  // Gemini AI helper
  async function callAI(prompt, maxTokens) {
    const key = localStorage.getItem('groq_key') || '';
  if (!key) throw new Error(lang === 'en' ? 'Groq API key is not configured. Open Settings.' : 'Chave API Groq não configurada. Abra as Configurações.');
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
    if (!res.ok) throw new Error(data.error?.message || (lang === 'en' ? 'Groq API error' : 'Erro na API Groq'));
    return data.choices?.[0]?.message?.content || '';
  }
  function aiLang() {
    return lang === 'en' ? '\nRespond in American English.\n' : '\nResponda em português do Brasil.\n';
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
      'mealTemplates', 'weightHistory', 'trainingByDate', 'birthDate', 'gender',
      'activityLevel', 'goalType', 'goalKg', 'goalWeeks',
      'manualCalorieAdjustment', 'proteinMultiplier', 'bodyFatGoal'
    ];
    const toFetch = [...new Set([...staticKeys, ...allKeys])];

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

  async function importFullBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async evt => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (window.importFullAccountBackup) {
          const countInfo = parsed.counts
            ? `${parsed.counts.root || 0} root, ${parsed.counts.data || 0} data, ${parsed.counts.legacy || 0} legacy`
            : null;
          const confirmText = lang === 'en'
            ? `Import this full account backup${countInfo ? ` (${countInfo})` : ''}? Existing data with the same keys will be replaced.`
            : `Importar este backup completo da conta${countInfo ? ` (${countInfo})` : ''}? Dados existentes com as mesmas chaves serão substituídos.`;
          if (!window.confirm(confirmText)) return resolve({cancelled: true});
          notify(lang === 'en' ? "Importing..." : "Importando...");
          const result = await window.importFullAccountBackup(parsed);
          notify(lang === 'en'
            ? `Imported ${result.imported} records. Reload the page to see everything.`
            : `Importados ${result.imported} registros. Recarregue a página para ver tudo.`);
          resolve(result);
          return;
        }
        const data = parsed.data || parsed;
        const keys = Object.keys(data);
        if (!keys.length) {
          notify(lang === 'en' ? "Empty or invalid file." : "Arquivo vazio ou inválido.");
          return resolve({imported: 0});
        }
        if (!window.confirm(`Importar ${keys.length} registros? Os dados existentes com as mesmas chaves serão substituídos.`)) {
          return resolve({cancelled: true});
        }
        notify(lang === 'en' ? "Importing..." : "Importando...");
        let count = 0;
        for (let i = 0; i < keys.length; i += 10) {
          await Promise.all(keys.slice(i, i + 10).map(async k => {
            try {
              await storage.set(k, data[k]);
              count++;
            } catch (_) {}
          }));
        }
        notify(lang === 'en' ? `${count} records imported. Reload the page to see everything.` : `${count} registros importados. Recarregue a página para ver tudo.`);
        resolve({imported: count});
      } catch (err) {
        notify((lang === 'en' ? "Error reading file: " : "Erro ao ler arquivo: ") + err.message);
        reject(err);
      }
      };
      reader.onerror = () => reject(reader.error || new Error("File read failed"));
      reader.readAsText(file);
    });
  }
  // Export specific data types and download as .json
  async function exportAndDownload(type) {
    const isPt = lang !== 'en';
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

      notify(isPt ? 'Arquivo baixado!' : 'File downloaded!');
    } catch(e) {
      notify(isPt ? 'Erro ao exportar: '+e.message : 'Export error: '+e.message);
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
      notify(t('notifBackupDone'));
    } catch (e) {
      notify((lang === 'en' ? "Export error: " : "Erro ao exportar: ") + e.message);
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
    navigator.clipboard.writeText(csv).then(() => notify(lang === 'en' ? "Pantry CSV copied to clipboard!" : "CSV da despensa copiado para a área de transferência!")).catch(() => {
      setBackupJson(csv);
      notify(lang === 'en' ? "Copy the text shown below." : "Copie o texto que apareceu abaixo.");
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
          notify(t('notifNoFood'));
          return;
        }
        setPantry(p => {
          const ex = new Set(p.map(f => f.name.toLowerCase()));
          const news = imported.filter(f => !ex.has(f.name.toLowerCase()));
          notify(lang === 'en' ? `${news.length} imported.` : `${news.length} importado(s).`);
          return [...p, ...news];
        });
      } catch (_) {
        notify(lang === 'en' ? "Error reading file." : "Erro ao ler arquivo.");
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
  notify(lang === 'en' ? "JSON generated. Copy it from the Backup section." : "JSON gerado. Copie a partir da seção Backup.");
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
        notify(lang === 'en' ? `${count} item(s) imported.` : `${count} item(ns) importado(s).`);
      } catch (_) {
        notify(lang === 'en' ? "Import error." : "Erro ao importar.");
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
  notify(lang === 'en' ? "Day JSON generated. Copy it from the Backup section." : "JSON do dia gerado. Copie a partir da seção Backup.");
  }
  function importDayLog(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!data.log) {
          notify(lang === 'en' ? "Invalid format." : "Formato inválido.");
          return;
        }
        if (window.confirm(lang === 'en' ? "Replace the current record with the imported file?" : "Substituir o registro atual pelo arquivo importado?")) {
          setActiveLog(data.log);
          notify(lang === 'en' ? "Record imported." : "Registro importado.");
        }
      } catch (_) {
        notify(lang === 'en' ? "Import error." : "Erro ao importar.");
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
    kcal: total(t('kcalUnit')),
    carbs: total("carbs"),
    fat: total("fat"),
    fiber: total("fiber"),
    salt: total("salt"),
    sugars: total("sugars"),
    satfat: total("satfat")
  };
  const stagedTot = {
    protein: staged.items.reduce((s, e) => s + (e.protein ?? 0), 0),
    kcal: staged.items.reduce((s, e) => s + (e.kcal ?? 0), 0),
    carbs: staged.items.reduce((s, e) => s + (e.carbs ?? 0), 0)
  };
  const hasMicros = MICRO_FIELDS.some(f => allEntries.some(e => e[f.key.replace("100", "")]));
  const selectedFood = addEntry.foodId ? pantry.find(f => f.id === addEntry.foodId) : null;
  const filteredPantry = pantrySearch ? pantry.filter(f => f.name.toLowerCase().includes(pantrySearch.toLowerCase())) : pantry;
  const sortedPantry = [...filteredPantry].sort((a, b) => a.name.localeCompare(b.name, "pt"));
  const sortedAllPantry = [...pantry].sort((a, b) => a.name.localeCompare(b.name, "pt"));
  const remainProtein = Math.max(0, Math.round(goals.protein - tot.protein));
  const remainKcal = Math.max(0, Math.round(goals.kcal - tot.kcal));
  const dayProteinPct = goals.protein ? Math.round(tot.protein / goals.protein * 100) : 0;
  const dayKcalPct = goals.kcal ? Math.round(tot.kcal / goals.kcal * 100) : 0;
  const diaryStatus = (() => {
    if (!allEntries.length) return {
      tone: "muted",
      title: lang === 'en' ? "No meals logged yet" : "Nenhuma refeição registrada ainda",
      text: lang === 'en' ? "Start with a meal or ask for a suggestion based on your pantry." : "Comece registrando uma refeição ou peça uma sugestão com base na despensa."
    };
    if (dayKcalPct > 115) return {
      tone: "warn",
      title: lang === 'en' ? "Calories are running high" : "Calorias acima do ideal",
      text: lang === 'en' ? "You are past the comfortable range for today. Prioritize lighter, protein-focused choices." : "Você passou da faixa confortável de hoje. Priorize escolhas mais leves e com boa proteína."
    };
    if (dayProteinPct < 60 && dayKcalPct > 60) return {
      tone: "warn",
      title: lang === 'en' ? "Protein is lagging behind" : "Proteína está ficando para trás",
    text: lang === 'en' ? "Calories are moving faster than protein. A lean protein option may help balance the day." : "As calorias estão avançando mais rápido que a proteína. Uma opção proteica magra pode equilibrar o dia."
    };
    if (dayProteinPct >= 100 && dayKcalPct <= 115) return {
      tone: "ok",
      title: lang === 'en' ? "Good path for today" : "Bom caminho para hoje",
      text: lang === 'en' ? "Protein is covered and calories are still controlled." : "A proteína está coberta e as calorias seguem controladas."
    };
    return {
      tone: "info",
      title: lang === 'en' ? "On track" : "No caminho",
      text: lang === 'en' ? "Keep an eye on what remains before choosing the next meal." : "Observe o que ainda falta antes de escolher a próxima refeição."
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
    notify(lang === 'en' ? "Saved meal updated." : "Refeição salva atualizada.");
  }
  function renderSavedMealCard(tmpl, context) {
    const entries = templateEntries(tmpl);
    const totals = templateTotals(tmpl);
    const expanded = !!expandedTemplateIds[tmpl.id];
    const isEditingTemplate = context === "pantry" && editingTemplateId === tmpl.id && templateEditDraft;
    const proteinPct = pctOf(totals.protein, goals.protein);
    const kcalPct = pctOf(totals.kcal, goals.kcal);
    return /*#__PURE__*/React.createElement("div", {
      key: tmpl.id,
      style: {
        border: "1px solid var(--border3)",
        borderRadius: 8,
        padding: "10px 12px",
        background: "var(--surface2, var(--surface))"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => toggleTemplateExpanded(tmpl.id),
      title: expanded ? (lang === 'en' ? "Collapse" : "Recolher") : (lang === 'en' ? "Expand" : "Expandir"),
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
      style: {
        flex: 1,
        minWidth: 0
      }
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
    }, /*#__PURE__*/React.createElement("span", null, Math.round(totals.kcal), " kcal · ", kcalPct, "%"), /*#__PURE__*/React.createElement("span", null, Math.round(totals.protein), "g ", lang === 'en' ? "protein" : "proteína", " · ", proteinPct, "%"), /*#__PURE__*/React.createElement("span", null, (tmpl.items || []).length, " item", (tmpl.items || []).length !== 1 ? "s" : ""))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        justifyContent: "flex-end"
      }
    }, context === "add" && /*#__PURE__*/React.createElement("button", {
      onClick: () => appendTemplateToStaged(tmpl),
      style: sBtn("var(--btn-ok)", "var(--btn-ok-border)", "var(--btn-ok-text)")
    }, lang === 'en' ? "Add" : "Adicionar"), /*#__PURE__*/React.createElement("button", {
      onClick: () => context === "pantry" ? beginTemplateEdit(tmpl) : loadTemplate(tmpl),
      style: sBtn("var(--btn-info)", "var(--btn-info-border)", "var(--btn-info-text)")
    }, lang === 'en' ? "Edit" : "Editar"), context === "pantry" && /*#__PURE__*/React.createElement("button", {
      onClick: () => deleteTemplate(tmpl.id),
      title: lang === 'en' ? "Delete" : "Apagar",
      style: {
        background: "none",
        border: "1px solid var(--border3)",
        color: "var(--dim)",
        borderRadius: 6,
        padding: "4px 8px",
        fontSize: 14,
        cursor: "pointer"
      }
    }, "\u00D7"))), isEditingTemplate ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        paddingTop: 10,
        borderTop: "1px solid var(--border3)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: isMobileView ? "1fr" : "minmax(180px, 1fr) minmax(160px, 220px)",
        gap: 8,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: lbl
    }, lang === 'en' ? "Template name" : "Nome da refeição"), /*#__PURE__*/React.createElement("input", {
      value: templateEditDraft.name,
      onChange: e => setTemplateEditDraft(d => ({...d, name: e.target.value})),
      style: inp
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: lbl
    }, lang === 'en' ? "Default meal" : "Refeição padrão"), /*#__PURE__*/React.createElement("select", {
      value: templateEditDraft.meal,
      onChange: e => setTemplateEditDraft(d => ({...d, meal: e.target.value})),
      style: inp
    }, MEALS.map(m => /*#__PURE__*/React.createElement("option", {
      key: m,
      value: m
    }, mealLabel(m)))))), templateEditDraft.items.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--faint)",
        fontSize: 13,
        fontStyle: "italic",
        padding: "8px 0"
      }
    }, lang === 'en' ? "No ingredients in this template." : "Sem ingredientes neste modelo.") : templateEditDraft.items.map((item, idx) => /*#__PURE__*/React.createElement("div", {
      key: (item.foodId || item.name || "item") + idx,
      style: {
        display: "grid",
        gridTemplateColumns: isMobileView ? "1fr" : "minmax(150px, 1fr) 96px 34px",
        gap: 8,
        alignItems: "end",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--text2)",
        fontSize: 14,
        minWidth: 0
      }
    }, item.name, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--muted)",
        fontSize: 12,
        marginTop: 2
      }
    }, Math.round((templateItemEntry(item).kcal || 0)), " kcal · ", Math.round((templateItemEntry(item).protein || 0)), "g ", lang === 'en' ? "protein" : "proteína")), /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: item.qty,
      onChange: e => updateTemplateDraftItem(idx, {qty: e.target.value}),
      style: {
        ...inp,
        marginTop: 0
      }
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => removeTemplateDraftItem(idx),
      title: lang === 'en' ? "Remove ingredient" : "Remover ingrediente",
      style: {
        height: 36,
        background: "none",
        border: "1px solid var(--border3)",
        color: "var(--dim)",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 16
      }
    }, "\u00D7"))), /*#__PURE__*/React.createElement("div", {
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
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, lang === 'en' ? "Add ingredient..." : "Adicionar ingrediente..."), sortedAllPantry.map(f => /*#__PURE__*/React.createElement("option", {
      key: f.id,
      value: f.id
    }, f.name))), /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: templateEditDraft.addQty,
      onChange: e => setTemplateEditDraft(d => ({...d, addQty: e.target.value})),
      placeholder: lang === 'en' ? "Qty" : "Qtd",
      style: inp
    }), /*#__PURE__*/React.createElement("button", {
      onClick: addTemplateDraftItem,
      disabled: !templateEditDraft.addFoodId || !templateEditDraft.addQty,
      style: {
        ...sBtn("var(--btn-info)", "var(--btn-info-border)", "var(--btn-info-text)"),
        height: 36,
        opacity: templateEditDraft.addFoodId && templateEditDraft.addQty ? 1 : 0.45
      }
    }, lang === 'en' ? "Add" : "Adicionar")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        justifyContent: "flex-end",
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: cancelTemplateEdit,
      style: sBtn("transparent", "var(--border2)", "var(--muted)")
    }, lang === 'en' ? "Cancel" : "Cancelar"), /*#__PURE__*/React.createElement("button", {
      onClick: saveTemplateEdit,
      disabled: !templateEditDraft.name.trim() || !templateEditDraft.items.length,
      style: {
        ...sBtn("var(--btn-ok)", "var(--btn-ok-border)", "var(--btn-ok-text)"),
        opacity: templateEditDraft.name.trim() && templateEditDraft.items.length ? 1 : 0.45
      }
    }, lang === 'en' ? "Save changes" : "Salvar alterações"))) : expanded && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        paddingTop: 10,
        borderTop: "1px solid var(--border3)",
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, entries.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--faint)",
        fontStyle: "italic"
      }
    }, lang === 'en' ? "No ingredients saved." : "Sem ingredientes salvos.") : entries.map((item, idx) => /*#__PURE__*/React.createElement("div", {
      key: item.foodId || item.name || idx,
      style: {
        display: "grid",
        gridTemplateColumns: "minmax(120px, 1fr) auto",
        gap: 10,
        alignItems: "start",
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--text2)",
        minWidth: 0
      }
    }, item.name, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--muted)",
        fontSize: 12,
        marginTop: 2
      }
    }, item.qty, item.unit)), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--muted2)",
        fontSize: 12,
        textAlign: "right",
        lineHeight: 1.45
      }
    }, Math.round(item.kcal || 0), " kcal · ", Math.round(item.protein || 0), "g prot", /*#__PURE__*/React.createElement("br", null), Math.round(item.carbs || 0), "g carb · ", Math.round(item.fat || 0), "g gord")))));
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
  const weightChartData = weightHistory.map(e => ({
    date: formatDateDM(e.date),
    weight: e.weight
  }));
  const daysWithData = weekData.filter(d => d.hasData);
  const avgProtein = daysWithData.length ? Math.round(daysWithData.reduce((s, d) => s + d.protein, 0) / daysWithData.length) : 0;
  const avgKcal = daysWithData.length ? Math.round(daysWithData.reduce((s, d) => s + d.kcal, 0) / daysWithData.length) : 0;
  const daysMetProtein = daysWithData.filter(d => d.metProtein).length;
  const completedWeekDays = weekData.filter(d => d.hasData && !d.isToday);
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
      title: lang === "en" ? "Body-fat trend" : "Evolução da gordura corporal",
      label: lang === "en" ? "Body fat" : "Gordura corporal",
      unit: "%",
      color: "#c86e8e",
      target: bodyComposition.targetPct || null
    },
    {
      key: "muscleMassKg",
      title: lang === "en" ? "Muscle-mass trend" : "Evolução da massa muscular",
      label: lang === "en" ? "Muscle mass" : "Massa muscular",
      unit: "kg",
      color: "#6ec8a9"
    },
    {
      key: "waistCm",
      title: lang === "en" ? "Waist trend" : "Evolução da cintura",
      label: lang === "en" ? "Waist" : "Cintura",
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
      height: 150
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
        value: (lang === "en" ? "Target " : "Meta ") + config.target + config.unit,
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
      notify(lang === 'en'
        ? "Enter current body fat, a lower target, and a time frame."
        : "Informe a gordura atual, uma meta menor e um prazo.");
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
  const greetingText = t(greetingKey) + (greetingFirstName ? ", " + greetingFirstName : "") + "!";
  const greetingLine = getDailyGreetingPhrase(lang, greetingPeriod);
  const tabNavItems = [["diario", t('tabDiary')], ["despensa", t('tabPantry')], ["semana", t('tabWeek')], ["metricas", t('tabMetrics')]];
  const proteinColor = "var(--protein)";
  const caloriesColor = "var(--calories)";
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
    label: t('protein'),
    value: tot.protein,
    goal: goals.protein,
    unit: "g",
    color: proteinColor
  }, {
    label: t('calories'),
    value: tot.kcal,
    goal: goals.kcal,
    unit: t('kcalUnit'),
    color: caloriesColor
  }];
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
    }, lang === 'en' ? "Advanced reports" : "Relatórios avançados"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--dim)",
        lineHeight: 1.45
      }
    }, lang === 'en' ? "Generate HTML or PDF reports with charts and period analysis." : "Gere relatórios em HTML ou PDF com gráficos e análise do período.")), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setReportMessage("");
        setReportModalOpen(true);
      },
      style: sBtn("var(--btn-info)", "var(--btn-info-border)", "var(--btn-info-text)")
    }, lang === 'en' ? "Generate report" : "Gerar relatório"));
  }

  /**
   * Advanced controls for the genetic-algorithm meal suggestions.
   * The empty numeric fields intentionally defer to runGASafely(), which
   * derives safe defaults from the user's remaining calories and protein.
   */
  function renderMealSuggestionAdvancedControls() {
    const eaten = Object.values(activeLog).flat();
    const eatenKcal = eaten.reduce((sum, entry) => sum + (entry.kcal || 0), 0);
    const eatenProtein = eaten.reduce((sum, entry) => sum + (entry.protein || 0), 0);
    const remainingKcal = Math.max(50, (goals.kcal || 2000) - eatenKcal);
    const remainingProtein = Math.max(10, (goals.protein || 150) - eatenProtein);
    const autoMaxKcal = Math.round(remainingKcal * (1 + gaTolerance / 100));
    const autoMinProtein = Math.round(remainingProtein * 0.5);
    const autoMaxProtein = Math.round(remainingProtein * (gaUseProtTol ? 1 + gaProtTolerance / 100 : 1.5));
    const compactLabel = {
      display: "block",
      color: "var(--text2)",
      fontSize: 12,
      marginBottom: 4
    };

    const limitFields = [
      {
        key: "kcalMin",
        label: lang === 'en' ? "Min calories" : "Calorias min.",
        unit: "kcal",
        value: gaKcalMin,
        set: setGAKcalMin,
        placeholder: lang === 'en' ? "auto: no minimum" : "auto: sem mínimo"
      },
      {
        key: "kcalMax",
        label: lang === 'en' ? "Max calories" : "Calorias max.",
        unit: "kcal",
        value: gaKcalMax,
        set: setGAKcalMax,
        placeholder: "auto: " + autoMaxKcal + " kcal"
      },
      {
        key: "protMin",
        label: lang === 'en' ? "Min protein" : "Proteína min.",
        unit: "g",
        value: gaProtMin,
        set: setGAProtMin,
        placeholder: (lang === 'en' ? "auto: about " : "auto: aprox. ") + autoMinProtein + "g"
      },
      {
        key: "protMax",
        label: lang === 'en' ? "Max protein" : "Proteína max.",
        unit: "g",
        value: gaProtMax,
        set: setGAProtMax,
        placeholder: (lang === 'en' ? "auto: about " : "auto: aprox. ") + autoMaxProtein + "g"
      }
    ];

    const q = gaFoodSearch.trim().toLowerCase();
    const filteredFoods = pantry
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", lang === 'en' ? "en" : "pt", { sensitivity: "base" }))
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
        placeholder: lang === 'en' ? "Search food by name" : "Pesquisar alimento pelo nome",
        style: { ...inp, marginTop: 0, marginBottom: 8 }
      }),
      React.createElement("div", {
        style: { color: "var(--muted)", fontSize: 12, marginBottom: 8 }
      }, lang === 'en' ? "Select foods to include:" : "Selecione os alimentos a incluir:"),
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
        }, lang === 'en' ? "No foods found." : "Nenhum alimento encontrado.")
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
        React.createElement("label", { style: compactLabel }, lang === 'en' ? "Global max units per food" : "Máx. unidades por alimento"),
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
          React.createElement("label", { style: compactLabel }, lang === 'en' ? "Calorie adjustment" : "Ajuste calórico"),
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
          React.createElement("span", null, lang === 'en' ? "- deficit" : "- déficit"),
          React.createElement("span", null, "0%"),
          React.createElement("span", null, lang === 'en' ? "+ surplus" : "+ superávit")
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
        lang === 'en' ? "Set protein flexibility" : "Definir flexibilidade de proteína"
      ),
      gaUseProtTol && React.createElement("div", { style: { marginBottom: 12 } },
        React.createElement("label", { style: compactLabel }, (lang === 'en' ? "Protein flexibility: " : "Flexibilidade de proteína: ") + gaProtTolerance + "%"),
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
        }, lang === 'en' ? "Absolute limits (optional)" : "Limites absolutos (opcional)"),
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
      }, (gaAdvancedOpen ? "▼ " : "▶ ") + (lang === 'en' ? "Advanced optional adjustments" : "Ajustes avançados opcionais")),
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
      ? (lang === 'en' ? "Best option" : "Melhor opção")
      : (lang === 'en' ? "Strong option" : "Uma das melhores");
    const fitLabel = Number.isFinite(result.fit)
      ? (lang === 'en' ? "fit " : "ajuste ") + Math.round(result.fit * 100) / 100
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
          }, (lang === 'en' ? "Option " : "Opção ") + (index + 1)),
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
          metricChip(lang === 'en' ? "prot" : "prot", Math.round(result.protein || 0) + "g", "#c8a24f")
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
          }, lang === 'en' ? "Impact today" : "Impacto no dia"),
          React.createElement("div", null, lang === 'en' ? "Protein after: " : "Proteína depois: ", Math.round(afterProtein), " / ", Math.round(proteinGoal), "g (", proteinPercent, "%)", proteinOver ? " +" + Math.round(proteinOver) + "g" : ""),
          React.createElement("div", null, lang === 'en' ? "Calories after: " : "Calorias depois: ", Math.round(afterKcal), " / ", Math.round(kcalGoal), "kcal (", kcalPercent, "%)", kcalOver ? " +" + Math.round(kcalOver) + "kcal" : "")
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
          }, lang === 'en' ? "Uses from remaining" : "Usa do restante"),
          React.createElement("div", null, lang === 'en' ? "Protein: " : "Proteína: ", proteinRemaining ? Math.round((result.protein || 0) / proteinRemaining * 100) : 100, "%"),
          React.createElement("div", null, lang === 'en' ? "Calories: " : "Calorias: ", kcalRemaining ? Math.round((result.kcal || 0) / kcalRemaining * 100) : 100, "%")
        )
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
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 8,
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
      }, lang === 'en' ? "Add to diary" : "Adicionar ao diário")
    );
  }

  if (!loaded) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: "100vh",
        background: THEME["--bg"],
        color: THEME["--text2"],
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontFamily: "system-ui,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
        letterSpacing: 2
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "app-loading-spinner",
      style: {
        width: 28,
        height: 28,
        border: "3px solid var(--border2)",
        borderTopColor: THEME["--accent"],
        borderRadius: "50%"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        color: THEME["--text2"]
      }
    }, t('loading')));
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
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
  }, t('appTitle')), /*#__PURE__*/React.createElement("div", {
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
    onClick: () => setMenuOpen(false),
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
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      toggleLang();
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
  }, t('langBtn'))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: "1px",
      background: "var(--border3)",
      margin: "2px 6px"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setDarkMode(d => !d);
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
  }, darkMode ? "" : ""), /*#__PURE__*/React.createElement("span", null, darkMode ? lang === "en" ? "Light mode" : "Modo claro" : lang === "en" ? "Dark mode" : "Modo escuro")), onOpenSettings && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
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
    /*#__PURE__*/React.createElement("span", null, lang === "en" ? "AI / API key" : "IA / Chave de API")
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
    /*#__PURE__*/React.createElement("span", null, lang === "en" ? "Backup & restore" : "Backup e restaurar")
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
    /*#__PURE__*/React.createElement("span", null, lang === "en" ? "Privacy & security" : "Privacidade e seguran\xe7a")
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
    /*#__PURE__*/React.createElement("span", null, lang === "en" ? "Quick help" : "Ajuda rápida")
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
    /*#__PURE__*/React.createElement("span", null, lang === "en" ? "Sign out" : "Sair da conta")
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
  }, t('dayOf')),
  /*#__PURE__*/React.createElement("button", {
    "data-tutorial": "day-type",
    onClick: () => setTrainingByDate(prev => ({ ...prev, [viewDate]: !isTraining })),
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
    }, isTraining ? t('trainDay') : t('restDay'))
  ), currentWeight && /*#__PURE__*/React.createElement("button", {
    onClick: () => openTab("metricas"),
    title: lang === 'en' ? "Open metrics" : "Abrir métricas",
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
  }, currentWeight, "kg", bmi ? ` · ${t('bmi')} ${bmi}` : ""))), tab === "diario" && /*#__PURE__*/React.createElement("div", {
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
  }, label))), tab === "diario" && isMobileView && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface)",
      color: "var(--faint)",
      fontSize: 11,
      textAlign: "center",
      padding: "4px 0 0",
      letterSpacing: 1,
      textTransform: "uppercase"
    }
  }, lang === 'en' ? "Swipe tabs sideways" : "Deslize as abas para os lados"), /*#__PURE__*/React.createElement("div", {
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
    style: {
      display: tab === "diario" ? "flex" : "none",
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      order: 5
    }
  }, [{
    label: t('protein'),
    val: tot.protein,
    goal: goals.protein,
    color: proteinColor,
    unit: "g"
  }, {
    label: t('calories'),
    val: tot.kcal,
    goal: goals.kcal,
    color: caloriesColor,
    unit: t('kcalUnit')
  }].map(({
    label,
    val,
    goal,
    color,
    unit
  }) => /*#__PURE__*/React.createElement("div", {
    key: label,
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
  }, lang==='en'?'goal ':'meta ', goal, unit), label === t('protein') && remainProtein > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 13,
      color: proteinColor
    }
  }, lang === 'en' ? "Missing " : "Faltam ", /*#__PURE__*/React.createElement("b", null, remainProtein, "g"), lang === 'en' ? " protein" : " prote\xEDna"), label === t('calories') && remainKcal > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 13,
      color: caloriesColor
    }
  }, lang === 'en' ? "Missing " : "Faltam ", /*#__PURE__*/React.createElement("b", null, remainKcal), " kcal"))))), /*#__PURE__*/React.createElement("div", {
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
  }, gaRunning || suggestLoading ? t('suggesting') : t('suggestBtn')), showGA && /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "Meal suggestions" : "Sugestões de refeição"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--dim)",
      marginTop: 4
    }
  }, lang === 'en' ? "Choose parameters and generate combinations from your pantry." : "Escolha os parâmetros e gere combinações com a despensa.")), /*#__PURE__*/React.createElement("button", {
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
  }, lang === 'en' ? "Meal size" : "Tamanho"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 6,
      marginTop: 4
    }
  }, [[-20, lang === 'en' ? "Light" : "Leve"], [0, lang === 'en' ? "Balanced" : "Equilibrada"], [20, lang === 'en' ? "Reinforced" : "Reforçada"]].map(([value, label]) => /*#__PURE__*/React.createElement("button", {
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
  }, lang === 'en' ? "Target meal" : "Refeição alvo"), /*#__PURE__*/React.createElement("select", {
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
  }), /*#__PURE__*/React.createElement("span", null, lang === 'en' ? "Use all pantry foods automatically." : "Usar todos os alimentos da despensa automaticamente.")), renderMealSuggestionAdvancedControls(), /*#__PURE__*/React.createElement("button", {
    onClick: runGASafely,
    disabled: gaRunning,
    style: {
      ...btn,
      marginTop: 0,
      opacity: gaRunning ? 0.65 : 1
    }
  }, gaRunning ? (lang === 'en' ? "Searching... " : "Buscando... ") + gaProgress + "%" : (lang === 'en' ? "Find suggestions" : "Buscar sugestões")), gaRunning && /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "No combination matched these criteria. Try relaxing the limits or using more pantry foods." : "Nenhuma combinação encontrou esses critérios. Tente flexibilizar os limites ou usar mais alimentos da despensa.")), /*#__PURE__*/React.createElement("div", {
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
  }, /*#__PURE__*/React.createElement("span", null, lang === 'en' ? "NUTRIENTS" : "NUTRIENTES"), /*#__PURE__*/React.createElement("span", null, expandMicros ? "\u25B2" : "\u25BC")), expandMicros && /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: "hidden",
      animation: "softIn 220ms ease-out both"
    }
  }, /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.carbs * 10) / 10,
    max: goals.carbs,
    color: "#a96ec8",
    label: t('carbs'),
    unit: "g"
  }), tot.sugars > 0 && /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.sugars * 10) / 10,
    max: 0,
    color: "#a96ec8",
    label: t('sugars'),
    unit: "g",
    sub: true
  }), /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.fat * 10) / 10,
    max: goals.fat,
    color: "#c86e8e",
    label: t('fat'),
    unit: "g"
  }), tot.satfat > 0 && /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.satfat * 10) / 10,
    max: 20,
    color: "#c86e8e",
    label: t('satfat'),
    unit: "g",
    sub: true
  }), /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.fiber * 10) / 10,
    max: goals.fiber,
    color: "#6ec8a9",
    label: t('fiber'),
    unit: "g"
  }), /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.salt * 100) / 100,
    max: goals.salt,
    color: "#888",
    label: t('salt'),
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
  }, /*#__PURE__*/React.createElement("span", null, t('microLabel')), /*#__PURE__*/React.createElement("span", null, expandMicros ? "v" : ">")), expandMicros && /*#__PURE__*/React.createElement("div", {
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
  }, label))), tab !== "diario" && isMobileView && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface)",
      color: "var(--faint)",
      fontSize: 11,
      textAlign: "center",
      padding: "4px 0 6px",
      letterSpacing: 1,
      textTransform: "uppercase",
      borderBottom: "1px solid var(--border3)",
      order: 2
    }
   }, lang === 'en' ? "Swipe tabs sideways" : "Deslize as abas para os lados"), tab === "adicionar" && /*#__PURE__*/React.createElement("div", {
    onClick: () => openTab("diario"),
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 840,
      background: "rgba(0,0,0,0.36)",
      backdropFilter: "blur(2px)",
      animation: "softIn 180ms ease-out both"
    }
  }), /*#__PURE__*/React.createElement("div", {
    key: tab,
    style: {
      padding: tab === "adicionar" ? (isMobileView ? "18px 18px calc(22px + env(safe-area-inset-bottom,0px))" : "22px 24px 26px") : "20px clamp(18px, 3vw, 34px) 32px",
      boxSizing: "border-box",
      width: tab === "adicionar" ? (isMobileView ? "100%" : 720) : "100%",
      maxWidth: tab === "adicionar" ? (isMobileView ? "100%" : "calc(100vw - 48px)") : 1180,
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
  }, lang === 'en' ? "Log meal" : "Registrar refeição"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text3)"
    }
  }, lang === 'en' ? "Choose a method and save it to today's diary." : "Escolha um método e salve no diário de hoje.")), /*#__PURE__*/React.createElement("button", {
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
    title: lang === 'en' ? "Show this tab tutorial" : "Ver tutorial desta aba",
    "aria-label": lang === 'en' ? "Show this tab tutorial" : "Ver tutorial desta aba",
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
  }, isMobileView ? "i" : (lang === 'en' ? "i Help" : "i Ajuda"))), tab === "diario" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
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
  }, /*#__PURE__*/React.createElement("span", null, dayProteinPct, "% ", lang === 'en' ? "protein" : "proteína"), /*#__PURE__*/React.createElement("span", null, dayKcalPct, "% kcal"))), /*#__PURE__*/React.createElement("div", {
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
  }, dateLabel(viewDate, lang)), !isToday && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)"
    }
  }, viewDate)), /*#__PURE__*/React.createElement("button", {
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
  }, lang === 'en' ? "Today" : "Hoje")), calendarOpen && /*#__PURE__*/React.createElement("div", {
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
  }, new Date(calendarMonth + "-01T12:00:00").toLocaleDateString(lang === 'en' ? "en-US" : "pt-BR", {month: "long", year: "numeric"})), /*#__PURE__*/React.createElement("button", {
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
  }, (lang === 'en' ? ["S","M","T","W","T","F","S"] : ["D","S","T","Q","Q","S","S"]).map((d, idx) => /*#__PURE__*/React.createElement("div", {
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
    }, marker?.hasData && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: marker.proteinMet ? "#c8a96e" : "var(--border3)"
      }
    }), marker?.hasData && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: marker.kcalOver ? "#cf6679" : marker.kcalGood ? "#66c2c2" : "var(--border3)"
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
    }, legendItem("#c8a96e", lang === 'en' ? "Protein hit" : "Proteína batida"), legendItem("#66c2c2", lang === 'en' ? "Calories in range" : "Calorias na faixa"), legendItem("#cf6679", lang === 'en' ? "High calorie excess" : "Excesso calórico"), legendItem("var(--border3)", lang === 'en' ? "Not hit / no record" : "Não batido / sem registro")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 8,
        fontSize: 12,
        color: "var(--text2)"
      }
    }, [
      [lang === 'en' ? "Logged days" : "Dias registrados", ms.registered],
      [lang === 'en' ? "Protein days" : "Dias com proteína", ms.proteinDays],
      [lang === 'en' ? "Avg kcal" : "Média kcal", ms.avgKcalMonth],
      [lang === 'en' ? "Avg protein" : "Média proteína", ms.avgProteinMonth + "g"],
      [lang === 'en' ? "Excess days" : "Dias com excesso", ms.kcalOverDays]
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
  }, lang === 'en' ? "Loading..." : "Carregando..."))), !isToday && (() => {
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
    }, t('noRecords'));
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
    }, Math.round(p), t('proteinUnit')), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#8ec8c8"
      }
    }, Math.round(k), " kcal"));
  })(), isToday && /*#__PURE__*/React.createElement("div", {
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
    }, t('water')), /*#__PURE__*/React.createElement("div", {
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
  }, "(", viewWeight ? `${isTraining ? 40 : 35}ml/kg` : lang === 'en' ? 'default' : 'padrão', ")"), /*#__PURE__*/React.createElement("button", {
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
    placeholder: t('currentGoal') + ' ' + goals.water + 'ml',
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
    title: lang === "en" ? "Custom bottle size. Double-click to edit." : "Medida personalizada. Clique duas vezes para editar.",
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
    title: lang === "en" ? "Save a custom quick amount" : "Salvar uma medida rápida personalizada",
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
    placeholder: lang === 'en' ? 'other value in ml' : 'outro valor em ml',
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
  }, ` ${t('suppTitle')}`)), suppLog.map(e => /*#__PURE__*/React.createElement("div", {
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
      style: {
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
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
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
    }, entries.length ? entries.length + " item" + (entries.length !== 1 ? "s" : "") : lang === 'en' ? "No food logged" : "Sem alimentos registrados")), /*#__PURE__*/React.createElement("div", {
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
    }, Math.round(mp), "g ", lang === 'en' ? "protein" : "prot."), /*#__PURE__*/React.createElement("div", {
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
    }, "+ ", lang === 'en' ? "Add" : "Adicionar"))), entries.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--faint)",
        fontSize: 13,
        paddingTop: 10,
        lineHeight: 1.4
      }
    }, lang === 'en' ? "Use + Add to log something here." : "Use + Adicionar para registrar algo aqui.") : entries.map(e => /*#__PURE__*/React.createElement("div", {
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
    }, [[lang === 'en' ? "Details" : "Detalhes", () => {
      setDetailFood(detailFood === e.id ? null : e.id);
      setEntryMenuId(null);
    }], [lang === 'en' ? "Edit amount" : "Editar quantidade", () => {
      startEditEntry(e);
      setEntryMenuId(null);
    }], [lang === 'en' ? "Duplicate" : "Duplicar", () => duplicateEntry(meal, e)], [lang === 'en' ? "Delete" : "Excluir", () => removeEntry(meal, e.id)]].map(([label, action], idx) => /*#__PURE__*/React.createElement("button", {
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
    }, label))))), detailFood === e.id && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--row)",
        borderRadius: 8,
        padding: "8px 12px",
        margin: "0 0 4px",
        display: "flex",
        flexWrap: "wrap",
        gap: "5px 16px",
        animation: "softIn 180ms ease-out both"
      }
    }, [{
      l: "Carbs",
      v: e.carbs,
      u: "g",
      c: "#a96ec8"
    }, {
      l: lang === 'en' ? 'Sugars' : 'Açúcares',
      v: e.sugars,
      u: "g",
      c: "#a96ec8"
    }, {
      l: lang === 'en' ? 'Fat' : 'Gordura',
      v: e.fat,
      u: "g",
      c: "#c86e8e"
    }, {
      l: "Sat.",
      v: e.satfat,
      u: "g",
      c: "#c86e8e"
    }, {
      l: t('fiber'),
      v: e.fiber,
      u: "g",
      c: "#6ec8a9"
    }, {
      l: t('salt'),
      v: e.salt,
      u: "g",
      c: "#888"
    }, {
      l: "B12",
      v: e.b12,
      u: "mcg",
      c: "#c8c8a9"
    }, {
      l: lang === 'en' ? 'Niacin' : 'Niacina',
      v: e.niacin,
      u: "mg",
      c: "#c8c8a9"
    }, {
      l: lang === 'en' ? 'Phosphorus' : 'Fósforo',
      v: e.phosphorus,
      u: "mg",
      c: "#c8c8a9"
    }, {
      l: lang === 'en' ? 'Calcium' : 'Cálcio',
      v: e.calcium,
      u: "mg",
      c: "#c8c8a9"
    }, {
      l: lang === 'en' ? 'Iron' : 'Ferro',
      v: e.iron,
      u: "mg",
      c: "#c8c8a9"
    }, {
      l: lang === 'en' ? 'Potassium' : 'Potássio',
      v: e.potassium,
      u: "mg",
      c: "#c8c8a9"
    }, {
      l: lang === 'en' ? 'Magnesium' : 'Magnésio',
      v: e.magnesium,
      u: "mg",
      c: "#c8c8a9"
    }, {
      l: lang === 'en' ? 'Zinc' : 'Zinco',
      v: e.zinc,
      u: "mg",
      c: "#c8c8a9"
    }, {
      l: "Vit C",
      v: e.vitc,
      u: "mg",
      c: "#c8c8a9"
    }, {
      l: "Vit D",
      v: e.vitd,
      u: "mcg",
      c: "#c8c8a9"
    }].filter(x => x.v != null && x.v !== 0).map(x => /*#__PURE__*/React.createElement("div", {
      key: x.l,
      style: {
        fontSize: 11
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, x.l, " "), /*#__PURE__*/React.createElement("span", {
      style: {
        color: x.c
      }
    }, x.v % 1 === 0 ? x.v : x.v.toFixed(2), x.u)))))));
  }), false && allEntries.length === 0 && isToday && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center", padding: "32px 16px 16px",
    }
  },
    /*#__PURE__*/React.createElement("div", { style: { fontSize: 40, marginBottom: 12 } }, "\uD83C\uDF7D\uFE0F"),
    /*#__PURE__*/React.createElement("p", { style: {
      color: "var(--text2)", fontSize: 15, fontWeight: 500, margin: "0 0 6px"
    } }, lang === 'en' ? "Nothing logged yet today" : "Nenhum alimento registrado hoje"),
    /*#__PURE__*/React.createElement("p", { style: {
      color: "var(--muted)", fontSize: 14, margin: "0 0 20px", lineHeight: 1.5
    } }, lang === 'en'
      ? "Tap + to add what you've eaten"
      : "Toque em + para registrar o que você comeu"),
    pantry.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--btn-ok)", border: "1px solid var(--btn-ok-border)",
        borderRadius: 12, padding: "14px 16px", marginBottom: 12, textAlign: "left"
      }
    },
      /*#__PURE__*/React.createElement("p", { style: {
        color: "var(--btn-ok-text)", fontSize: 14, margin: "0 0 10px", fontWeight: 500
      } }, "\uD83D\uDCA1 " + (lang === 'en' ? "Tip: Start by adding foods to Foods" : "Dica: Comece adicionando alimentos em Alimentos")),
      /*#__PURE__*/React.createElement("button", {
        onClick: () => setTab("despensa"),
        style: {
          background: "var(--btn-ok-text)", border: "none", color: "#fff",
          borderRadius: 8, padding: "8px 16px", fontSize: 14,
          cursor: "pointer", fontFamily: "inherit", fontWeight: 500
        }
      }, lang === 'en' ? "Go to Foods \u2192" : "Ir para Alimentos \u2192")
    ),
    /*#__PURE__*/React.createElement("button", {
      onClick: () => openAddForMeal(MEALS[0]),
      style: {
        background: "var(--accent, #4a9a4a)", border: "none", color: "#fff",
        borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600,
        cursor: "pointer", fontFamily: "inherit"
      }
    }, lang === 'en' ? "+ Add food" : "+ Adicionar alimento")
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
      /*#__PURE__*/React.createElement("span", { style: lbl }, t('notesTitle')),
      /*#__PURE__*/React.createElement("span", {
        style: { color: "var(--muted)", fontSize: 14, transition: "transform 0.2s",
          display: "inline-block", transform: notesOpen ? "rotate(180deg)" : "rotate(0deg)" }
      }, notesOpen ? "\u25B2" : "\u25BC")
    ),
    notesOpen && /*#__PURE__*/React.createElement("textarea", {
      value: isToday ? todayNote : historyNote,
      onChange: e => isToday ? setTodayNote(e.target.value) : setHistoryNote(e.target.value),
      placeholder: t('notesPlaceholder'),
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
  }, t('suppRegister')), showSuppAdd && /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "\u2014 select \u2014" : "\u2014 selecione \u2014"), suppPantry.map(s => /*#__PURE__*/React.createElement("option", {
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
  }, feedbackLoading && feedbackPeriod === "day" ? t('analyzing') : t('analyzeDayBtn'))), feedbackText && feedbackPeriod === "day" && /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "\u2713 Already saved to notes" : "\u2713 Já salvo nas notas") : /*#__PURE__*/React.createElement("button", {
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
  }, t('savedNote'))),
  
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
  }, t('backupTitle')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      marginBottom: 10
    }
  }, t('backupDesc')), /*#__PURE__*/React.createElement("div", {
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
  }, backupLoading ? t('exportingBackup') : t('exportBackup')), /*#__PURE__*/React.createElement("label", {
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
  }, "\u2191 Importar backup", /*#__PURE__*/React.createElement("input", {
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
  }, t('copyJsonAs'), " ", /*#__PURE__*/React.createElement("code", null, "backup.json"), ":"), /*#__PURE__*/React.createElement("textarea", {
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
      navigator.clipboard.writeText(backupJson).then(() => notify(t('notifCopied'))).catch(() => notify(t('copyManual')));
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
  }, lang === 'en' ? "Copy" : "Copiar"), /*#__PURE__*/React.createElement("button", {
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
  }, "\xD7"))))), tab === "adicionar" && /*#__PURE__*/React.createElement("div", null, mealTemplates.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setAddTemplatesOpen(v => !v),
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
      color: "var(--muted)",
      textTransform: "uppercase"
    }
  }, addTemplatesOpen ? "\u25BE " : "\u25B8 ", lang === 'en' ? "Saved meals" : "Refei\xE7\xF5es salvas", " (", mealTemplates.length, ")")), addTemplatesOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: addTemplateSearch,
    onChange: e => setAddTemplateSearch(e.target.value),
    placeholder: lang === 'en' ? "Search saved meal..." : "Pesquisar refei\xE7\xE3o salva...",
    style: {
      ...inp,
      marginTop: 0
    }
  }), mealTemplates.filter(tmpl => tmpl.name.toLowerCase().includes(addTemplateSearch.trim().toLowerCase())).length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center",
      padding: "10px 0"
    }
  }, lang === 'en' ? "No saved meals found." : "Nenhuma refei\xE7\xE3o salva encontrada.") : mealTemplates.filter(tmpl => tmpl.name.toLowerCase().includes(addTemplateSearch.trim().toLowerCase())).map(tmpl => renderSavedMealCard(tmpl, "add"))))), tab === "adicionar" && /*#__PURE__*/React.createElement("div", {
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
  }, /*#__PURE__*/React.createElement("span", null, t('repeatRecent')), /*#__PURE__*/React.createElement("span", null, showRecentMeals ? "\u25BE" : "\u25B8")), showRecentMeals && /*#__PURE__*/React.createElement("div", {
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
    }, r.date === TODAY ? t('today') : r.date), /*#__PURE__*/React.createElement("div", {
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
  }))), tab === "adicionar" && /*#__PURE__*/React.createElement(React.Fragment, null, showSaveTemplateModal && /*#__PURE__*/React.createElement("div", {
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
      }, lang==='en'?"Save meal template":"Salvar refeição"),
      /*#__PURE__*/React.createElement("p", {
        style:{margin:"0 0 16px",fontSize:13,color:"var(--muted)"}
      }, staged.items.map(i=>i.name).join(", ")),
      /*#__PURE__*/React.createElement("input", {
        type:"text", value:templateName,
        onChange: e => setTemplateName(e.target.value),
        onKeyDown: e => { if(e.key==='Enter'){ saveTemplate(); }},
        placeholder: lang==='en'?"Name (e.g. Pre-workout shake)":"Nome (ex: Shake pré-treino)",
        autoFocus: true,
        style:{...inp,marginBottom:14}
      }),
      /*#__PURE__*/React.createElement("div",{style:{display:"flex",gap:8}},
        /*#__PURE__*/React.createElement("button",{
          onClick:()=>setShowSaveTemplateModal(false),
          style:{flex:1,padding:"10px",borderRadius:8,background:"none",
            border:"1px solid var(--border2)",color:"var(--text2)",
            cursor:"pointer",fontFamily:"inherit",fontSize:13}
        }, lang==='en'?"Cancel":"Cancelar"),
        /*#__PURE__*/React.createElement("button",{
          onClick: saveTemplate,
          disabled: !templateName.trim(),
          style:{flex:2,padding:"10px",borderRadius:8,
            background:templateName.trim()?"var(--btn-ok)":"var(--btn-inactive)",
            border:"none",color:templateName.trim()?"var(--btn-ok-text)":"var(--muted)",
            cursor:templateName.trim()?"pointer":"default",fontFamily:"inherit",
            fontSize:13,fontWeight:600}
        }, lang==='en'?"Save":"Salvar")
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
  }, [["single", t('modeOneByOne')], ["batch", t('modeBatch')], ["describe", t('modeDescribe')]].map(([m, l]) => {
    const active = m === "describe" ? describeMode : !describeMode && (m === "batch" ? batchMode : !batchMode);
    const unavailable = pantry.length === 0 && m !== "describe";
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
    }, m === "describe" ? "\u2726 " + l : l);
  })), describeMode && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
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
  }, t('describeDish')), /*#__PURE__*/React.createElement("textarea", {
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
  }, lang === 'en' ? 'Describe what you ate and approximate amounts. Otherwise describe the context (restaurant, homemade, cafeteria, etc.).' : 'Descreva o que comeste e, se souberes, as quantidades aproximadas. Caso contrário, indica apenas o contexto (refeitório, restaurante, caseiro, etc.).')), /*#__PURE__*/React.createElement("button", {
    onClick: estimateMealDescription,
    disabled: describeLoading,
    style: {
      ...btn,
      ...aiButtonStyle,
      background: describeLoading ? "var(--btn-inactive)" : aiButtonStyle.background,
      color: describeLoading ? "var(--muted)" : aiButtonStyle.color
    }
  }, describeLoading ? t('estimating') : lang === 'en' ? 'Estimate nutritional values' : 'Estimar valores nutricionais'), describeResult && /*#__PURE__*/React.createElement("div", {
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
      color: describeResult.confidence === lang === 'en' ? 'high' : 'alta' ? "#6ec8a9" : describeResult.confidence === lang === 'en' ? 'medium' : 'media' ? "#c8a96e" : "#c86e8e",
      letterSpacing: 1
    }
  }, "confian\xE7a ", describeResult.confidence)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "6px 20px",
      marginBottom: 10
    }
  }, [{
    l: t('protein'),
    v: describeResult.protein,
    u: "g",
    c: "#c8a96e"
  }, {
    l: t('calories'),
    v: describeResult.kcal,
    u: t('kcalUnit'),
    c: "#8ec8c8"
  }, {
    l: "Carbs",
    v: describeResult.carbs,
    u: "g",
    c: "#a96ec8"
  }, {
    l: lang === 'en' ? 'Fat' : 'Gordura',
    v: describeResult.fat,
    u: "g",
    c: "#c86e8e"
  }, {
    l: t('fiber'),
    v: describeResult.fiber,
    u: "g",
    c: "#6ec8a9"
  }, {
    l: t('salt'),
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
  }, describeResult.note), /*#__PURE__*/React.createElement("button", {
    onClick: addDescribedToLog,
    style: btn
  }, "+", lang === 'en' ? ' Add to diary' : ' Adicionar ao diário', " (", mealLabel(describeMeal), ")"))), !describeMode && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
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
    placeholder: t('searchFood'),
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
  }, lang === 'en' ? "Start typing to search your saved foods." : "Comece a digitar para buscar nos alimentos salvos."), selectedFood && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, t('qty') + ' (' + selectedFood.unit + ')'), /*#__PURE__*/React.createElement("input", {
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
  }, t('logToDiary')) : /*#__PURE__*/React.createElement("button", {
    onClick: addToStaged,
    style: {
      ...btn,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "var(--btn-info-text)"
    }
  }, lang === 'en' ? '+ Add to meal' : '+ Adicionar à refeição'), batchMode && /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "Select foods and add them one by one." : "Selecione alimentos e vÁ adicionando.") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
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
  }, Math.round(stagedTot.carbs), "g carbs")), /*#__PURE__*/React.createElement("button", {
    onClick: commitStaged,
    style: {
      ...btn,
      marginTop: 8
    }
  }, lang === 'en' ? "\u2713 Log meal (" : "\u2713 Registrar refeição (", staged.items.length, " item", staged.items.length !== 1 ? "s" : "", ")"),
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
  }, lang === 'en' ? "\uD83D\uDCBE Save as meal template" : "\uD83D\uDCBE Salvar como refeição")), pantry.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      color: "var(--faint)",
      fontSize: 14,
      textAlign: "center",
      fontStyle: "italic"
    }
  }, t('pantryEmpty'))), /*#__PURE__*/React.createElement("div", {
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
  }, t('exportImportTitle')), /*#__PURE__*/React.createElement("div", {
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
  }, lang==='en'?'Full Backup':'Backup Completo'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      marginBottom: 8
    }
  }, "Exporta todos os dados para migrar para o site do GitHub."), /*#__PURE__*/React.createElement("button", {
    onClick: exportFullBackup,
    disabled: backupLoading,
    style: {
      ...sBtn("var(--btn-ok)", "var(--btn-ok-border)", "#7ec87e"),
      marginBottom: 0
    }
  }, backupLoading ? t('exportingBackup') : lang === 'en' ? 'Generate Full Backup' : 'Gerar Backup Completo'), backupJson && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      marginBottom: 4
    }
  }, t('copyJson')), /*#__PURE__*/React.createElement("textarea", {
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
      navigator.clipboard.writeText(backupJson).then(() => notify(t('notifCopied'))).catch(() => notify(t('selectCopyManual')));
    },
    style: {
      ...sBtn("var(--btn-teal)", "var(--btn-teal-border)", "#7ec8c8"),
      marginTop: 4,
      width: "100%"
    }
  }, lang === 'en' ? "Copy JSON" : "Copiar JSON"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowExportPanel(showExportPanel === "day" ? null : "day"),
    style: sBtn("var(--btn-ok)", "var(--btn-ok-border)", "#7ec87e")
  }, "\u2193 Exportar dia"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowExportPanel(showExportPanel === "week" ? null : "week"),
    style: sBtn("var(--btn-info)", "var(--btn-info-border)", "#7e7ec8")
  }, "\u2193 Exportar semana"), /*#__PURE__*/React.createElement("label", {
    style: sBtnLbl("var(--btn-teal)", "var(--btn-teal-border)", "var(--btn-teal-text)")
  }, "\u2191 Importar refei\xE7\xF5es", /*#__PURE__*/React.createElement("input", {
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
    placeholder: lang === 'en' ? "Search food by name" : "Pesquisar alimento pelo nome",
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
  }, lang === 'en' ? "Select foods to include:" : "Selecione os alimentos a incluir:"), (() => {
    const q = gaFoodSearch.trim().toLowerCase();
    const foods = pantry.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", lang === 'en' ? "en" : "pt", {sensitivity: "base"})).filter(f => !q || (f.name || "").toLowerCase().includes(q));
    if (!foods.length) return /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--muted)",
        fontSize: 12
      }
    }, lang === 'en' ? "No foods found." : "Nenhum alimento encontrado.");
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
  }, (gaAdvancedOpen ? "▼ " : "▶ ") + (lang === 'en' ? "Advanced optional adjustments" : "Ajustes avançados opcionais")), gaAdvancedOpen && /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "Global max units per food" : "Máx. unidades por alimento"), /*#__PURE__*/React.createElement("input", {
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
  }, lang === 'en' ? "Calorie adjustment" : "Ajuste calórico"), /*#__PURE__*/React.createElement("span", {
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
  }, /*#__PURE__*/React.createElement("span", null, lang === 'en' ? "- deficit" : "- déficit"), /*#__PURE__*/React.createElement("span", null, "0%"), /*#__PURE__*/React.createElement("span", null, lang === 'en' ? "+ surplus" : "+ superávit"))), /*#__PURE__*/React.createElement("label", {
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
  }), lang === 'en' ? "Set protein flexibility" : "Definir flexibilidade de proteína"), gaUseProtTol && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      color: "var(--text2)",
      fontSize: 12
    }
  }, (lang === 'en' ? "Protein flexibility: " : "Flexibilidade de proteína: ") + gaProtTolerance + "%"), /*#__PURE__*/React.createElement("input", {
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
  }, lang === 'en' ? "Absolute limits (optional)" : "Limites absolutos (opcional)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "repeat(2, minmax(0, 1fr))",
      gap: 8
    }
  }, [{
    key: "kmin",
    label: lang === 'en' ? "Min calories" : "Calorias mín.",
    unit: "kcal",
    value: gaKcalMin,
    set: setGAKcalMin,
    ph: lang === 'en' ? "auto: no minimum" : "auto: sem mínimo"
  }, {
    key: "kmax",
    label: lang === 'en' ? "Max calories" : "Calorias máx.",
    unit: "kcal",
    value: gaKcalMax,
    set: setGAKcalMax,
    ph: "auto: " + Math.round(Math.max(50, (goals.kcal || 2000) - Object.values(activeLog).flat().reduce((s, e) => s + (e.kcal || 0), 0)) * (1 + gaTolerance / 100)) + " kcal"
  }, {
    key: "pmin",
    label: lang === 'en' ? "Min protein" : "Proteína mín.",
    unit: "g",
    value: gaProtMin,
    set: setGAProtMin,
    ph: "auto: aprox. " + Math.round(Math.max(10, (goals.protein || 150) - Object.values(activeLog).flat().reduce((s, e) => s + (e.protein || 0), 0)) * 0.5) + "g"
  }, {
    key: "pmax",
    label: lang === 'en' ? "Max protein" : "Proteína máx.",
    unit: "g",
    value: gaProtMax,
    set: setGAProtMax,
    ph: "auto: aprox. " + Math.round(Math.max(10, (goals.protein || 150) - Object.values(activeLog).flat().reduce((s, e) => s + (e.protein || 0), 0)) * 1.5) + "g"
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
  }, "\u2191 Importar dia", /*#__PURE__*/React.createElement("input", {
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
  }, "Formato \u2014 ", showExportPanel === "day" ? "dia " + viewDate : "últimos 7 dias"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6
    }
  }, [["json", "JSON", lang === 'en' ? 'full data' : 'dados completos'], ["csv", "CSV", lang === 'en' ? 'for Excel' : 'para Excel'], ["html", "HTML", lang === 'en' ? 'web report' : 'relatório web'], ["txt", "TXT", "texto simples"]].map(([fmt, label, desc]) => /*#__PURE__*/React.createElement("button", {
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
      }).catch(() => notify(t('selectCopyManual')));
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
  }, exportResult.copied ? (lang === 'en' ? "Copied!" : "Copiado!") : (lang === 'en' ? "Copy to clipboard" : "Copiar para área de transferência")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--dim)",
      marginTop: 6,
      textAlign: "center"
    }
  }, lang === 'en' ? "Paste into a text editor and save as " : "Cole em um editor de texto e salve como ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--muted)"
    }
  }, exportResult.filename))))))), tab === "despensa" && /*#__PURE__*/React.createElement("div", {
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
    placeholder: t('pantrySearch'),
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
  }, newFoodOpen ? (lang === 'en' ? "Close form" : "Fechar cadastro") : (lang === 'en' ? "+ New food" : "+ Novo alimento"))), newFoodOpen && /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "New food" : "Novo alimento"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text3)"
    }
  }, lang === 'en' ? "Save food macros to reuse in meals." : "Cadastre macros para reutilizar nas refeições.")), /*#__PURE__*/React.createElement("button", {
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
  }, t('foodName')), /*#__PURE__*/React.createElement("input", {
    value: form.name,
    onChange: e => setForm(f => ({
      ...f,
      name: e.target.value
    })),
    placeholder: t('foodNamePh'),
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 90
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, t('unit')), /*#__PURE__*/React.createElement("select", {
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
  }, lang === 'en' ? "Register by unit" : "Cadastrar por unidade"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      lineHeight: 1.4
    }
  }, lang === 'en'
    ? "Use this for breads, bars, cookies and similar items when the label gives values per 100g and you know the average unit weight."
    : "Use para pães, barras, bolachas e itens parecidos quando a tabela informa valores por 100g e você sabe o peso médio da unidade.")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setForm(f => ({...f, unit: "un"})),
    style: sBtn(form.unit === "un" ? "transparent" : "var(--btn-info)", form.unit === "un" ? "var(--btn-ok-border)" : "var(--btn-info-border)", form.unit === "un" ? "var(--btn-ok-text)" : "var(--btn-info-text)")
  }, form.unit === "un" ? (lang === 'en' ? "Active" : "Ativo") : (lang === 'en' ? "Use units" : "Usar unidades"))), /*#__PURE__*/React.createElement("button", {
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
  }, lang === 'en' ? "Scan barcode" : "Ler c\xF3digo de barras"), barcodeModalOpen && /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "Barcode lookup" : "Buscar por c\xF3digo de barras"), /*#__PURE__*/React.createElement("button", {
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
  }, barcodeScanning ? (lang === 'en' ? "Stop camera" : "Parar c\xE2mera") : (lang === 'en' ? "Use camera" : "Usar c\xE2mera")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: barcodeInput,
    onChange: e => setBarcodeInput(e.target.value.replace(/\D/g, "")),
    inputMode: "numeric",
    placeholder: lang === 'en' ? "Barcode number" : "N\xFAmero do c\xF3digo",
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
  }, barcodeLoading ? (lang === 'en' ? "Searching" : "Buscando") : (lang === 'en' ? "Search" : "Buscar"))), barcodeMessage && /*#__PURE__*/React.createElement("div", {
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
  }, foodDbLoading ? (lang === 'en' ? "Searching database..." : "Buscando na base...") : (lang === 'en' ? "Search nutrition database" : "Buscar na base nutricional")), /*#__PURE__*/React.createElement("button", {
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
  }, autoFillLoading ? lang === 'en' ? '? Searching...' : '? A pesquisar...' : t('autofillBtn')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 8,
      marginTop: 12
    }
  }, t('macros') + ' (' + (form.unit === 'un' && parseFloat(form.unitWeightG||'0') > 0 ? (lang === 'en' ? 'per 100g \u2192 per unit' : 'por 100g \u2192 por unidade') : portionLabel(form.unit, lang)) + ')' + ((form.unit === 'g' || form.unit === 'ml') && parseFloat(form.portionSize||'100') !== 100 ? ' \u2192 base 100' + form.unit : ''), " "),
  /* Porção base é só para g e ml */
  (form.unit === 'g' || form.unit === 'ml') && /*#__PURE__*/React.createElement("div", {
    style: { marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border2)' }
  },
    /*#__PURE__*/React.createElement("span", { style: { fontSize: 14, color: 'var(--text2)', flex: 1 } },
      lang === 'en' ? 'Values for a portion of:' : 'Valores para uma poro de:'
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
        lang === 'en' ? 'Optional: average unit weight' : 'Opcional: peso médio da unidade'
      ),
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: 'var(--muted)', lineHeight: 1.35, marginTop: 2 } },
        lang === 'en'
          ? 'Fill this only when the label values above are per 100g. The app will save the food as one unit.'
          : 'Preencha apenas quando os valores acima estiverem por 100g. O app salvará o alimento como 1 unidade.'
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
  }, showMicroForm ? t('hideMicro') : t('showMicro')), showMicroForm && /*#__PURE__*/React.createElement("div", {
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
  }, t('savePantry'))), /*#__PURE__*/React.createElement("div", {
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
  }, pantryItemsOpen ? "▼ " : "▶ ", t('pantryTitle'), " (", pantry.length, ")")), /*#__PURE__*/React.createElement("div", {    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    title: lang === 'en' ? "Import foods" : "Importar alimentos",
    style: sBtnLbl("var(--btn-info)", "var(--btn-info-border)", "#7e7ec8", isMobileView ? {
      padding: "5px 7px",
      fontSize: 10,
      letterSpacing: 0.5
    } : {})
  }, isMobileView ? "\u2191" : (lang === 'en' ? "\u2191 Import" : "\u2191 Importar"), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".csv",
    onChange: importCSV,
    style: {
      display: "none"
    }
  })), pantry.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: exportCSV,
    title: lang === 'en' ? "Export foods" : "Exportar alimentos",
    style: sBtn("var(--btn-teal)", "var(--btn-teal-border)", "#7ec8c8", isMobileView ? {
      padding: "5px 7px",
      fontSize: 10,
      letterSpacing: 0.5
    } : {})
  }, isMobileView ? "\u2193" : (lang === 'en' ? "\u2193 Export" : "\u2193 Exportar")))), pantryItemsOpen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    value: pantrySearch,
    onChange: e => setPantrySearch(e.target.value),
    placeholder: t('pantrySearch'),
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
  }, pantrySearch ? t('noResults') : t('pantryEmpty')), sortedPantry.map(f => /*#__PURE__*/React.createElement("div", {
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
  }, t('suppNameLabel')), /*#__PURE__*/React.createElement("input", {
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
  }, t('unit')), /*#__PURE__*/React.createElement("select", {
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
  }, t('macros') + ' (' + portionLabel(editForm.unit, lang) + ')', " "), /*#__PURE__*/React.createElement("div", {
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
  }, t('pantrySave')), /*#__PURE__*/React.createElement("button", {
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
    style: {
      padding: "9px 0",
      display: "flex",
      gap: 10,
      justifyContent: "space-between",
      alignItems: "flex-start",
      flexWrap: isMobileView ? "wrap" : "nowrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 260px",
      minWidth: 0
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
  }, ALL_FIELDS.filter(ff => f[ff.key] != null).map(ff => /*#__PURE__*/React.createElement("span", {
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
    onClick: () => startEdit(f),
    style: {
      background: "none",
      border: "1px solid var(--border2)",
      color: "var(--muted)",
      borderRadius: 4,
      padding: "3px 8px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, t('editItem')), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeFood(f.id),
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
  }, mealTemplatesOpen ? "▼ " : "▶ ", lang === 'en' ? "Saved meals" : "Refei\xE7\xF5es salvas", " (", mealTemplates.length, ")")), mealTemplatesOpen && /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "No saved meals." : "Nenhuma refei\xE7\xE3o salva.") : mealTemplates.map(tmpl => renderSavedMealCard(tmpl, "pantry")))), /*#__PURE__*/React.createElement("div", {
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
  }, suppPantryOpen ? "\u25BE " : "\u25B8 ", `\uD83D\uDC8A ${t('suppPantryTitle')} (${suppPantry.length})`)), /*#__PURE__*/React.createElement("button", {
    onClick: () => { setSuppPantryOpen(true); setShowSuppForm(s => !s); },
    title: showSuppForm ? (lang === 'en' ? "Close supplement form" : "Fechar formulário") : (lang === 'en' ? "Add supplement" : "Adicionar suplemento"),
    style: sBtn("var(--btn-info)", "var(--btn-info-border)", "#9090c8", isMobileView ? {
      padding: "5px 8px",
      fontSize: 10,
      letterSpacing: 0.5,
      whiteSpace: "nowrap"
    } : {})
  }, isMobileView ? (showSuppForm ? "\u25B2" : "+") : showSuppForm ? (lang === 'en' ? "\u25B2 close" : "\u25B2 fechar") : (lang === 'en' ? "+ add" : "+ adicionar"))), suppPantryOpen && showSuppForm && /*#__PURE__*/React.createElement("div", {
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
  }, t('suppNameLabel')), /*#__PURE__*/React.createElement("input", {
    value: suppForm.name,
    onChange: e => setSuppForm(f => ({
      ...f,
      name: e.target.value
    })),
    placeholder: lang === 'en' ? 'e.g. Creatine' : 'ex: Creatina',
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "none"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, t('suppDoseLabel')), /*#__PURE__*/React.createElement("input", {
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
  }, t('unit')), /*#__PURE__*/React.createElement("select", {
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
  }, "Notas (opcional)"), /*#__PURE__*/React.createElement("input", {
    value: suppForm.notes,
    onChange: e => setSuppForm(f => ({
      ...f,
      notes: e.target.value
    })),
    placeholder: "ex: tomar com \xE1gua, em jejum...",
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
  }, lang === 'en' ? "Optional body-composition data. Use it as a trend, not as an exact diagnosis." : "Dados opcionais de composição corporal. Use como tendência, não como diagnóstico exato."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Body fat %" : "Gordura corporal %"), /*#__PURE__*/React.createElement("input", {
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
  }, lang === 'en' ? "Waist (cm)" : "Cintura (cm)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "30",
    step: "0.1",
    value: weightForm.waistCm,
    onChange: e => setWeightForm(f => ({...f, waistCm: e.target.value})),
    placeholder: bodyComposition.latest?.waistCm ? String(bodyComposition.latest.waistCm) : "",
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Muscle mass (kg)" : "Massa muscular (kg)"), /*#__PURE__*/React.createElement("input", {
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
  }, t('suppSave'))), suppPantryOpen && suppPantry.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center",
      padding: "10px 0"
    }
  }, lang === 'en' ? "No supplements added." : "Nenhum suplemento adicionado."), suppPantryOpen && suppPantry.map(s => /*#__PURE__*/React.createElement("div", {
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
    }, t('defaultDose'), " ", s.dose, s.unit, s.notes ? " · " + s.notes : "")), /*#__PURE__*/React.createElement("button", {
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
  }, "\xD7"))))), tab === "semana" && /*#__PURE__*/React.createElement("div", null, weekData.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      color: "var(--faint)",
      fontSize: 14,
      marginTop: 40,
      fontStyle: "italic"
    }
  }, t('loading')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "week-summary",
    style: {
      display: "flex",
      gap: 0,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      margin: "0 16px 16px",
      overflow: "hidden"
    }
  }, [{
    l: t('avgProtein'),
    v: `${avgProtein}g`,
    c: "#c8a96e"
  }, {
    l: t('avgCalories'),
    v: String(avgKcal),
    c: "#8ec8c8"
  }, {
    l: t('daysProtGoal'),
    v: `${daysMetProtein}/${daysWithData.length}`,
    c: "var(--btn-ok-text)"
  }].map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: x.l,
    style: {
      flex: 1,
      padding: "12px 8px",
      textAlign: "center",
      borderRight: i < 2 ? "1px solid var(--border)" : "none"
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
  }, x.l), i === 2 && /*#__PURE__*/React.createElement("div", {
    title: lang === 'en' ? "Protein goal by day" : "Meta de prote\xEDna por dia",
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
  }, lang === 'en' ? "Protein (g) \u2014 last 7 days" : "Prote\xEDna (g) \u2014 \xFAltimos 7 dias"), /*#__PURE__*/React.createElement(ResponsiveContainer, {
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
    formatter: v => [`${v}g`, t('protein')]
  }), weekData[0] && /*#__PURE__*/React.createElement(ReferenceLine, {
    y: weekData[0].proteinGoal,
    stroke: "#c8a96e",
    strokeDasharray: "3 3",
    strokeOpacity: 0.65,
    label: {
      value: (lang === 'en' ? "goal " : "meta ") + weekData[0].proteinGoal + "g",
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
  }, lang === 'en' ? "Calories \u2014 last 7 days" : "Calorias \u2014 \xFAltimos 7 dias"), /*#__PURE__*/React.createElement(ResponsiveContainer, {
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
    formatter: v => [`${v} kcal`, t('calories')]
  }), weekData[0] && /*#__PURE__*/React.createElement(ReferenceLine, {
    y: weekData[0].kcalGoal,
    stroke: "#8ec8c8",
    strokeDasharray: "3 3",
    strokeOpacity: 0.65,
    label: {
      value: (lang === 'en' ? "goal " : "meta ") + weekData[0].kcalGoal + " kcal",
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
  }, lang === 'en' ? 'Click a day to see details' : 'Clica num dia para ver o detalhe'), Object.keys(mealAverages).length > 0 && /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "Meal averages (last 30 days)" : "M\xE9dias por refei\xE7\xE3o (\xFAltimos 30 dias)"), (() => {
    const sorted = Object.entries(mealAverages).sort((a, b) => b[1].avgProtein - a[1].avgProtein);
    const maxProt = sorted[0]?.[1].avgProtein || 1;
    return sorted.map(([meal, d]) => /*#__PURE__*/React.createElement("div", {
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
    }, lang === 'en' ? d.count + " logged day" + (d.count !== 1 ? "s" : "") : d.count + " dia" + (d.count !== 1 ? "s" : "") + " registrado" + (d.count !== 1 ? "s" : ""))), /*#__PURE__*/React.createElement("div", {
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
    }, Math.round(d.avgProtein / goals.protein * 100), lang === 'en' ? "% protein goal" : "% meta prot")), /*#__PURE__*/React.createElement("div", {
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
    }))));
  })())), weekData.some(d => d.hasData) && /*#__PURE__*/React.createElement("div", {
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
  }, [["json", "JSON", lang === 'en' ? 'full data' : 'dados completos'], ["csv", "CSV", lang === 'en' ? 'for Excel' : 'para Excel'], ["html", "HTML", "relatório"], ["txt", "TXT", "texto simples"]].map(([fmt, label, desc]) => /*#__PURE__*/React.createElement("button", {
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
      }).catch(() => notify(t('selectCopyManual')));
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
  }, exportResult.copied ? (lang === 'en' ? "? Copied!" : "? Copiado!") : (lang === 'en' ? " Copy to clipboard" : " Copiar para área de transferência")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      borderTop: "1px solid var(--border3)",
      paddingTop: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: generateFoodPatterns,
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
  }, patternsLoading ? t('analyzingPatterns') : t('aiPatterns')), patternsText && /*#__PURE__*/React.createElement("div", {
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
  }, "Padr\xF5es \u2014 \xFAltimos 30 dias"), /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "\u2713 Saved to notes" : "\u2713 Salvo nas notas") : /*#__PURE__*/React.createElement("button", {
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
  }, t('savedNote'))), weekData.some(d => d.hasData) && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => generateFeedback("week"),
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
  }, feedbackLoading && feedbackPeriod === "week" ? t('analyzing') : t('aiAnalyzeWeek')), feedbackText && feedbackPeriod === "week" && /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "Weekly feedback" : "Feedback semanal"), /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "\u2713 Already saved to notes" : "\u2713 Já salvo nas notas") : /*#__PURE__*/React.createElement("button", {
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
  }, lang === 'en' ? "\uD83D\uDCBE Save to today's notes" : "\uD83D\uDCBE Salvar nas notas de hoje"))))), tab === "metricas" && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "2px 16px 30px",
      boxSizing: "border-box",
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      margin: "8px 0 16px"
    }
  }, [["tracking", lang === 'en' ? "Tracking" : "Acompanhamento"], ["goals", lang === 'en' ? "Goals" : "Metas"]].map(([key, label]) => /*#__PURE__*/React.createElement("button", {
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
      borderRadius: 8,
      padding: "14px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 6
    }
  }, lang === 'en' ? "Nutrition profile" : "Perfil nutricional"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--dim)",
      lineHeight: 1.45,
      marginBottom: 12
    }
  }, lang === 'en' ? "Configure the activity, goal, body-fat target, calorie adjustment, and custom targets used by the app." : "Configure atividade, objetivo, meta de gordura, ajuste calórico e metas personalizadas usadas pelo app."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "repeat(3, minmax(180px, 1fr))",
      gap: 10,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Physical activity" : "Atividade física"), /*#__PURE__*/React.createElement("select", {
    value: nutritionPrefs.activityLevel || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, activityLevel: e.target.value}),
    style: inp
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, lang === 'en' ? "Select" : "Selecionar"), Object.entries(ACTIVITY_LEVELS).map(([key, data]) => /*#__PURE__*/React.createElement("option", {
    key,
    value: key
  }, lang === 'en' ? data.en + " - " + data.descEn : data.pt + " - " + data.descPt)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Goal" : "Objetivo"), /*#__PURE__*/React.createElement("select", {
    value: nutritionPrefs.goalType || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, goalType: e.target.value}),
    style: inp
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, lang === 'en' ? "Select" : "Selecionar"), /*#__PURE__*/React.createElement("option", {
    value: "maintenance"
  }, lang === 'en' ? "Maintenance" : "Manutenção"), /*#__PURE__*/React.createElement("option", {
    value: "loss"
  }, lang === 'en' ? "Weight loss" : "Perda de peso"), /*#__PURE__*/React.createElement("option", {
    value: "gain"
  }, lang === 'en' ? "Weight gain" : "Ganho de peso"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Profile height (cm)" : "Altura do perfil (cm)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "80",
    max: "240",
    step: "0.1",
    value: profileData.height || "",
    onChange: e => saveProfileHeight(e.target.value),
    placeholder: currentHeight ? String(currentHeight) : t('heightPh'),
    style: inp
  })), nutritionPrefs.goalType === "loss" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Target body fat %" : "Meta de gordura corporal %"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "3",
    max: "60",
    step: "0.1",
    value: nutritionPrefs.bodyFatGoal || "",
    onChange: e => updateBodyFatGoalTarget(e.target.value),
    placeholder: bodyComposition.currentFatPct ? (lang === 'en' ? "below " : "abaixo de ") + (Math.round(bodyComposition.currentFatPct * 10) / 10) : (lang === 'en' ? "e.g. 13" : "ex: 13"),
    style: inp
  }), bodyFatGoalAutoKg && /*#__PURE__*/React.createElement("div", {
    style: { marginTop: 4, color: "var(--muted)", fontSize: 12 }
  }, lang === 'en' ? "Auto estimate: " + bodyFatGoalAutoKg + " kg to lose." : "Estimativa auto: " + bodyFatGoalAutoKg + " kg a perder.")), (nutritionPrefs.goalType === "loss" || nutritionPrefs.goalType === "gain") && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, nutritionPrefs.goalType === "loss" ? (lang === 'en' ? "Kg to lose" : "Kg a perder") : (lang === 'en' ? "Kg to gain" : "Kg a ganhar")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0.1",
    step: "0.1",
    value: nutritionPrefs.goalKg || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, goalKg: e.target.value}),
    placeholder: nutritionPrefs.goalType === "loss" && bodyFatGoalAutoKg ? "auto: " + bodyFatGoalAutoKg : "",
    style: inp
  })), (nutritionPrefs.goalType === "loss" || nutritionPrefs.goalType === "gain") && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Weeks" : "Semanas"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    step: "1",
    value: nutritionPrefs.goalWeeks || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, goalWeeks: e.target.value}),
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Manual adjustment kcal/day" : "Ajuste manual kcal/dia"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: nutritionPrefs.manualAdjustment || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, manualAdjustment: e.target.value}),
    placeholder: "auto: " + getGoalAdjustment(nutritionPrefs),
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Protein g/kg" : "Proteína g/kg"), /*#__PURE__*/React.createElement("input", {
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
    l: lang === 'en' ? "BMR" : "TMB",
    v: (baseGoals.bmr || "-") + " kcal",
    c: "#c8a96e"
  }, {
    l: lang === 'en' ? "Day base" : "Base do dia",
    v: (calorieBase || "-") + " kcal",
    c: "#8ec8c8"
  }, {
    l: lang === 'en' ? "Adjustment" : "Ajuste",
    v: (calorieAdjustment > 0 ? "+" : "") + calorieAdjustment + " kcal",
    c: calorieAdjustment < 0 ? "#c86e8e" : "#6ec8a9"
  }, {
    l: lang === 'en' ? "Final target" : "Meta final",
    v: goals.kcal + " kcal",
    c: "#8ec8c8"
  }, {
    l: lang === 'en' ? "Protein" : "Proteína",
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
  }, t('customGoals')), /*#__PURE__*/React.createElement("button", {
    onClick: editingGoals ? saveGoals : startEditGoals,
    style: sBtn("var(--btn-ok)", "var(--btn-ok-border)", "var(--btn-ok-text)")
  }, editingGoals ? (lang === 'en' ? "Save" : "Salvar") : t('editGoals'))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr 1fr" : "repeat(7, minmax(90px, 1fr))",
      gap: 8
    }
  }, [{
    k: "protein",
    l: t('protein'),
    u: "g",
    c: "#c8a96e"
  }, {
    k: "kcal",
    l: t('calories'),
    u: t('kcalUnit'),
    c: "#8ec8c8"
  }, {
    k: "carbs",
    l: t('carbs'),
    u: "g",
    c: "#a96ec8"
  }, {
    k: "fat",
    l: t('fat'),
    u: "g",
    c: "#c86e8e"
  }, {
    k: "fiber",
    l: t('fiber'),
    u: "g",
    c: "#6ec8a9"
  }, {
    k: "salt",
    l: t('salt'),
    u: "g",
    c: "#888"
  }, {
    k: "water",
    l: t('water'),
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
  }, t('logMeasurements')), /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "Weight (kg)" : "Peso (kg)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: weightForm.weight,
    onChange: e => setWeightForm(f => ({
      ...f,
      weight: e.target.value
    })),
    placeholder: currentWeight ? String(currentWeight) : t('weightPh'),
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "none"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Height (cm)" : "Altura (cm)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: weightForm.height,
    onChange: e => setWeightForm(f => ({
      ...f,
      height: e.target.value
    })),
    placeholder: currentHeight ? String(currentHeight) : t('heightPh'),
    style: inp
  }))), /*#__PURE__*/React.createElement("div", {style:{marginTop:8}}, /*#__PURE__*/React.createElement("label", {style:lbl}, lang === 'en' ? "Date" : "Data"), /*#__PURE__*/React.createElement("input", {
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
  }, lang === 'en' ? "Optional body-composition measurements for trend charts and estimates." : "Medidas opcionais de composição corporal para gráficos de tendência e estimativas."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Body fat %" : "Gordura corporal %"), /*#__PURE__*/React.createElement("input", {
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
  }, lang === 'en' ? "Waist (cm)" : "Cintura (cm)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "30",
    step: "0.1",
    value: weightForm.waistCm,
    onChange: e => setWeightForm(f => ({...f, waistCm: e.target.value})),
    placeholder: bodyComposition.latest?.waistCm ? String(bodyComposition.latest.waistCm) : "",
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Muscle mass (kg)" : "Massa muscular (kg)"), /*#__PURE__*/React.createElement("input", {
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
  }, t('suppLogToday'))), currentWeight && /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "metrics-current",
    style: {
      display: metricsSection === "tracking" ? "block" : "none",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "14px 16px",
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
  }, lang === 'en' ? "Current metrics" : "Métricas atuais"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "12px 24px"
    }
  }, [{
    l: t('weight'),
    v: `${currentWeight} kg`,
    c: "#c8a96e"
  }, {
    l: t('heightLabel'),
    hide: true,
    v: currentHeight ? `${currentHeight} cm` : "—",
    c: "#8ec8c8"
  }, {
    l: "IMC",
    v: bmi || "—",
    c: bmiNum < 18.5 ? "#c86e8e" : bmiNum < 25 ? "#6ec8a9" : bmiNum < 30 ? "#c8a96e" : "#c86e8e"
  }, {
    l: t('goalProtTrain'),
    hide: true,
    v: `${computeGoals(currentWeight, true, {height: currentHeight, birthDate: profileData.birthDate, gender: profileData.gender, prefs: nutritionPrefs}).protein}g`,
    c: "#c8a96e"
  }, {
    l: t('goalProtRest'),
    hide: true,
    v: `${computeGoals(currentWeight, false, {height: currentHeight, birthDate: profileData.birthDate, gender: profileData.gender, prefs: nutritionPrefs}).protein}g`,
    c: "#a9c8a9"
  }, {
    l: t('goalKcalTrain'),
    hide: true,
    v: String(computeGoals(currentWeight, true, {height: currentHeight, birthDate: profileData.birthDate, gender: profileData.gender, prefs: nutritionPrefs}).kcal),
    c: "#8ec8c8"
  }, {
    l: t('goalKcalRest'),
    hide: true,
    v: String(computeGoals(currentWeight, false, {height: currentHeight, birthDate: profileData.birthDate, gender: profileData.gender, prefs: nutritionPrefs}).kcal),
    c: "#8ec8a9"
  }].filter(x => !x.hide).map(x => /*#__PURE__*/React.createElement("div", {
    key: x.l
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      letterSpacing: 1
    }
  }, x.l.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: x.c,
      marginTop: 2
    }
  }, x.v)))), bmi && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      fontSize: 14,
      color: "var(--muted)"
    }
  }, t('bmi')+' ', bmi, " \u2014 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: bmiNum < 18.5 ? "#c86e8e" : bmiNum < 25 ? "#6ec8a9" : bmiNum < 30 ? "#c8a96e" : "#c86e8e"
    }
  }, bmiNum < 18.5 ? t('bmiUnderweight') : bmiNum < 25 ? t('bmiNormal') : bmiNum < 30 ? t('bmiOverweight') : t('bmiObese')))), weightChartData.length > 1 && /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "weight-chart",
    style: {
      display: metricsSection === "tracking" ? "block" : "none",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "14px",
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
  }, lang === 'en' ? "Weight trend" : "Evolução do peso"), /*#__PURE__*/React.createElement(ResponsiveContainer, {
    width: "100%",
    height: 150
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
  }, lang === 'en' ? "History" : "Histórico"), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: "auto",
      maxHeight: 285,
      borderTop: "1px solid var(--border3)",
      borderBottom: "1px solid var(--border3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
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
  }, [lang === 'en' ? "Date" : "Data", lang === 'en' ? "Weight" : "Peso", t('bmi'), lang === 'en' ? "Fat" : "Gordura", lang === 'en' ? "Muscle" : "Músculo", lang === 'en' ? "Waist" : "Cintura", lang === 'en' ? "Protein" : "Proteína", ""].map(label => /*#__PURE__*/React.createElement("span", {
    key: label || "actions"
  }, label))), [...normalizeWeightHistory(weightHistory)].reverse().map(e => {
    const bE = e.height ? (e.weight / (e.height / 100) ** 2).toFixed(1) : null;
    const isEd = editingWeightId === e.date;
    return /*#__PURE__*/React.createElement("div", {
      key: e.date,
      style: {
        borderBottom: "1px solid var(--border3)",
        padding: "0 6px"
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
    }, lang === 'en' ? "Date" : "Data"), /*#__PURE__*/React.createElement("input", {
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
    }, lang === 'en' ? "Weight (kg)" : "Peso (kg)"), /*#__PURE__*/React.createElement("input", {
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
    }, lang === 'en' ? "Height (cm)" : "Altura (cm)"), /*#__PURE__*/React.createElement("input", {
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
    }, [["bodyFatPct", lang === 'en' ? "Body fat %" : "Gordura %"], ["waistCm", lang === 'en' ? "Waist (cm)" : "Cintura (cm)"], ["muscleMassKg", lang === 'en' ? "Muscle mass (kg)" : "Massa muscular (kg)"]].map(([key, label]) => /*#__PURE__*/React.createElement("div", {
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
    }, lang === 'en' ? "Save" : "Salvar"), /*#__PURE__*/React.createElement("button", {
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
    }, lang === 'en' ? "Cancel" : "Cancelar"))) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: isMobileView ? "92px 82px 72px 84px 86px 96px 84px 104px" : "1fr 1fr 1fr 1fr 1fr 1fr 1fr 120px",
        gap: 10,
        minWidth: isMobileView ? 740 : 0,
        alignItems: "center",
        padding: "7px 0",
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, formatDateDMY(e.date)), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#c8a96e"
      }
    }, e.weight, " kg"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, bE || "—"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#c86e8e"
      }
    }, e.bodyFatPct ? e.bodyFatPct + "%" : "—"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, e.muscleMassKg ? e.muscleMassKg + " kg" : "—"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, e.waistCm ? e.waistCm + " cm" : "—"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, computeGoals(e.weight, true, {height: e.height || currentHeight, birthDate: profileData.birthDate, gender: profileData.gender, prefs: nutritionPrefs}).protein, " g"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => startEditWeight(e),
      style: {
        background: "none",
        border: "1px solid var(--border2)",
        color: "var(--muted)",
        borderRadius: 4,
        padding: "2px 7px",
        fontSize: 14,
        cursor: "pointer"
      }
    }, t('editItem')), /*#__PURE__*/React.createElement("button", {
      onClick: () => setWeightHistory(h => h.filter(x => x.date !== e.date)),
      style: {
        background: "none",
        border: "none",
        color: "var(--faint)",
        cursor: "pointer",
        fontSize: 14
      }
    }, "\xD7"))));
  }))), weightHistory.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center",
      marginTop: 20
    }
  }, t('noWeightData')), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "body-composition",
    style: {
      display: metricsSection === "tracking" ? "block" : "none",
      marginTop: 20,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "12px 14px"
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
  }, bodyCompositionOpen ? "▼ " : "▶ ", lang === 'en' ? "Body composition" : "Composição corporal"), /*#__PURE__*/React.createElement("div", {
    style: { marginTop: 4, fontSize: 12, color: "var(--dim)", lineHeight: 1.35 }
  }, lang === 'en' ? "Optional measurements for body-fat and waist trends." : "Medidas opcionais para acompanhar gordura corporal e cintura.")), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 12, color: "var(--muted)", flexShrink: 0 }
  }, bodyComposition.measured.length, lang === 'en' ? " records" : " registros"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
      gap: 8
    }
  }, [{
    l: lang === 'en' ? "Body fat" : "Gordura corporal",
    v: bodyComposition.currentFatPct ? (Math.round(bodyComposition.currentFatPct * 10) / 10) + "%" : "—",
    c: "#c86e8e"
  }, {
    l: lang === 'en' ? "Fat mass" : "Gordura em kg",
    v: bodyComposition.fatKg ? (Math.round(bodyComposition.fatKg * 10) / 10) + " kg" : "—",
    c: "#c8a96e"
  }, {
    l: lang === 'en' ? "Lean mass" : "Massa livre",
    v: bodyComposition.leanMassKg ? (Math.round(bodyComposition.leanMassKg * 10) / 10) + " kg" : "—",
    c: "#6ec8a9"
  }, {
    l: lang === 'en' ? "Target weight" : "Peso alvo estimado",
    v: bodyComposition.weightTarget ? (Math.round(bodyComposition.weightTarget * 10) / 10) + " kg" : "—",
    c: "#8ec8c8"
  }].map(card => /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "Body-fat goal" : "Meta por gordura corporal"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Current body fat %" : "Gordura corporal atual %"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "3",
    max: "60",
    step: "0.1",
    value: bodyGoalForm.currentFatPct,
    onChange: e => setBodyGoalForm(f => ({...f, currentFatPct: e.target.value})),
    placeholder: bodyComposition.currentFatPct ? String(Math.round(bodyComposition.currentFatPct * 10) / 10) : (lang === 'en' ? "e.g. 15.2" : "ex: 15,2"),
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Target body fat %" : "Meta de gordura corporal %"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "3",
    max: "60",
    step: "0.1",
    value: bodyGoalForm.targetFatPct,
    onChange: e => setBodyGoalForm(f => ({...f, targetFatPct: e.target.value})),
    placeholder: nutritionPrefs.bodyFatGoal || (lang === 'en' ? "e.g. 13" : "ex: 13"),
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Weeks to target" : "Semanas até a meta"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    step: "1",
    value: bodyGoalForm.weeks,
    onChange: e => setBodyGoalForm(f => ({...f, weeks: e.target.value})),
    placeholder: getSuggestedBodyGoalWeeks() ? String(getSuggestedBodyGoalWeeks()) : (lang === 'en' ? "suggested" : "sugerido"),
    style: inp
  }), getSuggestedBodyGoalWeeks() && /*#__PURE__*/React.createElement("div", {
    style: { color: "var(--muted)", fontSize: 12, lineHeight: 1.35, marginTop: 5 }
  }, lang === 'en'
    ? "Suggested healthy pace: about " + getSuggestedBodyGoalWeeks() + " weeks."
    : "Prazo saudável sugerido: cerca de " + getSuggestedBodyGoalWeeks() + " semanas.")), /*#__PURE__*/React.createElement("button", {
    onClick: saveBodyFatGoal,
    style: { ...btn, marginTop: 4 }
  }, lang === 'en' ? "Save body-fat goal" : "Salvar meta de gordura"), /*#__PURE__*/React.createElement("div", {
    style: { color: "var(--muted)", fontSize: 12, lineHeight: 1.45, marginTop: 6 }
  }, lang === 'en' ? "This syncs the estimated fat to lose and time frame with your nutrition goal." : "Isso sincroniza a gordura estimada a perder e o prazo com sua meta nutricional.")), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }
  }, bodyComposition.fatToLose ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", {
    style: { color: "var(--text2)" }
  }, lang === 'en' ? "Forecast" : "Previsão"), /*#__PURE__*/React.createElement("br", null), lang === 'en'
    ? "Estimated fat to lose: " + (Math.round(bodyComposition.fatToLose * 10) / 10) + " kg."
    : "Gordura estimada a perder: " + (Math.round(bodyComposition.fatToLose * 10) / 10) + " kg.", /*#__PURE__*/React.createElement("div", {
    style: { marginTop: 6, color: "var(--muted)" }
  }, bodyComposition.weeksRemaining
    ? (lang === 'en'
      ? "At the recent fat-mass trend, this would take about " + (Math.round(bodyComposition.weeksRemaining * 10) / 10) + " weeks."
      : "Pela tendência recente de gordura, isso levaria cerca de " + (Math.round(bodyComposition.weeksRemaining * 10) / 10) + " semanas.")
    : (lang === 'en'
      ? "There is not enough aligned body-fat trend yet for a date estimate."
      : "Ainda não há tendência de gordura alinhada suficiente para estimar uma data."))) : (lang === 'en'
    ? "Add body-fat percentage and a target to unlock fat-mass estimates."
    : "Registre gordura corporal e uma meta para liberar estimativas de gordura."), bodyComposition.fatChartData.length > 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      height: 180,
      border: "1px solid var(--border3)",
      borderRadius: 8,
      padding: "8px 8px 2px",
      background: "var(--bg)",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }
  }, lang === 'en' ? "Body-fat evolution" : "Evolução da gordura corporal"), /*#__PURE__*/React.createElement(ResponsiveContainer, {
    width: "100%",
    height: 140
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
    formatter: v => [Math.round(v * 10) / 10 + "%", lang === 'en' ? "Body fat" : "Gordura corporal"]
  }), bodyComposition.targetPct ? /*#__PURE__*/React.createElement(ReferenceLine, {
    y: bodyComposition.targetPct,
    stroke: "#8ec8c8",
    strokeDasharray: "4 4",
    label: { value: lang === 'en' ? "Target" : "Meta", fill: "var(--muted)", fontSize: 11 }
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
      borderRadius: 8,
      padding: "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setMetricsProgressOpen(v => !v),
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
  }, metricsProgressOpen ? "▼ " : "▶ ", lang === 'en' ? "Progress and forecast" : "Progresso e previsão"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      fontSize: 12,
      color: "var(--dim)",
      lineHeight: 1.35
    }
  }, lang === 'en' ? "Rolling view of completed days, excluding today." : "Visão rolante dos dias concluídos, sem contar hoje.")), /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "More info" : "Mais info"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "repeat(5, minmax(130px, 1fr))",
      gap: 8
    }
  }, [{
    l: lang === 'en' ? "Weekly target" : "Meta semanal",
    v: weeklyProgress.plannedWeek ? weeklyProgress.plannedWeek + " kcal" : "—",
    c: "#8ec8c8"
  }, {
    l: lang === 'en' ? "Deficit" : "Déficit",
    v: weeklyProgress.deficit + " kcal",
    c: "#c8a96e"
  }, {
    l: lang === 'en' ? "Surplus" : "Superávit",
    v: weeklyProgress.surplus + " kcal",
    c: "#c86e8e"
  }, {
    l: lang === 'en' ? "Adherence" : "Aderência",
    v: weeklyProgress.plannedWeek ? weeklyProgress.adherence + "%" : "—",
    c: weeklyProgress.adherence >= 80 && weeklyProgress.adherence <= 120 ? "#6ec8a9" : "#c8a96e"
  }, {
    l: lang === 'en' ? "Trend" : "Tendência",
    v: weightTrend.hasEnough ? (weightTrend.weeklyRate > 0 ? "+" : "") + (Math.round(weightTrend.weeklyRate * 100) / 100) + (lang === 'en' ? " kg/wk" : " kg/sem") : "—",
    c: weightTrend.weeklyRate < 0 ? "#6ec8a9" : weightTrend.weeklyRate > 0 ? "#c86e8e" : "var(--muted)"
  }].map(card => /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "How to read these values" : "Como interpretar estes valores"), (lang === 'en' ? [
    ["Weekly target", "The total calorie adjustment planned for the last 7 completed days. It comes from your current objective and does not include today."],
    ["Deficit", "Calories below the estimated maintenance base across completed days. This is mainly useful for weight-loss goals."],
    ["Surplus", "Calories above the estimated maintenance base across completed days. This is mainly useful for weight-gain goals."],
    ["Adherence", "How close the accumulated deficit or surplus is to the planned weekly target. Around 100% means the pace is close to the plan; much lower or higher suggests the pace is slower or faster."],
    ["Trend", "Estimated weekly weight change from recent records. Treat it as a direction signal, because water, glycogen, sodium, and digestion can move weight day to day."]
  ] : [
    ["Meta semanal", "O ajuste calórico total planejado para os últimos 7 dias concluídos. Ele vem do objetivo atual e não inclui hoje."],
    ["Déficit", "Calorias abaixo da base estimada de manutenção nos dias concluídos. É mais útil para objetivos de perda de peso."],
    ["Superávit", "Calorias acima da base estimada de manutenção nos dias concluídos. É mais útil para objetivos de ganho de peso."],
    ["Aderência", "Quão perto o déficit ou superávit acumulado está da meta semanal planejada. Perto de 100% indica um ritmo alinhado ao plano; muito abaixo ou acima sugere ritmo mais lento ou mais rápido."],
    ["Tendência", "Mudança semanal estimada a partir dos registros recentes. Use como sinal de direção, porque Água, glicogênio, sódio e digestão podem alterar o peso no dia a dia."]
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
  }, lang === 'en'
    ? "Use this section as a trend reader, not as a daily judgment. Small deviations are normal."
    : "Use esta seção para ler tendência, não como julgamento diário. Pequenos desvios são normais.")), metricsProgressOpen && /*#__PURE__*/React.createElement("div", {
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
  }, lang === 'en' ? "Weekly balance" : "Saldo semanal"), /*#__PURE__*/React.createElement("br", null), lang === 'en'
    ? "Deficit and surplus are calculated against the estimated maintenance base for each completed day. The weekly target uses your current goal adjustment."
    : "Déficit e superávit são calculados contra a base estimada de manutenção de cada dia concluído. A meta semanal usa o ajuste atual do seu objetivo.", weeklyProgress.days === 0 && /*#__PURE__*/React.createElement("div", {
      style: { marginTop: 8, color: "var(--muted)" }
  }, lang === 'en' ? "Log past days to see this section fill in." : "Registre dias anteriores para preencher esta seção.")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text3)",
      lineHeight: 1.55
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: { color: "var(--text2)" }
  }, lang === 'en' ? "Forecast" : "Previsão"), /*#__PURE__*/React.createElement("br", null), nutritionPrefs.goalType === "maintenance"
    ? (lang === 'en' ? "Forecast is most useful for loss or gain goals." : "A previsão é mais útil para objetivos de perda ou ganho.")
    : weightTrend.weeksRemaining
      ? (lang === 'en'
        ? "At the current weight trend, the planned change would take about " + (Math.round(weightTrend.weeksRemaining * 10) / 10) + " weeks."
        : "No ritmo atual do peso, a mudança planejada levaria cerca de " + (Math.round(weightTrend.weeksRemaining * 10) / 10) + " semanas.")
      : (lang === 'en'
        ? "There is not enough aligned trend yet to estimate an arrival date."
        : "Ainda não há tendência alinhada suficiente para estimar uma data de chegada."), weightTrend.avg14 && /*#__PURE__*/React.createElement("div", {
      style: { marginTop: 8, color: "var(--muted)" }
  }, lang === 'en' ? "14-entry average: " : "Média 14 registros: ", Math.round(weightTrend.avg14 * 10) / 10, " kg")))), renderReportsCard(), false && /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "nutrition-profile",
    style: {
      display: "flex",
      marginTop: 24,
      borderTop: "1px solid var(--border3)",
      paddingTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 12
    }
  }, lang === 'en' ? "Nutrition profile" : "Perfil nutricional"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--dim)",
      marginBottom: 12
    }
  }, lang === 'en' ? "Activity and goal used to calculate calories and protein automatically." : "Atividade e objetivo usados para calcular calorias e proteína automaticamente."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 220px"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Physical activity" : "Atividade física"), /*#__PURE__*/React.createElement("select", {
    value: nutritionPrefs.activityLevel || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, activityLevel: e.target.value}),
    style: inp
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, lang === 'en' ? "Select" : "Selecionar"), Object.entries(ACTIVITY_LEVELS).map(([key, data]) => /*#__PURE__*/React.createElement("option", {
    key,
    value: key
  }, (lang === 'en' ? data.en + " - " + data.descEn : data.pt + " - " + data.descPt)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 220px"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Goal" : "Objetivo"), /*#__PURE__*/React.createElement("select", {
    value: nutritionPrefs.goalType || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, goalType: e.target.value}),
    style: inp
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, lang === 'en' ? "Select" : "Selecionar"), /*#__PURE__*/React.createElement("option", {
    value: "maintenance"
  }, lang === 'en' ? "Maintenance" : "Manutenção"), /*#__PURE__*/React.createElement("option", {
    value: "loss"
  }, lang === 'en' ? "Weight loss" : "Perda de peso"), /*#__PURE__*/React.createElement("option", {
    value: "gain"
  }, lang === 'en' ? "Weight gain" : "Ganho de peso"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 160px"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Profile height (cm)" : "Altura do perfil (cm)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "80",
    max: "240",
    step: "0.1",
    value: profileData.height || "",
    onChange: e => saveProfileHeight(e.target.value),
    placeholder: currentHeight ? String(currentHeight) : t('heightPh'),
    style: inp
  })), (nutritionPrefs.goalType === "loss" || nutritionPrefs.goalType === "gain") && /*#__PURE__*/React.createElement(React.Fragment, null, nutritionPrefs.goalType === "loss" && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 180px"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Target body fat %" : "Meta de gordura corporal %"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "3",
    max: "60",
    step: "0.1",
    value: nutritionPrefs.bodyFatGoal || "",
    onChange: e => updateBodyFatGoalTarget(e.target.value),
    placeholder: bodyComposition.currentFatPct ? (lang === 'en' ? "below " : "abaixo de ") + (Math.round(bodyComposition.currentFatPct * 10) / 10) : (lang === 'en' ? "e.g. 13" : "ex: 13"),
    style: inp
  }), nutritionPrefs.bodyFatGoal && bodyComposition.currentFatPct && /*#__PURE__*/React.createElement("div", {
    style: { color: "var(--muted)", fontSize: 12, lineHeight: 1.35, marginTop: 5 }
  }, bodyFatGoalAutoKg
    ? (lang === 'en'
      ? "Auto estimate: " + bodyFatGoalAutoKg + " kg to lose."
      : "Estimativa auto: " + bodyFatGoalAutoKg + " kg a perder.")
    : (lang === 'en'
      ? "Enter a target below the current body-fat percentage."
      : "Informe uma meta abaixo da gordura corporal atual."))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 160px"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, nutritionPrefs.goalType === "loss" ? (lang === 'en' ? "Kg to lose" : "Kg a perder") : (lang === 'en' ? "Kg to gain" : "Kg a ganhar")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0.1",
    step: "0.1",
    value: nutritionPrefs.goalKg || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, goalKg: e.target.value}),
    placeholder: nutritionPrefs.goalType === "loss" && bodyFatGoalAutoKg ? "auto: " + bodyFatGoalAutoKg : "",
    style: inp
  }), nutritionPrefs.goalType === "loss" && bodyFatGoalAutoKg && /*#__PURE__*/React.createElement("div", {
    style: { color: "var(--muted)", fontSize: 12, lineHeight: 1.35, marginTop: 5 }
  }, "auto: ", bodyFatGoalAutoKg)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 160px"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Weeks" : "Semanas"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    step: "1",
    value: nutritionPrefs.goalWeeks || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, goalWeeks: e.target.value}),
    style: inp
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 220px"
    }  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Manual adjustment kcal/day" : "Ajuste manual kcal/dia"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: nutritionPrefs.manualAdjustment || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, manualAdjustment: e.target.value}),
    placeholder: "auto: " + getGoalAdjustment(nutritionPrefs),
    style: inp
  }), (calorieAdjustmentWarning || healthGuardrails.length > 0) && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: -6,
      padding: "8px 10px",
      border: "1px solid var(--notif-err-border)",
      background: "var(--notif-err-bg)",
      color: "var(--notif-err-text)",
      borderRadius: 6,
      fontSize: 12,
      lineHeight: 1.35
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontWeight: 700, marginBottom: healthGuardrails.length ? 5 : 0 }
  }, calorieAdjustmentWarning || (lang === 'en' ? "Health guardrails" : "Alertas de saúde")), healthGuardrails.map((msg, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx
  }, "• ", msg)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 180px"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Protein g/kg" : "Proteína g/kg"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0.8",
    step: "0.1",
    value: nutritionPrefs.proteinMultiplier || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, proteinMultiplier: e.target.value}),
    placeholder: "auto: " + defaultProteinMultiplier(nutritionPrefs.goalType).toFixed(1),
    style: inp
  }))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "metrics-target-summary",
    className: "nutrition-summary-cards",
    style: {
      flex: "1 1 100%",
      marginTop: 6,
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 10,
      fontSize: 14,
      color: "var(--muted)",
      alignSelf: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("span", null, lang === 'en' ? "BMR: " : "TMB: ", baseGoals.bmr || "-", " kcal"), /*#__PURE__*/React.createElement("span", null, lang === 'en' ? "Day base: " : "Base do dia: ", calorieBase || "-", " kcal"), /*#__PURE__*/React.createElement("span", null, lang === 'en' ? "Goal adjustment: " : "Ajuste do objetivo: ", calorieAdjustment > 0 ? "+" : "", calorieAdjustment, lang === 'en' ? " kcal/day" : " kcal/dia", calorieBase ? " (" + adjustmentPct + "%)" : ""), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--green)",
      fontWeight: 500
    }
  }, lang === 'en' ? "Final target: " : "Meta final: ", goals.kcal, " kcal"), /*#__PURE__*/React.createElement("span", null, lang === 'en' ? "Protein: " : "Proteína: ", viewWeight || "-", "kg x ", Number(proteinMultiplier).toFixed(1), " = ", goals.protein, "g"), aggressiveAdjustment && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--red)",
      flexBasis: "100%"
    }
  }, lang === 'en' ? "High adjustment: review the timeline or use a smaller manual adjustment for a more sustainable target." : "Ajuste alto: revise o prazo ou use um ajuste manual menor para uma meta mais sustentável."))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      borderTop: "1px solid var(--border3)",
      paddingTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase"
    }
  }, t('customGoals')), /*#__PURE__*/React.createElement("button", {
    onClick: editingGoals ? saveGoals : startEditGoals,
    style: sBtn("var(--btn-ok)", "var(--btn-ok-border)", "#7ec87e")
  }, editingGoals ? (lang === 'en' ? "Save" : "Salvar") : t('editGoals'))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--dim)",
      marginBottom: 12
    }
  }, lang === 'en' ? "Leave blank to use the value calculated automatically from your weight. Custom values take priority." : "Deixe em branco para usar o valor calculado automaticamente pelo peso. Os valores personalizados t\xEAm prioridade."), editingGoals ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, [{
    k: "protein",
    l: t('protein'),
    u: "g"
  }, {
    k: "kcal",
    l: t('calories'),
    u: t('kcalUnit')
  }, {
    k: "carbs",
    l: t('carbs'),
    u: "g"
  }, {
    k: "fat",
    l: t('fat'),
    u: "g"
  }, {
    k: "fiber",
    l: t('fiber'),
    u: "g"
  }, {
    k: "salt",
    l: t('salt'),
    u: "g"
  }, {
    k: "water",
    l: t('water'),
    u: "ml"
  }].map(({
    k,
    l,
    u
  }) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      flex: "1 1 calc(50% - 4px)",
      minWidth: 120
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, l, " (", u, ")"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: goalDraft[k] || "",
    onChange: e => setGoalDraft(d => ({
      ...d,
      [k]: e.target.value
    })),
    placeholder: "auto: " + baseGoals[k] || "",
    style: inp
  })))) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "8px 20px"
    }
  }, [{
    k: "protein",
    l: t('protein'),
    u: "g",
    c: "#c8a96e"
  }, {
    k: "kcal",
    l: t('calories'),
    u: t('kcalUnit'),
    c: "#8ec8c8"
  }, {
    k: "carbs",
    l: "Carbs",
    u: "g",
    c: "#a96ec8"
  }, {
    k: "fat",
    l: lang === 'en' ? 'Fat' : 'Gordura',
    u: "g",
    c: "#c86e8e"
  }, {
    k: "fiber",
    l: t('fiber'),
    u: "g",
    c: "#6ec8a9"
  }, {
    k: "salt",
    l: t('salt'),
    u: "g",
    c: "#888"
  }, {
    k: "water",
    l: t('water'),
    u: "ml",
    c: "#6ec8a9"
  }].map(({
    k,
    l,
    u,
    c
  }) => /*#__PURE__*/React.createElement("div", {
    key: k
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      letterSpacing: 1
    }
  }, l.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: customGoals[k] ? "#c8a96e" : c,
      marginTop: 2
    }
  }, goals[k] || baseGoals[k] || "—", u, customGoals[k] && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      marginLeft: 4
    }
  }, "personalizada"))))), Object.keys(customGoals).length > 0 && !editingGoals && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setCustomGoals({});
      notify("Metas repostas para os valores automáticos.");
    },
    style: {
      ...btn,
      marginTop: 12,
      background: "var(--btn-warn)",
      border: "1px solid var(--btn-warn-border)",
      color: "var(--btn-warn-text)",
      fontSize: 14,
      letterSpacing: 1
    }
  }, lang === 'en' ? "Reset automatic targets" : "Repor metas autom\xE1ticas"))), isMobileView && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99950,
      background: "var(--surface)",
      borderTop: "1px solid var(--border2)",
      padding: "8px 10px calc(8px + env(safe-area-inset-bottom, 0px))",
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 8,
      boxShadow: "0 -6px 24px rgba(0,0,0,0.18)"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => openAddForMeal(addEntry.meal || MEALS[0]),
    style: sBtn("var(--btn-ok)", "var(--btn-ok-border)", "var(--btn-ok-text)")
  }, lang === 'en' ? "Log" : "Registrar"), /*#__PURE__*/React.createElement("button", {
    onClick: openMealSuggestions,
    disabled: gaRunning || suggestLoading,
    style: {
      ...sBtn("var(--btn-info)", "var(--btn-info-border)", "var(--btn-info-text)"),
      opacity: gaRunning || suggestLoading ? 0.5 : 1
    }
  }, lang === 'en' ? "Suggest" : "Sugerir"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      changeViewDate(TODAY);
      setTab("diario");
    },
    style: sBtn("transparent", "var(--border2)", "var(--muted)")
  }, lang === 'en' ? "Today" : "Hoje")), reportModalOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 99998,
      background: "rgba(0,0,0,0.62)",
      backdropFilter: "blur(3px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16
    },
    onClick: e => {
      if (e.target === e.currentTarget && !reportLoading) setReportModalOpen(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface)",
      border: "1px solid var(--border2)",
      borderRadius: 10,
      width: "min(560px, 100%)",
      maxHeight: "90vh",
      overflow: "auto",
      padding: 18,
      boxShadow: "0 18px 50px rgba(0,0,0,0.35)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      letterSpacing: 1.5,
      color: "var(--muted)",
      textTransform: "uppercase"
    }
  }, lang === 'en' ? "Generate report" : "Gerar relatório"), /*#__PURE__*/React.createElement("button", {
    onClick: () => !reportLoading && setReportModalOpen(false),
    style: {
      background: "none",
      border: "none",
      color: "var(--muted)",
      fontSize: 24,
      cursor: "pointer"
    }
  }, "\u00D7")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--dim)",
      lineHeight: 1.55,
      marginBottom: 14
    }
  }, lang === 'en' ? "Choose the period and output format. The report opens in a new tab when ready." : "Escolha o período e o formato. O relatório abre em uma nova aba quando estiver pronto."), /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Report type" : "Tipo de relatório"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 8,
      marginBottom: 14
    }
  }, [["day", lang === 'en' ? "Day" : "Dia"], ["week", lang === 'en' ? "Week" : "Semana"], ["month", lang === 'en' ? "Month" : "Mês"], ["full", lang === 'en' ? "Full history" : "Histórico completo"]].map(([value, label]) => /*#__PURE__*/React.createElement("button", {
    key: value,
    onClick: () => setReportType(value),
    disabled: reportLoading,
    style: {
      ...sBtn(reportType === value ? "var(--btn-ok)" : "transparent", reportType === value ? "var(--btn-ok-border)" : "var(--border2)", reportType === value ? "var(--btn-ok-text)" : "var(--muted)"),
      marginTop: 0
    }
  }, label))), /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, lang === 'en' ? "Format" : "Formato"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      marginBottom: 16
    }
  }, [["html", "HTML"], ["pdf", "PDF"]].map(([value, label]) => /*#__PURE__*/React.createElement("button", {
    key: value,
    onClick: () => setReportFormat(value),
    disabled: reportLoading,
    style: {
      ...sBtn(reportFormat === value ? "var(--btn-info)" : "transparent", reportFormat === value ? "var(--btn-info-border)" : "var(--border2)", reportFormat === value ? "var(--btn-info-text)" : "var(--muted)"),
      marginTop: 0
    }
  }, label))), /*#__PURE__*/React.createElement("button", {
    onClick: generateAdvancedReport,
    disabled: reportLoading,
    style: {
      ...btn,
      marginTop: 0,
      opacity: reportLoading ? 0.6 : 1
    }
  }, reportLoading ? (lang === 'en' ? "Generating..." : "Gerando...") : (lang === 'en' ? "Generate" : "Gerar")), reportMessage && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: "10px 12px",
      borderRadius: 6,
      border: "1px solid var(--border2)",
      color: "var(--muted)",
      fontSize: 14,
      lineHeight: 1.45
    }
  }, reportMessage))), barcodeModalOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 99998,
      background: "rgba(0,0,0,0.62)",
      backdropFilter: "blur(3px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16
    },
    onClick: e => {
      if (e.target === e.currentTarget) closeBarcodeModal();
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface)",
      border: "1px solid var(--border2)",
      borderRadius: 14,
      padding: 18,
      width: "100%",
      maxWidth: 430,
      boxShadow: "0 8px 32px rgba(0,0,0,0.42)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: "var(--text)",
      fontWeight: 600
    }
  }, lang === 'en' ? "Barcode scanner" : "Leitor de c\xF3digo de barras"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      marginTop: 3,
      lineHeight: 1.4
    }
  }, lang === 'en' ? "Use the camera when supported, or type the code manually." : "Use a c\xE2mera quando dispon\xEDvel, ou digite o c\xF3digo manualmente.")), /*#__PURE__*/React.createElement("button", {
    onClick: closeBarcodeModal,
    style: {
      background: "none",
      border: "none",
      color: "var(--muted)",
      cursor: "pointer",
      fontSize: 20
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("video", {
    ref: videoRef,
    playsInline: true,
    muted: true,
    style: {
      width: "100%",
      minHeight: 170,
      maxHeight: 240,
      objectFit: "cover",
      borderRadius: 10,
      background: "var(--bg)",
      border: "1px solid var(--border)",
      display: barcodeScanning ? "block" : "none",
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: barcodeScanning ? stopBarcodeScanner : startBarcodeScanner,
    disabled: barcodeLoading,
    style: {
      ...btn,
      background: barcodeScanning ? "var(--btn-warn)" : "var(--btn-ok)",
      border: "1px solid " + (barcodeScanning ? "var(--btn-warn-border)" : "var(--btn-ok-border)"),
      color: barcodeScanning ? "var(--btn-warn-text)" : "var(--btn-ok-text)",
      marginBottom: 10
    }
  }, barcodeScanning ? (lang === 'en' ? "Stop camera" : "Parar c\xE2mera") : (lang === 'en' ? "Use camera" : "Usar c\xE2mera")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: barcodeInput,
    onChange: e => setBarcodeInput(e.target.value.replace(/\D/g, "")),
    inputMode: "numeric",
    placeholder: lang === 'en' ? "Barcode number" : "N\xFAmero do c\xF3digo de barras",
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
      minWidth: 90,
      opacity: barcodeLoading ? 0.6 : 1
    }
  }, barcodeLoading ? (lang === 'en' ? "Searching" : "Buscando") : (lang === 'en' ? "Search" : "Buscar"))), barcodeMessage && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      lineHeight: 1.5,
      background: "var(--surface3)",
      border: "1px solid var(--border3)",
      borderRadius: 8,
      padding: "8px 10px"
    }
  }, barcodeMessage))),
  null)))))));
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
  const isPt = lang === 'pt';
  const [loading, setLoading] = React.useState(null);
  const [importDone, setImportDone] = React.useState('');
  const [downloaded, setDownloaded] = React.useState(null);

  const exportOptions = isPt ? [
    { key:'today',  icon:'', title:'Diário - hoje',        desc:'Refeições e totais do dia atual' },
    { key:'week',   icon:'', title:'últimos 7 dias',        desc:'Histórico da semana com refeições e macros' },
    { key:'month',  icon:'', title:'último mês (30 dias)',  desc:'Histórico do mês com totais diários' },
    { key:'pantry', icon:'', title:'Alimentos',             desc:'Todos os alimentos cadastrados' },
    { key:'weight', icon:'', title:'Histórico de peso',     desc:'Peso e altura registrados' },
    { key:'all',    icon:'', title:'Backup completo',       desc:'Tudo: diário, despensa, peso, metas, Água', highlight:true },
  ] : [
    { key:'today',  icon:'', title:'Diary - today',         desc:'Meals and totals for today' },
    { key:'week',   icon:'', title:'Last 7 days',           desc:'Weekly history with meals and macros' },
    { key:'month',  icon:'', title:'Last 30 days',          desc:'Monthly history with daily totals' },
    { key:'pantry', icon:'', title:'Pantry',                desc:'All registered foods' },
    { key:'weight', icon:'', title:'Weight history',        desc:'Logged weight and height data' },
    { key:'all',    icon:'', title:'Full backup',           desc:'Everything: diary, pantry, weight, goals, water', highlight:true },
  ];

  async function doExport(key) {
    setLoading(key);
    try {
      const d = window._exportData || {};
      const {activeLog, log, TODAY, isTraining, goals, goalHistory, trainingByDate,
             buildDayTotals, normalizeMealKeys, downloadFile, lang, notify,
             weightHistory} = d;
      const today = TODAY || new Date().toISOString().split('T')[0];
      const isPt2 = (lang || 'pt') !== 'en';

      if (key === 'all') {
        if (window._exportFullBackup) await window._exportFullBackup();

      } else if (key === 'today') {
        if (!activeLog || !buildDayTotals) throw new Error(isPt2 ? 'App ainda não está pronto' : 'App not ready');
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
        if (notify) notify(isPt2 ? 'Arquivo baixado!' : 'File downloaded!');

      } else if (key === 'week' || key === 'month') {
        if (!buildDayTotals || !normalizeMealKeys || !downloadFile) throw new Error(isPt2 ? 'App ainda não está pronto' : 'App not ready');
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
        if (notify) notify(isPt2 ? 'Arquivo baixado!' : 'File downloaded!');

      } else if (key === 'pantry') {
        const r = await storage.get('pantry_v2');
        const data = {pantry_v2: r?.value || '[]'};
        downloadFile(JSON.stringify({exportedAt:new Date().toISOString(),type:'pantry',data},null,2),
          'despensa_'+today+'.json', 'application/json');
        if (notify) notify(isPt2 ? 'Arquivo baixado!' : 'File downloaded!');

      } else if (key === 'weight') {
        const whr = await storage.get('weightHistory').catch(()=>null);
        const whData = whr?.value ? JSON.parse(whr.value) : (weightHistory||[]);
        downloadFile(JSON.stringify({exportedAt:new Date().toISOString(),type:'weight',data:{weightHistory:whData}},null,2),
          'peso_'+today+'.json', 'application/json');
        if (notify) notify(isPt2 ? 'Arquivo baixado!' : 'File downloaded!');
      }
      setDownloaded(key);
    } catch(e) {
      console.error('Export error:', e);
      alert((isPt ? 'Erro ao exportar: ' : 'Export error: ') + e.message);
    }
    setLoading(null);
  }

  async function doImport(e) {
    if (window._importFullBackup) {
      try {
        const result = await window._importFullBackup(e);
        if (result?.cancelled) return;
        const count = result?.imported ?? 0;
        setImportDone(isPt
          ? `Importação concluída: ${count} registros. Recarregue a página.`
          : `Import complete: ${count} records. Reload the page.`);
      } catch (error) {
        setImportDone((isPt ? 'Erro ao importar: ' : 'Import error: ') + (error?.message || String(error)));
      }
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
          isPt ? 'Backup e restaurar' : 'Backup & restore'),
        React.createElement('p', {style:{margin:0, fontSize:12, color:'var(--muted)'}},
          isPt ? 'Escolha o que exportar ou importe um arquivo' : 'Choose what to export or import a file')
      )
    ),

    // Export section
    React.createElement('div', {style:{padding:'20px 16px 8px'}},
      React.createElement('p', {style:{
        fontSize:12, fontWeight:600, letterSpacing:1, textTransform:'uppercase',
        color:'var(--muted)', margin:'0 0 12px'
      }}, isPt ? 'Exportar' : 'Export'),
      React.createElement('div', {style:{display:'flex', flexDirection:'column', gap:8}},
        exportOptions.map(opt =>
          React.createElement('button', {
            key: opt.key,
            onClick: () => doExport(opt.key),
            disabled: loading === opt.key,
            style:{
              display:'flex', alignItems:'center', gap:14,
              padding:'14px 16px', borderRadius:12, cursor:'pointer',
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
      }}, isPt ? 'Importar' : 'Import'),
      importDone
        ? React.createElement('div', {style:{
            padding:'14px 16px', borderRadius:12,
            background:'var(--btn-ok)', border:'1px solid var(--btn-ok-border)',
            color:'var(--btn-ok-text)', fontSize:14
          }}, importDone)
        : React.createElement('label', {style:{
            display:'flex', alignItems:'center', gap:14,
            padding:'14px 16px', borderRadius:12, cursor:'pointer',
            background:'var(--surface)', border:'1px dashed var(--border2)'
          }},
            React.createElement('span', {style:{fontSize:24}}, '\uD83D\uDCC2'),
            React.createElement('div', {style:{flex:1}},
              React.createElement('div', {style:{fontSize:14, fontWeight:500, color:'var(--text)'}},
                isPt ? 'Selecionar arquivo .json' : 'Select .json file'),
              React.createElement('div', {style:{fontSize:12, color:'var(--muted)', marginTop:2}},
                isPt ? 'Restaura dados de um backup anterior' : 'Restore data from a previous backup')
            ),
            React.createElement('span', {style:{color:'var(--muted)', fontSize:16}}, '\u2191'),
            React.createElement('input', {type:'file', accept:'.json', onChange:doImport, style:{display:'none'}})
          ),
      React.createElement('p', {style:{
        fontSize:12, color:'var(--muted)', marginTop:10, lineHeight:1.5
      }}, isPt
        ? ' A importação substitui os dados existentes com as mesmas chaves.'
        : ' Import replaces existing data with matching keys.')
    )
  );
}

// Tutorial Overlay
function ReleaseNoticeModal({ lang, onStartTutorial }) {
  const isPt = lang === 'pt';
  const text = isPt
    ? {
        title: "Versão 0.7.5 Beta lançada!",
        body: "Esta versão reorganiza partes importantes do app, melhora o cadastro de alimentos, adiciona relatórios, leitor de código de barras, tutoriais por aba e ajustes de usabilidade. Como muita coisa mudou, vale passar pelo tutorial atualizado.",
        btn: "Ir ao tutorial"
      }
    : {
        title: "Version 0.7.5 Beta is out!",
        body: "This version reorganizes important parts of the app, improves food registration, adds reports, barcode scanning, tab-specific tutorials, and usability refinements. Since a lot changed, it is worth going through the updated tutorial.",
        btn: "Go to tutorial"
      };
  return React.createElement("div", {
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
  const isPt = lang === 'pt';
  const [step, setStep] = React.useState(0);
  const [rect, setRect] = React.useState(null);

  const stepSets = isPt ? {
    main: [
      { title: 'Visão geral', text: 'O app é dividido em abas. Este primeiro guia é curto; cada aba terá uma explicação própria quando você abrir pela primeira vez.', highlight: null },
      { title: 'Diário', text: 'Aqui você acompanha o dia: refeições, água, metas, progresso e sugestões do que comer.', highlight: 'tab-diario' },
      { title: 'Registrar', text: 'Use os botões de adicionar nas refeições para abrir o registro com alimento único, refeição montada ou descrição de prato.', highlight: 'open-log-sheet' },
      { title: 'Alimentos', text: 'Consulte alimentos salvos, crie novos itens, leia códigos de barras, organize refeições salvas e acompanhe suplementos.', highlight: 'tab-despensa' },
      { title: 'Semana', text: 'Veja tendências recentes, gráficos e médias por refeição.', highlight: 'tab-semana' },
      { title: 'Métricas', text: 'Registre medidas, ajuste metas, confira cálculos nutricionais e gere relatórios.', highlight: 'tab-metricas' },
      { title: 'Ajuda por aba', text: 'Em cada aba há um botão discreto com "i". Toque nele para rever o tutorial daquela área.', highlight: null }
    ],
    diario: [
      { title: 'Diário do dia', text: 'Esta aba mostra o que você registrou no dia selecionado e compara com as metas daquele dia.', tab: 'diario', highlight: 'tab-diario' },
      { title: 'Treino ou descanso', text: 'O tipo do dia altera a meta calórica. Use treino para dias ativos e descanso quando quiser aplicar a regra reduzida.', tab: 'diario', highlight: 'day-type' },
      { title: 'Sugerir o que comer', text: 'Este botão combina o que falta nas suas metas com os alimentos salvos para montar sugestões.', tab: 'diario', highlight: 'suggest-meal-button' },
      { title: 'Micronutrientes', text: 'Abra esta área para conferir vitaminas e minerais registrados pelos alimentos do dia.', tab: 'diario', highlight: 'microLabel' }
    ],
    adicionar: [
      { title: 'Adicionar refeições', text: 'Aqui você escolhe como registrar: alimento único, refeição com vários itens ou descrição de prato.', tab: 'adicionar', highlight: 'add-modes' },
      { title: 'Registrar no diário', text: 'Depois de escolher alimento, quantidade e refeição, este botão salva tudo no dia atual.', tab: 'adicionar', highlight: 'add-log-button' }
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
      { title: 'Resumo semanal', text: 'Estes cartões mostram médias e quantos dias ficaram alinhados com a meta de proteína.', tab: 'semana', highlight: 'week-summary' },
      { title: 'Dias da semana', text: 'Toque em um dia para abrir o diário daquele dia e ver os detalhes.', tab: 'semana', highlight: 'week-days' },
      { title: 'Proteína', text: 'Este gráfico mostra a ingestão de proteína e a linha de referência da meta.', tab: 'semana', highlight: 'week-protein-chart' },
      { title: 'Calorias', text: 'Aqui você acompanha a variação calórica recente em relação à meta.', tab: 'semana', highlight: 'week-calories-chart' },
      { title: 'Médias por refeição', text: 'Quando houver dados suficientes, esta área mostra quais refeições concentram mais calorias, proteína e carboidratos.', tab: 'semana', highlight: 'week-meal-averages' }
    ],
    metricas: [
      { title: 'Acompanhamento e metas', text: 'A aba foi dividida em duas áreas: Acompanhamento para olhar a evolução e Metas para configurar objetivos.', tab: 'metricas', highlight: null },
      { title: 'Registro rápido', text: 'Em Acompanhamento, registre peso e medidas opcionais como gordura corporal, cintura e massa muscular. A altura fica como dado de perfil.', tab: 'metricas', highlight: 'metrics-measures' },
      { title: 'Atuais e gráficos', text: 'Veja peso, IMC, composição corporal, evolução do peso e histórico sem misturar isso com configurações.', tab: 'metricas', highlight: 'metrics-current' },
      { title: 'Composição corporal', text: 'Use gordura corporal, cintura e massa muscular como tendência. Esses dados são opcionais e podem variar conforme o método de medição.', tab: 'metricas', highlight: 'body-composition' },
      { title: 'Progresso e previsão', text: 'A seção mostra déficit, superávit, aderência semanal e tendência usando dias concluídos, sem contar o dia atual.', tab: 'metricas', highlight: 'metrics-progress' },
      { title: 'Metas', text: 'Na subárea Metas ficam atividade física, objetivo, meta de gordura, kg a perder, semanas, ajuste calórico, proteína por kg e metas personalizadas.', tab: 'metricas', highlight: 'nutrition-profile' },
      { title: 'Memória de cálculo', text: 'O resumo mostra TMB, base do dia, ajuste do objetivo, meta final e proteína calculada para manter transparência.', tab: 'metricas', highlight: 'metrics-target-summary' },
      { title: 'Relatórios', text: 'Gere relatórios HTML ou PDF para dia, semana, mês ou histórico completo.', tab: 'metricas', highlight: 'advanced-reports' }
    ]
  } : {
    main: [
      { title: 'Overview', text: 'The app is organized into tabs. This first guide is short; each tab has its own tutorial the first time you open it.', highlight: null },
      { title: 'Diary', text: "Track today's meals, water, goals, progress, and food suggestions.", highlight: 'tab-diario' },
      { title: 'Log', text: 'Use the add buttons inside meals to open logging with single food, meal builder, or dish description.', highlight: 'open-log-sheet' },
      { title: 'Foods', text: 'Search saved foods, create new items, scan barcodes, organize saved meals, and track supplements.', highlight: 'tab-despensa' },
      { title: 'Week', text: 'Review recent trends, charts, and meal averages.', highlight: 'tab-semana' },
      { title: 'Metrics', text: 'Log measurements, adjust goals, review nutrition calculations, and generate reports.', highlight: 'tab-metricas' },
      { title: 'Help by tab', text: 'Each tab has a discreet "i" button. Tap it to reopen that tab tutorial.', highlight: null }
    ],
    diario: [
      { title: 'Daily diary', text: "This tab shows what you logged for the selected day and compares it with that day's goals.", tab: 'diario', highlight: 'tab-diario' },
      { title: 'Training or rest', text: 'Day type changes the calorie target. Use training for active days and rest for the reduced-day rule.', tab: 'diario', highlight: 'day-type' },
      { title: 'Suggest what to eat', text: 'This combines what is still missing from your goals with saved foods to create suggestions.', tab: 'diario', highlight: 'suggest-meal-button' },
      { title: 'Micronutrients', text: "Open this area to review vitamins and minerals logged from the day's foods.", tab: 'diario', highlight: 'microLabel' }
    ],
    adicionar: [
      { title: 'Add meals', text: 'Choose how to log: single food, multi-item meal, or dish description.', tab: 'adicionar', highlight: 'add-modes' },
      { title: 'Log to diary', text: 'After choosing food, quantity, and meal, this button saves everything to the current day.', tab: 'adicionar', highlight: 'add-log-button' }
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
      { title: 'Weekly summary', text: 'These cards show averages and how many days aligned with the protein goal.', tab: 'semana', highlight: 'week-summary' },
      { title: 'Week days', text: "Tap a day to open that day's diary and inspect details.", tab: 'semana', highlight: 'week-days' },
      { title: 'Protein', text: 'This chart shows protein intake and the goal reference line.', tab: 'semana', highlight: 'week-protein-chart' },
      { title: 'Calories', text: 'Here you can follow recent calorie variation against the goal.', tab: 'semana', highlight: 'week-calories-chart' },
      { title: 'Meal averages', text: 'When enough data exists, this area shows which meals concentrate more calories, protein, and carbs.', tab: 'semana', highlight: 'week-meal-averages' }
    ],
    metricas: [
      { title: 'Tracking and goals', text: 'The tab is split into two areas: Tracking for progress and Goals for objective settings.', tab: 'metricas', highlight: null },
      { title: 'Quick log', text: 'In Tracking, log weight and optional measurements like body fat, waist, and muscle mass. Height stays as profile data.', tab: 'metricas', highlight: 'metrics-measures' },
      { title: 'Current and charts', text: 'Review weight, BMI, body composition, weight trend, and history without mixing them with settings.', tab: 'metricas', highlight: 'metrics-current' },
      { title: 'Body composition', text: 'Use body fat, waist, and muscle mass as trends. These values are optional and can vary by measurement method.', tab: 'metricas', highlight: 'body-composition' },
      { title: 'Progress and forecast', text: 'This section shows deficit, surplus, weekly adherence, and trend using completed days, excluding today.', tab: 'metricas', highlight: 'metrics-progress' },
      { title: 'Goals', text: 'The Goals area contains activity, objective, body-fat target, kg to lose, weeks, calorie adjustment, protein per kg, and custom goals.', tab: 'metricas', highlight: 'nutrition-profile' },
      { title: 'Calculation memory', text: 'The summary shows BMR, day base, goal adjustment, final target, and calculated protein for transparency.', tab: 'metricas', highlight: 'metrics-target-summary' },
      { title: 'Reports', text: 'Generate HTML or PDF reports for day, week, month, or full history.', tab: 'metricas', highlight: 'advanced-reports' }
    ]
  };
  const steps = stepSets[type] || stepSets.main;

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;
  const doneLabel = current.done || (isPt ? 'Concluir' : 'Done');
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
  const isPt = (lang || 'pt') === 'pt';
  const [birthDate, setBirthDate] = React.useState(profile?.birthDate || '');
  const [gender, setGender] = React.useState(profile?.gender || '');
  const [activityLevel, setActivityLevel] = React.useState(profile?.activityLevel || '');
  const [goalType, setGoalType] = React.useState(profile?.goalType || '');
  const [goalKg, setGoalKg] = React.useState(profile?.goalKg || '');
  const [goalWeeks, setGoalWeeks] = React.useState(profile?.goalWeeks || '');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const S = isPt
    ? {title:'Completar perfil nutricional', text:'Para calcular suas metas, estes dados são obrigatórios.', birth:'Data de nascimento *', gender:'Gênero *', activity:'Atividade física *', goal:'Objetivo *', choose:'Selecionar', male:'Masculino', female:'Feminino', maintenance:'Manutenção do peso', loss:'Perda de peso', gain:'Ganho de peso', kgLoss:'Quantos kg deseja perder?', kgGain:'Quantos kg deseja ganhar?', weeks:'Em quantas semanas?', save:'Salvar e continuar', saving:'Salvando...', err:'Preencha todos os dados obrigatórios.'}
    : {title:'Complete nutrition profile', text:'These details are required to calculate your targets.', birth:'Date of birth *', gender:'Gender *', activity:'Physical activity *', goal:'Goal *', choose:'Select', male:'Male', female:'Female', maintenance:'Weight maintenance', loss:'Weight loss', gain:'Weight gain', kgLoss:'How many kg do you want to lose?', kgGain:'How many kg do you want to gain?', weeks:'In how many weeks?', save:'Save and continue', saving:'Saving...', err:'Fill all required details.'};
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
      if (!hasRequiredProfileData(savedProfile)) {
        throw new Error(isPt ? 'Os dados não foram encontrados depois de salvar.' : 'Saved details could not be read back.');
      }
      setSaving(false);
      onComplete(savedProfile);
    } catch (err) {
      setSaving(false);
      setError((isPt ? 'Não foi possível salvar no banco de dados: ' : 'Could not save to the database: ') + (err?.message || err));
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
        Object.entries(ACTIVITY_LEVELS).map(([key, data]) => React.createElement('option', {key, value:key, style:{background:'#f5f3ef',color:'#252220'}}, (isPt ? data.pt + ' - ' + data.descPt : data.en + ' - ' + data.descEn)))
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
  const [mode, setMode]           = React.useState('login');
  const [email, setEmail]         = React.useState('');
  const [password, setPassword]   = React.useState('');
  const [password2, setPassword2] = React.useState('');
  const [error, setError]         = React.useState('');
  const [resetMessage, setResetMessage] = React.useState('');
  const [loading, setLoading]     = React.useState(false);
  const [resetLoading, setResetLoading] = React.useState(false);
  const [loginLang, setLoginLang] = React.useState(() => localStorage.getItem('appLang') || 'pt');
  const [regWeight, setRegWeight] = React.useState('');
  const [regHeight, setRegHeight] = React.useState('');
  const [regName,   setRegName]   = React.useState('');
  const [regBirthDate, setRegBirthDate] = React.useState('');
  const [regGender, setRegGender] = React.useState('');
  const [loginDark, setLoginDark] = React.useState(() => {
    const saved = localStorage.getItem('appDarkMode');
    return saved !== null ? saved === 'true' : false;
  });
  function toggleLoginDark() {
    setLoginDark(d => {
      const next = !d;
      localStorage.setItem('appDarkMode', String(next));
      return next;
    });
  }
  function toggleLoginLang() { const nl = loginLang==='pt'?'en':'pt'; localStorage.setItem('appLang',nl); setLoginLang(nl); }
  const S = loginLang==='pt'
    ? {title:'Diário Nutricional', login:'Entrar', register:'Criar conta',
       email:'Email', password:'Senha', confirm:'Confirmar senha',
       loginBtn:'Entrar', registerBtn:'Criar conta', processing:'Processando...',
       forgotPassword:'Esqueci minha senha', resetSending:'Enviando...',
       resetSent:'Se existir uma conta com esse e-mail, enviaremos as instruções de recuperação.',
       resetEmailRequired:'Digite seu e-mail para recuperar a senha.',
       tabLogin:'Entrar', tabRegister:'Criar conta',
       ownData:'Cada conta tem seus próprios dados separados.',
       errCredentials:'Email ou senha incorretos.', errPassword:'Senha incorreta.',
       errTooMany:'Muitas tentativas. Tente novamente mais tarde.',
       errExists:'Este email já tem uma conta. Entre.',
       errWeak:'A senha deve ter pelo menos 6 caracteres.',
       errInvalid:'Email inválido.', errMatch:'As senhas não coincidem.',
       errShort:'A senha deve ter pelo menos 6 caracteres.',
       langToggle:'English'}
    : {title:'Nutrition Tracker', login:'Sign in', register:'Create account',
       email:'Email', password:'Password', confirm:'Confirm password',
       loginBtn:'Sign in', registerBtn:'Create account', processing:'Processing...',
       forgotPassword:'Forgot password?', resetSending:'Sending...',
       resetSent:'If an account exists for this email, password recovery instructions will be sent.',
       resetEmailRequired:'Enter your email to recover your password.',
       tabLogin:'Sign in', tabRegister:'Create account',
       ownData:'Each account has its own separate data.',
       errCredentials:'Incorrect email or password.', errPassword:'Incorrect password.',
       errTooMany:'Too many attempts. Try again later.',
       errExists:'This email already has an account. Sign in instead.',
       errWeak:'Password must be at least 6 characters.',
       errInvalid:'Invalid email.', errMatch:"Passwords don't match.",
       errShort:'Password must be at least 6 characters.',
       langToggle:'Português'};

  function friendlyError(msg) {
    if (msg.includes('EMAIL_NOT_FOUND') || msg.includes('INVALID_LOGIN_CREDENTIALS') || msg.includes('INVALID_EMAIL')) return S.errCredentials;
    if (msg.includes('WRONG_PASSWORD'))    return S.errPassword;
    if (msg.includes('TOO_MANY_ATTEMPTS')) return S.errTooMany;
    if (msg.includes('EMAIL_EXISTS'))      return S.errExists;
    if (msg.includes('WEAK_PASSWORD'))     return S.errWeak;
    if (msg.includes('INVALID_EMAIL'))     return S.errInvalid;
    return (loginLang === 'pt' ? 'Erro: ' : 'Error: ') + msg;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResetMessage('');
    if (mode === 'register' && password !== password2) { setError(S.errMatch); return; }
    if (mode === 'register' && password.length < 6)   { setError(S.errShort); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        await fbSignIn(email, password);
        // Check if email is verified
        const verified = await fbCheckEmailVerified().catch(()=>true);
        if (!verified) { onPendingVerification(email); return; }
        onLogin(false);
      } else {
        if (!regName.trim()) { setError(loginLang==='pt'?'O nome é obrigatório.':'Name is required.'); setLoading(false); return; }
        if (!isValidBirthDate(regBirthDate)) { setError(loginLang==='pt'?'A data de nascimento é obrigatória e deve ser válida.':'Date of birth is required and must be valid.'); setLoading(false); return; }
        if (!isValidGender(regGender)) { setError(loginLang==='pt'?'O gênero é obrigatório.':'Gender is required.'); setLoading(false); return; }
        await fbSignUp(email, password);
        localStorage.setItem('fb_email', email);
        // Set displayName so it appears in Firebase email templates
        await fbUpdateProfile(regName.trim()).catch(()=>{});
        // Save initial data
        const today = new Date().toISOString().split('T')[0];
        if (regWeight || regHeight) {
          const entry = { id: Date.now().toString(), date: today,
            weight: regWeight ? parseFloat(regWeight) : null,
            height: regHeight ? parseFloat(regHeight) : null };
          await fbSet('weightHistory', JSON.stringify([entry])).catch(()=>{});
        }
        await fbSet('userName', regName.trim()).catch(()=>{});
        await fbSet('birthDate', regBirthDate).catch(()=>{});
        await fbSet('gender', regGender).catch(()=>{});
        // Send verification email
        await fbSendVerificationEmail().catch(()=>{});
        onPendingVerification(email, regName.trim());
      }
    } catch(err) { setError(friendlyError(err.message)); }
    setLoading(false);
  }

  /**
   * Requests a Firebase password reset email for the current login email.
   * Input: current email field. Output: neutral status message or validation
   * error; the message does not reveal whether an account exists.
   */
  async function handlePasswordReset() {
    const cleanEmail = String(email || "").trim();
    setError('');
    setResetMessage('');
    if (!cleanEmail) {
      setError(S.resetEmailRequired);
      return;
    }
    setResetLoading(true);
    try {
      await fbSendPasswordResetEmail(cleanEmail);
      setResetMessage(S.resetSent);
    } catch (err) {
      if (String(err.message || "").includes("EMAIL_NOT_FOUND")) {
        setResetMessage(S.resetSent);
      } else {
        setError(friendlyError(err.message));
      }
    } finally {
      setResetLoading(false);
    }
  }

  function switchMode(m) { setMode(m); setError(''); setResetMessage(''); setPassword(''); setPassword2(''); }

  const inp = {width:'100%',background:'var(--input)',border:'1px solid var(--border2)',color:'var(--text)',
    padding:'12px 14px',borderRadius:8,fontSize:15,fontFamily:'inherit',
    boxSizing:'border-box',outline:'none',marginBottom:12};

  const tabStyle = (active) => ({
    flex:1, padding:'10px', background:'none', border:'none',
    borderBottom: active ? '2px solid var(--btn-ok-text,#4a9a4a)' : '2px solid var(--border2)',
    color: active ? 'var(--btn-ok-text,#4a9a4a)' : 'var(--muted)', fontSize:11, letterSpacing:1,
    textTransform:'uppercase', cursor:'pointer', fontFamily:'inherit',
    transition:'all 0.2s'
  });

  const loginTheme = loginDark ? {
    '--bg':'#111','--surface':'#161616','--input':'#1e1e1e','--border2':'#2a2a2a',
    '--text':'#e8e0d5','--text3':'#c9bfb0','--muted':'#8a8a8a',
    '--btn-ok':'#1e2e1e','--btn-ok-border':'#3a5a3a','--btn-ok-text':'#7ec87e',
    '--btn-info':'#1a1e2a','--btn-info-border':'#3a3a6a','--btn-info-text':'#8a9ec8',
    '--btn-inactive':'#191919','--btn-warn-text':'#c87e7e'
  } : {
    '--bg':'#f2f1ed','--surface':'#ffffff','--input':'#f5f3ef','--border2':'#b8b4ac',
    '--text':'#252220','--text3':'#3a3733','--muted':'#6a6662',
    '--btn-ok':'#e8f4e8','--btn-ok-border':'#a8cfa8','--btn-ok-text':'#2a6a2a',
    '--btn-info':'#e8eaf4','--btn-info-border':'#a8aed0','--btn-info-text':'#3a4a8a',
    '--btn-inactive':'#ede9e3','--btn-warn-text':'#8a2a2a'
  };

  const loginVars = Object.assign(
    {position:'fixed',inset:0,background:loginDark?'#111':'#f2f1ed',display:'flex',
     alignItems:'center',justifyContent:'center',padding:24,zIndex:99999},
    loginTheme
  );
  return React.createElement('div', {style: loginVars},
    React.createElement('div', {style:{width:'100%',maxWidth:360}},
      React.createElement('div', {style:{display:'flex',justifyContent:'flex-end',gap:8,marginBottom:16}},
        React.createElement('button', {onClick:toggleLoginDark, style:{
          background:'none',border:'1px solid var(--border2)',color:'var(--muted)',borderRadius:6,
          padding:'5px 10px',fontSize:13,cursor:'pointer',fontFamily:'inherit'
        }}, loginDark ? '' : ''),
        React.createElement('button', {onClick:toggleLoginLang, style:{
          background:'none',border:'1px solid var(--border2)',color:'var(--muted)',borderRadius:6,
          padding:'5px 10px',fontSize:11,cursor:'pointer',fontFamily:'inherit'
        }}, S.langToggle)
      ),
      React.createElement('div', {style:{textAlign:'center',marginBottom:32}},
        React.createElement('div', {style:{fontSize:11,letterSpacing:1,color:'var(--muted)',textTransform:'uppercase',marginBottom:6}}, S.title),
        React.createElement('div', {style:{fontSize:22,color:'var(--text3)',fontWeight: 400,marginBottom:8}},
          mode === 'login' ? S.login : S.register),
        mode === 'login' && React.createElement('p', {style:{
          fontSize:13, color:'var(--muted)', margin:0, lineHeight:1.5
        }}, loginLang==='pt'
          ? 'Acompanhe sua nutrição diária e alcance seus objetivos'
          : 'Track your daily nutrition and reach your goals')
      ),
      React.createElement('div', {style:{display:'flex',marginBottom:28,borderBottom:'2px solid var(--border2)'}},
        React.createElement('button', {onClick:()=>switchMode('login'),  style:tabStyle(mode==='login')},  S.tabLogin),
        React.createElement('button', {onClick:()=>switchMode('register'),style:tabStyle(mode==='register')}, S.tabRegister)
      ),
      React.createElement('form', {onSubmit:handleSubmit},
        React.createElement('input', {
          type:'email', value:email, onChange:e=>setEmail(e.target.value),
          placeholder:S.email, required:true, style:inp, autoComplete:'email'
        }),
        React.createElement('input', {
          type:'password', value:password, onChange:e=>setPassword(e.target.value),
          placeholder:S.password, required:true,
          style:{...inp, marginBottom: mode==='register'?12:error?8:20},
          autoComplete: mode==='login'?'current-password':'new-password'
        }),
        mode === 'login' && React.createElement('button', {
          type:'button',
          onClick:handlePasswordReset,
          disabled:resetLoading || loading,
          style:{
            width:'100%',
            background:'none',
            border:'none',
            color:'var(--btn-info-text)',
            cursor:(resetLoading || loading)?'default':'pointer',
            fontSize:12,
            fontFamily:'inherit',
            textAlign:'right',
            padding:'0 2px 14px',
            opacity:(resetLoading || loading)?0.65:1
          }
        }, resetLoading ? S.resetSending : S.forgotPassword),
        mode === 'register' && React.createElement('input', {
          type:'password', value:password2, onChange:e=>setPassword2(e.target.value),
          placeholder:S.confirm, required:true,
          style:{...inp, marginBottom:12},
          autoComplete:'new-password'
        }),
        mode === 'register' && React.createElement('input', {
          type:'text', value:regName, onChange:e=>setRegName(e.target.value),
          placeholder: loginLang==='pt' ? 'Seu nome *' : 'Your name *',
          style:{...inp, marginBottom:12},
          autoComplete:'name'
        }),
        mode === 'register' && React.createElement('input', {
          type:'date', value:regBirthDate, onChange:e=>setRegBirthDate(e.target.value),
          required:true, max:new Date().toISOString().split('T')[0], min:'1900-01-01',
          title: loginLang==='pt' ? 'Data de nascimento *' : 'Date of birth *',
          style:{...inp, marginBottom:12},
          autoComplete:'bday'
        }),
        mode === 'register' && React.createElement('select', {
          value:regGender, onChange:e=>setRegGender(e.target.value), required:true,
          style:{...inp, marginBottom:12}
        },
          React.createElement('option', {value:''}, loginLang==='pt' ? 'Gênero *' : 'Gender *'),
          React.createElement('option', {value:'male'}, loginLang==='pt' ? 'Masculino' : 'Male'),
          React.createElement('option', {value:'female'}, loginLang==='pt' ? 'Feminino' : 'Female')
        ),
        mode === 'register' && React.createElement('div', {style:{display:'flex',gap:8,marginBottom: error?8:20}},
          React.createElement('input', {
            type:'number', value:regWeight, onChange:e=>setRegWeight(e.target.value),
            placeholder: loginLang==='pt' ? 'Peso (kg)' : 'Weight (kg)',
            min:30, max:300, step:0.1,
            style:{...inp, marginBottom:0, flex:1}
          }),
          React.createElement('input', {
            type:'number', value:regHeight, onChange:e=>setRegHeight(e.target.value),
            placeholder: loginLang==='pt' ? 'Altura (cm)' : 'Height (cm)',
            min:100, max:250,
            style:{...inp, marginBottom:0, flex:1}
          })
        ),
        error && React.createElement('div', {style:{
          color:'#c87e7e',fontSize:12,marginBottom:16,padding:'8px 12px',
          background:'rgba(200,80,80,0.1)',borderRadius:6,border:'1px solid rgba(200,80,80,0.2)'
        }}, error),
        resetMessage && React.createElement('div', {style:{
          color:'var(--btn-ok-text)',fontSize:12,marginBottom:16,padding:'8px 12px',
          background:'rgba(80,160,80,0.1)',borderRadius:6,border:'1px solid var(--btn-ok-border)',
          lineHeight:1.4
        }}, resetMessage),
        React.createElement('button', {
          type:'submit', disabled:loading, style:{
            width:'100%',
            background: loading?'var(--btn-inactive)': mode==='login'?'var(--btn-ok)':'var(--btn-info)',
            border:'1px solid ' + (mode==='login'?'var(--btn-ok-border)':'var(--btn-info-border)'),
            color: loading?'var(--muted)': mode==='login'?'var(--btn-ok-text)':'var(--btn-info-text)',
            padding:'13px',borderRadius:8,fontSize:12,letterSpacing:1,
            textTransform:'uppercase',cursor:loading?'default':'pointer',
            fontFamily:'inherit',transition:'all 0.2s'
          }
        }, loading ? S.processing : mode==='login' ? S.loginBtn : S.registerBtn)
      ),

    )
  );
}

// Settings Panel
function SettingsPanel({onClose, onLogout, onOpenBackup, onOpenPrivacy, lang, darkMode, toggleLang, toggleDark, directKey}) {
  const [showKey, setShowKey] = React.useState(!!directKey);
  const [groqKey, setGroqKey] = React.useState(()=>localStorage.getItem('groq_key')||'');
  const [proxy, setProxy] = React.useState(()=>localStorage.getItem('cors_proxy')||'');
  const isPt = (lang||'pt') === 'pt';
  function closeKey() { directKey ? onClose() : setShowKey(false); }
  function saveKey() {
    localStorage.setItem('groq_key',groqKey);
    localStorage.setItem('cors_proxy',proxy);
    closeKey();
  }
  async function doLogout() {
    try {
      await Promise.resolve(fbSignOut());
    } catch (_) {}
    onLogout();
    onClose();
  }
  const S = isPt
    ? {title:'Configurações',langSwitch:'Switch to English',themeLight:'Modo claro',themeDark:'Modo escuro',
       apiKey:'IA / Chave de API (avançado)',logout:'Sair da conta',save:'Salvar',
       keyLabel:'Chave API Groq',keyHint:'Obtenha em console.groq.com/keys',
       proxyLabel:'Proxy CORS (opcional)',proxyHint:'Necessário se a IA não funcionar'}
    : {title:'Settings',langSwitch:'Switch to Portuguese',themeLight:'Light mode',themeDark:'Dark mode',
       apiKey:'AI / API key (advanced)',logout:'Sign out',save:'Save',
       keyLabel:'Groq API Key',keyHint:'Get it at console.groq.com/keys',
       proxyLabel:'CORS Proxy (optional)',proxyHint:'Required if AI features fail'};

  Object.assign(S, isPt
    ? {title:'Configura\u00e7\u00f5es',langSwitch:'Switch to English',themeLight:'Modo claro',themeDark:'Modo escuro',
       apiKey:'IA / Chave de API (avan\u00e7ado)',logout:'Sair da conta',save:'Salvar',
       keyLabel:'Chave API Groq',keyHint:'Cole aqui sua chave da Groq. Ela fica salva apenas neste navegador.',
       proxyLabel:'Proxy CORS (opcional)',proxyHint:'Use somente se os recursos de IA falharem por bloqueio de CORS.'}
    : {title:'Settings',langSwitch:'Switch to Portuguese',themeLight:'Light mode',themeDark:'Dark mode',
       apiKey:'AI / API key (advanced)',logout:'Sign out',save:'Save',
       keyLabel:'Groq API Key',keyHint:'Paste your Groq key here. It is stored only in this browser.',
       proxyLabel:'CORS proxy (optional)',proxyHint:'Use only if AI features fail because of CORS blocking.'});

  const rowBtn = (label, onClick, danger, hint) => React.createElement('button', {onClick, style:{
    display:'block',width:'100%',background:'none',border:'none',
    borderTop:'1px solid var(--border2)',color:danger?'var(--btn-warn-text)':'var(--text2)',
    padding:'15px 20px',fontSize:14,cursor:'pointer',fontFamily:'inherit',textAlign:'left'
  }}, React.createElement('div', null, label), hint ? React.createElement('div', {
    style:{fontSize:12,color:'var(--muted)',marginTop:4,lineHeight:1.35}
  }, hint) : null);
  const sectionTitle = label => React.createElement('div', {
    style:{
      padding:'16px 20px 6px',
      fontSize:11,
      letterSpacing:2,
      textTransform:'uppercase',
      color:'var(--muted)',
      fontWeight:700
    }
  }, label);
  const languageLabel = isPt
    ? '🇧🇷 Idioma: Portugu\u00eas (Brasil)'
    : '🇺🇸 Language: English (US)';
  const languageHint = isPt
    ? 'English (US) 🇺🇸'
    : 'Portugu\u00eas (Brasil) 🇧🇷';
  const aiHint = isPt
    ? 'Habilita as fun\u00e7\u00f5es com \u2726, como an\u00e1lises e preenchimento por IA.'
    : 'Enables \u2726 features such as AI analysis and automatic filling.';
  const inp = {width:'100%',background:'var(--surface)',border:'1px solid var(--border2)',color:'var(--text)',
    padding:'11px 12px',borderRadius:8,fontSize:13,boxSizing:'border-box',outline:'none',fontFamily:'inherit'};

  if (showKey) return React.createElement('div', {style:{position:'fixed',inset:0,background:'rgba(0,0,0,0.94)',zIndex:10002,display:'flex',alignItems:'center',justifyContent:'center',padding:20}},
    React.createElement('div', {style:{background:'var(--surface,#fff)',borderRadius:14,width:'100%',maxWidth:400,padding:24,border:'1px solid var(--border2)'}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}},
        React.createElement('span',{style:{fontSize:11,letterSpacing:1,color:'#555',textTransform:'uppercase'}}, S.keyLabel),
        React.createElement('button',{onClick:closeKey,style:{background:'none',border:'none',color:'#444',fontSize:22,cursor:'pointer',lineHeight:1}},'x')
      ),
      React.createElement('input',{type:'text',value:groqKey,onChange:e=>setGroqKey(e.target.value),
        placeholder:'gsk_...',style:{...inp,fontFamily:'monospace',fontSize:11,marginBottom:4}}),
      React.createElement('div',{style:{fontSize:12,color:'#444',marginBottom:14}},S.keyHint),
      React.createElement('input',{type:'text',value:proxy,onChange:e=>setProxy(e.target.value),
        placeholder:'https://corsproxy.io/?',style:{...inp,marginBottom:4}}),
      React.createElement('div',{style:{fontSize:12,color:'#444',marginBottom:20}},S.proxyLabel + ' - ' + S.proxyHint),
      React.createElement('button',{onClick:saveKey,style:{width:'100%',background:'#1a2a1a',border:'1px solid #3a5a3a',
        color:'#7ec87e',padding:'12px',borderRadius:8,fontSize:11,letterSpacing:1,
        textTransform:'uppercase',cursor:'pointer',fontFamily:'inherit'}}, S.save)
    )
  );

  return React.createElement('div', {onClick:onClose, style:{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:9999,display:'flex',alignItems:'flex-end'}},
    React.createElement('div', {onClick:e=>e.stopPropagation(), style:{background:'var(--surface,#fff)',borderRadius:'18px 18px 0 0',width:'100%',paddingBottom:'env(safe-area-inset-bottom,20px)',overflow:'hidden',boxShadow:'0 -4px 40px rgba(0,0,0,0.6)'}},
      React.createElement('div',{style:{textAlign:'center',padding:'14px 0 4px',cursor:'pointer'},onClick:onClose},
        React.createElement('div',{style:{width:32,height:4,background:'#2e2e2e',borderRadius:2,margin:'0 auto'}})
      ),
      React.createElement('div',{style:{paddingBottom:8}},
        sectionTitle(isPt ? 'Apar\u00eancia' : 'Appearance'),
        rowBtn(languageLabel, ()=>{toggleLang(); onClose();}, false, languageHint),
        rowBtn(darkMode?S.themeLight:S.themeDark, ()=>{toggleDark(); onClose();}),
        sectionTitle(isPt ? 'Dados' : 'Data'),
        rowBtn(isPt ? 'Backup e restaurar' : 'Backup & restore', ()=>{onClose(); onOpenBackup && onOpenBackup();}),
        rowBtn(isPt ? 'Privacidade e seguran\u00e7a' : 'Privacy & security', ()=>{onClose(); onOpenPrivacy && onOpenPrivacy();}),
        sectionTitle(isPt ? 'Intelig\u00eancia' : 'Intelligence'),
        rowBtn(S.apiKey, ()=>setShowKey(true), false, aiHint),
        sectionTitle(isPt ? 'Conta' : 'Account'),
        rowBtn(S.logout, doLogout, true)
      )
    )
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
  const [lang, setLang]         = React.useState(()=>localStorage.getItem('appLang')||'pt');
  const [showReleaseNotice, setShowReleaseNotice] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState(() => {
    const saved = localStorage.getItem('appDarkMode');
    return saved !== null ? saved === 'true' : false; // padrão: modo claro
  });

  function toggleLang() {
    const nl=lang==='pt'?'en':'pt';
    localStorage.setItem('appLang',nl);
    setLang(nl);
    Promise.resolve(storage.set('language', nl))
      .catch(()=>{})
      .finally(() => setTimeout(() => window.location.reload(), 0));
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
    if (savedLang?.value === 'pt' || savedLang?.value === 'en') {
      localStorage.setItem('appLang', savedLang.value);
      setLang(savedLang.value);
    } else {
      storage.set('language', localStorage.getItem('appLang') || lang || 'pt').catch(()=>{});
    }
    await checkRequiredProfile();
    const tutorialVersion = await storage.get(MOST_RECENT_TUTORIAL_KEY).catch(()=>null);
    if (!hasSeenTutorial(tutorialVersion)) {
      await ensureCurrentVersionTutorialPending(tutorialVersion?.value);
      setShowReleaseNotice(true);
      return;
    }
    storage.get(tutorialSeenKey('main')).then(r => {
      if (isNew || !hasSeenTutorial(r)) { setTutorialType('main'); setShowTutorial(true); }
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
        if (savedLang?.value === 'pt' || savedLang?.value === 'en') {
          localStorage.setItem('appLang', savedLang.value);
          setLang(savedLang.value);
        }
        storage.set('lastLoginAt', new Date().toISOString()).catch(()=>{});
        const tutorialVersion = await storage.get(MOST_RECENT_TUTORIAL_KEY).catch(()=>null);
        if (!hasSeenTutorial(tutorialVersion)) {
          await ensureCurrentVersionTutorialPending(tutorialVersion?.value);
          setShowReleaseNotice(true);
        }
        setChecking(false);
        await checkRequiredProfile();
      })
      .catch(() => { clearTimeout(timeout); fbSignOut(); setAuthed(false); setChecking(false); setProfileChecking(false); });
  }, []);

  // Removed: was auto-opening settings on every login

  // Show loading indicator while checking auth
  if (checking || profileChecking) return React.createElement('div', {style:{
    position:'fixed',top:0,left:0,right:0,bottom:0,background:darkMode?'#111':'#f2f1ed',display:'flex',
    flexDirection:'column',alignItems:'center',justifyContent:'center',
    gap:16,color:darkMode?'#8a8a8a':'#6a6662',fontSize:12,letterSpacing:1,textTransform:'uppercase'
  }},
    React.createElement('div', {style:{width:30,height:30,borderRadius:'50%',border:'3px solid ' + (darkMode?'#2a3a2a':'#d8d4cc'),borderTopColor:darkMode?'#7ec87e':'#2a6a2a',animation:'spin 1.2s linear infinite'}}),
    React.createElement('div', null, lang==='en'?'Signing in...':'Entrando...')
  );
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
        onStartTutorial: async () => {
          await markCurrentVersionTutorialSeen();
          setShowReleaseNotice(false);
          setTutorialType('main');
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
var _ldg = document.getElementById('loading');
if (_ldg) _ldg.style.display = 'none';


