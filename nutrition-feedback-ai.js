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
          return { status: "no-week-data" };
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
      return { status: "success", text };
    }

    return { generateNutritionFeedback };
  }

  return { createNutritionFeedbackAI };
});
