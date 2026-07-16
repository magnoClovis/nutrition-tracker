(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GoalCalculator = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

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
