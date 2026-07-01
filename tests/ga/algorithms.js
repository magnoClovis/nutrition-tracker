/**
 * Meal suggestion algorithms used only by the benchmark harness.
 *
 * These functions intentionally do not import React or app state. Keep them as
 * pure functions so candidate strategies can be tested statistically before
 * changing the production algorithm in app.js.
 */

const DEFAULT_OPTIONS = {
  populationSize: null,
  generationsPerRestart: null,
  maxRestarts: null,
  stagnationLimit: null,
  mutationRate: 0.15,
  stopFit: null,
  solutionCount: 5,
  seed: 12345
};

function createRng(seed = 12345) {
  let state = seed >>> 0;
  return function rng() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function readLimit(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeFood(food, index) {
  return {
    id: food.id || `food-${index}`,
    name: food.name || `Food ${index + 1}`,
    unit: food.unit || "g",
    protein100: Number(food.protein100) || 0,
    kcal100: Number(food.kcal100) || 0,
    carbs100: Number(food.carbs100) || 0,
    fat100: Number(food.fat100) || 0
  };
}

function prepareInputs(input) {
  const foods = (input.foods || [])
    .map(normalizeFood)
    .filter(food => food.protein100 > 0 || food.kcal100 > 0);

  const targetProtein = Math.max(10, Number(input.targetProtein) || 150);
  const targetKcal = Math.max(50, Number(input.targetKcal) || 2000);
  const tolerancePercent = Number(input.tolerancePercent) || 0;

  return {
    foods,
    targetProtein,
    targetKcal,
    tolerancePercent,
    kcalBudget: targetKcal * (1 + tolerancePercent / 100),
    kcalMin: readLimit(input.kcalMin),
    kcalMax: readLimit(input.kcalMax),
    proteinMin: readLimit(input.proteinMin),
    proteinMax: readLimit(input.proteinMax),
    useProteinTolerance: !!input.useProteinTolerance,
    proteinTolerancePercent: Number(input.proteinTolerancePercent) || 0,
    globalMax: input.globalMax,
    perFoodLimits: input.perFoodLimits || {}
  };
}

function makeTotals(foods) {
  return function totals(genes) {
    return genes.reduce((acc, gene, index) => {
      const food = foods[index];
      acc.protein += food.protein100 * gene;
      acc.kcal += food.kcal100 * gene;
      acc.carbs += food.carbs100 * gene;
      acc.fat += food.fat100 * gene;
      return acc;
    }, { protein: 0, kcal: 0, carbs: 0, fat: 0 });
  };
}

function createFitness(inputs, totals) {
  const {
    targetProtein,
    kcalBudget,
    kcalMin,
    kcalMax,
    proteinMin,
    proteinMax,
    useProteinTolerance,
    proteinTolerancePercent
  } = inputs;

  const hasKcalMin = kcalMin !== null;
  const hasKcalMax = kcalMax !== null;
  const hasProteinMin = proteinMin !== null;
  const hasProteinMax = proteinMax !== null;
  const hasAbsoluteLimits = hasKcalMin || hasKcalMax || hasProteinMin || hasProteinMax;
  const proteinBudget = useProteinTolerance
    ? targetProtein * (1 + proteinTolerancePercent / 100)
    : Infinity;

  function intervalPenalty(value, low, high, hardness) {
    if (value < low) return hardness * (low - value) / Math.max(low, 1);
    if (value > high) return hardness * (value - high) / Math.max(high, 1);
    return 0;
  }

  return function fitness(genes) {
    if (genes.every(gene => gene === 0)) return 999;
    const total = totals(genes);

    if (hasAbsoluteLimits) {
      const kcalHigh = hasKcalMax ? kcalMax : kcalBudget;
      const kcalLow = hasKcalMin ? kcalMin : Math.max(0, kcalHigh * 0.2);
      const proteinHigh = hasProteinMax
        ? proteinMax
        : (useProteinTolerance ? proteinBudget : targetProtein * 1.5);
      const proteinLow = hasProteinMin
        ? proteinMin
        : (useProteinTolerance ? 0 : targetProtein * 0.5);

      const kcalPenalty = intervalPenalty(total.kcal, kcalLow, kcalHigh, 8);
      const proteinPenalty = intervalPenalty(total.protein, proteinLow, proteinHigh, 8);
      const kcalMid = (kcalLow + kcalHigh) / 2;
      const proteinMid = (proteinLow + proteinHigh) / 2;
      const kcalCenter = 0.1 * Math.abs(total.kcal - kcalMid) / Math.max(kcalMid, 1);
      const proteinCenter = 0.1 * Math.abs(total.protein - proteinMid) / Math.max(proteinMid, 1);

      return kcalPenalty + proteinPenalty + kcalCenter + proteinCenter;
    }

    const proteinDeviation = useProteinTolerance
      ? (total.protein > proteinBudget
        ? 10 * (total.protein - proteinBudget) / Math.max(proteinBudget, 1)
        : Math.abs(total.protein - targetProtein) / Math.max(targetProtein, 1))
      : Math.abs(total.protein - targetProtein) / Math.max(targetProtein, 1);

    const kcalPenalty = total.kcal > kcalBudget
      ? 10 * (total.kcal - kcalBudget) / Math.max(kcalBudget, 1)
      : 0.3 * (1 - total.kcal / Math.max(kcalBudget, 1));

    return proteinDeviation + kcalPenalty;
  };
}

function genesToSuggestion(foods, genes, fitness, totals, label) {
  const total = totals(genes);
  return {
    label,
    fit: Number(fitness(genes).toFixed(6)),
    kcal: Math.round(total.kcal),
    protein: Math.round(total.protein),
    carbs: Math.round(total.carbs),
    fat: Math.round(total.fat),
    items: foods
      .map((food, index) => ({ food, gene: genes[index], quantity: food.unit === "un" ? genes[index] : genes[index] * 100 }))
      .filter(item => item.gene > 0)
  };
}

function evaluateSuggestion(suggestion, inputs) {
  if (!suggestion) {
    return { valid: false, reason: "no-solution" };
  }

  const kcalHigh = inputs.kcalMax ?? inputs.kcalBudget;
  const kcalLow = inputs.kcalMin ?? 0;
  const proteinLow = inputs.proteinMin ?? 0;
  const proteinHigh = inputs.proteinMax ?? Infinity;
  const kcalHardHigh = Math.max(kcalHigh * 1.05, kcalHigh + 25);
  const kcalHardLow = Math.max(0, kcalLow - 25);
  const proteinHardLow = Math.max(0, proteinLow - 3);
  const proteinHardHigh = Number.isFinite(proteinHigh) ? proteinHigh + 3 : Infinity;

  const valid = suggestion.items.length > 0
    && suggestion.kcal >= kcalHardLow
    && suggestion.kcal <= kcalHardHigh
    && suggestion.protein >= proteinHardLow
    && suggestion.protein <= proteinHardHigh
    && suggestion.items.every(item => item.quantity <= (item.food.unit === "un" ? 30 : 3000));

  let reason = "ok";
  if (!valid && suggestion.kcal > kcalHardHigh) reason = "kcal-too-high";
  else if (!valid && suggestion.protein > proteinHardHigh) reason = "protein-too-high";
  else if (!valid && suggestion.items.some(item => item.quantity > (item.food.unit === "un" ? 30 : 3000))) reason = "portion-too-large";
  else if (!valid && suggestion.items.length === 0) reason = "empty";
  else if (!valid) reason = "outside-limits";

  return {
    valid,
    reason,
    kcalError: Math.round(suggestion.kcal - (inputs.kcalMax ?? inputs.kcalBudget)),
    proteinError: Math.round(suggestion.protein - Math.max(inputs.proteinMin ?? inputs.targetProtein, 0))
  };
}

function runBaselineGA(rawInput, rawOptions = {}) {
  const inputs = prepareInputs(rawInput);
  const options = { ...DEFAULT_OPTIONS, ...rawOptions };
  const rng = createRng(options.seed);
  const totals = makeTotals(inputs.foods);
  const fitness = createFitness(inputs, totals);
  const foodCount = inputs.foods.length;

  if (foodCount === 0) {
    return { suggestions: [], meta: { reason: "no-foods" } };
  }

  const geneMin = index => inputs.perFoodLimits[inputs.foods[index]?.id]?.min ?? 0;
  const geneMax = index => inputs.perFoodLimits[inputs.foods[index]?.id]?.max ?? inputs.globalMax;
  const randGene = index => {
    const min = geneMin(index);
    const max = geneMax(index);
    return min + Math.floor(rng() * (max - min + 1));
  };

  const populationSize = options.populationSize ?? Math.min(200, Math.max(80, foodCount * 7));
  const stagnationLimit = options.stagnationLimit ?? Math.max(150, foodCount * 20);
  const generationsPerRestart = options.generationsPerRestart ?? Math.max(600, foodCount * 60);
  const maxRestarts = options.maxRestarts ?? (foodCount <= 10 ? 3 : foodCount <= 20 ? 4 : 5);
  const stopFit = options.stopFit ?? Math.min(0.18, 0.06 + foodCount * 0.004);

  const solutions = [];
  const solutionKeys = new Set();
  let bestFit = Infinity;
  let bestGenes = null;
  let generations = 0;

  const select = population => population.sort((a, b) => a.fit - b.fit).slice(0, Math.floor(population.length / 2));
  const key = genes => genes.join(",");

  const cross = (a, b) => {
    const point = Math.floor(rng() * a.length);
    const genes = [...a.slice(0, point), ...b.slice(point)];
    return { genes, fit: fitness(genes) };
  };

  const mutate = individual => {
    const genes = [...individual.genes];
    if (rng() > 0.5) {
      const swaps = Math.max(1, Math.floor(genes.length * 0.1));
      for (let i = 0; i < swaps; i += 1) {
        const a = Math.floor(rng() * genes.length);
        const b = Math.floor(rng() * genes.length);
        [genes[a], genes[b]] = [genes[b], genes[a]];
      }
    } else {
      const changes = Math.floor(rng() * Math.ceil(genes.length / 2)) + 1;
      for (let i = 0; i < changes; i += 1) {
        const index = Math.floor(rng() * genes.length);
        const next = Math.abs(genes[index] - randGene(index));
        genes[index] = Math.max(geneMin(index), Math.min(geneMax(index), next));
      }
    }
    return { genes, fit: fitness(genes) };
  };

  for (let restart = 0; restart < maxRestarts; restart += 1) {
    let population = Array.from({ length: populationSize }, (_, index) => {
      const genes = index === 0 && bestGenes ? bestGenes : inputs.foods.map((_, foodIndex) => randGene(foodIndex));
      return { genes, fit: fitness(genes) };
    });
    let restartBest = bestFit;
    let stagnant = 0;

    for (let gen = 0; gen < generationsPerRestart; gen += 1) {
      generations += 1;
      const parents = select([...population]);
      const best = parents[0];

      if (best.fit < bestFit) {
        bestFit = best.fit;
        bestGenes = best.genes;
      }

      if (best.fit < restartBest - 0.001) {
        restartBest = best.fit;
        stagnant = 0;
      } else {
        stagnant += 1;
      }

      for (const individual of parents) {
        if (individual.fit < stopFit && individual.genes.some(gene => gene > 0)) {
          const solutionKey = key(individual.genes);
          if (!solutionKeys.has(solutionKey)) {
            solutionKeys.add(solutionKey);
            solutions.push(genesToSuggestion(inputs.foods, individual.genes, fitness, totals, "baseline"));
          }
        }
      }

      if (solutions.length >= options.solutionCount && bestFit < stopFit) break;
      if (stagnant >= stagnationLimit) break;

      const children = parents.map(() => {
        const a = Math.floor(rng() * parents.length);
        let b;
        do {
          b = Math.floor(rng() * parents.length);
        } while (b === a && parents.length > 1);
        const child = cross(parents[a].genes, parents[b].genes);
        return rng() < options.mutationRate ? mutate(child) : child;
      });
      population = [...parents, ...children];
    }

    if (solutions.length >= options.solutionCount && bestFit < stopFit) break;
  }

  if (solutions.length === 0 && bestGenes && bestGenes.some(gene => gene > 0)) {
    solutions.push(genesToSuggestion(inputs.foods, bestGenes, fitness, totals, "baseline-fallback"));
  }

  return {
    suggestions: solutions.sort((a, b) => a.fit - b.fit).slice(0, options.solutionCount),
    meta: { generations, bestFit, inputs }
  };
}

function runCappedGA(rawInput, rawOptions = {}) {
  const inputs = prepareInputs(rawInput);
  const safeGlobalMax = clampNumber(inputs.globalMax, 1, 20, 5);
  const safeInput = { ...rawInput, globalMax: safeGlobalMax };
  const safeInputs = prepareInputs(safeInput);

  safeInputs.perFoodLimits = {};
  safeInputs.foods.forEach(food => {
    const kcalPerGene = Math.max(food.kcal100, 1);
    const maxByCalories = Math.ceil((safeInputs.kcalBudget * 1.25) / kcalPerGene);
    const hardCap = food.unit === "un" ? 20 : 30;
    safeInputs.perFoodLimits[food.id] = {
      min: 0,
      max: Math.max(1, Math.min(safeGlobalMax, maxByCalories, hardCap))
    };
  });

  const result = runBaselineGA({ ...safeInput, perFoodLimits: safeInputs.perFoodLimits }, {
    ...rawOptions,
    seed: rawOptions.seed ?? 12345
  });

  result.suggestions = result.suggestions.filter(suggestion => evaluateSuggestion(suggestion, safeInputs).valid);
  result.meta.inputs = safeInputs;
  result.meta.safeGlobalMax = safeGlobalMax;
  result.meta.strategy = "capped-ga";
  return result;
}

function runBeamSearch(rawInput, rawOptions = {}) {
  const inputs = prepareInputs(rawInput);
  const totals = makeTotals(inputs.foods);
  const fitness = createFitness(inputs, totals);
  const beamWidth = rawOptions.beamWidth || 250;
  const solutionCount = rawOptions.solutionCount || 5;
  const safeGlobalMax = clampNumber(inputs.globalMax, 1, 20, 5);
  const empty = { genes: Array(inputs.foods.length).fill(0), fit: 999 };
  let beam = [empty];

  if (inputs.foods.length === 0) {
    return { suggestions: [], meta: { reason: "no-foods" } };
  }

  inputs.foods.forEach((food, foodIndex) => {
    const kcalPerGene = Math.max(food.kcal100, 1);
    const maxByCalories = Math.ceil((inputs.kcalBudget * 1.25) / kcalPerGene);
    const hardCap = food.unit === "un" ? 20 : 30;
    const maxGene = Math.max(1, Math.min(safeGlobalMax, maxByCalories, hardCap));
    const candidates = [];

    for (const partial of beam) {
      for (let gene = 0; gene <= maxGene; gene += 1) {
        const genes = [...partial.genes];
        genes[foodIndex] = gene;
        candidates.push({ genes, fit: fitness(genes) });
      }
    }

    candidates.sort((a, b) => a.fit - b.fit);
    const seen = new Set();
    beam = [];
    for (const candidate of candidates) {
      const key = candidate.genes.join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      beam.push(candidate);
      if (beam.length >= beamWidth) break;
    }
  });

  const suggestions = beam
    .filter(candidate => candidate.genes.some(gene => gene > 0))
    .map(candidate => genesToSuggestion(inputs.foods, candidate.genes, fitness, totals, "beam-search"))
    .filter(suggestion => evaluateSuggestion(suggestion, inputs).valid)
    .sort((a, b) => a.fit - b.fit)
    .slice(0, solutionCount);

  return {
    suggestions,
    meta: {
      evaluatedApprox: beamWidth * inputs.foods.length,
      safeGlobalMax,
      inputs,
      strategy: "beam-search"
    }
  };
}

const exportedAlgorithms = {
  evaluateSuggestion,
  runBaselineGA,
  runCappedGA,
  runBeamSearch
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = exportedAlgorithms;
} else if (typeof window !== "undefined") {
  window.GAAlgorithms = exportedAlgorithms;
}
