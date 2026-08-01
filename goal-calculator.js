/**
 * Nutritional-goal calculation from profile, activity, and body-weight data.
 *
 * The UMD module exposes a `createGoalCalculator` factory and requires no
 * injected dependencies; it uses JavaScript `Date`, `Math`, and `Number`
 * built-ins. The returned API accepts plain profile/preference objects and
 * primitive weight or day-type values and returns ages, factors, adjustments,
 * multipliers, or plain nutritional-goal objects.
 *
 * @module GoalCalculator
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GoalCalculator = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the goal-calculation API and its activity descriptors.
   *
   * @returns {Object} Activity descriptors and nutritional-goal calculation helpers.
   */
  function createGoalCalculator() {
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
    /**
     * Calculates age using local calendar fields at an optional reference date.
     *
     * @param {string} birthDate Birth date in `YYYY-MM-DD` format.
     * @param {Date|string} [refDate=new Date()] Reference Date or civil `YYYY-MM-DD` string.
     * @returns {number|null} Positive age in completed years, or `null` when unavailable.
     */
    function calculateAge(birthDate, refDate = new Date()) {
      if (!birthDate) return null;
      const birthMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birthDate));
      if (!birthMatch) return null;
      const birthYear = Number(birthMatch[1]);
      const birthMonth = Number(birthMatch[2]);
      const birthDay = Number(birthMatch[3]);
      const birthCheck = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));
      if (
        birthCheck.getUTCFullYear() !== birthYear ||
        birthCheck.getUTCMonth() !== birthMonth - 1 ||
        birthCheck.getUTCDate() !== birthDay
      ) return null;

      let referenceYear;
      let referenceMonth;
      let referenceDay;
      if (typeof refDate === "string") {
        const referenceMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(refDate);
        if (!referenceMatch) return null;
        referenceYear = Number(referenceMatch[1]);
        referenceMonth = Number(referenceMatch[2]);
        referenceDay = Number(referenceMatch[3]);
      } else if (refDate && typeof refDate.getFullYear === "function") {
        referenceYear = refDate.getFullYear();
        referenceMonth = refDate.getMonth() + 1;
        referenceDay = refDate.getDate();
      } else {
        return null;
      }

      let age = referenceYear - birthYear;
      const monthDifference = referenceMonth - birthMonth;
      if (monthDifference < 0 || (monthDifference === 0 && referenceDay < birthDay)) age--;
      return age > 0 ? age : null;
    }
    /**
     * Resolves the daily calorie adjustment from manual or goal-duration preferences.
     *
     * @param {Object} prefs Nutrition-goal preferences.
     * @returns {number} Rounded daily calorie adjustment.
     */
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
    /**
     * Returns the default protein multiplier for a nutritional goal type.
     *
     * @param {string} goalType Goal type such as maintenance, loss, or gain.
     * @returns {number} Protein grams per kilogram multiplier.
     */
    function defaultProteinMultiplier(goalType) {
      return goalType === "loss" ? 2.0 : goalType === "gain" ? 2.2 : 1.6;
    }
    /**
     * Resolves the protein multiplier from manual or goal-specific preferences.
     *
     * @param {Object} prefs Nutrition-goal preferences.
     * @returns {number} Protein grams per kilogram multiplier.
     */
    function getProteinMultiplier(prefs) {
      const manual = prefs && prefs.proteinMultiplier !== "" && prefs.proteinMultiplier != null ? Number(prefs.proteinMultiplier) : null;
      return Number.isFinite(manual) && manual > 0 ? manual : defaultProteinMultiplier(prefs?.goalType);
    }
    /**
     * Computes daily nutritional goals for a weight, day type, and optional profile.
     *
     * @param {number|string} weight Body weight in kilograms.
     * @param {boolean} train Whether the day is a training day.
     * @param {Object} [profile={}] Profile data used for personalized calculations.
     * @param {number|string} [profile.height] Height in centimeters.
     * @param {string} [profile.birthDate] Birth date in `YYYY-MM-DD` format.
     * @param {string} [profile.gender] Profile gender used by the BMR formula.
     * @param {string} [profile.referenceDate] Goal reference date in `YYYY-MM-DD` format.
     * @param {Object} [profile.prefs] Nutrition and activity preferences.
     * @returns {Object} Daily nutrient goals and, when available, calculation metadata.
     */
    function computeGoals(weight, train, profile = {}) {
      const height = Number(profile.height);
      const referenceDate = profile.referenceDate || new Date();
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

    return {
      ACTIVITY_LEVELS,
      REST_FACTORS,
      calculateAge,
      getGoalAdjustment,
      defaultProteinMultiplier,
      getProteinMultiplier,
      computeGoals
    };
  }

  return { createGoalCalculator };
});
