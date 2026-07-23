/**
 * Presentational saved-meal card with its existing inline edit form.
 *
 * The host owns template state, confirmation, notifications, staging, and
 * autosave. Food-entry transformations are injected from `food-entry.js`, so
 * this module does not duplicate quantity or nutrient rules and performs no
 * storage, Firebase, or DOM I/O.
 *
 * @module SavedMealCard
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SavedMealCardModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the saved-meal card with explicit domain/presentation dependencies.
   *
   * @param {Object} dependencies Injected dependencies.
   * @param {Object} dependencies.React React runtime supplied by the host.
   * @param {function(string,string,string,string): string} dependencies.pickLang Language picker from `i18n.js`.
   * @param {function(Object): Array<Object>} dependencies.templateEntries Entry builder from `food-entry.js`.
   * @param {function(Object): Object} dependencies.templateTotals Totals builder from `food-entry.js`.
   * @param {function(Object): Object} dependencies.templateItemEntry Item calculator from `food-entry.js`.
   * @returns {{SavedMealCard: function(Object): Object}} Component API.
   */
  function createSavedMealCard({
    React,
    pickLang,
    templateEntries,
    templateTotals,
    templateItemEntry
  }) {
    if (!React || typeof React.createElement !== "function" || typeof pickLang !== "function"
      || typeof templateEntries !== "function" || typeof templateTotals !== "function"
      || typeof templateItemEntry !== "function") {
      throw new TypeError("SavedMealCard requires React, pickLang, and food-entry template helpers");
    }

    const inputStyle = {
      width: "100%",
      background: "var(--input)",
      border: "1px solid var(--border2)",
      color: "var(--text2)",
      padding: "9px 12px",
      borderRadius: 6,
      fontSize: 14,
      fontFamily: "inherit",
      boxSizing: "border-box",
      outline: "none",
      marginTop: 3
    };
    const labelStyle = {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      display: "block"
    };
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
     * Renders one saved meal in add or pantry context.
     *
     * @param {Object} props Card props.
     * @param {Object} props.template Persisted meal-template snapshot.
     * @param {"add"|"pantry"} props.context Host surface.
     * @param {Object} props.goals Current nutrition goals.
     * @param {string} props.lang Active language.
     * @param {boolean} props.expanded Whether details are expanded.
     * @param {boolean} props.isMobileView Whether mobile layout is active.
     * @param {boolean} props.isEditing Whether this template is being edited.
     * @param {Object|null} props.editDraft Current edit draft.
     * @param {Array<string>} props.mealOptions Fixed persisted meal keys.
     * @param {Array<Object>} props.pantryFoods Pantry options.
     * @param {function(string): string} props.getMealLabel Localized meal label.
     * @param {function(string): void} props.onToggleExpanded Expansion callback.
     * @param {function(Object): void} props.onAppend Staging append callback.
     * @param {function(Object): void} props.onEdit Edit callback.
     * @param {function(Object): void} props.onLoad Load callback.
     * @param {function(string): void} props.onDelete Delete callback.
     * @param {function(function(Object): Object): void} props.onEditDraftChange Draft setter.
     * @param {function(number,Object): void} props.onUpdateItem Item update callback.
     * @param {function(number): void} props.onRemoveItem Item removal callback.
     * @param {function(): void} props.onAddItem Item-add callback.
     * @param {function(): void} props.onCancelEdit Cancel callback.
     * @param {function(): void} props.onSaveEdit Save callback.
     * @returns {Object} Saved-meal card React element.
     */
    function SavedMealCard({
      template,
      context,
      goals,
      lang,
      expanded,
      isMobileView,
      isEditing,
      editDraft,
      mealOptions,
      pantryFoods,
      getMealLabel,
      onToggleExpanded,
      onAppend,
      onEdit,
      onLoad,
      onDelete,
      onEditDraftChange,
      onUpdateItem,
      onRemoveItem,
      onAddItem,
      onCancelEdit,
      onSaveEdit
    }) {
      const uiText = (pt, en, es) => pickLang(lang, pt, en, es);
      const entries = templateEntries(template);
      const totals = templateTotals(template);
      const editing = Boolean(context === "pantry" && isEditing && editDraft);
      const pctOf = (value, target) => target ? Math.round(value / target * 100) : 0;
      const proteinPct = pctOf(totals.protein, goals.protein);
      const kcalPct = pctOf(totals.kcal, goals.kcal);
      const cardHeader = React.createElement("div", {
        style: { display: "flex", alignItems: "center", gap: 8 }
      }, React.createElement("button", {
        onClick: () => onToggleExpanded(template.id),
        title: expanded ? uiText("Recolher", "Collapse", "Contraer") : uiText("Expandir", "Expand", "Expandir"),
        style: {
          background: "none", border: "1px solid var(--border3)", color: "var(--muted)",
          borderRadius: 6, width: 28, height: 28, cursor: "pointer", flexShrink: 0
        }
      }, expanded ? "-" : "+"), React.createElement("div", {
        style: { flex: 1, minWidth: 0 }
      }, React.createElement("div", {
        style: {
          fontSize: 14, color: "var(--text2)", marginBottom: 4, whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis"
        }
      }, template.name), React.createElement("div", {
        style: { display: "flex", flexWrap: "wrap", gap: "6px 10px", fontSize: 12, color: "var(--muted)" }
      }, React.createElement("span", null, Math.round(totals.kcal), " kcal \u00b7 ", kcalPct, "%"), React.createElement("span", null, Math.round(totals.protein), "g ", uiText("prote\u00edna", "protein", "prote\u00edna"), " \u00b7 ", proteinPct, "%"), React.createElement("span", null, (template.items || []).length, " item", (template.items || []).length !== 1 ? "s" : ""))), React.createElement("div", {
        style: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }
      }, context === "add" && React.createElement("button", {
        onClick: () => onAppend(template),
        style: buttonStyle("var(--btn-ok)", "var(--btn-ok-border)", "var(--btn-ok-text)")
      }, uiText("Adicionar", "Add", "A\u00f1adir")), React.createElement("button", {
        onClick: () => context === "pantry" ? onEdit(template) : onLoad(template),
        style: buttonStyle("var(--btn-info)", "var(--btn-info-border)", "var(--btn-info-text)")
      }, uiText("Editar", "Edit", "Editar")), context === "pantry" && React.createElement("button", {
        onClick: () => onDelete(template.id),
        title: uiText("Apagar", "Delete", "Eliminar"),
        style: {
          background: "none", border: "1px solid var(--border3)", color: "var(--dim)",
          borderRadius: 6, padding: "4px 8px", fontSize: 14, cursor: "pointer"
        }
      }, "\u00d7")));

      const templateEditRows = editing && editDraft.items.length === 0
        ? React.createElement("div", {
          style: { color: "var(--faint)", fontSize: 13, fontStyle: "italic", padding: "8px 0" }
        }, uiText("Sem ingredientes neste modelo.", "No ingredients in this template.", "Sin ingredientes en este modelo."))
        : editing && editDraft.items.map((item, idx) => {
          const refreshed = templateItemEntry(item);
          return React.createElement("div", {
            key: (item.foodId || item.name || "item") + idx,
            style: {
              display: "grid",
              gridTemplateColumns: isMobileView ? "1fr" : "minmax(150px, 1fr) 96px 34px",
              gap: 8, alignItems: "end", marginBottom: 8
            }
          }, React.createElement("div", {
            style: { color: "var(--text2)", fontSize: 14, minWidth: 0 }
          }, item.name, React.createElement("div", {
            style: { color: "var(--muted)", fontSize: 12, marginTop: 2 }
          }, Math.round(refreshed.kcal || 0), " kcal \u00b7 ", Math.round(refreshed.protein || 0), "g ", uiText("prote\u00edna", "protein", "prote\u00edna"))), React.createElement("input", {
            type: "number",
            value: item.qty,
            onChange: event => onUpdateItem(idx, { qty: event.target.value }),
            style: { ...inputStyle, marginTop: 0 }
          }), React.createElement("button", {
            onClick: () => onRemoveItem(idx),
            title: uiText("Remover ingrediente", "Remove ingredient", "Eliminar ingrediente"),
            style: {
              height: 36, background: "none", border: "1px solid var(--border3)",
              color: "var(--dim)", borderRadius: 6, cursor: "pointer", fontSize: 16
            }
          }, "\u00d7"));
        });

      const editContent = editing && React.createElement("div", {
        style: { marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border3)" }
      }, React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: isMobileView ? "1fr" : "minmax(180px, 1fr) minmax(160px, 220px)",
          gap: 8, marginBottom: 10
        }
      }, React.createElement("div", null, React.createElement("label", {
        style: labelStyle
      }, uiText("Nome da refei\u00e7\u00e3o", "Template name", "Nombre de la comida")), React.createElement("input", {
        value: editDraft.name,
        onChange: event => onEditDraftChange(draft => ({ ...draft, name: event.target.value })),
        style: inputStyle
      })), React.createElement("div", null, React.createElement("label", {
        style: labelStyle
      }, uiText("Refei\u00e7\u00e3o padr\u00e3o", "Default meal", "Comida predeterminada")), React.createElement("select", {
        value: editDraft.meal,
        onChange: event => onEditDraftChange(draft => ({ ...draft, meal: event.target.value })),
        style: inputStyle
      }, mealOptions.map(meal => React.createElement("option", { key: meal, value: meal }, getMealLabel(meal)))))), templateEditRows, React.createElement("div", {
        style: {
          display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "minmax(180px, 1fr) 96px auto",
          gap: 8, alignItems: "end", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border3)"
        }
      }, React.createElement("select", {
        value: editDraft.addFoodId,
        onChange: event => onEditDraftChange(draft => ({ ...draft, addFoodId: event.target.value })),
        style: inputStyle
      }, React.createElement("option", { value: "" }, uiText("Adicionar ingrediente...", "Add ingredient...", "A\u00f1adir ingrediente...")), pantryFoods.map(food => React.createElement("option", { key: food.id, value: food.id }, food.name))), React.createElement("input", {
        type: "number",
        value: editDraft.addQty,
        onChange: event => onEditDraftChange(draft => ({ ...draft, addQty: event.target.value })),
        placeholder: uiText("Qtd", "Qty", "Cant."),
        style: inputStyle
      }), React.createElement("button", {
        onClick: onAddItem,
        disabled: !editDraft.addFoodId || !editDraft.addQty,
        style: {
          ...buttonStyle("var(--btn-info)", "var(--btn-info-border)", "var(--btn-info-text)"),
          height: 36, opacity: editDraft.addFoodId && editDraft.addQty ? 1 : 0.45
        }
      }, uiText("Adicionar", "Add", "A\u00f1adir"))), React.createElement("div", {
        style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }
      }, React.createElement("button", {
        onClick: onCancelEdit,
        style: buttonStyle("transparent", "var(--border2)", "var(--muted)")
      }, uiText("Cancelar", "Cancel", "Cancelar")), React.createElement("button", {
        onClick: onSaveEdit,
        disabled: !editDraft.name.trim() || !editDraft.items.length,
        style: {
          ...buttonStyle("var(--btn-ok)", "var(--btn-ok-border)", "var(--btn-ok-text)"),
          opacity: editDraft.name.trim() && editDraft.items.length ? 1 : 0.45
        }
      }, uiText("Salvar altera\u00e7\u00f5es", "Save changes", "Guardar cambios"))));

      const detailsContent = expanded && !editing && React.createElement("div", {
        style: {
          marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border3)",
          display: "flex", flexDirection: "column", gap: 8
        }
      }, entries.length === 0 ? React.createElement("div", {
        style: { fontSize: 12, color: "var(--faint)", fontStyle: "italic" }
      }, uiText("Sem ingredientes salvos.", "No ingredients saved.", "Sin ingredientes guardados.")) : entries.map((item, idx) => React.createElement("div", {
        key: item.foodId || item.name || idx,
        style: {
          display: "grid", gridTemplateColumns: "minmax(120px, 1fr) auto",
          gap: 10, alignItems: "start", fontSize: 13
        }
      }, React.createElement("div", {
        style: { color: "var(--text2)", minWidth: 0 }
      }, item.name, React.createElement("div", {
        style: { color: "var(--muted)", fontSize: 12, marginTop: 2 }
      }, item.qty, item.unit)), React.createElement("div", {
        style: { color: "var(--muted2)", fontSize: 12, textAlign: "right", lineHeight: 1.45 }
      }, Math.round(item.kcal || 0), " kcal \u00b7 ", Math.round(item.protein || 0), "g prot", React.createElement("br", null), Math.round(item.carbs || 0), "g carb \u00b7 ", Math.round(item.fat || 0), "g gord"))));

      return React.createElement("div", {
        style: {
          border: "1px solid var(--border3)", borderRadius: 8, padding: "10px 12px",
          background: "var(--surface2, var(--surface))"
        }
      }, cardHeader, editContent, detailsContent);
    }

    return { SavedMealCard };
  }

  return { createSavedMealCard };
});
