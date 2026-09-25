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

    function ImageMealAnalysisScreen({
      photoUrl,
      lang,
      error,
      retryAfterSeconds,
      onCancel,
      onRetry,
      onBackToPhoto,
      onChoosePhoto,
      onReauthenticate,
      onClose
    }) {
      const text = (pt, en, es) => pickLang(lang, pt, en, es);
      const secondaryMessages = [
        text("Identificando o que está no prato", "Identifying what is on the plate", "Identificando lo que hay en el plato"),
        text("Estimando porções e nutrientes", "Estimating portions and nutrients", "Estimando porciones y nutrientes"),
        text("Preparando sua estimativa", "Preparing your estimate", "Preparando tu estimación")
      ];
      const [messageIndex, setMessageIndex] = React.useState(0);
      const [reauthenticationState, setReauthenticationState] = React.useState("idle");

      React.useEffect(() => {
        const reducedMotion = typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reducedMotion || error) return undefined;
        const interval = setInterval(() => {
          setMessageIndex(current => (current + 1) % secondaryMessages.length);
        }, 2800);
        return () => clearInterval(interval);
      }, [lang, error]);

      const reauthenticationPending = error === "session-expired" && reauthenticationState === "pending";
      const reauthenticationFailed = error === "session-expired" && reauthenticationState === "failed";

      async function requestReauthentication() {
        if (reauthenticationPending || typeof onReauthenticate !== "function") return;
        setReauthenticationState("pending");
        try {
          await onReauthenticate();
        } catch (_) {
          // The public contract already leaves the user on a recoverable auth
          // surface when the remote sign-out fails. Keep this local message
          // sanitized and never retry authentication automatically.
          setReauthenticationState("failed");
        }
      }

      const errorCopy = {
        "analysis-timeout": {
          tone: "warning",
          eyebrow: text("Tempo esgotado", "Timed out", "Tiempo agotado"),
          title: text("A análise demorou demais", "The analysis took too long", "El análisis tardó demasiado"),
          message: text(
            "A foto continua aqui. Tente novamente sem precisar tirar outra.",
            "Your photo is still here. Try again without taking another one.",
            "La foto sigue aquí. Inténtalo de nuevo sin tomar otra."
          ),
          detail: text("Nada foi registrado no Diário.", "Nothing was added to the Diary.", "No se registró nada en el Diario."),
          primary: text("Tentar novamente", "Try again", "Intentar de nuevo"),
          secondary: text("Voltar à foto", "Back to photo", "Volver a la foto"),
          primaryAction: onRetry,
          secondaryAction: onBackToPhoto,
          icon: "timeout"
        },
        "network-unavailable": {
          tone: "danger",
          eyebrow: text("Sem conexão", "No connection", "Sin conexión"),
          title: text("Não foi possível acessar a internet", "Could not reach the internet", "No se pudo acceder a internet"),
          message: text(
            "Confira sua conexão e tente novamente usando esta mesma foto.",
            "Check your connection and retry with this same photo.",
            "Comprueba la conexión y vuelve a intentarlo con esta misma foto."
          ),
          detail: text("A câmera permanece desligada.", "The camera stays off.", "La cámara permanece apagada."),
          primary: text("Tentar novamente", "Try again", "Intentar de nuevo"),
          secondary: text("Voltar à foto", "Back to photo", "Volver a la foto"),
          primaryAction: onRetry,
          secondaryAction: onBackToPhoto,
          icon: "network"
        },
        "service-unavailable": {
          tone: "danger",
          eyebrow: text("Serviço indisponível", "Service unavailable", "Servicio no disponible"),
          title: text("A análise não está disponível agora", "Analysis is unavailable right now", "El análisis no está disponible ahora"),
          message: text(
            "O serviço de reconhecimento não respondeu. Sua foto foi preservada.",
            "The recognition service did not respond. Your photo was preserved.",
            "El servicio de reconocimiento no respondió. Tu foto fue conservada."
          ),
          detail: text(
            "Tentar novamente pode funcionar em alguns instantes.",
            "Trying again may work in a moment.",
            "Volver a intentarlo puede funcionar en unos instantes."
          ),
          primary: text("Tentar novamente", "Try again", "Intentar de nuevo"),
          secondary: text("Voltar à foto", "Back to photo", "Volver a la foto"),
          primaryAction: onRetry,
          secondaryAction: onBackToPhoto,
          icon: "service"
        },
        "invalid-response": {
          tone: "warning",
          eyebrow: text("Resposta incompleta", "Incomplete response", "Respuesta incompleta"),
          title: text("Não foi possível interpretar o resultado", "The result could not be interpreted", "No se pudo interpretar el resultado"),
          message: text(
            "A análise terminou, mas não retornou dados seguros para registrar.",
            "The analysis finished without enough reliable data to log.",
            "El análisis terminó sin datos suficientemente seguros para registrar."
          ),
          detail: text("Nada foi registrado no Diário.", "Nothing was added to the Diary.", "No se añadió nada al Diario."),
          primary: text("Analisar novamente", "Analyze again", "Analizar de nuevo"),
          secondary: text("Escolher outra foto", "Choose another photo", "Elegir otra foto"),
          primaryAction: onRetry,
          secondaryAction: onChoosePhoto,
          icon: "invalid"
        },
        "session-expired": {
          tone: "danger",
          eyebrow: text("Sessão encerrada", "Session ended", "Sesión finalizada"),
          title: text("Entre novamente para continuar", "Sign in again to continue", "Inicia sesión de nuevo para continuar"),
          message: text(
            "A foto permanece disponível somente enquanto este fluxo estiver aberto.",
            "The photo remains available only while this flow stays open.",
            "La foto permanece disponible solo mientras este flujo siga abierto."
          ),
          detail: text("Nenhum dado foi registrado.", "No data was logged.", "No se registró ningún dato."),
          primary: text("Entrar novamente", "Sign in again", "Iniciar sesión"),
          secondary: text("Voltar à foto", "Back to photo", "Volver a la foto"),
          primaryAction: requestReauthentication,
          secondaryAction: onBackToPhoto,
          icon: "session"
        },
        "quota-reached": {
          tone: "warning",
          eyebrow: text("Limite temporário", "Temporary limit", "Límite temporal"),
          title: text("Tente analisar mais tarde", "Try analyzing later", "Intenta analizar más tarde"),
          message: text(
            "O limite de análises foi atingido. A foto continua disponível para você decidir o próximo passo.",
            "The analysis limit was reached. Your photo is still available for your next step.",
            "Se alcanzó el límite de análisis. La foto sigue disponible para el siguiente paso."
          ),
          detail: retryAfterSeconds
            ? text("Nova tentativa disponível em", "Another attempt is available in", "Otro intento estará disponible en") + ` ${retryAfterSeconds}s.`
            : text("Aguarde antes de tentar novamente.", "Wait before trying again.", "Espera antes de volver a intentarlo."),
          primary: text("Voltar à foto", "Back to photo", "Volver a la foto"),
          secondary: text("Cancelar reconhecimento", "Cancel recognition", "Cancelar reconocimiento"),
          primaryAction: onBackToPhoto,
          secondaryAction: onClose,
          icon: "quota"
        }
      };

      const failure = error ? errorCopy[error] : null;

      function ErrorIcon({ kind }) {
        const paths = {
          timeout: "M12 7v5l3 2 M9 2h6 M12 2v2 M4.9 4.9l2 2 M5 20 20 5 M20 12a8 8 0 0 1-8 8 8 8 0 0 1-5.7-2.3 M7 6.3A8 8 0 0 1 18.6 8",
          network: "M5 12.6a11 11 0 0 1 14 0 M8.5 16a6 6 0 0 1 7 0 M12 20h.01 M3 3l18 18",
          service: "M7 18h10a4 4 0 0 0 .8-7.9A6 6 0 0 0 6.3 9.2 4.5 4.5 0 0 0 7 18Z M4 4l16 16",
          invalid: "M7 3h7l4 4v14H7z M14 3v5h5 M12 11v4 M12 18h.01",
          session: "M14 8V6a4 4 0 0 0-8 0v2 M5 9h10v11H5z M10 13v3 M18 8l3 3-3 3 M21 11h-5",
          quota: "M12 7v5l3 2 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        };
        return React.createElement("svg", {
          viewBox: "0 0 24 24",
          width: 24,
          height: 24,
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.6,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": "true",
          focusable: "false"
        }, React.createElement("path", { d: paths[kind] || paths.invalid }));
      }

      return React.createElement("div", {
        "data-image-meal-analysis": "true",
        "data-image-meal-analysis-mode": failure ? "error" : "processing",
        "data-image-meal-analysis-error": failure ? error : undefined,
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
        failure && React.createElement("div", { "data-image-meal-error-context": "true" },
          React.createElement("span", null, text(
            "Foto preservada enquanto esta tela estiver aberta",
            "Photo preserved while this screen stays open",
            "Foto conservada mientras esta pantalla siga abierta"
          )),
          React.createElement("button", {
            type: "button",
            onClick: onClose,
            disabled: reauthenticationPending,
            "data-image-meal-error-close": "true",
            "aria-label": text("Fechar reconhecimento", "Close recognition", "Cerrar reconocimiento")
          }, "×")),
        failure ? React.createElement("div", {
          role: "alert",
          "data-image-meal-error-card": "true",
          "data-image-meal-error-tone": failure.tone
        },
          React.createElement("span", { "data-image-meal-error-icon": "true" },
            React.createElement(ErrorIcon, { kind: failure.icon })),
          React.createElement("p", { "data-image-meal-error-eyebrow": "true" }, failure.eyebrow),
          React.createElement("h2", null, failure.title),
          React.createElement("p", { "data-image-meal-error-message": "true" }, failure.message),
          React.createElement("p", { "data-image-meal-error-detail": "true" }, failure.detail),
          reauthenticationFailed && React.createElement("p", {
            role: "alert",
            "data-image-meal-reauthentication-error": "true"
          }, text(
            "Não foi possível concluir a transição. Tente entrar novamente.",
            "The transition could not be completed. Try signing in again.",
            "No se pudo completar la transición. Intenta iniciar sesión de nuevo."
          )),
          React.createElement("div", { "data-image-meal-error-actions": "true" },
            React.createElement("button", {
              type: "button",
              onClick: failure.primaryAction,
              disabled: reauthenticationPending || typeof failure.primaryAction !== "function",
              "aria-busy": reauthenticationPending ? "true" : undefined,
              "data-image-meal-error-primary": "true"
            }, reauthenticationPending
              ? text("Abrindo acesso...", "Opening sign-in...", "Abriendo acceso...")
              : failure.primary),
            React.createElement("button", {
              type: "button",
              onClick: failure.secondaryAction,
              disabled: reauthenticationPending,
              "data-image-meal-error-secondary": "true"
            }, failure.secondary)))
        : React.createElement("div", {
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
