/**
 * Controlled, app-local time selector for Trofia.
 *
 * TemporalField intentionally uses a locale-independent 24-hour value contract
 * (`HH:mm`). All visible copy is supplied by the host, so the app language —
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
      maxValue,
      maxLength = 2,
      confirmLabel,
      cancelLabel,
      backspaceLabel,
      invalidLabel,
      onConfirm,
      onCancel
    }) {
      const [buffer, setBuffer] = React.useState(String(value == null ? "" : value));
      const replaceOnNextDigit = React.useRef(true);
      React.useEffect(() => {
        setBuffer(String(value == null ? "" : value));
        replaceOnNextDigit.current = true;
      }, [value]);
      const numericValue = buffer === "" ? NaN : Number(buffer);
      const valid = Number.isInteger(numericValue) && numericValue >= 0 && numericValue <= maxValue;

      function appendDigit(digit) {
        setBuffer(current => {
          if (replaceOnNextDigit.current) {
            replaceOnNextDigit.current = false;
            return digit;
          }
          const next = current === "0" ? digit : `${current}${digit}`;
          return next.slice(-maxLength);
        });
      }

      function handleKeyDown(event) {
        if (/^\d$/.test(event.key)) {
          event.preventDefault();
          appendDigit(event.key);
        } else if (event.key === "Backspace" || event.key === "Delete") {
          event.preventDefault();
          setBuffer(current => current.slice(0, -1));
        } else if (event.key === "Enter" && valid) {
          event.preventDefault();
          onConfirm(numericValue);
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
      }, digit)), React.createElement("span", { "aria-hidden": "true" }), React.createElement("button", {
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
        onClick: () => onConfirm(numericValue)
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

    return { TemporalField, NumericKeypad, parseTime, formatTime, stepTimePart };
  }

  return { createTemporalField };
});
