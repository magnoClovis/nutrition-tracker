const fs = require("fs");
const vm = require("vm");
const crypto = require("crypto");

const APP_FILE = "app.js";
const JSX_FILE = "nutrition-tracker.jsx";
const I18N_FILE = "i18n.js";
const EXPECTED_LANGUAGES = ["pt", "en", "es"];

/**
 * Reads a UTF-8 source file exactly as the browser receives it.
 * This avoids PowerShell console decoding artifacts while checking real bytes.
 */
function readUtf8(file) {
  return fs.readFileSync(file, "utf8");
}

/**
 * Extracts the object literal assigned to a named const.
 * The scanner respects strings and comments, so nested translation objects are safe.
 */
function extractConstObject(source, constName) {
  return extractObjectAfterAssignment(source, `const ${constName} =`);
}

function extractObjectAfterAssignment(source, assignment) {
  const assignmentIndex = source.indexOf(assignment);
  if (assignmentIndex < 0) {
    throw new Error(`Could not find ${assignment}.`);
  }

  const start = source.indexOf("{", assignmentIndex);
  if (start < 0) {
    throw new Error(`Could not find object literal for ${assignment}.`);
  }

  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  throw new Error(`Could not find the end of ${assignment}.`);
}

/**
 * Flattens nested translation dictionaries into dot paths.
 * Flat paths make it obvious when a language misses a string key.
 */
function flattenKeys(value, prefix = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }

  return Object.keys(value).flatMap((key) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    return flattenKeys(value[key], nextPrefix);
  });
}

function hashFile(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/**
 * Detects the mojibake patterns that have actually broken this project before.
 * The values are written with Unicode escapes so valid Portuguese/Spanish glyphs
 * such as "Ã" in uppercase words are not treated as errors by accident.
 */
function findMojibake(source) {
  const lines = source.split(/\r?\n/);
  const badSequences = [
    { label: "replacement character", value: "\uFFFD" },
    { label: "UTF-8 decoded as latin-1", value: "\u00C3\u00A1" },
    { label: "UTF-8 decoded as latin-1", value: "\u00C3\u00A9" },
    { label: "UTF-8 decoded as latin-1", value: "\u00C3\u00AD" },
    { label: "UTF-8 decoded as latin-1", value: "\u00C3\u00B3" },
    { label: "UTF-8 decoded as latin-1", value: "\u00C3\u00BA" },
    { label: "UTF-8 decoded as latin-1", value: "\u00C3\u00A7" },
    { label: "UTF-8 decoded as latin-1", value: "\u00C3\u00A3" },
    { label: "UTF-8 decoded as latin-1", value: "\u00C3\u00B5" },
    { label: "broken emoji prefix", value: "\u00F0\u0178" },
    { label: "broken punctuation prefix", value: "\u00E2\u20AC" },
    { label: "double-encoded UTF-8 prefix", value: "\u00C3\u0192" },
    { label: "double-encoded latin-1 marker", value: "\u00C3\u201A" },
    { label: "double-encoded smart punctuation", value: "\u00C3\u00A2" },
  ];

  const findings = [];
  for (const badSequence of badSequences) {
    let index = source.indexOf(badSequence.value);
    while (index >= 0) {
      const line = source.slice(0, index).split(/\r?\n/).length;
      const preview = lines[line - 1].trim().slice(0, 180);
      findings.push({ line, label: badSequence.label, preview });
      if (findings.length >= 20) return findings;
      index = source.indexOf(badSequence.value, index + badSequence.value.length);
    }
  }
  return findings;
}

function main() {
  const appSource = readUtf8(APP_FILE);
  const jsxSource = readUtf8(JSX_FILE);
  const i18nSource = readUtf8(I18N_FILE);
  const issues = [];

  if (hashFile(APP_FILE) !== hashFile(JSX_FILE)) {
    issues.push(`${APP_FILE} and ${JSX_FILE} are not synchronized.`);
  }

  if (appSource.includes("false && /*#__PURE__*/React.createElement")) {
    issues.push("Disabled legacy React blocks are still present and should be removed before i18n QA.");
  }

  const mojibake = findMojibake(`${appSource}\n${jsxSource}\n${i18nSource}`);
  for (const finding of mojibake) {
    issues.push(
      `Possible mojibake at line ${finding.line} (${finding.label}): ${finding.preview}`
    );
  }

  const stringsSource = extractConstObject(i18nSource, "STRINGS");
  const esAssignmentIndex = i18nSource.indexOf("STRINGS.es =");
  const strings = vm.runInNewContext(`
    const STRINGS = (${stringsSource});
    ${
      esAssignmentIndex >= 0
        ? `STRINGS.es = (${extractObjectAfterAssignment(i18nSource.slice(esAssignmentIndex), "STRINGS.es =")});`
        : ""
    }
    STRINGS;
  `);
  const languages = Object.keys(strings).sort();

  for (const language of EXPECTED_LANGUAGES) {
    if (!languages.includes(language)) {
      issues.push(`STRINGS is missing language "${language}".`);
    }
  }

  const referenceLanguage = EXPECTED_LANGUAGES[0];
  const referenceKeys = new Set(flattenKeys(strings[referenceLanguage]));

  for (const language of EXPECTED_LANGUAGES.slice(1)) {
    const languageKeys = new Set(flattenKeys(strings[language] || {}));
    const missing = [...referenceKeys].filter((key) => !languageKeys.has(key));
    const extra = [...languageKeys].filter((key) => !referenceKeys.has(key));

    if (missing.length) {
      issues.push(`${language} is missing keys: ${missing.join(", ")}`);
    }

    if (extra.length) {
      issues.push(`${language} has extra keys: ${extra.join(", ")}`);
    }
  }

  if (issues.length) {
    console.error("i18n audit failed:");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log("i18n audit passed.");
  console.log(`Languages: ${EXPECTED_LANGUAGES.join(", ")}`);
  console.log(`Translation keys: ${referenceKeys.size}`);
}

main();
