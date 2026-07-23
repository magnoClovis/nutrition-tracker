/**
 * Recharts-based presentation components for weight, BMR, and body composition.
 *
 * All calculated series come from `body-metrics-model.js`. The host injects
 * React, Recharts, and `pickLang`, and retains the current visibility gates:
 * weight/BMR/body-fat charts require more than one point, optional series are
 * omitted when empty, and a numeric target of zero remains hidden because the
 * existing rendering uses a truthy check.
 *
 * @module BodyMetricsCharts
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BodyMetricsCharts = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the chart components with explicit runtime dependencies.
   *
   * @param {Object} dependencies Injected dependencies.
   * @param {Object} dependencies.React React runtime supplied by the host.
   * @param {Object} dependencies.Recharts Recharts runtime supplied by the host.
   * @param {function(string,string,string,string): string} dependencies.pickLang Language picker from `i18n.js`.
   * @returns {Object} Body-metrics chart component API.
   */
  function createBodyMetricsCharts({ React, Recharts, pickLang }) {
    if (!React || typeof React.createElement !== "function" || !Recharts || typeof pickLang !== "function") {
      throw new TypeError("BodyMetricsCharts requires React, Recharts, and pickLang");
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

    /**
     * Renders one optional body metric series.
     *
     * @param {Object} props Chart props.
     * @param {Object} props.config `{key,title,label,unit,color,target?,data}`.
     * @param {boolean} props.isMobileView Whether mobile sizing is active.
     * @param {Object} props.chartTheme Existing chart color snapshot.
     * @param {string} props.targetLabel Localized target prefix.
     * @returns {Object} React chart card.
     */
    function BodyMetricChart({ config, isMobileView, chartTheme, targetLabel }) {
      if (!config || !Array.isArray(config.data) || config.data.length === 0) return null;
      return React.createElement("div", {
        style: {
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "14px", minWidth: 0
        }
      }, React.createElement("div", {
        style: {
          fontSize: 14, letterSpacing: 1, color: "var(--muted)",
          textTransform: "uppercase", marginBottom: 12
        }
      }, config.title), React.createElement(ResponsiveContainer, {
        width: "100%",
        height: isMobileView ? 190 : 150
      }, React.createElement(LineChart, {
        data: config.data
      }, React.createElement(XAxis, {
        dataKey: "date",
        tick: { fontSize: 12, fill: chartTheme.tick },
        axisLine: false,
        tickLine: false
      }), React.createElement(YAxis, {
        tick: { fontSize: 12, fill: chartTheme.tick },
        axisLine: false,
        tickLine: false,
        domain: ["auto", "auto"],
        width: 38
      }), React.createElement(Tooltip, {
        contentStyle: {
          background: chartTheme.bg,
          border: "1px solid " + chartTheme.border,
          borderRadius: 4,
          fontSize: 14,
          color: chartTheme.label
        },
        labelStyle: { color: chartTheme.label },
        formatter: value => [
          Math.round(Number(value) * 10) / 10 + config.unit,
          config.label
        ]
      }), config.target ? React.createElement(ReferenceLine, {
        y: config.target,
        stroke: "#8ec8c8",
        strokeDasharray: "4 4",
        label: {
          value: targetLabel + config.target + config.unit,
          fill: chartTheme.tick,
          fontSize: 11
        }
      }) : null, React.createElement(Line, {
        type: "monotone",
        dataKey: "value",
        stroke: config.color,
        strokeWidth: 2,
        dot: { fill: config.color, r: 3 },
        activeDot: { r: 5 }
      }))));
    }

    /**
     * Renders the existing weight-trend chart.
     *
     * @param {Object} props Chart props.
     * @param {Array<Object>} props.data Weight chart series.
     * @param {string} props.title Localized title.
     * @param {boolean} props.visible Current metrics-section visibility.
     * @param {boolean} props.isMobileView Whether mobile sizing is active.
     * @param {Object} props.chartTheme Existing chart color snapshot.
     * @returns {Object} React chart card.
     */
    function WeightTrendChart({ data, title, visible, isMobileView, chartTheme }) {
      if (!Array.isArray(data) || data.length <= 1) return null;
      return React.createElement("div", {
        "data-tutorial": "weight-chart",
        style: {
          display: visible ? "block" : "none",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: isMobileView ? 12 : 8,
          padding: isMobileView ? "12px" : "14px",
          marginBottom: 14
        }
      }, React.createElement("div", {
        style: {
          fontSize: 14, letterSpacing: 1, color: "var(--muted)",
          textTransform: "uppercase", marginBottom: 12
        }
      }, title), React.createElement(ResponsiveContainer, {
        width: "100%",
        height: isMobileView ? 210 : 150
      }, React.createElement(LineChart, {
        data
      }, React.createElement(XAxis, {
        dataKey: "date",
        tick: { fontSize: 14, fill: chartTheme.tick },
        axisLine: false,
        tickLine: false
      }), React.createElement(YAxis, {
        tick: { fontSize: 14, fill: chartTheme.tick },
        axisLine: false,
        tickLine: false,
        domain: ["auto", "auto"],
        width: 32
      }), React.createElement(Tooltip, {
        contentStyle: {
          background: chartTheme.bg,
          border: "1px solid " + chartTheme.border,
          borderRadius: 4,
          fontSize: 14,
          color: chartTheme.label
        },
        labelStyle: { color: chartTheme.label },
        itemStyle: { color: "#c8a96e" }
      }), React.createElement(Line, {
        type: "monotone",
        dataKey: "weight",
        stroke: "#c8a96e",
        strokeWidth: 2,
        dot: { fill: "#c8a96e", r: 3 },
        activeDot: { r: 5 }
      }))));
    }

    /**
     * Renders the existing basal-metabolic-rate trend chart.
     *
     * @param {Object} props Chart props.
     * @param {Array<Object>} props.data BMR chart series.
     * @param {string} props.title Localized title.
     * @param {boolean} props.visible Current metrics-section visibility.
     * @param {boolean} props.isMobileView Whether mobile sizing is active.
     * @param {Object} props.chartTheme Existing chart color snapshot.
     * @returns {Object} React chart card.
     */
    function BmrTrendChart({ data, title, visible, isMobileView, chartTheme }) {
      if (!Array.isArray(data) || data.length <= 1) return null;
      return React.createElement("div", {
        "data-tutorial": "bmr-chart",
        style: {
          display: visible ? "block" : "none",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: isMobileView ? 12 : 8,
          padding: isMobileView ? "12px" : "14px",
          marginBottom: 14
        }
      }, React.createElement("div", {
        style: {
          fontSize: 14, letterSpacing: 1, color: "var(--muted)",
          textTransform: "uppercase", marginBottom: 12
        }
      }, title), React.createElement(ResponsiveContainer, {
        width: "100%",
        height: isMobileView ? 210 : 150
      }, React.createElement(LineChart, { data }, React.createElement(XAxis, {
        dataKey: "date", tick: { fontSize: 14, fill: chartTheme.tick }, axisLine: false, tickLine: false
      }), React.createElement(YAxis, {
        tick: { fontSize: 14, fill: chartTheme.tick }, axisLine: false, tickLine: false,
        domain: ["auto", "auto"], width: 42
      }), React.createElement(Tooltip, {
        contentStyle: {
          background: chartTheme.bg, border: "1px solid " + chartTheme.border,
          borderRadius: 4, fontSize: 14, color: chartTheme.label
        },
        labelStyle: { color: chartTheme.label },
        itemStyle: { color: "#8ec8c8" },
        formatter: value => [value + " kcal", "TMB"]
      }), React.createElement(Line, {
        type: "monotone", dataKey: "bmr", stroke: "#8ec8c8", strokeWidth: 2,
        dot: { fill: "#8ec8c8", r: 3 }, activeDot: { r: 5 }
      }))));
    }

    /**
     * Renders the body-fat series and optional target line.
     *
     * @param {Object} props Chart props.
     * @param {Array<Object>} props.data Body-fat series.
     * @param {number|null} props.targetPct Body-fat target; zero remains hidden.
     * @param {string} props.lang Active language.
     * @param {boolean} props.isMobileView Whether mobile sizing is active.
     * @returns {Object} React chart card.
     */
    function BodyFatTrendChart({ data, targetPct, lang, isMobileView }) {
      if (!Array.isArray(data) || data.length <= 1) return null;
      return React.createElement("div", {
        style: {
          height: isMobileView ? 230 : 180,
          border: "1px solid var(--border3)",
          borderRadius: 8,
          padding: "8px 8px 2px",
          background: "var(--bg)",
          marginTop: 10
        }
      }, React.createElement("div", {
        style: {
          color: "var(--muted)", fontSize: 12, textTransform: "uppercase",
          letterSpacing: 1, marginBottom: 4
        }
      }, pickLang(lang, "Evolu\u00e7\u00e3o da gordura corporal", "Body-fat evolution", "Evoluci\u00f3n de la grasa corporal")), React.createElement(ResponsiveContainer, {
        width: "100%",
        height: isMobileView ? 190 : 140
      }, React.createElement(LineChart, {
        data
      }, React.createElement(XAxis, {
        dataKey: "label",
        stroke: "var(--muted)",
        tick: { fill: "var(--muted)", fontSize: 11 }
      }), React.createElement(YAxis, {
        stroke: "var(--muted)",
        tick: { fill: "var(--muted)", fontSize: 11 },
        domain: ["auto", "auto"],
        unit: "%"
      }), React.createElement(Tooltip, {
        contentStyle: {
          background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)"
        },
        formatter: value => [
          Math.round(value * 10) / 10 + "%",
          pickLang(lang, "Gordura corporal", "Body fat", "Grasa corporal")
        ]
      }), targetPct ? React.createElement(ReferenceLine, {
        y: targetPct,
        stroke: "#8ec8c8",
        strokeDasharray: "4 4",
        label: {
          value: pickLang(lang, "Meta", "Target", "Meta"),
          fill: "var(--muted)",
          fontSize: 11
        }
      }) : null, React.createElement(Line, {
        type: "monotone",
        dataKey: "bodyFatPct",
        stroke: "#c86e8e",
        strokeWidth: 2,
        dot: { r: 3 },
        activeDot: { r: 5 }
      }))));
    }

    return { BodyMetricChart, WeightTrendChart, BmrTrendChart, BodyFatTrendChart };
  }

  return { createBodyMetricsCharts };
});
