/**
 * Reusable React presentation primitives for nutrition progress and root errors.
 *
 * The UMD module exposes a `createUiPrimitives` factory. The host application
 * injects its already-loaded React instance explicitly; the module does not
 * read `window.React` and has no dependency on the app's domain modules.
 * Components accept plain React props and return React elements or `null`.
 *
 * @module UiPrimitives
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.UiPrimitives = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the UI-primitives API with React supplied by the host.
   *
   * @param {Object} dependencies Injected UI dependencies.
   * @param {Object} dependencies.React React runtime already loaded by the host application.
   * @returns {Object} React progress primitives and the root error boundary.
   */
  function createUiPrimitives({ React }) {
    if (!React || typeof React.createElement !== "function" || typeof React.Component !== "function") {
      throw new TypeError("UiPrimitives requires a React runtime");
    }

    /**
     * Renders a circular SVG progress indicator.
     *
     * @param {Object} props Ring presentation values.
     * @param {number} props.value Current progress value.
     * @param {number} props.max Maximum target value.
     * @param {string} props.color Normal progress color.
     * @param {number} [props.size=76] SVG width and height in pixels.
     * @param {number} [props.stroke=7] Circle stroke width in pixels.
     * @returns {Object} React SVG element for the progress ring.
     */
    function Ring({
      value,
      max,
      color,
      size = 76,
      stroke = 7
    }) {
      const r = (size - stroke) / 2,
        circ = 2 * Math.PI * r,
        offset = circ * (1 - Math.min(value / max, 1));
      return /*#__PURE__*/React.createElement("svg", {
        width: size,
        height: size,
        style: {
          transform: "rotate(-90deg)"
        }
      }, /*#__PURE__*/React.createElement("circle", {
        cx: size / 2,
        cy: size / 2,
        r: r,
        fill: "none",
        stroke: "var(--track)",
        strokeWidth: stroke
      }), /*#__PURE__*/React.createElement("circle", {
        cx: size / 2,
        cy: size / 2,
        r: r,
        fill: "none",
        stroke: value > max ? "#ff4d4d" : color,
        strokeWidth: stroke,
        strokeDasharray: circ,
        strokeDashoffset: offset,
        strokeLinecap: "round",
        style: {
          transition: "stroke-dashoffset 0.5s ease"
        }
      }));
    }

    /**
     * Renders a labeled horizontal progress bar.
     *
     * @param {Object} props Bar presentation values.
     * @param {number} props.value Current progress value.
     * @param {number} props.max Maximum target value; falsy values omit the bar.
     * @param {string} props.color Normal progress color.
     * @param {string} props.label Display label.
     * @param {string} props.unit Display unit.
     * @param {boolean} [props.sub=false] Whether the row is visually nested.
     * @returns {Object|null} React bar element, or `null` when `max` is falsy.
     */
    function Bar({
      value,
      max,
      color,
      label,
      unit,
      sub
    }) {
      if (!max) return null;
      const over = value > max;
      return /*#__PURE__*/React.createElement("div", {
        style: {
          marginBottom: sub ? 4 : 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: sub ? 10 : 11,
          color: sub ? "#555" : "#777",
          paddingLeft: sub ? 10 : 0
        }
      }, sub ? "\u21B3 " : "", label), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14,
          color: over ? "#ff4d4d" : color
        }
      }, value % 1 === 0 ? value : value.toFixed(1), unit, /*#__PURE__*/React.createElement("span", {
        style: {
          color: "var(--dim)",
          fontSize: 10
        }
      }, " / ", max, unit))), /*#__PURE__*/React.createElement("div", {
        style: {
          height: sub ? 3 : 5,
          background: "var(--track)",
          borderRadius: 4
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          height: "100%",
          width: Math.min(value / max * 100, 100) + "%",
          borderRadius: 4,
          background: over ? "#ff4d4d" : color,
          transition: "width 0.4s ease"
        }
      })));
    }

    /**
     * Catches descendant render errors and presents the existing full-screen fallback.
     *
     * @param {Object} props Error-boundary props.
     * @param {*} props.children Descendant React content protected by the boundary.
     * @returns {Object|*} The fallback React element after an error, otherwise the children.
     */
    class ErrorBoundary extends React.Component {
      constructor(props) { super(props); this.state = {error: null}; }
      static getDerivedStateFromError(e) { return {error: e}; }
      componentDidCatch(e, info) { console.error('App crash:', e, info); }
      render() {
        if (this.state.error) {
          return React.createElement('div', {style:{
            position:'fixed',top:0,left:0,right:0,bottom:0,background:'var(--surface)',
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
            gap:12,padding:20,textAlign:'center'
          }},
            React.createElement('div', {style:{color:'#c87e7e',fontSize:13,letterSpacing:2}}, 'ERRO'),
            React.createElement('div', {style:{color:'#c87e7e',fontSize:11,maxWidth:360}},
              (this.state.error.message||String(this.state.error)).toUpperCase()
            ),
            React.createElement('button', {
              onClick:()=>this.setState({error:null}),
              style:{marginTop:20,background:'none',border:'1px solid #333',color:'#555',
                borderRadius:6,padding:'8px 16px',fontSize:11,cursor:'pointer'}
            }, 'RETRY / TENTAR')
          );
        }
        return this.props.children;
      }
    }

    return { Ring, Bar, ErrorBoundary };
  }

  return { createUiPrimitives };
});
