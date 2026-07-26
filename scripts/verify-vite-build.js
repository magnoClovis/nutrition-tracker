'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BASELINE_RUNTIME_FILES = [
  'settings-panel.js',
  'backup-modal.js',
  'verify-email-screen.js',
  'login-screen.js',
  'privacy-panel.js',
  'required-profile-modal.js',
  'tutorial-overlay.js',
  'week-screen.js',
  'metrics-screen.js',
  'pantry-screen.js',
  'add-screen.js',
  'diary-screen.js',
  'app-header-navigation.js',
  'nutrition-tracker-controller.js',
  'app.js',
];

const STATIC_FILES = [
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icone.png',
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

  if (errors.length > 0) {
    throw new Error(`Vite build verification failed:\n- ${errors.join('\n- ')}`);
  }

  return files;
}

if (require.main === module) {
  const requestedDirectory = process.argv[2] || 'dist-vite';
  const outputDirectory = path.resolve(process.cwd(), requestedDirectory);
  const files = verifyBuildDirectory(outputDirectory);
  console.log(`Verified Vite build allowlist (${files.length} files).`);
}

module.exports = {
  REQUIRED_OUTPUT_FILES,
  verifyBuildDirectory,
};
