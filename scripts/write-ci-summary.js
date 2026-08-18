const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function readText(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return '';

  const buffer = fs.readFileSync(filePath);
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le');
  }

  return buffer.toString('utf8');
}

function parseUnitResults() {
  const output = readText('.ci-results/unit-output.txt').replace(/\u001b\[[0-9;]*m/g, '');
  const value = (label) => Number(output.match(new RegExp(`(?:ℹ|#)\\s*${label}\\s+(\\d+)`))?.[1] || 0);

  return {
    total: value('tests'),
    passed: value('pass'),
    failed: value('fail'),
    skipped: value('skipped')
  };
}

function parsePlaywrightResults() {
  const raw = readText('test-results/playwright-results.json');
  if (!raw) return { total: 0, passed: 0, failed: 0, skipped: 0 };

  try {
    const stats = JSON.parse(raw).stats || {};
    const passed = Number(stats.expected || 0);
    const failed = Number(stats.unexpected || 0);
    const skipped = Number(stats.skipped || 0);
    const flaky = Number(stats.flaky || 0);
    return { total: passed + failed + skipped + flaky, passed, failed, skipped, flaky };
  } catch (error) {
    console.warn(`Não foi possível ler o resultado JSON do Playwright: ${error.message}`);
    return { total: 0, passed: 0, failed: 0, skipped: 0 };
  }
}

function statusIcon(outcome) {
  if (outcome === 'success') return '✅';
  if (outcome === 'failure') return '❌';
  return '⏭️';
}

const unit = parseUnitResults();
const playwright = parsePlaywrightResults();
const preflightOutcome = process.env.PREFLIGHT_OUTCOME || 'skipped';
const unitOutcome = process.env.UNIT_OUTCOME || 'skipped';
const workerOutcome = process.env.WORKER_OUTCOME || 'skipped';
const functionsOutcome = process.env.FUNCTIONS_OUTCOME || 'skipped';
const smokeOutcome = process.env.SMOKE_OUTCOME || 'skipped';

const summary = [
  '# Trofia CI',
  '',
  '| Verificação | Resultado | Passaram | Falharam | Ignorados | Total |',
  '|---|---:|---:|---:|---:|---:|',
  `| Preflight | ${statusIcon(preflightOutcome)} ${preflightOutcome} | — | — | — | — |`,
  `| Unitários | ${statusIcon(unitOutcome)} ${unitOutcome} | ${unit.passed} | ${unit.failed} | ${unit.skipped} | ${unit.total} |`,
  `| Worker | ${statusIcon(workerOutcome)} ${workerOutcome} | — | — | — | — |`,
  `| Functions/emuladores | ${statusIcon(functionsOutcome)} ${functionsOutcome} | — | — | — | — |`,
  `| Playwright | ${statusIcon(smokeOutcome)} ${smokeOutcome} | ${playwright.passed} | ${playwright.failed} | ${playwright.skipped} | ${playwright.total} |`,
  '',
  playwright.skipped > 0
    ? '> Testes autenticados podem aparecer como ignorados quando os repository secrets não estão disponíveis, como ocorre por padrão em pull requests vindos de forks.'
    : '> Os testes Playwright foram executados sem casos ignorados.',
  ''
].join('\n');

if (!process.env.GITHUB_STEP_SUMMARY) {
  console.log(summary);
} else {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary, 'utf8');
}
