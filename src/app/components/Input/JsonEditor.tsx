"use client";

import { UseFormRegisterReturn } from "react-hook-form";
import { twMerge } from "tailwind-merge";
import React, { useState, useRef, useEffect, ChangeEvent } from "react";

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

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setColoredJson(jsonToColoredSpans(value));

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

    // Tab
    if (e.key === "Tab") {
      e.preventDefault();
      setCaretColor("transparent");

      setTimeout(() => {
        const value = textarea.value;
        const newValue = value.substring(0, start) + "\t" + value.substring(end);

        textarea.value = newValue;
        setColoredJson(jsonToColoredSpans(newValue));

        textarea.selectionStart = textarea.selectionEnd = start + 1;
        setCaretColor("black");

        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
        setHeight(textarea.scrollHeight + "px");
      }, 0);
    }

    // Enter
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

      // --- KIỂM TRA AUTO-INDENT --- //
      const charBefore = value[start - 1] || "";
      const charAfter = value[start] || "";

      if ((charBefore === "{" && charAfter === "}") || (charBefore === "[" && charAfter === "]")) {
        const insertText = "\n" + tabPrefix + "\t\n" + tabPrefix;
        const newValue = beforeCursor + insertText + afterCursor;

        textarea.value = newValue;
        setColoredJson(jsonToColoredSpans(newValue));

        const newPos = start + tabPrefix.length + 2; // vị trí con trỏ bên trong indent
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = newPos;
          setCaretColor("black");
        }, 0);

        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
        setHeight(textarea.scrollHeight + "px");

        return;
      }

      // --- XỬ LÝ ENTER THÔNG THƯỜNG --- //
      const insertText = "\n" + tabPrefix;
      const newValue = beforeCursor + insertText + afterCursor;

      textarea.value = newValue;
      setColoredJson(jsonToColoredSpans(newValue));

      textarea.selectionStart = textarea.selectionEnd = start + insertText.length;
      setCaretColor("black");

      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
      setHeight(textarea.scrollHeight + "px");
    }

    // { or [
    if (e.key === "{" || e.key === "[") {
      e.preventDefault();

      setCaretColor("transparent");

      const value = textarea.value;
      const beforeCursor = value.substring(0, start);
      const afterCursor = value.substring(end);

      const pair = e.key === "{" ? "{}" : "[]";
      const insertText = e.key + pair[1]; // "{ }" hoặc "[ ]"

      const newValue = beforeCursor + insertText + afterCursor;

      textarea.value = newValue;
      setColoredJson(jsonToColoredSpans(newValue));

      // đặt caret và phục hồi màu ngay lập tức
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
      return JSON.stringify(parsed, null, "\t"); // indent 2 spaces
    } catch {
      return value; // nếu không phải JSON thì giữ nguyên
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      const initialRaw = textareaRef.current.value || defaultValue || "";
      const formatted = formatJson(initialRaw);

      textareaRef.current.value = formatted;
      setColoredJson(jsonToColoredSpans(formatted));
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto"; // reset
          textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"; // set lại
          setHeight(textareaRef.current.scrollHeight + "px"); // overlay dùng height này
        }
      });
    }
  }, [defaultValue]);

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
