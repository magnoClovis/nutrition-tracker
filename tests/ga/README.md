# GA meal suggestion benchmark

This folder is intentionally separate from the app. It lets us compare meal
suggestion algorithms without touching the production UI.

## Run

### Browser, no install needed

Open:

```text
tests/ga/benchmark-browser.html
```

Then choose the number of runs, scenario, and algorithm. The page can download
JSON and CSV results. It starts with a small run count so the browser does not
freeze when running every scenario and algorithm at once.

### Node terminal

```powershell
node tests/ga/benchmark.js
```

Useful filters:

```powershell
node tests/ga/benchmark.js --runs 200
node tests/ga/benchmark.js --scenario hostile-global-max
node tests/ga/benchmark.js --algorithm beam-search
```

## Outputs

The runner writes:

- `tests/ga/results/ga-benchmark-summary.csv`
- `tests/ga/results/ga-benchmark-results.json`

## Algorithms

- `baseline`: mirrors the current genetic-algorithm behavior closely enough to
  expose the same failure mode under hostile quantity limits.
- `capped-ga`: keeps the GA idea, but clamps global/per-food limits and filters
  invalid results.
- `beam-search`: deterministic search over plausible portions. It is slower than
  the simplest GA in some cases, but much easier to reason about and compare.

## Metrics

- `successRate`: share of runs that returned a suggestion inside hard limits.
- `absurdRate`: share of runs that returned huge portions or calories.
- `noSolutionRate`: share of runs with no acceptable suggestion.
- `avgAbsKcalError`: average absolute kcal deviation for valid suggestions.
- `avgAbsProteinError`: average absolute protein deviation for valid suggestions.
- `p95TimeMs`: 95th percentile runtime.
