/**
 * Reusable, controlled list selector presented in a Trofia bottom sheet.
 *
 * The UMD module receives React explicitly and owns presentation state only.
 * The host remains responsible for the selected value and persistence.
 *
 * @module ChoiceField
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ChoiceFieldModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function createChoiceField({ React }) {
    if (!React || typeof React.createElement !== "function" || typeof React.useState !== "function") {
      throw new TypeError("ChoiceField requires a React runtime");
    }

    function ChevronIcon() {
      return React.createElement("svg", {
        viewBox: "0 0 16 16",
        width: 18,
        height: 18,
        fill: "none",
        "aria-hidden": "true",
        focusable: "false"
      }, React.createElement("path", {
        d: "M3.75 6.25 8 10.15l4.25-3.9",
        stroke: "currentColor",
        strokeWidth: 1.35,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        vectorEffect: "non-scaling-stroke"
      }));
    }

    function SelectionIcon() {
      return React.createElement("svg", {
        viewBox: "0 0 20 20",
        width: 20,
        height: 20,
        fill: "none",
        "aria-hidden": "true",
        focusable: "false"
      }, React.createElement("path", {
        d: "M3.45 10.35 7.2 13.5C9.65 10.2 12.15 7.2 16.55 3.75",
        stroke: "currentColor",
        strokeWidth: 1.45,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        vectorEffect: "non-scaling-stroke"
      }));
    }

    function CloseIcon() {
      return React.createElement("svg", {
        viewBox: "0 0 16 16",
        width: 18,
        height: 18,
        fill: "none",
        "aria-hidden": "true",
        focusable: "false"
      }, React.createElement("path", {
        d: "m4.25 4.25 7.5 7.5m0-7.5-7.5 7.5",
        stroke: "currentColor",
        strokeWidth: 1.25,
        strokeLinecap: "round",
        vectorEffect: "non-scaling-stroke"
      }));
    }

    function normalizeOptions(options) {
      return (Array.isArray(options) ? options : []).map(option => {
        if (option && typeof option === "object") {
          return {
            value: String(option.value),
            label: String(option.label ?? option.value),
            disabled: !!option.disabled
          };
        }
        return { value: String(option), label: String(option), disabled: false };
      });
    }

    function ChoiceField({
      id,
      label,
      value,
      options,
      onChange,
      placeholder = "—",
      helperText,
      closeLabel = "Close",
      disabled = false,
      required = false,
      name,
      describedBy
    }) {
      const generatedId = React.useId();
      const baseId = id || `choice-field-${generatedId.replace(/:/g, "")}`;
      const triggerId = `${baseId}-trigger`;
      const titleId = `${baseId}-title`;
      const helpId = helperText ? `${baseId}-help` : undefined;
      const listId = `${baseId}-listbox`;
      const normalizedOptions = normalizeOptions(options);
      const selectedIndex = normalizedOptions.findIndex(option => option.value === String(value));
      const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : null;
      const [open, setOpen] = React.useState(false);
      const [activeIndex, setActiveIndex] = React.useState(Math.max(selectedIndex, 0));
      const triggerRef = React.useRef(null);
      const dialogRef = React.useRef(null);
      const optionRefs = React.useRef([]);

      React.useEffect(() => {
        if (!open || typeof document === "undefined") return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const focusIndex = selectedIndex >= 0 ? selectedIndex : normalizedOptions.findIndex(option => !option.disabled);
        setActiveIndex(Math.max(focusIndex, 0));
        const frame = requestAnimationFrame(() => optionRefs.current[Math.max(focusIndex, 0)]?.focus());
        return () => {
          cancelAnimationFrame(frame);
          document.body.style.overflow = previousOverflow;
        };
      }, [open]);

      function openSheet() {
        if (!disabled) setOpen(true);
      }

      function closeSheet({ restoreFocus = true } = {}) {
        setOpen(false);
        if (restoreFocus && typeof requestAnimationFrame === "function") {
          requestAnimationFrame(() => triggerRef.current?.focus());
        }
      }

      function selectOption(option) {
        if (option.disabled) return;
        if (typeof onChange === "function") onChange(option.value);
        closeSheet();
      }

      function moveFocus(fromIndex, direction) {
        if (!normalizedOptions.length) return;
        let nextIndex = fromIndex;
        do {
          nextIndex = (nextIndex + direction + normalizedOptions.length) % normalizedOptions.length;
        } while (normalizedOptions[nextIndex].disabled && nextIndex !== fromIndex);
        setActiveIndex(nextIndex);
        optionRefs.current[nextIndex]?.focus();
      }

      function handleOptionKeyDown(event, index, option) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          moveFocus(index, 1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          moveFocus(index, -1);
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          const candidates = normalizedOptions
            .map((candidate, candidateIndex) => candidate.disabled ? -1 : candidateIndex)
            .filter(candidateIndex => candidateIndex >= 0);
          const nextIndex = event.key === "Home" ? candidates[0] : candidates[candidates.length - 1];
          if (nextIndex != null) {
            setActiveIndex(nextIndex);
            optionRefs.current[nextIndex]?.focus();
          }
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectOption(option);
        }
      }

      function handleDialogKeyDown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeSheet();
          return;
        }
        if (event.key !== "Tab" || !dialogRef.current) return;
        const focusable = Array.from(dialogRef.current.querySelectorAll("button:not(:disabled)"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }

      return React.createElement("div", {
        "data-choice-field": "true"
      }, React.createElement("label", {
        htmlFor: triggerId,
        "data-choice-field-label": "true"
      }, label), React.createElement("button", {
        ref: triggerRef,
        id: triggerId,
        type: "button",
        disabled,
        "aria-haspopup": "listbox",
        "aria-expanded": open,
        "aria-controls": open ? listId : undefined,
        "aria-describedby": describedBy,
        "data-choice-field-trigger": "true",
        onClick: openSheet,
        onKeyDown: event => {
          if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
            event.preventDefault();
            openSheet();
          }
        }
      }, React.createElement("span", null, selectedOption ? selectedOption.label : placeholder), React.createElement("span", {
        "data-choice-field-chevron": "true"
      }, React.createElement(ChevronIcon))), name ? React.createElement("input", {
        type: "hidden",
        name,
        value: selectedOption ? selectedOption.value : "",
        required
      }) : null, open ? React.createElement("div", {
        "data-choice-field-overlay": "true",
        onMouseDown: event => {
          if (event.target === event.currentTarget) closeSheet();
        }
      }, React.createElement("section", {
        ref: dialogRef,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": titleId,
        "aria-describedby": helpId,
        "data-choice-field-sheet": "true",
        onKeyDown: handleDialogKeyDown
      }, React.createElement("div", {
        "data-choice-field-handle": "true",
        "aria-hidden": "true"
      }), React.createElement("div", {
        "data-choice-field-heading": "true"
      }, React.createElement("div", null, React.createElement("h2", {
        id: titleId
      }, label), helperText ? React.createElement("p", {
        id: helpId
      }, helperText) : null), React.createElement("button", {
        type: "button",
        "aria-label": closeLabel,
        "data-choice-field-close": "true",
        onClick: () => closeSheet()
      }, React.createElement(CloseIcon))), React.createElement("div", {
        id: listId,
        role: "listbox",
        "aria-labelledby": titleId,
        "data-choice-field-options": "true"
      }, normalizedOptions.map((option, index) => React.createElement("button", {
        ref: node => { optionRefs.current[index] = node; },
        key: option.value,
        type: "button",
        role: "option",
        disabled: option.disabled,
        "aria-selected": option.value === String(value),
        tabIndex: index === activeIndex ? 0 : -1,
        "data-choice-field-option": "true",
        onFocus: () => setActiveIndex(index),
        onKeyDown: event => handleOptionKeyDown(event, index, option),
        onClick: () => selectOption(option)
      }, React.createElement("span", null, option.label), option.value === String(value)
        ? React.createElement("span", { "data-choice-field-selection": "true" }, React.createElement(SelectionIcon))
        : null))))) : null);
    }

    return { ChoiceField, normalizeOptions };
  }

  return { createChoiceField };
});
