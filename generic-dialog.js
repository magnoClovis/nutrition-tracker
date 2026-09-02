/**
 * Promise-based Trofia replacement for browser alert, confirm, and prompt.
 *
 * The hook owns only transient presentation state. Callers keep ownership of
 * business decisions and await the same semantic results as the browser APIs:
 * alert resolves after acknowledgement, confirm resolves to a boolean, and
 * prompt resolves to a string or null.
 *
 * @module GenericDialog
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GenericDialogModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function createGenericDialog({ React, createPortal, documentObject }) {
    if (!React || typeof React.createElement !== "function" ||
        typeof React.useState !== "function" || typeof React.useRef !== "function" ||
        typeof React.useEffect !== "function" || typeof React.useCallback !== "function" ||
        typeof createPortal !== "function") {
      throw new TypeError("GenericDialog requires React and createPortal");
    }

    const documentRef = documentObject || (typeof document !== "undefined" ? document : null);

    function iconPath(kind, tone) {
      if (kind === "prompt") {
        return React.createElement("path", {
          d: "m5 17.8.5-3.2L15.8 4.3a1.6 1.6 0 0 1 2.3 0l1.6 1.6a1.6 1.6 0 0 1 0 2.3L9.4 18.5l-3.2.5L5 17.8Z",
          stroke: "currentColor", strokeWidth: 1.45, strokeLinecap: "round", strokeLinejoin: "round"
        });
      }
      if (kind === "confirm" && tone === "danger") {
        return React.createElement("path", {
          d: "M8 8.2v8.6m4-8.6v8.6m4-8.6v8.6M5.8 6.1h12.4m-8.7 0 .7-2h3.6l.7 2m2.6 0-.7 14H7.6l-.7-14",
          stroke: "currentColor", strokeWidth: 1.45, strokeLinecap: "round", strokeLinejoin: "round"
        });
      }
      if (kind === "confirm") {
        return React.createElement("path", {
          d: "M5.2 12.2 9.4 16 18.8 6.5",
          stroke: "currentColor", strokeWidth: 1.55, strokeLinecap: "round", strokeLinejoin: "round"
        });
      }
      return React.createElement(React.Fragment, null,
        React.createElement("path", {
          d: "M12 10.7v5.1M12 7.5h.01M12 3.6a8.4 8.4 0 1 1 0 16.8 8.4 8.4 0 0 1 0-16.8Z",
          stroke: "currentColor", strokeWidth: 1.55, strokeLinecap: "round"
        })
      );
    }

    function DialogIcon({ kind, tone }) {
      return React.createElement("svg", {
        viewBox: "0 0 24 24",
        fill: "none",
        width: 22,
        height: 22,
        "aria-hidden": "true",
        focusable: "false"
      }, iconPath(kind, tone));
    }

    function cancelValue(kind) {
      if (kind === "confirm") return false;
      if (kind === "prompt") return null;
      return undefined;
    }

    function GenericDialog({ request, onResolve }) {
      const dialogRef = React.useRef(null);
      const inputRef = React.useRef(null);
      const primaryRef = React.useRef(null);
      const previousFocusRef = React.useRef(null);
      const [inputValue, setInputValue] = React.useState(() => String(request.initialValue ?? ""));
      const titleId = `${request.id}-title`;
      const messageId = request.message ? `${request.id}-message` : undefined;
      const fieldId = `${request.id}-field`;
      const noteId = request.note ? `${request.id}-note` : undefined;
      const isPrompt = request.kind === "prompt";
      const promptValid = !isPrompt || inputValue.trim().length > 0;

      React.useEffect(() => {
        if (!documentRef) return undefined;
        const rootElement = documentRef.getElementById("root");
        const body = documentRef.body;
        previousFocusRef.current = documentRef.activeElement;
        const previousOverflow = body?.style?.overflow || "";
        const previousAriaHidden = rootElement?.getAttribute("aria-hidden");
        const previousInert = rootElement?.inert;
        (isPrompt ? inputRef.current : primaryRef.current)?.focus();
        if (body) body.style.overflow = "hidden";
        if (rootElement) {
          rootElement.setAttribute("aria-hidden", "true");
          rootElement.inert = true;
        }
        return () => {
          if (body) body.style.overflow = previousOverflow;
          if (rootElement) {
            rootElement.inert = !!previousInert;
            if (previousAriaHidden == null) rootElement.removeAttribute("aria-hidden");
            else rootElement.setAttribute("aria-hidden", previousAriaHidden);
          }
          const previousFocus = previousFocusRef.current;
          if (previousFocus && typeof previousFocus.focus === "function") {
            (typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout)(() => previousFocus.focus(), 0);
          }
        };
      }, []);

      function resolvePrimary() {
        if (!promptValid) return;
        onResolve(isPrompt ? inputValue.trim() : true);
      }

      function onKeyDown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          onResolve(cancelValue(request.kind));
          return;
        }
        if (event.key === "Enter" && isPrompt && documentRef?.activeElement === inputRef.current) {
          if (promptValid) {
            event.preventDefault();
            resolvePrimary();
          }
          return;
        }
        if (event.key !== "Tab") return;
        const focusable = Array.from(dialogRef.current?.querySelectorAll("button:not(:disabled), input:not(:disabled)") || []);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && documentRef?.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && documentRef?.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }

      return React.createElement("div", {
        "data-generic-dialog-overlay": "true"
      }, React.createElement("section", {
        ref: dialogRef,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": titleId,
        "aria-describedby": messageId,
        "data-generic-dialog": "true",
        "data-generic-dialog-kind": request.kind,
        "data-generic-dialog-tone": request.tone || "action",
        onKeyDown
      },
      React.createElement("div", { "data-generic-dialog-heading": "true" },
        React.createElement("span", { "data-generic-dialog-icon": "true", "aria-hidden": "true" },
          React.createElement(DialogIcon, { kind: request.kind, tone: request.tone })
        ),
        React.createElement("div", null,
          React.createElement("h2", { id: titleId }, request.title),
          request.message ? React.createElement("p", { id: messageId }, request.message) : null
        )
      ),
      isPrompt ? React.createElement("div", { "data-generic-dialog-field-wrap": "true" },
        React.createElement("label", { htmlFor: fieldId }, request.label),
        React.createElement("input", {
          ref: inputRef,
          id: fieldId,
          type: request.inputType || "text",
          inputMode: request.inputMode,
          autoComplete: request.autoComplete || "off",
          maxLength: request.maxLength,
          placeholder: request.placeholder,
          value: inputValue,
          "aria-describedby": noteId,
          "data-generic-dialog-input": "true",
          onChange: event => setInputValue(event.target.value)
        }),
        request.note ? React.createElement("small", { id: noteId }, request.note) : null
      ) : null,
      React.createElement("div", { "data-generic-dialog-actions": "true" },
        request.kind !== "alert" ? React.createElement("button", {
          type: "button",
          "data-generic-dialog-cancel": "true",
          onClick: () => onResolve(cancelValue(request.kind))
        }, request.cancelLabel) : null,
        React.createElement("button", {
          ref: primaryRef,
          type: "button",
          disabled: !promptValid,
          "data-generic-dialog-primary": "true",
          onClick: resolvePrimary
        }, request.confirmLabel)
      )));
    }

    function useGenericDialog({ registerBackHandler, backHandlerPriority } = {}) {
      const [request, setRequest] = React.useState(null);
      const resolverRef = React.useRef(null);
      const requestKindRef = React.useRef(null);
      const sequenceRef = React.useRef(0);

      const resolveCurrent = React.useCallback(value => {
        const resolver = resolverRef.current;
        resolverRef.current = null;
        requestKindRef.current = null;
        setRequest(null);
        if (resolver) resolver(value);
      }, []);

      const open = React.useCallback((kind, options = {}) => {
        if (resolverRef.current) {
          const previousResolver = resolverRef.current;
          resolverRef.current = null;
          previousResolver(cancelValue(requestKindRef.current));
        }
        const normalized = typeof options === "string" ? { title: options } : options;
        return new Promise(resolve => {
          resolverRef.current = resolve;
          requestKindRef.current = kind;
          setRequest({
            id: `generic-dialog-${++sequenceRef.current}`,
            kind,
            tone: normalized.tone === "danger" ? "danger" : "action",
            title: String(normalized.title || ""),
            message: normalized.message == null ? "" : String(normalized.message),
            label: normalized.label == null ? "" : String(normalized.label),
            note: normalized.note == null ? "" : String(normalized.note),
            placeholder: normalized.placeholder == null ? "" : String(normalized.placeholder),
            initialValue: normalized.initialValue == null ? "" : String(normalized.initialValue),
            inputType: normalized.inputType,
            inputMode: normalized.inputMode,
            autoComplete: normalized.autoComplete,
            maxLength: Number.isFinite(normalized.maxLength) ? normalized.maxLength : undefined,
            confirmLabel: String(normalized.confirmLabel || "OK"),
            cancelLabel: String(normalized.cancelLabel || "Cancel")
          });
        });
      }, []);

      React.useEffect(() => () => {
        if (resolverRef.current) resolverRef.current(cancelValue(requestKindRef.current));
        resolverRef.current = null;
        requestKindRef.current = null;
      }, []);

      React.useEffect(() => {
        if (!request || typeof registerBackHandler !== "function") return undefined;
        return registerBackHandler({
          id: "generic-dialog",
          priority: Number(backHandlerPriority) || 0,
          handler: () => {
            resolveCurrent(cancelValue(request.kind));
            return true;
          }
        });
      }, [request, registerBackHandler, backHandlerPriority, resolveCurrent]);

      const dialogNode = request && documentRef?.body
        ? createPortal(React.createElement(GenericDialog, {
            key: request.id,
            request,
            onResolve: resolveCurrent
          }), documentRef.body)
        : null;

      return {
        alert: options => open("alert", options).then(() => undefined),
        confirm: options => open("confirm", options).then(Boolean),
        prompt: options => open("prompt", options),
        dialogNode,
        isOpen: !!request
      };
    }

    return { GenericDialog, useGenericDialog };
  }

  return { createGenericDialog };
});
