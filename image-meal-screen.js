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

  function createImageMealScreen({ React, pickLang, ImageMealAnalysisScreen, MealResultSheet }) {
    if (!React || typeof React.createElement !== "function" ||
        typeof pickLang !== "function" ||
        typeof ImageMealAnalysisScreen !== "function" || typeof MealResultSheet !== "function") {
      throw new TypeError("ImageMealScreen requires React, pickLang, ImageMealAnalysisScreen, and MealResultSheet");
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
      onCameraSurface,
      onEmbeddedCapture,
      onCameraFlashToggle,
      onCameraHandoffTrace,
      onEmbeddedPhotoPainted,
      onEmbeddedPhotoPaintFailed,
      onCancelCamera,
      canOpenCameraSettings,
      onOpenCameraSettings,
      onChoose,
      onProcess,
      onCancelProcessing,
      onDismissError,
      onRequestReauthentication,
      onDiscard,
      onEstimateChange,
      onReview,
      onConfirm,
      mealValue,
      mealOptions,
      onMealChange
    }) {
      if (!state) return null;
      const text = (pt, en, es) => pickLang(lang, pt, en, es);
      const phase = state.phase || "empty";
      const liveCameraVisible = phase === "camera-opening" || phase === "camera-active" || phase === "camera-capturing";
      const cameraSessionOpen = liveCameraVisible || phase === "camera-frozen";
      const busy = phase === "capturing" || cameraSessionOpen || phase === "processing" || phase === "confirming";
      const cameraFlashModes = Array.isArray(state.cameraFlashModes) ? state.cameraFlashModes : [];
      const cameraFlashAvailable = cameraFlashModes.includes("off") &&
        (cameraFlashModes.includes("torch") || cameraFlashModes.includes("on"));
      const cameraFlashOn = state.cameraFlashMode && state.cameraFlashMode !== "off";
      const cameraFlashLabel = cameraFlashOn
        ? text("Flash ligado", "Flash on", "Flash encendido")
        : text("Flash desligado", "Flash off", "Flash apagado");
      const cameraFlashAnnouncement = state.cameraFlashError
        ? text("Não foi possível alterar o flash.", "The flash could not be changed.", "No se pudo cambiar el flash.")
        : cameraFlashAvailable ? `${cameraFlashLabel}.` : "";
      const phaseAnnouncements = {
        "camera-opening": text("Abrindo câmera.", "Opening camera.", "Abriendo cámara."),
        "camera-active": `${text("Câmera ativa. Pronta para capturar.", "Camera active. Ready to capture.", "Cámara activa. Lista para capturar.")} ${cameraFlashAnnouncement}`.trim(),
        "camera-capturing": `${text("Capturando foto.", "Capturing photo.", "Capturando foto.")} ${cameraFlashAnnouncement}`.trim(),
        "camera-frozen": text("Foto capturada.", "Photo captured.", "Foto capturada."),
        photo: text("Foto capturada. Confira a imagem antes de analisar.", "Photo captured. Check the image before analyzing.", "Foto capturada. Comprueba la imagen antes de analizar.")
      };

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
        "camera-unavailable": text(
          "Não foi possível abrir a câmera dentro do app. Você ainda pode escolher uma foto da galeria.",
          "The in-app camera could not be opened. You can still choose a photo from the gallery.",
          "No se pudo abrir la cámara dentro de la app. Aún puedes elegir una foto de la galería."
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
        "network-unavailable": text(
          "Não foi possível acessar a internet.",
          "The internet could not be reached.",
          "No se pudo acceder a internet."
        ),
        "analysis-timeout": text(
          "A análise demorou demais.",
          "The analysis took too long.",
          "El análisis tardó demasiado."
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

      function confirmFrozenPhotoAfterPaint(event) {
        if (phase !== "camera-frozen" || typeof onEmbeddedPhotoPainted !== "function") return;
        onCameraHandoffTrace?.("frozen-photo-load");
        const view = event?.currentTarget?.ownerDocument?.defaultView;
        const requestFrame = typeof view?.requestAnimationFrame === "function"
          ? callback => view.requestAnimationFrame(callback)
          : callback => setTimeout(callback, 0);
        requestFrame(() => {
          onCameraHandoffTrace?.("frozen-photo-frame-1");
          requestFrame(() => {
            onCameraHandoffTrace?.("frozen-photo-frame-2");
            onEmbeddedPhotoPainted();
          });
        });
      }

      function closeCameraWithMotion(event, callback = onCancelCamera) {
        const overlay = event?.currentTarget?.closest?.('[data-camera-stage-overlay="true"]');
        const view = event?.currentTarget?.ownerDocument?.defaultView;
        if (!overlay || view?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
          callback?.();
          return;
        }
        overlay.dataset.cameraStageClosing = "true";
        view.setTimeout(() => callback?.(), 220);
      }

      const photo = state.photo && state.photo.previewUrl
        ? React.createElement("img", {
            src: state.photo.previewUrl,
            alt: text("Foto da refeição", "Meal photo", "Foto de la comida"),
            "data-image-meal-preview": "true",
            "data-camera-frozen-photo": phase === "camera-frozen" ? "true" : undefined,
            onLoad: phase === "camera-frozen" ? confirmFrozenPhotoAfterPaint : undefined,
            onError: phase === "camera-frozen" && typeof onEmbeddedPhotoPaintFailed === "function"
              ? onEmbeddedPhotoPaintFailed
              : undefined,
            style: {
              display: "block",
              width: "100%",
              height: phase === "camera-frozen" ? "100%" : undefined,
              maxHeight: phase === "camera-frozen" ? "none" : isMobileView ? "34vh" : 360,
              objectFit: phase === "camera-frozen" ? "cover" : "contain",
              borderRadius: phase === "camera-frozen" ? "inherit" : 10,
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
          action(text("Tirar foto", "Take photo", "Tomar foto"), onCapture, true, {
            props: { "data-image-meal-open-camera": "true" }
          }),
          action(text("Escolher da galeria", "Choose from gallery", "Elegir de la galería"), onChoose, false, {
            props: { "data-image-meal-choose-gallery": "true" }
          })));
      } else if (liveCameraVisible) {
        const cameraReady = phase === "camera-active";
        content = React.createElement("div", {
          "data-image-meal-state": phase,
          "data-camera-stage-overlay": "true",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": text("Câmera de refeição", "Meal camera", "Cámara de comida")
        },
        React.createElement("div", { "aria-hidden": "true", "data-camera-backdrop-pane": "top" }),
        React.createElement("div", { "aria-hidden": "true", "data-camera-backdrop-pane": "left" }),
        React.createElement("div", { "aria-hidden": "true", "data-camera-backdrop-pane": "right" }),
        React.createElement("div", { "aria-hidden": "true", "data-camera-backdrop-pane": "bottom" }),
        action("×", event => closeCameraWithMotion(event, onClose), false, {
          allowWhileBusy: true,
          props: {
            "data-camera-recognition-close": "true",
            "aria-label": text("Fechar reconhecimento", "Close recognition", "Cerrar reconocimiento")
          }
        }),
        React.createElement("div", {
          "data-camera-stage-viewport": "true",
          "data-embedded-camera": "true",
          "data-image-meal-state": phase
        },
        React.createElement("div", {
          ref: onCameraSurface,
          "data-embedded-camera-surface": "true",
          "aria-hidden": "true"
        },
        React.createElement("span", { "data-camera-corner": "top-left" }),
        React.createElement("span", { "data-camera-corner": "top-right" }),
        React.createElement("span", { "data-camera-corner": "bottom-left" }),
        React.createElement("span", { "data-camera-corner": "bottom-right" }),
        React.createElement("div", { "data-camera-focus-frame": "true" })),
        cameraFlashAvailable && action(React.createElement(React.Fragment, null,
          React.createElement("svg", {
            "aria-hidden": "true",
            viewBox: "0 0 24 24",
            width: "20",
            height: "20",
            focusable: "false"
          }, React.createElement("path", {
            d: "M13.5 2.75 6.75 12h4.6l-.85 9.25L17.25 11h-4.6l.85-8.25Z",
            fill: "currentColor"
          })),
          React.createElement("span", null, cameraFlashLabel)), onCameraFlashToggle, false, {
          allowWhileBusy: true,
          props: {
            "data-camera-flash": "true",
            "data-camera-flash-state": cameraFlashOn ? "on" : "off",
            "aria-label": cameraFlashLabel,
            "aria-pressed": cameraFlashOn,
            "aria-busy": state.cameraFlashChanging ? "true" : undefined,
            disabled: !cameraReady || Boolean(state.cameraFlashChanging)
          }
        }),
        action("×", closeCameraWithMotion, false, {
          allowWhileBusy: true,
          props: {
            "data-camera-close": "true",
            "aria-label": text("Fechar câmera", "Close camera", "Cerrar cámara")
          }
        }),
        React.createElement("span", { "aria-hidden": "true", "data-camera-frame-label": "true" },
          phase === "camera-capturing"
            ? text("Segure firme", "Hold still", "Mantén firme")
            : text("Enquadre o prato", "Frame the plate", "Encuadra el plato"))),
        React.createElement("div", { "data-camera-controls": "true" },
          action("", onEmbeddedCapture, true, {
            allowWhileBusy: true,
            props: {
              "data-camera-shutter": "true",
              "aria-label": text("Capturar foto", "Capture photo", "Capturar foto"),
              disabled: !cameraReady
            },
            style: { opacity: cameraReady ? 1 : .5 }
          })));
      } else if (phase === "camera-frozen") {
        content = React.createElement("div", {
          "data-image-meal-state": "camera-frozen",
          "data-camera-stage-overlay": "true",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": text("Foto capturada", "Captured photo", "Foto capturada"),
          "data-camera-flash-modes": Array.isArray(state.cameraFlashModes) ? state.cameraFlashModes.join(",") : "",
          "data-camera-flash-probe": state.cameraFlashProbe || "not-run"
        },
        React.createElement("div", { "aria-hidden": "true", "data-camera-backdrop-pane": "top" }),
        React.createElement("div", { "aria-hidden": "true", "data-camera-backdrop-pane": "left" }),
        React.createElement("div", { "aria-hidden": "true", "data-camera-backdrop-pane": "right" }),
        React.createElement("div", { "aria-hidden": "true", "data-camera-backdrop-pane": "bottom" }),
        React.createElement("div", {
          "data-camera-stage-viewport": "true",
          "data-embedded-camera": "true",
          "data-image-meal-state": "camera-frozen"
        }, photo));
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
            action(text("Analisar foto", "Analyze photo", "Analizar foto"), onProcess, true, {
              props: { "data-image-meal-analyze": "true" }
            }),
            action(text("Tirar outra", "Take another", "Tomar otra"), onCapture, false, {
              props: { "data-image-meal-open-camera": "true" }
            }),
            action(text("Escolher outra", "Choose another", "Elegir otra"), onChoose, false, {
              props: { "data-image-meal-choose-gallery": "true" }
            }),
            action(text("Descartar", "Discard", "Descartar"), onDiscard, false)));
      } else if (phase === "processing") {
        content = React.createElement(ImageMealAnalysisScreen, {
          photoUrl: state.photo?.previewUrl,
          lang,
          onCancel: onCancelProcessing
        });
      } else if (phase === "error" && state.photo && [
        "analysis-timeout",
        "network-unavailable",
        "service-unavailable",
        "invalid-response",
        "session-expired",
        "quota-reached"
      ].includes(state.error)) {
        content = React.createElement(ImageMealAnalysisScreen, {
          photoUrl: state.photo.previewUrl,
          lang,
          error: state.error,
          retryAfterSeconds: state.retryAfterSeconds,
          onRetry: onProcess,
          onBackToPhoto: onDismissError,
          onChoosePhoto: onChoose,
          onReauthenticate: onRequestReauthentication,
          onClose
        });
      } else if (phase === "result" || phase === "confirming") {
        content = React.createElement(MealResultSheet, {
          estimate: state.estimate,
          photoUrl: state.photo?.previewUrl,
          lang,
          disabled: phase === "confirming",
          errors: state.validationErrors,
          errorMessage: state.error ? errorMessages[state.error] : "",
          mealValue,
          mealOptions,
          onMealChange,
          onChange: onEstimateChange,
          onConfirm,
          onReview,
          onRetry: onProcess,
          onDiscard
        });
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
              action(text("Tentar outra foto", "Try another photo", "Probar otra foto"), onCapture, true, {
                props: { "data-image-meal-open-camera": "true" }
              }),
              action(text("Escolher da galeria", "Choose from gallery", "Elegir de la galería"), onChoose, false, {
                props: { "data-image-meal-choose-gallery": "true" }
              }),
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
        const permissionDenied = state.error === "permission-denied";
        content = React.createElement("div", {
          "data-image-meal-state": "error",
          "data-camera-permission-recovery": permissionDenied ? "true" : undefined
        },
          photo,
          permissionDenied ? React.createElement("div", {
            role: "alert",
            "data-camera-permission-alert": "true"
          },
          React.createElement("span", { "aria-hidden": "true", "data-camera-permission-mark": "true" }, "!"),
          React.createElement("strong", null, text(
            "Acesso à câmera desativado",
            "Camera access is turned off",
            "El acceso a la cámara está desactivado"
          )),
          React.createElement("p", null, message))
            : React.createElement("div", { role: "alert", style: { padding: 16, textAlign: "center", color: "var(--danger, #c86e8e)" } }, message, retrySuffix),
          React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" } },
            state.photo ? action(text("Tentar novamente", "Try again", "Intentar de nuevo"), onProcess, true) : null,
            permissionDenied && canOpenCameraSettings && typeof onOpenCameraSettings === "function"
              ? action(text("Abrir configurações", "Open settings", "Abrir ajustes"), onOpenCameraSettings, true, {
                  props: { "data-camera-open-settings": "true" }
                })
              : null,
            action(text("Tirar outra foto", "Take another photo", "Tomar otra foto"), onCapture, !state.photo && !permissionDenied, {
              props: { "data-image-meal-open-camera": "true" }
            }),
            action(text("Escolher da galeria", "Choose from gallery", "Elegir de la galería"), onChoose, false, {
              props: { "data-image-meal-choose-gallery": "true" }
            }),
            state.photo ? action(text("Descartar", "Discard", "Descartar"), onDiscard, false) : null));
      }

      return React.createElement("section", {
        "data-image-meal-screen": "true",
        "data-camera-native-active": cameraSessionOpen ? "true" : undefined,
        "data-camera-geometry-locked": phase === "camera-active" || phase === "camera-capturing" || phase === "camera-frozen" ? "true" : undefined,
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
      React.createElement("p", {
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true",
        "data-image-meal-announcement": "true"
      }, phaseAnnouncements[phase] || ""),
      content);
    }

    return { ImageMealScreen };
  }

  return { createImageMealScreen };
});
