/**
 * Searchable app-local selector for long or dynamic option collections.
 *
 * SearchableChoiceField always uses a bottom sheet: its option count can change
 * at runtime and the search input is part of the component's accessibility
 * contract. Selection is immediate and preserves the exact supplied value.
 *
 * @module SearchableChoiceField
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SearchableChoiceFieldModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function createSearchableChoiceField({ React }) {
    if (!React || typeof React.createElement !== "function") {
      throw new TypeError("SearchableChoiceField requires a React runtime");
    }

    function normalizeText(value) {
      return String(value == null ? "" : value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase();
    }

    function normalizeOptions(options) {
      return (Array.isArray(options) ? options : []).map(option => {
        if (option && typeof option === "object") {
          return {
            value: String(option.value == null ? "" : option.value),
            label: String(option.label == null ? option.value ?? "" : option.label),
            disabled: Boolean(option.disabled),
            description: option.description == null ? undefined : String(option.description),
            mark: option.mark == null ? undefined : String(option.mark)
          };
        }
        return { value: String(option), label: String(option), disabled: false };
      });
    }

    function filterOptions(options, query) {
      const normalizedQuery = normalizeText(query).trim();
      if (!normalizedQuery) return options;
      return options.filter(option => normalizeText(
        `${option.label} ${option.description || ""}`
      ).includes(normalizedQuery));
    }

    function initialsFor(label) {
      const words = String(label || "").trim().split(/\s+/).filter(Boolean);
      if (!words.length) return "";
      return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toLocaleUpperCase();
    }

    function ChevronIcon() {
      return React.createElement("svg", {
        viewBox: "0 0 24 24", width: 20, height: 20, fill: "none",
        stroke: "currentColor", strokeWidth: "1.35", strokeLinecap: "round",
        strokeLinejoin: "round", "aria-hidden": "true"
      }, React.createElement("path", { d: "m7.4 9.5 4.6 4.7 4.6-4.7" }));
    }

    function SearchIcon() {
      return React.createElement("svg", {
        viewBox: "0 0 24 24", width: 20, height: 20, fill: "none",
        stroke: "currentColor", strokeWidth: "1.45", strokeLinecap: "round",
        strokeLinejoin: "round", "aria-hidden": "true"
      }, React.createElement("circle", { cx: "10.7", cy: "10.7", r: "5.7" }),
      React.createElement("path", { d: "m15 15 4.3 4.3" }));
    }

    function CloseIcon() {
      return React.createElement("svg", {
        viewBox: "0 0 24 24", width: 20, height: 20, fill: "none",
        stroke: "currentColor", strokeWidth: "1.35", strokeLinecap: "round",
        "aria-hidden": "true"
      }, React.createElement("path", { d: "m7 7 10 10M17 7 7 17" }));
    }

    function SelectionIcon() {
      return React.createElement("svg", {
        viewBox: "0 0 24 24", width: 20, height: 20, fill: "none",
        stroke: "currentColor", strokeWidth: "1.45", strokeLinecap: "round",
        strokeLinejoin: "round", "aria-hidden": "true"
      }, React.createElement("path", { d: "m5.7 12.2 4 4 8.7-9" }));
    }

    function SearchableChoiceField({
      id,
      label,
      value,
      options,
      onChange,
      placeholder = "—",
      helperText,
      searchPlaceholder = "Search",
      closeLabel = "Close",
      clearSearchLabel = "Clear search",
      resultsHint,
      resultCountLabel = count => String(count),
      noResultsTitle = "No results",
      noResultsMessage,
      disabled = false,
      required = false,
      name,
      describedBy,
      className,
      style
    }) {
      const generatedId = React.useId();
      const baseId = id || `searchable-choice-field-${generatedId.replace(/:/g, "")}`;
      const triggerId = `${baseId}-trigger`;
      const titleId = `${baseId}-title`;
      const helpId = helperText ? `${baseId}-help` : undefined;
      const searchId = `${baseId}-search`;
      const listId = `${baseId}-listbox`;
      const resultStatusId = `${baseId}-result-status`;
      const normalizedOptions = normalizeOptions(options);
      const selectedOption = normalizedOptions.find(option => option.value === String(value)) || null;
      const [open, setOpen] = React.useState(false);
      const [query, setQuery] = React.useState("");
      const [activeIndex, setActiveIndex] = React.useState(0);
      const filteredOptions = filterOptions(normalizedOptions, query);
      const triggerRef = React.useRef(null);
      const dialogRef = React.useRef(null);
      const inputRef = React.useRef(null);
      const optionRefs = React.useRef([]);

      React.useEffect(() => {
        if (!open || typeof document === "undefined") return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const frame = requestAnimationFrame(() => inputRef.current?.focus());
        return () => {
          cancelAnimationFrame(frame);
          document.body.style.overflow = previousOverflow;
        };
      }, [open]);

      React.useEffect(() => {
        setActiveIndex(0);
        optionRefs.current = [];
      }, [query, open]);

      function openField() {
        if (disabled) return;
        setQuery("");
        setOpen(true);
      }

      function closeField({ restoreFocus = true } = {}) {
        setOpen(false);
        setQuery("");
        if (restoreFocus && typeof requestAnimationFrame === "function") {
          requestAnimationFrame(() => triggerRef.current?.focus());
        }
      }

      function selectOption(option) {
        if (option.disabled) return;
        if (typeof onChange === "function") onChange(option.value);
        closeField();
      }

      function enabledIndexes() {
        return filteredOptions
          .map((option, index) => option.disabled ? -1 : index)
          .filter(index => index >= 0);
      }

      function focusOption(index) {
        if (index == null || index < 0) return;
        setActiveIndex(index);
        optionRefs.current[index]?.focus();
      }

      function moveOptionFocus(fromIndex, direction) {
        const candidates = enabledIndexes();
        if (!candidates.length) return;
        const position = Math.max(0, candidates.indexOf(fromIndex));
        focusOption(candidates[(position + direction + candidates.length) % candidates.length]);
      }

      function handleOptionKeyDown(event, index, option) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          moveOptionFocus(index, 1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          moveOptionFocus(index, -1);
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          const candidates = enabledIndexes();
          focusOption(event.key === "Home" ? candidates[0] : candidates[candidates.length - 1]);
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectOption(option);
        }
      }

      function handleDialogKeyDown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeField();
          return;
        }
        if (event.key !== "Tab" || !dialogRef.current) return;
        const focusable = Array.from(dialogRef.current.querySelectorAll(
          "input:not(:disabled), button:not(:disabled)"
        ));
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

      function renderOption(option, index) {
        return React.createElement("button", {
          ref: node => { optionRefs.current[index] = node; },
          key: option.value,
          id: `${baseId}-option-${index}`,
          type: "button",
          role: "option",
          disabled: option.disabled,
          "aria-selected": option.value === String(value),
          tabIndex: index === activeIndex ? 0 : -1,
          "data-searchable-choice-field-option": "true",
          onFocus: () => setActiveIndex(index),
          onKeyDown: event => handleOptionKeyDown(event, index, option),
          onClick: () => selectOption(option)
        }, React.createElement("span", {
          "data-searchable-choice-field-mark": "true", "aria-hidden": "true"
        }, option.mark || initialsFor(option.label)), React.createElement("span", {
          "data-searchable-choice-field-option-copy": "true"
        }, React.createElement("span", {
          "data-searchable-choice-field-option-label": "true"
        }, option.label), option.description ? React.createElement("span", {
          "data-searchable-choice-field-option-description": "true"
        }, option.description) : null), option.value === String(value)
          ? React.createElement("span", {
            "data-searchable-choice-field-selection": "true"
          }, React.createElement(SelectionIcon))
          : React.createElement("span", { "aria-hidden": "true" }));
      }

      return React.createElement("div", {
        className,
        style,
        "data-searchable-choice-field": "true"
      }, React.createElement("label", {
        htmlFor: triggerId,
        "data-searchable-choice-field-label": "true"
      }, label), React.createElement("button", {
        ref: triggerRef,
        id: triggerId,
        type: "button",
        disabled,
        "aria-haspopup": "dialog",
        "aria-expanded": open,
        "aria-controls": open ? listId : undefined,
        "aria-describedby": describedBy,
        "data-searchable-choice-field-trigger": "true",
        onClick: () => open ? closeField({ restoreFocus: false }) : openField(),
        onKeyDown: event => {
          if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
            event.preventDefault();
            openField();
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            closeField();
          }
        }
      }, React.createElement("span", null, selectedOption ? selectedOption.label : placeholder),
      React.createElement("span", {
        "data-searchable-choice-field-chevron": "true"
      }, React.createElement(ChevronIcon))), name ? React.createElement("input", {
        type: "hidden", name, value: selectedOption ? selectedOption.value : "", required
      }) : null, open ? React.createElement("div", {
        "data-searchable-choice-field-overlay": "true",
        onMouseDown: event => {
          if (event.target === event.currentTarget) closeField();
        }
      }, React.createElement("section", {
        ref: dialogRef,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": titleId,
        "aria-describedby": helpId,
        "data-searchable-choice-field-sheet": "true",
        onKeyDown: handleDialogKeyDown
      }, React.createElement("div", {
        "data-searchable-choice-field-handle": "true", "aria-hidden": "true"
      }), React.createElement("div", {
        "data-searchable-choice-field-heading": "true"
      }, React.createElement("div", null, React.createElement("h2", {
        id: titleId
      }, label), helperText ? React.createElement("p", {
        id: helpId
      }, helperText) : null), React.createElement("button", {
        type: "button", "aria-label": closeLabel,
        "data-searchable-choice-field-close": "true",
        onClick: () => closeField()
      }, React.createElement(CloseIcon))), React.createElement("div", {
        "data-searchable-choice-field-search": "true"
      }, React.createElement("span", {
        "data-searchable-choice-field-search-icon": "true"
      }, React.createElement(SearchIcon)), React.createElement("input", {
        ref: inputRef,
        id: searchId,
        type: "text",
        role: "combobox",
        inputMode: "search",
        enterKeyHint: "search",
        autoComplete: "off",
        value: query,
        placeholder: searchPlaceholder,
        "aria-autocomplete": "list",
        "aria-expanded": "true",
        "aria-controls": listId,
        "aria-describedby": resultStatusId,
        "data-searchable-choice-field-input": "true",
        onChange: event => setQuery(event.target.value),
        onKeyDown: event => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            const first = enabledIndexes()[0];
            focusOption(first);
          }
        }
      }), query ? React.createElement("button", {
        type: "button",
        "aria-label": clearSearchLabel,
        "data-searchable-choice-field-clear": "true",
        onClick: () => {
          setQuery("");
          requestAnimationFrame(() => inputRef.current?.focus());
        }
      }, React.createElement(CloseIcon)) : null), React.createElement("div", {
        id: resultStatusId,
        "data-searchable-choice-field-result-meta": "true",
        "aria-live": "polite"
      }, React.createElement("span", {
        "data-searchable-choice-field-result-count": "true"
      }, resultCountLabel(filteredOptions.length)), resultsHint ? React.createElement("span", null, resultsHint) : null),
      React.createElement("div", {
        id: listId,
        role: "listbox",
        "aria-labelledby": titleId,
        "data-searchable-choice-field-results": "true"
      }, filteredOptions.length ? filteredOptions.map(renderOption) : React.createElement("div", {
        "data-searchable-choice-field-empty": "true"
      }, React.createElement("strong", null, noResultsTitle), noResultsMessage
        ? React.createElement("span", null, noResultsMessage)
        : null, query ? React.createElement("button", {
          type: "button",
          onClick: () => {
            setQuery("");
            requestAnimationFrame(() => inputRef.current?.focus());
          }
        }, clearSearchLabel) : null)))) : null);
    }

    return { SearchableChoiceField, normalizeOptions, filterOptions, initialsFor };
  }

  return { createSearchableChoiceField };
});
