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

  const PATTERN_NUTRIENTS = Object.freeze(["protein", "kcal", "carbs", "fiber"]);

  function finiteNutrient(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function summarizeEntries(entries, field) {
    const values = entries.map(entry => finiteNutrient(entry && entry[field]));
    const known = values.filter(value => value !== null);
    return {
      value: known.length ? Math.round(known.reduce((sum, value) => sum + value, 0)) : null,
      missingItemCount: values.length - known.length,
      totalItemCount: values.length,
      complete: values.length > 0 && known.length === values.length
    };
  }

  function completeAverage(days, field) {
    const complete = days.filter(day => day.coverage[field].complete && day[field] !== null);
    return {
      value: complete.length
        ? Math.round(complete.reduce((sum, day) => sum + day[field], 0) / complete.length)
        : null,
      completeDayCount: complete.length,
      totalDayCount: days.length
    };
  }

  function metricText(summary, unit, lang) {
    if (summary.completeDayCount === summary.totalDayCount) return `${summary.value}${unit}`;
    const value = summary.value === null
      ? (lang === "en" ? "unknown" : lang === "es" ? "desconocido" : "desconhecido")
      : `${summary.value}${unit}`;
    const coverage = lang === "en"
      ? `${summary.completeDayCount}/${summary.totalDayCount} days with complete data`
      : lang === "es"
        ? `${summary.completeDayCount}/${summary.totalDayCount} días con datos completos`
        : `${summary.completeDayCount}/${summary.totalDayCount} dias com dados completos`;
    return `${value} (${coverage})`;
  }

  function coverageLimitations(days, lang) {
    const limitations = PATTERN_NUTRIENTS.flatMap(field => {
      const affected = days.filter(day => !day.coverage[field].complete);
      if (!affected.length) return [];
      const missingItems = affected.reduce(
        (sum, day) => sum + day.coverage[field].missingItemCount,
        0
      );
      const label = field === "kcal"
        ? (lang === "en" ? "calories" : lang === "es" ? "calorías" : "calorias")
        : field === "protein"
          ? (lang === "en" ? "protein" : "proteína")
          : field === "carbs"
            ? (lang === "en" ? "carbs" : lang === "es" ? "carbohidratos" : "carboidratos")
            : (lang === "en" ? "fiber" : lang === "es" ? "fibra" : "fibra");
      const foodWord = lang === "en"
        ? (missingItems === 1 ? "food" : "foods")
        : lang === "es"
          ? (missingItems === 1 ? "alimento" : "alimentos")
          : (missingItems === 1 ? "alimento" : "alimentos");
      const dayWord = lang === "en"
        ? (affected.length === 1 ? "day" : "days")
        : lang === "es"
          ? (affected.length === 1 ? "día" : "días")
          : (affected.length === 1 ? "dia" : "dias");
      return [lang === "en"
        ? `${label}: data missing for ${missingItems} ${foodWord} across ${affected.length} ${dayWord}`
        : lang === "es"
          ? `${label}: faltan datos para ${missingItems} ${foodWord} en ${affected.length} ${dayWord}`
          : `${label}: faltam dados para ${missingItems} ${foodWord} em ${affected.length} ${dayWord}`];
    });
    if (!limitations.length) return "";
    const title = lang === "en"
      ? "DATA COVERAGE LIMITATIONS:"
      : lang === "es"
        ? "LIMITACIONES DE COBERTURA DE DATOS:"
        : "LIMITAÇÕES DE COBERTURA DOS DADOS:";
    return `${title}\n${limitations.join("\n")}\n`;
  }

  function groupSummary(days, lang, label) {
    if (!days.length) return "";
    const protein = completeAverage(days, "protein");
    const kcal = completeAverage(days, "kcal");
    const average = lang === "en" ? "average " : lang === "es" ? "media " : "média ";
    const proteinLabel = lang === "en" ? " protein" : " proteína";
    return `${label} (${days.length}): ${average}${metricText(protein, "g", lang)}${proteinLabel}, ${metricText(kcal, " kcal", lang)}\n`;
  }

  function proteinRange(days, lang) {
    const complete = days.filter(day => day.coverage.protein.complete && day.protein !== null);
    if (!complete.length) {
      return lang === "en"
        ? "Protein range: unknown (0 days with complete data)"
        : lang === "es"
          ? "Rango de proteína: desconocido (0 días con datos completos)"
          : "Variação de proteína: desconhecida (0 dias com dados completos)";
    }
    const values = complete.map(day => day.protein);
    const suffix = complete.length === days.length
      ? ""
      : lang === "en"
        ? ` (${complete.length}/${days.length} days with complete data)`
        : lang === "es"
          ? ` (${complete.length}/${days.length} días con datos completos)`
          : ` (${complete.length}/${days.length} dias com dados completos)`;
    return lang === "en"
      ? `Protein range: min ${Math.min(...values)}g, max ${Math.max(...values)}g${suffix}`
      : lang === "es"
        ? `Rango de proteína: mín ${Math.min(...values)}g, máx ${Math.max(...values)}g${suffix}`
        : `Variação de proteína: mín ${Math.min(...values)}g, máx ${Math.max(...values)}g${suffix}`;
  }

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
        const coverage = Object.fromEntries(
          PATTERN_NUTRIENTS.map(field => [field, summarizeEntries(entries, field)])
        );
        const p = coverage.protein.value;
        const k = coverage.kcal.value;
        const c = coverage.carbs.value;
        const f = coverage.fiber.value;
        const isTrain = trainingByDate[date] ?? true;
        const wE = getWeightForDate(weightHistory, date);
        const rawGoal = computeGoals(wE?.weight || currentWeight, isTrain, {height: wE?.height || currentHeight, birthDate: profileData.birthDate, gender: profileData.gender, prefs: nutritionPrefs, referenceDate: date});
        const computedGoal = {...rawGoal, protein: customGoals.protein || rawGoal.protein, kcal: customGoals.kcal || rawGoal.kcal, carbs: customGoals.carbs || rawGoal.carbs, fat: customGoals.fat || rawGoal.fat, fiber: customGoals.fiber || rawGoal.fiber, salt: customGoals.salt || rawGoal.salt};
        const g = date !== TODAY && goalHistory[date] ? {...computedGoal, ...goalHistory[date]} : computedGoal;
        dayData.push({
          date,
          protein: p,
          kcal: k,
          carbs: c,
          fiber: f,
          coverage,
          isTraining: isTrain,
          metProtein: coverage.protein.complete && p >= g.protein,
          metKcal: coverage.kcal.complete && k >= g.kcal * 0.85 && k <= g.kcal * 1.15
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
      const avgProt = completeAverage(dayData, "protein");
      const avgKcal = completeAverage(dayData, "kcal");
      const completeProteinDays = dayData.filter(day => day.coverage.protein.complete);
      const daysMetProt = completeProteinDays.filter(d => d.metProtein).length;
      const trainDays = dayData.filter(d => d.isTraining);
      const restDays = dayData.filter(d => !d.isTraining);
      const trainSummary = groupSummary(trainDays, lang, pickLang(lang, "Dias de treino", "Training days", "Días de entrenamiento"));
      const restSummary = groupSummary(restDays, lang, pickLang(lang, "Dias de descanso", "Rest days", "Días de descanso"));
      const limitations = coverageLimitations(dayData, lang);
      const prompt = pickLang(
        lang,
        "Analise os padrões alimentares dos últimos 30 dias e forneça insights detalhados em português brasileiro.\n\nDADOS (" + dayData.length + " dias registrados de 30):\nMédia diária: " + metricText(avgProt, "g", lang) + " proteína, " + metricText(avgKcal, " kcal", lang) + "\nDias que atingiram meta de proteína: " + daysMetProt + "/" + completeProteinDays.length + " dias com dados completos de proteína\n" + trainSummary + restSummary + proteinRange(dayData, lang) + "\n" + limitations + "\n" + (currentWeight ? "Peso atual: " + currentWeight + "kg\n\n" : "") + "Identifique padrões concretos como:\n- Diferença entre dias de treino e descanso\n- Consistência ou inconsistência ao longo do tempo\n- Tendências preocupantes ou positivas\n- áreas de melhoria com sugestões específicas\n\nEstruture com seções claras: Padrões positivos, Padrões a melhorar, Tendências identificadas, Recomendações.",
        "Analyze the user's eating patterns over the last 30 days and provide detailed insights in American English.\n\nDATA (" + dayData.length + " logged days out of 30):\nDaily average: " + metricText(avgProt, "g", lang) + " protein, " + metricText(avgKcal, " kcal", lang) + "\nDays that hit the protein target: " + daysMetProt + "/" + completeProteinDays.length + " days with complete protein data\n" + trainSummary + restSummary + proteinRange(dayData, lang) + "\n" + limitations + "\n" + (currentWeight ? "Current weight: " + currentWeight + "kg\n\n" : "") + "Identify concrete patterns such as:\n- Difference between training and rest days\n- Consistency or inconsistency over time\n- Positive or concerning trends\n- Improvement areas with specific suggestions\n\nStructure with clear sections: Positive Patterns, Patterns to Improve, Identified Trends, Recommendations.",
        "Analiza los patrones alimentarios del usuario durante los últimos 30 días y entrega conclusiones detalladas en español.\n\nDATOS (" + dayData.length + " días registrados de 30):\nMedia diaria: " + metricText(avgProt, "g", lang) + " de proteína, " + metricText(avgKcal, " kcal", lang) + "\nDías que alcanzaron la meta de proteína: " + daysMetProt + "/" + completeProteinDays.length + " días con datos completos de proteína\n" + trainSummary + restSummary + proteinRange(dayData, lang) + "\n" + limitations + "\n" + (currentWeight ? "Peso actual: " + currentWeight + "kg\n\n" : "") + "Identifica patrones concretos como:\n- Diferencias entre días de entrenamiento y descanso\n- Consistencia o inconsistencia a lo largo del tiempo\n- Tendencias positivas o preocupantes\n- Áreas de mejora con sugerencias específicas\n\nEstructura con secciones claras: Patrones positivos, Patrones a mejorar, Tendencias identificadas, Recomendaciones."
      );
      const _pText = await callAI(prompt, 1200);
      return { status: "success", text: _pText };
    }

    return { generateEatingPatterns };
  }

  return { createEatingPatternsAI };
});

