/**
 * Presentational Metrics screen for profile targets, measurements, charts,
 * body composition, progress, and the disconnected advanced-reports card.
 *
 * The UMD factory receives React, i18n/date presentation helpers, and the
 * previously extracted chart components. All persistence, model calculations,
 * form state, notifications, and mutations remain owned by NutritionTracker
 * and are supplied as values or callbacks.
 *
 * KNOWN DEAD UI: the advanced-reports card only invokes an injected callback.
 * The controller still sets report state, but no report modal is rendered.
 * This disconnection is intentionally preserved and must not be interpreted as
 * a working report flow.
 *
 * Existing model semantics remain unchanged: record-count windows, zero as
 * absence, lexical dates, local-noon/DST calculations, viewDate goal coupling,
 * and the unconnected health-guardrail codes are outside this module.
 *
 * @module MetricsScreen
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MetricsScreenModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the Metrics screen with explicit presentation dependencies.
   *
   * @param {Object} dependencies Injected dependencies.
   * @param {Object} dependencies.React React runtime supplied by the host.
   * @param {function(string,string,string,string): string} dependencies.pickLang Language picker from i18n.js.
   * @param {function(string): string} dependencies.formatDateDMY Date formatter from date-utils.js.
   * @param {function(Object): Object} dependencies.BodyMetricChart Optional metric chart component.
   * @param {function(Object): Object} dependencies.WeightTrendChart Weight chart component.
   * @param {function(Object): Object} dependencies.BmrTrendChart BMR chart component.
   * @param {function(Object): Object} dependencies.BodyFatTrendChart Body-fat chart component.
   * @param {function(Object): Object} dependencies.ChoiceField Reusable Trofia list selector.
   * @returns {{MetricsScreen: function(Object): Object}} Metrics screen API.
   */
  function createMetricsScreen({
    React,
    pickLang,
    formatDateDMY,
    BodyMetricChart,
    WeightTrendChart,
    BmrTrendChart,
    BodyFatTrendChart,
    ChoiceField
  }) {
    if (!React || typeof React.createElement !== "function"
      || typeof pickLang !== "function" || typeof formatDateDMY !== "function"
      || typeof BodyMetricChart !== "function" || typeof WeightTrendChart !== "function"
      || typeof BmrTrendChart !== "function" || typeof BodyFatTrendChart !== "function"
      || typeof ChoiceField !== "function") {
      throw new TypeError("MetricsScreen requires React, ChoiceField, i18n/date helpers, and body-metrics chart components");
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
     * Renders the Metrics tab from controller-owned data and callbacks.
     *
     * @param {Object} props Complete Metrics presentation snapshot.
     * @param {string} props.lang Active language.
     * @param {boolean} props.isMobileView Whether mobile layout is active.
     * @param {string} props.metricsSection Active tracking/goals subsection.
     * @param {function(string): string} props.text Existing translation getter.
     * @param {Object} props.nutritionPrefs Persisted nutrition-preference snapshot.
     * @param {Object} props.profileData Persisted profile snapshot.
     * @param {Object} props.bodyMetrics Calculated body-metrics model.
     * @param {Object} props.bodyComposition Calculated body-composition snapshot.
     * @param {Array<Object>} props.weightHistory Raw measurement history.
     * @param {Array<Object>} props.normalizedWeightEntries Normalized history.
     * @param {Object} props.weeklyProgress Calculated weekly progress.
     * @param {Object} props.weightTrend Calculated weight trend.
     * @param {boolean} props.reportsEnabled Existing external-report flag.
     * @param {function(): void} props.onOpenAdvancedReports Inert report-state callback.
     * @returns {Object} React element for the Metrics screen.
     */
    function MetricsScreen({
      lang,
      isMobileView,
      metricsSection,
      setMetricsSection,
      text,
      activityLevels,
      nutritionPrefs,
      saveNutritionPrefs,
      profileData,
      saveProfileHeight,
      currentHeight,
      bodyComposition,
      updateBodyFatGoalTarget,
      bodyFatGoalAutoKg,
      baseGoals,
      calorieBase,
      calorieAdjustment,
      goals,
      automaticGoalAdjustment,
      automaticProteinMultiplier,
      editingGoals,
      saveGoals,
      startEditGoals,
      goalDraft,
      setGoalDraft,
      customGoals,
      calorieAdjustmentWarning,
      weightForm,
      setWeightForm,
      currentWeight,
      today: TODAY,
      saveWeight,
      bmi,
      bmiNum,
      currentBmr,
      currentTrainingGoals,
      currentRestGoals,
      weightChartData,
      bmrChartData,
      bodyMetricChartConfigs,
      chartTheme: CT,
      bodyMetrics,
      normalizedWeightEntries,
      editingWeightId,
      editWeightForm,
      setEditWeightForm,
      expandedWeightHistoryIds,
      setExpandedWeightHistoryIds,
      historyFieldAvailability,
      saveWeightEdit,
      startEditWeight,
      setWeightHistory,
      weightHistory,
      bodyCompositionOpen,
      setBodyCompositionOpen,
      bodyGoalForm,
      setBodyGoalForm,
      suggestedBodyGoalWeeks,
      saveBodyFatGoal,
      weeklyProgress,
      weightTrend,
      metricsProgressOpen,
      setMetricsProgressOpen,
      metricsProgressInfoOpen,
      setMetricsProgressInfoOpen,
      reportsEnabled,
      onOpenAdvancedReports
    }) {
      const uiText = (pt, en, es) => pickLang(lang, pt, en, es);
      const activityOptions = Object.entries(activityLevels).map(([key, data]) => ({
        value: key,
        label: uiText(data.pt, data.en, data.es),
        description: uiText(data.descPt, data.descEn, data.descEs)
      }));
      const goalOptions = [
        {
          value: "maintenance",
          label: uiText("Manutenção", "Maintenance", "Mantenimiento"),
          description: uiText(
            "Manter o peso e a composição atuais",
            "Maintain your current weight and body composition",
            "Mantener el peso y la composición actuales"
          )
        },
        {
          value: "loss",
          label: uiText("Perda de peso", "Weight loss", "Pérdida de peso"),
          description: uiText(
            "Reduzir o peso de forma gradual",
            "Reduce weight gradually",
            "Reducir el peso de forma gradual"
          )
        },
        {
          value: "gain",
          label: uiText("Ganho de peso", "Weight gain", "Ganancia de peso"),
          description: uiText(
            "Aumentar o peso de forma gradual",
            "Increase weight gradually",
            "Aumentar el peso de forma gradual"
          )
        }
      ];
      const choicePlaceholder = uiText("Selecionar", "Select", "Seleccionar");
      const choiceCloseLabel = uiText("Fechar", "Close", "Cerrar");
  function renderReportsCard() {
    const reportsUnavailable = !reportsEnabled;
    return /*#__PURE__*/React.createElement("div", {
      "data-tutorial": "advanced-reports",
      style: {
        display: metricsSection === "tracking" ? "flex" : "none",
        marginTop: 16,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "14px 16px",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        letterSpacing: 1,
        color: "var(--muted)",
        textTransform: "uppercase",
        marginBottom: 6
      }
    }, uiText("Relatórios avançados", "Advanced reports", "Informes avanzados")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--dim)",
        lineHeight: 1.45
      }
    }, reportsUnavailable ? uiText("Recurso em manutenção. Os relatórios avançados voltarão quando um servidor seguro estiver configurado.", "Feature under maintenance. Advanced reports will return when a secure server is configured.", "Recurso en mantenimiento. Los informes avanzados volverán cuando haya un servidor seguro configurado.") : uiText("Gere relatórios em HTML ou PDF com gráficos e análise do período.", "Generate HTML or PDF reports with charts and period analysis.", "Genera informes en HTML o PDF con gráficos y análisis del período."))), /*#__PURE__*/React.createElement("button", {
      disabled: reportsUnavailable,
      onClick: onOpenAdvancedReports,
      style: {
        ...sBtn("var(--btn-info)", "var(--btn-info-border)", "var(--btn-info-text)"),
        opacity: reportsUnavailable ? 0.55 : 1,
        cursor: reportsUnavailable ? "not-allowed" : "pointer"
      }
    }, reportsUnavailable ? uiText("Em manutenção", "Under maintenance", "En mantenimiento") : uiText("Gerar relatório", "Generate report", "Generar informe")));
  }
      return /*#__PURE__*/React.createElement("div", {
    "data-screen": "metricas",
    style: {
      padding: isMobileView ? "0 0 calc(76px + var(--app-safe-bottom))" : "2px 16px 30px",
      boxSizing: "border-box",
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      margin: isMobileView ? "6px 0 12px" : "8px 0 16px"
    }
  }, [["tracking", pickLang(lang, "Acompanhamento", "Tracking", "Seguimiento")], ["goals", pickLang(lang, "Metas", "Goals", "Metas")]].map(([key, label]) => /*#__PURE__*/React.createElement("button", {
    key,
    onClick: () => setMetricsSection(key),
    style: {
      ...sBtn(metricsSection === key ? "var(--btn-ok)" : "transparent", metricsSection === key ? "var(--btn-ok-border)" : "var(--border2)", metricsSection === key ? "var(--btn-ok-text)" : "var(--muted)"),
      padding: "10px",
      fontWeight: metricsSection === key ? 700 : 500
    }
  }, label))), metricsSection === "goals" && /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "nutrition-profile",
    style: {
      margin: "4px 0 18px",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: isMobileView ? 12 : 8,
      padding: isMobileView ? "12px" : "14px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 6
    }
  }, pickLang(lang, "Perfil nutricional", "Nutrition profile", "Perfil nutricional")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--dim)",
      lineHeight: 1.45,
      marginBottom: 12
    }
  }, pickLang(lang, "Configure atividade, objetivo, meta de gordura, ajuste calórico e metas personalizadas usadas pelo app.", "Configure the activity, goal, body-fat target, calorie adjustment, and custom targets used by the app.", "Configura actividad, objetivo, meta de grasa corporal, ajuste calórico y metas personalizadas usadas por la app.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "repeat(3, minmax(180px, 1fr))",
      gap: 10,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(ChoiceField, {
    id: "metrics-activity",
    label: pickLang(lang, "Atividade física", "Physical activity", "Actividad física"),
    value: nutritionPrefs.activityLevel || "",
    onChange: activityLevel => saveNutritionPrefs({...nutritionPrefs, activityLevel}),
    placeholder: choicePlaceholder,
    closeLabel: choiceCloseLabel,
    options: activityOptions
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(ChoiceField, {
    id: "metrics-goal",
    label: pickLang(lang, "Objetivo", "Goal", "Objetivo"),
    value: nutritionPrefs.goalType || "",
    onChange: goalType => saveNutritionPrefs({...nutritionPrefs, goalType}),
    placeholder: choicePlaceholder,
    closeLabel: choiceCloseLabel,
    options: goalOptions
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Altura do perfil (cm)", "Profile height (cm)", "Altura del perfil (cm)")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "80",
    max: "240",
    step: "0.1",
    value: profileData.height || "",
    onChange: e => saveProfileHeight(e.target.value),
    placeholder: currentHeight ? String(currentHeight) : text('heightPh'),
    style: inp
  })), nutritionPrefs.goalType === "loss" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Meta de gordura corporal %", "Target body fat %", "Meta de grasa corporal %")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "3",
    max: "60",
    step: "0.1",
    value: nutritionPrefs.bodyFatGoal || "",
    onChange: e => updateBodyFatGoalTarget(e.target.value),
    placeholder: bodyComposition.currentFatPct ? pickLang(lang, "abaixo de ", "below ", "por debajo de ") + (Math.round(bodyComposition.currentFatPct * 10) / 10) : pickLang(lang, "ex: 13", "e.g. 13", "ej: 13"),
    style: inp
  }), bodyFatGoalAutoKg && /*#__PURE__*/React.createElement("div", {
    style: { marginTop: 4, color: "var(--muted)", fontSize: 12 }
  }, pickLang(lang, "Estimativa auto: " + bodyFatGoalAutoKg + " kg a perder.", "Auto estimate: " + bodyFatGoalAutoKg + " kg to lose.", "Estimación automática: " + bodyFatGoalAutoKg + " kg por perder."))), (nutritionPrefs.goalType === "loss" || nutritionPrefs.goalType === "gain") && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, nutritionPrefs.goalType === "loss" ? pickLang(lang, "Kg a perder", "Kg to lose", "Kg por perder") : pickLang(lang, "Kg a ganhar", "Kg to gain", "Kg por ganar")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0.1",
    step: "0.1",
    value: nutritionPrefs.goalKg || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, goalKg: e.target.value}),
    placeholder: nutritionPrefs.goalType === "loss" && bodyFatGoalAutoKg ? "auto: " + bodyFatGoalAutoKg : "",
    style: inp
  })), (nutritionPrefs.goalType === "loss" || nutritionPrefs.goalType === "gain") && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Semanas", "Weeks", "Semanas")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    step: "1",
    value: nutritionPrefs.goalWeeks || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, goalWeeks: e.target.value}),
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Ajuste manual kcal/dia", "Manual adjustment kcal/day", "Ajuste manual kcal/día")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: nutritionPrefs.manualAdjustment || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, manualAdjustment: e.target.value}),
    placeholder: "auto: " + automaticGoalAdjustment,
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Proteína g/kg", "Protein g/kg", "Proteína g/kg")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0.8",
    step: "0.1",
    value: nutritionPrefs.proteinMultiplier || "",
    onChange: e => saveNutritionPrefs({...nutritionPrefs, proteinMultiplier: e.target.value}),
    placeholder: "auto: " + automaticProteinMultiplier,
    style: inp
  }))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "metrics-target-summary",
    style: {
      marginTop: 12,
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "repeat(5, minmax(140px, 1fr))",
      gap: 8
    }
  }, [{
    l: pickLang(lang, "TMB", "BMR", "TMB"),
    v: (baseGoals.bmr || "-") + " kcal",
    c: "#c8a96e"
  }, {
    l: pickLang(lang, "Base do dia", "Day base", "Base del día"),
    v: (calorieBase || "-") + " kcal",
    c: "#8ec8c8"
  }, {
    l: pickLang(lang, "Ajuste", "Adjustment", "Ajuste"),
    v: (calorieAdjustment > 0 ? "+" : "") + calorieAdjustment + " kcal",
    c: calorieAdjustment < 0 ? "#c86e8e" : "#6ec8a9"
  }, {
    l: pickLang(lang, "Meta final", "Final target", "Meta final"),
    v: goals.kcal + " kcal",
    c: "#8ec8c8"
  }, {
    l: pickLang(lang, "Proteína", "Protein", "Proteína"),
    v: goals.protein + "g",
    c: "#c8a96e"
  }].map(card => /*#__PURE__*/React.createElement("div", {
    key: card.l,
    style: {
      border: "1px solid var(--border3)",
      borderRadius: 8,
      background: "var(--bg)",
      padding: "10px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 11, letterSpacing: 1, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }
  }, card.l), /*#__PURE__*/React.createElement("div", {
    style: { color: card.c, fontSize: 16, fontWeight: 650 }
  }, card.v)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      borderTop: "1px solid var(--border3)",
      paddingTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 14, letterSpacing: 1, color: "var(--muted)", textTransform: "uppercase" }
  }, text('customGoals')), /*#__PURE__*/React.createElement("button", {
    onClick: editingGoals ? saveGoals : startEditGoals,
    style: sBtn("var(--btn-ok)", "var(--btn-ok-border)", "var(--btn-ok-text)")
  }, editingGoals ? pickLang(lang, "Salvar", "Save", "Guardar") : text('editGoals'))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr 1fr" : "repeat(7, minmax(90px, 1fr))",
      gap: 8
    }
  }, [{
    k: "protein",
    l: text('protein'),
    u: "g",
    c: "#c8a96e"
  }, {
    k: "kcal",
    l: text('calories'),
    u: text('kcalUnit'),
    c: "#8ec8c8"
  }, {
    k: "carbs",
    l: text('carbs'),
    u: "g",
    c: "#a96ec8"
  }, {
    k: "fat",
    l: text('fat'),
    u: "g",
    c: "#c86e8e"
  }, {
    k: "fiber",
    l: text('fiber'),
    u: "g",
    c: "#6ec8a9"
  }, {
    k: "salt",
    l: text('salt'),
    u: "g",
    c: "#888"
  }, {
    k: "water",
    l: text('water'),
    u: "ml",
    c: "#6ec8a9"
  }].map(item => editingGoals ? /*#__PURE__*/React.createElement("div", {
    key: item.k
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, item.l, " (", item.u, ")"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: goalDraft[item.k] || "",
    onChange: e => setGoalDraft(d => ({...d, [item.k]: e.target.value})),
    placeholder: "auto: " + (baseGoals[item.k] || ""),
    style: inp
  })) : /*#__PURE__*/React.createElement("div", {
    key: item.k,
    style: {
      border: "1px solid var(--border3)",
      borderRadius: 8,
      background: "var(--bg)",
      padding: "9px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }
  }, item.l), /*#__PURE__*/React.createElement("div", {
    style: { color: customGoals[item.k] ? "#c8a96e" : item.c, fontSize: 15, marginTop: 4 }
  }, goals[item.k] || baseGoals[item.k] || "-", item.u))))), calorieAdjustmentWarning && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: "8px 10px",
      border: "1px solid var(--notif-err-border)",
      background: "var(--notif-err-bg)",
      color: "var(--notif-err-text)",
      borderRadius: 6,
      fontSize: 12
    }
  }, calorieAdjustmentWarning)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: metricsSection === "tracking" ? "block" : "none",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 10
    }
  }, text('logMeasurements')), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "metrics-measures",
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
  }, pickLang(lang, "Peso (kg)", "Weight (kg)", "Peso (kg)")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: weightForm.weight,
    onChange: e => setWeightForm(f => ({
      ...f,
      weight: e.target.value
    })),
    placeholder: currentWeight ? String(currentWeight) : text('weightPh'),
    style: inp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "none"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Altura (cm)", "Height (cm)", "Altura (cm)")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: weightForm.height,
    onChange: e => setWeightForm(f => ({
      ...f,
      height: e.target.value
    })),
    placeholder: currentHeight ? String(currentHeight) : text('heightPh'),
    style: inp
  }))), /*#__PURE__*/React.createElement("div", {style:{marginTop:8}}, /*#__PURE__*/React.createElement("label", {style:lbl}, pickLang(lang, "Data", "Date", "Fecha")), /*#__PURE__*/React.createElement("input", {
    type: "date",
    max: TODAY,
    value: weightForm.date || TODAY,
    onChange: e => setWeightForm(f => ({...f, date: e.target.value})),
    style: {...inp, colorScheme:"dark"}
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      padding: "10px 12px",
      border: "1px solid var(--border3)",
      borderRadius: 8,
      background: "var(--surface)",
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "repeat(3, 1fr)",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: isMobileView ? "auto" : "1 / -1",
      color: "var(--muted)",
      fontSize: 12,
      lineHeight: 1.4
    }
  }, pickLang(lang, "Medidas opcionais de composição corporal para gráficos de tendência e estimativas.", "Optional body-composition measurements for trend charts and estimates.", "Medidas opcionales de composición corporal para gráficos de tendencia y estimaciones.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Gordura corporal %", "Body fat %", "Grasa corporal %")), /*#__PURE__*/React.createElement("input", {
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
  }, pickLang(lang, "Cintura (cm)", "Waist (cm)", "Cintura (cm)")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "30",
    step: "0.1",
    value: weightForm.waistCm,
    onChange: e => setWeightForm(f => ({...f, waistCm: e.target.value})),
    placeholder: bodyComposition.latest?.waistCm ? String(bodyComposition.latest.waistCm) : "",
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, pickLang(lang, "Massa muscular (kg)", "Muscle mass (kg)", "Masa muscular (kg)")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    step: "0.1",
    value: weightForm.muscleMassKg,
    onChange: e => setWeightForm(f => ({...f, muscleMassKg: e.target.value})),
    placeholder: bodyComposition.latest?.muscleMassKg ? String(bodyComposition.latest.muscleMassKg) : "",
    style: inp
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: saveWeight,
    style: btn
  }, text('suppLogToday'))), currentWeight && /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "metrics-current",
    style: {
      display: metricsSection === "tracking" ? "block" : "none",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: isMobileView ? 12 : 8,
      padding: isMobileView ? "12px" : "14px 16px",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 12
    }
  }, uiText("Métricas atuais", "Current metrics", "Métricas actuales")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
      gap: 10
    }
  }, [{
    l: text('weight'),
    v: `${currentWeight} kg`,
    c: "#c8a96e"
  }, {
    l: text('heightLabel'),
    hide: true,
    v: currentHeight ? `${currentHeight} cm` : "—",
    c: "#8ec8c8"
  }, {
    l: "IMC",
    v: bmi || "—",
    sub: bmiNum < 18.5 ? text('bmiUnderweight') : bmiNum < 25 ? text('bmiNormal') : bmiNum < 30 ? text('bmiOverweight') : text('bmiObese'),
    c: bmiNum < 18.5 ? "#c86e8e" : bmiNum < 25 ? "#6ec8a9" : bmiNum < 30 ? "#c8a96e" : "#c86e8e"
  }, {
    l: "TMB",
    v: currentBmr ? `${currentBmr} kcal` : "—",
    c: "#8ec8c8"
  }, {
    l: text('goalProtTrain'),
    hide: true,
    v: `${currentTrainingGoals.protein}g`,
    c: "#c8a96e"
  }, {
    l: text('goalProtRest'),
    hide: true,
    v: `${currentRestGoals.protein}g`,
    c: "#a9c8a9"
  }, {
    l: text('goalKcalTrain'),
    hide: true,
    v: String(currentTrainingGoals.kcal),
    c: "#8ec8c8"
  }, {
    l: text('goalKcalRest'),
    hide: true,
    v: String(currentRestGoals.kcal),
    c: "#8ec8a9"
  }].filter(x => !x.hide && x.v !== "—").map(x => /*#__PURE__*/React.createElement("div", {
    key: x.l,
    style: {background: "var(--bg)", border: "1px solid var(--border3)", borderRadius: 8, padding: "10px 12px"}
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      letterSpacing: 1
    }
  }, x.l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: x.c,
      marginTop: 2
    }
  }, x.v), x.sub && /*#__PURE__*/React.createElement("div", {
    style: {fontSize: 12, color: "var(--text-secondary)", marginTop: 4}
  }, x.sub))))), /*#__PURE__*/React.createElement(WeightTrendChart, {
    data: weightChartData,
    title: uiText("Evolu\u00e7\u00e3o do peso", "Weight trend", "Evoluci\u00f3n del peso"),
    visible: metricsSection === "tracking",
    isMobileView,
    chartTheme: CT
  }), /*#__PURE__*/React.createElement(BmrTrendChart, {
    data: bmrChartData,
    title: uiText("Evolu\u00e7\u00e3o da TMB", "BMR trend", "Evoluci\u00f3n de la TMB"),
    visible: metricsSection === "tracking",
    isMobileView,
    chartTheme: CT
  }), bodyMetricChartConfigs.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: metricsSection === "tracking" ? "grid" : "none",
      gridTemplateColumns: isMobileView ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))",
      gap: 12,
      marginBottom: 14
    }
  }, bodyMetricChartConfigs.map(config => /*#__PURE__*/React.createElement(BodyMetricChart, {
    key: config.key,
    config,
    isMobileView,
    chartTheme: CT,
    targetLabel: uiText("Meta ", "Target ", "Meta ")
  }))), bodyMetrics.hasWeightHistory && /*#__PURE__*/React.createElement("div", {
    style: {
      display: metricsSection === "tracking" ? "block" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--dim)",
      textTransform: "uppercase",
      marginBottom: 8
    }
  }, uiText("Histórico", "History", "Historial")), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: "auto",
      maxHeight: 285,
      borderTop: "1px solid var(--border3)",
      borderBottom: "1px solid var(--border3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "none",
      gridTemplateColumns: isMobileView ? "92px 82px 72px 84px 86px 96px 84px 104px" : "1fr 1fr 1fr 1fr 1fr 1fr 1fr 120px",
      gap: 10,
      minWidth: isMobileView ? 740 : 0,
      alignItems: "center",
      padding: "8px 6px",
      fontSize: 11,
      letterSpacing: 1,
      color: "var(--dim)",
      textTransform: "uppercase",
      borderBottom: "1px solid var(--border3)",
      position: "sticky",
      top: 0,
      background: "var(--bg)",
      zIndex: 1
    }
  }, [uiText("Data", "Date", "Fecha"), uiText("Peso", "Weight", "Peso"), text('bmi'), uiText("Gordura", "Fat", "Grasa"), uiText("Músculo", "Muscle", "Músculo"), uiText("Cintura", "Waist", "Cintura"), uiText("Proteína", "Protein", "Proteína"), ""].map(label => /*#__PURE__*/React.createElement("span", {
    key: label || "actions"
  }, label))), [...normalizedWeightEntries].reverse().map(e => {
    const bE = e.height ? (e.weight / (e.height / 100) ** 2).toFixed(1) : null;
    const isEd = editingWeightId === e.date;
    return /*#__PURE__*/React.createElement("div", {
      key: e.date,
      "data-history-card": "true",
      style: {
        borderBottom: "none",
        padding: "0",
        marginBottom: 8
      }
    }, isEd ? /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "10px 0"
      }
    }, /*#__PURE__*/React.createElement("div", {
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
    }, uiText("Data", "Date", "Fecha")), /*#__PURE__*/React.createElement("input", {
      type: "date",
      max: TODAY,
      value: editWeightForm.date,
      onChange: ev => setEditWeightForm(f => ({
        ...f,
        date: ev.target.value
      })),
      style: {
        ...inp,
        colorScheme: "dark"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("label", {
      style: lbl
    }, uiText("Peso (kg)", "Weight (kg)", "Peso (kg)")), /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: editWeightForm.weight,
      onChange: ev => setEditWeightForm(f => ({
        ...f,
        weight: ev.target.value
      })),
      style: inp
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("label", {
      style: lbl
    }, uiText("Altura (cm)", "Height (cm)", "Altura (cm)")), /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: editWeightForm.height,
      onChange: ev => setEditWeightForm(f => ({
        ...f,
        height: ev.target.value
      })),
      style: inp
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: isMobileView ? "1fr" : "repeat(3, 1fr)",
        gap: 8,
        marginBottom: 8
      }
    }, [["bodyFatPct", uiText("Gordura %", "Body fat %", "Grasa %")], ["waistCm", uiText("Cintura (cm)", "Waist (cm)", "Cintura (cm)")], ["muscleMassKg", uiText("Massa muscular (kg)", "Muscle mass (kg)", "Masa muscular (kg)")]].map(([key, label]) => /*#__PURE__*/React.createElement("div", {
      key
    }, /*#__PURE__*/React.createElement("label", {
      style: lbl
    }, label), /*#__PURE__*/React.createElement("input", {
      type: "number",
      step: "0.1",
      value: editWeightForm[key] || "",
      onChange: ev => setEditWeightForm(f => ({
        ...f,
        [key]: ev.target.value
      })),
      style: inp
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: saveWeightEdit,
      style: {
        ...btn,
        flex: 1,
        marginTop: 0,
        padding: "8px"
      }
    }, uiText("Salvar", "Save", "Guardar")), /*#__PURE__*/React.createElement("button", {
      onClick: () => setEditingWeightId(null),
      style: {
        flex: 1,
        background: "none",
        border: "1px solid var(--border2)",
        color: "var(--muted)",
        padding: "8px",
        borderRadius: 6,
        fontSize: 14,
        textTransform: "uppercase",
        cursor: "pointer"
      }
    }, uiText("Cancelar", "Cancel", "Cancelar")))) : /*#__PURE__*/React.createElement("div", {
      "data-history-entry": "true",
      "aria-expanded": !!expandedWeightHistoryIds[e.date]
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-history-row": "true",
      onClick: () => setExpandedWeightHistoryIds(current => ({...current, [e.date]: !current[e.date]})),
      "aria-expanded": !!expandedWeightHistoryIds[e.date],
      style: {
        width: "100%",
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: "10px 12px",
        background: "transparent",
        border: "none",
        color: "var(--text-primary)",
        cursor: "pointer",
        textAlign: "left"
      }
    }, /*#__PURE__*/React.createElement("span", null, formatDateDMY(e.date)), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: { color: "var(--text-muted)" }
    }, "—"), /*#__PURE__*/React.createElement("strong", {
      style: { fontWeight: 600 }
    }, e.weight, " kg"), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: { marginLeft: "auto", color: "var(--text-muted)" }
    }, expandedWeightHistoryIds[e.date] ? "▲" : "▼")), /*#__PURE__*/React.createElement("div", {
      "data-history-details": "true",
      style: {
        maxHeight: expandedWeightHistoryIds[e.date] ? 180 : 0,
        opacity: expandedWeightHistoryIds[e.date] ? 1 : 0,
        overflow: "hidden",
        transition: "max-height var(--dur-base) var(--ease-spring), opacity var(--dur-fast) var(--ease-spring)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 16px",
        padding: "4px 12px 12px",
        color: "var(--text-secondary)",
        fontSize: 12
      }
    }, historyFieldAvailability.bmi && bE && /*#__PURE__*/React.createElement("span", null, "IMC: ", bE), historyFieldAvailability.bodyFatPct && e.bodyFatPct && /*#__PURE__*/React.createElement("span", null, uiText("Gordura: ", "Fat: ", "Grasa: "), e.bodyFatPct, "%"), historyFieldAvailability.muscleMassKg && e.muscleMassKg && /*#__PURE__*/React.createElement("span", null, uiText("Músculo: ", "Muscle: ", "Músculo: "), e.muscleMassKg, " kg"), historyFieldAvailability.waistCm && e.waistCm && /*#__PURE__*/React.createElement("span", null, uiText("Cintura: ", "Waist: ", "Cintura: "), e.waistCm, " cm"), /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", gap: 6, flexBasis: "100%", marginTop: 2 }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => startEditWeight(e),
      style: { background: "transparent", border: "1px solid var(--text-muted)", color: "var(--text-secondary)", padding: "5px 10px", cursor: "pointer" }
    }, text('editItem')), /*#__PURE__*/React.createElement("button", {
      onClick: () => setWeightHistory(h => h.filter(x => x.date !== e.date)),
      "aria-label": uiText("Excluir registro", "Delete entry", "Eliminar registro"),
      style: { background: "transparent", border: "none", color: "var(--text-muted)", padding: "5px 10px", cursor: "pointer" }
    }, "\xD7"))))));
  }))), weightHistory.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center",
      marginTop: 20
    }
  }, text('noWeightData')), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "body-composition",
    style: {
      display: metricsSection === "tracking" ? "block" : "none",
      marginTop: 20,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: isMobileView ? 12 : 8,
      padding: isMobileView ? "12px" : "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setBodyCompositionOpen(v => !v),
    style: {
      width: "100%",
      background: "none",
      border: "none",
      padding: 0,
      cursor: "pointer",
      fontFamily: "inherit",
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 14, letterSpacing: 1, color: "var(--muted)", textTransform: "uppercase" }
  }, bodyCompositionOpen ? "▼ " : "▶ ", uiText("Composição corporal", "Body composition", "Composición corporal")), /*#__PURE__*/React.createElement("div", {
    style: { marginTop: 4, fontSize: 12, color: "var(--dim)", lineHeight: 1.35 }
  }, uiText("Medidas opcionais para acompanhar gordura corporal e cintura.", "Optional measurements for body-fat and waist trends.", "Medidas opcionales para seguir la grasa corporal y la cintura."))), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 12, color: "var(--muted)", flexShrink: 0 }
  }, bodyComposition.measured.length, uiText(" registros", " records", " registros")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))",
      gap: 8
    }
  }, [{
    l: uiText("Gordura corporal", "Body fat", "Grasa corporal"),
    v: bodyComposition.currentFatPct ? (Math.round(bodyComposition.currentFatPct * 10) / 10) + "%" : "—",
    c: "#c86e8e"
  }, {
    l: uiText("Gordura em kg", "Fat mass", "Grasa en kg"),
    v: bodyComposition.fatKg ? (Math.round(bodyComposition.fatKg * 10) / 10) + " kg" : "—",
    c: "#c8a96e"
  }, {
    l: uiText("Massa livre", "Lean mass", "Masa libre"),
    v: bodyComposition.leanMassKg ? (Math.round(bodyComposition.leanMassKg * 10) / 10) + " kg" : "—",
    c: "#6ec8a9"
  }, {
    l: uiText("Peso alvo estimado", "Target weight", "Peso objetivo estimado"),
    v: bodyComposition.weightTarget ? (Math.round(bodyComposition.weightTarget * 10) / 10) + " kg" : "—",
    c: "#8ec8c8"
  }].filter(card => card.v !== "—").map(card => /*#__PURE__*/React.createElement("div", {
    "data-body-composition-card": "true",
    key: card.l,
    style: {
      border: "1px solid var(--border3)",
      borderRadius: 8,
      padding: "10px 12px",
      background: "var(--bg)",
      minHeight: 58
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 11, letterSpacing: 1, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }
  }, card.l), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 17, color: card.c, fontWeight: 600 }
  }, card.v)))), bodyCompositionOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      borderTop: "1px solid var(--border3)",
      paddingTop: 12,
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: 14,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "none",
      gap: 8,
      background: "var(--bg)",
      border: "1px solid var(--border3)",
      borderRadius: 8,
      padding: "12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 13, fontWeight: 700, color: "var(--text2)" }
  }, uiText("Meta por gordura corporal", "Body-fat goal", "Meta por grasa corporal")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Gordura corporal atual %", "Current body fat %", "Grasa corporal actual %")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "3",
    max: "60",
    step: "0.1",
    value: bodyGoalForm.currentFatPct,
    onChange: e => setBodyGoalForm(f => ({...f, currentFatPct: e.target.value})),
    placeholder: bodyComposition.currentFatPct ? String(Math.round(bodyComposition.currentFatPct * 10) / 10) : uiText("ex: 15,2", "e.g. 15.2", "ej: 15,2"),
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Meta de gordura corporal %", "Target body fat %", "Meta de grasa corporal %")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "3",
    max: "60",
    step: "0.1",
    value: bodyGoalForm.targetFatPct,
    onChange: e => setBodyGoalForm(f => ({...f, targetFatPct: e.target.value})),
    placeholder: nutritionPrefs.bodyFatGoal || uiText("ex: 13", "e.g. 13", "ej: 13"),
    style: inp
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Semanas até a meta", "Weeks to target", "Semanas hasta la meta")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    step: "1",
    value: bodyGoalForm.weeks,
    onChange: e => setBodyGoalForm(f => ({...f, weeks: e.target.value})),
    placeholder: suggestedBodyGoalWeeks ? String(suggestedBodyGoalWeeks) : uiText("sugerido", "suggested", "sugerido"),
    style: inp
  }), suggestedBodyGoalWeeks && /*#__PURE__*/React.createElement("div", {
    style: { color: "var(--muted)", fontSize: 12, lineHeight: 1.35, marginTop: 5 }
  }, uiText("Prazo saudável sugerido: cerca de ", "Suggested healthy pace: about ", "Plazo saludable sugerido: cerca de ") + suggestedBodyGoalWeeks + uiText(" semanas.", " weeks.", " semanas."))), /*#__PURE__*/React.createElement("button", {
    onClick: saveBodyFatGoal,
    style: { ...btn, marginTop: 4 }
  }, uiText("Salvar meta de gordura", "Save body-fat goal", "Guardar meta de grasa")), /*#__PURE__*/React.createElement("div", {
    style: { color: "var(--muted)", fontSize: 12, lineHeight: 1.45, marginTop: 6 }
  }, uiText("Isso sincroniza a gordura estimada a perder e o prazo com sua meta nutricional.", "This syncs the estimated fat to lose and time frame with your nutrition goal.", "Esto sincroniza la grasa estimada por perder y el plazo con tu meta nutricional."))), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }
  }, bodyComposition.fatToLose ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", {
    style: { color: "var(--text2)" }
  }, uiText("Previsão", "Forecast", "Previsión")), /*#__PURE__*/React.createElement("br", null), uiText("Gordura estimada a perder: ", "Estimated fat to lose: ", "Grasa estimada por perder: ") + (Math.round(bodyComposition.fatToLose * 10) / 10) + " kg.", /*#__PURE__*/React.createElement("div", {
    style: { marginTop: 6, color: "var(--muted)" }
  }, bodyComposition.weeksRemaining
    ? uiText("Pela tendência recente de gordura, isso levaria cerca de ", "At the recent fat-mass trend, this would take about ", "Con la tendencia reciente de grasa, esto tomaría cerca de ") + (Math.round(bodyComposition.weeksRemaining * 10) / 10) + uiText(" semanas.", " weeks.", " semanas.")
    : uiText("Ainda não há tendência de gordura alinhada suficiente para estimar uma data.", "There is not enough aligned body-fat trend yet for a date estimate.", "Todavía no hay una tendencia de grasa corporal suficiente para estimar una fecha."))) : uiText("Registre gordura corporal e uma meta para liberar estimativas de gordura.", "Add body-fat percentage and a target to unlock fat-mass estimates.", "Registra grasa corporal y una meta para activar estimaciones de grasa."), /*#__PURE__*/React.createElement(BodyFatTrendChart, {
    data: bodyComposition.fatChartData,
    targetPct: bodyComposition.targetPct,
    lang,
    isMobileView
  })), bodyCompositionOpen && bodyComposition.measured.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: { marginTop: 10, display: "grid", gap: 6 }
  }, bodyComposition.measured.slice(-6).reverse().map(e => /*#__PURE__*/React.createElement("div", {
    key: "body-" + e.id,
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "space-between",
      borderTop: "1px solid var(--border3)",
      paddingTop: 6,
      fontSize: 12,
      color: "var(--muted)"
    }
  }, /*#__PURE__*/React.createElement("span", null, formatDateDMY(e.date)), /*#__PURE__*/React.createElement("span", null, e.bodyFatPct ? e.bodyFatPct + "%" : "—"), /*#__PURE__*/React.createElement("span", null, e.waistCm ? e.waistCm + "cm" : "—"), /*#__PURE__*/React.createElement("span", null, e.muscleMassKg ? e.muscleMassKg + "kg" : "—"))))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "metrics-progress",
    style: {
      display: metricsSection === "tracking" ? "block" : "none",
      marginTop: 20,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: isMobileView ? 12 : 8,
      padding: isMobileView ? "12px" : "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setMetricsProgressOpen(v => !v),
    "data-progress-heading": "true",
    role: "button",
    tabIndex: 0,
    style: {
      flex: "1 1 auto",
      minWidth: 0,
      background: "none",
      border: "none",
      padding: 0,
      cursor: "pointer",
      fontFamily: "inherit",
      textAlign: "left",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase"
    }
  }, metricsProgressOpen ? "▼ " : "▶ ", pickLang(lang, "Progresso e previsão", "Progress and forecast", "Progreso y previsión")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      fontSize: 12,
      color: "var(--dim)",
      lineHeight: 1.35
    }
  }, pickLang(lang, "Visão rolante dos dias concluídos, sem contar hoje.", "Rolling view of completed days, excluding today.", "Vista móvil de los días completados, sin contar hoy."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      setMetricsProgressInfoOpen(v => !v);
    },
    style: {
      background: metricsProgressInfoOpen ? "var(--btn-info)" : "var(--surface3)",
      border: "1px solid " + (metricsProgressInfoOpen ? "var(--btn-info-border)" : "var(--border3)"),
      color: metricsProgressInfoOpen ? "var(--btn-info-text)" : "var(--muted)",
      borderRadius: 999,
      padding: isMobileView ? "4px 8px" : "4px 10px",
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      fontFamily: "inherit",
      cursor: "pointer",
      whiteSpace: "nowrap"
    }
  }, pickLang(lang, "Mais info", "More info", "Más info")))), /*#__PURE__*/React.createElement("div", {
    "data-progress-grid": "true",
    style: {
      marginTop: 12,
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "repeat(auto-fit, minmax(130px, 1fr))",
      gap: 8
    }
  }, [{
    l: pickLang(lang, "Meta semanal", "Weekly target", "Meta semanal"),
    v: weeklyProgress.plannedWeek ? weeklyProgress.plannedWeek + " kcal" : "—",
    c: "#8ec8c8"
  }, {
    l: pickLang(lang, "Déficit", "Deficit", "Déficit"),
    v: weeklyProgress.deficit + " kcal",
    c: "#c8a96e"
  }, {
    l: pickLang(lang, "Superávit", "Surplus", "Superávit"),
    v: weeklyProgress.surplus + " kcal",
    c: "#c86e8e"
  }, {
    l: pickLang(lang, "Aderência", "Adherence", "Adherencia"),
    v: weeklyProgress.plannedWeek ? weeklyProgress.adherence + "%" : "—",
    c: weeklyProgress.adherence >= 80 && weeklyProgress.adherence <= 120 ? "#6ec8a9" : "#c8a96e"
  }, {
    l: pickLang(lang, "Tendência", "Trend", "Tendencia"),
    v: weightTrend.hasEnough ? (weightTrend.weeklyRate > 0 ? "+" : "") + (Math.round(weightTrend.weeklyRate * 100) / 100) + pickLang(lang, " kg/sem", " kg/wk", " kg/sem") : "—",
    c: weightTrend.weeklyRate < 0 ? "#6ec8a9" : weightTrend.weeklyRate > 0 ? "#c86e8e" : "var(--muted)"
  }].filter(card => card.v !== "—").map(card => /*#__PURE__*/React.createElement("div", {
    key: card.l,
    style: {
      border: "1px solid var(--border3)",
      borderRadius: 8,
      padding: "10px 12px",
      background: "var(--bg)",
      minHeight: 58
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 5
    }
  }, card.l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      color: card.c,
      fontWeight: 600
    }
  }, card.v)))), metricsProgressInfoOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      background: "var(--bg)",
      border: "1px solid var(--border3)",
      borderRadius: 8,
      padding: "12px 14px",
      fontSize: 13,
      color: "var(--text3)",
      lineHeight: 1.55
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--text2)",
      fontWeight: 700,
      marginBottom: 8
    }
  }, pickLang(lang, "Como interpretar estes valores", "How to read these values", "Cómo interpretar estos valores")), (lang === 'en' ? [
    ["Weekly target", "The total calorie adjustment planned for the last 7 completed days. It comes from your current objective and does not include today."],
    ["Deficit", "Calories below the estimated maintenance base across completed days. This is mainly useful for weight-loss goals."],
    ["Surplus", "Calories above the estimated maintenance base across completed days. This is mainly useful for weight-gain goals."],
    ["Adherence", "How close the accumulated deficit or surplus is to the planned weekly target. Around 100% means the pace is close to the plan; much lower or higher suggests the pace is slower or faster."],
    ["Trend", "Estimated weekly weight change from recent records. Treat it as a direction signal, because water, glycogen, sodium, and digestion can move weight day to day."]
  ] : lang === 'es' ? [
    ["Meta semanal", "El ajuste calórico total planificado para los últimos 7 días completados. Viene de tu objetivo actual y no incluye hoy."],
    ["Déficit", "Calorías por debajo de la base estimada de mantenimiento en los días completados. Es más útil para objetivos de pérdida de peso."],
    ["Superávit", "Calorías por encima de la base estimada de mantenimiento en los días completados. Es más útil para objetivos de ganancia de peso."],
    ["Adherencia", "Qué tan cerca está el déficit o superávit acumulado de la meta semanal planificada. Cerca de 100% indica un ritmo alineado al plan; muy por debajo o por encima sugiere un ritmo más lento o más rápido."],
    ["Tendencia", "Cambio semanal estimado a partir de los registros recientes. Úsalo como señal de dirección, porque agua, glucógeno, sodio y digestión pueden mover el peso día a día."]
  ] : [
    ["Meta semanal", "O ajuste calórico total planejado para os últimos 7 dias concluídos. Ele vem do objetivo atual e não inclui hoje."],
    ["Déficit", "Calorias abaixo da base estimada de manutenção nos dias concluídos. É mais útil para objetivos de perda de peso."],
    ["Superávit", "Calorias acima da base estimada de manutenção nos dias concluídos. É mais útil para objetivos de ganho de peso."],
    ["Aderência", "Quão perto o déficit ou superávit acumulado está da meta semanal planejada. Perto de 100% indica um ritmo alinhado ao plano; muito abaixo ou acima sugere ritmo mais lento ou mais rápido."],
    ["Tendência", "Mudança semanal estimada a partir dos registros recentes. Use como sinal de direção, porque água, glicogênio, sódio e digestão podem alterar o peso no dia a dia."]
  ]).map(([title, text]) => /*#__PURE__*/React.createElement("div", {
    key: title,
    style: { marginTop: 6 }
  }, /*#__PURE__*/React.createElement("b", {
    style: { color: "var(--text2)" }
  }, title, ": "), text)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      color: "var(--muted)"
    }
  }, pickLang(lang, "Use esta seção para ler tendência, não como julgamento diário. Pequenos desvios são normais.", "Use this section as a trend reader, not as a daily judgment. Small deviations are normal.", "Usa esta sección para leer tendencias, no como juicio diario. Pequeñas desviaciones son normales."))), metricsProgressOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      borderTop: "1px solid var(--border3)",
      paddingTop: 12,
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text3)",
      lineHeight: 1.55
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: { color: "var(--text2)" }
  }, pickLang(lang, "Saldo semanal", "Weekly balance", "Balance semanal")), /*#__PURE__*/React.createElement("br", null), pickLang(lang, "Déficit e superávit são calculados contra a base estimada de manutenção de cada dia concluído. A meta semanal usa o ajuste atual do seu objetivo.", "Deficit and surplus are calculated against the estimated maintenance base for each completed day. The weekly target uses your current goal adjustment.", "Déficit y superávit se calculan contra la base estimada de mantenimiento de cada día completado. La meta semanal usa el ajuste actual de tu objetivo."), weeklyProgress.days === 0 && /*#__PURE__*/React.createElement("div", {
      style: { marginTop: 8, color: "var(--muted)" }
  }, pickLang(lang, "Registre dias anteriores para preencher esta seção.", "Log past days to see this section fill in.", "Registra días anteriores para completar esta sección."))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text3)",
      lineHeight: 1.55
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: { color: "var(--text2)" }
  }, pickLang(lang, "Previsão", "Forecast", "Previsión")), /*#__PURE__*/React.createElement("br", null), nutritionPrefs.goalType === "maintenance"
    ? pickLang(lang, "A previsão é mais útil para objetivos de perda ou ganho.", "Forecast is most useful for loss or gain goals.", "La previsión es más útil para objetivos de pérdida o ganancia.")
    : weightTrend.weeksRemaining
      ? pickLang(lang, "No ritmo atual do peso, a mudança planejada levaria cerca de " + (Math.round(weightTrend.weeksRemaining * 10) / 10) + " semanas.", "At the current weight trend, the planned change would take about " + (Math.round(weightTrend.weeksRemaining * 10) / 10) + " weeks.", "Con la tendencia actual del peso, el cambio planificado tardaría cerca de " + (Math.round(weightTrend.weeksRemaining * 10) / 10) + " semanas.")
      : pickLang(lang, "Ainda não há tendência alinhada suficiente para estimar uma data de chegada.", "There is not enough aligned trend yet to estimate an arrival date.", "Todavía no hay una tendencia suficientemente alineada para estimar una fecha de llegada."), weightTrend.avg14 && /*#__PURE__*/React.createElement("div", {
      style: { marginTop: 8, color: "var(--muted)" }
  }, pickLang(lang, "Média 14 registros: ", "14-entry average: ", "Media de 14 registros: "), Math.round(weightTrend.avg14 * 10) / 10, " kg"))), renderReportsCard()))));
    }

    return { MetricsScreen };
  }

  return { createMetricsScreen };
});
