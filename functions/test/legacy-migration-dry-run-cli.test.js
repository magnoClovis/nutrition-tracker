"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  parseArguments,
  sanitizedErrorCategory,
  usage,
} = require("../scripts/c23-legacy-dry-run.js");

test("requires an explicit valid project and bounded page size", () => {
  assert.throws(() => parseArguments([]), /explicit-valid-project-required/);
  assert.throws(
    () => parseArguments(["--project", "INVALID"]),
    /explicit-valid-project-required/,
  );
  assert.throws(
    () => parseArguments(["--project", "valid-project", "--page-size", "0"]),
    /invalid-page-size/,
  );
  assert.throws(
    () => parseArguments(["--project", "valid-project", "--write"]),
    /unknown-argument/,
  );
  assert.deepEqual(
    parseArguments(["--project", "nutrition-tracker-780b3", "--page-size", "50"]),
    {projectId: "nutrition-tracker-780b3", pageSize: 50},
  );
});

test("sanitizes operational failures without echoing provider details", () => {
  assert.equal(
    sanitizedErrorCategory(new Error("permission failure at users/private-uid")),
    "admin-read-failure",
  );
  assert.equal(
    sanitizedErrorCategory(new Error("invalid-page-size")),
    "invalid-page-size",
  );
});

test("documents that the command is read-only and never accepts credentials", () => {
  const help = usage();
  assert.match(help, /Read-only C23 inventory/);
  assert.match(help, /never writes or deletes/);
  assert.match(help, /Application Default Credentials/);
});
