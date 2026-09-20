"use client";

import { UseFormRegisterReturn } from "react-hook-form";
import { twMerge } from "tailwind-merge";
import React, { useState, useRef, useEffect, useCallback, ChangeEvent } from "react";

const HISTORY_LIMIT = 200;
const TYPING_MERGE_MS = 500;

interface HistoryEntry {
  value: string;
  caret: number;
}

interface JsonEditorInputProps {
  register: UseFormRegisterReturn;
  id: string;
  label: string;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
  rows?: number;
}

function jsonToColoredSpans(value: string) {
  const tokens = value.split(/(\{|\}|\[|\]|:|,)/g);

  return tokens.map((token, idx, arr) => {
    const trimmed = token.trim();
    let className = "";
    const nextToken = arr[idx + 1]?.trim();

    if (token === "{" || token === "}") className = "text-black";
    else if (token === "[" || token === "]") className = "text-black";
    else if (token === ":") className = "text-black";
    else if (token === ",") className = "text-black";
    else if (/^".*"$/.test(trimmed)) {
      if (nextToken === ":") className = "text-green-500";
      else className = "text-red-500";
    } else if (!isNaN(Number(trimmed))) className = "text-purple-500";
    else if (trimmed === "true" || trimmed === "false" || trimmed === "null")
      className = "text-pink-500";

    return (
      <span key={idx} className={className}>
        {token}
      </span>
    );
  });
}

