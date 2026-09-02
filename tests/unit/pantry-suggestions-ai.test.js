const test = require("node:test");
const assert = require("node:assert/strict");

const implementations = [
  ["UMD", () => Promise.resolve(require("../../pantry-suggestions-ai.js"))],
  ["ESM", () => import("../../src/composite/pantry-suggestions-ai.js")]
];

function pantry() {
  return [{
    id: "rice-1", name: "Rice", unit: "g",
    protein100: "2.5", kcal100: 130, carbs100: 28, sugars100: 0.1,
    fat100: 0.3, satfat100: null, fiber100: 0.4, salt100: ""
  }, {
    id: "egg-1", name: "Egg", unit: "un",
    protein100: 6, kcal100: 70, carbs100: 0.5, sugars100: 0.2,
    fat100: 5, satfat100: 1.5, fiber100: 0, salt100: 0.2
  }];
}

function response(overrides = {}) {
  return {
    contractVersion: "pantry-suggestions-v2",
    suggestions: [{
      name: "Rice and eggs",
      items: [
        { foodId: "rice-1", quantity: 150 },
        { foodId: "egg-1", quantity: 2 }
      ]
    }],
    ...overrides
  };
}

for (const [format, load] of implementations) {
  test(`${format}: projects pantry data, validates IDs, and recalculates totals locally`, async () => {
    const module = await load();
    const requests = [];
    const api = module.createPantrySuggestionsAI({
      async requestStructuredPantrySuggestions(request) {
        requests.push(request);
        return response();
      }
    });

    const suggestions = await api.requestPantrySuggestions({
      pantry: pantry(),
      remaining: { protein: 30, kcal: 500, carbs: 50 },
      language: "en"
    });

    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0], {
      contractVersion: "pantry-suggestions-v2",
      language: "en",
      remaining: { protein: 30, kcal: 500, carbs: 50 },
      pantry: [{
        id: "rice-1", name: "Rice", unit: "g",
        protein100: 2.5, kcal100: 130, carbs100: 28, sugars100: 0.1,
        fat100: 0.3, satfat100: null, fiber100: 0.4, salt100: null
      }, {
        id: "egg-1", name: "Egg", unit: "un",
        protein100: 6, kcal100: 70, carbs100: 0.5, sugars100: 0.2,
        fat100: 5, satfat100: 1.5, fiber100: 0, salt100: 0.2
      }]
    });
    assert.equal(suggestions[0].items[0].food.id, "rice-1");
    assert.equal(suggestions[0].items[1].food.id, "egg-1");
    assert.equal(suggestions[0].protein, 15.75);
    assert.equal(suggestions[0].kcal, 335);
    assert.equal(suggestions[0].carbs, 43);
    assert.equal(suggestions[0].salt, null);
    assert.equal(Object.hasOwn(response().suggestions[0], "protein"), false);
  });

  test(`${format}: rejects unknown, duplicate, and malformed provider items fail-closed`, async () => {
    const module = await load();
    for (const providerResponse of [
      response({ suggestions: [{ name: "Unknown", items: [{ foodId: "missing", quantity: 1 }] }] }),
      response({ suggestions: [{ name: "Duplicate", items: [
        { foodId: "rice-1", quantity: 1 }, { foodId: "rice-1", quantity: 2 }
      ] }] }),
      response({ suggestions: [{ name: "Extra", items: [{ foodId: "rice-1", quantity: 1, unit: "g" }] }] }),
      response({ suggestions: [{ name: "Zero", items: [{ foodId: "rice-1", quantity: 0 }] }] })
    ]) {
      const api = module.createPantrySuggestionsAI({
        requestStructuredPantrySuggestions: async () => providerResponse
      });
      await assert.rejects(
        api.requestPantrySuggestions({
          pantry: pantry(), remaining: { protein: 1, kcal: 1, carbs: 1 }, language: "pt"
        }),
        /invalid/i
      );
    }
  });

  test(`${format}: rejects invalid pantry snapshots before making a request`, async () => {
    const module = await load();
    let calls = 0;
    const api = module.createPantrySuggestionsAI({
      requestStructuredPantrySuggestions: async () => { calls += 1; return response(); }
    });
    const duplicate = pantry().map(food => ({ ...food, id: "same" }));
    await assert.rejects(
      api.requestPantrySuggestions({
        pantry: duplicate, remaining: { protein: 1, kcal: 1, carbs: 1 }, language: "pt"
      }),
      /invalid or duplicate/i
    );
    assert.equal(calls, 0);
  });
}
