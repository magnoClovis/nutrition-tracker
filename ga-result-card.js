/**
 * Presentational card for one genetic-algorithm meal suggestion.
 *
 * The existing render-time calculations are intentionally kept inside this
 * component: meal nutrient projection, current-day impact, and score display.
 * The host supplies the real MealScore-backed evaluator and the add callback.
 * GA execution, progress, cancellation limitations, and diary persistence stay
 * in `NutritionTracker`.
 *
 * @module GaResultCard
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GaResultCardModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the GA result card with explicit React/i18n dependencies.
   *
   * @param {Object} dependencies Injected dependencies.
   * @param {Object} dependencies.React React runtime supplied by the host.
   * @param {function(string,string,string,string): string} dependencies.pickLang Language picker from `i18n.js`.
   * @returns {{GaResultCard: function(Object): Object}} Component API.
   */
  function createGaResultCard({ React, pickLang }) {
    if (!React || typeof React.createElement !== "function" || typeof pickLang !== "function") {
      throw new TypeError("GaResultCard requires React and pickLang");
    }

    function buttonStyle(bg, border, color) {
      return {
        background: bg,
        border: "1px solid " + border,
        color,
        borderRadius: 4,
        padding: "6px 10px",
        fontSize: 14,
        letterSpacing: 1,
        textTransform: "uppercase",
        cursor: "pointer"
      };
    }

    /**
     * Renders one GA option and its projected effect on the current day.
     *
     * @param {Object} props Card props.
     * @param {Object} props.result GA result with totals and `{food,gene}` items.
     * @param {number} props.index Result rank.
     * @param {Object} props.activeLog Current diary log snapshot.
     * @param {Object} props.goals Current nutrition goals.
     * @param {string} props.lang Active language.
     * @param {boolean} props.isMobileView Whether mobile layout is active.
     * @param {function(Array<Object>): (Object|null)} props.evaluateMealItems Real MealScore-backed evaluator.
     * @param {function(Object): string} props.getMealScoreBrief Localized score summary.
     * @param {function(Object): string} props.getMealScoreEvaluationText Localized evaluation count.
     * @param {function(Object): void} props.onAdd Callback that adds this result to the diary.
     * @returns {Object} React element for the GA result card.
     */
    function GaResultCard({
      result,
      index,
      activeLog,
      goals,
      lang,
      isMobileView,
      evaluateMealItems,
      getMealScoreBrief,
      getMealScoreEvaluationText,
      onAdd
    }) {
      const uiText = (pt, en, es) => pickLang(lang, pt, en, es);
      const currentEntries = Object.values(activeLog).flat();
      const scoreEntries = result.items.map(({ food, gene }) => ({
        protein: food.protein100 == null ? null : Number(food.protein100) * gene,
        kcal: food.kcal100 == null ? null : Number(food.kcal100) * gene,
        carbs: food.carbs100 == null ? null : Number(food.carbs100) * gene,
        fat: food.fat100 == null ? null : Number(food.fat100) * gene,
        fiber: food.fiber100 == null ? null : Number(food.fiber100) * gene,
        satfat: food.satfat100 == null ? null : Number(food.satfat100) * gene,
        salt: food.salt100 == null ? null : Number(food.salt100) * gene
      }));
      const mealQuality = evaluateMealItems(scoreEntries);
      const mealQualityBand = mealQuality && mealQuality.score >= 4
        ? uiText("Bem alinhada", "Well aligned", "Bien alineada")
        : mealQuality && mealQuality.score >= 3
          ? uiText("Parcialmente alinhada", "Partially aligned", "Parcialmente alineada")
          : uiText("Pouco alinhada", "Low alignment", "Poco alineada");
      const mealQualityConfidence = mealQuality ? ({
        high: uiText("Alta", "High", "Alta"),
        medium: uiText("Média", "Medium", "Media"),
        low: uiText("Baixa", "Low", "Baja")
      }[mealQuality.confidence] || uiText("Indisponível", "Unavailable", "No disponible")) : "";
      const scoreNutrientLabel = key => ({
        kcal: uiText("Calorias", "Calories", "Calorías"),
        protein: uiText("Proteína", "Protein", "Proteína"),
        carbs: uiText("Carboidratos", "Carbohydrates", "Carbohidratos"),
        fat: uiText("Gorduras", "Fat", "Grasas"),
        fiber: uiText("Fibra", "Fiber", "Fibra"),
        salt: uiText("Sal", "Salt", "Sal")
      })[key] || key;
      const provisionalReasonText = reason => {
        const scope = reason.scope === "consumed"
          ? uiText("registros anteriores do dia", "earlier entries today", "registros anteriores del día")
          : uiText("alimentos desta refeição", "foods in this meal", "alimentos de esta comida");
        return `${scoreNutrientLabel(reason.nutrient)}: ${uiText("faltam dados em", "data is missing for", "faltan datos en")} ${Number(reason.missingItemCount) || 0} ${uiText("de", "of", "de")} ${Number(reason.totalItemCount) || 0} ${scope}.`;
      };
      const eatenProtein = currentEntries.reduce((sum, entry) => sum + (Number(entry.protein) || 0), 0);
      const eatenKcal = currentEntries.reduce((sum, entry) => sum + (Number(entry.kcal) || 0), 0);
      const proteinGoal = Number(goals.protein) || 0;
      const kcalGoal = Number(goals.kcal) || 0;
      const afterProtein = eatenProtein + (Number(result.protein) || 0);
      const afterKcal = eatenKcal + (Number(result.kcal) || 0);
      const proteinRemaining = Math.max(0, proteinGoal - eatenProtein);
      const kcalRemaining = Math.max(0, kcalGoal - eatenKcal);
      const proteinOver = Math.max(0, afterProtein - proteinGoal);
      const kcalOver = Math.max(0, afterKcal - kcalGoal);
      const proteinPercent = proteinGoal ? Math.round(afterProtein / proteinGoal * 100) : 0;
      const kcalPercent = kcalGoal ? Math.round(afterKcal / kcalGoal * 100) : 0;
      const optionLabel = index === 0
        ? uiText("Melhor op\u00e7\u00e3o", "Best option", "Mejor opci\u00f3n")
        : uiText("Uma das melhores", "Strong option", "Una de las mejores");
      const fitLabel = Number.isFinite(result.fit)
        ? uiText("ajuste ", "fit ", "ajuste ") + Math.round(result.fit * 100) / 100
        : "";
      const metricChip = (label, value, color) => React.createElement("span", {
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 7px",
          borderRadius: 999,
          background: "var(--surface)",
          border: "1px solid var(--border2)",
          color,
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: "nowrap"
        }
      }, label, " ", value);

      return React.createElement("div", {
        style: {
          background: "var(--surface3)",
          border: "1px solid var(--border3)",
          borderRadius: 10,
          padding: isMobileView ? 10 : 12
        }
      },
      React.createElement("div", {
        style: {
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          gap: 10, marginBottom: 8
        }
      },
      React.createElement("div", null,
        React.createElement("div", {
          style: { color: "var(--text2)", fontWeight: 800, fontSize: 15 }
        }, uiText("Op\u00e7\u00e3o ", "Option ", "Opci\u00f3n ") + (index + 1)),
        React.createElement("div", {
          style: {
            marginTop: 3, color: index === 0 ? "var(--btn-ok-text)" : "var(--muted)",
            fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8
          }
        }, optionLabel, fitLabel ? " \u00b7 " + fitLabel : "")
      ),
      React.createElement("div", {
        style: { display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 6 }
      }, metricChip("kcal", Math.round(result.kcal || 0), "#8ec8c8"), metricChip("prot", Math.round(result.protein || 0) + "g", "#c8a24f"))
      ),
      React.createElement("div", {
        style: {
          display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: 8, marginBottom: 10
        }
      },
      React.createElement("div", {
        style: {
          background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 8,
          padding: 8, color: "var(--text3)", fontSize: 12, lineHeight: 1.45
        }
      },
      React.createElement("b", { style: { color: "var(--text2)" } }, uiText("Impacto no dia", "Impact today", "Impacto en el d\u00eda")),
      React.createElement("div", null, uiText("Prote\u00edna depois: ", "Protein after: ", "Prote\u00edna despu\u00e9s: "), Math.round(afterProtein), " / ", Math.round(proteinGoal), "g (", proteinPercent, "%)", proteinOver ? " +" + Math.round(proteinOver) + "g" : ""),
      React.createElement("div", null, uiText("Calorias depois: ", "Calories after: ", "Calor\u00edas despu\u00e9s: "), Math.round(afterKcal), " / ", Math.round(kcalGoal), "kcal (", kcalPercent, "%)", kcalOver ? " +" + Math.round(kcalOver) + "kcal" : "")
      ),
      React.createElement("div", {
        style: {
          background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 8,
          padding: 8, color: "var(--text3)", fontSize: 12, lineHeight: 1.45
        }
      },
      React.createElement("b", { style: { color: "var(--text2)" } }, uiText("Parcela do que faltava no dia", "Share of what was left today", "Parte de lo que faltaba hoy")),
      React.createElement("div", null, uiText("Usa ", "Uses ", "Usa "), proteinRemaining ? Math.round((result.protein || 0) / proteinRemaining * 100) : 100, uiText("% da prote\u00edna restante", "% of remaining protein", "% de la prote\u00edna restante")),
      React.createElement("div", null, uiText("Usa ", "Uses ", "Usa "), kcalRemaining ? Math.round((result.kcal || 0) / kcalRemaining * 100) : 100, uiText("% das calorias restantes", "% of remaining calories", "% de las calor\u00edas restantes"))
      )),
      mealQuality && mealQuality.valid && React.createElement("div", {
        style: {
          background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 8,
          padding: 9, marginBottom: 10, fontSize: 12, color: "var(--text3)", lineHeight: 1.45
        }
      },
      React.createElement("div", { style: { display: "flex", justifyContent: "flex-start", flexWrap: "wrap", gap: 8, alignItems: "baseline", marginBottom: 4 } },
        React.createElement("b", { style: { color: "var(--text2)" } }, uiText("Adequação ao restante do dia", "Fit with the rest of the day", "Adecuación al resto del día")),
        React.createElement("span", { style: { fontSize: 17, fontWeight: 800, color: mealQuality.score >= 4 ? "var(--btn-ok-text)" : mealQuality.score >= 3 ? "#c8a96e" : "#c86e8e" } }, mealQuality.score.toFixed(2), "/5")
      ),
      React.createElement("div", { style: { fontWeight: 700, marginBottom: 3 } }, mealQualityBand),
      React.createElement("div", null, getMealScoreBrief(mealQuality)),
      React.createElement("div", { style: { color: "var(--dim)", marginTop: 3 } }, getMealScoreEvaluationText(mealQuality)),
      React.createElement("div", { style: { color: "var(--dim)", marginTop: 3 } }, uiText("Confiança dos dados: ", "Data confidence: ", "Confianza de los datos: "), mealQualityConfidence, " · ", Math.round((Number(mealQuality.coverage) || 0) * 100), "%"),
      mealQuality.provisional && React.createElement("div", { "data-ga-score-provisional": "true", style: { color: "var(--btn-warn-text)", marginTop: 5 } },
        React.createElement("b", null, uiText("Nota provisória. ", "Provisional score. ", "Nota provisional. ")),
        (mealQuality.provisionalReasons || []).map(provisionalReasonText).join(" ")
      ),
      React.createElement("div", { style: { color: "var(--dim)", marginTop: 4 } }, uiText(
        "Faixas: 0–2,99 pouco alinhada · 3–3,99 parcialmente alinhada · 4–5 bem alinhada.",
        "Ranges: 0–2.99 low alignment · 3–3.99 partially aligned · 4–5 well aligned.",
        "Rangos: 0–2,99 poco alineada · 3–3,99 parcialmente alineada · 4–5 bien alineada."
      ))
      ),
      React.createElement("div", {
        style: { display: "grid", gap: 5, marginBottom: 10 }
      }, result.items.map((item, itemIndex) => {
        const qty = item.food.unit === "un" ? item.gene : item.gene * 100;
        const itemProtein = (Number(item.food.protein100) || 0) * item.gene;
        const itemKcal = (Number(item.food.kcal100) || 0) * item.gene;
        return React.createElement("div", {
          key: itemIndex,
          style: {
            display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "3px 10px",
            color: "var(--text3)", fontSize: 13, padding: "3px 0",
            borderBottom: itemIndex === result.items.length - 1 ? "none" : "1px solid var(--border3)"
          }
        },
        React.createElement("span", null, "\u2022 ", item.food.name, ": ", qty, item.food.unit === "un" ? " un" : "g"),
        React.createElement("span", {
          style: { color: "var(--muted)", whiteSpace: "nowrap" }
        }, Math.round(itemKcal), " kcal \u00b7 ", Math.round(itemProtein), "g"));
      })),
      React.createElement("button", {
        onClick: () => onAdd(result),
        style: {
          ...buttonStyle("var(--btn-ok)", "var(--btn-ok-border)", "var(--btn-ok-text)"),
          marginTop: 4
        }
      }, uiText("Adicionar ao di\u00e1rio", "Add to diary", "A\u00f1adir al diario")));
    }

    return { GaResultCard };
  }

  return { createGaResultCard };
});
