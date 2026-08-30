/**
 * Controlled editor for shared text/image meal estimates.
 *
 * The host owns estimate state, validation, navigation, and persistence. This
 * component only emits immutable drafts, which keeps it reusable by C24 and by
 * the existing text-description flow when C19 is completed.
 *
 * @module MealEstimateEditor
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MealEstimateEditorModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const nutrientDefinitions = [
    { key: "protein", pt: "Prote\u00edna", en: "Protein", es: "Prote\u00edna", unit: "g" },
    { key: "kcal", pt: "Calorias", en: "Calories", es: "Calor\u00edas", unit: "kcal" },
    { key: "carbs", pt: "Carboidratos", en: "Carbohydrates", es: "Carbohidratos", unit: "g" },
    { key: "fat", pt: "Gordura", en: "Fat", es: "Grasa", unit: "g" },
    { key: "fiber", pt: "Fibra", en: "Fiber", es: "Fibra", unit: "g" },
    { key: "salt", pt: "Sal", en: "Salt", es: "Sal", unit: "g" },
    { key: "sugars", pt: "A\u00e7\u00facares", en: "Sugars", es: "Az\u00facares", unit: "g" },
    { key: "satfat", pt: "Gordura saturada", en: "Saturated fat", es: "Grasa saturada", unit: "g" }
  ];

  function createMealEstimateEditor({ React, pickLang, createEmptyItem, calculateTotals, ChoiceField }) {
    if (!React || typeof React.createElement !== "function" ||
        typeof pickLang !== "function" || typeof createEmptyItem !== "function" ||
        typeof calculateTotals !== "function" || typeof ChoiceField !== "function") {
      throw new TypeError("MealEstimateEditor requires React, pickLang, createEmptyItem, calculateTotals, and ChoiceField");
    }

    const inputStyle = {
      width: "100%",
      boxSizing: "border-box",
      background: "var(--input)",
      border: "1px solid var(--border2)",
      color: "var(--text2)",
      borderRadius: 6,
      padding: "8px 10px",
      fontFamily: "inherit",
      fontSize: 13
    };
    const labelStyle = {
      display: "block",
      color: "var(--muted)",
      fontSize: 11,
      letterSpacing: 0.7,
      textTransform: "uppercase",
      marginBottom: 3
    };

    function MealEstimateEditor({ estimate, lang, isMobileView, disabled, errors, onChange }) {
      if (!estimate || typeof onChange !== "function") return null;
      const uiText = (pt, en, es) => pickLang(lang, pt, en, es);
      const items = Array.isArray(estimate.items) ? estimate.items : [];
      const totals = calculateTotals({ ...estimate, items });
      const validationErrors = Array.isArray(errors) ? errors : [];
      const confidenceOptions = [
        {
          value: "high",
          label: uiText("Alta", "High", "Alta"),
          description: uiText(
            "Itens e quantidades bem identificados",
            "Items and quantities are well identified",
            "Elementos y cantidades bien identificados"
          ),
          tone: "high"
        },
        {
          value: "medium",
          label: uiText("Média", "Medium", "Media"),
          description: uiText(
            "Revisão rápida recomendada",
            "A quick review is recommended",
            "Se recomienda una revisión rápida"
          ),
          tone: "medium"
        },
        {
          value: "low",
          label: uiText("Baixa", "Low", "Baja"),
          description: uiText(
            "Confira todos os valores",
            "Check every value",
            "Comprueba todos los valores"
          ),
          tone: "low"
        }
      ];

      function replaceEstimate(patch) {
        if (disabled) return;
        onChange({ ...estimate, ...patch });
      }

      function updateItem(itemId, key, value) {
        if (disabled) return;
        replaceEstimate({
          items: items.map(item => item.id === itemId ? { ...item, [key]: value } : item)
        });
      }

      function removeItem(itemId) {
        if (disabled) return;
        replaceEstimate({ items: items.filter(item => item.id !== itemId) });
      }

      function addItem() {
        if (disabled) return;
        replaceEstimate({ items: [...items, createEmptyItem()] });
      }

      function confidenceChoice({ id, label, value, field, helperText, onValueChange }) {
        return React.createElement("div", { "data-estimate-field": field },
          React.createElement(ChoiceField, {
            id,
            label,
            value: value || "low",
            options: confidenceOptions,
            disabled: !!disabled,
            onChange: onValueChange,
            helperText,
            closeLabel: uiText("Fechar seletor", "Close selector", "Cerrar selector")
          }));
      }

      function numberInput(item, definition) {
        return React.createElement("label", { key: definition.key, style: labelStyle },
          definition.label,
          React.createElement("div", { style: { position: "relative" } },
            React.createElement("input", {
              type: "number",
              min: "0",
              step: definition.step || "0.1",
              value: item[definition.key] ?? "",
              disabled: !!disabled,
              "data-estimate-field": definition.key,
              "aria-label": definition.label,
              onChange: event => updateItem(item.id, definition.key, event.target.value),
              style: { ...inputStyle, paddingRight: definition.unit ? 42 : 10 }
            }),
            definition.unit && React.createElement("span", {
              style: {
                position: "absolute",
                right: 9,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--dim)",
                fontSize: 11,
                pointerEvents: "none"
              }
            }, definition.unit)
          )
        );
      }

      return React.createElement("section", {
        "data-meal-estimate-editor": "true",
        style: { display: "flex", flexDirection: "column", gap: 14 }
      },
      React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: isMobileView ? "1fr" : "minmax(0, 2fr) minmax(130px, 1fr)",
          gap: 10
        }
      },
      React.createElement("label", { style: labelStyle },
        uiText("Nome do prato", "Dish name", "Nombre del plato"),
        React.createElement("input", {
          value: estimate.dishName || "",
          disabled: !!disabled,
          "data-estimate-field": "dishName",
          onChange: event => replaceEstimate({ dishName: event.target.value }),
          style: inputStyle
        })
      ),
      confidenceChoice({
        id: "estimate-overall-confidence",
        label: uiText("Confian\u00e7a geral", "Overall confidence", "Confianza general"),
        value: estimate.overallConfidence,
        field: "overallConfidence",
        helperText: uiText("Revise o nível da estimativa", "Review the estimate level", "Revisa el nivel de la estimación"),
        onValueChange: value => replaceEstimate({ overallConfidence: value })
      })),

      items.map((item, index) => React.createElement("article", {
        key: item.id,
        "data-estimate-item": item.id,
        style: {
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 9,
          padding: 12
        }
      },
      React.createElement("div", {
        style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }
      },
      React.createElement("strong", { style: { color: "var(--text2)", fontSize: 13 } },
        uiText(`Alimento ${index + 1}`, `Food ${index + 1}`, `Alimento ${index + 1}`)),
      React.createElement("button", {
        type: "button",
        disabled: !!disabled,
        onClick: () => removeItem(item.id),
        "aria-label": uiText("Remover alimento", "Remove food", "Eliminar alimento"),
        style: {
          background: "transparent",
          border: "1px solid var(--border2)",
          color: "var(--muted)",
          borderRadius: 6,
          padding: "4px 8px",
          cursor: disabled ? "default" : "pointer"
        }
      }, uiText("Remover", "Remove", "Eliminar"))),
      React.createElement("div", { style: { marginBottom: 10 } },
        React.createElement("label", { style: labelStyle },
          uiText("Nome do alimento", "Food name", "Nombre del alimento"),
          React.createElement("input", {
            value: item.name || "",
            disabled: !!disabled,
            "data-estimate-field": "name",
            onChange: event => updateItem(item.id, "name", event.target.value),
            style: inputStyle
          })
        )
      ),
      React.createElement("div", {
        style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 10 }
      },
      numberInput(item, { key: "quantity", label: uiText("Quantidade", "Quantity", "Cantidad"), step: "0.1" }),
      React.createElement("label", { style: labelStyle },
        uiText("Unidade", "Unit", "Unidad"),
        React.createElement("input", {
          value: item.unit || "",
          disabled: !!disabled,
          "data-estimate-field": "unit",
          onChange: event => updateItem(item.id, "unit", event.target.value),
          style: inputStyle
        })
      ),
      numberInput(item, { key: "estimatedGrams", label: uiText("Peso estimado", "Estimated weight", "Peso estimado"), unit: "g", step: "1" }),
      confidenceChoice({
        id: "estimate-item-confidence-" + String(item.id).replace(/[^a-zA-Z0-9_-]/g, "-"),
        label: uiText("Confian\u00e7a", "Confidence", "Confianza"),
        value: item.confidence,
        field: "confidence",
        helperText: uiText("Revise o nível deste alimento", "Review this food confidence", "Revisa la confianza de este alimento"),
        onValueChange: value => updateItem(item.id, "confidence", value)
      })),
      React.createElement("div", {
        style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))", gap: 8 }
      }, nutrientDefinitions.map(definition => numberInput(item, {
        key: definition.key,
        label: uiText(definition.pt, definition.en, definition.es),
        unit: definition.unit
      }))))),

      React.createElement("button", {
        type: "button",
        disabled: !!disabled,
        onClick: addItem,
        style: {
          width: "100%",
          border: "1px dashed var(--border2)",
          background: "var(--btn-inactive)",
          color: "var(--text2)",
          borderRadius: 7,
          padding: 9,
          cursor: disabled ? "default" : "pointer"
        }
      }, uiText("+ Adicionar alimento", "+ Add food", "+ Agregar alimento")),

      React.createElement("label", { style: labelStyle },
        uiText("Suposi\u00e7\u00f5es da estimativa", "Estimate assumptions", "Suposiciones de la estimaci\u00f3n"),
        React.createElement("textarea", {
          value: Array.isArray(estimate.assumptions) ? estimate.assumptions.join("\n") : "",
          disabled: !!disabled,
          "data-estimate-field": "assumptions",
          onChange: event => replaceEstimate({ assumptions: event.target.value.split(/\r?\n/) }),
          rows: 3,
          style: { ...inputStyle, resize: "vertical" }
        })
      ),

      React.createElement("div", {
        "data-estimate-totals": "true",
        style: {
          background: "var(--surface3)",
          border: "1px solid var(--border3)",
          borderRadius: 8,
          padding: 10,
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 16px"
        }
      }, nutrientDefinitions.filter(definition => totals[definition.key] !== null).map(definition =>
        React.createElement("span", { key: definition.key, style: { color: "var(--text3)", fontSize: 12 } },
          uiText(definition.pt, definition.en, definition.es), ": ",
          React.createElement("b", null, totals[definition.key], " ", definition.unit)))),

      validationErrors.length > 0 && React.createElement("div", {
        role: "alert",
        style: { color: "var(--danger, #c86e8e)", fontSize: 12 }
      }, uiText(
        "Revise os campos destacados antes de continuar.",
        "Review the highlighted fields before continuing.",
        "Revisa los campos marcados antes de continuar."
      )));
    }

    return { MealEstimateEditor };
  }

  return { createMealEstimateEditor };
});
