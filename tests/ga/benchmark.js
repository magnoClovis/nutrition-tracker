#!/usr/bin/env node

/**
 * Runs statistical benchmarks for meal-suggestion algorithms.
 *
 * Usage:
 *   node tests/ga/benchmark.js
 *   node tests/ga/benchmark.js --runs 200 --seed 42
 *
 * Outputs:
 *   tests/ga/results/ga-benchmark-summary.csv
 *   tests/ga/results/ga-benchmark-results.json
 */

const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const {
  evaluateSuggestion,
  runBaselineGA,
  runCappedGA,
  runBeamSearch
} = require("./algorithms");
const { scenarios } = require("./scenarios");

const algorithms = [
  { id: "baseline", run: runBaselineGA },
  { id: "capped-ga", run: runCappedGA },
  { id: "beam-search", run: runBeamSearch }
];

function parseArgs(argv) {
  const args = {
    runs: 50,
    seed: 12345,
    scenario: null,
    algorithm: null
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--runs") args.runs = Number(argv[++i]) || args.runs;
    else if (arg === "--seed") args.seed = Number(argv[++i]) || args.seed;
    else if (arg === "--scenario") args.scenario = argv[++i];
    else if (arg === "--algorithm") args.algorithm = argv[++i];
  }

  return args;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function summarize(rows) {
  const groups = new Map();

  rows.forEach(row => {
    const key = `${row.scenarioId}::${row.algorithmId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  return [...groups.entries()].map(([key, group]) => {
    const [scenarioId, algorithmId] = key.split("::");
    const validRows = group.filter(row => row.valid);
    const absurdRows = group.filter(row => row.reason === "portion-too-large" || row.reason === "kcal-too-high");
    const noSolutionRows = group.filter(row => row.reason === "no-solution");

    return {
      scenarioId,
      algorithmId,
      runs: group.length,
      successRate: validRows.length / group.length,
      absurdRate: absurdRows.length / group.length,
      noSolutionRate: noSolutionRows.length / group.length,
      avgTimeMs: mean(group.map(row => row.timeMs)),
      p95TimeMs: percentile(group.map(row => row.timeMs), 95),
      avgAbsKcalError: mean(validRows.map(row => Math.abs(row.kcalError))),
      avgAbsProteinError: mean(validRows.map(row => Math.abs(row.proteinError))),
      bestFit: Math.min(...group.map(row => Number.isFinite(row.fit) ? row.fit : Infinity)),
      worstKcal: Math.max(...group.map(row => row.kcal || 0)),
      worstProtein: Math.max(...group.map(row => row.protein || 0)),
      sampleBest: validRows[0]?.items || group[0]?.items || ""
    };
  });
}

function writeOutputs(summary, rows) {
  const outputDir = path.join(__dirname, "results");
  fs.mkdirSync(outputDir, { recursive: true });

  const csvHeaders = [
    "scenarioId",
    "algorithmId",
    "runs",
    "successRate",
    "absurdRate",
    "noSolutionRate",
    "avgTimeMs",
    "p95TimeMs",
    "avgAbsKcalError",
    "avgAbsProteinError",
    "bestFit",
    "worstKcal",
    "worstProtein",
    "sampleBest"
  ];

  const csv = [
    csvHeaders.join(","),
    ...summary.map(row => csvHeaders.map(header => {
      const value = typeof row[header] === "number" ? Number(row[header].toFixed(4)) : row[header];
      return csvEscape(value);
    }).join(","))
  ].join("\n");

  fs.writeFileSync(path.join(outputDir, "ga-benchmark-summary.csv"), csv, "utf8");
  fs.writeFileSync(path.join(outputDir, "ga-benchmark-results.json"), JSON.stringify({ summary, rows }, null, 2), "utf8");
}

function printSummary(summary) {
  const table = summary.map(row => ({
    scenario: row.scenarioId,
    algorithm: row.algorithmId,
    success: `${Math.round(row.successRate * 100)}%`,
    absurd: `${Math.round(row.absurdRate * 100)}%`,
    noSolution: `${Math.round(row.noSolutionRate * 100)}%`,
    avgMs: Math.round(row.avgTimeMs),
    kcalErr: Math.round(row.avgAbsKcalError),
    protErr: Math.round(row.avgAbsProteinError),
    worstKcal: row.worstKcal
  }));

  console.table(table);
}

function main() {
  const args = parseArgs(process.argv);
  const selectedScenarios = args.scenario
    ? scenarios.filter(scenario => scenario.id === args.scenario)
    : scenarios;
  const selectedAlgorithms = args.algorithm
    ? algorithms.filter(algorithm => algorithm.id === args.algorithm)
    : algorithms;

  if (!selectedScenarios.length) {
    throw new Error(`No scenario found for: ${args.scenario}`);
  }
  if (!selectedAlgorithms.length) {
    throw new Error(`No algorithm found for: ${args.algorithm}`);
  }

  const rows = [];

  for (const scenario of selectedScenarios) {
    for (const algorithm of selectedAlgorithms) {
      for (let runIndex = 0; runIndex < args.runs; runIndex += 1) {
        const seed = args.seed + runIndex;
        const start = performance.now();
        const result = algorithm.run(scenario.input, { seed, solutionCount: 5 });
        const timeMs = performance.now() - start;
        const best = result.suggestions[0] || null;
        const evaluation = evaluateSuggestion(best, result.meta.inputs || scenario.input);

        rows.push({
          scenarioId: scenario.id,
          algorithmId: algorithm.id,
          runIndex,
          seed,
          timeMs,
          valid: evaluation.valid,
          reason: evaluation.reason,
          fit: best?.fit ?? null,
          kcal: best?.kcal ?? 0,
          protein: best?.protein ?? 0,
          kcalError: evaluation.kcalError ?? 0,
          proteinError: evaluation.proteinError ?? 0,
          items: best?.items
            ? best.items.map(item => `${item.food.name}:${item.quantity}${item.food.unit === "un" ? "un" : "g"}`).join("; ")
            : ""
        });
      }
    }
  }

  const summary = summarize(rows);
  writeOutputs(summary, rows);
  printSummary(summary);

  console.log("");
  console.log("Saved:");
  console.log(path.join(__dirname, "results", "ga-benchmark-summary.csv"));
  console.log(path.join(__dirname, "results", "ga-benchmark-results.json"));
}

main();
