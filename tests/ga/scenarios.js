/**
 * Benchmark scenarios for meal-suggestion algorithms.
 *
 * Keep these scenarios varied: normal days, constrained days, sparse pantries,
 * and intentionally hostile inputs. That makes regressions visible before any
 * algorithm reaches the production app.
 */

const pantryBalanced = [
  { id: "oats", name: "Aveia", unit: "g", protein100: 13, kcal100: 380, carbs100: 67, fat100: 7 },
  { id: "milk", name: "Leite proteico", unit: "ml", protein100: 8, kcal100: 45, carbs100: 4, fat100: 1 },
  { id: "banana", name: "Banana", unit: "g", protein100: 1.1, kcal100: 89, carbs100: 23, fat100: 0.3 },
  { id: "chicken", name: "Frango grelhado", unit: "g", protein100: 31, kcal100: 165, carbs100: 0, fat100: 3.6 },
  { id: "rice", name: "Arroz cozido", unit: "g", protein100: 2.7, kcal100: 130, carbs100: 28, fat100: 0.3 },
  { id: "beans", name: "Feijao", unit: "g", protein100: 8.7, kcal100: 132, carbs100: 24, fat100: 0.5 },
  { id: "egg", name: "Ovo", unit: "un", protein100: 6.3, kcal100: 72, carbs100: 0.4, fat100: 5 },
  { id: "yogurt", name: "Iogurte", unit: "g", protein100: 10, kcal100: 60, carbs100: 3.6, fat100: 0.4 },
  { id: "whey", name: "Whey", unit: "g", protein100: 80, kcal100: 400, carbs100: 8, fat100: 6 },
  { id: "olive-oil", name: "Azeite", unit: "g", protein100: 0, kcal100: 884, carbs100: 0, fat100: 100 },
  { id: "bread", name: "Pao", unit: "un", protein100: 4, kcal100: 130, carbs100: 24, fat100: 2 },
  { id: "apple", name: "Maca", unit: "g", protein100: 0.3, kcal100: 52, carbs100: 14, fat100: 0.2 }
];

const pantrySparse = [
  { id: "acai", name: "Acai", unit: "g", protein100: 2.3, kcal100: 320, carbs100: 36, fat100: 18 },
  { id: "banana", name: "Banana", unit: "g", protein100: 1.1, kcal100: 89, carbs100: 23, fat100: 0.3 },
  { id: "whey", name: "Whey", unit: "g", protein100: 80, kcal100: 400, carbs100: 8, fat100: 6 }
];

const pantryLowProtein = [
  { id: "jam", name: "Geleia", unit: "g", protein100: 0.5, kcal100: 195, carbs100: 48, fat100: 0.1 },
  { id: "bread", name: "Pao", unit: "un", protein100: 4, kcal100: 130, carbs100: 24, fat100: 2 },
  { id: "banana", name: "Banana", unit: "g", protein100: 1.1, kcal100: 89, carbs100: 23, fat100: 0.3 },
  { id: "rice", name: "Arroz", unit: "g", protein100: 2.7, kcal100: 130, carbs100: 28, fat100: 0.3 }
];

const baseConstraints = {
  targetProtein: 80,
  targetKcal: 650,
  tolerancePercent: 0,
  globalMax: 5,
  useProteinTolerance: false
};

const scenarios = [
  {
    id: "normal-balanced",
    description: "Balanced pantry, normal meal target.",
    input: {
      ...baseConstraints,
      foods: pantryBalanced
    }
  },
  {
    id: "protein-priority",
    description: "Explicit protein minimum with reasonable calorie maximum.",
    input: {
      ...baseConstraints,
      foods: pantryBalanced,
      targetProtein: 90,
      targetKcal: 800,
      kcalMax: 850,
      proteinMin: 55
    }
  },
  {
    id: "aggressive-deficit",
    description: "Low calorie budget with a still meaningful protein target.",
    input: {
      ...baseConstraints,
      foods: pantryBalanced,
      targetProtein: 70,
      targetKcal: 420,
      tolerancePercent: -10,
      kcalMax: 450,
      proteinMin: 35
    }
  },
  {
    id: "sparse-pantry",
    description: "Only three foods available.",
    input: {
      ...baseConstraints,
      foods: pantrySparse,
      targetProtein: 45,
      targetKcal: 500,
      kcalMax: 650,
      proteinMin: 25
    }
  },
  {
    id: "low-protein-pantry",
    description: "Pantry mostly lacks protein; should fail gracefully if needed.",
    input: {
      ...baseConstraints,
      foods: pantryLowProtein,
      targetProtein: 80,
      targetKcal: 700,
      kcalMax: 800,
      proteinMin: 55
    }
  },
  {
    id: "hostile-global-max",
    description: "Extreme max quantity typed by the user.",
    input: {
      ...baseConstraints,
      foods: pantrySparse,
      targetProtein: 160,
      targetKcal: 1675,
      tolerancePercent: -40,
      kcalMax: 1005,
      proteinMin: 80,
      proteinMax: 240,
      globalMax: 588888878587
    }
  },
  {
    id: "impossible-hard-limits",
    description: "Conflicting limits that should return no acceptable solution.",
    input: {
      ...baseConstraints,
      foods: pantryLowProtein,
      targetProtein: 120,
      targetKcal: 300,
      kcalMax: 300,
      proteinMin: 100
    }
  }
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { scenarios };
} else if (typeof window !== "undefined") {
  window.GAScenarios = { scenarios };
}
