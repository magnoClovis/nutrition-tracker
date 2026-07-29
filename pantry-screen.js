/**
 * Controlled Pantry screen for food registration, saved foods, meal templates,
 * supplements, Open Food Facts/autofill actions, and barcode presentation.
 *
 * React, `pickLang` from i18n.js, and `portionLabel` from date-utils.js are
 * injected explicitly. All durable state, CRUD logic, persistence, external
 * services, and scanner orchestration remain owned by NutritionTracker.
 *
 * IMPORTANT: the host supplies a pre-built `scannerVideoElement` carrying the
 * real video ref. This module only places that element in the existing markup.
 * Existing scanner races and limitations therefore remain in the controller.
 *
 * Known preserved peculiarities: Open Food Facts results are stored but not
 * rendered; the required supplement-dose field remains hidden; and the hidden,
 * orphaned body-composition controls remain in the supplement form.
 *
 * @module PantryScreen
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PantryScreenModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the Pantry screen with explicit presentation dependencies.
   *
   * @param {Object} dependencies Injected dependencies.
   * @param {Object} dependencies.React React runtime supplied by the host.
   * @param {function(string,string,string,string): string} dependencies.pickLang Language picker from i18n.js.
   * @param {function(string,string): string} dependencies.portionLabel Unit-label formatter from date-utils.js.
   * @returns {{PantryScreen: function(Object): Object}} Pantry screen API.
   */
  function createPantryScreen({ React, pickLang, portionLabel }) {
    if (!React || typeof React.createElement !== "function"
      || typeof pickLang !== "function" || typeof portionLabel !== "function") {
      throw new TypeError("PantryScreen requires React, pickLang, and portionLabel");
    }

    const inp = {
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
    const lbl = {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      display: "block"
    };
    const btn = {
      width: "100%",
      background: "var(--btn-ok)",
      border: "1px solid var(--btn-ok-border)",
      color: "var(--btn-ok-text)",
      padding: "11px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: "inherit",
      marginTop: 4
    };
    function sBtn(bg, border, color, extra = {}) {
      return {
        background: bg,
        border: "1px solid " + border,
        color,
        borderRadius: 4,
        padding: "6px 10px",
        fontSize: 14,
        letterSpacing: 1,
        textTransform: "uppercase",
        cursor: "pointer",
        ...extra
      };
    }

    /**
     * Renders the Pantry view using controller-owned data and callbacks.
     *
     * @param {Object} props Controlled Pantry state, derived lists, and event callbacks.
     * @returns {Object} React element tree for the Pantry tab.
     */
    function PantryScreen(props) {
      const {
        lang,
        isMobileView,
        text,
        form,
        setForm,
        showMicroForm,
        setShowMicroForm,
        editingId,
        setEditingId,
        editForm,
        setEditForm,
        autoFillLoading,
        foodDbLoading,
        foodDbResults,
        barcodeModalOpen,
        setBarcodeModalOpen,
        barcodeInput,
        setBarcodeInput,
        barcodeLoading,
        barcodeScanning,
        barcodeTorchAvailable,
        barcodeTorchEnabled,
        barcodeMessage,
        setBarcodeMessage,
        scannerVideoElement,
        closeBarcodeModal,
        startBarcodeScanner,
        stopBarcodeScanner,
        toggleBarcodeTorch,
        fetchBarcodeProduct,
        searchFoodDatabase,
        autoFillNutrition,
        pantrySearch,
        setPantrySearch,
        pantryItemsOpen,
        setPantryItemsOpen,
        mealTemplatesOpen,
        setMealTemplatesOpen,
        newFoodOpen,
        setNewFoodOpen,
        expandedTemplateIds,
        expandedPantryIds,
        setExpandedPantryIds,
        suppPantryOpen,
        setSuppPantryOpen,
        pantry,
        filteredPantry,
        sortedPantry,
        sortedAllPantry,
        mealTemplates,
        suppPantry,
        suppForm,
        setSuppForm,
        showSuppForm,
        setShowSuppForm,
        weightForm,
        setWeightForm,
        bodyComposition,
        macroFieldsOrdered: MACRO_FIELDS_ORDERED,
        macroFields: MACRO_FIELDS,
        microFields: MICRO_FIELDS,
        allFields: ALL_FIELDS,
        addFood,
        startEdit,
        saveEdit,
        removeFood,
        addSuppToPantry,
        removeSuppPantry,
        SavedMealCard,
        goals,
        editingTemplateId,
        templateEditDraft,
        mealOptions: MEALS,
        getMealLabel: mealLabel,
        toggleTemplateExpanded,
        appendTemplateToStaged,
        beginTemplateEdit,
        loadTemplate,
        deleteTemplate,
        setTemplateEditDraft,
        updateTemplateDraftItem,
        removeTemplateDraftItem,
        addTemplateDraftItem,
        cancelTemplateEdit,
        saveTemplateEdit
      } = props;
      const uiText = (pt, en, es) => pickLang(lang, pt, en, es);
      // Intentionally retained as controlled state without visual rendering.
      void foodDbResults;
      function renderSavedMealCard(tmpl, context) {
        return React.createElement(SavedMealCard, {
          key: tmpl.id,
          template: tmpl,
          context,
          goals,
          lang,
          expanded: !!expandedTemplateIds[tmpl.id],
          isMobileView,
          isEditing: editingTemplateId === tmpl.id,
          editDraft: templateEditDraft,
          mealOptions: MEALS,
          pantryFoods: sortedAllPantry,
          getMealLabel: mealLabel,
          onToggleExpanded: toggleTemplateExpanded,
          onAppend: appendTemplateToStaged,
          onEdit: beginTemplateEdit,
          onLoad: loadTemplate,
          onDelete: deleteTemplate,
          onEditDraftChange: setTemplateEditDraft,
          onUpdateItem: updateTemplateDraftItem,
          onRemoveItem: removeTemplateDraftItem,
          onAddItem: addTemplateDraftItem,
          onCancelEdit: cancelTemplateEdit,
          onSaveEdit: saveTemplateEdit
        });
      }

      return /*#__PURE__*/React.createElement("div", {
    "data-screen": "despensa",
    style: {
      padding: "2px 16px 28px",
      boxSizing: "border-box",
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "1fr auto",
      gap: 10,
      alignItems: "center",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: pantrySearch,
    onChange: e => setPantrySearch(e.target.value),
    placeholder: text('pantrySearch'),
    style: {
      ...inp,
      marginTop: 0,
      marginBottom: 0
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewFoodOpen(v => !v),
    style: {
      ...btn,
      marginTop: 0,
      minWidth: isMobileView ? "100%" : 180
    }
  }, newFoodOpen ? uiText("Fechar cadastro", "Close form", "Cerrar registro") : uiText("+ Novo alimento", "+ New food", "+ Nuevo alimento"))), newFoodOpen && /*#__PURE__*/React.createElement("div", {
    onClick: () => setNewFoodOpen(false),
    style: {
      display: "none"
    }
  }), newFoodOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: "100%",
      maxWidth: "100%",
      maxHeight: "none",
      overflowY: "visible",
      margin: "0 0 18px",
      transform: "none",
      background: "var(--surface)",
      border: "1px solid var(--border2)",
      borderRadius: 10,
      boxShadow: "0 12px 32px rgba(0,0,0,0.10)",
      padding: isMobileView ? "14px 14px 18px" : "18px 20px 22px",
      boxSizing: "border-box",
      animation: "softIn 220ms ease-out both"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: "1px solid var(--border3)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: "var(--muted)",
      marginBottom: 3
    }
  }, uiText("Novo alimento", "New food", "Nuevo alimento")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text3)"
    }
  }, uiText("Cadastre macros para reutilizar nas refeições.", "Save food macros to reuse in meals.", "Guarda macros para reutilizarlos en comidas."))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewFoodOpen(false),
    style: {
      background: "var(--btn-inactive)",
      border: "1px solid var(--btn-inactive-border)",
      color: "var(--muted)",
      borderRadius: 999,
      width: 34,
      height: 34,
      cursor: "pointer",
      fontSize: 18,
      lineHeight: "30px"
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('foodName')), /*#__PURE__*/React.createElement("input", {
    value: form.name,
    onChange: e => setForm(f => ({
      ...f,
      name: e.target.value
    })),
    placeholder: text('foodNamePh'),
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 90
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('unit')), /*#__PURE__*/React.createElement("select", {
    value: form.unit,
    onChange: e => setForm(f => ({
      ...f,
      unit: e.target.value,
      unitWeightG: e.target.value === "un" ? f.unitWeightG : ""
    })),
    style: inp
  }, /*#__PURE__*/React.createElement("option", {
    value: "g"
  }, "g"), /*#__PURE__*/React.createElement("option", {
    value: "ml"
  }, "ml"), /*#__PURE__*/React.createElement("option", {
    value: "un"
  }, "un")))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: form.unit === "un" ? "var(--btn-ok)" : "var(--surface)",
      border: "1px solid " + (form.unit === "un" ? "var(--btn-ok-border)" : "var(--border2)"),
      borderRadius: 8,
      padding: "10px 12px",
      marginBottom: 8,
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "1fr auto",
      gap: 10,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: form.unit === "un" ? "var(--btn-ok-text)" : "var(--text2)",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 3
    }
  }, uiText("Cadastrar por unidade", "Register by unit", "Registrar por unidad")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      lineHeight: 1.4
    }
  }, uiText(
    "Use para pães, barras, bolachas e itens parecidos quando a tabela informa valores por 100g e você sabe o peso médio da unidade.",
    "Use this for breads, bars, cookies and similar items when the label gives values per 100g and you know the average unit weight.",
    "Úsalo para panes, barras, galletas y alimentos similares cuando la etiqueta informa valores por 100g y sabes el peso medio de cada unidad."
  ))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setForm(f => ({...f, unit: "un"})),
    style: sBtn(form.unit === "un" ? "transparent" : "var(--btn-info)", form.unit === "un" ? "var(--btn-ok-border)" : "var(--btn-info-border)", form.unit === "un" ? "var(--btn-ok-text)" : "var(--btn-info-text)")
  }, form.unit === "un" ? uiText("Ativo", "Active", "Activo") : uiText("Usar unidades", "Use units", "Usar unidades"))), /*#__PURE__*/React.createElement("button", {
    "data-tutorial": "barcode-scan-button",
    onClick: () => {
      setBarcodeModalOpen(true);
      setBarcodeMessage("");
    },
    style: {
      width: "100%",
      background: "var(--btn-ok)",
      border: "1px solid var(--btn-ok-border)",
      color: "var(--btn-ok-text)",
      padding: "9px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: "inherit",
      marginBottom: 8
    }
  }, uiText("Ler código de barras", "Scan barcode", "Leer código de barras")), barcodeModalOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: 12,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text2)",
      fontWeight: 600
    }
  }, uiText("Buscar por código de barras", "Barcode lookup", "Buscar por código de barras")), /*#__PURE__*/React.createElement("button", {
    onClick: closeBarcodeModal,
    style: {
      background: "none",
      border: "none",
      color: "var(--muted)",
      cursor: "pointer",
      fontSize: 18
    }
  }, "\xD7")), scannerVideoElement, /*#__PURE__*/React.createElement("button", {
    onClick: barcodeScanning ? stopBarcodeScanner : startBarcodeScanner,
    disabled: barcodeLoading,
    style: {
      ...sBtn(barcodeScanning ? "var(--btn-warn)" : "var(--btn-ok)", barcodeScanning ? "var(--btn-warn-border)" : "var(--btn-ok-border)", barcodeScanning ? "var(--btn-warn-text)" : "var(--btn-ok-text)"),
      width: "100%",
      marginBottom: 8
    }
  }, barcodeScanning ? uiText("Parar câmera", "Stop camera", "Detener cámara") : uiText("Usar câmera", "Use camera", "Usar cámara")), barcodeScanning && barcodeTorchAvailable && /*#__PURE__*/React.createElement("button", {
    onClick: toggleBarcodeTorch,
    style: {
      ...sBtn("var(--btn-info)", "var(--btn-info-border)", "var(--btn-info-text)"),
      width: "100%",
      marginBottom: 8
    }
  }, barcodeTorchEnabled ? uiText("Desligar lanterna", "Turn flashlight off", "Apagar linterna") : uiText("Ligar lanterna", "Turn flashlight on", "Encender linterna")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: barcodeInput,
    onChange: e => setBarcodeInput(e.target.value.replace(/\D/g, "")),
    inputMode: "numeric",
    placeholder: uiText("Número do código", "Barcode number", "Número del código"),
    style: {
      ...inp,
      flex: 1,
      marginTop: 0
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => fetchBarcodeProduct(),
    disabled: barcodeLoading,
    style: {
      ...sBtn("var(--btn-teal)", "var(--btn-teal-border)", "var(--btn-teal-text)"),
      minWidth: 86
    }
  }, barcodeLoading ? uiText("Buscando", "Searching", "Buscando") : uiText("Buscar", "Search", "Buscar"))), barcodeMessage && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 12,
      color: "var(--muted)",
      lineHeight: 1.45
    }
  }, barcodeMessage)), /*#__PURE__*/React.createElement("button", {
    onClick: searchFoodDatabase,
    disabled: foodDbLoading,
    style: {
      width: "100%",
      background: "var(--btn-teal)",
      border: "1px solid var(--btn-teal-border)",
      color: foodDbLoading ? "var(--muted)" : "var(--btn-teal-text)",
      padding: "9px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: foodDbLoading ? "default" : "pointer",
      fontFamily: "inherit",
      marginBottom: 8
    }
  }, foodDbLoading
    ? uiText("Buscando na base...", "Searching database...", "Buscando en la base...")
    : uiText("Buscar na base nutricional", "Search nutrition database", "Buscar en la base nutricional")), /*#__PURE__*/React.createElement("button", {
    onClick: autoFillNutrition,
    disabled: autoFillLoading,
    style: {
      width: "100%",
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: autoFillLoading ? "var(--muted)" : "var(--btn-info-text)",
      padding: "9px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: autoFillLoading ? "default" : "pointer",
      fontFamily: "inherit",
      marginBottom: 10
    }
  }, autoFillLoading ? uiText("Buscando...", "Searching...", "Buscando...") : text('autofillBtn')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 8,
      marginTop: 12
    }
  }, text('macros') + ' (' + (form.unit === 'un' && parseFloat(form.unitWeightG||'0') > 0 ? uiText('por 100g \u2192 por unidade', 'per 100g \u2192 per unit', 'por 100g \u2192 por unidad') : portionLabel(form.unit, lang)) + ')' + ((form.unit === 'g' || form.unit === 'ml') && parseFloat(form.portionSize||'100') !== 100 ? ' \u2192 base 100' + form.unit : ''), " "),
  /* Porção base é só para g e ml */
  (form.unit === 'g' || form.unit === 'ml') && /*#__PURE__*/React.createElement("div", {
    style: { marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border2)' }
  },
    /*#__PURE__*/React.createElement("span", { style: { fontSize: 14, color: 'var(--text2)', flex: 1 } },
      uiText('Valores para uma porção de:', 'Values for a portion of:', 'Valores para una porción de:')
    ),
    /*#__PURE__*/React.createElement("input", {
      type: 'number', min: 1, max: 2000,
      value: form.portionSize,
      onChange: e => setForm(ff => ({ ...ff, portionSize: e.target.value })),
      style: { ...inp, width: 70, marginBottom: 0, textAlign: 'center' }
    }),
    /*#__PURE__*/React.createElement("span", { style: { fontSize: 14, color: 'var(--text2)' } }, form.unit)
  ),
  form.unit === 'un' && /*#__PURE__*/React.createElement("div", {
    style: { marginBottom: 10, display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1fr 120px',
      gap: 10, alignItems: 'end', background: 'var(--bg)', borderRadius: 8,
      padding: '8px 12px', border: '1px solid var(--border2)' }
  },
    /*#__PURE__*/React.createElement("div", null,
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 14, color: 'var(--text2)', lineHeight: 1.35 } },
        uiText('Opcional: peso médio da unidade', 'Optional: average unit weight', 'Opcional: peso medio de la unidad')
      ),
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: 'var(--muted)', lineHeight: 1.35, marginTop: 2 } },
        uiText(
          'Preencha apenas quando os valores acima estiverem por 100g. O app salvará o alimento como 1 unidade.',
          'Fill this only when the label values above are per 100g. The app will save the food as one unit.',
          'Rellena esto solo cuando los valores anteriores estén por 100g. La app guardará el alimento como 1 unidad.'
        )
      )
    ),
    /*#__PURE__*/React.createElement("div", null,
      /*#__PURE__*/React.createElement("input", {
        type: 'number', min: 1, step: '0.1',
        value: form.unitWeightG || '',
        onChange: e => setForm(ff => ({ ...ff, unitWeightG: e.target.value })),
        placeholder: '25',
        style: { ...inp, marginTop: 0, textAlign: 'center' }
      }),
      /*#__PURE__*/React.createElement("div", { style: { fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 3 } }, 'g/un')
    )
  ),
  /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }
  }, MACRO_FIELDS_ORDERED.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.key,
    style: { flex: "1 1 calc(50% - 4px)", minWidth: 120 }
  }, /*#__PURE__*/React.createElement("label", {
    style: Object.assign({}, lbl, { color: f.sub ? "var(--dim)" : f.required ? "#888" : "#555" },
      f.sub ? { paddingLeft: 8, borderLeft: "2px solid var(--border2)", display: "block" } : {})
  }, f.sub ? "\u21B3 " + f.label : f.label, f.required ? " *" : ""), /*#__PURE__*/React.createElement("input", {
    type: "number", value: form[f.key],
    onChange: e => setForm(ff => ({ ...ff, [f.key]: e.target.value })),
    placeholder: f.unit, style: inp
  })))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMicroForm(m => !m),
    style: {
      background: "none",
      border: "1px solid var(--border2)",
      color: "var(--muted)",
      width: "100%",
      padding: "7px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      marginBottom: 8
    }
  }, showMicroForm ? text('hideMicro') : text('showMicro')), showMicroForm && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginBottom: 10
    }
  }, MICRO_FIELDS.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.key,
    style: {
      flex: "1 1 calc(50% - 4px)",
      minWidth: 120
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      ...lbl,
      color: "var(--dim)"
    }
  }, f.label, " (", f.unit, ")"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: form[f.key],
    onChange: e => setForm(ff => ({
      ...ff,
      [f.key]: e.target.value
    })),
    placeholder: f.unit,
    style: inp
  })))), /*#__PURE__*/React.createElement("button", {
    "data-tutorial": "pantry-save-button",
    onClick: addFood,
    style: btn
  }, text('savePantry'))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "pantry-saved-foods",
    style: {
      marginTop: 24,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      marginBottom: pantryItemsOpen ? 10 : 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPantryItemsOpen(v => !v),
    style: {
      flex: 1,
      background: "none",
      border: "none",
      padding: 0,
      textAlign: "left",
      cursor: "pointer",
      fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--dim)",
      textTransform: "uppercase"
    }
  }, pantryItemsOpen ? "▼ " : "▶ ", text('pantryTitle'), " (", pantry.length, ")"))), pantryItemsOpen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    value: pantrySearch,
    onChange: e => setPantrySearch(e.target.value),
    placeholder: text('pantrySearch'),
    style: {
      ...inp,
      marginBottom: 10,
      display: "none"
    }
  }), filteredPantry.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center",
      marginTop: 12
    }
  }, pantrySearch ? text('noResults') : text('pantryEmpty')), sortedPantry.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.id,
    style: {
      borderBottom: "1px solid var(--border3)",
      padding: "8px 6px"
    }
  }, editingId === f.id ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('suppNameLabel')), /*#__PURE__*/React.createElement("input", {
    value: editForm.name,
    onChange: e => setEditForm(ef => ({
      ...ef,
      name: e.target.value
    })),
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 90
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('unit')), /*#__PURE__*/React.createElement("select", {
    value: editForm.unit,
    onChange: e => setEditForm(ef => ({
      ...ef,
      unit: e.target.value
    })),
    style: inp
  }, /*#__PURE__*/React.createElement("option", {
    value: "g"
  }, "g"), /*#__PURE__*/React.createElement("option", {
    value: "ml"
  }, "ml"), /*#__PURE__*/React.createElement("option", {
    value: "un"
  }, "un")))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 6
    }
  }, text('macros') + ' (' + portionLabel(editForm.unit, lang) + ')', " "), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginBottom: 6
    }
  }, MACRO_FIELDS.filter(ff => !ff.sub).map(ff => /*#__PURE__*/React.createElement("div", {
    key: ff.key,
    style: {
      flex: "1 1 calc(50% - 4px)",
      minWidth: 110
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      ...lbl,
      color: ff.required ? "#888" : "#555"
    }
  }, ff.label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editForm[ff.key],
    onChange: e => setEditForm(ef => ({
      ...ef,
      [ff.key]: e.target.value
    })),
    style: inp
  }))), MACRO_FIELDS.filter(ff => ff.sub).map(ff => /*#__PURE__*/React.createElement("div", {
    key: ff.key,
    style: {
      flex: "1 1 calc(50% - 4px)",
      minWidth: 110
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      ...lbl,
      color: "var(--dim)"
    }
  }, ff.label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editForm[ff.key],
    onChange: e => setEditForm(ef => ({
      ...ef,
      [ff.key]: e.target.value
    })),
    style: inp
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: saveEdit,
    style: {
      ...btn,
      flex: 1,
      marginTop: 0
    }
  }, text('pantrySave')), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setEditingId(null);
      setEditForm(null);
    },
    style: {
      flex: 1,
      background: "none",
      border: "1px solid var(--border2)",
      color: "var(--muted)",
      padding: "10px",
      borderRadius: 6,
      fontSize: 14,
      textTransform: "uppercase",
      cursor: "pointer"
    }
  }, "Cancelar"))) : /*#__PURE__*/React.createElement("div", {
    "data-pantry-food": "true",
    style: {
      padding: "9px 17px",
      display: "flex",
      gap: 10,
      justifyContent: "space-between",
      alignItems: "flex-start",
      flexWrap: isMobileView ? "wrap" : "nowrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setExpandedPantryIds(current => ({...current, [f.id]: !current[f.id]})),
    "aria-expanded": !!expandedPantryIds[f.id],
    style: {
      flex: "1 1 260px",
      minWidth: 0,
      background: "none",
      border: "none",
      padding: 0,
      textAlign: "left",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text2)",
      marginBottom: 2
    }
  }, f.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      lineHeight: 1.45
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {fontSize: 13, color: "var(--accent-protein-text)"}
  }, f.protein100 || 0, "g ", uiText("proteína", "protein", "proteína")), /*#__PURE__*/React.createElement("span", {
    style: {fontSize: 13, color: "var(--accent-kcal-text)"}
  }, f.kcal100 || 0, " kcal"), /*#__PURE__*/React.createElement("span", {
    style: {fontSize: 12, color: "var(--dim)", marginLeft: "auto"}
  }, expandedPantryIds[f.id] ? "▲" : "▼")), /*#__PURE__*/React.createElement("div", {
    "data-pantry-expanded-nutrients": "true",
    style: {
      maxHeight: expandedPantryIds[f.id] ? 420 : 0,
      opacity: expandedPantryIds[f.id] ? 1 : 0,
      overflow: "hidden",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
      columnGap: 14,
      rowGap: 12,
      lineHeight: 1.45,
      marginTop: expandedPantryIds[f.id] ? 8 : 0,
      padding: expandedPantryIds[f.id] ? "12px 0 14px" : 0,
      transition: "max-height var(--dur-base) var(--ease-spring), opacity var(--dur-base) var(--ease-spring), margin-top var(--dur-base) var(--ease-spring), padding var(--dur-base) var(--ease-spring)"
    }
  }, ALL_FIELDS.filter(ff => ff.key !== "protein100" && ff.key !== "kcal100" && f[ff.key] != null).map(ff => /*#__PURE__*/React.createElement("span", {
    key: ff.key,
    style: {
      fontSize: 14,
      color: "var(--muted)"
    }
  }, (ff.label || ff.key).replace('', "").replace('', "").replace("of which ", ""), " ", f[ff.key], ff.unit)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--dim)"
    }
  }, portionLabel(f.unit, lang)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 5,
      flexShrink: 0,
      marginLeft: isMobileView ? 0 : 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: event => { event.stopPropagation(); startEdit(f); },
    style: {
      background: "none",
      border: "1px solid var(--border2)",
      color: "var(--muted)",
      borderRadius: 4,
      padding: "3px 8px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, text('editItem')), /*#__PURE__*/React.createElement("button", {
    onClick: event => { event.stopPropagation(); removeFood(f.id); },
    style: {
      background: "none",
      border: "1px solid var(--border3)",
      color: "var(--dim)",
      borderRadius: 4,
      padding: "3px 8px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, "\xD7"))))))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "pantry-meal-templates",
    style: {
      marginTop: 12,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMealTemplatesOpen(v => !v),
    style: {
      width: "100%",
      background: "none",
      border: "none",
      padding: 0,
      textAlign: "left",
      cursor: "pointer",
      fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--dim)",
      textTransform: "uppercase"
    }
  }, mealTemplatesOpen ? "▼ " : "▶ ", uiText("Refeições salvas", "Saved meals", "Comidas guardadas"), " (", mealTemplates.length, ")")), mealTemplatesOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, mealTemplates.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center",
      padding: "10px 0"
    }
  }, uiText("Nenhuma refeição salva.", "No saved meals.", "No hay comidas guardadas.")) : mealTemplates.map(tmpl => renderSavedMealCard(tmpl, "pantry")))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "pantry-supplements",
    style: {
      marginTop: 12,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSuppPantryOpen(v => !v),
    style: {
      flex: 1,
      background: "none",
      border: "none",
      padding: 0,
      textAlign: "left",
      cursor: "pointer",
      fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase"
    }
  }, suppPantryOpen ? "\u25BE " : "\u25B8 ", `\uD83D\uDC8A ${text('suppPantryTitle')} (${suppPantry.length})`)), /*#__PURE__*/React.createElement("button", {
    onClick: () => { setSuppPantryOpen(true); setShowSuppForm(s => !s); },
    title: showSuppForm
      ? uiText("Fechar formulário", "Close supplement form", "Cerrar formulario")
      : uiText("Adicionar suplemento", "Add supplement", "Añadir suplemento"),
    style: sBtn("var(--btn-info)", "var(--btn-info-border)", "#9090c8", isMobileView ? {
      padding: "5px 8px",
      fontSize: 10,
      letterSpacing: 0.5,
      whiteSpace: "nowrap"
    } : {})
  }, isMobileView ? (showSuppForm ? "\u25B2" : "+") : showSuppForm
    ? uiText("\u25B2 fechar", "\u25B2 close", "\u25B2 cerrar")
    : uiText("+ adicionar", "+ add", "+ añadir"))), suppPantryOpen && showSuppForm && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 6,
      padding: "12px",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 2
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('suppNameLabel')), /*#__PURE__*/React.createElement("input", {
    value: suppForm.name,
    onChange: e => setSuppForm(f => ({
      ...f,
      name: e.target.value
    })),
    placeholder: uiText("ex: Creatina", "e.g. Creatine", "ej.: Creatina"),
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "none"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('suppDoseLabel')), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: suppForm.dose,
    onChange: e => setSuppForm(f => ({
      ...f,
      dose: e.target.value
    })),
    placeholder: "5",
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 80
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('unit')), /*#__PURE__*/React.createElement("select", {
    value: suppForm.unit,
    onChange: e => setSuppForm(f => ({
      ...f,
      unit: e.target.value
    })),
    style: inp
  }, /*#__PURE__*/React.createElement("option", {
    value: "g"
  }, "g"), /*#__PURE__*/React.createElement("option", {
    value: "mg"
  }, "mg"), /*#__PURE__*/React.createElement("option", {
    value: "\xB5g"
  }, "\xB5g"), /*#__PURE__*/React.createElement("option", {
    value: "ml"
  }, "ml"), /*#__PURE__*/React.createElement("option", {
    value: "un"
  }, "un"), /*#__PURE__*/React.createElement("option", {
    value: "c\xE1ps"
  }, "c\xE1ps")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Notas (opcional)", "Notes (optional)", "Notas (opcional)")), /*#__PURE__*/React.createElement("input", {
    value: suppForm.notes,
    onChange: e => setSuppForm(f => ({
      ...f,
      notes: e.target.value
    })),
    placeholder: uiText("ex: tomar com água, em jejum...", "e.g. take with water, fasting...", "ej.: tomar con agua, en ayunas..."),
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      padding: "10px 12px",
      border: "1px solid var(--border3)",
      borderRadius: 8,
      background: "var(--surface)",
      display: "none",
      gridTemplateColumns: isMobileView ? "1fr" : "repeat(3, 1fr)",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { gridColumn: isMobileView ? "auto" : "1 / -1", color: "var(--muted)", fontSize: 12, lineHeight: 1.4 }
  }, uiText(
    "Dados opcionais de composição corporal. Use como tendência, não como diagnóstico exato.",
    "Optional body-composition data. Use it as a trend, not as an exact diagnosis.",
    "Datos opcionales de composición corporal. Úsalos como tendencia, no como diagnóstico exacto."
  )), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Gordura corporal %", "Body fat %", "Grasa corporal %")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "70",
    step: "0.1",
    value: weightForm.bodyFatPct,
    onChange: e => setWeightForm(f => ({...f, bodyFatPct: e.target.value})),
    placeholder: bodyComposition.currentFatPct ? String(Math.round(bodyComposition.currentFatPct * 10) / 10) : "",
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Cintura (cm)", "Waist (cm)", "Cintura (cm)")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "30",
    step: "0.1",
    value: weightForm.waistCm,
    onChange: e => setWeightForm(f => ({...f, waistCm: e.target.value})),
    placeholder: bodyComposition.latest?.waistCm ? String(bodyComposition.latest.waistCm) : "",
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Massa muscular (kg)", "Muscle mass (kg)", "Masa muscular (kg)")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    step: "0.1",
    value: weightForm.muscleMassKg,
    onChange: e => setWeightForm(f => ({...f, muscleMassKg: e.target.value})),
    placeholder: bodyComposition.latest?.muscleMassKg ? String(bodyComposition.latest.muscleMassKg) : "",
    style: inp
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: addSuppToPantry,
    style: btn
  }, text('suppSave'))), suppPantryOpen && suppPantry.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center",
      padding: "10px 0"
    }
  }, uiText("Nenhum suplemento adicionado.", "No supplements added.", "No hay suplementos añadidos.")), suppPantryOpen && suppPantry.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 6px",
      borderBottom: "1px solid var(--border3)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text2)"
    }
  }, s.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      marginTop: 2
    }
    }, text('defaultDose'), " ", s.dose, s.unit, s.notes ? " · " + s.notes : "")), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeSuppPantry(s.id),
    style: {
      background: "none",
      border: "1px solid var(--border3)",
      color: "var(--dim)",
      borderRadius: 4,
      padding: "3px 8px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, "\xD7")))));
    }

    return { PantryScreen };
  }

  return { createPantryScreen };
});
