"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus } from "lucide-react";
import { twMerge } from "tailwind-merge";

export interface ComboOption {
  label: string;
  value: string;
  // A short muted note on the right of the row, e.g. "success" beside a status code.
  hint?: string;
}

interface ComboInputProps {
  id: string;
  label: string;
  options: ComboOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  // Offer the typed text as a new value when nothing matches.
  allowCreate?: boolean;
  createLabel?: string;
  disabled?: boolean;
  // A repeated row still needs its label read out, so it is hidden rather than dropped.
  hideLabel?: boolean;
  className?: string;
}

type Row = (ComboOption & { create: false }) | { value: string; label: string; create: true };

type Anchor = { left: number; top: number; bottom: number; width: number };

// Roughly the tallest the list gets (`max-h-52` plus padding). Only used to pick a side.
const LIST_MAX_PX = 224;

export const ComboInput: React.FC<ComboInputProps> = ({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = "Search or select",
  emptyText = "No matches",
  allowCreate = false,
  createLabel = "Use",
  disabled = false,
  hideLabel = false,
  className,
}) => {
  const selected = options.find((option) => option.value === value) ?? null;

  const [text, setText] = useState(selected ? selected.label : value);
  const [typing, setTyping] = useState(false);
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // The list is rendered in a portal with fixed positioning so the modal's `overflow-y-auto`
  // body and the Cancel/Submit row below it never clip or cover it.
  const measure = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom;
    setDropUp(below < LIST_MAX_PX && rect.top > below);
    setAnchor({ left: rect.left, top: rect.bottom, bottom: rect.top, width: rect.width });
  }, []);

  const reveal = useCallback(() => {
    measure();
    setOpen(true);
  }, [measure]);

  // While the user is not typing, the field mirrors whatever the form holds.
  useEffect(() => {
    if (!typing) setText(selected ? selected.label : value);
  }, [value, selected, typing]);

  // Follow the input if the modal body scrolls or the window resizes while the list is open.
  useEffect(() => {
    if (!open) return;
    measure();
    const onMove = () => measure();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, measure]);

  const query = typing ? text.trim().toLowerCase() : "";

  const rows = useMemo<Row[]>(() => {
    const matches = query
      ? options.filter(
          (option) =>
            option.label.toLowerCase().includes(query) ||
            option.value.toLowerCase().includes(query),
        )
      : options;

    const canCreate =
      allowCreate &&
      query.length > 0 &&
      !options.some((option) => option.label.toLowerCase() === query);

    const base: Row[] = matches.map((option) => ({ ...option, create: false }));
    return canCreate
      ? [...base, { value: text.trim(), label: text.trim(), create: true }]
      : base;
  }, [options, query, allowCreate, text]);

  useEffect(() => setActive(0), [query, open]);

  // Keep the highlighted row inside the scroll box.
  useEffect(() => {
    const list = listRef.current;
    const row = list?.children[active] as HTMLElement | undefined;
    if (!open || !list || !row) return;

    if (row.offsetTop < list.scrollTop) {
      list.scrollTop = row.offsetTop;
    } else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
    }
  }, [active, open]);

  const commit = useCallback(
    (next: string) => {
      onChange(next);
      setTyping(false);
      setOpen(false);
    },
    [onChange],
  );

  const close = useCallback(() => {
    // Text typed into an allowCreate field is kept, so a blur does not throw it away.
    if (allowCreate && typing && text.trim()) {
      commit(text.trim());
      return;
    }
    setTyping(false);
    setOpen(false);
  }, [allowCreate, typing, text, commit]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) close();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [close]);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        reveal();
        return;
      }
      setActive((current) => {
        const count = rows.length;
        if (!count) return 0;
        return (current + (event.key === "ArrowDown" ? 1 : -1) + count) % count;
      });
    } else if (event.key === "Enter") {
      if (open && rows[active]) {
        event.preventDefault();
        commit(rows[active].value);
      }
    } else if (event.key === "Escape") {
      setTyping(false);
      setOpen(false);
    }
  }

  return (
    <div className={twMerge("flex flex-col", className)}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </label>

      <div ref={rootRef} className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={
            open && rows[active] ? `${id}-option-${active}` : undefined
          }
          disabled={disabled}
          placeholder={placeholder}
          value={text}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(event) => {
            setText(event.target.value);
            setTyping(true);
            reveal();
          }}
          onFocus={(event) => {
            reveal();
            event.target.select();
          }}
          // Committing a row keeps focus on the input, so a later click fires no focus event.
          // Opening from the pointer too is what lets the same field be reopened.
          onMouseDown={() => {
            if (open && !typing) {
              setOpen(false);
              return;
            }
            reveal();
          }}
          onBlur={close}
          onKeyDown={onKeyDown}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-gray-800 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />

        <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center text-gray-400">
          <ChevronDown size={16} className={twMerge("transition-transform", open && "rotate-180")} />
        </div>
      </div>

      {open &&
        anchor &&
        createPortal(
          <div
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            style={{
              position: "fixed",
              left: anchor.left,
              width: anchor.width,
              ...(dropUp
                ? { bottom: window.innerHeight - anchor.bottom + 4 }
                : { top: anchor.top + 4 }),
            }}
            className="z-[60] max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
          >
            {rows.map((row, index) => (
              <div
                key={`${row.value}-${index}`}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={row.value === value}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(row.value)}
                className={twMerge(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-800",
                  index === active && "bg-gray-100",
                  row.value === value && "font-semibold",
                  index === active && row.value === value && "bg-blue-50",
                )}
              >
                {row.create ? (
                  <>
                    <Plus size={14} className="shrink-0" />
                    <span className="truncate">
                      {createLabel} &ldquo;{row.label}&rdquo;
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate">{row.label}</span>
                    {row.hint && (
                      <span className="shrink-0 font-mono text-xs text-gray-400">
                        {row.hint}
                      </span>
                    )}
                    {row.value === value && (
                      <Check size={16} className="shrink-0 text-blue-600" />
                    )}
                  </>
                )}
              </div>
            ))}

            {rows.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400">{emptyText}</div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};
