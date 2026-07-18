/**
 * AI analysis of eating patterns from an explicit 30-day nutrition snapshot.
 *
 * The UMD module exposes a `createEatingPatternsAI` factory. The React host
 * performs the sequential `storage.get("log_v2_YYYY-MM-DD")` calls and parses
 * each JSON record before supplying plain daily logs. The host also snapshots
 * training types, weight history, profile data, nutrition preferences, custom
 * goals, goal history, stable meal keys, and the current UTC-derived date.
 * This module injects the existing Groq client, i18n selector, goal calculator,
 * and historical-weight resolver; it performs no storage or React I/O.
 *
 * KNOWN BEHAVIOR DELIBERATELY PRESERVED: host dates mix local `Date#setDate`
 * with UTC `toISOString`; logs are analyzed without `normalizeMealKeys`;
 * the populated `acc` object remains unused by the prompt; and concurrent
 * analyses have no cancellation or response ordering.
 *
 * @module EatingPatternsAI
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.EatingPatternsAI = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the eating-patterns API with existing AI and domain helpers.
   *
   * @param {Object} dependencies Injected AI, localization, and goal dependencies.
   * @param {function(string,number): Promise<string>} dependencies.callAI Existing Groq client wrapper.
   * @param {function(string,*,*,*): *} dependencies.pickLang Production language selector from `i18n.js`.
   * @param {function(number,boolean,Object): Object} dependencies.computeGoals Production goal calculator.
   * @param {function(Array<Object>,string): (Object|null)} dependencies.getWeightForDate Existing historical-weight resolver from the monolith.
   * @returns {{generateEatingPatterns: function(EatingPatternsSnapshot): Promise<Object>}} Configured patterns API.
   */
  function createEatingPatternsAI({
    callAI,
    pickLang,
    computeGoals,
    getWeightForDate
  }) {
    if (typeof callAI !== "function" || typeof pickLang !== "function" ||
        typeof computeGoals !== "function" || typeof getWeightForDate !== "function") {
      throw new TypeError("EatingPatternsAI requires callAI, pickLang, computeGoals, and getWeightForDate functions");
    }

    /**
     * @typedef {Object} EatingPatternsSnapshot
     * @property {string} lang Current app language.
     * @property {string} today Existing UTC-derived `TODAY` value.
     * @property {Array<{date:string,log:Object}>} days Successfully read and parsed daily logs.
     * @property {Object<string,boolean>} trainingByDate Explicit day-type history.
     * @property {Array<Object>} weightHistory Historical body measurements.
     * @property {number|null} currentWeight Current resolved weight.
     * @property {number|null} currentHeight Current resolved height.
     * @property {{birthDate:string,gender:string}} profile Goal-profile fields.
     * @property {Object} nutritionPrefs Current nutrition preferences.
     * @property {Object} customGoals Current nutrient-goal overrides.
     * @property {Object<string,Object>} goalHistory Historical goal snapshots.
     * @property {Array<string>} mealKeys Stable persisted meal keys.
     */

    /**
     * Builds the exact production prompt and requests the eating-pattern analysis.
     *
     * @param {EatingPatternsSnapshot} snapshot Explicit state and parsed-log snapshot assembled by the React host.
     * @returns {Promise<{status:"success",text:string}|{status:"no-data"}>} Generated text or the existing empty-data cutoff.
     */
    async function generateEatingPatterns(snapshot) {
      const {
        lang,
        today: TODAY,
        days,
        trainingByDate,
        weightHistory,
        currentWeight,
        currentHeight,
        profile: profileData,
        nutritionPrefs,
        customGoals,
        goalHistory,
        mealKeys: MEALS
      } = snapshot;

      const acc = {};
      const dayData = [];
      for (const { date, log: dayLog } of days) {
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
        return { status: "no-data" };
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
      return { status: "success", text: _pText };
    }

    return { generateEatingPatterns };
  }

  return { createEatingPatternsAI };
});

