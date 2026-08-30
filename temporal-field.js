/**
 * Controlled, app-local time and civil-date selectors for Trofia.
 *
 * TemporalField intentionally uses a locale-independent 24-hour value contract
 * (`HH:mm` and `YYYY-MM-DD`). All visible copy is supplied by the host, so the app language —
 * never the operating-system picker locale — controls the interface.
 *
 * @module TemporalField
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TemporalFieldModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function createTemporalField({ React }) {
    if (!React || typeof React.createElement !== "function" || typeof React.useState !== "function") {
      throw new TypeError("TemporalField requires a React runtime");
    }

    function padPart(value) {
      return String(Number(value) || 0).padStart(2, "0");
    }

    function parseTime(value, fallback = "00:00") {
      const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
      if (match) {
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return { hour, minute };
      }
      if (fallback !== value) return parseTime(fallback, "00:00");
      return { hour: 0, minute: 0 };
    }

    function formatTime(hour, minute) {
      return `${padPart(hour)}:${padPart(minute)}`;
    }

    function stepTimePart(time, part, delta, minuteStep = 5) {
      const current = parseTime(formatTime(time?.hour, time?.minute));
      if (part === "hour") {
        return { ...current, hour: (current.hour + delta + 24) % 24 };
      }
      const nextMinute = (current.minute + delta * minuteStep) % 60;
      return { ...current, minute: nextMinute < 0 ? nextMinute + 60 : nextMinute };
    }

    function daysInMonth(year, month) {
      return new Date(Date.UTC(year, month, 0)).getUTCDate();
    }

    function parseIsoDate(value) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
      if (!match) return null;
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
      return { year, month, day };
    }

    function formatIsoDate(year, month, day) {
      return `${String(year).padStart(4, "0")}-${padPart(month)}-${padPart(day)}`;
    }

    function shiftCivilMonth(parts, delta) {
      const serial = parts.year * 12 + parts.month - 1 + delta;
      const year = Math.floor(serial / 12);
      const month = ((serial % 12) + 12) % 12 + 1;
      return { year, month, day: Math.min(parts.day, daysInMonth(year, month)) };
    }

    function clampIsoDate(parts, min, max) {
      const iso = formatIsoDate(parts.year, parts.month, parts.day);
      const minParts = parseIsoDate(min);
      const maxParts = parseIsoDate(max);
      if (minParts && iso < min) return minParts;
      if (maxParts && iso > max) return maxParts;
      return parts;
    }

    function localeDate(parts, locale, options) {
      return new Intl.DateTimeFormat(locale || "en-US", { ...options, timeZone: "UTC" })
        .format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
    }

    function nowTime(nowProvider) {
      const now = typeof nowProvider === "function" ? nowProvider() : new Date();
      return {
        hour: Number(now?.getHours?.()) || 0,
        minute: Number(now?.getMinutes?.()) || 0
      };
    }

    function PlusIcon() {
      return React.createElement("svg", {
        viewBox: "0 0 20 20", width: 20, height: 20, fill: "none",
        stroke: "currentColor", strokeWidth: 1.35, strokeLinecap: "round",
        "aria-hidden": "true", focusable: "false"
      }, React.createElement("path", { d: "M10 4.25v11.5M4.25 10h11.5" }));
    }

    function MinusIcon() {
      return React.createElement("svg", {
        viewBox: "0 0 20 20", width: 20, height: 20, fill: "none",
        stroke: "currentColor", strokeWidth: 1.35, strokeLinecap: "round",
        "aria-hidden": "true", focusable: "false"
      }, React.createElement("path", { d: "M4.25 10h11.5" }));
    }

    function BackspaceIcon() {
      return React.createElement("svg", {
        viewBox: "0 0 24 24", width: 21, height: 21, fill: "none",
        stroke: "currentColor", strokeWidth: 1.35, strokeLinecap: "round",
        strokeLinejoin: "round", "aria-hidden": "true", focusable: "false"
      }, React.createElement("path", { d: "M9.2 5.5h9.1a2.2 2.2 0 0 1 2.2 2.2v8.6a2.2 2.2 0 0 1-2.2 2.2H9.2L3.5 12l5.7-6.5Z" }),
      React.createElement("path", { d: "m12 9 6 6m0-6-6 6" }));
    }

    function NumericKeypad({
      titleId,
      label,
      value,
      minValue = 0,
      maxValue,
      maxLength = 2,
      allowDecimal = false,
      maxDecimals = 2,
      decimalLabel = "Decimal separator",
      confirmLabel,
      cancelLabel,
      backspaceLabel,
      invalidLabel,
      onConfirm,
      onCancel
    }) {
      const keypadValue = value == null ? "" : String(value);
      const [buffer, setBuffer] = React.useState(allowDecimal ? keypadValue.replace(".", ",") : keypadValue);
      const replaceOnNextDigit = React.useRef(true);
      React.useEffect(() => {
        setBuffer(allowDecimal ? keypadValue.replace(".", ",") : keypadValue);
        replaceOnNextDigit.current = true;
      }, [value, allowDecimal]);
      const normalizedBuffer = buffer.replace(",", ".").replace(/\.$/, "");
      const numericValue = normalizedBuffer === "" ? NaN : Number(normalizedBuffer);
      const valid = Number.isFinite(numericValue)
        && (allowDecimal || Number.isInteger(numericValue))
        && numericValue >= minValue
        && numericValue <= maxValue;

      function appendDigit(digit) {
        setBuffer(current => {
          if (replaceOnNextDigit.current) {
            replaceOnNextDigit.current = false;
            return digit;
          }
          const decimalIndex = current.indexOf(",");
          if (decimalIndex >= 0 && current.length - decimalIndex - 1 >= maxDecimals) return current;
          if (current.replace(",", "").length >= maxLength) return current;
          return current === "0" ? digit : `${current}${digit}`;
        });
      }

      function appendDecimal() {
        if (!allowDecimal) return;
        setBuffer(current => {
          if (replaceOnNextDigit.current) {
            replaceOnNextDigit.current = false;
            return "0,";
          }
          if (current.includes(",")) return current;
          return `${current || "0"},`;
        });
      }

      function handleKeyDown(event) {
        if (/^\d$/.test(event.key)) {
          event.preventDefault();
          appendDigit(event.key);
        } else if (allowDecimal && (event.key === "," || event.key === ".")) {
          event.preventDefault();
          appendDecimal();
        } else if (event.key === "Backspace" || event.key === "Delete") {
          event.preventDefault();
          setBuffer(current => current.slice(0, -1));
        } else if (event.key === "Enter" && valid) {
          event.preventDefault();
          onConfirm(numericValue, normalizedBuffer);
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }

      return React.createElement("div", {
        "data-numeric-keypad": "true",
        onKeyDown: handleKeyDown
      }, React.createElement("div", {
        "data-numeric-keypad-heading": "true"
      }, React.createElement("h2", { id: titleId }, label), React.createElement("button", {
        type: "button",
        onClick: onCancel
      }, cancelLabel)), React.createElement("div", {
        role: "status",
        "aria-live": "polite",
        "data-numeric-keypad-value": "true",
        "data-invalid": valid ? "false" : "true"
      }, buffer || "–"), !valid ? React.createElement("div", {
        "data-numeric-keypad-error": "true"
      }, invalidLabel) : null, React.createElement("div", {
        "data-numeric-keypad-grid": "true"
      }, ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(digit => React.createElement("button", {
        key: digit,
        type: "button",
        "aria-label": digit,
        onClick: () => appendDigit(digit)
      }, digit)), allowDecimal ? React.createElement("button", {
        type: "button",
        "aria-label": decimalLabel,
        "data-numeric-keypad-decimal": "true",
        onClick: appendDecimal
      }, ",") : React.createElement("span", { "aria-hidden": "true" }), React.createElement("button", {
        type: "button",
        "aria-label": "0",
        onClick: () => appendDigit("0")
      }, "0"), React.createElement("button", {
        type: "button",
        "aria-label": backspaceLabel,
        "data-numeric-keypad-backspace": "true",
        onClick: () => setBuffer(current => current.slice(0, -1))
      }, React.createElement(BackspaceIcon))), React.createElement("button", {
        type: "button",
        disabled: !valid,
        "data-numeric-keypad-confirm": "true",
        onClick: () => onConfirm(numericValue, normalizedBuffer)
      }, confirmLabel));
    }

    function TemporalField({
      id,
      label,
      value,
      onChange,
      helperText,
      placeholder = "--:--",
      title = label,
      hourLabel = "Hour",
      minuteLabel = "Minutes",
      increaseHourLabel = "Increase hour",
      decreaseHourLabel = "Decrease hour",
      increaseMinuteLabel = "Increase minutes",
      decreaseMinuteLabel = "Decrease minutes",
      editHourLabel = "Edit hour",
      editMinuteLabel = "Edit minutes",
      nowLabel = "Now",
      cancelLabel = "Cancel",
      confirmLabel = "Confirm",
      backspaceLabel = "Delete digit",
      invalidHourLabel = "Enter a value from 0 to 23.",
      invalidMinuteLabel = "Enter a value from 0 to 59.",
      closeLabel = cancelLabel,
      disabled = false,
      minuteStep = 5,
      nowProvider = () => new Date(),
      className,
      style
    }) {
      const generatedId = React.useId();
      const baseId = id || `temporal-field-${generatedId.replace(/:/g, "")}`;
      const triggerId = `${baseId}-trigger`;
      const titleId = `${baseId}-title`;
      const helperId = helperText ? `${baseId}-help` : undefined;
      const [open, setOpen] = React.useState(false);
      const [draft, setDraft] = React.useState(() => parseTime(value));
      const [keypadPart, setKeypadPart] = React.useState(null);
      const triggerRef = React.useRef(null);
      const dialogRef = React.useRef(null);

      React.useEffect(() => {
        if (!open || typeof document === "undefined") return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const frame = typeof requestAnimationFrame === "function"
          ? requestAnimationFrame(() => dialogRef.current?.focus())
          : null;
        return () => {
          if (frame != null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
          document.body.style.overflow = previousOverflow;
        };
      }, [open]);

      function openField() {
        if (disabled) return;
        const currentTime = nowTime(nowProvider);
        setDraft(parseTime(value, formatTime(currentTime.hour, currentTime.minute)));
        setKeypadPart(null);
        setOpen(true);
      }

      function closeField({ restoreFocus = true } = {}) {
        setOpen(false);
        setKeypadPart(null);
        if (restoreFocus && typeof requestAnimationFrame === "function") {
          requestAnimationFrame(() => triggerRef.current?.focus());
        }
      }

      function confirmField() {
        if (typeof onChange === "function") onChange(formatTime(draft.hour, draft.minute));
        closeField();
      }

      function handleDialogKeyDown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          if (keypadPart) setKeypadPart(null);
          else closeField();
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

      function step(part, delta) {
        setDraft(current => stepTimePart(current, part, delta, minuteStep));
      }

      function renderSegment(part, partLabel, increaseLabel, decreaseLabel, editLabel) {
        const displayValue = part === "hour" ? draft.hour : draft.minute;
        return React.createElement("div", {
          "data-temporal-field-segment": part
        }, React.createElement("span", {
          "data-temporal-field-segment-label": "true"
        }, partLabel), React.createElement("button", {
          type: "button",
          "aria-label": increaseLabel,
          "data-temporal-field-step": "increase",
          onClick: () => step(part, 1)
        }, React.createElement(PlusIcon)), React.createElement("button", {
          type: "button",
          "aria-label": `${editLabel}: ${padPart(displayValue)}`,
          "data-temporal-field-value": "true",
          onClick: () => setKeypadPart(part),
          onKeyDown: event => {
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              step(part, event.key === "ArrowUp" ? 1 : -1);
            }
          }
        }, padPart(displayValue)), React.createElement("button", {
          type: "button",
          "aria-label": decreaseLabel,
          "data-temporal-field-step": "decrease",
          onClick: () => step(part, -1)
        }, React.createElement(MinusIcon)));
      }

      const displayValue = value ? formatTime(parseTime(value).hour, parseTime(value).minute) : placeholder;

      return React.createElement("div", {
        className,
        style,
        "data-temporal-field": "time"
      }, React.createElement("label", {
        htmlFor: triggerId,
        "data-temporal-field-label": "true"
      }, label), React.createElement("button", {
        ref: triggerRef,
        id: triggerId,
        type: "button",
        disabled,
        "aria-haspopup": "dialog",
        "aria-expanded": open,
        "aria-describedby": helperId,
        "data-temporal-field-trigger": "true",
        onClick: openField
      }, React.createElement("span", null, displayValue), React.createElement("span", {
        "data-temporal-field-clock": "true",
        "aria-hidden": "true"
      }, React.createElement("svg", {
        viewBox: "0 0 24 24", width: 20, height: 20, fill: "none",
        stroke: "currentColor", strokeWidth: 1.35, strokeLinecap: "round",
        strokeLinejoin: "round"
      }, React.createElement("circle", { cx: 12, cy: 12, r: 8.25 }),
      React.createElement("path", { d: "M12 7.5V12l3.1 1.85" })))), helperText ? React.createElement("p", {
        id: helperId,
        "data-temporal-field-helper": "true"
      }, helperText) : null, open ? React.createElement("div", {
        "data-temporal-field-overlay": "true",
        onMouseDown: event => {
          if (event.target === event.currentTarget) closeField();
        }
      }, React.createElement("section", {
        ref: dialogRef,
        role: "dialog",
        tabIndex: -1,
        "aria-modal": "true",
        "aria-labelledby": titleId,
        "data-temporal-field-sheet": "true",
        "data-temporal-field-view": keypadPart ? "keypad" : "picker",
        onKeyDown: handleDialogKeyDown
      }, React.createElement("div", {
        "data-temporal-field-handle": "true",
        "aria-hidden": "true"
      }), keypadPart ? React.createElement(NumericKeypad, {
        titleId,
        label: keypadPart === "hour" ? hourLabel : minuteLabel,
        value: keypadPart === "hour" ? draft.hour : draft.minute,
        maxValue: keypadPart === "hour" ? 23 : 59,
        confirmLabel,
        cancelLabel,
        backspaceLabel,
        invalidLabel: keypadPart === "hour" ? invalidHourLabel : invalidMinuteLabel,
        onCancel: () => setKeypadPart(null),
        onConfirm: nextValue => {
          setDraft(current => ({ ...current, [keypadPart]: nextValue }));
          setKeypadPart(null);
        }
      }) : React.createElement(React.Fragment, null, React.createElement("h2", {
        id: titleId,
        "data-temporal-field-title": "true"
      }, title), React.createElement("div", {
        role: "status",
        "aria-live": "polite",
        "data-temporal-field-time": "true"
      }, renderSegment("hour", hourLabel, increaseHourLabel, decreaseHourLabel, editHourLabel), React.createElement("span", {
        "data-temporal-field-separator": "true",
        "aria-hidden": "true"
      }, ":"), renderSegment("minute", minuteLabel, increaseMinuteLabel, decreaseMinuteLabel, editMinuteLabel)), React.createElement("button", {
        type: "button",
        "data-temporal-field-now": "true",
        onClick: () => setDraft(nowTime(nowProvider))
      }, nowLabel), React.createElement("div", {
        "data-temporal-field-actions": "true"
      }, React.createElement("button", {
        type: "button",
        onClick: () => closeField()
      }, cancelLabel), React.createElement("button", {
        type: "button",
        "data-temporal-field-confirm": "true",
        onClick: confirmField
      }, confirmLabel))))) : null);
    }

    function NumericField({
      id, label, value, onChange, minValue = 0, maxValue = Number.MAX_SAFE_INTEGER,
      maxLength = 6, maxDecimals = 2, allowDecimal = true, unit,
      placeholder = "0", helperText, disabled = false, strings = {}, className, style
    }) {
      const copy = {
        title: label, cancel: "Cancel", confirm: "Confirm", backspace: "Delete digit",
        decimal: "Decimal separator", invalid: "Enter a valid value.", ...strings
      };
      const generatedId = React.useId();
      const baseId = id || `numeric-field-${generatedId.replace(/:/g, "")}`;
      const triggerId = `${baseId}-trigger`;
      const titleId = `${baseId}-title`;
      const helperId = helperText ? `${baseId}-help` : undefined;
      const [open, setOpen] = React.useState(false);
      const triggerRef = React.useRef(null);
      const dialogRef = React.useRef(null);

      React.useEffect(() => {
        if (!open || typeof document === "undefined") return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const frame = typeof requestAnimationFrame === "function"
          ? requestAnimationFrame(() => dialogRef.current?.focus()) : null;
        return () => {
          if (frame != null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
          document.body.style.overflow = previousOverflow;
        };
      }, [open]);

      function closeField() {
        setOpen(false);
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => triggerRef.current?.focus());
      }

      function handleDialogKeyDown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeField();
          return;
        }
        if (event.key !== "Tab" || !dialogRef.current) return;
        const buttons = Array.from(dialogRef.current.querySelectorAll("button:not(:disabled)"));
        if (!buttons.length) return;
        if (event.shiftKey && document.activeElement === buttons[0]) {
          event.preventDefault(); buttons[buttons.length - 1].focus();
        } else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) {
          event.preventDefault(); buttons[0].focus();
        }
      }

      const displayValue = value === "" || value == null ? placeholder : String(value).replace(".", ",");
      return React.createElement("div", { className, style, "data-numeric-field": "true" },
        React.createElement("label", { htmlFor: triggerId, "data-temporal-field-label": "true" }, label),
        React.createElement("button", {
          ref: triggerRef, id: triggerId, type: "button", disabled,
          "aria-haspopup": "dialog", "aria-expanded": open, "aria-describedby": helperId,
          "data-temporal-field-trigger": "true", "data-numeric-field-trigger": "true",
          onClick: () => { if (!disabled) setOpen(true); }
        }, React.createElement("span", null, displayValue), unit ? React.createElement("span", {
          "data-numeric-field-unit": "true"
        }, unit) : null),
        helperText ? React.createElement("p", { id: helperId, "data-temporal-field-helper": "true" }, helperText) : null,
        open ? React.createElement("div", {
          "data-temporal-field-overlay": "true", onMouseDown: event => { if (event.target === event.currentTarget) closeField(); }
        }, React.createElement("section", {
          ref: dialogRef, role: "dialog", tabIndex: -1, "aria-modal": "true", "aria-labelledby": titleId,
          "data-temporal-field-sheet": "true", "data-numeric-field-sheet": "true", onKeyDown: handleDialogKeyDown
        }, React.createElement("div", { "data-temporal-field-handle": "true", "aria-hidden": "true" }),
        React.createElement(NumericKeypad, {
          titleId, label: copy.title, value, minValue, maxValue, maxLength, allowDecimal, maxDecimals,
          decimalLabel: copy.decimal, confirmLabel: copy.confirm, cancelLabel: copy.cancel,
          backspaceLabel: copy.backspace, invalidLabel: copy.invalid, onCancel: closeField,
          onConfirm: (_numberValue, normalizedValue) => {
            if (typeof onChange === "function") onChange(normalizedValue);
            closeField();
          }
        }))) : null);
    }

    function DateField({
      id, label, value, onChange, min = "1900-01-01", max, locale = "en-US",
      placeholder = "--/--/----", helperText, initialViewYear, disabled = false,
      strings = {}, className, style
    }) {
      const copy = {
        title: label, previousMonth: "Previous month", nextMonth: "Next month",
        editMonthYear: "Choose month and year", previousYear: "Previous year",
        nextYear: "Next year", editYear: "Type year", showDays: "Show days",
        cancel: "Cancel", confirm: "Confirm", close: "Close",
        backspace: "Delete digit", invalidYear: "Enter a valid year.", ...strings
      };
      const generatedId = React.useId();
      const baseId = id || `temporal-date-${generatedId.replace(/:/g, "")}`;
      const triggerId = `${baseId}-trigger`;
      const titleId = `${baseId}-title`;
      const helperId = helperText ? `${baseId}-help` : undefined;
      const minParts = parseIsoDate(min) || { year: 1900, month: 1, day: 1 };
      const maxParts = parseIsoDate(max) || { year: 9999, month: 12, day: 31 };
      const [open, setOpen] = React.useState(false);
      const [draft, setDraft] = React.useState(() => parseIsoDate(value));
      const [view, setView] = React.useState(() => parseIsoDate(value) || maxParts);
      const [panel, setPanel] = React.useState("calendar");
      const triggerRef = React.useRef(null);
      const dialogRef = React.useRef(null);

      React.useEffect(() => {
        if (!open || typeof document === "undefined") return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const frame = typeof requestAnimationFrame === "function"
          ? requestAnimationFrame(() => dialogRef.current?.focus()) : null;
        return () => {
          if (frame != null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
          document.body.style.overflow = previousOverflow;
        };
      }, [open]);

      function openField() {
        if (disabled) return;
        const selected = parseIsoDate(value);
        const fallbackYear = Math.min(maxParts.year, Math.max(minParts.year,
          Number.isInteger(initialViewYear) ? initialViewYear : maxParts.year));
        setDraft(selected);
        setView(selected || clampIsoDate({ year: fallbackYear, month: maxParts.month, day: 1 }, min, max));
        setPanel("calendar");
        setOpen(true);
      }

      function closeField() {
        setOpen(false);
        setPanel("calendar");
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => triggerRef.current?.focus());
      }

      function setViewYear(year) {
        setView(current => clampIsoDate({
          year, month: current.month, day: Math.min(current.day, daysInMonth(year, current.month))
        }, min, max));
      }

      function handleKeys(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          if (panel === "calendar") closeField(); else setPanel(panel === "keypad" ? "jump" : "calendar");
          return;
        }
        if (event.key !== "Tab" || !dialogRef.current) return;
        const buttons = Array.from(dialogRef.current.querySelectorAll("button:not(:disabled)"));
        if (!buttons.length) return;
        if (event.shiftKey && document.activeElement === buttons[0]) {
          event.preventDefault(); buttons[buttons.length - 1].focus();
        } else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) {
          event.preventDefault(); buttons[0].focus();
        }
      }

      function ThinChevron({ left }) {
        return React.createElement("svg", {
          viewBox: "0 0 20 20", width: 20, height: 20, fill: "none", stroke: "currentColor",
          strokeWidth: 1.35, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true"
        }, React.createElement("path", { d: left ? "m12.25 5-5 5 5 5" : "m7.75 5 5 5-5 5" }));
      }

      const startWeekday = new Date(Date.UTC(view.year, view.month - 1, 1)).getUTCDay();
      const cells = Array(startWeekday).fill(null).concat(
        Array.from({ length: daysInMonth(view.year, view.month) }, (_, index) => index + 1)
      );
      const monthYear = localeDate({ ...view, day: 1 }, locale, { month: "long", year: "numeric" });
      const weekdays = Array.from({ length: 7 }, (_, index) => localeDate(
        { year: 2024, month: 1, day: 7 + index }, locale, { weekday: "narrow" }
      ));
      const parsedValue = parseIsoDate(value);
      const displayValue = parsedValue
        ? localeDate(parsedValue, locale, { day: "2-digit", month: "2-digit", year: "numeric" })
        : placeholder;
      const selectedText = draft
        ? localeDate(draft, locale, { day: "numeric", month: "long", year: "numeric" })
        : placeholder;
      const firstVisible = formatIsoDate(view.year, view.month, 1);
      const canPrevious = firstVisible > formatIsoDate(minParts.year, minParts.month, 1);
      const canNext = firstVisible < formatIsoDate(maxParts.year, maxParts.month, 1);

      return React.createElement("div", { className, style, "data-temporal-field": "date" },
        React.createElement("label", { htmlFor: triggerId, "data-temporal-field-label": "true" }, label),
        React.createElement("button", {
          ref: triggerRef, id: triggerId, type: "button", disabled, "aria-haspopup": "dialog",
          "aria-expanded": open, "aria-describedby": helperId, "data-temporal-field-trigger": "true", onClick: openField
        }, React.createElement("span", null, displayValue), React.createElement("span", {
          "data-temporal-field-calendar-icon": "true", "aria-hidden": "true"
        }, React.createElement("svg", {
          viewBox: "0 0 24 24", width: 20, height: 20, fill: "none", stroke: "currentColor",
          strokeWidth: 1.35, strokeLinecap: "round", strokeLinejoin: "round"
        }, React.createElement("rect", { x: 4, y: 5.5, width: 16, height: 14, rx: 3 }),
        React.createElement("path", { d: "M8 3.75v3.5m8-3.5v3.5M4 9.5h16" })))),
        helperText ? React.createElement("p", { id: helperId, "data-temporal-field-helper": "true" }, helperText) : null,
        open ? React.createElement("div", {
          "data-temporal-field-overlay": "true", onMouseDown: event => { if (event.target === event.currentTarget) closeField(); }
        }, React.createElement("section", {
          ref: dialogRef, role: "dialog", tabIndex: -1, "aria-modal": "true", "aria-labelledby": titleId,
          "data-temporal-field-sheet": "true", "data-temporal-field-kind": "date",
          "data-temporal-field-view": panel, onKeyDown: handleKeys
        }, React.createElement("div", { "data-temporal-field-handle": "true", "aria-hidden": "true" }),
        panel === "keypad" ? React.createElement(NumericKeypad, {
          titleId, label: copy.editYear, value: view.year, minValue: minParts.year, maxValue: maxParts.year,
          maxLength: 4, confirmLabel: copy.confirm, cancelLabel: copy.close, backspaceLabel: copy.backspace,
          invalidLabel: copy.invalidYear, onCancel: () => setPanel("jump"),
          onConfirm: year => { setViewYear(year); setPanel("jump"); }
        }) : React.createElement(React.Fragment, null,
          React.createElement("h2", { id: titleId, "data-temporal-field-title": "true" }, copy.title),
          panel === "calendar" ? React.createElement(React.Fragment, null,
            React.createElement("div", { "data-temporal-field-selected-date": "true", role: "status", "aria-live": "polite" }, selectedText),
            React.createElement("div", { "data-temporal-field-month-toolbar": "true" },
              React.createElement("button", { type: "button", disabled: !canPrevious, "aria-label": copy.previousMonth, onClick: () => setView(current => clampIsoDate(shiftCivilMonth({ ...current, day: 1 }, -1), min, max)) }, React.createElement(ThinChevron, { left: true })),
              React.createElement("button", { type: "button", "aria-label": copy.editMonthYear, "data-temporal-field-month-year": "true", onClick: () => setPanel("jump") }, monthYear),
              React.createElement("button", { type: "button", disabled: !canNext, "aria-label": copy.nextMonth, onClick: () => setView(current => clampIsoDate(shiftCivilMonth({ ...current, day: 1 }, 1), min, max)) }, React.createElement(ThinChevron, { left: false }))),
            React.createElement("div", { "data-temporal-field-weekdays": "true", "aria-hidden": "true" }, weekdays.map((weekday, index) => React.createElement("span", { key: index }, weekday))),
            React.createElement("div", { role: "grid", "aria-label": monthYear, "data-temporal-field-days": "true" }, cells.map((day, index) => {
              if (!day) return React.createElement("span", { key: `blank-${index}`, "aria-hidden": "true" });
              const iso = formatIsoDate(view.year, view.month, day);
              const selected = draft && iso === formatIsoDate(draft.year, draft.month, draft.day);
              return React.createElement("button", {
                key: iso, type: "button", role: "gridcell", disabled: iso < min || (max && iso > max),
                "aria-selected": selected, "aria-label": localeDate({ year: view.year, month: view.month, day }, locale, { day: "numeric", month: "long", year: "numeric" }),
                "data-selected": selected ? "true" : "false", onClick: () => setDraft({ year: view.year, month: view.month, day })
              }, day);
            }))) : React.createElement("div", { "data-temporal-field-jump": "true" },
            React.createElement("div", { "data-temporal-field-year-stepper": "true" },
              React.createElement("button", { type: "button", disabled: view.year <= minParts.year, "aria-label": copy.previousYear, onClick: () => setViewYear(view.year - 1) }, React.createElement(MinusIcon)),
              React.createElement("button", { type: "button", "aria-label": `${copy.editYear}: ${view.year}`, "data-temporal-field-year": "true", onClick: () => setPanel("keypad") }, view.year),
              React.createElement("button", { type: "button", disabled: view.year >= maxParts.year, "aria-label": copy.nextYear, onClick: () => setViewYear(view.year + 1) }, React.createElement(PlusIcon))),
            React.createElement("div", { "data-temporal-field-months": "true" }, Array.from({ length: 12 }, (_, index) => {
              const month = index + 1;
              const monthFirst = formatIsoDate(view.year, month, 1);
              const monthLast = formatIsoDate(view.year, month, daysInMonth(view.year, month));
              return React.createElement("button", {
                key: month, type: "button", disabled: monthLast < min || (max && monthFirst > max),
                "data-selected": month === view.month ? "true" : "false",
                onClick: () => setView(current => clampIsoDate({ ...current, month, day: 1 }, min, max))
              }, localeDate({ year: view.year, month, day: 1 }, locale, { month: "short" }));
            })), React.createElement("button", { type: "button", "data-temporal-field-show-days": "true", onClick: () => setPanel("calendar") }, copy.showDays)),
          React.createElement("div", { "data-temporal-field-actions": "true" },
            React.createElement("button", { type: "button", onClick: closeField }, copy.cancel),
            React.createElement("button", {
              type: "button", disabled: !draft, "data-temporal-field-confirm": "true",
              onClick: () => { if (draft && typeof onChange === "function") onChange(formatIsoDate(draft.year, draft.month, draft.day)); closeField(); }
            }, copy.confirm))))) : null);
    }

    return {
      TemporalField, DateField, NumericField, NumericKeypad,
      parseTime, formatTime, stepTimePart,
      parseIsoDate, formatIsoDate, daysInMonth, shiftCivilMonth, clampIsoDate
    };
  }

  return { createTemporalField };
});
