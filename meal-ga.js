/**
 * Genetic-algorithm meal suggestion and diary-entry application helpers.
 *
 * The UMD module exposes a `createMealGA` factory. The host injects the real
 * `MealScore` API from `meal-score.js`, `buildEntry` from `food-entry.js`, the
 * active-log updater owned by React, `Math.random` (or a deterministic test
 * RNG), and the browser timer used to yield every 20 generations. Plain pantry,
 * log, goal, and GA-option objects enter the public functions; they return
 * automatic limits, suggestion results, or the selected persisted meal key.
 * Progress and partial solutions are reported through explicit callbacks.
 *
 * This production module is intentionally separate from
 * `tests/ga/algorithms.js`. That file contains independent benchmark
 * implementations and does not test or share source with this algorithm.
 *
 * KNOWN BEHAVIOR DELIBERATELY PRESERVED: `proteinTolerance` is accepted but has
 * no effect; closing the host UI does not cancel a running search; absent
 * pantry, active-log, or goals objects retain their existing TypeErrors.
 * Applying a result is deliberately one functional update so all suggested
 * items enter the same atomic granular persistence batch.
 *
 * @module MealGA
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MealGA = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the meal-suggestion API with production services supplied by the host.
   *
   * @param {Object} dependencies Injected algorithm and diary dependencies.
   * @param {function(Object,number): Object} dependencies.buildEntry Converts a food and quantity into a diary entry.
   * @param {function(function(Object): Object): void} dependencies.updateActiveLog Applies one functional active-log update.
   * @param {function(): number} dependencies.random Random-number source; production supplies `Math.random`.
   * @param {function(function(): void,number): *} dependencies.setTimeout Timer used for the existing zero-delay event-loop yield.
   * @returns {{getAutomaticMealSuggestionLimits: function(Object): Object, runGA: function(Object): Promise<Object>, addGAResultToDiary: function(Object): string}} Configured meal-suggestion API.
   */
  function createMealGA({ buildEntry, updateActiveLog, random, setTimeout: scheduleTimeout }) {
    if (typeof buildEntry !== "function" || typeof updateActiveLog !== "function" ||
        typeof random !== "function" || typeof scheduleTimeout !== "function") {
      throw new TypeError("MealGA requires buildEntry, updateActiveLog, random, and setTimeout functions");
    }

    /**
     * Calculates automatic calorie and protein limits for one meal at a given local time.
     *
     * @param {Object} input Automatic-limit inputs.
     * @param {Object} input.activeLog Active diary log whose entries are already consumed.
     * @param {Object} input.goals Active nutritional goals.
     * @param {number|string} input.tolerance Meal-size adjustment percentage.
     * @param {Date} [input.now=new Date()] Local reference time.
     * @returns {{remainingProtein:number,remainingKcal:number,hoursLeft:number,timeShare:number,proteinMax:number,kcalMax:number}} Remaining budget and automatic per-meal limits.
     */
    function getAutomaticMealSuggestionLimits({ activeLog, goals, tolerance, now = new Date() }) {
      const entries = Object.values(activeLog).flat();
      const eatenProtein = entries.reduce((sum, entry) => sum + (Number(entry.protein) || 0), 0);
      const eatenKcal = entries.reduce((sum, entry) => sum + (Number(entry.kcal) || 0), 0);
      const remainingProtein = Math.max(0, (Number(goals.protein) || 150) - eatenProtein);
      const remainingKcal = Math.max(0, (Number(goals.kcal) || 2000) - eatenKcal);
      const current = now instanceof Date ? now : new Date(now || Date.now());
      const midnight = new Date(current);
      midnight.setHours(24, 0, 0, 0);
      const hoursLeft = Math.max(0, (midnight.getTime() - current.getTime()) / 3600000);
      // Explicit GA v1 allocation contract. MealScore calibration changes must
      // never alter pantry suggestions as an accidental side effect.
      const timeShare = Math.min(1, 3 / Math.max(0.25, hoursLeft));
      const sizeMultiplier = Math.max(0.2, 1 + tolerance / 100);
      return {
        remainingProtein,
        remainingKcal,
        hoursLeft,
        timeShare,
        proteinMax: Math.max(5, Math.round(remainingProtein * timeShare * sizeMultiplier)),
        kcalMax: Math.max(50, Math.round(remainingKcal * timeShare * sizeMultiplier))
      };
    }

    /**
     * Runs the production genetic algorithm and reports progress and partial results.
     *
     * @param {Object} input Search inputs and callbacks.
     * @param {Array<Object>} input.pantry Current pantry foods.
     * @param {Object} input.activeLog Current active diary log.
     * @param {Object} input.goals Current nutritional goals.
     * @param {boolean} input.useAll Whether every pantry food is eligible.
     * @param {Object<string,boolean>} input.selectedIds Explicit food selections when `useAll` is false.
     * @param {Object<string,{min?:number,max?:number}>} input.limits Per-food gene limits.
     * @param {number|string} input.globalMax Default maximum genes per food.
     * @param {number|string} input.tolerance Automatic meal-size adjustment percentage.
     * @param {boolean} input.useProteinTolerance Whether the existing asymmetric protein fitness is enabled.
     * @param {number|string} input.proteinTolerance Preserved UI value that intentionally has no algorithmic effect.
     * @param {number|string} input.kcalMin Optional absolute calorie minimum.
     * @param {number|string} input.kcalMax Optional absolute calorie maximum.
     * @param {number|string} input.proteinMin Optional absolute protein minimum.
     * @param {number|string} input.proteinMax Optional absolute protein maximum.
     * @param {Date} [input.now=new Date()] Local time used by automatic limits.
     * @param {function(number): void} input.onProgress Receives periodic progress below 100 percent.
     * @param {function(Array<Object>): void} input.onResults Receives sorted partial or fallback results.
     * @returns {Promise<{status:"success"|"empty-pantry"|"no-solution",solutions:Array<Object>}>} Search status and final solution collection.
     */
    async function runGA({
      pantry,
      activeLog,
      goals,
      useAll,
      selectedIds,
      limits,
      globalMax,
      tolerance,
      useProteinTolerance,
      proteinTolerance,
      kcalMin,
      kcalMax,
      proteinMin,
      proteinMax,
      now,
      onProgress,
      onResults
    }) {
      void proteinTolerance;
      if (typeof onProgress !== "function" || typeof onResults !== "function") {
        throw new TypeError("MealGA runGA requires onProgress and onResults callbacks");
      }

      const foods = pantry.filter(food =>
        useAll ? true : selectedIds[food.id]
      ).filter(food => (food.protein100 ?? 0) > 0 || (food.kcal100 ?? 0) > 0);

      if (foods.length === 0) {
        return { status: "empty-pantry", solutions: [] };
      }

      const automaticLimits = getAutomaticMealSuggestionLimits({ activeLog, goals, tolerance, now });
      const readLimit = value => {
        if (value === "" || value === null || value === undefined) return null;
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
      };
      const kcalMinLimit = readLimit(kcalMin);
      const kcalMaxLimit = readLimit(kcalMax);
      const protMinLimit = readLimit(proteinMin);
      const protMaxLimit = readLimit(proteinMax);
      const hasKcalMin = kcalMinLimit !== null;
      const hasKcalMax = kcalMaxLimit !== null;
      const hasProtMin = protMinLimit !== null;
      const hasProtMax = protMaxLimit !== null;
      const kcalBudget = hasKcalMax ? kcalMaxLimit : automaticLimits.kcalMax;
      const targetProt = hasProtMax ? protMaxLimit : automaticLimits.proteinMax;
      const effectiveProtMax = targetProt;
      const protBudget = effectiveProtMax;

      const computeSuggestionBounds = () => {
        const fallbackGeneCap = food => food.unit === "un" ? 100 : 20;
        const safeInt = (value, fallback) => {
          const number = Number(value);
          return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
        };

        return foods.map(food => {
          const manual = limits[food.id] || {};
          const userMax = safeInt(manual.max ?? globalMax, 5);
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

          if (!usedVariableCap) maxCandidates.push(fallbackGeneCap(food));

          const max = Math.max(0, Math.min(...maxCandidates.filter(Number.isFinite)));
          const min = Math.min(userMin, max);
          return { min, max };
        });
      };

      const bounds = computeSuggestionBounds();
      const geneMax = index => bounds[index]?.max ?? 0;
      const geneMin = index => bounds[index]?.min ?? 0;
      const safeRound = value => {
        const number = Number(value);
        return Number.isFinite(number) ? Math.round(number) : 0;
      };
      const clampGene = (value, index) => Math.max(geneMin(index), Math.min(geneMax(index), safeRound(value)));
      const randGene = index => {
        const min = geneMin(index);
        const max = geneMax(index);
        if (max <= min) return min;
        return min + Math.floor(random() * (max - min + 1));
      };

      const totals = genes => {
        let protein = 0;
        let calories = 0;
        let carbs = 0;
        let fat = 0;
        genes.forEach((gene, index) => {
          protein += (Number(foods[index].protein100) || 0) * gene;
          calories += (Number(foods[index].kcal100) || 0) * gene;
          carbs += (Number(foods[index].carbs100) || 0) * gene;
          fat += (Number(foods[index].fat100) || 0) * gene;
        });
        return { protein, kcal: calories, carbs, fat };
      };

      const intervalPen = (value, low, high, hardness) => {
        if (value < low) return hardness * (low - value) / Math.max(low, 1);
        if (value > high) return hardness * (value - high) / Math.max(high, 1);
        return 0;
      };

      const kcalLo = hasKcalMin ? kcalMinLimit : 0;
      const kcalHi = kcalBudget;
      const protLo = hasProtMin ? protMinLimit : 0;
      const protHi = effectiveProtMax;
      const hasAbsLimits = hasKcalMin || hasKcalMax || hasProtMin || hasProtMax;

      const fitness = genes => {
        const total = totals(genes);
        if (genes.every(gene => gene === 0)) return 999;

        if (hasAbsLimits) {
          const kcalPenalty = intervalPen(total.kcal,
            hasKcalMin ? kcalLo : Math.max(0, kcalHi * 0.2),
            hasKcalMax ? kcalHi : kcalBudget,
            8);
          const proteinPenalty = intervalPen(total.protein,
            hasProtMin ? protLo : (useProteinTolerance ? 0 : targetProt * 0.5),
            protHi,
            8);
          const kcalMid = ((hasKcalMin ? kcalLo : kcalHi * 0.2) + (hasKcalMax ? kcalHi : kcalBudget)) / 2;
          const proteinMid = ((hasProtMin ? protLo : targetProt * 0.5) + protHi) / 2;
          const kcalCenter = 0.1 * Math.abs(total.kcal - kcalMid) / Math.max(kcalMid, 1);
          const proteinCenter = 0.1 * Math.abs(total.protein - proteinMid) / Math.max(proteinMid, 1);
          return kcalPenalty + proteinPenalty + kcalCenter + proteinCenter;
        }

        const proteinDeviation = useProteinTolerance
          ? (total.protein > protBudget
              ? 10 * (total.protein - protBudget) / Math.max(protBudget, 1)
              : Math.abs(total.protein - targetProt) / Math.max(targetProt, 1))
          : Math.abs(total.protein - targetProt) / Math.max(targetProt, 1);
        const kcalPenalty = total.kcal > kcalBudget
          ? 10 * (total.kcal - kcalBudget) / Math.max(kcalBudget, 1)
          : 0.3 * (1 - total.kcal / Math.max(kcalBudget, 1));
        return proteinDeviation + kcalPenalty;
      };

      const foodCount = foods.length;
      const populationSize = Math.min(200, Math.max(80, foodCount * 7));
      const stagnationLimit = Math.max(150, foodCount * 20);
      const generationsPerRestart = Math.max(600, foodCount * 60);
      const maxRestarts = foodCount <= 10 ? 3 : foodCount <= 20 ? 4 : 5;
      const stopFit = Math.min(0.18, 0.06 + foodCount * 0.004);
      const mutationRate = 0.15;
      const solutionCount = 5;

      const solutions = [];
      const solutionKeys = new Set();
      let bestFit = Infinity;
      let bestIndividual = null;

      const solutionKey = genes => genes.join(",");
      const isSolutionAllowed = genes => {
        if (!genes.some(gene => gene > 0)) return false;
        const total = totals(genes);
        if (hasKcalMin && total.kcal < kcalMinLimit) return false;
        if (total.kcal > kcalBudget) return false;
        if (hasProtMin && total.protein < protMinLimit) return false;
        if (total.protein > effectiveProtMax) return false;
        return genes.every((gene, index) => gene >= geneMin(index) && gene <= geneMax(index));
      };

      const makeSolution = individual => {
        const total = totals(individual.genes);
        return {
          genes: individual.genes,
          fit: individual.fit,
          protein: Math.round(total.protein),
          kcal: Math.round(total.kcal),
          carbs: Math.round(total.carbs),
          fat: Math.round(total.fat),
          items: foods.map((food, index) => ({ food, gene: individual.genes[index] })).filter(item => item.gene > 0)
        };
      };

      const select = population => {
        population.sort((a, b) => a.fit - b.fit);
        return population.slice(0, Math.floor(population.length / 2));
      };

      const cross = (first, second) => {
        const point = Math.floor(random() * first.genes.length);
        const genes = [...first.genes.slice(0, point), ...second.genes.slice(point)]
          .map((gene, index) => clampGene(gene, index));
        return { genes, fit: fitness(genes) };
      };

      const mutate = individual => {
        const genes = [...individual.genes];
        if (random() > 0.5) {
          const swaps = Math.max(1, Math.floor(genes.length * 0.1));
          for (let index = 0; index < swaps; index++) {
            const first = Math.floor(random() * genes.length);
            const second = Math.floor(random() * genes.length);
            [genes[first], genes[second]] = [genes[second], genes[first]];
          }
        } else {
          const changes = Math.floor(random() * Math.ceil(genes.length / 2)) + 1;
          for (let index = 0; index < changes; index++) {
            const geneIndex = Math.floor(random() * genes.length);
            const next = randGene(geneIndex);
            genes[geneIndex] = clampGene(Math.abs(genes[geneIndex] - next), geneIndex);
          }
        }
        return { genes, fit: fitness(genes) };
      };

      let totalGenerations = 0;
      const totalGenerationsEstimate = maxRestarts * generationsPerRestart;

      for (let restart = 0; restart < maxRestarts; restart++) {
        let population = Array.from({ length: populationSize }, (_, populationIndex) => {
          if (populationIndex === 0 && bestIndividual) return bestIndividual;
          const genes = foods.map((_, foodIndex) => randGene(foodIndex));
          return { genes, fit: fitness(genes) };
        });

        let stagnationCount = 0;
        let restartBestFit = bestFit;

        for (let generation = 0; generation < generationsPerRestart; generation++) {
          totalGenerations++;

          if (totalGenerations % 20 === 0) {
            onProgress(Math.min(99, Math.round(totalGenerations / totalGenerationsEstimate * 100)));
            await new Promise(resolve => scheduleTimeout(resolve, 0));
          }

          const parents = select([...population]);
          const generationBest = parents[0].fit;

          if (generationBest < bestFit) {
            bestFit = generationBest;
            bestIndividual = parents[0];
          }

          if (generationBest < restartBestFit - 0.001) {
            restartBestFit = generationBest;
            stagnationCount = 0;
          } else {
            stagnationCount++;
          }

          for (const individual of parents) {
            if (individual.fit < stopFit) {
              const key = solutionKey(individual.genes);
              if (!solutionKeys.has(key) && isSolutionAllowed(individual.genes)) {
                solutionKeys.add(key);
                solutions.push(makeSolution(individual));
                solutions.sort((a, b) => a.fit - b.fit);
                onResults([...solutions].slice(0, solutionCount));
              }
            }
          }

          if (solutions.length >= solutionCount && bestFit < stopFit) break;
          if (stagnationCount >= stagnationLimit) break;

          const children = parents.map(() => {
            const firstIndex = Math.floor(random() * parents.length);
            let secondIndex;
            do {
              secondIndex = Math.floor(random() * parents.length);
            } while (secondIndex === firstIndex && parents.length > 1);
            const child = cross(parents[firstIndex], parents[secondIndex]);
            return random() < mutationRate ? mutate(child) : child;
          });
          population = [...parents, ...children];
        }

        if (solutions.length >= solutionCount && bestFit < stopFit) break;
      }

      if (solutions.length === 0 && bestIndividual && isSolutionAllowed(bestIndividual.genes)) {
        solutions.push(makeSolution(bestIndividual));
        onResults(solutions);
      }

      return {
        status: solutions.length ? "success" : "no-solution",
        solutions
      };
    }

    /**
     * Converts one GA result into diary entries and applies one functional batch update.
     *
     * @param {Object} input Diary-application inputs.
     * @param {{items:Array<{food:Object,gene:number}>}} input.result Selected GA result.
     * @param {string} input.targetMeal Explicit persisted meal key, if selected.
     * @param {Array<string>} input.meals Ordered persisted meal keys used for the existing lunch fallback.
     * @returns {string} Persisted meal key that received the entries.
     */
    function addGAResultToDiary({ result, targetMeal, meals }) {
      const meal = targetMeal || meals[1];
      const entries = result.items.map(({ food, gene }) => {
        const quantity = food.unit === "un" ? gene : gene * 100;
        return buildEntry(food, quantity);
      });
      updateActiveLog(previous => ({
        ...previous,
        [meal]: [...(previous[meal] || []), ...entries]
      }));
      return meal;
    }

    return {
      getAutomaticMealSuggestionLimits,
      runGA,
      addGAResultToDiary
    };
  }

  return { createMealGA };
});
