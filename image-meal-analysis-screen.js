/**
 * Full-screen, honest progress state for photo meal analysis.
 *
 * The captured photo stays visible and unblurred. Only the dark scrim is
 * layered over it; the copy deliberately avoids claiming backend phases that
 * the Worker does not expose.
 *
 * @module ImageMealAnalysisScreen
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ImageMealAnalysisScreenModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function createImageMealAnalysisScreen({ React, pickLang }) {
    if (!React || typeof React.createElement !== "function" || typeof pickLang !== "function") {
      throw new TypeError("ImageMealAnalysisScreen requires React and pickLang");
    }

    function ImageMealAnalysisScreen({ photoUrl, lang, onCancel }) {
      const text = (pt, en, es) => pickLang(lang, pt, en, es);
      const secondaryMessages = [
        text("Identificando o que está no prato", "Identifying what is on the plate", "Identificando lo que hay en el plato"),
        text("Estimando porções e nutrientes", "Estimating portions and nutrients", "Estimando porciones y nutrientes"),
        text("Preparando sua estimativa", "Preparing your estimate", "Preparando tu estimación")
      ];
      const [messageIndex, setMessageIndex] = React.useState(0);

      React.useEffect(() => {
        const reducedMotion = typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reducedMotion) return undefined;
        const interval = setInterval(() => {
          setMessageIndex(current => (current + 1) % secondaryMessages.length);
        }, 2800);
        return () => clearInterval(interval);
      }, [lang]);

      return React.createElement("div", {
        "data-image-meal-analysis": "true",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": text("Análise da refeição", "Meal analysis", "Análisis de la comida")
      },
      React.createElement("img", {
        src: photoUrl,
        alt: "",
        "aria-hidden": "true",
        "data-image-meal-analysis-photo": "true"
      }),
      React.createElement("div", {
        "aria-hidden": "true",
        "data-image-meal-analysis-scrim": "true"
      }),
      React.createElement("div", { "data-image-meal-analysis-content": "true" },
        React.createElement("div", {
          role: "status",
          "aria-live": "polite",
          "aria-atomic": "true",
          "data-image-meal-analysis-status": "true"
        },
        React.createElement("div", {
          "aria-hidden": "true",
          "data-image-meal-analysis-progress": "true"
        },
        React.createElement("span", null),
        React.createElement("span", null),
        React.createElement("span", null)),
        React.createElement("h2", null, text(
          "Analisando a refeição",
          "Analyzing the meal",
          "Analizando la comida"
        )),
        React.createElement("p", null, secondaryMessages[messageIndex])),
        React.createElement("button", {
          type: "button",
          onClick: onCancel,
          "data-image-meal-cancel": "true"
        }, text("Cancelar", "Cancel", "Cancelar"))));
    }

    return { ImageMealAnalysisScreen };
  }

  return { createImageMealAnalysisScreen };
});
