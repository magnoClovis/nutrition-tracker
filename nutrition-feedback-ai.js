/**
 * AI-generated daily and weekly nutrition feedback from an explicit app snapshot.
 *
 * The UMD module exposes a `createNutritionFeedbackAI` factory. The host injects
 * the existing Groq-backed `callAI`, language helpers from `i18n.js`, and the
 * real activity descriptors and age calculator from `goal-calculator.js`.
 * Each request receives one plain snapshot containing the selected period, user
 * profile, nutrition preferences, goals, day log/labels, and weekly aggregates.
 * The module returns either generated text or the neutral `no-week-data` status
 * and never reads React state, storage, or UI callbacks directly.
 *
 * Activity names and descriptions follow the normalized prompt language. The
 * activity factor keeps the historical `baseActivityFactor ||
 * activityInfo.factor` fallback. Requests have no cancellation or ordering, so
 * older results may overwrite newer feedback and period state in the React host.
 *
 * @module NutritionFeedbackAI
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NutritionFeedbackAI = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const FEEDBACK_NUTRIENTS = Object.freeze([
    "protein",
    "kcal",
    "carbs",
    "fat",
    "fiber",
    "salt"
  ]);

  function finiteNutrient(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function summarizeEntries(entries, field) {
    const values = entries.map(entry => finiteNutrient(entry && entry[field]));
    const known = values.filter(value => value !== null);
    return {
      value: known.length ? known.reduce((sum, value) => sum + value, 0) : null,
      knownItemCount: known.length,
      missingItemCount: values.length - known.length,
      totalItemCount: values.length,
      complete: values.length > 0 && known.length === values.length
    };
  }

  function dayCoverage(day, field) {
    const supplied = day?.nutrientCoverage?.[field];
    if (supplied && typeof supplied === "object") {
      const knownItemCount = Number(supplied.knownItemCount) || 0;
      return {
        value: knownItemCount > 0 ? finiteNutrient(day[field]) : null,
        knownItemCount,
        missingItemCount: Number(supplied.missingItemCount) || 0,
        totalItemCount: Number(supplied.totalItemCount) || 0,
        complete: supplied.complete === true
      };
    }
    const value = finiteNutrient(day && day[field]);
    return {
      value,
      knownItemCount: value === null ? 0 : 1,
      missingItemCount: value === null ? 1 : 0,
      totalItemCount: 1,
      complete: value !== null
    };
  }

  function rounded(value, decimals = 0) {
    if (value === null) return null;
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  function unknownLabel(lang) {
    return lang === "en" ? "unknown" : lang === "es" ? "desconocido" : "desconhecido";
  }

  function entryNutrient(value, unit, lang) {
    const number = finiteNutrient(value);
    return number === null ? unknownLabel(lang) : `${Math.round(number)}${unit}`;
  }

  function incompleteNutrientText(label, summary, unit, lang, decimals = 0) {
    const value = rounded(summary.value, decimals);
    const amount = value === null
      ? unknownLabel(lang)
      : lang === "en"
        ? `known subtotal ${value}${unit}`
        : lang === "es"
          ? `subtotal conocido ${value}${unit}`
          : `subtotal conhecido ${value}${unit}`;
    const gap = summary.totalItemCount === 0
      ? (lang === "en" ? "no foods logged" : lang === "es" ? "ningún alimento registrado" : "nenhum alimento registrado")
      : lang === "en"
        ? `data missing for ${summary.missingItemCount} of ${summary.totalItemCount} foods`
        : lang === "es"
          ? `faltan datos para ${summary.missingItemCount} de ${summary.totalItemCount} alimentos`
          : `faltam dados para ${summary.missingItemCount} de ${summary.totalItemCount} alimentos`;
    return `${label}: ${amount}; ${gap}`;
  }

  function primaryDayLine(label, summary, goal, unit, lang) {
    if (!summary.complete) {
      const unavailable = lang === "en"
        ? "target percentage unavailable"
        : lang === "es"
          ? "porcentaje de la meta no disponible"
          : "percentual da meta indisponível";
      return `${incompleteNutrientText(label, summary, unit, lang)} (${unavailable})`;
    }
    const value = rounded(summary.value);
    const percent = finiteNutrient(goal) > 0 ? Math.round(value / goal * 100) : null;
    const target = percent !== null
      ? lang === "en" ? `${percent}% of target` : lang === "es" ? `${percent}% de la meta` : `${percent}% da meta`
      : lang === "en" ? "no target" : lang === "es" ? "sin meta" : "sem meta";
    return `${label}: ${value}${unit} (${target})`;
  }

  function optionalDayPart(label, summary, unit, lang, decimals = 0) {
    if (!summary.complete) return incompleteNutrientText(label, summary, unit, lang, decimals);
    return `${label}: ${rounded(summary.value, decimals)}${unit}`;
  }

  function weekAverage(days, field, decimals = 0) {
    const summaries = days.map(day => dayCoverage(day, field));
    const complete = summaries.filter(summary => summary.complete && summary.value !== null);
    return {
      value: complete.length
        ? rounded(complete.reduce((sum, summary) => sum + summary.value, 0) / complete.length, decimals)
        : null,
      completeDayCount: complete.length,
      missingDayCount: summaries.length - complete.length,
      totalDayCount: summaries.length,
      complete: complete.length === summaries.length
    };
  }

  function weekValue(value, goal, coverage, unit, lang) {
    if (!coverage.complete) {
      const amount = coverage.value === null ? unknownLabel(lang) : `${coverage.value}${unit}`;
      const gap = lang === "en"
        ? `data missing for ${coverage.missingItemCount} of ${coverage.totalItemCount} foods`
        : lang === "es"
          ? `faltan datos para ${coverage.missingItemCount} de ${coverage.totalItemCount} alimentos`
          : `faltam dados para ${coverage.missingItemCount} de ${coverage.totalItemCount} alimentos`;
      return `${amount} (${gap})/${goal ?? "—"}${unit}`;
    }
    return `${value}${unit}/${goal ?? "—"}${unit}`;
  }

  function weekProteinLine(day, lang) {
    const coverage = dayCoverage(day, "protein");
    const label = lang === "en" ? "protein" : lang === "es" ? "proteína" : "proteína";
    if (!coverage.complete) {
      const comparison = lang === "en"
        ? "target comparison unavailable"
        : lang === "es"
          ? "comparación con la meta no disponible"
          : "comparação com a meta indisponível";
      return `${label}: ${weekValue(day.protein, day.proteinGoal, coverage, "g", lang)} (${comparison})`;
    }
    const result = day.metProtein
      ? lang === "en" ? "target" : "meta"
      : lang === "en" ? "below" : lang === "es" ? "por debajo" : "abaixo";
    return `${label}: ${day.protein}g/${day.proteinGoal}g (${result})`;
  }

  function averagePart(label, average, unit, lang) {
    const perDay = lang === "en" ? "/day" : lang === "es" ? "/día" : "/dia";
    if (average.complete) return `${label}: ${average.value}${unit}${perDay}`;
    const value = average.value === null ? unknownLabel(lang) : `${average.value}${unit}${perDay}`;
    const coverage = lang === "en"
      ? `${average.completeDayCount}/${average.totalDayCount} days with complete data`
      : lang === "es"
        ? `${average.completeDayCount}/${average.totalDayCount} días con datos completos`
        : `${average.completeDayCount}/${average.totalDayCount} dias com dados completos`;
    return `${label}: ${value} (${coverage})`;
  }

  /**
   * Creates the nutrition-feedback API with the app's existing AI and domain helpers.
   *
   * @param {Object} dependencies Injected AI, localization, and goal-calculation dependencies.
   * @param {function(string,number): Promise<string>} dependencies.callAI Existing Groq client wrapper.
   * @param {function(string): string} dependencies.normalizeLanguage Production language normalizer from `i18n.js`.
   * @param {function(string,*,*,*): *} dependencies.pickLang Production language selector from `i18n.js`.
   * @param {Object<string,Object>} dependencies.activityLevels Real `ACTIVITY_LEVELS` value from `goal-calculator.js`.
   * @param {function(string,Date=): (number|null)} dependencies.calculateAge Production age calculator from `goal-calculator.js`.
   * @returns {{generateNutritionFeedback: function(NutritionFeedbackSnapshot): Promise<Object>}} Configured feedback API.
   */
  function createNutritionFeedbackAI({
    callAI,
    normalizeLanguage,
    pickLang,
    activityLevels,
    calculateAge
  }) {
    if (typeof callAI !== "function" || typeof normalizeLanguage !== "function" ||
        typeof pickLang !== "function" || !activityLevels || typeof calculateAge !== "function") {
      throw new TypeError("NutritionFeedbackAI requires callAI, normalizeLanguage, pickLang, activityLevels, and calculateAge");
    }

    /**
     * @typedef {Object} NutritionFeedbackSnapshot
     * @property {"day"|"week"} type Requested feedback period.
     * @property {string} lang Current app language.
     * @property {string} userName Resolved persisted user name, or an empty string.
     * @property {Object} profile Birth date, gender, and current/viewed body measurements.
     * @property {Object} preferences Activity level and weight-goal preferences.
     * @property {Object} goalContext Active nutrient goals and calculation context.
     * @property {Object} day Viewed date, day type, ordered meal keys/labels, and active log.
     * @property {Array<Object>} week Weekly aggregate rows.
     */

    /**
     * Builds the exact production prompt and requests nutrition feedback.
     *
     * @param {NutritionFeedbackSnapshot} snapshot Explicit state snapshot assembled by the React host after resolving `userName`.
     * @returns {Promise<{status:"success",text:string}|{status:"no-week-data"}>} Generated text or the existing empty-week cutoff.
     */
    async function generateNutritionFeedback(snapshot) {
      const {
        type,
        lang,
        userName: feedbackUserName,
        profile: profileData,
        preferences: nutritionPrefs,
        goalContext,
        day,
        week: weekData
      } = snapshot;
      const goals = goalContext.goals;
      const ACTIVITY_LEVELS = activityLevels;
      const baseGoals = { fa: goalContext.baseActivityFactor };
      const calorieBase = goalContext.calorieBase;
      const calorieAdjustment = goalContext.calorieAdjustment;
      const proteinMultiplier = goalContext.proteinMultiplier;
      const currentWeight = profileData.currentWeight;
      const viewWeight = profileData.viewWeight;
      const currentHeight = profileData.currentHeight;
      const viewHeight = profileData.viewHeight;
      const viewDate = day.viewDate;
      const isTraining = day.isTraining;
      const MEALS = day.mealOrder;
      const activeLog = day.activeLog;
      const mealLabel = meal => day.mealLabels[meal];
      let prompt = "";

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
          "Nivel de actividad física: " + activityInfo.es + " - " + activityInfo.descEs + " | FA: "
        ) + (baseGoals.fa || activityInfo.factor) : "",
        fbText("Dia analisado como: ", "Day classified as: ", "Día analizado como: ") + (isTraining ? fbText("dia de treino/atividade", "training/activity day", "día de entrenamiento/actividad") : fbText("dia de descanso", "rest day", "día de descanso")),
        fbText("Calorias de base calculadas antes do ajuste: ", "Calculated base calories before adjustment: ", "Calorías base calculadas antes del ajuste: ") + (calorieBase || "—") + " kcal",
        fbText("Ajuste calórico do objetivo: ", "Goal calorie adjustment: ", "Ajuste calórico del objetivo: ") + (calorieAdjustment > 0 ? "+" : "") + calorieAdjustment + fbText(" kcal/dia", " kcal/day", " kcal/día"),
        fbText("Metas em uso: ", "Targets in use: ", "Metas en uso: ") + (goals.kcal || "—") + " kcal, " + (goals.protein || "—") + fbText("g proteína, ", "g protein, ", "g proteína, ") + (goals.carbs || "—") + fbText("g carboidratos, ", "g carbs, ", "g carbohidratos, ") + (goals.fat || "—") + fbText("g gorduras, ", "g fat, ", "g grasas, ") + (goals.fiber || "—") + fbText("g fibra, ", "g fiber, ", "g fibra, ") + (goals.salt || "—") + fbText("g sal", "g salt", "g sal"),
        fbText("Multiplicador de proteína: ", "Protein multiplier: ", "Multiplicador de proteína: ") + Number(proteinMultiplier).toFixed(1) + "g/kg"
      ].filter(Boolean).join("\n");
      const feedbackRules = (feedbackEnglish ? [
        "Use the user's name naturally when available, without overusing it.",
        "Analyze the data against the current goal, latest recorded weight, calorie/protein targets, and all available nutrient targets.",
        "Be balanced: highlight real strengths and realistic improvement areas without alarmism.",
        "Do not frame small differences as major problems. Deviations under 5% of the target, or just a few grams for nutrients, should be treated at most as a light observation.",
        "Prioritize relevant patterns, consistency, food choices, protein/calorie distribution, fiber, salt, fats, and alignment with the user's goal.",
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
          return label + ":\n" + items.map(e => "  - " + e.name + " (" + e.qty + e.unit + ") - prot: " + entryNutrient(e.protein, "g", feedbackLang) + ", " + entryNutrient(e.kcal, "kcal", feedbackLang) + ", carbs: " + entryNutrient(e.carbs, "g", feedbackLang) + ", gord: " + entryNutrient(e.fat, "g", feedbackLang)).join("\n");
        }).filter(Boolean).join("\n");
        const totals = Object.fromEntries(
          FEEDBACK_NUTRIENTS.map(field => [field, summarizeEntries(entries, field)])
        );
        const currentBMI = (currentWeight && currentHeight) ? (currentWeight / ((currentHeight/100)**2)).toFixed(1) : null;
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
          primaryDayLine("Protein", totals.protein, goals.protein, "g", feedbackLang),
          primaryDayLine("Calories", totals.kcal, goals.kcal, "kcal", feedbackLang),
          optionalDayPart("Carbs", totals.carbs, "g", feedbackLang) + " | " + optionalDayPart("Fat", totals.fat, "g", feedbackLang) + " | " + optionalDayPart("Fiber", totals.fiber, "g", feedbackLang) + " | " + optionalDayPart("Salt", totals.salt, "g", feedbackLang, 1),
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
          primaryDayLine("Proteína", totals.protein, goals.protein, "g", feedbackLang),
          primaryDayLine("Calorías", totals.kcal, goals.kcal, "kcal", feedbackLang),
          optionalDayPart("Carbohidratos", totals.carbs, "g", feedbackLang) + " | " + optionalDayPart("Grasas", totals.fat, "g", feedbackLang) + " | " + optionalDayPart("Fibra", totals.fiber, "g", feedbackLang) + " | " + optionalDayPart("Sal", totals.salt, "g", feedbackLang, 1),
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
          primaryDayLine("Proteína", totals.protein, goals.protein, "g", feedbackLang),
          primaryDayLine("Calorias", totals.kcal, goals.kcal, "kcal", feedbackLang),
          optionalDayPart("Carbs", totals.carbs, "g", feedbackLang) + " | " + optionalDayPart("Gordura", totals.fat, "g", feedbackLang) + " | " + optionalDayPart("Fibra", totals.fiber, "g", feedbackLang) + " | " + optionalDayPart("Sal", totals.salt, "g", feedbackLang, 1),
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
          return { status: "no-week-data" };
        }
        const avg = {
          protein: weekAverage(days, "protein"),
          kcal: weekAverage(days, "kcal"),
          carbs: weekAverage(days, "carbs"),
          fat: weekAverage(days, "fat"),
          fiber: weekAverage(days, "fiber"),
          salt: weekAverage(days, "salt", 1)
        };
        const daySummary = days.map(d => feedbackEnglish ?
          d.date + " - " + weekProteinLine(d, feedbackLang) + ", " +
          "calories: " + weekValue(d.kcal, d.kcalGoal, dayCoverage(d, "kcal"), "kcal", feedbackLang) + ", carbs: " + weekValue(d.carbs, d.carbsGoal, dayCoverage(d, "carbs"), "g", feedbackLang) + ", fat: " + weekValue(d.fat, d.fatGoal, dayCoverage(d, "fat"), "g", feedbackLang) + ", fiber: " + weekValue(d.fiber, d.fiberGoal, dayCoverage(d, "fiber"), "g", feedbackLang) + ", salt: " + weekValue(d.salt, d.saltGoal, dayCoverage(d, "salt"), "g", feedbackLang)
          : feedbackSpanish ?
          d.date + " - " + weekProteinLine(d, feedbackLang) + ", " +
          "calorías: " + weekValue(d.kcal, d.kcalGoal, dayCoverage(d, "kcal"), "kcal", feedbackLang) + ", carbohidratos: " + weekValue(d.carbs, d.carbsGoal, dayCoverage(d, "carbs"), "g", feedbackLang) + ", grasas: " + weekValue(d.fat, d.fatGoal, dayCoverage(d, "fat"), "g", feedbackLang) + ", fibra: " + weekValue(d.fiber, d.fiberGoal, dayCoverage(d, "fiber"), "g", feedbackLang) + ", sal: " + weekValue(d.salt, d.saltGoal, dayCoverage(d, "salt"), "g", feedbackLang)
          :
          d.date + " - " + weekProteinLine(d, feedbackLang) + ", " +
          "calorias: " + weekValue(d.kcal, d.kcalGoal, dayCoverage(d, "kcal"), "kcal", feedbackLang) + ", carbs: " + weekValue(d.carbs, d.carbsGoal, dayCoverage(d, "carbs"), "g", feedbackLang) + ", gordura: " + weekValue(d.fat, d.fatGoal, dayCoverage(d, "fat"), "g", feedbackLang) + ", fibra: " + weekValue(d.fiber, d.fiberGoal, dayCoverage(d, "fiber"), "g", feedbackLang) + ", sal: " + weekValue(d.salt, d.saltGoal, dayCoverage(d, "salt"), "g", feedbackLang)
        ).join("\n");
        const proteinCompleteDays = days.filter(day => dayCoverage(day, "protein").complete);
        const daysMetProt = proteinCompleteDays.filter(d => d.metProtein).length;
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
          averagePart("Protein", avg.protein, "g", feedbackLang) + " | " + averagePart("Calories", avg.kcal, "kcal", feedbackLang) + " | " + averagePart("Carbs", avg.carbs, "g", feedbackLang) + " | " + averagePart("Fat", avg.fat, "g", feedbackLang) + " | " + averagePart("Fiber", avg.fiber, "g", feedbackLang) + " | " + averagePart("Salt", avg.salt, "g", feedbackLang),
          "Days that hit the protein target: " + daysMetProt + "/" + proteinCompleteDays.length + " days with complete protein data",
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
          averagePart("Proteína", avg.protein, "g", feedbackLang) + " | " + averagePart("Calorías", avg.kcal, "kcal", feedbackLang) + " | " + averagePart("Carbohidratos", avg.carbs, "g", feedbackLang) + " | " + averagePart("Grasas", avg.fat, "g", feedbackLang) + " | " + averagePart("Fibra", avg.fiber, "g", feedbackLang) + " | " + averagePart("Sal", avg.salt, "g", feedbackLang),
          "Días que alcanzó la meta de proteína: " + daysMetProt + "/" + proteinCompleteDays.length + " días con datos completos de proteína",
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
          averagePart("Proteína", avg.protein, "g", feedbackLang) + " | " + averagePart("Calorias", avg.kcal, "kcal", feedbackLang) + " | " + averagePart("Carbs", avg.carbs, "g", feedbackLang) + " | " + averagePart("Gordura", avg.fat, "g", feedbackLang) + " | " + averagePart("Fibra", avg.fiber, "g", feedbackLang) + " | " + averagePart("Sal", avg.salt, "g", feedbackLang),
          "Dias que atingiu a meta de proteína: " + daysMetProt + "/" + proteinCompleteDays.length + " dias com dados completos de proteína",
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
      return { status: "success", text };
    }

    return { generateNutritionFeedback };
  }

  return { createNutritionFeedbackAI };
});
