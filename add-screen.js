/**
 * Controlled Add-meal pseudo-screen for recent meals, saved templates, dish
 * description, manual food selection, and staged-meal review.
 *
 * React, `pickLang` from i18n.js, plus `quickQtys` and `divisor` from
 * date-utils.js are injected explicitly. NutritionTracker retains ownership of
 * all durable state, persistence, AI/GA calls, review confirmation, navigation,
 * and cross-screen data shared with Diary and Pantry.
 *
 * The hidden legacy transfer/export panel is supplied as an opaque React node.
 * This intentionally preserves its disconnected duplicate GA controls without
 * introducing any new connection to the active meal-ga.js flow.
 *
 * Known preserved behavior: dish-description and review requests can resolve
 * out of order, and closing the pseudo-screen does not cancel work or clear
 * staged state. Those request-lifecycle inconsistencies remain backlog items.
 *
 * @module AddScreen
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AddScreenModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the controlled Add pseudo-screen with explicit dependencies.
   *
   * @param {Object} dependencies Injected dependencies.
   * @param {Object} dependencies.React React runtime supplied by the host.
   * @param {function(string,string,string,string): string} dependencies.pickLang Language picker from i18n.js.
   * @param {function(string): Array<number>} dependencies.quickQtys Quantity presets from date-utils.js.
   * @param {function(string): number} dependencies.divisor Unit divisor from date-utils.js.
   * @returns {{AddScreen: function(Object): Object}} Add-screen API.
   */
  function createAddScreen({ React, pickLang, quickQtys, divisor }) {
    if (!React || typeof React.createElement !== "function"
      || typeof pickLang !== "function" || typeof quickQtys !== "function"
      || typeof divisor !== "function") {
      throw new TypeError("AddScreen requires React, pickLang, quickQtys, and divisor");
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
    const aiButtonStyle = {
      background: "var(--ai-bg)",
      border: "1px solid var(--ai-border)",
      color: "var(--ai-text)",
      borderRadius: 8,
      letterSpacing: 1,
      textTransform: "uppercase",
      fontWeight: 650
    };
    const proteinColor = "var(--protein)";
    const caloriesColor = "var(--calories)";

    function confidenceColor(confidence) {
      const normalizedConfidence = String(confidence || "").trim().toLowerCase();
      if (["alta", "high"].includes(normalizedConfidence)) return "#6ec8a9";
      if (["media", "média", "medium"].includes(normalizedConfidence)) return "#c8a96e";
      return "#c86e8e";
    }

    /**
     * Renders one of the three existing non-contiguous Add-screen regions.
     * The section split preserves the original DOM ordering around shared
     * controller overlays while all Add markup remains owned by this module.
     *
     * @param {Object} props Controlled Add state, derived data, callbacks, and section name.
     * @returns {Object|null} React element tree for the requested Add region.
     */
    function AddScreen(props) {
      const {
        section,
        lang,
        isMobileView,
        text,
        closeMealRegistration,
        helpNode,
        showRecentMeals,
        setShowRecentMeals,
        recentMeals,
        MEALS,
        mealDisplay,
        loadRecentMealToStaged,
        TODAY,
        showSaveTemplateModal,
        setShowSaveTemplateModal,
        staged,
        templateName,
        setTemplateName,
        saveTemplate,
        addTemplatesOpen,
        describeMode,
        pantry,
        selectAddMode,
        mealTimeOpen,
        mealTimeValue,
        openMealTimeControl,
        setSelectedMealTime,
        mealRegistrationSaving,
        mealTemplates,
        addTemplateSearch,
        setAddTemplateSearch,
        SavedMealCard,
        goals,
        expandedTemplateIds,
        editingTemplateId,
        templateEditDraft,
        sortedAllPantry,
        mealLabel,
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
        saveTemplateEdit,
        describeMeal,
        setDescribeMeal,
        mealDescription,
        setMealDescription,
        describeLoading,
        estimateMealDescription,
        describeResult,
        addDescribedToLog,
        evaluateDescribedMeal,
        batchMode,
        addEntry,
        setAddEntry,
        selectedFood,
        ALL_FIELDS,
        addToLog,
        addToStaged,
        setStaged,
        editStagedIdx,
        editStagedQty,
        setEditStagedQty,
        saveEditStaged,
        setEditStagedIdx,
        removeFromStaged,
        stagedTot,
        commitStaged,
        evaluateStagedMeal,
        openSaveTemplateModal,
        legacyTransferPanel
      } = props;
      const uiText = (pt, en, es) => pickLang(lang, pt, en, es);

      function renderHeader() {
        return React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: "1px solid var(--border3)",
      position: "sticky",
      top: isMobileView ? -18 : -22,
      background: "var(--surface)",
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 auto",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: "var(--muted)",
      marginBottom: 3
    }
  }, uiText("Registrar refeição", "Log meal", "Registrar comida")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text3)"
    }
  }, uiText("Escolha um método e salve no diário de hoje.", "Choose a method and save it to today's diary.", "Elige un método y guárdalo en el diario de hoy."))), /*#__PURE__*/React.createElement("div", {
    "data-add-header-actions": "true",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flex: "0 0 auto"
    }
  }, helpNode, /*#__PURE__*/React.createElement("button", {
    "data-add-close": "true",
    "aria-label": uiText("Fechar registro de refeição", "Close meal logging", "Cerrar registro de comida"),
    onClick: closeMealRegistration,
    disabled: mealRegistrationSaving,
    style: {
      background: "var(--btn-inactive)",
      border: "1px solid var(--btn-inactive-border)",
      color: "var(--muted)",
      borderRadius: 999,
      width: 34,
      height: 34,
      cursor: mealRegistrationSaving ? "wait" : "pointer",
      opacity: mealRegistrationSaving ? 0.65 : 1,
      fontSize: 18,
      lineHeight: "30px"
    }
  }, "\u00D7")));
      }

      function renderRecentMeals() {
        return React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowRecentMeals(s => !s),
    style: {
      width: "100%",
      background: "var(--btn-inactive)",
      border: "1px solid var(--btn-inactive-border)",
      color: "var(--muted)",
      padding: "8px 12px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      textAlign: "left",
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", null, text('repeatRecent')), /*#__PURE__*/React.createElement("span", null, showRecentMeals ? "\u25BE" : "\u25B8")), showRecentMeals && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderTop: "none",
      borderRadius: "0 0 6px 6px",
      maxHeight: 280,
      overflowY: "auto"
    }
  }, recentMeals.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px",
      color: "var(--dim)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center"
    }
  }, "Sem refei\xE7\xF5es recentes.") : MEALS.map(meal => {
    const byMeal = recentMeals.filter(r => r.meal === meal);
    if (!byMeal.length) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: meal
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "6px 12px",
        fontSize: 14,
        letterSpacing: 1,
        color: "var(--muted)",
        textTransform: "uppercase",
        borderBottom: "1px solid var(--border3)",
        background: "var(--surface3)"
      }
    }, mealDisplay(meal)), byMeal.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: () => loadRecentMealToStaged(r),
      style: {
        padding: "9px 12px",
        borderBottom: "1px solid var(--border3)",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      },
      onMouseEnter: e => e.currentTarget.style.background = "var(--btn-inactive)",
      onMouseLeave: e => e.currentTarget.style.background = "transparent"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--text3)"
      }
    }, r.date === TODAY ? text('today') : r.date), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--muted)",
        marginTop: 2
      }
    }, r.entries.length, " item", r.entries.length !== 1 ? "s" : "", ": ", r.entries.map(e => e.name).join(", ").slice(0, 50), r.entries.map(e => e.name).join(", ").length > 50 ? "..." : "")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right",
        flexShrink: 0,
        marginLeft: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "#c8a96e"
      }
    }, r.protein, "g"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "#8ec8c8"
      }
    }, r.kcal, " kcal")))));
  })));
      }

      function renderContent() {
        return React.createElement(React.Fragment, null, showSaveTemplateModal && /*#__PURE__*/React.createElement("div", {
    "data-safe-area-dialog":"16",
    style:{position:"fixed",inset:0,zIndex:100003,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(3px)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:16},
    onClick: e => { if(e.target===e.currentTarget) setShowSaveTemplateModal(false); }
  },
    /*#__PURE__*/React.createElement("div", {
      style:{background:"var(--surface)",borderRadius:14,padding:"24px",
        width:"100%",maxWidth:380,border:"1px solid var(--border2)",
        boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}
    },
      /*#__PURE__*/React.createElement("h3", {
        style:{margin:"0 0 6px",fontSize:16,color:"var(--text)",fontWeight:600}
      }, uiText("Salvar refeição", "Save meal template", "Guardar plantilla")),
      /*#__PURE__*/React.createElement("p", {
        style:{margin:"0 0 16px",fontSize:13,color:"var(--muted)"}
      }, staged.items.map(i=>i.name).join(", ")),
      /*#__PURE__*/React.createElement("input", {
        type:"text", value:templateName,
        onChange: e => setTemplateName(e.target.value),
        onKeyDown: e => { if(e.key==='Enter'){ saveTemplate(); }},
        placeholder: uiText("Nome (ex: Shake pré-treino)", "Name (e.g. Pre-workout shake)", "Nombre (ej.: batido preentreno)"),
        autoFocus: true,
        style:{...inp,marginBottom:14}
      }),
      /*#__PURE__*/React.createElement("div",{style:{display:"flex",gap:8}},
        /*#__PURE__*/React.createElement("button",{
          onClick:()=>setShowSaveTemplateModal(false),
          style:{flex:1,padding:"10px",borderRadius:8,background:"none",
            border:"1px solid var(--border2)",color:"var(--text2)",
            cursor:"pointer",fontFamily:"inherit",fontSize:13}
        }, uiText("Cancelar", "Cancel", "Cancelar")),
        /*#__PURE__*/React.createElement("button",{
          onClick: saveTemplate,
          disabled: !templateName.trim(),
          style:{flex:2,padding:"10px",borderRadius:8,
            background:templateName.trim()?"var(--btn-ok)":"var(--btn-inactive)",
            border:"none",color:templateName.trim()?"var(--btn-ok-text)":"var(--muted)",
            cursor:templateName.trim()?"pointer":"default",fontFamily:"inherit",
            fontSize:13,fontWeight:600}
        }, uiText("Salvar", "Save", "Guardar"))
      )
    )
  ), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "add-modes",
    style: {
      display: "flex",
      gap: 4,
      marginBottom: 16,
      padding: 4,
      background: "var(--surface3)",
      border: "1px solid var(--border3)",
      borderRadius: 999
    }
  }, [["batch", text('modeBatch')], ["describe", text('modeDescribe')], ["saved", isMobileView ? uiText("Salvas", "Saved", "Guardadas") : uiText("Refeições salvas", "Saved meals", "Comidas guardadas")]].map(([m, l]) => {
    const active = m === "saved" ? addTemplatesOpen : m === "describe" ? describeMode : !describeMode && !addTemplatesOpen;
    const unavailable = m !== "saved" && pantry.length === 0 && m !== "describe";
    return /*#__PURE__*/React.createElement("button", {
      key: m,
      onClick: () => selectAddMode(m),
      style: {
        flex: 1,
        padding: isMobileView ? "9px 8px" : "9px 12px",
        background: active ? (m === "describe" ? "var(--ai-bg)" : "var(--btn-ok)") : "transparent",
        border: "1px solid " + (active ? (m === "describe" ? "var(--ai-border)" : "var(--btn-ok-border)") : "transparent"),
        color: active ? (m === "describe" ? "var(--ai-text)" : "var(--btn-ok-text)") : "var(--muted)",
        borderRadius: 999,
        fontSize: isMobileView ? 12 : 14,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        letterSpacing: 0,
        whiteSpace: "nowrap",
        opacity: unavailable ? 0.55 : 1
      }
    }, m === "describe" ? "\u2726 " + l : m === "saved" ? "\u2630 " + l : l);
  })), /*#__PURE__*/React.createElement("div", {
    "data-meal-time-control": mealTimeOpen ? "open" : "closed",
    style: {
      margin: "-4px 0 12px"
    }
  }, mealTimeOpen ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: "meal-registration-time",
    style: {
      color: "var(--muted)",
      fontSize: 12
    }
  }, uiText("Horário da refeição (opcional)", "Meal time (optional)", "Hora de la comida (opcional)")), /*#__PURE__*/React.createElement("input", {
    id: "meal-registration-time",
    type: "time",
    value: mealTimeValue,
    onChange: event => setSelectedMealTime(event.target.value),
    "aria-label": uiText("Horário da refeição", "Meal time", "Hora de la comida"),
    style: {
      ...inp,
      width: 112,
      marginTop: 0,
      padding: "5px 8px",
      fontSize: 13
    }
  })) : /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: openMealTimeControl,
    style: {
      background: "none",
      border: "none",
      color: "var(--muted)",
      padding: "2px 0",
      fontSize: 12,
      fontFamily: "inherit",
      cursor: "pointer"
    }
  }, "+ ", uiText("Informar horário", "Set meal time", "Indicar hora"))), addTemplatesOpen && /*#__PURE__*/React.createElement("div", {
    "data-add-saved-meals": "true",
    style: {
      marginTop: -4,
      marginBottom: 16,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "12px 14px"
    }
  }, mealTemplates.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      textAlign: "center",
      padding: "10px 0"
    }
  }, uiText("Nenhuma refeição salva ainda.", "No saved meals yet.", "Todavía no hay comidas guardadas.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    value: addTemplateSearch,
    onChange: e => setAddTemplateSearch(e.target.value),
    placeholder: uiText("Pesquisar refeição salva...", "Search saved meal...", "Buscar comida guardada..."),
    style: {
      ...inp,
      marginTop: 0,
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, mealTemplates.filter(tmpl => tmpl.name.toLowerCase().includes(addTemplateSearch.trim().toLowerCase())).length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center",
      padding: "10px 0"
    }
  }, uiText("Nenhuma refeição salva encontrada.", "No saved meals found.", "No se encontraron comidas guardadas.")) : mealTemplates.filter(tmpl => tmpl.name.toLowerCase().includes(addTemplateSearch.trim().toLowerCase())).map(tmpl => React.createElement(SavedMealCard, {
      key: tmpl.id,
      template: tmpl,
      context: "add",
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
    }))))), describeMode && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Refei\xE7\xE3o"), /*#__PURE__*/React.createElement("select", {
    value: describeMeal,
    onChange: e => setDescribeMeal(e.target.value),
    style: inp
  }, MEALS.map(m => /*#__PURE__*/React.createElement("option", {
    key: m,
    value: m
  }, mealLabel(m))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('describeDish')), /*#__PURE__*/React.createElement("textarea", {
    value: mealDescription,
    onChange: e => setMealDescription(e.target.value),
    placeholder: "Ex: Frango grelhado com arroz branco e feijão, porção normal de refeitório. Tinha salada de alface com tomate e um fio de azeite. Sobremesa: uma laranja.",
    style: {
      ...inp,
      height: 100,
      resize: "vertical",
      marginTop: 4,
      fontSize: 13
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--dim)",
      marginTop: 4
    }
  }, uiText(
    "Descreva o que comeu e, se souber, as quantidades aproximadas. Caso contrário, indique apenas o contexto (refeitório, restaurante, caseiro, etc.).",
    "Describe what you ate and approximate amounts. Otherwise describe the context (restaurant, homemade, cafeteria, etc.).",
    "Describe lo que comiste y, si puedes, las cantidades aproximadas. Si no, indica el contexto (restaurante, casero, comedor, etc.)."
  ))), /*#__PURE__*/React.createElement("button", {
    onClick: estimateMealDescription,
    disabled: describeLoading,
    style: {
      ...btn,
      ...aiButtonStyle,
      background: describeLoading ? "var(--btn-inactive)" : aiButtonStyle.background,
      color: describeLoading ? "var(--muted)" : aiButtonStyle.color
    }
  }, describeLoading ? text('estimating') : uiText("Estimar valores nutricionais", "Estimate nutritional values", "Estimar valores nutricionales")), describeResult && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--text3)"
    }
  }, describeResult.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: confidenceColor(describeResult.confidence),
      letterSpacing: 1
    }
  }, uiText("confiança ", "confidence ", "confianza "), describeResult.confidence)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "6px 20px",
      marginBottom: 10
    }
  }, [{
    l: text('protein'),
    v: describeResult.protein,
    u: "g",
    c: "#c8a96e"
  }, {
    l: text('calories'),
    v: describeResult.kcal,
    u: text('kcalUnit'),
    c: "#8ec8c8"
  }, {
    l: text('carbs'),
    v: describeResult.carbs,
    u: "g",
    c: "#a96ec8"
  }, {
    l: uiText('Gordura', 'Fat', 'Grasa'),
    v: describeResult.fat,
    u: "g",
    c: "#c86e8e"
  }, {
    l: text('fiber'),
    v: describeResult.fiber,
    u: "g",
    c: "#6ec8a9"
  }, {
    l: text('salt'),
    v: describeResult.salt,
    u: "g",
    c: "#888"
  }].filter(x => x.v != null).map(x => /*#__PURE__*/React.createElement("div", {
    key: x.l,
    style: {
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--muted)"
    }
  }, x.l, " "), /*#__PURE__*/React.createElement("span", {
    style: {
      color: x.c,
      fontWeight: 600
    }
  }, x.v, x.u)))), describeResult.note && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      fontStyle: "italic",
      marginBottom: 10,
      padding: "6px 10px",
      background: "var(--input)",
      borderRadius: 4
    }
  }, describeResult.note), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: addDescribedToLog,
    disabled: mealRegistrationSaving,
    style: {
      ...btn,
      marginTop: 0,
      background: "var(--btn-ok)",
      border: "1px solid var(--btn-ok-border)",
      color: "var(--btn-ok-text)",
      opacity: mealRegistrationSaving ? 0.65 : 1,
      cursor: mealRegistrationSaving ? "wait" : "pointer"
    }
  }, uiText('Registrar', 'Log meal', 'Registrar')), /*#__PURE__*/React.createElement("button", {
    onClick: evaluateDescribedMeal,
    "data-action-insight": "true",
    style: {
      ...btn,
      marginTop: 0,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "var(--btn-info-text)"
    }
  }, uiText('Avaliar refeição', 'Evaluate meal', 'Evaluar comida'))))), !describeMode && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Refei\xE7\xE3o"), /*#__PURE__*/React.createElement("select", {
    value: batchMode ? staged.meal : addEntry.meal,
    onChange: e => batchMode ? setStaged(s => ({
      ...s,
      meal: e.target.value
    })) : setAddEntry(a => ({
      ...a,
      meal: e.target.value
    })),
    style: inp
  }, MEALS.map(m => /*#__PURE__*/React.createElement("option", {
    key: m,
    value: m
  }, mealLabel(m))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, "Alimento"), /*#__PURE__*/React.createElement("input", {
    value: addEntry.foodSearch || "",
    onChange: e => setAddEntry(a => ({
      ...a,
      foodSearch: e.target.value,
      foodId: ""
    })),
    placeholder: text('searchFood'),
    style: inp
  }), addEntry.foodSearch && (() => {
    const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const results = sortedAllPantry.filter(f => norm(f.name).includes(norm(addEntry.foodSearch)));
    if (!results.length) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--dim)",
        padding: "8px 12px",
        background: "var(--input)",
        borderRadius: "0 0 6px 6px",
        marginTop: -3
      }
    }, "Nenhum resultado.");
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--input)",
        border: "1px solid var(--border2)",
        borderTop: "none",
        borderRadius: "0 0 6px 6px",
        marginTop: -3,
        maxHeight: 200,
        overflowY: "auto"
      }
    }, results.map(f => /*#__PURE__*/React.createElement("div", {
      key: f.id,
      onClick: () => setAddEntry(a => ({
        ...a,
        foodId: f.id,
        foodSearch: f.name
      })),
      style: {
        padding: "9px 12px",
        cursor: "pointer",
        borderBottom: "1px solid var(--border3)",
        fontSize: 14,
        color: addEntry.foodId === f.id ? "var(--btn-ok-text)" : "var(--text)",
        background: addEntry.foodId === f.id ? "var(--btn-ok)" : "transparent"
      }
    },
    /*#__PURE__*/React.createElement("span", {style:{fontSize:14,fontWeight:500,color:"var(--text)"}}, f.name),
    /*#__PURE__*/React.createElement("span", {style:{fontSize:12,color:proteinColor,marginLeft:8}},
      f.protein100, f.unit==="un" ? "g" : "g", " prot"
    ),
    /*#__PURE__*/React.createElement("span", {style:{fontSize:12,color:caloriesColor,marginLeft:6}},
      f.kcal100, f.unit==="un" ? " kcal/un" : " kcal/100"+f.unit
    ))));
  })(), !addEntry.foodSearch && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--muted)",
      marginTop: 5,
      lineHeight: 1.35
    }
  }, uiText("Comece a digitar para buscar nos alimentos salvos.", "Start typing to search your saved foods.", "Empieza a escribir para buscar en tus alimentos guardados.")), selectedFood && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, text('qty') + ' (' + selectedFood.unit + ')'), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: addEntry.qty,
    onChange: e => setAddEntry(a => ({
      ...a,
      qty: e.target.value
    })),
    placeholder: '250 ' + selectedFood.unit,
    style: inp
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 5,
      marginTop: 6
    }
  }, quickQtys(selectedFood.unit).map(q => /*#__PURE__*/React.createElement("button", {
    key: q,
    onClick: () => setAddEntry(a => ({
      ...a,
      qty: String(q)
    })),
    style: {
      background: addEntry.qty === String(q) ? "var(--btn-ok)" : "var(--btn-inactive)",
      border: `1px solid ${addEntry.qty === String(q) ? "#3a6a3a" : "#252525"}`,
      color: addEntry.qty === String(q) ? "#7ec87e" : "#555",
      borderRadius: 4,
      padding: "3px 10px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, q, selectedFood.unit)))), selectedFood && addEntry.qty && (() => {
    const q = parseFloat(addEntry.qty);
    if (isNaN(q)) return null;
    const preview = ALL_FIELDS.filter(f => selectedFood[f.key] != null).map(f => ({
      label: f.label,
      val: selectedFood[f.key] * q / divisor(selectedFood.unit),
      unit: f.unit,
      color: f.color || "#888"
    }));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--input)",
        borderRadius: 6,
        padding: "9px 12px",
        marginBottom: 10,
        display: "flex",
        flexWrap: "wrap",
        gap: "5px 16px"
      }
    }, preview.map(x => /*#__PURE__*/React.createElement("div", {
      key: x.label,
      style: {
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--muted)"
      }
    }, x.label, " "), /*#__PURE__*/React.createElement("span", {
      style: {
        color: x.color
      }
    }, x.val % 1 === 0 ? Math.round(x.val) : x.val.toFixed(1), x.unit))));
  })(), !batchMode ? /*#__PURE__*/React.createElement("button", {
    "data-tutorial": "add-log-button",
    onClick: addToLog,
    disabled: mealRegistrationSaving,
    style: {
      ...btn,
      opacity: mealRegistrationSaving ? 0.65 : 1,
      cursor: mealRegistrationSaving ? "wait" : "pointer"
    }
  }, text('logToDiary')) : /*#__PURE__*/React.createElement("button", {
    onClick: addToStaged,
    style: {
      ...btn,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "var(--btn-info-text)"
    }
  }, uiText('+ Adicionar à refeição', '+ Add to meal', '+ Agregar a la comida')), batchMode && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, staged.items.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center",
      marginTop: 8
    }
  }, uiText("Selecione alimentos e vá adicionando.", "Select foods and add them one by one.", "Selecciona alimentos y agrégalos uno por uno.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 8
    }
  }, "Na refei\xE7\xE3o \u2014 ", staged.meal), staged.items.map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    style: {
      padding: "6px 0",
      borderBottom: "1px solid var(--border3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "pantry-food-name",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--text2)",
      flex: 1
    }
  }, item.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, editStagedIdx === idx ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editStagedQty,
    onChange: e => setEditStagedQty(e.target.value),
    style: {
      ...inp,
      width: 70,
      marginTop: 0,
      padding: "3px 8px",
      fontSize: 12
    },
    autoFocus: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--muted)"
    }
  }, item.unit), /*#__PURE__*/React.createElement("button", {
    onClick: saveEditStaged,
    style: {
      background: "var(--btn-ok)",
      border: "1px solid var(--btn-ok-border)",
      color: "var(--btn-ok-text)",
      borderRadius: 4,
      padding: "2px 7px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, "\u2713"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditStagedIdx(null),
    style: {
      background: "none",
      border: "none",
      color: "var(--muted)",
      cursor: "pointer",
      fontSize: 13
    }
  }, "\u2715")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    onClick: () => {
      setEditStagedIdx(idx);
      setEditStagedQty(String(item.qty));
    },
    style: {
      fontSize: 14,
      color: "var(--muted)",
      cursor: "pointer",
      borderBottom: "1px dashed #333"
    }
  }, item.qty, item.unit), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "#c8a96e"
    }
  }, Math.round(item.protein ?? 0), "g"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "#8ec8c8"
    }
  }, Math.round(item.kcal ?? 0), "kcal"), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeFromStaged(idx),
    style: {
      background: "none",
      border: "none",
      color: "var(--dim)",
      cursor: "pointer",
      fontSize: 16
    }
  }, "\xD7")))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 16,
      padding: "7px 0",
      borderTop: "1px solid var(--border2)",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--muted)"
    }
  }, "Total:"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#c8a96e"
    }
  }, Math.round(stagedTot.protein), "g prot"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#8ec8c8"
    }
  }, Math.round(stagedTot.kcal), " kcal"), stagedTot.carbs > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#a96ec8"
    }
  }, Math.round(stagedTot.carbs), "g carbs")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 8,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: commitStaged,
    disabled: mealRegistrationSaving,
    style: {
      ...btn,
      marginTop: 0,
      background: "var(--btn-ok)",
      border: "1px solid var(--btn-ok-border)",
      color: "var(--btn-ok-text)",
      opacity: mealRegistrationSaving ? 0.65 : 1,
      cursor: mealRegistrationSaving ? "wait" : "pointer"
    }
  }, uiText("Registrar", "Log meal", "Registrar")), /*#__PURE__*/React.createElement("button", {
    onClick: evaluateStagedMeal,
    "data-action-insight": "true",
    style: {
      ...btn,
      marginTop: 0,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "var(--btn-info-text)"
    }
  }, uiText("Avaliar refeição", "Evaluate meal", "Evaluar comida"))),
  /*#__PURE__*/React.createElement("button", {
    onClick: openSaveTemplateModal,
    disabled: !staged.items.length,
    style: {
      ...btn,
      marginTop: 6,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "var(--btn-info-text)",
      opacity: staged.items.length ? 1 : 0.4
    }
  }, uiText("\uD83D\uDCBE Salvar como refeição", "\uD83D\uDCBE Save as meal template", "\uD83D\uDCBE Guardar como comida")), pantry.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      color: "var(--faint)",
      fontSize: 14,
      textAlign: "center",
      fontStyle: "italic"
    }
  }, text('pantryEmpty'))), /*#__PURE__*/legacyTransferPanel))));
      }

      if (section === "header") return renderHeader();
      if (section === "recent") return renderRecentMeals();
      if (section === "content") return renderContent();
      return null;
    }

    return { AddScreen };
  }

  return { createAddScreen };
});
