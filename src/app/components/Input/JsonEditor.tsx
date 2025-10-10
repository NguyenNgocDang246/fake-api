"use client";

import { UseFormRegisterReturn } from "react-hook-form";
import { twMerge } from "tailwind-merge";
import React, { useState, useRef, useEffect } from "react";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let nextIsKey = false;

  return tokens.map((token, idx, arr) => {
    const trimmed = token.trim();
    let className = "";
    const nextToken = arr[idx + 1]?.trim();

    if (token === "{" || token === "}") {
      className = "text-black";
      nextIsKey = false;
    } else if (token === "[" || token === "]") {
      className = "text-black";
      nextIsKey = false;
    } else if (token === ":") {
      className = "text-black";
      nextIsKey = false;
    } else if (token === ",") {
      className = "text-black";
      nextIsKey = false;
    } else if (/^".*"$/.test(trimmed)) {
      if (nextToken === ":") {
        className = "text-green-500"; // key string
      } else {
        className = "text-red-500"; // value string
      }
    } else if (!isNaN(Number(trimmed))) {
      className = "text-purple-500"; // number value
    } else if (trimmed === "true" || trimmed === "false" || trimmed === "null") {
      className = "text-pink-500"; // boolean/null
    }

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

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setColoredJson(jsonToColoredSpans(value));

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
      setHeight(textareaRef.current.scrollHeight + "px");
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      setHeight(textareaRef.current.scrollHeight + "px");
    }
  }, []);

  return (
    <div className={twMerge("flex flex-col gap-1", className)}>
      <label htmlFor={id}>{label}</label>

      <div className="relative">
        {/* Textarea thật */}
        <textarea
          {...register}
          ref={(e) => {
            register.ref(e); // Gán ref của React Hook Form
            textareaRef.current = e; // Gán ref riêng
          }}
          defaultValue={defaultValue}
          id={id}
          placeholder={placeholder}
          rows={rows}
          onChange={onChange}
          className={twMerge(
            "border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all",
            "box-border px-3 py-2 w-full rounded-lg caret-black text-transparent placeholder-shown:text-black selection:text-gray-300 selection:bg-gray-300 overflow-hidden",
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
