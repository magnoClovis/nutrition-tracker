/**
 * Dedicated controlled screen for the image meal-recognition journey.
 *
 * @module ImageMealScreen
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ImageMealScreenModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function createImageMealScreen({ React, pickLang, MealEstimateEditor }) {
    if (!React || typeof React.createElement !== "function" ||
        typeof pickLang !== "function" || typeof MealEstimateEditor !== "function") {
      throw new TypeError("ImageMealScreen requires React, pickLang, and MealEstimateEditor");
    }

    const buttonStyle = {
      border: "1px solid var(--border2)",
      borderRadius: 8,
      padding: "10px 14px",
      fontFamily: "inherit",
      cursor: "pointer"
    };

    function ImageMealScreen({
      state,
      lang,
      isMobileView,
      onClose,
      onCapture,
      onChoose,
      onProcess,
      onCancelProcessing,
      onDiscard,
      onEstimateChange,
      onConfirm
    }) {
      if (!state) return null;
      const text = (pt, en, es) => pickLang(lang, pt, en, es);
      const phase = state.phase || "empty";
      const busy = phase === "capturing" || phase === "processing" || phase === "confirming";

      const errorMessages = {
        "permission-denied": text(
          "Permissão da câmera negada. Libere o acesso nas configurações ou escolha uma foto.",
          "Camera permission was denied. Allow access in settings or choose a photo.",
          "Se denegó el permiso de cámara. Actívalo en ajustes o elige una foto."
        ),
        "invalid-photo": text(
          "Não foi possível usar esta foto. Escolha uma imagem válida e tente novamente.",
          "This photo could not be used. Choose a valid image and try again.",
          "No se pudo usar esta foto. Elige una imagen válida e inténtalo de nuevo."
        ),
        "quota-reached": text(
          "O limite de análises por imagem foi atingido.",
          "The image-analysis limit has been reached.",
          "Se alcanzó el límite de análisis de imágenes."
        ),
        "session-expired": text(
          "Sua sessão expirou. Entre novamente antes de analisar a foto.",
          "Your session has expired. Sign in again before analyzing the photo.",
          "Tu sesión ha caducado. Inicia sesión de nuevo antes de analizar la foto."
        ),
        "service-unavailable": text(
          "A análise por imagem está temporariamente indisponível.",
          "Image analysis is temporarily unavailable.",
          "El análisis de imágenes no está disponible temporalmente."
        ),
        "invalid-response": text(
          "A resposta recebida não pôde ser validada. Tente analisar novamente.",
          "The response could not be validated. Try analyzing again.",
          "No se pudo validar la respuesta. Intenta analizar de nuevo."
        ),
        "confirmation-failed": text(
          "Não foi possível registrar a refeição. Seus ajustes foram mantidos.",
          "The meal could not be recorded. Your edits were kept.",
          "No se pudo registrar la comida. Tus cambios se conservaron."
        )
      };

      function action(label, onClick, primary, extra = {}) {
        return React.createElement("button", {
          type: "button",
          onClick,
          disabled: busy && !extra.allowWhileBusy,
          style: {
            ...buttonStyle,
            background: primary ? "var(--btn-ok)" : "var(--btn-inactive)",
            borderColor: primary ? "var(--btn-ok-border)" : "var(--border2)",
            color: primary ? "var(--btn-ok-text)" : "var(--text2)",
            opacity: busy && !extra.allowWhileBusy ? 0.6 : 1,
            ...extra.style
          },
          ...extra.props
        }, label);
      }

      const photo = state.photo && state.photo.previewUrl
        ? React.createElement("img", {
            src: state.photo.previewUrl,
            alt: text("Foto da refeição", "Meal photo", "Foto de la comida"),
            "data-image-meal-preview": "true",
            style: {
              display: "block",
              width: "100%",
              maxHeight: isMobileView ? "34vh" : 360,
              objectFit: "contain",
              borderRadius: 10,
              background: "#111"
            }
          })
        : null;

      let content;
      if (phase === "empty") {
        content = React.createElement("div", {
          "data-image-meal-state": "empty",
          style: { textAlign: "center", padding: "28px 12px" }
        },
        React.createElement("div", { style: { fontSize: 42, marginBottom: 10 } }, "📷"),
        React.createElement("p", { style: { color: "var(--muted)", lineHeight: 1.5 } }, text(
          "Fotografe a refeição ou escolha uma imagem para estimar alimentos e nutrientes.",
          "Photograph the meal or choose an image to estimate foods and nutrients.",
          "Fotografía la comida o elige una imagen para estimar alimentos y nutrientes."
        )),
        React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" } },
          action(text("Tirar foto", "Take photo", "Tomar foto"), onCapture, true),
          action(text("Escolher da galeria", "Choose from gallery", "Elegir de la galería"), onChoose, false)));
      } else if (phase === "capturing") {
        content = React.createElement("div", {
          role: "status",
          "data-image-meal-state": "capturing",
          style: { textAlign: "center", padding: 28, color: "var(--muted)" }
        }, text("Preparando a foto...", "Preparing photo...", "Preparando la foto..."));
      } else if (phase === "photo") {
        content = React.createElement("div", { "data-image-meal-state": "photo" },
          photo,
          React.createElement("p", { style: { color: "var(--muted)", textAlign: "center", lineHeight: 1.45 } }, text(
            "Confira se o prato está visível antes de iniciar a análise.",
            "Check that the meal is visible before starting the analysis.",
            "Comprueba que la comida sea visible antes de iniciar el análisis."
          )),
          React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" } },
            action(text("Analisar foto", "Analyze photo", "Analizar foto"), onProcess, true),
            action(text("Tirar outra", "Take another", "Tomar otra"), onCapture, false),
            action(text("Escolher outra", "Choose another", "Elegir otra"), onChoose, false),
            action(text("Descartar", "Discard", "Descartar"), onDiscard, false)));
      } else if (phase === "processing") {
        content = React.createElement("div", { "data-image-meal-state": "processing" },
          photo,
          React.createElement("div", {
            role: "status",
            "aria-live": "polite",
            style: { textAlign: "center", padding: 18 }
          },
          React.createElement("div", {
            "aria-hidden": "true",
            style: { fontSize: 28, animation: "pulse 1.2s ease-in-out infinite" }
          }, "✦"),
          React.createElement("p", { style: { color: "var(--text2)" } }, text(
            "Analisando prato, alimentos e quantidades...",
            "Analyzing dish, foods, and quantities...",
            "Analizando plato, alimentos y cantidades..."
          )),
          action(text("Cancelar análise", "Cancel analysis", "Cancelar análisis"), onCancelProcessing, false, {
            allowWhileBusy: true,
            props: { "data-image-meal-cancel": "true" }
          })));
      } else if (phase === "result" || phase === "confirming") {
        const estimate = state.estimate;
        content = React.createElement("div", { "data-image-meal-state": phase },
          photo,
          React.createElement("div", {
            style: { margin: "14px 0", padding: 12, borderRadius: 9, background: "var(--ai-bg)", border: "1px solid var(--ai-border)" }
          },
          React.createElement("strong", { style: { color: "var(--ai-text)", fontSize: 16 } }, estimate?.dishName || ""),
          React.createElement("div", { style: { color: "var(--muted)", fontSize: 12, marginTop: 4 } },
            text("Confiança", "Confidence", "Confianza"), ": ", estimate?.overallConfidence || "low", " · ",
            Array.isArray(estimate?.items) ? estimate.items.length : 0, " ",
            text("alimentos", "foods", "alimentos"))),
          state.error && React.createElement("div", { role: "alert", style: { color: "var(--danger, #c86e8e)", marginBottom: 10 } }, errorMessages[state.error]),
          React.createElement(MealEstimateEditor, {
            estimate,
            lang,
            isMobileView,
            disabled: phase === "confirming",
            errors: state.validationErrors,
            onChange: onEstimateChange
          }),
          React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 } },
            action(
              phase === "confirming"
                ? text("Registrando...", "Recording...", "Registrando...")
                : text("Confirmar refeição", "Confirm meal", "Confirmar comida"),
              onConfirm,
              true
            ),
            action(text("Analisar novamente", "Analyze again", "Analizar de nuevo"), onProcess, false),
            action(text("Descartar foto", "Discard photo", "Descartar foto"), onDiscard, false)));
      } else if (phase === "not-identifiable") {
        const notFood = state.notIdentifiableReason === "not-food";
        content = React.createElement("div", { "data-image-meal-state": "not-identifiable" },
          photo,
          React.createElement("div", { role: "alert", style: { padding: 16, textAlign: "center" } },
            React.createElement("strong", null, text(
              "Nada identificável para registrar",
              "Nothing identifiable to record",
              "Nada identificable para registrar"
            )),
            React.createElement("p", { style: { color: "var(--muted)" } }, notFood ? text(
              "A imagem não parece mostrar uma refeição.",
              "The image does not appear to show a meal.",
              "La imagen no parece mostrar una comida."
            ) : text(
              "Não foi possível reconhecer os alimentos com segurança.",
              "The foods could not be recognized reliably.",
              "No se pudieron reconocer los alimentos con fiabilidad."
            )),
            React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" } },
              action(text("Tentar outra foto", "Try another photo", "Probar otra foto"), onCapture, true),
              action(text("Escolher da galeria", "Choose from gallery", "Elegir de la galería"), onChoose, false),
              action(text("Descartar", "Discard", "Descartar"), onDiscard, false))));
      } else if (phase === "confirmed") {
        content = React.createElement("div", {
          role: "status",
          "data-image-meal-state": "confirmed",
          style: { textAlign: "center", padding: 30 }
        }, text("Refeição confirmada.", "Meal confirmed.", "Comida confirmada."));
      } else {
        const message = errorMessages[state.error] || errorMessages["service-unavailable"];
        const retrySuffix = state.error === "quota-reached" && state.retryAfterSeconds
          ? " " + text("Tente novamente em", "Try again in", "Inténtalo de nuevo en") + ` ${state.retryAfterSeconds}s.`
          : "";
        content = React.createElement("div", { "data-image-meal-state": "error" },
          photo,
          React.createElement("div", { role: "alert", style: { padding: 16, textAlign: "center", color: "var(--danger, #c86e8e)" } }, message, retrySuffix),
          React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" } },
            state.photo ? action(text("Tentar novamente", "Try again", "Intentar de nuevo"), onProcess, true) : null,
            action(text("Tirar outra foto", "Take another photo", "Tomar otra foto"), onCapture, !state.photo),
            action(text("Escolher da galeria", "Choose from gallery", "Elegir de la galería"), onChoose, false),
            state.photo ? action(text("Descartar", "Discard", "Descartar"), onDiscard, false) : null));
      }

      return React.createElement("section", {
        "data-image-meal-screen": "true",
        style: {
          width: "100%",
          maxWidth: 820,
          margin: "0 auto",
          padding: isMobileView ? 14 : 22,
          boxSizing: "border-box",
          color: "var(--text2)"
        }
      },
      React.createElement("header", {
        style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }
      },
      React.createElement("div", null,
        React.createElement("h2", { style: { margin: 0, fontSize: 21 } }, text(
          "Reconhecer refeição por foto",
          "Recognize meal from photo",
          "Reconocer comida por foto"
        )),
        React.createElement("div", { style: { color: "var(--muted)", fontSize: 12, marginTop: 3 } }, text(
          "Revise todas as estimativas antes de registrar.",
          "Review every estimate before recording.",
          "Revisa todas las estimaciones antes de registrar."
        ))),
      action("×", onClose, false, {
        allowWhileBusy: phase !== "processing",
        props: { "aria-label": text("Fechar", "Close", "Cerrar") },
        style: { padding: "5px 10px", fontSize: 20 }
      })),
      content);
    }

    return { ImageMealScreen };
  }

  return { createImageMealScreen };
});
