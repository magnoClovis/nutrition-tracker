/**
 * Read-only weekly nutrition screen.
 *
 * The UMD module exposes a `createWeekScreen` factory. React, Recharts, and
 * `pickLang` from `i18n.js` are injected explicitly. The component owns no
 * persistence, loaders, or durable state: weekly aggregation and AI generation
 * remain in `NutritionTracker`.
 *
 * IMPORTANT: `feedbackText`/`feedbackPeriod` are shared with the Diary
 * screen, while `showExportPanel`/`exportResult` are shared with the Add
 * screen. They remain controller-owned and enter this view only through props.
 * Existing overlapping-loader races and the lack of meal-key normalization are
 * intentionally preserved in their controller/model layers.
 *
 * @module WeekScreen
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WeekScreenModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the weekly screen with explicit presentation dependencies.
   *
   * @param {Object} dependencies Injected dependencies.
   * @param {Object} dependencies.React React runtime supplied by the host.
   * @param {Object} dependencies.Recharts Recharts runtime supplied by the host.
   * @param {function(string,string,string,string): string} dependencies.pickLang Language picker from `i18n.js`.
   * @returns {{WeekScreen: function(Object): Object}} Weekly screen API.
   */
  function createWeekScreen({ React, Recharts, pickLang }) {
    if (!React || typeof React.createElement !== "function" || !Recharts || typeof pickLang !== "function") {
      throw new TypeError("WeekScreen requires React, Recharts, and pickLang");
    }
    const {
      LineChart,
      Line,
      XAxis,
      YAxis,
      Tooltip,
      ResponsiveContainer,
      ReferenceLine
    } = Recharts;
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

    /**
     * Renders weekly summaries, charts, meal averages, exports, and AI results.
     *
     * @param {Object} props Screen data and controller-owned callbacks.
     * @param {string} props.lang Active language.
     * @param {boolean} props.isMobileView Whether mobile layout is active.
     * @param {function(string): string} props.text Existing translation getter.
     * @param {function(string): string} props.getMealLabel Localized meal-label getter.
     * @param {Object} props.chartTheme Chart color snapshot.
     * @param {Array<Object>} props.weekData Aggregated weekly rows.
     * @param {Object<string,Object>} props.mealAverages Thirty-day meal averages.
     * @param {Object} props.goals Effective nutrition goals.
     * @param {?Object} props.latestWeekPoint Last weekly row used for chart goals.
     * @param {Object} props.weekSummary Weekly summary metrics.
     * @param {boolean} props.patternsLoading Whether patterns generation is running.
     * @param {string} props.patternsText Generated eating-pattern text.
     * @param {boolean} props.patternsSaved Whether patterns were saved.
     * @param {boolean} props.feedbackLoading Whether feedback generation is running.
     * @param {string} props.feedbackText Shared generated feedback text.
     * @param {?string} props.feedbackPeriod Shared feedback period.
     * @param {boolean} props.feedbackSaved Whether feedback was saved.
     * @param {?string} props.showExportPanel Shared active export-panel identifier.
     * @param {?Object} props.exportResult Shared export result.
     * @param {function(string): void} props.onOpenDay Opens one day in Diary.
     * @param {function(): void} props.onToggleWeekExport Toggles weekly export options.
     * @param {function(string): void} props.onRunWeekExport Runs one export format.
     * @param {function(): void} props.onDismissExportResult Dismisses the export result.
     * @param {function(): void} props.onCopyExportResult Copies the current export.
     * @param {function(): void} props.onGeneratePatterns Starts patterns generation.
     * @param {function(): void} props.onSavePatterns Saves generated patterns.
     * @param {function(): void} props.onGenerateWeekFeedback Starts weekly feedback.
     * @param {function(): void} props.onSaveFeedback Saves generated feedback.
     * @returns {Object} React element for the weekly screen.
     */
    function WeekScreen({
      lang,
      isMobileView,
      text,
      getMealLabel,
      chartTheme: CT,
      weekData,
      mealAverages,
      goals,
      latestWeekPoint,
      weekSummary,
      patternsLoading,
      patternsText,
      patternsSaved,
      feedbackLoading,
      feedbackText,
      feedbackPeriod,
      feedbackSaved,
      showExportPanel,
      exportResult,
      onOpenDay,
      onToggleWeekExport,
      onRunWeekExport,
      onDismissExportResult,
      onCopyExportResult,
      onGeneratePatterns,
      onSavePatterns,
      onGenerateWeekFeedback,
      onSaveFeedback
    }) {
      const {
        avgProtein,
        avgKcal,
        daysMetProtein,
        daysWithData,
        calorieBank,
        calorieBankDays
      } = weekSummary;
      const uiText = (pt, en, es) => pickLang(lang, pt, en, es);
      function renderMetricTooltip({ active, payload, label }, metric) {
        if (!active || !Array.isArray(payload)) return null;
        const firstValue = payload.find(item => item && item.value != null);
        if (!firstValue) return null;
        return /*#__PURE__*/React.createElement("div", {
          "data-week-tooltip": metric.key,
          style: {
            background: CT.bg,
            border: "1px solid " + CT.border,
            borderRadius: 4,
            padding: "8px 10px",
            fontSize: 14,
            color: CT.label
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            color: CT.label,
            marginBottom: 4
          }
        }, label), /*#__PURE__*/React.createElement("div", {
          style: {
            color: metric.color
          }
        }, metric.label, ": ", firstValue.value, metric.unit));
      }
      return React.createElement("div", {
    "data-screen": "semana"
  }, weekData.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      color: "var(--faint)",
      fontSize: 14,
      marginTop: 40,
      fontStyle: "italic"
    }
  }, text('loading')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "week-summary",
    style: {
      display: "grid",
      gridTemplateColumns: calorieBankDays.length ? (isMobileView ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))") : "repeat(3, minmax(0, 1fr))",
      gap: 0,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      margin: "0 16px 16px",
      overflow: "hidden"
    }
  }, [{
    l: text('avgProtein'),
    v: `${avgProtein}g`,
    c: "var(--accent-protein-text)",
    bg: "var(--accent-protein-bg)"
  }, {
    l: text('avgCalories'),
    v: String(avgKcal),
    c: "var(--accent-kcal-text)",
    bg: "var(--accent-kcal-bg)"
  }, {
    l: text('daysProtGoal'),
    v: `${daysMetProtein}/${daysWithData.length}`,
    c: "var(--accent-protein-text)",
    bg: "var(--accent-protein-bg)"
  }, {
    l: uiText("Banco de calorias", "Calorie bank", "Banco de calorías"),
    v: calorieBankDays.length ? `${calorieBank > 0 ? "+" : ""}${calorieBank} kcal` : "—",
    c: calorieBank >= 0 ? "var(--accent-kcal-text)" : "var(--accent-danger-text)",
    bg: "var(--accent-kcal-bg)",
    detail: `${calorieBankDays.length}/7 ${uiText("dias registrados", "logged days", "días registrados")}`
  }].filter(x => x.v !== "—").map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: x.l,
    style: {
      flex: 1,
      padding: "12px 8px",
      textAlign: "center",
      background: x.bg,
      borderRight: !isMobileView && i < 3 ? "1px solid var(--border)" : i % 2 === 0 ? "1px solid var(--border)" : "none",
      borderBottom: isMobileView && i < 2 ? "1px solid var(--border)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      color: x.c
    }
  }, x.v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      letterSpacing: 1,
      marginTop: 3,
      textTransform: "uppercase"
    }
  }, x.l), x.detail && /*#__PURE__*/React.createElement("div", {style: {fontSize: 11, color: "var(--dim)", marginTop: 6}}, x.detail), i === 2 && /*#__PURE__*/React.createElement("div", {
    title: uiText("Meta de proteína por dia", "Protein goal by day", "Meta de proteína por día"),
    style: {
      display: "flex",
      justifyContent: "center",
      gap: 4,
      marginTop: 8
    }
  }, weekData.filter(d => !d.isToday).slice(-7).map(d => /*#__PURE__*/React.createElement("span", {
    key: d.date,
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: d.hasData && d.metProtein ? "var(--btn-ok-text)" : "var(--border2)",
      display: "inline-block"
    }
  })))))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "week-days",
    style: {
      display: "flex",
      gap: 10,
      overflowX: "auto",
      padding: "0 16px 10px",
      margin: "0 auto 16px",
      justifyContent: "center",
      boxSizing: "border-box",
      maxWidth: "100%"
    }
  }, weekData.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.date,
    onClick: () => onOpenDay(d.date),
    style: {
      minWidth: 68,
      background: d.isToday ? "var(--btn-ok)" : "var(--surface3)",
      border: `1px solid ${d.isToday ? "var(--btn-ok-border)" : "var(--border)"}`,
      borderRadius: 8,
      padding: "10px 6px",
      textAlign: "center",
      cursor: "pointer",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      textTransform: "uppercase"
    }
  }, d.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: d.hasData ? d.metProtein ? "var(--btn-ok-text)" : "#c8a96e" : "var(--dim)",
      marginTop: 6,
      fontWeight: 600
    }
  }, d.hasData ? `${d.protein}g` : "—"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: d.hasData ? "#8ec8c8" : "var(--dim)",
      marginTop: 2
    }
  }, d.hasData ? d.kcal : ""), d.hasData && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: d.metProtein ? "var(--btn-ok-text)" : "var(--muted)",
      margin: "6px auto 0"
    }
  })))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "week-protein-chart",
    style: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "14px",
      margin: "0 16px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 10
    }
  }, uiText("Proteína (g) \u2014 últimos 7 dias", "Protein (g) \u2014 last 7 days", "Proteína (g) \u2014 últimos 7 días")), /*#__PURE__*/React.createElement(ResponsiveContainer, {
    width: "100%",
    height: 130
  }, /*#__PURE__*/React.createElement(LineChart, {
    data: weekData
  }, /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "label",
    tick: {
      fontSize: 14,
      fill: CT.tick
    },
    axisLine: false,
    tickLine: false
  }), /*#__PURE__*/React.createElement(YAxis, {
    tick: {
      fontSize: 14,
      fill: CT.tick
    },
    axisLine: false,
    tickLine: false,
    domain: [0, "auto"],
    width: 30
  }), /*#__PURE__*/React.createElement(Tooltip, {
    content: tooltipProps => renderMetricTooltip(tooltipProps, {
      key: "protein",
      label: text('protein'),
      unit: "g",
      color: "#c8a96e"
    })
  }), latestWeekPoint && /*#__PURE__*/React.createElement(ReferenceLine, {
    y: latestWeekPoint.proteinGoal,
    stroke: "#c8a96e",
    strokeDasharray: "3 3",
    strokeOpacity: 0.65,
    label: {
      value: uiText("meta ", "goal ", "meta ") + latestWeekPoint.proteinGoal + "g",
      fill: CT.label,
      fontSize: 11,
      position: "insideTopRight",
      dx: -10,
      dy: -8
    }
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "proteinPastLine",
    stroke: "#c8a96e",
    strokeWidth: 2,
    dot: {
      fill: "#c8a96e",
      r: 3
    },
    activeDot: {
      r: 5
    },
    connectNulls: false
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "proteinTodayLine",
    stroke: "#c8a96e",
    strokeWidth: 2,
    strokeDasharray: "5 5",
    dot: {
      fill: "#c8a96e",
      r: 3
    },
    activeDot: {
      r: 5
    },
    connectNulls: false
  })))), /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "week-calories-chart",
    style: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "14px",
      margin: "0 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 10
    }
  }, uiText("Calorias \u2014 últimos 7 dias", "Calories \u2014 last 7 days", "Calorías \u2014 últimos 7 días")), /*#__PURE__*/React.createElement(ResponsiveContainer, {
    width: "100%",
    height: 130
  }, /*#__PURE__*/React.createElement(LineChart, {
    data: weekData
  }, /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "label",
    tick: {
      fontSize: 14,
      fill: CT.tick
    },
    axisLine: false,
    tickLine: false
  }), /*#__PURE__*/React.createElement(YAxis, {
    tick: {
      fontSize: 14,
      fill: CT.tick
    },
    axisLine: false,
    tickLine: false,
    domain: [0, "auto"],
    width: 35
  }), /*#__PURE__*/React.createElement(Tooltip, {
    content: tooltipProps => renderMetricTooltip(tooltipProps, {
      key: "calories",
      label: text('calories'),
      unit: " kcal",
      color: "#8ec8c8"
    })
  }), latestWeekPoint && /*#__PURE__*/React.createElement(ReferenceLine, {
    y: latestWeekPoint.kcalGoal,
    stroke: "#8ec8c8",
    strokeDasharray: "3 3",
    strokeOpacity: 0.65,
    label: {
      value: uiText("meta ", "goal ", "meta ") + latestWeekPoint.kcalGoal + " kcal",
      fill: CT.label,
      fontSize: 11,
      position: "insideTopRight",
      dx: -10,
      dy: -8
    }
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "kcalPastLine",
    stroke: "#8ec8c8",
    strokeWidth: 2,
    dot: {
      fill: "#8ec8c8",
      r: 3
    },
    activeDot: {
      r: 5
    },
    connectNulls: false
  }), /*#__PURE__*/React.createElement(Line, {
    type: "monotone",
    dataKey: "kcalTodayLine",
    stroke: "#8ec8c8",
    strokeWidth: 2,
    strokeDasharray: "5 5",
    dot: {
      fill: "#8ec8c8",
      r: 3
    },
    activeDot: {
      r: 5
    },
    connectNulls: false
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--faint)",
      textAlign: "center",
      marginTop: 10,
      fontStyle: "italic"
    }
  }, uiText("Clica num dia para ver o detalhe", "Click a day to see details", "Haz clic en un día para ver el detalle")), Object.keys(mealAverages).length > 0 && /*#__PURE__*/React.createElement("div", {
    "data-tutorial": "week-meal-averages",
    style: {
      margin: "20px 16px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 10
    }
  }, uiText("Médias por refeição (últimos 30 dias)", "Meal averages (last 30 days)", "Promedios por comida (últimos 30 días)")), Object.entries(mealAverages).sort((a, b) => b[1].avgProtein - a[1].avgProtein).map(([meal, d]) => {
    const maxProt = Math.max(1, ...Object.values(mealAverages).map(item => item.avgProtein || 0));
    const daysLabel = uiText(
      d.count + " dia" + (d.count !== 1 ? "s" : "") + " registrado" + (d.count !== 1 ? "s" : ""),
      d.count + " logged day" + (d.count !== 1 ? "s" : ""),
      d.count + " día" + (d.count !== 1 ? "s" : "") + " registrado" + (d.count !== 1 ? "s" : "")
    );
    return /*#__PURE__*/React.createElement("div", {
      key: meal,
      style: {
        marginBottom: 12,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "10px 14px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: "var(--text3)"
      }
    }, getMealLabel(meal)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: "var(--muted)"
      }
    }, daysLabel)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 16,
        marginBottom: 6,
        fontSize: 11
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#c8a96e"
      }
    }, d.avgProtein, "g prot"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#8ec8c8"
      }
    }, d.avgKcal, " kcal"), d.avgCarbs > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#a96ec8"
      }
    }, d.avgCarbs, "g carbs"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--muted)",
        marginLeft: "auto"
      }
    }, Math.round(d.avgProtein / goals.protein * 100), uiText("% meta prot", "% protein goal", "% meta prot"))), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 4,
        background: "var(--track)",
        borderRadius: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: "100%",
        width: Math.min(d.avgProtein / maxProt * 100, 100) + "%",
        borderRadius: 4,
        background: "#c8a96e",
        transition: "width 0.4s ease"
      }
    })));
  })), weekData.some(d => d.hasData) && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      borderTop: "1px solid var(--border3)",
      paddingTop: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onToggleWeekExport,
    style: {
      ...btn,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "var(--btn-info-text)",
      marginTop: 0,
      display: "none"
    }
  }, "\u2193 Exportar semana"), showExportPanel === "week" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 6,
      padding: "12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 8
    }
  }, "Escolha o formato"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6
    }
  }, [["json", "JSON", uiText("dados completos", "full data", "datos completos")], ["csv", "CSV", uiText("para Excel", "for Excel", "para Excel")], ["html", "HTML", uiText("relatório", "report", "informe")], ["txt", "TXT", uiText("texto simples", "plain text", "texto simple")]].map(([fmt, label, desc]) => /*#__PURE__*/React.createElement("button", {
    key: fmt,
    onClick: () => onRunWeekExport(fmt),
    style: {
      background: "var(--input)",
      border: "1px solid var(--border2)",
      borderRadius: 6,
      padding: "8px 10px",
      cursor: "pointer",
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text3)",
      fontWeight: 600
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      marginTop: 2
    }
  }, desc))))), exportResult && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      background: "var(--surface)",
      border: "1px solid #2a3a2a",
      borderRadius: 6,
      padding: "12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--btn-ok-text)"
    }
  }, "\u2713 ", exportResult.filename), /*#__PURE__*/React.createElement("button", {
    onClick: onDismissExportResult,
    style: {
      background: "none",
      border: "none",
      color: "var(--muted)",
      cursor: "pointer",
      fontSize: 14
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("textarea", {
    readOnly: true,
    value: exportResult.content,
    style: {
      ...inp,
      height: 100,
      fontSize: 14,
      fontFamily: "monospace",
      resize: "vertical",
      marginTop: 0,
      color: "var(--muted2)"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: onCopyExportResult,
    style: {
      ...btn,
      marginTop: 8,
      background: "var(--btn-ok)",
      border: "1px solid var(--btn-ok-border)",
      color: "var(--btn-ok-text)",
      fontSize: 14,
      letterSpacing: 1
    }
  }, exportResult.copied ? pickLang(lang, "Copiado!", "Copied!", "Copiado!") : pickLang(lang, "Copiar para área de transferência", "Copy to clipboard", "Copiar al portapapeles")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      borderTop: "1px solid var(--border3)",
      paddingTop: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onGeneratePatterns,
    "data-action-insight": "true",
    disabled: patternsLoading,
    style: {
      width: "100%",
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: patternsLoading ? "#555" : "#c8a0e8",
      padding: "10px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: patternsLoading ? "default" : "pointer",
      fontFamily: "inherit"
    }
  }, patternsLoading ? text('analyzingPatterns') : text('aiPatterns')), patternsText && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      background: "var(--surface)",
      border: "1px solid var(--border2)",
      borderRadius: 8,
      padding: "14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 10
    }
  }, pickLang(lang, "Padrões — últimos 30 dias", "Patterns — last 30 days", "Patrones — últimos 30 días")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text3)",
      lineHeight: 1.7,
      whiteSpace: "pre-wrap"
    }
  }, patternsText), patternsSaved ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      fontSize: 14,
      color: "#3a6a3a",
      textAlign: "center",
      padding: "8px",
      background: "var(--btn-ok)",
      borderRadius: 6,
      border: "1px solid var(--btn-ok-border)"
    }
  }, pickLang(lang, "✓ Salvo nas notas", "✓ Saved to notes", "✓ Guardado en notas")) : /*#__PURE__*/React.createElement("button", {
    onClick: onSavePatterns,
    style: {
      ...btn,
      marginTop: 12,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "#7e9ec8",
      fontSize: 14,
      letterSpacing: 1
    }
  }, text('savedNote'))), weekData.some(d => d.hasData) && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onGenerateWeekFeedback,
    "data-action-insight": "true",
    disabled: feedbackLoading && feedbackPeriod === "week",
    style: {
      width: "100%",
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: feedbackLoading && feedbackPeriod === "week" ? "#555" : "#c8a0e8",
      padding: "10px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: "inherit"
    }
  }, feedbackLoading && feedbackPeriod === "week" ? text('analyzing') : text('aiAnalyzeWeek')), feedbackText && feedbackPeriod === "week" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      background: "var(--surface)",
      border: "1px solid var(--border2)",
      borderRadius: 8,
      padding: "14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 10
    }
  }, pickLang(lang, "Feedback semanal", "Weekly feedback", "Feedback semanal")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text3)",
      lineHeight: 1.7,
      whiteSpace: "pre-wrap"
    }
  }, feedbackText), feedbackSaved ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      fontSize: 14,
      color: "#3a6a3a",
      textAlign: "center",
      padding: "8px",
      background: "var(--btn-ok)",
      borderRadius: 6,
      border: "1px solid var(--btn-ok-border)"
    }
  }, pickLang(lang, "✓ Já salvo nas notas", "✓ Already saved to notes", "✓ Ya guardado en notas")) : /*#__PURE__*/React.createElement("button", {
    onClick: onSaveFeedback,
    style: {
      ...btn,
      marginTop: 12,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "#7e9ec8",
      fontSize: 14,
      letterSpacing: 1
    }
  }, pickLang(lang, "Salvar nas notas de hoje", "Save to today's notes", "Guardar en las notas de hoy")))))));
    }

    return { WeekScreen };
  }

  return { createWeekScreen };
});
