/**
 * AI explanation request for an already-calculated meal assessment.
 *
 * The UMD module exposes a `createMealReviewAI` factory. The host injects the
 * existing managed `callAI`, the production language selector from
 * `i18n.js`, and the existing MealScore component-count helper. A review object
 * enters the public function and the returned Promise resolves to explanatory
 * text. The calculated score is serialized as final input and is never changed.
 *
 * Prompt construction is normalized into the returned Promise so malformed
 * review data and provider failures follow the same asynchronous error path.
 * Request ordering remains a host concern because only the host knows which
 * review is currently visible.
 *
 * @module MealReviewAI
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MealReviewAI = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the meal-review explanation API with host domain dependencies.
   *
   * @param {Object} dependencies Injected AI, language, and score helpers.
   * @param {function(string,number): Promise<string>} dependencies.callAI Existing Groq client wrapper used by the app.
   * @param {function(string,string,string,string): string} dependencies.pickLang Production PT/EN/ES selector from `i18n.js`.
   * @param {function(Object): {evaluated:number,total:number}} dependencies.getEvaluationCount Existing component-availability counter from the host.
   * @returns {{requestMealReviewExplanation: function(Object,string): Promise<string>}} Configured explanation API.
   */
  function createMealReviewAI({ callAI, pickLang, getEvaluationCount }) {
    if (typeof callAI !== "function" || typeof pickLang !== "function" ||
        typeof getEvaluationCount !== "function") {
      throw new TypeError("MealReviewAI requires callAI, pickLang, and getEvaluationCount functions");
    }

    /**
     * Builds the localized review prompt and starts its AI request.
     *
     * @param {Object} review Meal review containing the definitive MealScore result and candidate items.
     * @param {string} lang Current host language used for the explanatory instructions.
     * @returns {Promise<string>} Promise returned by `callAI` for the explanatory text.
     */
    function requestMealReviewExplanation(review, lang) {
      return Promise.resolve().then(() => {
      const payload = {
        algorithmVersion: review.result.algorithmVersion,
        finalScore: Math.round(review.result.score * 100) / 100,
        coverage: Math.round(review.result.coverage * 100),
        evaluatedNutrients: getEvaluationCount(review.result),
        hoursUntilMidnight: Math.round(review.result.hoursLeft * 100) / 100,
        nutrients: review.result.components,
        missingNutrients: review.result.missing,
        foods: review.items.map(item => ({name: item.name, quantity: item.qty, unit: item.unit}))
      };
      const prompt = pickLang(
        lang,
        "Explique brevemente a avaliação nutricional abaixo em português do Brasil. A nota foi calculada pelo aplicativo e é definitiva: não recalcule, não altere e não proponha outra nota. Em no máximo 120 palavras, apresente pontos positivos, principal excesso ou carência, impacto nas metas do dia e até duas alterações práticas. Não critique nutrientes ausentes e diferencie problemas desta refeição de excessos acumulados anteriormente.\n\nDADOS:\n",
        "Briefly explain the nutrition assessment below in American English. The app calculated the final score: do not recalculate, change, or suggest another score. In no more than 120 words, cover strengths, the main excess or shortfall, impact on today's targets, and up to two practical changes. Do not criticize missing nutrients, and distinguish this meal from excess accumulated earlier.\n\nDATA:\n",
        "Explica brevemente en español la evaluación nutricional siguiente. La nota final fue calculada por la app: no la recalcules, cambies ni propongas otra. En un máximo de 120 palabras, indica puntos positivos, el principal exceso o carencia, impacto en las metas del día y hasta dos cambios prácticos. No critiques nutrientes ausentes y diferencia esta comida de excesos acumulados anteriormente.\n\nDATOS:\n"
      ) + JSON.stringify(payload, null, 2);
        return callAI(prompt, 350);
      });
    }

    return { requestMealReviewExplanation };
  }

  return { createMealReviewAI };
});
