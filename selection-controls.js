/**
 * Reusable native-semantic selection controls for Trofia.
 *
 * CheckboxField owns only the presentation of an independent/multiple choice.
 * Its native checkbox remains the accessible source of truth for keyboard and
 * assistive technology. Circular marks stay reserved for exclusive choices and
 * switch-shaped controls for persistent on/off preferences.
 *
 * SliderField keeps a native range input, including min/max/step and keyboard
 * behavior, while exposing the approved One UI 8 visual track and value output.
 *
 * @module SelectionControls
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SelectionControlsModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function createSelectionControls({ React }) {
    if (!React || typeof React.createElement !== "function" || typeof React.useId !== "function") {
      throw new TypeError("SelectionControls requires a React runtime");
    }

    function CheckIcon() {
      return React.createElement("svg", {
        viewBox: "0 0 20 20",
        width: 16,
        height: 16,
        fill: "none",
        "aria-hidden": "true",
        focusable: "false"
      }, React.createElement("path", {
        d: "M4.2 10.1 8.15 14 15.9 6.25",
        stroke: "currentColor",
        strokeWidth: 1.65,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        vectorEffect: "non-scaling-stroke"
      }));
    }

    function CheckboxField({
      id,
      label,
      description,
      checked = false,
      onChange,
      disabled = false,
      required = false,
      name,
      value,
      describedBy,
      compact = false,
      className,
      style
    }) {
      const generatedId = React.useId();
      const inputId = id || `checkbox-field-${generatedId.replace(/:/g, "")}`;
      const descriptionId = description ? `${inputId}-description` : undefined;
      const ariaDescribedBy = [describedBy, descriptionId].filter(Boolean).join(" ") || undefined;

      return React.createElement("label", {
        className,
        style,
        "data-checkbox-field": "true",
        "data-checkbox-field-checked": checked ? "true" : "false",
        "data-checkbox-field-compact": compact ? "true" : undefined
      }, React.createElement("input", {
        id: inputId,
        type: "checkbox",
        checked: !!checked,
        disabled,
        required,
        name,
        value,
        "aria-describedby": ariaDescribedBy,
        "data-checkbox-field-input": "true",
        onChange: event => {
          if (typeof onChange === "function") onChange(event.target.checked, event);
        }
      }), React.createElement("span", {
        "data-checkbox-field-mark": "true",
        "aria-hidden": "true"
      }, React.createElement(CheckIcon)), React.createElement("span", {
        "data-checkbox-field-copy": "true"
      }, React.createElement("span", {
        "data-checkbox-field-label": "true"
      }, label), description ? React.createElement("span", {
        id: descriptionId,
        "data-checkbox-field-description": "true"
      }, description) : null));
    }

    function normalizeRangeNumber(value, fallback) {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : fallback;
    }

    function SliderField({
      id,
      label,
      value,
      onChange,
      min = 0,
      max = 100,
      step = 1,
      valueText,
      minLabel,
      centerLabel,
      maxLabel,
      tone = "action",
      disabled = false,
      name,
      describedBy,
      className,
      style
    }) {
      const generatedId = React.useId();
      const inputId = id || `slider-field-${generatedId.replace(/:/g, "")}`;
      const minNumber = normalizeRangeNumber(min, 0);
      const maxNumber = normalizeRangeNumber(max, 100);
      const valueNumber = normalizeRangeNumber(value, minNumber);
      const boundedValue = Math.min(Math.max(valueNumber, minNumber), maxNumber);
      const progress = maxNumber > minNumber
        ? ((boundedValue - minNumber) / (maxNumber - minNumber)) * 100
        : 0;
      const outputText = valueText == null ? String(value ?? "") : String(valueText);
      const hasScale = minLabel != null || centerLabel != null || maxLabel != null;
      const normalizedTone = tone === "protein" ? "protein" : "action";

      return React.createElement("div", {
        className,
        style,
        "data-slider-field": "true",
        "data-slider-field-tone": normalizedTone
      }, React.createElement("div", {
        "data-slider-field-heading": "true"
      }, React.createElement("label", {
        htmlFor: inputId,
        "data-slider-field-label": "true"
      }, label), React.createElement("output", {
        htmlFor: inputId,
        "data-slider-field-value": "true"
      }, outputText)), React.createElement("input", {
        id: inputId,
        type: "range",
        min: minNumber,
        max: maxNumber,
        step,
        value: boundedValue,
        disabled,
        name,
        "aria-valuetext": outputText,
        "aria-describedby": describedBy,
        "data-slider-field-input": "true",
        style: { "--slider-field-progress": `${progress}%` },
        onChange: event => {
          if (typeof onChange === "function") onChange(Number(event.target.value), event);
        }
      }), hasScale ? React.createElement("div", {
        "data-slider-field-scale": "true",
        "aria-hidden": "true"
      }, React.createElement("span", null, minLabel), React.createElement("span", null, centerLabel), React.createElement("span", null, maxLabel)) : null);
    }

    return { CheckboxField, SliderField };
  }

  return { createSelectionControls };
});
