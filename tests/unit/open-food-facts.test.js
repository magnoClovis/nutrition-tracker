const test = require("node:test");
const assert = require("node:assert/strict");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../open-food-facts.js"))],
  ["ESM", () => import("../../src/leaf/open-food-facts.js")]
];

function response(body, { ok = true } = {}) {
  return {
    ok,
    async json() { return body; }
  };
}

function createFixture({ createOpenFoodFacts }, responses) {
  const requests = [];
  const queue = [...responses];
  const api = createOpenFoodFacts({
    fetchRequest: async (...args) => {
      requests.push(args);
      const next = queue.shift();
      if (next instanceof Error) throw next;
      return next;
    }
  });
  return { api, requests };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => callback(await load()));
  });
}

contractTest("searches the exact text endpoint and returns valid nutrition products", async api => {
  const validEnergy = { product_name: "Rice", nutriments: { "energy-kcal_100g": 130 } };
  const validProtein = { product_name: "Tofu", nutriments: { "proteins_100g": 12 } };
  const fixture = createFixture(api, [response({ products: [
    validEnergy,
    validProtein,
    { product_name: "No nutriments" },
    { product_name: "Empty nutriments", nutriments: {} },
    { product_name: "Other nutrients", nutriments: { "fat_100g": 4 } },
    { product_name: "Zero values", nutriments: { "energy-kcal_100g": 0, "proteins_100g": 0 } }
  ] })]);

  const products = await fixture.api.searchProducts("arroz & feij\u00e3o");

  assert.deepEqual(products, [validEnergy, validProtein]);
  assert.equal(fixture.requests.length, 1);
  assert.equal(
    fixture.requests[0][0],
    "https://world.openfoodfacts.org/cgi/search.pl?search_terms=arroz%20%26%20feij%C3%A3o&search_simple=1&action=process&json=1&page_size=8&fields=product_name,generic_name,brands,nutriments,quantity"
  );
});

contractTest("returns an empty array when text search has no matching products", async api => {
  const fixture = createFixture(api, [response({ products: [] })]);
  assert.deepEqual(await fixture.api.searchProducts("missing"), []);
});

contractTest("looks up a barcode through the exact endpoint and returns its product", async api => {
  const product = { product_name: "Milk", nutriments: { "proteins_100g": 3.2 } };
  const fixture = createFixture(api, [response({ status: 1, product })]);

  assert.equal(await fixture.api.getProductByBarcode("5601234567890"), product);
  assert.equal(
    fixture.requests[0][0],
    "https://world.openfoodfacts.org/api/v2/product/5601234567890.json?fields=product_name,generic_name,brands,nutriments,quantity"
  );
});

contractTest("returns null when Open Food Facts reports no barcode product", async api => {
  const missingStatus = createFixture(api, [response({ status: 0 })]);
  assert.equal(await missingStatus.api.getProductByBarcode("123"), null);

  const missingProduct = createFixture(api, [response({ status: 1 })]);
  assert.equal(await missingProduct.api.getProductByBarcode("456"), null);
});

contractTest("maps unit, portion, weight and energy above 1000 exactly as before", moduleApi => {
  const { api } = createFixture(moduleApi, []);
  const currentForm = {
    name: "Original",
    unit: "un",
    portionSize: "1",
    unitWeightG: "45",
    protein100: "old protein",
    kcal100: "old kcal",
    carbs100: "old carbs",
    sugars100: "old sugars",
    fat100: "old fat",
    satfat100: "old saturated",
    fiber100: "old fiber",
    salt100: "old salt",
    untouched: "keep"
  };
  const mapped = api.mapProductToForm({
    product_name: "Imported",
    nutriments: {
      "proteins_100g": 12.34,
      "energy-kcal_100g": 1255.2,
      "carbohydrates_100g": 21.26,
      "sugars_100g": 4.44,
      "fat_100g": 8.88,
      "saturated-fat_100g": 2.25,
      "fiber_100g": 5.55,
      "salt_100g": 0.126
    }
  }, currentForm);

  assert.deepEqual(mapped, {
    name: "Imported",
    unit: "g",
    portionSize: "100",
    unitWeightG: "",
    protein100: "12.3",
    kcal100: "300",
    carbs100: "21.3",
    sugars100: "4.4",
    fat100: "8.9",
    satfat100: "2.3",
    fiber100: "5.6",
    salt100: "0.1",
    untouched: "keep"
  });
  assert.notEqual(mapped, currentForm);
});

contractTest("keeps energy at or below 1000 without the kilojoule conversion", moduleApi => {
  const { api } = createFixture(moduleApi, []);
  const mapped = api.mapProductToForm({
    generic_name: "Generic",
    nutriments: { "energy-kcal_100g": 999.9 }
  }, {
    name: "Original",
    unit: "ml",
    portionSize: "250",
    unitWeightG: "20",
    kcal100: "100"
  });

  assert.equal(mapped.name, "Generic");
  assert.equal(mapped.unit, "ml");
  assert.equal(mapped.kcal100, "999.9");
  assert.equal(mapped.portionSize, "100");
  assert.equal(mapped.unitWeightG, "");
});

contractTest("does not overwrite current nutrient fields when product values are absent or non-finite", moduleApi => {
  const { api } = createFixture(moduleApi, []);
  const currentForm = {
    name: "Current name",
    unit: "g",
    portionSize: "80",
    unitWeightG: "10",
    protein100: "7",
    kcal100: "90",
    carbs100: "11",
    sugars100: "2",
    fat100: "3",
    satfat100: "1",
    fiber100: "4",
    salt100: "0.5"
  };
  const mapped = api.mapProductToForm({
    nutriments: {
      "proteins_100g": null,
      "energy-kcal_100g": "",
      "carbohydrates_100g": "not-a-number"
    }
  }, currentForm);

  assert.deepEqual(mapped, {
    ...currentForm,
    portionSize: "100",
    unitWeightG: ""
  });
});

contractTest("propagates neutral HTTP and network failures for the React layer to localize", async api => {
  const httpFailure = createFixture(api, [response({}, { ok: false })]);
  await assert.rejects(httpFailure.api.searchProducts("rice"), /Open Food Facts/);

  const networkFailure = createFixture(api, [new TypeError("network unavailable")]);
  await assert.rejects(networkFailure.api.getProductByBarcode("123"), /network unavailable/);
});
