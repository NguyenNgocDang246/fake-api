"use client";

import React, { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import Notify from "@/app/components/Notify";

interface JsonPreviewProps {
  json: string;
  label?: string;
}

// One pass over the whole text: a quoted string (with escapes), a number, or a literal. Anything
// the regex does not claim is punctuation or whitespace, which keeps braces inside a string value
// from being mistaken for structure.
const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;

const COPIED_FEEDBACK_MS = 1500;

function colorize(json: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  TOKEN.lastIndex = 0;
  while ((match = TOKEN.exec(json)) !== null) {
    const [text, str, colon, num, literal] = match;

    if (match.index > last) {
      nodes.push(
        <span key={`p${last}`} className="text-gray-400">
          {json.slice(last, match.index)}
        </span>,
      );
    }

    if (str !== undefined) {
      // A string followed by a colon is a key, and the colon rides along as punctuation.
      nodes.push(
        <span key={match.index} className={colon ? "text-sky-300" : "text-emerald-300"}>
          {str}
        </span>,
      );
      if (colon) {
        nodes.push(
          <span key={`c${match.index}`} className="text-gray-400">
            {colon}
          </span>,
        );
      }
    } else if (num !== undefined) {
      nodes.push(
        <span key={match.index} className="text-amber-300">
          {num}
        </span>,
      );
    } else if (literal !== undefined) {
      nodes.push(
        <span key={match.index} className="text-fuchsia-300">
          {literal}
        </span>,
      );
    }

    last = match.index + text.length;
  }

  if (last < json.length) {
    nodes.push(
      <span key={`p${last}`} className="text-gray-400">
        {json.slice(last)}
      </span>,
    );
  }

  return nodes;
}

export const JsonPreview: React.FC<JsonPreviewProps> = ({ json, label = "json" }) => {
  const [copied, setCopied] = useState(false);

  // Not every context exposes the Clipboard API, and there is no fallback worth offering, so the
  // button is simply absent where it would not work. Resolved after mount, or the server would
  // render one answer and the client another.
  const [canCopy, setCanCopy] = useState(false);

  useEffect(() => setCanCopy(!!navigator.clipboard), []);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
    } catch {
      Notify.error("Could not copy to the clipboard.");
    }
  };

  return (
    <div className="overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-1.5 bg-gray-800 px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-yellow-400" />
        <span className="size-2.5 rounded-full bg-green-400" />
        <span className="ml-2 min-w-0 truncate text-xs text-gray-400">{label}</span>

        {canCopy && (
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? "Copied" : "Copy JSON"}
            title={copied ? "Copied" : "Copy JSON"}
            className="ml-auto flex shrink-0 cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
          >
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </button>
        )}
      </div>

      <pre className="max-h-56 overflow-auto bg-gray-900 p-3 font-mono text-xs leading-relaxed whitespace-pre @min-[600px]:max-h-72">
        <code>{colorize(json)}</code>
      </pre>
    </div>
  );
};
