/**
 * Presentational modal for an already-calculated meal assessment.
 *
 * The host owns assessment state, AI request timing, persistence, and action
 * callbacks. This module only renders the supplied review snapshot. Known
 * races where an older AI explanation can replace a newer one, and where a
 * synchronous prompt failure can leave loading active, remain in the host.
 *
 * @module MealReviewModal
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MealReviewModalModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the modal with React and the existing language picker.
   *
   * @param {Object} dependencies Injected dependencies.
   * @param {Object} dependencies.React React runtime supplied by the host.
   * @param {function(string,string,string,string): string} dependencies.pickLang Language picker from `i18n.js`.
   * @returns {{MealReviewModal: function(Object): (Object|null)}} Component API.
   */
  function createMealReviewModal({ React, pickLang }) {
    if (!React || typeof React.createElement !== "function" || typeof pickLang !== "function") {
      throw new TypeError("MealReviewModal requires React and pickLang");
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
     * Renders a meal review and delegates every state transition to callbacks.
     *
     * @param {Object} props Modal props.
     * @param {Object|null} props.review Review snapshot `{meal,items,source,result}`.
     * @param {string} props.lang Active language.
     * @param {boolean} props.darkMode Whether the host uses the dark theme.
     * @param {boolean} props.isMobileView Whether the mobile layout is active.
     * @param {boolean} props.helpOpen Whether explanatory help is expanded.
     * @param {boolean} props.aiLoading Whether the AI explanation is loading.
     * @param {string} props.aiText Current AI explanation.
     * @param {function(string): string} props.getMealLabel Localized meal-key label.
     * @param {function(Object): string} props.getEvaluationText Assessment-count copy.
     * @param {function(Object): string} props.getBrief Assessment summary copy.
     * @param {function(string): string} props.getScoreLabel Nutrient-key label.
     * @param {function(): void} props.onClose Close/edit callback.
     * @param {function(): void} props.onToggleHelp Help-toggle callback.
     * @param {function(): void} props.onReevaluate Re-evaluation callback.
     * @param {function(): void} props.onConfirm Confirmation callback.
     * @returns {Object|null} Modal React element, or null without a review.
     */
    function MealReviewModal({
      review,
      lang,
      darkMode,
      isMobileView,
      helpOpen,
      aiLoading,
      aiText,
      getMealLabel,
      getEvaluationText,
      getBrief,
      getScoreLabel,
      onClose,
      onToggleHelp,
      onReevaluate,
      onConfirm
    }) {
      if (!review) return null;
      const uiText = (pt, en, es) => pickLang(lang, pt, en, es);
      const result = review.result;
      const availableComponents = Object.values(result.components).filter(component => component.available);
      const scoreColor = result.score >= 4 ? "var(--btn-ok-text)" : result.score >= 3 ? "#c8a96e" : "#c86e8e";

      return React.createElement("div", {
        "data-meal-review-modal": "true",
        "data-safe-area-dialog": "16",
        "data-theme": darkMode ? "dark" : "light",
        onClick: onClose,
        style: {
          position: "fixed", inset: 0, zIndex: 10020, background: "rgba(0,0,0,0.72)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }
      }, React.createElement("div", {
        "data-meal-review-panel": "true",
        onClick: event => event.stopPropagation(),
        style: {
          width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto",
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
          padding: isMobileView ? 14 : 20, boxShadow: "0 18px 60px rgba(0,0,0,0.4)"
        }
      },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 } },
        React.createElement("div", null,
          React.createElement("div", { style: { fontSize: 14, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted)" } }, uiText("Avalia\u00e7\u00e3o da refei\u00e7\u00e3o", "Meal assessment", "Evaluaci\u00f3n de la comida")),
          React.createElement("div", { style: { fontSize: 12, color: "var(--dim)", marginTop: 4 } }, getMealLabel(review.meal), " \u00b7 ", Math.round(result.hoursLeft * 10) / 10, "h ", uiText("at\u00e9 meia-noite", "until midnight", "hasta medianoche"))
        ),
        React.createElement("button", { onClick: onClose, style: { background: "none", border: "none", color: "var(--muted)", fontSize: 22, cursor: "pointer" } }, "\u00d7")
      ),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "160px 1fr", gap: 12, marginBottom: 14 } },
        React.createElement("div", { style: { background: "var(--bg)", border: "1px solid var(--border3)", borderRadius: 10, padding: 14, textAlign: "center" } },
          React.createElement("div", { style: { fontSize: 34, fontWeight: 800, color: scoreColor } }, result.score.toFixed(2)),
          React.createElement("div", { style: { fontSize: 12, color: "var(--muted)", marginTop: 3 } }, uiText("de 5,00", "out of 5.00", "de 5,00")),
          React.createElement("div", { style: { fontSize: 11, color: "var(--dim)", marginTop: 8 } }, getEvaluationText(result))
        ),
        React.createElement("div", { style: { background: "var(--bg)", border: "1px solid var(--border3)", borderRadius: 10, padding: 12, color: "var(--text3)", fontSize: 13, lineHeight: 1.5 } }, getBrief(result), result.missing.length ? React.createElement("div", { style: { color: "var(--dim)", marginTop: 7 } }, uiText("N\u00e3o avaliados: ", "Not evaluated: ", "No evaluados: "), result.missing.map(getScoreLabel).join(", "), ".") : null)
      ),
      React.createElement("button", {
        type: "button",
        onClick: onToggleHelp,
        style: {
          background: "var(--btn-info)", border: "1px solid var(--btn-info-border)", color: "var(--btn-info-text)",
          borderRadius: 999, padding: "7px 11px", margin: "0 0 8px", cursor: "pointer",
          fontFamily: "inherit", fontSize: 12, fontWeight: 700
        }
      }, "\u24d8 ", uiText("O que estou vendo?", "What am I seeing?", "\u00bfQu\u00e9 estoy viendo?")),
      React.createElement("div", {
        style: { fontSize: 12, color: "var(--dim)", lineHeight: 1.45, marginBottom: 12 }
      }, uiText(
        "\u201cRefer\u00eancia para agora\u201d \u00e9 a quantidade sugerida para uma refei\u00e7\u00e3o neste momento, calculada pelo que ainda falta nas metas e pelo tempo at\u00e9 meia-noite.",
        "\u201cReference for now\u201d is the suggested amount for one meal at this moment, calculated from what remains in your targets and the time until midnight.",
        "\u201cReferencia para ahora\u201d es la cantidad sugerida para una comida en este momento, calculada seg\u00fan lo que falta en tus metas y el tiempo hasta medianoche."
      )),
      helpOpen && React.createElement("div", {
        style: {
          background: "var(--ai-bg)", border: "1px solid var(--ai-border)", borderRadius: 8,
          padding: 10, marginBottom: 12, color: "var(--text3)", fontSize: 12, lineHeight: 1.5
        }
      },
      React.createElement("div", null, React.createElement("b", null, uiText("Nota: ", "Score: ", "Nota: ")), uiText("mede de 0 a 5 o alinhamento desta refei\u00e7\u00e3o com o restante das metas de hoje.", "measures from 0 to 5 how well this meal fits the rest of today's targets.", "mide de 0 a 5 cu\u00e1nto encaja esta comida con el resto de las metas de hoy.")),
      React.createElement("div", { style: { marginTop: 5 } }, React.createElement("b", null, uiText("Nutrientes avaliados: ", "Nutrients evaluated: ", "Nutrientes evaluados: ")), uiText("indica quantos nutrientes tinham dados suficientes. Um nutriente opcional ausente \u00e9 exclu\u00eddo da conta, nunca tratado como zero.", "shows how many nutrients had enough data. A missing optional nutrient is excluded, never treated as zero.", "indica cu\u00e1ntos nutrientes ten\u00edan datos suficientes. Un nutriente opcional ausente se excluye, nunca se trata como cero.")),
      React.createElement("div", { style: { marginTop: 5 } }, React.createElement("b", null, uiText("Refer\u00eancia para agora: ", "Reference for now: ", "Referencia para ahora: ")), uiText("\u00e9 a parcela do que ainda falta no dia ajustada pelas horas at\u00e9 meia-noite; n\u00e3o \u00e9 um limite di\u00e1rio nem uma cota fixa por refei\u00e7\u00e3o.", "is the share of what remains today adjusted by the hours until midnight; it is neither a daily limit nor a fixed per-meal quota.", "es la parte de lo que falta hoy ajustada por las horas hasta medianoche; no es un l\u00edmite diario ni una cuota fija por comida."))
      ),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 14 } }, availableComponents.map(component => React.createElement("div", { key: component.key, style: { background: "var(--surface3)", border: "1px solid var(--border3)", borderRadius: 8, padding: "9px 10px" } },
        React.createElement("div", { style: { fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.8 } }, getScoreLabel(component.key)),
        React.createElement("div", { style: { fontSize: 18, color: component.score >= 0.85 ? "var(--btn-ok-text)" : component.score >= 0.6 ? "#c8a96e" : "#c86e8e", fontWeight: 750, marginTop: 3 } }, (component.score * 5).toFixed(2)),
        React.createElement("div", { style: { fontSize: 11, color: "var(--dim)", marginTop: 4 } },
          Math.round(component.mealAmount * 10) / 10, component.key === "kcal" ? " kcal" : "g",
          " \u00b7 ", uiText("refer\u00eancia para agora ", "reference for now ", "referencia para ahora "), Math.round(component.quota * 10) / 10, component.key === "kcal" ? " kcal" : "g",
          component.candidateComplete === false ? " \u00b7 " + uiText("dados de ", "data from ", "datos de ") + component.candidateKnownCount + "/" + component.candidateItemCount + uiText(" itens", " items", " \u00edtems") : ""
        )
      ))),
      React.createElement("div", { style: { background: "var(--ai-bg)", border: "1px solid var(--ai-border)", borderRadius: 10, padding: 12, marginBottom: 14 } },
        React.createElement("div", { style: { fontSize: 12, color: "var(--ai-text)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 } }, "\u2726 ", uiText("Explica\u00e7\u00e3o", "Explanation", "Explicaci\u00f3n")),
        React.createElement("div", { style: { fontSize: 13, color: "var(--text3)", lineHeight: 1.55, whiteSpace: "pre-wrap" } }, aiLoading ? uiText("Analisando...", "Analyzing...", "Analizando...") : aiText || uiText("A nota foi calculada localmente. Configure a chave de IA para receber uma explica\u00e7\u00e3o personalizada.", "The score was calculated locally. Configure the AI key for a personalized explanation.", "La nota fue calculada localmente. Configura la clave de IA para recibir una explicaci\u00f3n personalizada."))
      ),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr 1.3fr", gap: 8 } },
        React.createElement("button", { onClick: onClose, style: buttonStyle("transparent", "var(--border2)", "var(--text2)") }, uiText("Editar", "Edit", "Editar")),
        React.createElement("button", { onClick: onReevaluate, style: buttonStyle("var(--btn-info)", "var(--btn-info-border)", "var(--btn-info-text)") }, uiText("Reavaliar", "Re-evaluate", "Reevaluar")),
        React.createElement("button", { onClick: onConfirm, style: buttonStyle("var(--btn-ok)", "var(--btn-ok-border)", "var(--btn-ok-text)") }, uiText("Registrar mesmo assim", "Log anyway", "Registrar igualmente"))
      )));
    }

    return { MealReviewModal };
  }

  return { createMealReviewModal };
});
