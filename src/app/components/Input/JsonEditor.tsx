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
  const [height, setHeight] = useState("auto");
  const [caretColor, setCaretColor] = useState("black");

  // Các nhánh Tab/Enter/{ [ gán thẳng textarea.value nên undo stack của trình duyệt không
  // dùng được. Tự lưu lịch sử ở đây, mỗi phần tử là một trạng thái (nội dung + vị trí caret).
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef(0);
  const lastPushAtRef = useRef(0);

  const registerRef = useRef(register);
  registerRef.current = register;

  // Gọi tay register.onChange: component đã ghi đè onChange của register, và các nhánh gán
  // thẳng textarea.value cũng không kích hoạt onChange của React, nên form chỉ cập nhật khi blur.
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

    // gõ liên tục trong TYPING_MERGE_MS thì gộp chung vào một bước undo
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
    lastPushAtRef.current = 0; // không gộp thao tác kế tiếp vào bước vừa khôi phục

    textarea.value = entry.value;
    setColoredJson(jsonToColoredSpans(entry.value));
    syncFormValue(textarea);

    textarea.selectionStart = textarea.selectionEnd = entry.caret;

    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
    setHeight(textarea.scrollHeight + "px");
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setColoredJson(jsonToColoredSpans(value));
    void register.onChange(e);
    pushHistory(value, e.target.selectionStart, true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
      setHeight(textareaRef.current.scrollHeight + "px");
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

        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
        setHeight(textarea.scrollHeight + "px");
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

        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
        setHeight(textarea.scrollHeight + "px");

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

      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
      setHeight(textarea.scrollHeight + "px");
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

      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
      setHeight(textarea.scrollHeight + "px");
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
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
          setHeight(textareaRef.current.scrollHeight + "px");
        }
      });
    }
  }, [defaultValue, syncFormValue]);

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
          onChange={onChange}
          onKeyDown={handleKeyDown}
          style={{ caretColor }}
          className={twMerge(
            "border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all",
            "box-border px-3 py-2 w-full rounded-lg text-transparent placeholder-shown:text-black selection:text-gray-300 selection:bg-gray-300 overflow-hidden",
            className
          )}
        />

        <pre
          aria-hidden="true"
          id="json-overlay"
          style={{ height }}
          className="absolute top-0 left-0 w-full box-border rounded-lg px-3 py-2 pointer-events-none bg-transparent text-black font-mono whitespace-pre-wrap break-words overflow-hidden"
        >
          {coloredJson}
        </pre>
      </div>
    </div>
  );
};
