const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const RUNTIME_EXTENSIONS = new Set([
  ".cjs", ".css", ".html", ".js", ".json", ".jsonc", ".jsx", ".mjs", ".ts", ".xml"
]);

const RUNTIME_PREFIXES = [
  "src/",
  "worker/src/",
  "android/app/src/main/"
];

const BAD_SEQUENCE_PATTERN = /\u00C3[\u0080-\u00BF]|\u00C2[\u0080-\u00BF]|\u00E2[\u0080-\u00BF\u20AC\u201A-\u201D]|\u00F0[\u0080-\u00BF\u0178]|\uFFFD/gu;

function normalizePath(filePath) {
  return String(filePath || "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function isRuntimeSourcePath(filePath) {
  const normalized = normalizePath(filePath);
  const extension = path.posix.extname(normalized).toLowerCase();
  if (!RUNTIME_EXTENSIONS.has(extension)) return false;
  if (!normalized.includes("/")) return true;
  return RUNTIME_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

function findMojibake(source) {
  const text = String(source || "");
  const findings = [];
  const lines = text.split(/\r?\n/);
  BAD_SEQUENCE_PATTERN.lastIndex = 0;
  let match;
  while ((match = BAD_SEQUENCE_PATTERN.exec(text)) !== null) {
    const line = text.slice(0, match.index).split(/\r?\n/).length;
    findings.push({
      line,
      label: "corrupted UTF-8 sequence",
      sequence: match[0],
      preview: (lines[line - 1] || "").trim().slice(0, 180)
    });
    if (findings.length >= 100) break;
  }
  return findings;
}

function listTrackedRuntimeFiles(rootDirectory) {
  const output = childProcess.execFileSync(
    "git",
    ["-C", rootDirectory, "ls-files", "-z"],
    { encoding: "utf8" }
  );
  return output.split("\0").filter(Boolean).filter(isRuntimeSourcePath);
}

function scanFiles(rootDirectory, relativePaths) {
  const findings = [];
  for (const relativePath of relativePaths) {
    const source = fs.readFileSync(path.join(rootDirectory, relativePath), "utf8");
    for (const finding of findMojibake(source)) {
      findings.push({ file: normalizePath(relativePath), ...finding });
    }
  }
  return findings;
}

function scanTrackedRuntimeFiles(rootDirectory) {
  const files = listTrackedRuntimeFiles(rootDirectory);
  return { files, findings: scanFiles(rootDirectory, files) };
}

function main() {
  const rootDirectory = path.resolve(__dirname, "..");
  const { files, findings } = scanTrackedRuntimeFiles(rootDirectory);
  if (findings.length) {
    for (const finding of findings) {
      console.error(`${finding.file}:${finding.line}: possible mojibake (${JSON.stringify(finding.sequence)})`);
      console.error(`  ${finding.preview}`);
    }
    console.error(`Encoding check failed with ${findings.length} finding(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(`Encoding check passed (${files.length} tracked runtime files).`);
}

if (require.main === module) main();

module.exports = {
  findMojibake,
  isRuntimeSourcePath,
  listTrackedRuntimeFiles,
  normalizePath,
  scanFiles,
  scanTrackedRuntimeFiles
};
