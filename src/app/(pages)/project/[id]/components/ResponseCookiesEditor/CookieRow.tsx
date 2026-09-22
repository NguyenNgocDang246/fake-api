"use client";

import React from "react";
import { UseFormRegister, UseFormRegisterReturn } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { ClientCreateEndpointDTO } from "@/models/endpoint/endpoint.model";
import { MAX_COOKIE_MAX_AGE, SAME_SITE_MODES } from "@/models/endpoint/response_cookies.model";
import { DefaultInput } from "@/app/components/Input/DefaultInput";
import { ComboInput } from "@/app/components/Input/ComboInput";

const MAX_AGE_DIGITS = String(MAX_COOKIE_MAX_AGE).length;

const SAME_SITE_OPTIONS = SAME_SITE_MODES.map((mode) => ({
  label: mode === "none" ? "None" : mode === "lax" ? "Lax" : "Strict",
  value: mode,
}));

// The row is a field array inside a field array, so a name carries both indexes.
type CookieFieldName = `scenarios.${number}.response_cookies.${number}`;

interface CookieFlagProps {
  id: string;
  label: string;
  register: UseFormRegisterReturn;
  // Shown as on and refused, for an attribute the serializer sets whatever the box holds. The value
  // itself is left alone, so the tick the author made comes back the moment the rule lifts.
  locked?: boolean;
  title?: string;
}

// A chip rather than a checkbox: the three of them sit on the SameSite line and read as the set of
// attributes this cookie carries. The label wraps a `peer sr-only` input, the way `Switch` does, so
// the value is still the one `register` holds and the control is still reached by keyboard.
const CookieFlag: React.FC<CookieFlagProps> = ({ id, label, register, locked = false, title }) => (
  <label
    className={twMerge(
      "inline-flex shrink-0 select-none",
      locked ? "cursor-not-allowed" : "cursor-pointer"
    )}
    {...(title ? { title } : {})}
  >
    <input type="checkbox" id={id} disabled={locked} {...register} className="peer sr-only" />

    <span
      className={twMerge(
        "inline-flex items-center rounded-lg border border-gray-300 bg-white px-2 py-2.5 text-sm text-gray-600 transition-colors peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 peer-focus-visible:ring-3 peer-focus-visible:ring-blue-100 peer-focus-visible:ring-inset",
        locked && "border-blue-500 bg-blue-50 text-blue-700 opacity-70"
      )}
    >
      {label}
    </span>
  </label>
);

interface CookieRowProps {
  register: UseFormRegister<ClientCreateEndpointDTO>;
  fieldName: CookieFieldName;
  sameSite: string;
  onSameSiteChange: (value: string) => void;
  onRemove: () => void;
  removeLabel: string;
  hasError: boolean;
}

export const CookieRow: React.FC<CookieRowProps> = ({
  register,
  fieldName,
  sameSite,
  onSameSiteChange,
  onRemove,
  removeLabel,
  hasError,
}) => {
  // Mirrors the rule the serializer applies: SameSite None is only ever sent with Secure, so the
  // chip is shown as what will actually be written rather than as what was ticked.
  const secureForced = sameSite === "none";

  return (
    // Every label here is hidden, so the placeholder is the only thing naming a box. It says what
    // the field is rather than showing a sample value, unlike the header editor next door: a header
    // name comes from a known vocabulary, where an example teaches, while a cookie name is whatever
    // the app being mocked happens to call it.
    <div
      className={twMerge(
        "flex min-w-0 flex-col gap-2 rounded-xl border bg-white p-3",
        hasError ? "border-red-300" : "border-gray-200"
      )}
    >
      {/* One grid over both lines, so the name stands in the same column as the path rather than
          in a half of its own, and neither line stacks once the card gets narrow. The value takes
          the two columns the max age and SameSite share below it. */}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
        <div className="min-w-0">
          <DefaultInput
            className="w-full"
            label="Name"
            hideLabel
            register={register(`${fieldName}.name`)}
            type="text"
            id={`${fieldName}.name`}
            placeholder="Name"
          />
        </div>
        <div className="col-span-2 min-w-0">
          <DefaultInput
            className="w-full"
            label="Value"
            hideLabel
            register={register(`${fieldName}.value`)}
            type="text"
            id={`${fieldName}.value`}
            placeholder="Value"
          />
        </div>

        <div className="min-w-0">
          <DefaultInput
            className="w-full"
            label="Path"
            hideLabel
            register={register(`${fieldName}.path`)}
            type="text"
            id={`${fieldName}.path`}
            placeholder="/path"
          />
        </div>
        <div className="min-w-0">
          <DefaultInput
            className="w-full"
            label="Max age"
            hideLabel
            register={register(`${fieldName}.max_age`)}
            type="text"
            id={`${fieldName}.max_age`}
            placeholder="Max age (sec)"
            inputMode="numeric"
            maxLength={MAX_AGE_DIGITS}
          />
        </div>

        {/* It belongs with the boxes rather than with the flags: it is a third thing the cookie is
            addressed by, not a switch. Only as wide as "Strict" needs. */}
        <ComboInput
          className="w-24"
          id={`${fieldName}.same_site`}
          label="SameSite"
          hideLabel
          options={SAME_SITE_OPTIONS}
          value={sameSite}
          onChange={onSameSiteChange}
        />
      </div>

      <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-2">
        <div className="flex min-w-0 items-stretch gap-2">
          {/* One line at every width, so nothing here ever drops below anything else. A card too
              narrow for all of it scrolls this strip sideways instead, which is why the remove
              stays outside it and always within reach. */}
          {/* The padding is what a focus ring is drawn into, since a scroll box cuts off whatever
              its children paint outside it, and the negative margin takes that padding back out of
              the layout so the strip still lines up with the boxes above. */}
          <div className="-m-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto p-1">
            <CookieFlag
              id={`${fieldName}.http_only`}
              label="HttpOnly"
              register={register(`${fieldName}.http_only`)}
            />
            <CookieFlag
              id={`${fieldName}.secure`}
              label="Secure"
              register={register(`${fieldName}.secure`)}
              {...(secureForced
                ? { locked: true, title: "SameSite None is only sent with Secure" }
                : {})}
            />
            <CookieFlag
              id={`${fieldName}.partitioned`}
              label="Partitioned"
              register={register(`${fieldName}.partitioned`)}
            />
          </div>

          {/* A bin rather than a cross, because it drops the whole cookie and not just the box it
              sits next to. */}
          <button
            type="button"
            onClick={onRemove}
            aria-label={removeLabel}
            className="flex w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 transition hover:border-red-300 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {secureForced && (
          <p className="text-xs text-gray-500">
            Secure stays on, since no browser keeps a SameSite None cookie without it.
          </p>
        )}
      </div>
    </div>
  );
};
