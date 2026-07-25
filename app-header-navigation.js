/**
 * Presentational application header and primary navigation.
 *
 * The UMD factory receives React explicitly. All localized text, state and
 * environmental actions are supplied by the NutritionTracker controller.
 * In particular, language/theme persistence, external links and the two
 * ephemeral menu states remain outside this module.
 *
 * Known behavior intentionally preserved:
 * - navigation has no request sequencing for the tutorial gate;
 * - the language submenu can remain expanded after the gear menu is toggled;
 * - the Add screen remains a pseudo-tab and is absent from the primary list.
 *
 * @module AppHeaderNavigation
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AppHeaderNavigationModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the application header with an explicit React dependency.
   *
   * @param {Object} dependencies Injected dependencies.
   * @param {Object} dependencies.React React runtime supplied by the host.
   * @returns {{AppHeaderNavigation: function(Object): Object}} Component API.
   */
  function createAppHeaderNavigation({ React }) {
    if (!React || typeof React.createElement !== "function") {
      throw new TypeError("AppHeaderNavigation requires React");
    }

    const h = React.createElement;

    function separator(key) {
      return h("div", {
        key,
        style: { height: "1px", background: "var(--border3)", margin: "2px 6px" }
      });
    }

    function renderMenuAction(action, index) {
      return h(React.Fragment, { key: action.key || index },
        separator(`separator-${action.key || index}`),
        h("button", {
          onClick: action.onClick,
          style: {
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            background: "none",
            border: "none",
            color: action.tone === "danger" ? "#c87e7e" : "var(--text2)",
            padding: "10px 12px",
            borderRadius: 6,
            fontSize: 14,
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "inherit"
          }
        }, h("span", { style: { fontSize: 16 } }, action.icon),
        h("span", null, action.label))
      );
    }

    function renderNavigation({ activeTab, isMobileView, navItems, onOpenTab, diaryPlacement }) {
      return h("div", {
        "data-app-nav": "true",
        style: diaryPlacement ? {
          display: "flex",
          gap: isMobileView ? 8 : 0,
          borderTop: "1px solid var(--border3)",
          borderBottom: "1px solid var(--border)",
          marginTop: 10,
          marginLeft: isMobileView ? -14 : -20,
          marginRight: isMobileView ? -14 : -20,
          overflowX: isMobileView ? "auto" : "visible",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: isMobileView ? "none" : "auto",
          padding: isMobileView ? "0 12px" : 0,
          background: "var(--surface)",
          animation: "softIn 220ms ease-out both"
        } : {
          display: "flex",
          gap: isMobileView ? 8 : 0,
          borderBottom: "1px solid var(--border)",
          marginTop: 0,
          overflowX: isMobileView ? "auto" : "visible",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: isMobileView ? "none" : "auto",
          padding: isMobileView ? "0 12px" : 0,
          background: "var(--surface)",
          order: 2,
          animation: "softIn 220ms ease-out both"
        }
      }, navItems.map(item => h("button", {
        "data-tutorial": "tab-" + item.key,
        key: item.key,
        onClick: () => onOpenTab(item.key),
        style: {
          flex: isMobileView ? "0 0 auto" : 1,
          minWidth: isMobileView ? 96 : 0,
          padding: isMobileView ? "10px 14px" : "10px 0",
          background: activeTab === item.key ? "var(--tab-active)" : "transparent",
          border: "none",
          borderBottom: activeTab === item.key ? "2px solid #c8a96e" : "2px solid transparent",
          color: activeTab === item.key ? "#c8a96e" : "#444",
          fontSize: 14,
          fontWeight: 400,
          letterSpacing: 1,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          cursor: "pointer"
        }
      }, item.label)));
    }

    function renderMiniProgress(item, isMobileView) {
      const pct = Math.max(0, Math.min(100, item.goal ? item.value / item.goal * 100 : 0));
      return h("div", {
        key: item.label,
        style: {
          minWidth: isMobileView ? 120 : 180,
          flex: "1 1 180px",
          padding: "0 4px"
        }
      }, h("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "baseline",
          marginBottom: 4
        }
      }, h("span", {
        style: {
          color: "var(--muted)",
          fontSize: 11,
          letterSpacing: 1,
          textTransform: "uppercase"
        }
      }, item.label), h("span", {
        style: {
          color: item.value > item.goal ? "var(--btn-warn-text)" : item.color,
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap"
        }
      }, Math.round(item.value), " / ", item.goal, item.unit)), h("div", {
        style: {
          height: 5,
          borderRadius: 999,
          background: "var(--track)",
          overflow: "hidden"
        }
      }, h("div", {
        style: {
          width: pct + "%",
          height: "100%",
          borderRadius: 999,
          background: item.value > item.goal ? "var(--btn-warn-text)" : item.color
        }
      })));
    }

    function renderGoalToast(goalToast, isMobileView) {
      if (!goalToast) return null;
      const isWarning = goalToast.tone === "warning";
      return h("div", {
        style: {
          position: "fixed",
          top: isMobileView ? 10 : 14,
          left: "50%",
          zIndex: 10050,
          width: isMobileView ? "calc(100% - 24px)" : "min(560px, calc(100% - 32px))",
          transform: `translate(-50%, ${goalToast.visible ? "0" : "-120%"})`,
          opacity: goalToast.visible ? 1 : 0,
          transition: "transform 420ms ease, opacity 420ms ease",
          pointerEvents: "none",
          background: isWarning ? "#fff7df" : "#e7f5e8",
          border: `1px solid ${isWarning ? "#d9bd6a" : "#91cf96"}`,
          color: isWarning ? "#7a5b13" : "#1f6b2b",
          borderRadius: 8,
          boxShadow: "0 10px 26px rgba(0,0,0,0.12)",
          padding: isMobileView ? "10px 12px" : "12px 16px",
          display: "flex",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between"
        }
      }, h("div", { style: { minWidth: 0 } },
        h("div", {
          style: {
            fontSize: isMobileView ? 13 : 14,
            fontWeight: 700,
            lineHeight: 1.25
          }
        }, goalToast.text),
        h("div", {
          style: {
            fontSize: isMobileView ? 12 : 13,
            color: isWarning ? "#8b6a1c" : "#2f7b39",
            marginTop: 2
          }
        }, goalToast.detail)
      ), h("div", {
        style: { flex: "0 0 auto", fontSize: 18, lineHeight: 1 }
      }, isWarning ? "!" : "\u2713"));
    }

    function renderNotification(notification) {
      if (!notification) return null;
      const isErr = notification.startsWith("Erro") || notification.startsWith("Error");
      return h("div", {
        style: {
          margin: "8px 16px 0",
          background: isErr ? "var(--notif-err-bg)" : "var(--notif-ok-bg)",
          border: `1px solid ${isErr ? "var(--notif-err-border)" : "var(--notif-ok-border)"}`,
          color: isErr ? "var(--notif-err-text)" : "var(--notif-ok-text)",
          padding: "7px 14px",
          borderRadius: 6,
          fontSize: 14,
          textAlign: "center",
          order: 8
        }
      }, notification);
    }

    /**
     * Renders the application header, status strip and primary tab navigation.
     *
     * @param {Object} props Fully resolved presentation state and callbacks.
     * @param {string} props.activeTab Current controller-owned tab key.
     * @param {boolean} props.isMobileView Whether the mobile layout is active.
     * @param {string} props.title Localized application title.
     * @param {string} props.dateText Localized visible-date text.
     * @param {boolean} props.menuOpen Controller-owned gear-menu state.
     * @param {boolean} props.languageMenuOpen Controller-owned language submenu state.
     * @param {Array<Object>} props.languageOptions Resolved language options.
     * @param {Array<Object>} props.menuActions Resolved menu actions.
     * @param {Array<Object>} props.navItems Resolved primary navigation items.
     * @param {function(string): void} props.onOpenTab Tab-selection callback.
     * @returns {Object} React element for the header and navigation.
     */
    function AppHeaderNavigation(props) {
      const {
        activeTab,
        isMobileView,
        title,
        dateText,
        menuOpen,
        languageMenuOpen,
        onToggleMenu,
        onCloseMenu,
        onToggleLanguageMenu,
        languageFlag,
        languageLabel,
        languageOptions,
        onSelectLanguage,
        darkModeLabel,
        onToggleDarkMode,
        menuActions,
        tickerNode,
        dayOfLabel,
        isTraining,
        onToggleDayType,
        trainingLabel,
        restLabel,
        currentWeight,
        bmi,
        bmiLabel,
        metricsTitle,
        onOpenMetrics,
        navItems,
        onOpenTab,
        miniProgressItems,
        summaryNode,
        goalToast,
        notification
      } = props;

      return h(React.Fragment, null, h("div", {
        "data-app-header": "true",
        "data-active-tab": activeTab,
        style: {
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: isMobileView ? "10px 14px 8px" : "12px 20px 10px",
          position: "sticky",
          top: 0,
          zIndex: 80,
          boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
          transition: "padding 240ms ease, box-shadow 240ms ease, background-color 240ms ease",
          display: "flex",
          flexDirection: "column"
        }
      }, h("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          order: 0
        }
      }, h("div", null,
        h("div", {
          "data-header-title": "true",
          style: {
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: 0,
            color: "var(--text)",
            textTransform: "none",
            marginBottom: 2
          }
        }, title),
        h("div", {
          style: { fontSize: 12.5, color: "var(--text3)", fontStyle: "italic" }
        }, dateText)
      ), h("div", {
        style: { position: "relative", display: "flex", alignItems: "center", gap: 6 }
      }, h("button", {
        onClick: onToggleMenu,
        "data-tutorial": "menu-settings",
        style: {
          background: menuOpen ? "var(--input)" : "none",
          border: "1px solid var(--border2)",
          color: "var(--muted)",
          borderRadius: 6,
          padding: "6px 10px",
          fontSize: 14,
          cursor: "pointer",
          lineHeight: 1
        }
      }, "\u2699"), menuOpen && h(React.Fragment, null,
        h("div", {
          onClick: onCloseMenu,
          style: { position: "fixed", inset: 0, zIndex: 99 }
        }),
        h("div", {
          style: {
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 100,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "6px",
            minWidth: 200,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
          }
        }, h("div", {
          style: { padding: "4px 6px", borderRadius: 8 }
        }, h("button", {
          onClick: onToggleLanguageMenu,
          style: {
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            background: "none",
            border: "none",
            color: "var(--text2)",
            padding: "10px 12px",
            borderRadius: 6,
            fontSize: 14,
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "inherit"
          }
        }, h("span", {
          style: { fontSize: 16, width: 22, textAlign: "center" }
        }, languageFlag), h("span", {
          style: { flex: 1 }
        }, languageLabel), h("span", {
          style: {
            fontSize: 12,
            color: "var(--muted)",
            transform: languageMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 160ms ease"
          }
        }, "\u25BE")), h("div", {
          style: {
            overflow: "hidden",
            maxHeight: languageMenuOpen ? 180 : 0,
            opacity: languageMenuOpen ? 1 : 0,
            transform: languageMenuOpen ? "translateY(0)" : "translateY(-4px)",
            transition: "max-height 180ms ease, opacity 160ms ease, transform 160ms ease",
            border: languageMenuOpen ? "1px solid var(--border2)" : "1px solid transparent",
            borderRadius: 8,
            background: "var(--bg)",
            marginTop: 4
          }
        }, languageOptions.map(option => h("button", {
          key: option.code,
          onClick: () => onSelectLanguage(option.code),
          style: {
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            background: option.isCurrent ? "var(--btn-ok)" : "transparent",
            border: "none",
            borderTop: "1px solid var(--border2)",
            color: option.isCurrent ? "var(--btn-ok-text)" : "var(--text2)",
            padding: "10px 12px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 13,
            textAlign: "left"
          }
        }, h("span", null, option.flag + " " + option.label),
        option.isCurrent ? h("span", null, "\u2713") : null)))),
        separator("dark-mode-separator"),
        h("button", {
          onClick: onToggleDarkMode,
          style: {
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            background: "none",
            border: "none",
            color: "var(--text2)",
            padding: "10px 12px",
            borderRadius: 6,
            fontSize: 14,
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "inherit"
          }
        }, h("span", { style: { fontSize: 16 } }, ""), h("span", null, darkModeLabel)),
        menuActions.map(renderMenuAction)
        )
      ))), h("div", {
        "data-header-status-chip": "true",
        style: {
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 10,
          order: 1
        }
      }, tickerNode, h("span", {
        style: { fontSize: 14, color: "var(--muted)" }
      }, dayOfLabel), h("button", {
        "data-tutorial": "day-type",
        onClick: onToggleDayType,
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          fontFamily: "inherit"
        }
      }, h("div", {
        style: {
          width: 52,
          height: 28,
          borderRadius: 14,
          background: isTraining ? "var(--toggle-train-border)" : "var(--toggle-rest-border)",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)"
        }
      }, h("div", {
        style: {
          position: "absolute",
          top: 3,
          left: isTraining ? 27 : 3,
          width: 22,
          height: 22,
          borderRadius: 11,
          background: "#ffffff",
          transition: "left 0.2s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "none"
        }
      })), h("span", {
        style: {
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 1,
          color: isTraining ? "var(--toggle-train-text)" : "var(--toggle-rest-text)"
        }
      }, isTraining ? trainingLabel : restLabel)), currentWeight && h("button", {
        onClick: onOpenMetrics,
        title: metricsTitle,
        style: {
          background: "none",
          border: "none",
          fontSize: 14,
          color: "var(--muted)",
          marginLeft: "auto",
          cursor: "pointer",
          fontFamily: "inherit",
          padding: 0
        }
      }, currentWeight, "kg", bmi ? ` \u00b7 ${bmiLabel} ${bmi}` : ""))),
      activeTab === "diario" && renderNavigation({
        activeTab,
        isMobileView,
        navItems,
        onOpenTab,
        diaryPlacement: true
      }),
      h("div", {
        style: {
          display: activeTab === "diario" ? "none" : "flex",
          gap: isMobileView ? 10 : 18,
          alignItems: "center",
          marginTop: 10,
          padding: isMobileView ? "0 4px" : "0 8px",
          boxSizing: "border-box",
          animation: "softIn 240ms ease-out both",
          order: 3
        }
      }, miniProgressItems.map(item => renderMiniProgress(item, isMobileView))),
      summaryNode,
      renderGoalToast(goalToast, isMobileView),
      renderNotification(notification),
      activeTab !== "diario" && renderNavigation({
        activeTab,
        isMobileView,
        navItems,
        onOpenTab,
        diaryPlacement: false
      }));
    }

    return { AppHeaderNavigation };
  }

  return { createAppHeaderNavigation };
});
