/**
 * Open Food Facts HTTP client and product-to-form mapper.
 *
 * The UMD module exposes a `createOpenFoodFacts` factory. The host injects its
 * real `fetch` implementation and receives functions that return plain product
 * data or a new food-form object. This module does not read or update React
 * state, display localized messages, or control the barcode scanner.
 *
 * KNOWN BEHAVIOR DELIBERATELY PRESERVED: concurrent requests are not cancelled
 * or ordered. Callers may therefore apply an older response after a newer one.
 * The host remains responsible for preserving that existing UI behavior.
 *
 * @module OpenFoodFacts
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OpenFoodFacts = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const SEARCH_ENDPOINT = "https://world.openfoodfacts.org/cgi/search.pl";
  const PRODUCT_ENDPOINT = "https://world.openfoodfacts.org/api/v2/product/";
  const PRODUCT_FIELDS = "product_name,generic_name,brands,nutriments,quantity";

  /**
   * Creates the Open Food Facts API with the host HTTP implementation.
   *
   * @param {Object} dependencies Injected environmental dependencies.
   * @param {function(string, Object=): Promise<Object>} dependencies.fetchRequest Fetch-compatible request function.
   * @returns {{searchProducts: function(string): Promise<Array<Object>>, getProductByBarcode: function(string): Promise<Object|null>, mapProductToForm: function(Object,Object): Object}} Configured Open Food Facts API.
   */
  function createOpenFoodFacts({ fetchRequest }) {
    if (typeof fetchRequest !== "function") {
      throw new TypeError("OpenFoodFacts requires a fetchRequest function");
    }

    /**
     * Searches Open Food Facts and keeps products with usable nutrition data.
     *
     * @param {string} query Food-name query already validated by the host.
     * @returns {Promise<Array<Object>>} Matching products with nutriments and either calories or protein.
     */
    async function searchProducts(query) {
      const url = SEARCH_ENDPOINT + "?search_terms=" + encodeURIComponent(query) + "&search_simple=1&action=process&json=1&page_size=8&fields=" + PRODUCT_FIELDS;
      const response = await fetchRequest(url);
      if (!response.ok) throw new Error("Open Food Facts");
      const data = await response.json();
      return (data.products || []).filter(product =>
        product.nutriments &&
        (product.nutriments["energy-kcal_100g"] || product.nutriments["proteins_100g"])
      );
    }

    /**
     * Looks up one Open Food Facts product by its normalized barcode.
     *
     * @param {string} barcode Digits-only barcode already normalized by the host.
     * @returns {Promise<Object|null>} Product data, or `null` when Open Food Facts reports no product.
     */
    async function getProductByBarcode(barcode) {
      const url = PRODUCT_ENDPOINT + encodeURIComponent(barcode) + ".json?fields=" + PRODUCT_FIELDS;
      const response = await fetchRequest(url);
      if (!response.ok) throw new Error("Open Food Facts");
      const data = await response.json();
      if (!data || data.status !== 1 || !data.product) return null;
      return data.product;
    }

    /**
     * Maps an Open Food Facts product onto the current pantry-food form.
     *
     * @param {Object} product Open Food Facts product containing optional names and nutriments.
     * @param {Object} currentForm Current React form snapshot whose missing nutrient fields must be preserved.
     * @returns {Object} New form with imported finite values and the existing unit/portion conversion behavior.
     */
    function mapProductToForm(product, currentForm) {
      const nutriments = product.nutriments || {};
      const valueFor = (...keys) => {
        for (const key of keys) {
          const value = nutriments[key];
          if (value !== undefined && value !== null && value !== "") return Number(value);
        }
        return null;
      };
      const kcal = valueFor("energy-kcal_100g", "energy-kcal", "energy_100g");
      const mapped = {
        protein100: valueFor("proteins_100g", "proteins"),
        kcal100: kcal && kcal > 1000 ? Math.round(kcal / 4.184) : kcal,
        carbs100: valueFor("carbohydrates_100g", "carbohydrates"),
        sugars100: valueFor("sugars_100g", "sugars"),
        fat100: valueFor("fat_100g", "fat"),
        satfat100: valueFor("saturated-fat_100g", "saturated-fat"),
        fiber100: valueFor("fiber_100g", "fiber"),
        salt100: valueFor("salt_100g", "salt")
      };
      const next = {
        ...currentForm,
        name: product.product_name || product.generic_name || product.brands || currentForm.name,
        unit: currentForm.unit === "un" ? "g" : currentForm.unit,
        portionSize: "100",
        unitWeightG: ""
      };
      Object.entries(mapped).forEach(([key, value]) => {
        if (Number.isFinite(value)) next[key] = String(Math.round(value * 10) / 10);
      });
      return next;
    }

    return { searchProducts, getProductByBarcode, mapProductToForm };
  }

  return { createOpenFoodFacts };
});