export const JsonEditor: React.FC<JsonEditorInputProps> = ({
  register,
  id,
  label,
  placeholder = "",
  defaultValue = "",
  className,
  rows = 4,
}) => {
  const [coloredJson, setColoredJson] = useState<React.ReactNode[]>(
    jsonToColoredSpans(defaultValue)
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLPreElement>(null);
  const [height, setHeight] = useState("auto");
  const [caretColor, setCaretColor] = useState("black");

  // Read once, off the element itself, because the box is sized border-box and a caller can
  // restyle it: the height set below has to carry the border the scroll height leaves out.
  const borderRef = useRef<number | null>(null);

  // The Tab/Enter/{ [ branches assign textarea.value directly, which throws away the browser's
  // own undo stack. This keeps the history instead, one entry per state (content plus caret).
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef(0);
  const lastPushAtRef = useRef(0);

  const registerRef = useRef(register);
  registerRef.current = register;

  // The two layers are one editor: the text the caret moves through is the textarea's, the text
  // that is read is the overlay's, so whatever one scrolls sideways the other scrolls with it.
  const syncScroll = useCallback((textarea: HTMLTextAreaElement) => {
    const overlay = overlayRef.current;
    if (overlay) overlay.scrollLeft = textarea.scrollLeft;
  }, []);

  const fitHeight = useCallback((textarea: HTMLTextAreaElement) => {
    if (borderRef.current === null) {
      const style = getComputedStyle(textarea);
      borderRef.current =
        parseFloat(style.borderTopWidth || "0") + parseFloat(style.borderBottomWidth || "0");
    }

    textarea.style.height = "auto";
    const content = textarea.scrollHeight + borderRef.current;
    textarea.style.height = content + "px";

    // A line wider than the box puts a scrollbar inside it, and the scroll height does not count
    // that bar, so the last line would be left sitting underneath it.
    const bar = textarea.offsetHeight - textarea.clientHeight - borderRef.current;
    const fitted = content + Math.max(bar, 0);

    textarea.style.height = fitted + "px";
    setHeight(fitted + "px");
    syncScroll(textarea);
  }, [syncScroll]);

  // register.onChange is called by hand: this component overrides the one register supplies, and
  // assigning textarea.value fires no React change either, so the form would only update on blur.
  const syncFormValue = useCallback((textarea: HTMLTextAreaElement) => {
    void registerRef.current.onChange({ target: textarea, type: "change" });
  }, []);

  const pushHistory = (value: string, caret: number, coalesce = false) => {
    const history = historyRef.current;
    const current = history[historyIndexRef.current];

    if (current?.value === value) {
      current.caret = caret;
      return;
    }

    // typing that keeps going within TYPING_MERGE_MS collapses into a single undo step
    const now = Date.now();
    if (coalesce && historyIndexRef.current > 0 && now - lastPushAtRef.current < TYPING_MERGE_MS) {
      history[historyIndexRef.current] = { value, caret };
      lastPushAtRef.current = now;
      return;
    }

    history.splice(historyIndexRef.current + 1);
    history.push({ value, caret });
    if (history.length > HISTORY_LIMIT) history.shift();

    historyIndexRef.current = history.length - 1;
    lastPushAtRef.current = now;
  };

  const applyHistory = (offset: number) => {
    const textarea = textareaRef.current;
    const entry = historyRef.current[historyIndexRef.current + offset];
    if (!textarea || !entry) return;

    historyIndexRef.current += offset;
    lastPushAtRef.current = 0; // the next edit must not merge into the step just restored

    textarea.value = entry.value;
    setColoredJson(jsonToColoredSpans(entry.value));
    syncFormValue(textarea);

    textarea.selectionStart = textarea.selectionEnd = entry.caret;

    fitHeight(textarea);
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setColoredJson(jsonToColoredSpans(value));
    void register.onChange(e);
    pushHistory(value, e.target.selectionStart, true);

    if (textareaRef.current) {
      fitHeight(textareaRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current!;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const modifier = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (modifier && key === "z" && !e.shiftKey) {
      e.preventDefault();
      applyHistory(-1);
      return;
    }

    if (modifier && ((key === "z" && e.shiftKey) || key === "y")) {
      e.preventDefault();
      applyHistory(1);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      setCaretColor("transparent");

      setTimeout(() => {
        const value = textarea.value;
        const newValue = value.substring(0, start) + "\t" + value.substring(end);

        textarea.value = newValue;
        setColoredJson(jsonToColoredSpans(newValue));
        syncFormValue(textarea);
        pushHistory(newValue, start + 1);

        textarea.selectionStart = textarea.selectionEnd = start + 1;
        setCaretColor("black");

        fitHeight(textarea);
      }, 0);
    }

    if (e.key === "Enter") {
      e.preventDefault();
      setCaretColor("transparent");

      const value = textarea.value;
      const beforeCursor = value.substring(0, start);
      const afterCursor = value.substring(end);

      const lines = beforeCursor.split("\n");
      const currentLine = lines[lines.length - 1] ?? "";
      const tabMatch = currentLine.match(/^\t*/);
      const tabPrefix = tabMatch ? tabMatch[0] : "";

      const charBefore = value[start - 1] || "";
      const charAfter = value[start] || "";

      if ((charBefore === "{" && charAfter === "}") || (charBefore === "[" && charAfter === "]")) {
        const insertText = "\n" + tabPrefix + "\t\n" + tabPrefix;
        const newValue = beforeCursor + insertText + afterCursor;

        textarea.value = newValue;
        setColoredJson(jsonToColoredSpans(newValue));

        const newPos = start + tabPrefix.length + 2;
        pushHistory(newValue, newPos);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = newPos;
          setCaretColor("black");
        }, 0);

        fitHeight(textarea);

        return;
      }

      const insertText = "\n" + tabPrefix;
      const newValue = beforeCursor + insertText + afterCursor;

      textarea.value = newValue;
      setColoredJson(jsonToColoredSpans(newValue));
      syncFormValue(textarea);
      pushHistory(newValue, start + insertText.length);

      textarea.selectionStart = textarea.selectionEnd = start + insertText.length;
      setCaretColor("black");

      fitHeight(textarea);
    }

    if (e.key === "{" || e.key === "[") {
      e.preventDefault();

      setCaretColor("transparent");

      const value = textarea.value;
      const beforeCursor = value.substring(0, start);
      const afterCursor = value.substring(end);

      const pair = e.key === "{" ? "{}" : "[]";
      const insertText = e.key + pair[1];

      const newValue = beforeCursor + insertText + afterCursor;

      textarea.value = newValue;
      setColoredJson(jsonToColoredSpans(newValue));
      syncFormValue(textarea);
      pushHistory(newValue, start + 1);

      textarea.selectionStart = textarea.selectionEnd = start + 1;
      setCaretColor("black");

      fitHeight(textarea);
    }
  };

  function formatJson(value: string) {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, "\t");
    } catch {
      return value;
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      const initialRaw = textareaRef.current.value || defaultValue || "";
      const formatted = formatJson(initialRaw);

      textareaRef.current.value = formatted;
      setColoredJson(jsonToColoredSpans(formatted));
      syncFormValue(textareaRef.current);

      historyRef.current = [{ value: formatted, caret: formatted.length }];
      historyIndexRef.current = 0;
      lastPushAtRef.current = 0;

      requestAnimationFrame(() => {
        if (textareaRef.current) fitHeight(textareaRef.current);
      });
    }
  }, [defaultValue, syncFormValue, fitHeight]);

  // An editor that mounts on a panel which is off screen measures nothing, because a hidden box
  // reports no scroll height, and it would stay one line tall for as long as it is open. The
  // observer reports the size it gains the first time it is shown, which is when it can be fitted.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    let shown = textarea.offsetHeight > 0;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      // Only the crossing is acted on, never every size report: fitting sets the height, which
      // reports another size, and answering that one would never end.
      const visible = entry.contentRect.height > 0 || entry.contentRect.width > 0;
      if (visible === shown) return;

      shown = visible;
      if (visible) fitHeight(textarea);
    });

    observer.observe(textarea);
    return () => observer.disconnect();
  }, [fitHeight]);

  return (
    <div className={twMerge("flex flex-col gap-1", className)}>
      <label htmlFor={id}>{label}</label>

      <div className="relative">
        <textarea
          {...register}
          ref={(e) => {
            register.ref(e);
            textareaRef.current = e;
          }}
          defaultValue={defaultValue}
          id={id}
          placeholder={placeholder}
          rows={rows}
          // A body is read by its indentation, so a long line runs off the side and is scrolled
          // to rather than folded into the line below it.
          wrap="off"
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onScroll={(e) => syncScroll(e.currentTarget)}
          style={{ caretColor }}
          className={twMerge(
            "border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all",
            // The same font and the same tab stops as the overlay, or the caret would sit beside
            // the character it is on rather than on it.
            "box-border px-3 py-2 w-full rounded-lg font-mono [tab-size:8] text-transparent placeholder-shown:text-black selection:text-gray-300 selection:bg-gray-300 overflow-x-auto overflow-y-hidden",
            className
          )}
        />

        <pre
          ref={overlayRef}
          aria-hidden="true"
          id="json-overlay"
          style={{ height }}
          className="absolute top-0 left-0 w-full box-border rounded-lg border border-transparent px-3 py-2 pointer-events-none bg-transparent text-black font-mono [tab-size:8] whitespace-pre overflow-hidden"
        >
          {coloredJson}
        </pre>
      </div>
    </div>
  );
};
