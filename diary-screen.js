/**
 * Controlled Diary presentation split across its original header/ticker and
 * main-content positions.
 *
 * React, i18n/date/calendar helpers, UI primitives, and the GA result card are
 * injected explicitly. NutritionTracker retains ownership of all state,
 * persistence, timers, loaders, Firebase, AI, MealScore, and meal-ga execution.
 * The backup/import tail and the structurally unreachable Add recent node are
 * supplied as one opaque React node so their original parentage remains intact.
 *
 * Known preserved behavior includes historical-navigation races, stale AI/GA
 * responses, uncancelled GA work, snapshot-versus-functional activeLog writes,
 * current supplements appearing on historical days while water is today-only,
 * and the ticker's local-time greeting alongside the script-level UTC TODAY.
 *
 * @module DiaryScreen
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DiaryScreenModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the controlled Diary view with explicit presentation dependencies.
   *
   * @param {Object} dependencies Injected dependencies.
   * @param {Object} dependencies.React React runtime supplied by the host.
   * @param {Function} dependencies.pickLang Language picker from i18n.js.
   * @param {Function} dependencies.sortLocaleForLang Sort locale helper from i18n.js.
   * @param {Function} dependencies.localeForLang Display locale helper from i18n.js.
   * @param {Function} dependencies.addDays Date navigation helper from date-utils.js.
   * @param {Function} dependencies.monthDays Calendar grid helper from calendar-model.js.
   * @param {Function} dependencies.shiftMonth Calendar month helper from calendar-model.js.
   * @param {Function} dependencies.calendarMonthStats Calendar summary helper from calendar-model.js.
   * @param {Function} dependencies.Ring Circular metric primitive from ui-primitives.js.
   * @param {Function} dependencies.Bar Linear metric primitive from ui-primitives.js.
   * @param {Function} dependencies.GaResultCard Active GA result card component.
   * @returns {{DiaryScreen: Function}} Controlled Diary component API.
   */
  function createDiaryScreen({ React, pickLang, sortLocaleForLang, localeForLang, addDays, monthDays, shiftMonth, calendarMonthStats, Ring, Bar, GaResultCard }) {
    if (!React || typeof React.createElement !== "function"
      || typeof pickLang !== "function" || typeof sortLocaleForLang !== "function"
      || typeof localeForLang !== "function" || typeof addDays !== "function"
      || typeof monthDays !== "function" || typeof shiftMonth !== "function"
      || typeof calendarMonthStats !== "function" || typeof Ring !== "function"
      || typeof Bar !== "function" || typeof GaResultCard !== "function") {
      throw new TypeError("DiaryScreen requires React, i18n/date/calendar helpers, Ring, Bar, and GaResultCard");
    }

    const inp = { width: "100%", background: "var(--input)", border: "1px solid var(--border2)", color: "var(--text2)", padding: "9px 12px", borderRadius: 6, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none", marginTop: 3 };
    const lbl = { fontSize: 14, letterSpacing: 1, color: "var(--muted)", textTransform: "uppercase", display: "block" };
    const btn = { width: "100%", background: "var(--btn-ok)", border: "1px solid var(--btn-ok-border)", color: "var(--btn-ok-text)", padding: "11px", borderRadius: 6, fontSize: 14, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", marginTop: 4 };
    const aiButtonStyle = { background: "var(--ai-bg)", border: "1px solid var(--ai-border)", color: "var(--ai-text)", borderRadius: 8, letterSpacing: 1, textTransform: "uppercase", fontWeight: 650 };
    const proteinColor = "var(--protein)";
    const caloriesColor = "var(--calories)";
    function sBtn(bg, border, color, extra = {}) { return { background: bg, border: "1px solid " + border, color, borderRadius: 4, padding: "6px 10px", fontSize: 14, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", ...extra }; }

    /**
     * Renders one original, non-contiguous Diary region without owning state.
     *
     * @param {Object} props Controlled Diary data, UI state, callbacks, and section.
     * @returns {Object|null} React element tree for ticker, summary, or content.
     */
    function DiaryScreen(props) {
      const { section, tab, lang, isMobileView, darkMode, text, uiText, tickerPhase, tickerDirection, safeTickerIndex, activeTickerSlide, tickerTimerReset, handleTickerPointerDown, handleTickerPointerMove, finishTickerPointer, tickerToneColor, tickerDragOffset, tickerSlides, setTickerTimerReset, moveTicker, greetingText, greetingLine, tot, goals, remainProtein, remainKcal, allEntries, dayProteinPct, dayKcalPct, openMealSuggestions, gaRunning, suggestLoading, showGA, setShowGA, gaTolerance, setGATolerance, gaTargetMeal, setGATargetMeal, MEALS, mealLabel, gaUseAll, setGAUseAll, runGASafely, gaProgress, gaResults, gaHasSearched, expandMicros, setExpandMicros, dailyMicros, hasMicros, getAutomaticMealSuggestionLimits, gaKcalMin, setGAKcalMin, gaProtMin, setGAProtMin, gaKcalMax, setGAKcalMax, gaProtMax, setGAProtMax, gaFoodSearch, setGAFoodSearch, pantry, gaSelIds, setGASelIds, gaAdvancedOpen, setGAAdvancedOpen, gaGlobalMax, setGAGlobalMax, gaUseProtTol, setGAUseProtTol, gaProtTolerance, setGAProtTolerance, activeLog, evaluateMealItems, mealScoreBrief, mealScoreEvaluationText, addGAResultToDiary, TODAY, diaryStatus, dateLabel, viewDate, calendarOpen, setCalendarOpen, changeViewDate, setCalendarMonth, calendarMonth, calendarData, calendarLoading, isToday, viewWeight, isTraining, totalWater, editWaterGoal, setEditWaterGoal, waterGoalInput, setWaterGoalInput, setWaterGoal, addWater, waterCustomPreset, configureWaterCustomPreset, waterInput, setWaterInput, waterIntake, removeWater, suppLog, removeSuppLog, entryMenuId, editEntryId, editEntryQty, setEditEntryQty, saveEntryEdit, setEditEntryId, openAddForMeal, setEntryMenuId, detailFood, setDetailFood, startEditEntry, duplicateEntry, removeEntry, notesOpen, setNotesOpen, todayNote, historyNote, setTodayNote, setHistoryNote, suppPantry, showSuppAdd, setShowSuppAdd, suppAddId, setSuppAddId, suppAddDose, setSuppAddDose, logSupp, feedbackLoading, feedbackPeriod, generateFeedback, feedbackText, feedbackSaved, saveFeedbackAsNote, setTab, opaqueTrailingNode } = props;
    function renderDailyMicros() {
        if (!hasMicros) return null;
        return /*#__PURE__*/React.createElement("div", {
          "data-diary-micros": "true",
          style: {
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid var(--border3)"
          }
        }, /*#__PURE__*/React.createElement("div", {
          "data-tutorial": "microLabel",
          style: {
            color: "var(--muted)",
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 8
          }
        }, text('microLabel')), dailyMicros.map(field => {
          if (field.value === 0) return null;
          return /*#__PURE__*/React.createElement("div", {
            key: field.key,
            style: {
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              padding: "5px 0",
              borderBottom: "1px solid var(--border3)",
              fontSize: 12
            }
          }, /*#__PURE__*/React.createElement("span", {
            style: { color: "var(--muted)" }
          }, field.label), /*#__PURE__*/React.createElement("span", {
            style: { color: "var(--muted2)" }
          }, field.value % 1 === 0 ? field.value : field.value.toFixed(2), " ", field.unit));
        }));
      }

    function renderMealSuggestionAdvancedControls() {
        const automaticLimits = getAutomaticMealSuggestionLimits();
        const autoMaxKcal = automaticLimits.kcalMax;
        const autoMaxProtein = automaticLimits.proteinMax;
        const autoMinProtein = Math.round(autoMaxProtein * 0.5);
        const compactLabel = {
          display: "block",
          color: "var(--text2)",
          fontSize: 12,
          marginBottom: 4
        };

        const limitFields = [
          {
            key: "kcalMin",
            label: uiText("Calorias min.", "Min calories", "Calorías mín."),
            unit: "kcal",
            value: gaKcalMin,
            set: setGAKcalMin,
            placeholder: uiText("auto: sem mínimo", "auto: no minimum", "auto: sin mínimo")
          },
          {
            key: "protMin",
            label: uiText("Proteína min.", "Min protein", "Proteína mín."),
            unit: "g",
            value: gaProtMin,
            set: setGAProtMin,
            placeholder: uiText("auto: aprox. ", "auto: about ", "auto: aprox. ") + autoMinProtein + "g"
          }
        ];

        const automaticMaxControls = React.createElement("div", {
          style: {
            background: "var(--surface3)",
            border: "1px solid var(--border3)",
            borderRadius: 8,
            padding: 10,
            marginBottom: 10
          }
        },
          React.createElement("div", {
            style: {fontSize: 12, color: "var(--muted)", marginBottom: 8, lineHeight: 1.45}
          }, uiText(
            "Limites automáticos para uma refeição agora, calculados pelo que falta no dia e pelas horas até meia-noite. Você pode substituí-los.",
            "Automatic limits for one meal now, based on what remains today and the hours until midnight. You can override them.",
            "Límites automáticos para una comida ahora, calculados según lo que falta hoy y las horas hasta medianoche. Puedes modificarlos."
          )),
          React.createElement("div", {
            style: {display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 8}
          }, [
            {
              key: "kcalMax",
              label: uiText("Calorias máximas da refeição", "Maximum meal calories", "Calorías máximas de la comida"),
              unit: "kcal",
              value: gaKcalMax,
              set: setGAKcalMax,
              placeholder: autoMaxKcal
            },
            {
              key: "protMax",
              label: uiText("Proteína máxima da refeição", "Maximum meal protein", "Proteína máxima de la comida"),
              unit: "g",
              value: gaProtMax,
              set: setGAProtMax,
              placeholder: autoMaxProtein
            }
          ].map(item => React.createElement("label", {key: item.key, style: {display: "block", minWidth: 0}},
            React.createElement("span", {style: compactLabel}, item.label),
            React.createElement("div", {style: {display: "flex", alignItems: "center", gap: 6}},
              React.createElement("input", {
                type: "number",
                min: 0,
                value: item.value,
                placeholder: uiText("automático: ", "automatic: ", "automático: ") + item.placeholder,
                onChange: event => item.set(event.target.value),
                style: {...inp, marginTop: 0, minWidth: 0, flex: 1}
              }),
              React.createElement("span", {style: {color: "var(--muted)", fontSize: 11, width: 28}}, item.unit)
            )
          ))),
          React.createElement("div", {style: {fontSize: 11, color: "var(--dim)", marginTop: 7}},
            uiText("Referência temporal: ", "Time reference: ", "Referencia temporal: "),
            Math.round(automaticLimits.hoursLeft * 10) / 10,
            uiText("h restantes · ", "h left · ", "h restantes · "),
            Math.round(automaticLimits.timeShare * 100),
            uiText("% do restante do dia nesta refeição.", "% of today's remainder in this meal.", "% de lo que queda del día en esta comida.")
          )
        );

        const q = gaFoodSearch.trim().toLowerCase();
        const filteredFoods = pantry
          .slice()
          .sort((a, b) => (a.name || "").localeCompare(b.name || "", sortLocaleForLang(lang), { sensitivity: "base" }))
          .filter(food => !q || (food.name || "").toLowerCase().includes(q));

        const foodPicker = !gaUseAll && React.createElement("div", {
          style: {
            background: "var(--surface3)",
            border: "1px solid var(--border3)",
            borderRadius: 8,
            padding: 10,
            marginBottom: 10,
            maxHeight: 190,
            overflowY: "auto"
          }
        },
          React.createElement("input", {
            type: "search",
            value: gaFoodSearch,
            onChange: e => setGAFoodSearch(e.target.value),
            placeholder: uiText("Pesquisar alimento pelo nome", "Search food by name", "Buscar alimento por nombre"),
            style: { ...inp, marginTop: 0, marginBottom: 8 }
          }),
          React.createElement("div", {
            style: { color: "var(--muted)", fontSize: 12, marginBottom: 8 }
          }, uiText("Selecione os alimentos a incluir:", "Select foods to include:", "Selecciona los alimentos que se incluirán:")),
          filteredFoods.length
            ? filteredFoods.map(food => React.createElement("label", {
              key: food.id,
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 0",
                color: "var(--text2)",
                fontSize: 13,
                cursor: "pointer"
              }
            },
              React.createElement("input", {
                type: "checkbox",
                checked: !!gaSelIds[food.id],
                onChange: e => setGASelIds(prev => ({ ...prev, [food.id]: e.target.checked }))
              }),
              React.createElement("span", null, food.name),
              React.createElement("span", {
                style: { color: "var(--muted)", fontSize: 12 }
              }, "(", food.kcal100 || 0, "kcal, ", food.protein100 || 0, "g prot)")
            ))
            : React.createElement("div", {
              style: { color: "var(--muted)", fontSize: 12 }
            }, uiText("Nenhum alimento encontrado.", "No foods found.", "No se encontraron alimentos."))
        );

        const advancedPanel = gaAdvancedOpen && React.createElement("div", {
          style: {
            background: "var(--surface3)",
            border: "1px solid var(--border3)",
            borderRadius: 8,
            padding: 10,
            marginBottom: 12
          }
        },
          React.createElement("div", {
            style: {
              display: "grid",
              gridTemplateColumns: isMobileView ? "1fr" : "140px 1fr",
              gap: 10,
              alignItems: "center",
              marginBottom: 12
            }
          },
            React.createElement("label", { style: compactLabel }, uiText("Máx. unidades por alimento", "Global max units per food", "Máx. unidades por alimento")),
            React.createElement("input", {
              type: "number",
              min: 1,
              max: 20,
              value: gaGlobalMax,
              onChange: e => setGAGlobalMax(parseInt(e.target.value) || 5),
              style: { ...inp, marginTop: 0 }
            })
          ),
          React.createElement("div", { style: { marginBottom: 14 } },
            React.createElement("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 8,
                marginBottom: 4
              }
            },
              React.createElement("label", { style: compactLabel }, uiText("Ajuste fino do tamanho", "Fine-tune meal size", "Ajuste fino del tamaño")),
              React.createElement("span", {
                style: {
                  color: gaTolerance > 0 ? "#c8b47e" : gaTolerance < 0 ? "#7ec8c8" : "var(--text2)",
                  fontSize: 12,
                  fontWeight: 700
                }
              }, (gaTolerance > 0 ? "+" : "") + gaTolerance + "% · " + autoMaxKcal + " kcal")
            ),
            React.createElement("input", {
              type: "range",
              min: -40,
              max: 40,
              value: gaTolerance,
              onChange: e => setGATolerance(parseInt(e.target.value)),
              style: { width: "100%" }
            }),
            React.createElement("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                color: "var(--muted)",
                fontSize: 12
              }
            },
              React.createElement("span", null, uiText("- déficit", "- deficit", "- déficit")),
              React.createElement("span", null, "0%"),
              React.createElement("span", null, uiText("+ superávit", "+ surplus", "+ superávit"))
            )
          ),
          React.createElement("label", {
            style: {
              color: "var(--text2)",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              marginBottom: 10
            }
          },
            React.createElement("input", {
              type: "checkbox",
              checked: gaUseProtTol,
              onChange: e => setGAUseProtTol(e.target.checked)
            }),
            uiText("Definir flexibilidade de proteína", "Set protein flexibility", "Definir flexibilidad de proteína")
          ),
          gaUseProtTol && React.createElement("div", { style: { marginBottom: 12 } },
            React.createElement("label", { style: compactLabel }, uiText("Flexibilidade de proteína: ", "Protein flexibility: ", "Flexibilidad de proteína: ") + gaProtTolerance + "%"),
            React.createElement("input", {
              type: "range",
              min: 5,
              max: 50,
              value: gaProtTolerance,
              onChange: e => setGAProtTolerance(parseInt(e.target.value)),
              style: { width: "100%" }
            })
          ),
          React.createElement("div", {
            style: {
              borderTop: "1px solid var(--border2)",
              paddingTop: 10
            }
          },
            React.createElement("div", {
              style: {
                fontSize: 12,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8
              }
            }, uiText("Limites mínimos (opcional)", "Minimum limits (optional)", "Límites mínimos (opcional)")),
            React.createElement("div", {
              style: {
                display: "grid",
                gridTemplateColumns: isMobileView ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 8
              }
            }, limitFields.map(item => React.createElement("label", {
              key: item.key,
              style: { display: "block", minWidth: 0 }
            },
              React.createElement("span", { style: compactLabel }, item.label),
              React.createElement("div", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }
              },
                React.createElement("input", {
                  type: "number",
                  min: 0,
                  value: item.value,
                  placeholder: item.placeholder,
                  onChange: e => item.set(e.target.value),
                  style: { ...inp, marginTop: 0, minWidth: 0, flex: 1 }
                }),
                React.createElement("span", {
                  style: { color: "var(--muted)", fontSize: 11, width: 28 }
                }, item.unit)
              )
            )))
          )
        );

        return React.createElement(React.Fragment, null,
          automaticMaxControls,
          foodPicker,
          React.createElement("button", {
            onClick: () => setGAAdvancedOpen(v => !v),
            style: {
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--border2)",
              background: "transparent",
              color: "var(--text2)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
              marginBottom: gaAdvancedOpen ? 10 : 12,
              textAlign: "left"
            }
        }, (gaAdvancedOpen ? "▼ " : "▶ ") + uiText("Ajustes avançados opcionais", "Advanced optional adjustments", "Ajustes avanzados opcionales")),
          advancedPanel
        );
      }

    function renderGAResultCard(result, index) {
        return React.createElement(GaResultCard, {
          key: index,
          result,
          index,
          activeLog,
          goals,
          lang,
          isMobileView,
          evaluateMealItems,
          getMealScoreBrief: mealScoreBrief,
          getMealScoreEvaluationText: mealScoreEvaluationText,
          onAdd: addGAResultToDiary
        });
      }

      if (section === "ticker") return /*#__PURE__*/React.createElement("div", {
    "data-header-ticker": "true",
    "data-ticker-phase": tickerPhase,
    "data-ticker-direction": tickerDirection > 0 ? "forward" : "backward",
    "data-ticker-index": safeTickerIndex,
    "data-ticker-tone": activeTickerSlide?.tone || "neutral",
    "data-ticker-timer-reset": tickerTimerReset,
    onPointerDown: handleTickerPointerDown,
    onPointerMove: handleTickerPointerMove,
    onPointerUp: finishTickerPointer,
    onPointerCancel: finishTickerPointer,
    style: {
      flex: "0 0 100%",
      minWidth: 0,
      overflow: "hidden",
      touchAction: "pan-y",
      cursor: "grab",
      userSelect: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    "data-ticker-content": "true",
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 8,
      width: "100%",
      minHeight: 34,
      color: tickerToneColor,
      fontWeight: activeTickerSlide?.tone === "alert" ? 600 : 500,
      opacity: tickerPhase === "exit" || tickerPhase === "prepare" ? 0 : tickerDragOffset ? 1 - Math.min(Math.abs(tickerDragOffset) / 160, 0.25) : 1,
      transform: tickerDragOffset ? `translateX(${tickerDragOffset}px)` : tickerPhase === "exit" ? `translateX(${-tickerDirection * 22}px)` : tickerPhase === "prepare" ? `translateX(${tickerDirection * 22}px)` : "translateX(0px)",
      transition: tickerDragOffset || tickerPhase === "prepare" ? "none" : tickerPhase === "exit" ? "transform 150ms ease, opacity 150ms ease" : "transform 300ms var(--ease-spring), opacity 220ms ease"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    "data-ticker-icon": "true",
    style: {fontSize: 15, flexShrink: 0, lineHeight: 1.4}
  }, activeTickerSlide?.icon || "\u2726"), /*#__PURE__*/React.createElement("span", {
    "data-ticker-text": "true",
    style: {
      flex: 1,
      minWidth: 0,
      overflow: "visible",
      textOverflow: "clip",
      whiteSpace: "normal",
      overflowWrap: "anywhere",
      fontSize: 12.5,
      lineHeight: 1.4
    }
  }, activeTickerSlide?.text || "")), tickerSlides.length > 1 && /*#__PURE__*/React.createElement("div", {
    "data-ticker-dots": "true",
    style: {display: "flex", justifyContent: "center", gap: 5, marginTop: 7}
  }, tickerSlides.map((slide, index) => /*#__PURE__*/React.createElement("button", {
    key: slide.key,
    type: "button",
    "data-ticker-dot-active": index === safeTickerIndex ? "true" : "false",
    "aria-label": uiText(`Ir para indicador ${index + 1}`, `Go to indicator ${index + 1}`, `Ir al indicador ${index + 1}`),
    onClick: () => {
      if (index === safeTickerIndex) {
        setTickerTimerReset(value => value + 1);
        return;
      }
      moveTicker(index > safeTickerIndex ? 1 : -1, true);
    },
    style: {
      width: index === safeTickerIndex ? 14 : 6,
      height: 6,
      minHeight: 0,
      padding: 0,
      border: 0,
      borderRadius: 999,
      background: index === safeTickerIndex ? "var(--accent-kcal-fill)" : "var(--text-muted)",
      opacity: index === safeTickerIndex ? 0.9 : 0.35,
      transition: "width 300ms var(--ease-spring), background 200ms ease",
      cursor: "pointer"
    }
  }))));
      if (section === "summary") return React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    "data-diary-greeting": "true",
    style: {
      padding: isMobileView ? "10px 20px 12px" : "10px 28px 14px",
      background: "var(--surface)",
      display: tab === "diario" ? "block" : "none",
      order: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: isMobileView ? 18 : 20,
      lineHeight: 1.2,
      color: "var(--text)",
      fontWeight: 700,
      letterSpacing: 0,
      overflowWrap: "anywhere"
    }
  }, greetingText), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      fontSize: 13,
      color: "var(--muted)",
      lineHeight: 1.35
    }
  }, greetingLine)), /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    "data-diary-metrics": "true",
    style: {
      display: tab === "diario" ? "flex" : "none",
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      order: 5
    }
  }, [{
    label: text('protein'),
    val: tot.protein,
    goal: goals.protein,
    color: proteinColor,
    unit: "g"
  }, {
    label: text('calories'),
    val: tot.kcal,
    goal: goals.kcal,
    color: caloriesColor,
    unit: text('kcalUnit')
  }].map(({
    label,
    val,
    goal,
    color,
    unit
  }) => /*#__PURE__*/React.createElement("div", {
    key: label,
    "data-metric-category": label === text('protein') ? "protein" : "kcal",
    className: "focus-block--no-transparency",
    style: {
      flex: 1,
      padding: "14px 8px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 5,
      borderRight: "1px solid var(--border)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    "data-metric-ring": "true",
    style: {
      position: "relative",
      width: 76,
      height: 76
    }
  }, /*#__PURE__*/React.createElement(Ring, {
    value: val,
    max: goal,
    color: color
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: val > goal ? "#ff4d4d" : color
    }
  }, Math.round(val)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--dim)"
    }
  }, unit))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--muted)",
      letterSpacing: 1,
      textTransform: "uppercase"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--faint)"
    }
  }, uiText('meta ', 'goal ', 'meta '), goal, unit), label === text('protein') && remainProtein > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 13,
      color: proteinColor
    }
  }, uiText("Faltam ", "Missing ", "Faltan "), /*#__PURE__*/React.createElement("b", null, remainProtein, "g"), uiText(" proteína", " protein", " de proteína")), label === text('calories') && remainKcal > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 13,
      color: caloriesColor
    }
  }, uiText("Faltam ", "Missing ", "Faltan "), /*#__PURE__*/React.createElement("b", null, remainKcal), " kcal")), /*#__PURE__*/React.createElement("div", {
    "data-metric-progress": "true",
    style: { width: "100%", height: 7, borderRadius: 8, overflow: "hidden", background: "color-mix(in srgb, " + color + " 18%, transparent)" }
  }, /*#__PURE__*/React.createElement("div", {
    style: { width: Math.min(100, goal > 0 ? val / goal * 100 : 0) + "%", height: "100%", borderRadius: 8, background: color, transition: "width var(--dur-base) var(--ease-spring)" }
  })))), allEntries.length > 0 && /*#__PURE__*/React.createElement("div", {
    "data-day-progress-top": "true",
    style: {
      flex: "1 0 100%",
      display: "flex",
      justifyContent: "center",
      gap: 8,
      padding: "8px 12px",
      color: "var(--muted)",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", null, dayProteinPct, "% ", uiText("proteína", "protein", "proteína")), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "·"), /*#__PURE__*/React.createElement("span", null, dayKcalPct, "% kcal"))), /*#__PURE__*/React.createElement("div", {
    "data-diary-suggestion-block": "true",
    style: {
      background: "var(--surface3)",
      borderBottom: "1px solid var(--border3)",
      padding: "7px 20px",
      display: tab === "diario" ? "block" : "none",
      order: 7
    }
  }, /*#__PURE__*/React.createElement("button", {
    "data-tutorial": "suggest-meal-button",
    onClick: openMealSuggestions,
    disabled: gaRunning || suggestLoading,
    style: {
      width: "100%",
      ...aiButtonStyle,
      background: gaRunning || suggestLoading ? "var(--btn-inactive)" : aiButtonStyle.background,
      color: gaRunning || suggestLoading ? "var(--muted)" : aiButtonStyle.color,
      padding: "7px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: gaRunning || suggestLoading ? "default" : "pointer",
      fontFamily: "inherit"
    }
  }, gaRunning || suggestLoading ? text('suggesting') : text('suggestBtn')), showGA && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      background: "var(--surface)",
      border: "1px solid var(--border2)",
      borderRadius: 10,
      padding: isMobileView ? 12 : 14,
      boxShadow: "0 10px 28px rgba(0,0,0,0.08)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted)",
      textTransform: "uppercase",
      fontWeight: 700
    }
  }, uiText("Sugestões de refeição", "Meal suggestions", "Sugerencias de comida")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--dim)",
      marginTop: 4
    }
  }, uiText(
    "Escolha os parâmetros e gere combinações com a despensa.",
    "Choose parameters and generate combinations from your pantry.",
    "Elige los parámetros y genera combinaciones desde tu despensa."
  ))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowGA(false),
    style: {
      background: "var(--btn-inactive)",
      border: "1px solid var(--btn-inactive-border)",
      color: "var(--muted)",
      borderRadius: 999,
      width: 32,
      height: 32,
      fontSize: 18,
      cursor: "pointer",
      flexShrink: 0
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "1fr 1fr",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Tamanho", "Meal size", "Tamaño")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 6,
      marginTop: 4
    }
  }, [[-20, uiText("Leve", "Light", "Ligera")], [0, uiText("Equilibrada", "Balanced", "Equilibrada")], [20, uiText("Reforçada", "Reinforced", "Reforzada")]].map(([value, label]) => /*#__PURE__*/React.createElement("button", {
    key: value,
    onClick: () => setGATolerance(value),
    style: {
      ...sBtn(Math.abs(gaTolerance - value) <= 10 ? "var(--btn-ok)" : "transparent", Math.abs(gaTolerance - value) <= 10 ? "var(--btn-ok-border)" : "var(--border2)", Math.abs(gaTolerance - value) <= 10 ? "var(--btn-ok-text)" : "var(--muted)"),
      marginTop: 0,
      padding: "7px 6px",
      fontSize: 12
    }
  }, label)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lbl
  }, uiText("Refeição alvo", "Target meal", "Comida objetivo")), /*#__PURE__*/React.createElement("select", {
    value: gaTargetMeal || MEALS[1],
    onChange: e => setGATargetMeal(e.target.value),
    style: {
      ...inp,
      marginTop: 4
    }
  }, MEALS.map(m => /*#__PURE__*/React.createElement("option", {
    key: m,
    value: m
  }, mealLabel(m)))))), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "flex-start",
      color: "var(--text2)",
      fontSize: 13,
      lineHeight: 1.35,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: gaUseAll,
    onChange: e => setGAUseAll(e.target.checked)
  }), /*#__PURE__*/React.createElement("span", null, uiText("Usar todos os alimentos da despensa automaticamente.", "Use all pantry foods automatically.", "Usar todos los alimentos de la despensa automáticamente."))), renderMealSuggestionAdvancedControls(), /*#__PURE__*/React.createElement("button", {
    onClick: runGASafely,
    disabled: gaRunning,
    style: {
      ...btn,
      marginTop: 0,
      opacity: gaRunning ? 0.65 : 1
    }
  }, gaRunning ? uiText("Buscando... ", "Searching... ", "Buscando... ") + gaProgress + "%" : uiText("Buscar sugestões", "Find suggestions", "Buscar sugerencias")), gaRunning && /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: "var(--track)",
      borderRadius: 999,
      overflow: "hidden",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: gaProgress + "%",
      height: "100%",
      background: "var(--btn-ok-text)",
      transition: "width 240ms ease"
    }
  })), gaResults.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: "grid",
      gap: 10
    }
  }, gaResults.map(renderGAResultCard)), gaHasSearched && !gaRunning && gaResults.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: 10,
      border: "1px solid var(--border2)",
      borderRadius: 8,
      background: "var(--surface2)",
      color: "var(--muted)",
      fontSize: 13,
      lineHeight: 1.4
    }
  }, uiText(
    "Nenhuma combinação encontrou esses critérios. Tente flexibilizar os limites ou usar mais alimentos da despensa.",
    "No combination matched these criteria. Try relaxing the limits or using more pantry foods.",
    "Ninguna combinación coincidió con estos criterios. Prueba flexibilizar los límites o usar más alimentos de la despensa."
  )))), /*#__PURE__*/React.createElement("div", {
    "data-diary-nutrients": "true",
    "data-expanded": expandMicros ? "true" : "false",
    style: {
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      padding: "12px 20px",
      display: tab === "diario" ? "block" : "none",
      order: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    "data-tutorial": "microLabel",
    onClick: () => setExpandMicros(e => !e),
    style: {
      width: "100%",
      background: "none",
      border: "none",
      color: "var(--muted)",
      padding: "2px 0 8px",
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      textAlign: "left",
      display: "flex",
      justifyContent: "space-between",
      fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("span", null, uiText("Nutrientes", "Nutrients", "Nutrientes")), /*#__PURE__*/React.createElement("span", null, expandMicros ? "\u25B2" : "\u25BC")), expandMicros && /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: "hidden",
      animation: "softIn 220ms ease-out both"
    }
  }, /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.carbs * 10) / 10,
    max: goals.carbs,
    color: "#a96ec8",
    label: text('carbs'),
    unit: "g"
  }), tot.sugars > 0 && /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.sugars * 10) / 10,
    max: 0,
    color: "#a96ec8",
    label: text('sugars'),
    unit: "g",
    sub: true
  }), /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.fat * 10) / 10,
    max: goals.fat,
    color: "#c86e8e",
    label: text('fat'),
    unit: "g"
  }), tot.satfat > 0 && /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.satfat * 10) / 10,
    max: 20,
    color: "#c86e8e",
    label: text('satfat'),
    unit: "g",
    sub: true
  }), /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.fiber * 10) / 10,
    max: goals.fiber,
    color: "#6ec8a9",
    label: text('fiber'),
    unit: "g"
  }), /*#__PURE__*/React.createElement(Bar, {
    value: Math.round(tot.salt * 100) / 100,
    max: goals.salt,
    color: "#888",
    label: text('salt'),
    unit: "g"
  }), renderDailyMicros()))));
      if (section === "content") return tab === "diario" && /*#__PURE__*/React.createElement("div", {
    "data-screen": "diario",
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, allEntries.length === 0 && /*#__PURE__*/React.createElement("div", {
    "data-day-progress-summary": allEntries.length ? "progress" : "empty",
    style: {
      marginBottom: 14,
      order: -1,
      background: diaryStatus.tone === "ok" ? "var(--notif-ok-bg)" : diaryStatus.tone === "warn" ? "var(--notif-err-bg)" : "var(--surface)",
      border: "1px solid " + (diaryStatus.tone === "ok" ? "var(--notif-ok-border)" : diaryStatus.tone === "warn" ? "var(--notif-err-border)" : "var(--border)"),
      borderRadius: 8,
      padding: "12px 14px",
      display: "grid",
      gridTemplateColumns: isMobileView ? "1fr" : "1fr auto",
      gap: 10,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: diaryStatus.tone === "warn" ? "var(--notif-err-text)" : "var(--text2)",
      fontSize: 15,
      fontWeight: 700,
      marginBottom: 4
    }
  }, diaryStatus.title), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 13,
      lineHeight: 1.4
    }
  }, diaryStatus.text)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      justifyContent: isMobileView ? "flex-start" : "flex-end",
      fontSize: 12,
      color: "var(--muted)"
    }
  }, /*#__PURE__*/React.createElement("span", null, dayProteinPct, "% ", uiText("proteína", "protein", "proteína")), /*#__PURE__*/React.createElement("span", null, dayKcalPct, "% kcal"))), /*#__PURE__*/React.createElement("div", {
    "data-diary-content-stack": "true",
    style: {
      marginBottom: 14,
      order: -2,
      background: "var(--surface)",
      borderRadius: 8,
      padding: "8px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => changeViewDate(addDays(viewDate, -1)),
    style: {
      background: "none",
      border: "none",
      color: "var(--muted)",
      cursor: "pointer",
      fontSize: 18,
      padding: "0 8px"
    }
  }, "\u2039"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCalendarOpen(v => !v),
    style: {
      background: "none",
      border: "none",
      textAlign: "center",
      cursor: "pointer",
      fontFamily: "inherit",
      flex: "1 1 180px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: isToday ? "#c8a96e" : "#c9bfb0"
    }
  }, dateLabel(viewDate, lang))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (viewDate < TODAY) changeViewDate(addDays(viewDate, 1));
    },
    style: {
      background: "none",
      border: "none",
      color: viewDate >= TODAY ? "var(--faint)" : "var(--muted)",
      cursor: viewDate >= TODAY ? "default" : "pointer",
      fontSize: 18,
      padding: "0 8px"
    }
  }, "\u203A"), /*#__PURE__*/React.createElement("button", {
    onClick: () => changeViewDate(TODAY),
    disabled: isToday,
    style: {
      ...sBtn("var(--btn-info)", "var(--btn-info-border)", "var(--btn-info-text)"),
      display: isToday ? "none" : "inline-flex",
      opacity: isToday ? 0.45 : 1,
      cursor: isToday ? "default" : "pointer"
    }
  }, uiText("Hoje", "Today", "Hoy"))), calendarOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      borderTop: "1px solid var(--border3)",
      paddingTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCalendarMonth(m => shiftMonth(m, -1)),
    style: sBtn("transparent", "var(--border3)", "var(--muted)")
  }, "\u2039"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text2)",
      textTransform: "uppercase",
      letterSpacing: 1
    }
  }, new Date(calendarMonth + "-01T12:00:00").toLocaleDateString(localeForLang(lang), {month: "long", year: "numeric"})), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const next = shiftMonth(calendarMonth, 1);
      if (next <= TODAY.slice(0, 7)) setCalendarMonth(next);
    },
    disabled: calendarMonth >= TODAY.slice(0, 7),
    style: {
      ...sBtn("transparent", "var(--border3)", "var(--muted)"),
      opacity: calendarMonth >= TODAY.slice(0, 7) ? 0.4 : 1
    }
  }, "\u203A")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
      gap: 4
    }
  }, pickLang(lang, ["D","S","T","Q","Q","S","S"], ["S","M","T","W","T","F","S"], ["D","L","M","X","J","V","S"]).map((d, idx) => /*#__PURE__*/React.createElement("div", {
    key: d + idx,
    style: {
      textAlign: "center",
      color: "var(--muted)",
      fontSize: 11,
      padding: "4px 0"
    }
  }, d)), monthDays(calendarMonth).map((date, idx) => {
    const marker = date ? (calendarData[calendarMonth] || {})[date] : null;
    const selected = date === viewDate;
    const disabled = !date || date > TODAY;
    return /*#__PURE__*/React.createElement("button", {
      key: date || "blank-" + idx,
      disabled,
      onClick: () => date && changeViewDate(date),
      title: marker && marker.hasData ? `${marker.kcal} kcal ? ${marker.protein}g` : "",
      style: {
        minHeight: 40,
        borderRadius: 6,
        border: selected ? "1px solid #c8a96e" : "1px solid var(--border3)",
        background: selected ? "var(--btn-info)" : "transparent",
        color: disabled ? "var(--faint)" : "var(--text2)",
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit",
        padding: 4
      }
    }, date ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13
      }
    }, Number(date.slice(-2))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "center",
        gap: 3,
        marginTop: 4,
        minHeight: 5
      }
    }, marker && /*#__PURE__*/React.createElement("span", {
      "data-calendar-indicator": "protein",
      style: {
        display: "inline-block",
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: marker.proteinMet ? "var(--accent-protein-fill)" : "var(--text-muted)"
      }
    }), marker && /*#__PURE__*/React.createElement("span", {
      "data-calendar-indicator": "kcal",
      style: {
        display: "inline-block",
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: marker.kcalOver ? "var(--accent-danger-fill)" : marker.kcalGood ? "var(--accent-kcal-fill)" : "var(--text-muted)"
      }
    }))) : "");
  })), (() => {
    const ms = calendarMonthStats(calendarData[calendarMonth] || {});
    const legendItem = (color, label) => /*#__PURE__*/React.createElement("span", {
      style: { display: "inline-flex", alignItems: "center", gap: 5 }
    }, /*#__PURE__*/React.createElement("span", {
      style: { width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }
    }), label);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        borderTop: "1px solid var(--border3)",
        paddingTop: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 14px",
        fontSize: 12,
        color: "var(--muted)",
        marginBottom: 10
      }
    }, legendItem("var(--accent-protein-fill)", uiText("Proteína batida", "Protein hit", "Proteína alcanzada")), legendItem("var(--accent-kcal-fill)", uiText("Calorias na faixa", "Calories in range", "Calorías en rango")), legendItem("var(--accent-danger-fill)", uiText("Excesso calórico", "High calorie excess", "Exceso calórico")), legendItem("var(--text-muted)", uiText("Não batido / sem registro", "Not hit / no record", "No alcanzado / sin registro"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 8,
        fontSize: 12,
        color: "var(--text2)"
      }
    }, [
      [uiText("Dias registrados", "Logged days", "Días registrados"), ms.registered],
      [uiText("Dias com proteína", "Protein days", "Días con proteína"), ms.proteinDays],
      [uiText("Média kcal", "Avg kcal", "Media kcal"), ms.avgKcalMonth],
      [uiText("Média proteína", "Avg protein", "Media proteína"), ms.avgProteinMonth + "g"],
      [uiText("Dias com excesso", "Excess days", "Días con exceso"), ms.kcalOverDays]
    ].map(([label, value]) => /*#__PURE__*/React.createElement("div", {
      key: label,
      style: {
        background: "var(--bg)",
        border: "1px solid var(--border3)",
        borderRadius: 6,
        padding: "7px 8px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: { color: "var(--muted)", marginBottom: 2 }
    }, label), /*#__PURE__*/React.createElement("b", null, value)))));
  })(), calendarLoading && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--faint)",
      fontSize: 12,
      textAlign: "center",
      marginTop: 8
    }
  }, uiText("Carregando...", "Loading...", "Cargando..."))), !isToday && (() => {
    const entries = Object.values(activeLog).flat();
    const p = entries.reduce((s, e) => s + (e.protein ?? 0), 0);
    const k = entries.reduce((s, e) => s + (e.kcal ?? 0), 0);
    if (!entries.length) return /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        color: "var(--faint)",
        fontSize: 14,
        fontStyle: "italic",
        marginBottom: 12
      }
    }, text('noRecords'));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--surface)",
        borderRadius: 6,
        padding: "10px 14px",
        marginBottom: 14,
        display: "flex",
        gap: 20,
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#c8a96e"
      }
    }, Math.round(p), text('proteinUnit')), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#8ec8c8"
      }
    }, Math.round(k), " kcal"));
  })(), isToday && /*#__PURE__*/React.createElement("div", {
    "data-water-block": "true",
    style: {
      display: "block",
      background: "var(--surface)",
      border: "1px solid var(--border3)",
      borderRadius: 10,
      padding: "13px 15px",
      marginBottom: 14,
      animation: "softIn 240ms ease-out both"
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
      letterSpacing: 1,
      color: darkMode ? "#3ab88a" : "#1a8a6a",
      textTransform: "uppercase"
    }
    }, text('water')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: totalWater >= goals.water ? "#6ec8a9" : caloriesColor
    }
  }, totalWater, "ml"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--dim)"
    }
  }, "/ ", goals.water, "ml"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--faint)"
    }
  }, "(", viewWeight ? `${isTraining ? 40 : 35}ml/kg` : uiText('padrão', 'default', 'predeterminado'), ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setEditWaterGoal(e => !e),
    style: {
      background: "none",
      border: "none",
      color: "var(--dim)",
      cursor: "pointer",
      fontSize: 11
    }
  }, "\u2699"))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 7,
      background: "var(--track)",
      borderRadius: 999,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: Math.min(totalWater / goals.water * 100, 100) + "%",
      borderRadius: 999,
      background: totalWater >= goals.water ? "#6ec8a9" : caloriesColor,
      transition: "width 420ms cubic-bezier(0.2,0.8,0.2,1), background-color 220ms ease"
    }
  })), editWaterGoal && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 8,
      animation: "softIn 180ms ease-out both"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: waterGoalInput,
    onChange: e => setWaterGoalInput(e.target.value),
    placeholder: text('currentGoal') + ' ' + goals.water + 'ml',
    style: {
      ...inp,
      flex: 1,
      marginTop: 0,
      padding: "6px 10px",
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const v = parseFloat(waterGoalInput);
      if (!isNaN(v) && v > 0) {
        setWaterGoal(v);
        setWaterGoalInput("");
        setEditWaterGoal(false);
      }
    },
    style: {
      background: "var(--btn-ok)",
      border: "1px solid var(--btn-ok-border)",
      color: "var(--btn-ok-text)",
      borderRadius: 999,
      padding: "6px 12px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, "ok")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 5,
      flexWrap: "wrap",
      marginBottom: 8
    }
  }, [150, 200, 250, 330, 500].map(ml => /*#__PURE__*/React.createElement("button", {
    key: ml,
    onClick: () => addWater(ml),
    style: {
      background: "var(--btn-teal)",
      border: "1px solid var(--btn-teal-border)",
      color: darkMode ? "#3ab88a" : "#1a8a6a",
      borderRadius: 999,
      padding: "4px 10px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, ml, "ml")).concat(waterCustomPreset ? /*#__PURE__*/React.createElement("button", {
    key: "custom-water-preset",
    onClick: () => addWater(waterCustomPreset),
    onDoubleClick: configureWaterCustomPreset,
    title: uiText("Medida personalizada. Clique duas vezes para editar.", "Custom bottle size. Double-click to edit.", "Medida personalizada. Haz doble clic para editar."),
    style: {
      background: "var(--btn-teal)",
      border: "1px solid var(--btn-teal-border)",
      color: darkMode ? "#3ab88a" : "#1a8a6a",
      borderRadius: 999,
      padding: "4px 10px",
      fontSize: 14,
      cursor: "pointer",
      fontWeight: 700
    }
  }, waterCustomPreset, "ml") : []).concat(/*#__PURE__*/React.createElement("button", {
    key: "configure-water-preset",
    onClick: configureWaterCustomPreset,
    title: uiText("Salvar uma medida rápida personalizada", "Save a custom quick amount", "Guardar una medida rápida personalizada"),
    style: {
      background: "transparent",
      border: "1px dashed var(--btn-teal-border)",
      color: darkMode ? "#3ab88a" : "#1a8a6a",
      borderRadius: 999,
      padding: "4px 11px",
      fontSize: 14,
      cursor: "pointer",
      fontWeight: 700
    }
  }, "+"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: waterInput,
    onChange: e => setWaterInput(e.target.value),
    placeholder: uiText('outro valor em ml', 'other value in ml', 'otro valor en ml'),
    style: {
      ...inp,
      flex: 1,
      marginTop: 0,
      padding: "6px 10px",
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => addWater(),
    style: {
      background: "var(--btn-teal)",
      border: "1px solid var(--btn-teal-border)",
      color: darkMode ? "#3ab88a" : "#1a8a6a",
      borderRadius: 6,
      padding: "6px 12px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, "+")), waterIntake.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: "flex",
      flexWrap: "wrap",
      gap: 5
    }
  }, waterIntake.map(e => /*#__PURE__*/React.createElement("div", {
    key: e.id,
    style: {
      background: "var(--btn-teal)",
      border: "1px solid var(--btn-teal-border)",
      borderRadius: 999,
      padding: "3px 8px",
      fontSize: 14,
      color: darkMode ? "#3ab88a" : "#1a8a6a",
      display: "flex",
      gap: 5,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", null, e.ml, "ml ", e.time), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeWater(e.id),
    style: {
      background: "none",
      border: "none",
      color: "#3a6a6a",
      cursor: "pointer",
      fontSize: 14,
      padding: 0
    }
  }, "\xD7"))))), suppLog.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      borderBottom: "1px solid var(--border3)",
      paddingBottom: 5,
      marginBottom: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      letterSpacing: 1,
      color: "var(--muted2)",
      textTransform: "uppercase"
    }
  }, ` ${text('suppTitle')}`)), suppLog.map(e => /*#__PURE__*/React.createElement("div", {
    key: e.id,
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "6px 0",
      borderBottom: "1px solid #181818"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--text2)"
    }
  }, e.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--dim)",
      marginLeft: 8
    }
  }, e.dose, e.unit), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--faint)",
      marginLeft: 8
    }
  }, e.time)), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeSuppLog(e.id),
    style: {
      background: "none",
      border: "none",
      color: "var(--dim)",
      cursor: "pointer",
      fontSize: 16
    }
  }, "\xD7")))), MEALS.map(meal => {
    const entries = activeLog[meal] || [];
    const mp = entries.reduce((s, e) => s + (e.protein ?? 0), 0);
    const mk = entries.reduce((s, e) => s + (e.kcal ?? 0), 0);
    const mealHasOpenMenu = entries.some(e => e.id === entryMenuId);
    return /*#__PURE__*/React.createElement("div", {
      key: meal,
      "data-diary-meal-card": "true",
      className: "meal-section-card",
      style: {
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
        zIndex: mealHasOpenMenu ? 500 : "auto",
        overflow: "visible",
        marginBottom: 12,
        background: "var(--surface)",
        border: "1px solid var(--border3)",
        borderRadius: 10,
        padding: isMobileView ? "12px" : "13px 15px",
        animation: "softIn 260ms ease-out both"
      }
    }, /*#__PURE__*/React.createElement("div", {
      "data-diary-meal-header": "true",
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
        paddingBottom: entries.length ? 9 : 0,
        borderBottom: entries.length ? "1px solid var(--border3)" : "none"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        letterSpacing: 1,
        color: "var(--muted2)",
        textTransform: "uppercase",
        marginBottom: 3
      }
    }, mealLabel(meal)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: entries.length ? "var(--muted)" : "var(--faint)"
      }
    }, entries.length ? entries.length + " item" + (entries.length !== 1 ? "s" : "") : uiText("Sem alimentos registrados", "No food logged", "Sin alimentos registrados"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginLeft: "auto"
      }
    }, entries.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right",
        fontSize: 12,
        lineHeight: 1.35,
        whiteSpace: "nowrap"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: proteinColor,
        fontWeight: 700
      }
    }, Math.round(mp), "g ", uiText("prot.", "protein", "prot.")), /*#__PURE__*/React.createElement("div", {
      style: {
        color: caloriesColor,
        fontWeight: 700
      }
    }, Math.round(mk), " kcal")), /*#__PURE__*/React.createElement("button", {
      "data-tutorial": "open-log-sheet",
      onClick: () => openAddForMeal(meal),
      style: {
        background: "var(--btn-ok)",
        border: "1px solid var(--btn-ok-border)",
        color: "var(--btn-ok-text)",
        borderRadius: 999,
        padding: isMobileView ? "7px 10px" : "7px 12px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontFamily: "inherit"
      }
    }, "+ ", uiText("Adicionar", "Add", "Agregar"))), /*#__PURE__*/React.createElement("div", {
      "data-diary-meal-items": "true",
      style: {
        display: "block",
        width: "100%",
        clear: "both"
      }
    }, entries.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--faint)",
        fontSize: 13,
        paddingTop: 10,
        lineHeight: 1.4
      }
    }, uiText("Use + Adicionar para registrar algo aqui.", "Use + Add to log something here.", "Usa + Agregar para registrar algo aquí.")) : entries.map(e => /*#__PURE__*/React.createElement("div", {
      key: e.id,
      style: {
        position: "relative",
        zIndex: entryMenuId === e.id ? 300 : "auto"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        padding: "9px 0",
        borderBottom: "1px solid var(--border3)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, editEntryId === e.id ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: editEntryQty,
      onChange: ev => setEditEntryQty(ev.target.value),
      style: {
        ...inp,
        width: 80,
        marginTop: 0,
        padding: "4px 8px",
        fontSize: 13
      },
      autoFocus: true
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: "var(--muted)"
      }
    }, e.unit), /*#__PURE__*/React.createElement("button", {
      onClick: () => saveEntryEdit(meal),
      style: {
        background: "var(--btn-ok)",
        border: "1px solid var(--btn-ok-border)",
        color: "var(--btn-ok-text)",
        borderRadius: 4,
        padding: "3px 8px",
        fontSize: 14,
        cursor: "pointer"
      }
    }, "\u2713"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setEditEntryId(null),
      style: {
        background: "none",
        border: "none",
        color: "var(--muted)",
        cursor: "pointer",
        fontSize: 13
      }
    }, "\u2715")) : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--text2)",
        fontWeight: 600,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, e.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--muted)"
      }
    }, e.qty, e.unit, e.time ? " · " + e.time : ""))), editEntryId !== e.id && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        position: "relative",
        zIndex: entryMenuId === e.id ? 200 : 1,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: proteinColor,
        fontWeight: 700
      }
    }, Math.round(e.protein ?? 0), "g"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: caloriesColor,
        fontWeight: 700
      }
    }, Math.round(e.kcal ?? 0), "kcal"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setEntryMenuId(entryMenuId === e.id ? null : e.id),
      style: {
        background: "var(--btn-inactive)",
        border: "1px solid var(--btn-inactive-border)",
        color: "var(--muted)",
        borderRadius: 999,
        cursor: "pointer",
        fontSize: 16,
        width: 30,
        height: 28,
        lineHeight: "22px"
      }
    }, "\u22EF"), entryMenuId === e.id && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        zIndex: 1000,
        minWidth: 150,
        background: "var(--surface)",
        border: "1px solid var(--border2)",
        borderRadius: 8,
        padding: 5,
        boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
        animation: "softScaleIn 160ms ease-out both"
      }
    }, [[uiText("Detalhes", "Details", "Detalles"), () => {
      setDetailFood(detailFood === e.id ? null : e.id);
      setEntryMenuId(null);
    }], [uiText("Editar quantidade", "Edit amount", "Editar cantidad"), () => {
      startEditEntry(e);
      setEntryMenuId(null);
    }], [uiText("Duplicar", "Duplicate", "Duplicar"), () => duplicateEntry(meal, e)], [uiText("Excluir", "Delete", "Eliminar"), () => removeEntry(meal, e.id)]].map(([label, action], idx) => /*#__PURE__*/React.createElement("button", {
      key: label,
      onClick: action,
      style: {
        width: "100%",
        background: "none",
        border: "none",
        borderTop: idx === 3 ? "1px solid var(--border3)" : "none",
        color: idx === 3 ? "var(--btn-warn-text)" : "var(--text2)",
        padding: "8px 9px",
        textAlign: "left",
        borderRadius: 6,
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 13
      }
    }, label))))))))))
  }), false && allEntries.length === 0 && isToday && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center", padding: "32px 16px 16px",
    }
  },
    /*#__PURE__*/React.createElement("div", { style: { fontSize: 40, marginBottom: 12 } }, "\uD83C\uDF7D\uFE0F"),
    /*#__PURE__*/React.createElement("p", { style: {
      color: "var(--text2)", fontSize: 15, fontWeight: 500, margin: "0 0 6px"
    } }, uiText("Nenhum alimento registrado hoje", "Nothing logged yet today", "Ningún alimento registrado hoy")),
    /*#__PURE__*/React.createElement("p", { style: {
      color: "var(--muted)", fontSize: 14, margin: "0 0 20px", lineHeight: 1.5
    } }, uiText(
      "Toque em + para registrar o que você comeu",
      "Tap + to add what you've eaten",
      "Toca + para registrar lo que comiste"
    )),
    pantry.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--btn-ok)", border: "1px solid var(--btn-ok-border)",
        borderRadius: 12, padding: "14px 16px", marginBottom: 12, textAlign: "left"
      }
    },
      /*#__PURE__*/React.createElement("p", { style: {
        color: "var(--btn-ok-text)", fontSize: 14, margin: "0 0 10px", fontWeight: 500
      } }, "\uD83D\uDCA1 " + uiText("Dica: Comece adicionando alimentos em Alimentos", "Tip: Start by adding foods to Foods", "Consejo: empieza agregando alimentos en Alimentos")),
      /*#__PURE__*/React.createElement("button", {
        onClick: () => setTab("despensa"),
        style: {
          background: "var(--btn-ok-text)", border: "none", color: "#fff",
          borderRadius: 8, padding: "8px 16px", fontSize: 14,
          cursor: "pointer", fontFamily: "inherit", fontWeight: 500
        }
      }, uiText("Ir para Alimentos \u2192", "Go to Foods \u2192", "Ir a Alimentos \u2192"))
    ),
    /*#__PURE__*/React.createElement("button", {
      onClick: () => openAddForMeal(MEALS[0]),
      style: {
        background: "var(--accent, #4a9a4a)", border: "none", color: "#fff",
        borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600,
        cursor: "pointer", fontFamily: "inherit"
      }
    }, uiText("+ Adicionar alimento", "+ Add food", "+ Agregar alimento"))
  ), /*#__PURE__*/React.createElement("div", {
    style: { marginTop: 20 }
  },
    /*#__PURE__*/React.createElement("button", {
      onClick: () => setNotesOpen(o => !o),
      style: {
        width: "100%", background: "none", border: "none",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 0", cursor: "pointer", fontFamily: "inherit"
      }
    },
      /*#__PURE__*/React.createElement("span", { style: lbl }, text('notesTitle')),
      /*#__PURE__*/React.createElement("span", {
        style: { color: "var(--muted)", fontSize: 14, transition: "transform 0.2s",
          display: "inline-block", transform: notesOpen ? "rotate(180deg)" : "rotate(0deg)" }
      }, notesOpen ? "\u25B2" : "\u25BC")
    ),
    notesOpen && /*#__PURE__*/React.createElement("textarea", {
      value: isToday ? todayNote : historyNote,
      onChange: e => isToday ? setTodayNote(e.target.value) : setHistoryNote(e.target.value),
      placeholder: text('notesPlaceholder'),
      style: { ...inp, height: 72, resize: "vertical", marginTop: 4 }
    })
  ), suppPantry.length > 0 && isToday && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowSuppAdd(s => !s),
    style: {
      ...btn,
      background: "var(--btn-info)",
      border: "1px solid var(--border-info)",
      color: "var(--btn-info-text)",
      fontSize: 14,
      letterSpacing: 1,
      marginTop: 0
    }
  }, text('suppRegister')), showSuppAdd && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: suppAddId,
    onChange: e => setSuppAddId(e.target.value),
    style: {
      ...inp,
      flex: 2,
      marginTop: 0,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, uiText("\u2014 selecione \u2014", "\u2014 select \u2014", "\u2014 seleccionar \u2014")), suppPantry.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name, " (", s.dose, s.unit, ")"))), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: suppAddDose,
    onChange: e => setSuppAddDose(e.target.value),
    placeholder: "dose",
    style: {
      ...inp,
      flex: 1,
      marginTop: 0,
      padding: "8px 10px"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: logSupp,
    style: {
      background: "var(--btn-ok)",
      border: "1px solid var(--btn-ok-border)",
      color: "var(--btn-ok-text)",
      borderRadius: 6,
      padding: "0 12px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, "\u2713"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => generateFeedback("day"),
    "data-action-insight": "true",
    disabled: feedbackLoading && feedbackPeriod === "day",
    style: {
      width: "100%",
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: feedbackLoading && feedbackPeriod === "day" ? "#555" : "#c8a0e8",
      padding: "10px",
      borderRadius: 6,
      fontSize: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: "inherit"
    }
  }, feedbackLoading && feedbackPeriod === "day" ? text('analyzing') : text('analyzeDayBtn'))), feedbackText && feedbackPeriod === "day" && /*#__PURE__*/React.createElement("div", {
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
  }, "Feedback \u2014 ", viewDate), /*#__PURE__*/React.createElement("div", {
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
  }, uiText("\u2713 Já salvo nas notas", "\u2713 Already saved to notes", "\u2713 Ya guardado en las notas")) : /*#__PURE__*/React.createElement("button", {
    onClick: saveFeedbackAsNote,
    style: {
      ...btn,
      marginTop: 12,
      background: "var(--btn-info)",
      border: "1px solid var(--btn-info-border)",
      color: "#7e9ec8",
      fontSize: 14,
      letterSpacing: 1
    }
  }, text('savedNote'))),

  opaqueTrailingNode));
      return null;
    }

    return { DiaryScreen };
  }

  return { createDiaryScreen };
});
