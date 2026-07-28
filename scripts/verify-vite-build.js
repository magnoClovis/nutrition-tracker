'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BASELINE_RUNTIME_FILES = [];

const STATIC_FILES = [
  'index.html',
  'manifest.json',
  'phrona-icon-192.png',
  'phrona-icon-512.png',
  'phrona-favicon-32.png',
  'phrona-apple-touch-icon.png',
];

const REQUIRED_OUTPUT_FILES = [...STATIC_FILES, ...BASELINE_RUNTIME_FILES];
const EXACT_ALLOWED_FILES = new Set(REQUIRED_OUTPUT_FILES);

const SENSITIVE_PATTERNS = [
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)bug-inventory\.txt$/i,
  /(^|\/)nutrition-full-raw\.json$/i,
  /(^|\/)nutrition-audit-summary\.json$/i,
  /(^|\/)nutrition-orphan-cleanup-report\.json$/i,
  /(^|\/)backup[^/]*\.json$/i,
  /(^|\/)[^/]*service.?account[^/]*\.json$/i,
  /(^|\/)firebase-adminsdk-[^/]*\.json$/i,
  /\.(?:csv|md|py|txt|xlsx?)$/i,
];

function listFiles(directory, relativeDirectory = '') {
  const absoluteDirectory = path.join(directory, relativeDirectory);
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      return entry.isDirectory()
        ? listFiles(directory, relativePath)
        : [relativePath];
    });
}

function verifyBuildDirectory(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new Error(`Vite output directory does not exist: ${directory}`);
  }

  const files = listFiles(directory);
  const fileSet = new Set(files);
  const errors = [];

  for (const requiredFile of REQUIRED_OUTPUT_FILES) {
    if (!fileSet.has(requiredFile)) {
      errors.push(`missing required output: ${requiredFile}`);
    }
  }

  for (const file of files) {
    if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(file))) {
      errors.push(`sensitive file pattern detected: ${file}`);
      continue;
    }

    if (!EXACT_ALLOWED_FILES.has(file) && !file.startsWith('assets/')) {
      errors.push(`file is outside the build allowlist: ${file}`);
    }
  }

  if (!files.some((file) => /^assets\/.+\.js$/i.test(file))) {
    errors.push('missing generated JavaScript bundle in assets/');
  }

  if (!files.some((file) => /^assets\/.+\.css$/i.test(file))) {
    errors.push('missing processed CSS in assets/');
  }

  const indexPath = path.join(directory, 'index.html');
  if (fileSet.has('index.html')) {
    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    const generatedScriptPattern = /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']\.\/assets\/[^"']+-[A-Za-z0-9_-]+\.js["'][^>]*>/i;
    const generatedStylePattern = /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']\.\/assets\/[^"']+-[A-Za-z0-9_-]+\.css["'][^>]*>/i;

    if (!generatedScriptPattern.test(indexHtml)) {
      errors.push('index.html is missing a relative hashed JavaScript asset');
    }
    if (!generatedStylePattern.test(indexHtml)) {
      errors.push('index.html is missing a relative hashed CSS asset');
    }
    const generatedStyleMatch = indexHtml.match(generatedStylePattern);
    const firstInlineStyleIndex = indexHtml.indexOf('<style>');
    if (
      generatedStyleMatch
      && firstInlineStyleIndex >= 0
      && generatedStyleMatch.index > firstInlineStyleIndex
    ) {
      errors.push('generated CSS asset appears after inline styles and changes the legacy cascade');
    }
    if (/\/src\/main\.jsx|index\.vite\.html/i.test(indexHtml)) {
      errors.push('source Vite entry detected in built index.html');
    }
    if (/<script\b[^>]*\bsrc=["'][^"']*(?:vendor\/|app\.js|nutrition-tracker-controller\.js)[^"']*["']/i.test(indexHtml)) {
      errors.push('legacy runtime reference detected in built index.html');
    }
    if (/\?v=/i.test(indexHtml)) {
      errors.push('manual cache-busting query detected in built index.html');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Vite build verification failed:\n- ${errors.join('\n- ')}`);
  }

  return files;
}

if (require.main === module) {
  const requestedDirectory = process.argv[2] || 'dist';
  const outputDirectory = path.resolve(process.cwd(), requestedDirectory);
  const files = verifyBuildDirectory(outputDirectory);
  console.log(`Verified Vite build allowlist (${files.length} files).`);
}

module.exports = {
  REQUIRED_OUTPUT_FILES,
  verifyBuildDirectory,
};
