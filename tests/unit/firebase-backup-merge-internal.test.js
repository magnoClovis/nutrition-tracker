const test = require("node:test");
const assert = require("node:assert/strict");

const implementations = [
  ["UMD", () => Promise.resolve(require("../../firebase-backup-merge-internal.js"))],
  ["ESM", () => import("../../src/firebase/firebase-backup-merge-internal.js")]
];

for (const [format, load] of implementations) {
  test(`${format}: preserves extracted backup identity and merge behavior`, async () => {
    const helpers = await load();
    assert.equal(helpers.normalizedIdentity({id: "one"}), "id:one");
    assert.equal(helpers.normalizedIdentity({name: " Arroz "}), "name:arroz");
    assert.deepEqual(
      helpers.mergeArrayValues([[{id: "one", value: 1}], [{id: "one", value: 2, richer: true}, {id: "two"}]]),
      [{id: "one", value: 2, richer: true}, {id: "two"}]
    );
    assert.deepEqual(
      helpers.mergeObjectValues([{profile: {height: 170}}, {profile: {height: 171, goal: "loss"}}]),
      {profile: {height: 171, goal: "loss"}}
    );
  });
}
