'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Runtime inputs only: documentation and tests may legitimately name production.
const RUNTIME_FILES = Object.freeze([
  'firebase-config-internal.js',
  'ai-client.js',
  'image-meal-client.js',
  'app.js',
  'nutrition-tracker.jsx',
  'src/App.jsx',
  'index.html',
  'worker/src/ai-worker.js',
  'worker/wrangler.jsonc',
  'functions/src/config.js',
  'android/app/build.gradle',
]);

const PRODUCTION_BINDINGS = Object.freeze([
  { name: 'Firebase production project', pattern: /nutrition-tracker-780b3/i },
  { name: 'production AI Worker host', pattern: /trofia-ai-proxy\.cmagno-dev\.workers\.dev/i },
  { name: 'production Worker deployment name', pattern: /"name"\s*:\s*"trofia-ai-proxy"/i },
  { name: 'production Android application ID', pattern: /applicationId\s+["']com\.hermegas\.trofia["']/i },
]);

function inspectStagingSources(sources) {
  const findings = [];
  for (const relativePath of RUNTIME_FILES) {
    const source = sources[relativePath];
    if (typeof source !== 'string') {
      findings.push(`${relativePath}: required runtime source is missing`);
      continue;
    }
    for (const binding of PRODUCTION_BINDINGS) {
      if (binding.pattern.test(source)) {
        findings.push(`${relativePath}: ${binding.name}`);
      }
    }
  }
  return findings;
}

function verifyStagingBoundaries(projectRoot) {
  const sources = Object.fromEntries(RUNTIME_FILES.map((relativePath) => {
    const absolutePath = path.join(projectRoot, relativePath);
    return [relativePath, fs.existsSync(absolutePath)
      ? fs.readFileSync(absolutePath, 'utf8')
      : null];
  }));
  const findings = inspectStagingSources(sources);
  if (findings.length) {
    throw new Error(`Staging boundary check failed:\n- ${findings.join('\n- ')}`);
  }
  return RUNTIME_FILES.length;
}

function verifyDeploymentTarget(target, projectRoot) {
  if (target === 'production') return;
  if (target === 'staging') {
    verifyStagingBoundaries(projectRoot);
    return;
  }
  throw new Error(`Unknown Trofia deployment target: ${target || '(empty)'}`);
}

if (require.main === module) {
  try {
    const count = verifyStagingBoundaries(path.resolve(__dirname, '..'));
    console.log(`Staging boundary check passed (${count} runtime sources).`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  RUNTIME_FILES,
  inspectStagingSources,
  verifyDeploymentTarget,
  verifyStagingBoundaries,
};
