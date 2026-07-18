/**
 * AI-backed nutrition autofill for the food form.
 *
 * The UMD module exposes a `createFoodAutofillAI` factory. The host injects
 * the existing Groq-backed `callAI`, language helpers from `i18n.js`, and the
 * existing `aiLang` language instruction as `getAiLanguageInstruction`.
 * Requests enter as a food name, unit, and language; successful responses are
 * returned as neutral result objects and can be merged into the current form
 * with `applyFoodAutofillResult` without touching React state or notifications.
 *
 * KNOWN BEHAVIOR DELIBERATELY PRESERVED: requests have no cancellation or
 * concurrency ordering. A response can therefore be applied after the user
 * edits the form, and older concurrent requests can overwrite newer results.
 * Prompt construction remains synchronous before the AI Promise is returned.
 *
 * @module FoodAutofillAI
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FoodAutofillAI = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const NUTRIENT_FIELDS = [
    "protein100", "kcal100", "carbs100", "sugars100",
    "fat100", "satfat100", "fiber100", "salt100"
  ];

  /**
   * Creates the food-autofill API with the app's existing AI and language helpers.
   *
   * @param {Object} dependencies Injected AI and localization dependencies.
   * @param {function(string,number): Promise<string>} dependencies.callAI Existing Groq client wrapper.
   * @param {function(string): string} dependencies.normalizeLanguage Production language normalizer from `i18n.js`.
   * @param {function(string,*,*,*): *} dependencies.pickLang Production PT/EN/ES selector from `i18n.js`.
   * @param {function(): string} dependencies.getAiLanguageInstruction Existing host `aiLang` instruction getter.
   * @returns {{requestFoodAutofill: function(Object): Promise<Object>, applyFoodAutofillResult: function(Object,Object): Object}} Configured request and form-mapping API.
   */
  function createFoodAutofillAI({
    callAI,
    normalizeLanguage,
    pickLang,
    getAiLanguageInstruction
  }) {
    if (typeof callAI !== "function" || typeof normalizeLanguage !== "function" ||
        typeof pickLang !== "function" || typeof getAiLanguageInstruction !== "function") {
      throw new TypeError("FoodAutofillAI requires callAI, normalizeLanguage, pickLang, and getAiLanguageInstruction functions");
    }

    /**
     * Builds the exact localized prompt, requests AI data, and parses its JSON response.
     *
     * @param {Object} input Food request values captured by the React host.
     * @param {string} input.foodName Food name; surrounding whitespace is ignored.
     * @param {string} input.unit Current food unit, with `un` enabling per-unit conversion.
     * @param {string} input.lang Current app language.
     * @returns {Promise<Object>} Neutral empty, rejected, standard, or per-unit result.
     */
    function requestFoodAutofill({ foodName, unit, lang }) {
      const trimmedFoodName = foodName.trim();
      if (!trimmedFoodName) return Promise.resolve({ status: "empty-name" });

      const normalizedLang = normalizeLanguage(lang);
      const ptPrompt = unit === "un"
        ? "Verifique se existe o alimento \"" + trimmedFoodName + "\" e se faz sentido medir em unidades individuais.\n\nIMPORTANTE: Como a unidade é \"un\", você deve:\n1. Verificar se faz sentido medir este alimento por unidade individual (1 ovo, 1 banana, 1 morango, etc.).\n2. Se sim, fornecer os valores nutricionais por 100g E o peso médio em gramas de 1 unidade típica.\n   Os valores finais por unidade serão calculados como: valor_100g x peso_unidade / 100\n3. Se não fizer sentido (ex: leite, azeite, farinha), recuse e explique.\n\nResponda APENAS com JSON sem markdown:\n- Se válido: {\"ok\":true,\"per100\":{\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X},\"unitWeightG\":X}\n- Se inválido: {\"ok\":false,\"reason\":\"explicação breve\"}"
        : "O usuário quer registrar \"" + trimmedFoodName + "\" com unidade \"" + unit + "\".\n\nVerifique se a unidade \"" + unit + "\" faz sentido para este alimento.\nSe sim, forneça valores por 100" + unit + " baseados em tabelas nutricionais de referência (TACO, USDA, INSA, tabelas nutricionais brasileiras, americanas e europeias).\nSe não (ex: atum em ml, leite em un), recuse e explique.\n\nResponda APENAS com JSON sem markdown:\n- Se válido: {\"ok\":true,\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X}\n- Se inválido: {\"ok\":false,\"reason\":\"explicação breve\"}\nUse null para campos desconhecidos.";
      const enPrompt = unit === "un"
        ? "Check whether the food \"" + trimmedFoodName + "\" exists and whether it makes sense to measure it as individual units.\n\nIMPORTANT: Because the unit is \"un\", you must:\n1. Check whether this food makes sense as an individual unit (1 egg, 1 banana, 1 strawberry, etc.).\n2. If yes, provide nutrition values per 100g AND the average gram weight of one typical unit.\n   Final per-unit values will be calculated as: value_per_100g x unit_weight / 100\n3. If it does not make sense (for example milk, olive oil, flour), reject it and explain.\n\nRespond ONLY with JSON, no markdown:\n- If valid: {\"ok\":true,\"per100\":{\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X},\"unitWeightG\":X}\n- If invalid: {\"ok\":false,\"reason\":\"brief explanation\"}"
        : "The user wants to log \"" + trimmedFoodName + "\" with unit \"" + unit + "\".\n\nCheck whether the unit \"" + unit + "\" makes sense for this food.\nIf yes, provide values per 100" + unit + " based on reliable nutrition reference tables (USDA, TACO, INSA, and European nutrition tables).\nIf not (for example tuna in ml, milk in units), reject it and explain.\n\nRespond ONLY with JSON, no markdown:\n- If valid: {\"ok\":true,\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X}\n- If invalid: {\"ok\":false,\"reason\":\"brief explanation\"}\nUse null for unknown fields.";
      const esPrompt = unit === "un"
        ? "Verifica si existe el alimento \"" + trimmedFoodName + "\" y si tiene sentido medirlo en unidades individuales.\n\nIMPORTANTE: Como la unidad es \"un\", debes:\n1. Verificar si este alimento tiene sentido como unidad individual (1 huevo, 1 banana, 1 fresa, etc.).\n2. Si sí, entregar valores nutricionales por 100g Y el peso medio en gramos de una unidad típica.\n   Los valores finales por unidad se calcularán como: valor_100g x peso_unidad / 100\n3. Si no tiene sentido (por ejemplo leche, aceite de oliva, harina), recházalo y explica brevemente.\n\nResponde SOLO con JSON, sin markdown:\n- Si es válido: {\"ok\":true,\"per100\":{\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X},\"unitWeightG\":X}\n- Si no es válido: {\"ok\":false,\"reason\":\"explicación breve\"}"
        : "El usuario quiere registrar \"" + trimmedFoodName + "\" con unidad \"" + unit + "\".\n\nVerifica si la unidad \"" + unit + "\" tiene sentido para este alimento.\nSi sí, entrega valores por 100" + unit + " basados en tablas nutricionales confiables (USDA, TACO, INSA y tablas europeas).\nSi no (por ejemplo atún en ml, leche en unidades), recházalo y explica brevemente.\n\nResponde SOLO con JSON, sin markdown:\n- Si es válido: {\"ok\":true,\"protein100\":X,\"kcal100\":X,\"carbs100\":X,\"sugars100\":X,\"fat100\":X,\"satfat100\":X,\"fiber100\":X,\"salt100\":X}\n- Si no es válido: {\"ok\":false,\"reason\":\"explicación breve\"}\nUsa null para campos desconocidos.";
      const basePrompt = pickLang(normalizedLang, ptPrompt, enPrompt, esPrompt);
      const prompt = getAiLanguageInstruction() + basePrompt;

      return callAI(prompt, 600).then(text => {
        const clean = text.replace(/```json|```/g, "").trim();
        const vals = JSON.parse(clean);
        if (!vals.ok) return { status: "rejected", reason: vals.reason };

        if (unit === "un" && vals.per100 && vals.unitWeightG) {
          const w = vals.unitWeightG;
          const p = vals.per100;
          const scale = value => value != null ? Math.round(value * w / 100 * 100) / 100 : null;
          return {
            status: "success",
            mode: "unit",
            unitWeightG: w,
            fields: Object.fromEntries(NUTRIENT_FIELDS.map(field => [field, scale(p[field])]))
          };
        }

        return {
          status: "success",
          mode: "standard",
          fields: Object.fromEntries(NUTRIENT_FIELDS.map(field => [field, vals[field]]))
        };
      });
    }

    /**
     * Merges a successful neutral result into the latest food form state.
     *
     * @param {Object} currentForm Current React food-form value at response time.
     * @param {Object} result Successful result returned by `requestFoodAutofill`.
     * @returns {Object} New form value preserving current fields when AI values are null or absent.
     */
    function applyFoodAutofillResult(currentForm, result) {
      const nextForm = { ...currentForm };
      NUTRIENT_FIELDS.forEach(field => {
        if (result.fields[field] != null) nextForm[field] = String(result.fields[field]);
      });
      if (result.mode === "unit") nextForm.unitWeightG = "";
      return nextForm;
    }

    return { requestFoodAutofill, applyFoodAutofillResult };
  }

  return { createFoodAutofillAI };
});
