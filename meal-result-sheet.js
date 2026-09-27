/**
 * Shared progressive result sheet for reviewed meal estimates.
 *
 * The host owns estimate, meal selection and persistence. This component owns
 * only its compact/expanded presentation and emits immutable estimate drafts.
 *
 * @module MealResultSheet
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MealResultSheetModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function finite(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function totalEstimatedGrams(estimate) {
    const items = Array.isArray(estimate?.items) ? estimate.items : [];
    const values = items.map(item => finite(item?.estimatedGrams)).filter(value => value !== null && value >= 0);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) * 10) / 10 : null;
  }

  function scaleEstimateToTotalGrams(estimate, nextTotal, rescaleMealEstimateItem) {
    const items = Array.isArray(estimate?.items) ? estimate.items : [];
    const currentTotal = totalEstimatedGrams(estimate);
    const target = finite(nextTotal);
    if (!estimate || !items.length || !currentTotal || target === null || target <= 0 ||
        typeof rescaleMealEstimateItem !== "function") return estimate;
    const ratio = target / currentTotal;
    return {
      ...estimate,
      items: items.map(item => {
        const grams = finite(item?.estimatedGrams);
        return grams === null
          ? item
          : rescaleMealEstimateItem(item, "estimatedGrams", Math.round(grams * ratio * 10) / 10);
      })
    };
  }

  function resolveMealResultSnap(offset, compactOffset) {
    const currentOffset = finite(offset);
    const maximumOffset = finite(compactOffset);
    if (currentOffset === null || maximumOffset === null || maximumOffset <= 0) return "compact";
    return currentOffset < maximumOffset * 0.5 ? "expanded" : "compact";
  }

  function createMealResultSheet({
    React,
    pickLang,
    ChoiceField,
    NumericField,
    createEmptyItem,
    calculateTotals,
    rescaleMealEstimateItem
  }) {
    if (!React || typeof React.createElement !== "function" || typeof React.useState !== "function" ||
        typeof pickLang !== "function" || typeof ChoiceField !== "function" ||
        typeof NumericField !== "function" || typeof createEmptyItem !== "function" ||
        typeof calculateTotals !== "function" || typeof rescaleMealEstimateItem !== "function") {
      throw new TypeError("MealResultSheet requires React, field components, and meal estimate helpers");
    }

    function MealResultSheet({
      estimate,
      photoUrl,
      lang,
      disabled = false,
      errors = [],
      errorMessage = "",
      mealValue,
      mealOptions = [],
      onMealChange,
      onChange,
      onConfirm,
      onReview,
      onRetry,
      onDiscard
    }) {
      const text = (pt, en, es) => pickLang(lang, pt, en, es);
      const [snap, setSnap] = React.useState("compact");
      const overlayRef = React.useRef(null);
      const sheetRef = React.useRef(null);
      const handleRef = React.useRef(null);
      const dragRef = React.useRef(null);
      const previousFocusRef = React.useRef(null);
      const items = Array.isArray(estimate?.items) ? estimate.items : [];
      const totals = calculateTotals({ ...(estimate || {}), items });
      const grams = totalEstimatedGrams(estimate);
      const validationErrors = Array.isArray(errors) ? errors : [];
      const confidence = ["high", "medium", "low"].includes(estimate?.overallConfidence)
        ? estimate.overallConfidence
        : "low";
      const confidenceLabel = {
        high: text("Confiança alta", "High confidence", "Confianza alta"),
        medium: text("Confiança média", "Medium confidence", "Confianza media"),
        low: text("Confiança baixa", "Low confidence", "Confianza baja")
      }[confidence];

      React.useEffect(() => {
        if (typeof document === "undefined") return undefined;
        const previousOverflow = document.body.style.overflow;
        const previousOverscroll = document.body.style.overscrollBehavior;
        document.body.style.overflow = "hidden";
        document.body.style.overscrollBehavior = "none";
        return () => {
          document.body.style.overflow = previousOverflow;
          document.body.style.overscrollBehavior = previousOverscroll;
        };
      }, []);

      React.useEffect(() => {
        if (typeof document !== "undefined") previousFocusRef.current = document.activeElement;
        handleRef.current?.focus?.({ preventScroll: true });
        return () => previousFocusRef.current?.focus?.({ preventScroll: true });
      }, []);

      function emit(nextEstimate) {
        if (!disabled && typeof onChange === "function" && nextEstimate) onChange(nextEstimate);
      }

      function updateItem(itemId, nextGrams) {
        if (disabled) return;
        emit({
          ...estimate,
          items: items.map(item => item.id === itemId
            ? rescaleMealEstimateItem(item, "estimatedGrams", nextGrams)
            : item)
        });
      }

      function removeItem(itemId) {
        if (!disabled) emit({ ...estimate, items: items.filter(item => item.id !== itemId) });
      }

      function addItem() {
        if (!disabled) emit({ ...estimate, items: [...items, createEmptyItem()] });
      }

      function changeTotal(nextValue) {
        emit(scaleEstimateToTotalGrams(estimate, nextValue, rescaleMealEstimateItem));
      }

      function stepTotal(direction) {
        if (!grams) return;
        changeTotal(Math.max(1, Math.round((grams + direction * 10) * 10) / 10));
      }

      function toggleSnap() {
        setSnap(current => current === "expanded" ? "compact" : "expanded");
      }

      function beginDrag(event) {
        if (disabled || event.button > 0) return;
        const sheet = sheetRef.current;
        if (!sheet) return;
        const compactOffset = Math.max(0, window.innerHeight * 0.32);
        dragRef.current = {
          pointerId: event.pointerId,
          startY: event.clientY,
          startOffset: snap === "expanded" ? 0 : compactOffset,
          compactOffset
        };
        event.currentTarget.setPointerCapture?.(event.pointerId);
        sheet.dataset.dragging = "true";
      }

      function moveDrag(event) {
        const drag = dragRef.current;
        const sheet = sheetRef.current;
        if (!drag || !sheet || drag.pointerId !== event.pointerId) return;
        const offset = Math.min(drag.compactOffset, Math.max(0, drag.startOffset + event.clientY - drag.startY));
        sheet.style.setProperty("--meal-result-drag-offset", `${offset}px`);
      }

      function finishDrag(event) {
        const drag = dragRef.current;
        const sheet = sheetRef.current;
        if (!drag || !sheet || drag.pointerId !== event.pointerId) return;
        const raw = parseFloat(sheet.style.getPropertyValue("--meal-result-drag-offset"));
        const offset = Number.isFinite(raw) ? raw : drag.startOffset;
        const next = resolveMealResultSnap(offset, drag.compactOffset);
        dragRef.current = null;
        delete sheet.dataset.dragging;
        sheet.style.removeProperty("--meal-result-drag-offset");
        setSnap(next);
      }

      function handleOverlayKeyDown(event) {
        if (event.key === "Escape" && snap === "expanded") {
          event.preventDefault();
          setSnap("compact");
          handleRef.current?.focus?.({ preventScroll: true });
          return;
        }
        if (event.key !== "Tab" || !overlayRef.current) return;
        const focusable = Array.from(overlayRef.current.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])'
        )).filter(element => !element.hidden && element.getClientRects().length > 0);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }

      function metric(key, label, unit, highlight) {
        const value = finite(totals?.[key]);
        return React.createElement("div", {
          key,
          "data-meal-result-metric": key,
          "data-meal-result-highlight": highlight ? "true" : undefined
        }, React.createElement("strong", null, value === null ? "—" : Math.round(value * 10) / 10),
        React.createElement("span", null, label, unit ? ` ${unit}` : ""));
      }

      const secondaryNutrients = [
        ["fiber", text("Fibra", "Fiber", "Fibra")],
        ["sugars", text("Açúcares", "Sugars", "Azúcares")],
        ["salt", text("Sal", "Salt", "Sal")]
      ].filter(([key]) => finite(totals?.[key]) !== null);

      return React.createElement("div", {
        ref: overlayRef,
        "data-meal-result-overlay": "true",
        "data-meal-result-snap": snap,
        role: "dialog",
        "aria-modal": "true",
        "aria-label": text("Resultado da análise da refeição", "Meal analysis result", "Resultado del análisis de la comida"),
        onKeyDown: handleOverlayKeyDown
      },
      photoUrl ? React.createElement("img", {
        src: photoUrl,
        alt: text("Foto analisada da refeição", "Analyzed meal photo", "Foto analizada de la comida"),
        "data-meal-result-photo": "true"
      }) : null,
      React.createElement("div", { "data-meal-result-scrim": "true", "aria-hidden": "true" }),
      React.createElement("section", {
        ref: sheetRef,
        "data-meal-result-sheet": "true",
        "data-meal-result-confidence": confidence,
        "aria-busy": disabled ? "true" : undefined
      },
      React.createElement("button", {
        ref: handleRef,
        type: "button",
        "data-meal-result-handle": "true",
        "aria-label": snap === "expanded"
          ? text("Recolher detalhes", "Collapse details", "Contraer detalles")
          : text("Expandir detalhes", "Expand details", "Expandir detalles"),
        "aria-expanded": snap === "expanded",
        onClick: toggleSnap,
        onPointerDown: beginDrag,
        onPointerMove: moveDrag,
        onPointerUp: finishDrag,
        onPointerCancel: finishDrag
      }, React.createElement("span", { "aria-hidden": "true" })),
      React.createElement("div", { "data-meal-result-scroll": "true" },
        React.createElement("header", { "data-meal-result-header": "true" },
          React.createElement("div", { "data-meal-result-thumbnail": "true", "aria-hidden": "true" },
            photoUrl ? React.createElement("img", { src: photoUrl, alt: "" }) : null),
          React.createElement("div", null,
            React.createElement("h2", null, estimate?.dishName || text("Refeição reconhecida", "Recognized meal", "Comida reconocida")),
            React.createElement("div", { "data-meal-result-confidence-row": "true" },
              React.createElement("span", { "data-meal-result-confidence-badge": "true" }, confidenceLabel),
              React.createElement("span", null, text("Estimativa por foto", "Photo estimate", "Estimación por foto"))))),
        grams !== null ? React.createElement("div", { "data-meal-result-portion": "true" },
          React.createElement("span", null, text("Porção", "Portion", "Porción")),
          React.createElement("div", null,
            React.createElement("button", {
              type: "button", disabled: disabled || grams <= 1,
              "aria-label": text("Diminuir porção", "Decrease portion", "Reducir porción"),
              onClick: () => stepTotal(-1)
            }, "−"),
            React.createElement(NumericField, {
              id: "meal-result-total-grams",
              label: text("Quantidade total", "Total amount", "Cantidad total"),
              value: String(grams),
              onChange: changeTotal,
              minValue: 1,
              maxValue: 100000,
              maxDecimals: 1,
              unit: "g",
              disabled,
              strings: {
                cancel: text("Cancelar", "Cancel", "Cancelar"),
                confirm: text("Confirmar", "Confirm", "Confirmar"),
                backspace: text("Apagar", "Delete", "Eliminar"),
                decimal: text("Separador decimal", "Decimal separator", "Separador decimal"),
                invalid: text("Digite uma quantidade válida.", "Enter a valid amount.", "Introduce una cantidad válida.")
              }
            }),
            React.createElement("button", {
              type: "button", disabled,
              "aria-label": text("Aumentar porção", "Increase portion", "Aumentar porción"),
              onClick: () => stepTotal(1)
            }, "+"))) : null,
        React.createElement("div", { "data-meal-result-metrics": "true" },
          metric("kcal", text("kcal", "kcal", "kcal"), "", true),
          metric("carbs", text("Carboidratos", "Carbs", "Carbohidratos"), "g"),
          metric("protein", text("Proteína", "Protein", "Proteína"), "g"),
          metric("fat", text("Gordura", "Fat", "Grasa"), "g")),
        secondaryNutrients.length ? React.createElement("details", { "data-meal-result-secondary": "true" },
          React.createElement("summary", null, secondaryNutrients.map(([key, label], index) =>
            React.createElement(React.Fragment, { key },
              index ? " · " : "",
              label, " ", Math.round(finite(totals[key]) * 10) / 10, " g"))),
          finite(totals?.satfat) !== null ? React.createElement("p", null,
            text("Gordura saturada", "Saturated fat", "Grasa saturada"), ": ",
            Math.round(finite(totals.satfat) * 10) / 10, " g") : null) : null,
        React.createElement("div", { "data-meal-result-ingredients-heading": "true" },
          React.createElement("strong", null, text("Ingredientes", "Ingredients", "Ingredientes")),
          React.createElement("button", { type: "button", disabled, onClick: addItem }, text("+ Adicionar", "+ Add", "+ Agregar"))),
        React.createElement("div", { "data-meal-result-ingredients": "true" }, items.length
          ? items.map(item => React.createElement("article", {
              key: item.id,
              "data-meal-result-item": "true",
              "data-meal-result-item-id": item.id
            },
              React.createElement("span", { "data-meal-result-item-dot": "true", "aria-hidden": "true" }),
              React.createElement("span", { "data-meal-result-item-name": "true" }, item.name || text("Ingrediente sem nome", "Unnamed ingredient", "Ingrediente sin nombre")),
              React.createElement(NumericField, {
                id: `meal-result-item-${String(item.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`,
                label: text(`Quantidade de ${item.name || "ingrediente"}`, `Amount of ${item.name || "ingredient"}`, `Cantidad de ${item.name || "ingrediente"}`),
                value: finite(item.estimatedGrams) === null ? "" : String(item.estimatedGrams),
                onChange: value => updateItem(item.id, value),
                minValue: 0,
                maxValue: 100000,
                maxDecimals: 1,
                unit: "g",
                disabled,
                strings: {
                  cancel: text("Cancelar", "Cancel", "Cancelar"), confirm: text("Confirmar", "Confirm", "Confirmar"),
                  backspace: text("Apagar", "Delete", "Eliminar"), decimal: text("Separador decimal", "Decimal separator", "Separador decimal"),
                  invalid: text("Digite uma quantidade válida.", "Enter a valid amount.", "Introduce una cantidad válida.")
                }
              }),
              React.createElement("span", { "data-meal-result-item-kcal": "true" }, finite(item.kcal) === null ? "—" : `${Math.round(item.kcal)} kcal`),
              React.createElement("button", {
                type: "button", disabled, onClick: () => removeItem(item.id),
                "aria-label": text(`Remover ${item.name || "ingrediente"}`, `Remove ${item.name || "ingredient"}`, `Eliminar ${item.name || "ingrediente"}`)
              }, "×")))
          : React.createElement("p", { "data-meal-result-empty": "true" }, text(
              "Nenhum ingrediente foi detectado. Adicione um ingrediente para registrar.",
              "No ingredients were detected. Add an ingredient before logging.",
              "No se detectaron ingredientes. Agrega un ingrediente antes de registrar."
            ))),
        errorMessage || validationErrors.length ? React.createElement("div", { role: "alert", "data-meal-result-validation": "true" },
          errorMessage || text(
            "Revise os dados destacados antes de registrar.",
            "Review the highlighted data before logging.",
            "Revisa los datos marcados antes de registrar."
          )) : null,
        React.createElement("div", { "data-meal-result-secondary-actions": "true" },
          React.createElement("button", { type: "button", disabled, onClick: onReview }, text("Avaliar refeição", "Evaluate meal", "Evaluar comida")),
          React.createElement("button", { type: "button", disabled, onClick: onRetry }, text("Analisar novamente", "Analyze again", "Analizar de nuevo")),
          React.createElement("button", { type: "button", disabled, onClick: onDiscard }, text("Descartar foto", "Discard photo", "Descartar foto")))),
      React.createElement("footer", { "data-meal-result-footer": "true" },
        React.createElement(ChoiceField, {
          id: "image-meal-category",
          label: text("Refeição", "Meal", "Comida"),
          value: mealValue,
          onChange: onMealChange,
          options: mealOptions,
          disabled,
          helperText: "",
          closeLabel: text("Fechar seletor", "Close selector", "Cerrar selector")
        }),
        React.createElement("button", {
          type: "button",
          disabled: disabled || !items.length || validationErrors.length > 0,
          "data-meal-result-confirm": "true",
          onClick: onConfirm
        }, disabled
          ? text("Registrando...", "Logging...", "Registrando...")
          : text("Registrar refeição", "Log meal", "Registrar comida")))));
    }

    return { MealResultSheet };
  }

  return { totalEstimatedGrams, scaleEstimateToTotalGrams, resolveMealResultSnap, createMealResultSheet };
});
