/**
 * AI estimation and diary-entry construction for free-text dish descriptions.
 *
 * The UMD module exposes a `createDishDescriptionAI` factory. The host injects
 * the existing Groq-backed `callAI`, `normalizeLanguage` from `i18n.js`, the
 * shared monolith `aiLang` helper as `getAiLanguageInstruction`, and the exact
 * production entry-ID generator. Estimation returns neutral data without
 * touching React state; entry construction receives the latest description at
 * action time and returns the existing estimated-entry shape.
 *
 * KNOWN BEHAVIOR DELIBERATELY PRESERVED: requests have no timeout, retry,
 * cancellation, or concurrency ordering, so an older response may replace a
 * newer result. Entry construction uses the description supplied at action
 * time, which may differ from the description used to request the estimate.
 * The ID generator is intentionally injected separately from `food-entry.js`:
 * using its builders would add `time`, `foodSnapshot`, and scaling semantics
 * that this historical entry format does not contain.
 *
 * @module DishDescriptionAI
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DishDescriptionAI = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the dish-description API with the app's existing AI and runtime helpers.
   *
   * @param {Object} dependencies Injected AI, language, and identity dependencies.
   * @param {function(string,number): Promise<string>} dependencies.callAI Existing Groq client wrapper.
   * @param {function(string): string} dependencies.normalizeLanguage Production language normalizer from `i18n.js`.
   * @param {function(): string} dependencies.getAiLanguageInstruction Existing host `aiLang` instruction getter.
   * @param {function(): string} dependencies.createEntryId Exact historical diary-entry ID generator.
   * @returns {{requestDishEstimate: function(Object): Promise<Object>, buildDescribedEntry: function(Object): (Object|undefined)}} Configured estimation and entry-construction API.
   */
  function createDishDescriptionAI({
    callAI,
    normalizeLanguage,
    getAiLanguageInstruction,
    createEntryId
  }) {
    if (typeof callAI !== "function" || typeof normalizeLanguage !== "function" ||
        typeof getAiLanguageInstruction !== "function" || typeof createEntryId !== "function") {
      throw new TypeError("DishDescriptionAI requires callAI, normalizeLanguage, getAiLanguageInstruction, and createEntryId functions");
    }

    /**
     * Builds the exact localized dish prompt, requests AI data, and parses its JSON response.
     *
     * @param {Object} input Dish request values captured by the React host.
     * @param {string} input.description Free-text dish description.
     * @param {string} input.lang Current app language.
     * @returns {Promise<Object>} Neutral empty-description result or successful parsed estimate.
     */
    function requestDishEstimate({ description, lang }) {
      const dishDescription = description.trim();
      if (!dishDescription) return Promise.resolve({ status: "empty-description" });

      const normalizedDishLang = normalizeLanguage(lang);
      const prompt = getAiLanguageInstruction() + (normalizedDishLang === 'en' ? `Analyze the following dish and estimate its total nutrition values.

Dish description:
"${dishDescription}"

Instructions:

1. Identify every ingredient mentioned in the description.

2. Prioritize the quantities provided by the user.

3. When explicit quantities are missing, use realistic and consistent standard portions based on common restaurants, home-cooked meals, and typical serving sizes. Avoid exaggerated, rare, or unusual portions.

4. Never invent ingredients that are not described or clearly indicated in the meal.

5. When the user states rice, pasta, beans, lentils, oats, grains, or similar foods as raw/dry, you must use the raw/dry weight for nutrition calculations. Any cooked-weight conversion is only for describing the dish in the note. Never replace the raw/dry weight with cooked weight during calculation.

6. For cooked, grilled, baked, fried, or prepared foods, always consider the weight in the form they are consumed, unless the user explicitly says the weight is raw.

7. Consider sauces, olive oil, butter, frying oil, and other calorie-dense additions only when mentioned or clearly indicated. When uncertain, use a conservative and realistic estimate.

8. When you assume additional ingredients such as oil, butter, cream, sauces, sugar, or similar items to make the estimate more realistic, they MUST appear explicitly in the "note" field with approximate quantities. Never include calories or macronutrients from ingredients that are not listed in the note.

9. Use average values from official and reliable nutrition references:
- USDA (United States)
- TACO (Brazil)
- INSA (Portugal)

10. Sum all ingredients to obtain the total nutrition values for the dish.

11. Confidence must be defined as:
- high: ingredients and quantities are well specified;
- medium: ingredients are known, but some quantities were estimated;
- low: many quantities or ingredients had to be inferred.

12. In the "note" field, briefly explain how the values were estimated, listing the assumed quantities for the main ingredients. Example: "160 g grilled chicken, 90 g cooked rice, 25 g sauce, 10 g olive oil".

13. If the dish has many ingredients, keep the note short and objective, showing only the ingredients with the biggest nutritional impact.

14. Respond ONLY with valid JSON, no markdown, no comments, and no extra text.

Required format:

{
  "name":"short dish name",
  "protein":0,
  "kcal":0,
  "carbs":0,
  "fat":0,
  "fiber":0,
  "salt":0,
  "confidence":"high|medium|low",
  "note":"..."
}` : normalizedDishLang === 'es' ? `Analiza el siguiente plato y estima sus valores nutricionales totales.

Descripción del plato:
"${dishDescription}"

Instrucciones:

1. Identifica todos los ingredientes mencionados en la descripción.

2. Utiliza prioritariamente las cantidades informadas por el usuario.

3. Cuando no haya cantidades explícitas, utiliza porciones estándar realistas y consistentes, basadas en restaurantes comunes, comidas caseras y porciones típicas del alimento. Evita asumir porciones exageradas, raras o poco comunes.

4. Nunca inventes ingredientes que no estén descritos o claramente indicados en la comida.

5. Cuando el usuario informe arroz, pasta, frijoles, lentejas, avena, granos o alimentos similares como crudos/secos, utiliza obligatoriamente el peso crudo/seco en el cálculo nutricional. La conversión a peso cocido sirve solo para describir el plato en la nota. Nunca sustituyas el peso crudo/seco por el peso cocido durante el cálculo.

6. Para alimentos cocidos, a la plancha, asados, fritos o preparados, considera siempre el peso en la forma en que se consumen, salvo cuando el usuario especifique explícitamente peso crudo.

7. Considera salsas, aceite de oliva, mantequilla, fritura y otros ingredientes ricos en calorías solo cuando sean mencionados o claramente indicados. Cuando haya incertidumbre, utiliza una estimación conservadora y realista.

8. Cuando asumas ingredientes adicionales como aceite, aceite de oliva, mantequilla, crema, salsas, azúcar o similares para hacer la estimación más realista, DEBEN aparecer explícitamente en el campo "note" con sus cantidades aproximadas. Nunca incluyas calorías ni macronutrientes de ingredientes que no estén listados en la nota.

9. Utiliza como referencia valores medios de tablas nutricionales oficiales y confiables:
- USDA (Estados Unidos)
- TACO (Brasil)
- INSA (Portugal)

10. Suma todos los ingredientes para obtener los valores nutricionales totales del plato.

11. La confianza debe definirse así:
- alta: ingredientes y cantidades bien especificados;
- media: ingredientes conocidos, pero algunas cantidades fueron estimadas;
- baja: muchas cantidades o ingredientes tuvieron que inferirse.

12. En el campo "note", explica brevemente cómo se estimaron los valores, indicando las cantidades asumidas para los ingredientes principales. Ejemplo: "160 g de pollo a la plancha, 90 g de arroz cocido, 25 g de salsa, 10 g de aceite de oliva".

13. Si el plato tiene muchos ingredientes, mantén la nota corta y objetiva, mostrando solo los ingredientes que más influyen en los valores nutricionales.

14. Responde SOLO con JSON válido, sin markdown, sin comentarios y sin texto adicional.

Formato obligatorio:

{
  "name":"nombre corto del plato",
  "protein":0,
  "kcal":0,
  "carbs":0,
  "fat":0,
  "fiber":0,
  "salt":0,
  "confidence":"alta|media|baja",
  "note":"..."
}` : `Analise o seguinte prato e estime seus valores nutricionais totais.

Descrição do prato:
"${dishDescription}"

Instruções:

1. Identifique todos os ingredientes mencionados na descrição.

2. Utilize prioritariamente as quantidades informadas pelo usuário.

3. Quando não houver quantidades explícitas, utilize porções padrão realistas e consistentes, baseadas em restaurantes comuns, refeições caseiras e porções típicas do alimento. Evite assumir porções exageradas, raras ou incomuns.

4. Nunca invente ingredientes que não estejam descritos ou claramente indicados na refeição.

5. Quando o usuário informar arroz, massa, feijão, lentilha, aveia, grãos ou alimentos semelhantes como cru/seco, utilize obrigatoriamente o peso cru/seco no cálculo nutricional. A conversão para peso cozido serve apenas para descrever o prato na nota. Nunca substitua o peso cru/seco pelo peso cozido durante o cálculo.

6. Para alimentos cozidos, grelhados, assados, fritos ou preparados, considere sempre o peso na forma em que são consumidos, salvo quando o usuário especificar explicitamente peso cru.

7. Considere molhos, azeite, manteiga, fritura e outros ingredientes ricos em calorias apenas quando forem mencionados ou claramente indicados. Quando houver incerteza, utilize uma estimativa conservadora e realista.

8. Quando assumir ingredientes adicionais como óleo, azeite, manteiga, creme, molhos, açúcar ou similares para tornar a estimativa mais realista, eles DEVEM aparecer explicitamente no campo "note" com suas quantidades aproximadas. Nunca inclua calorias ou macronutrientes provenientes de ingredientes que não estejam listados na nota.

9. Utilize como referência valores médios de tabelas nutricionais oficiais e confiáveis:
- TACO (Brasil)
- USDA (Estados Unidos)
- INSA (Portugal)

10. Some todos os ingredientes para obter os valores nutricionais totais do prato.

11. A confiança deve ser definida assim:
- alta: ingredientes e quantidades bem especificados;
- media: ingredientes conhecidos, mas algumas quantidades estimadas;
- baixa: muitas quantidades ou ingredientes precisaram ser inferidos.

12. No campo "note", explique resumidamente como os valores foram estimados, indicando as quantidades assumidas para os principais ingredientes. Exemplo: "160 g de frango grelhado, 90 g de arroz cozido, 25 g de molho, 10 g de azeite".

13. Se o prato possuir muitos ingredientes, mantenha a nota curta e objetiva, mostrando apenas os ingredientes que mais influenciam nos valores nutricionais.

14. Responda APENAS com JSON válido, sem markdown, sem comentários e sem texto adicional.

Formato obrigatório:

{
  "name":"nome curto do prato",
  "protein":0,
  "kcal":0,
  "carbs":0,
  "fat":0,
  "fiber":0,
  "salt":0,
  "confidence":"alta|media|baixa",
  "note":"..."
}`);

      return callAI(prompt, 600).then(text => {
        const clean = text.replace(/```json|```/g, "").trim();
        return { status: "success", result: JSON.parse(clean) };
      });
    }

    /**
     * Builds the historical estimated diary-entry shape from a parsed estimate.
     *
     * @param {Object} input Entry values supplied by the React host at action time.
     * @param {Object|null|undefined} input.estimate Parsed AI estimate; a falsy value produces no entry.
     * @param {string} input.description Current description, deliberately read independently of the request.
     * @returns {Object|undefined} Estimated diary entry, or undefined when no estimate exists.
     */
    function buildDescribedEntry({ estimate, description }) {
      if (!estimate) return;
      return {
        id: createEntryId(),
        foodId: null,
        name: estimate.name || "Prato estimado",
        qty: 1,
        unit: "un",
        protein: estimate.protein || 0,
        kcal: estimate.kcal || 0,
        carbs: estimate.carbs || 0,
        fat: estimate.fat || 0,
        fiber: estimate.fiber || 0,
        salt: estimate.salt || 0,
        sugars: null,
        satfat: null,
        _estimated: true,
        _description: description.trim()
      };
    }

    return { requestDishEstimate, buildDescribedEntry };
  }

  return { createDishDescriptionAI };
});
