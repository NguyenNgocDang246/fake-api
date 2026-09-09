"use client";

import React from "react";
import { Control, FieldErrors, UseFormRegister, useFieldArray } from "react-hook-form";
import { ClientCreateEndpointDTO } from "@/models/endpoint/endpoint.model";
import { MAX_RESPONSE_HEADERS } from "@/models/endpoint/response_headers.model";
import { DefaultInput } from "@/app/components/Input/DefaultInput";
import { ErrorText } from "@/app/components/Text/ErrorText";

// Suggestions only, never a whitelist: the datalist is there so the common ones are one keystroke
// away, and anything else a mock needs is still typed in by hand.
const COMMON_HEADER_NAMES = [
  "Cache-Control",
  "Content-Type",
  "ETag",
  "Location",
  "Retry-After",
  "X-Request-Id",
  "X-Total-Count",
];

const HEADER_NAME_LIST_ID = "response-header-names";

interface ResponseHeadersEditorProps {
  register: UseFormRegister<ClientCreateEndpointDTO>;
  control: Control<ClientCreateEndpointDTO>;
  errors: FieldErrors<ClientCreateEndpointDTO>;
}

export const ResponseHeadersEditor: React.FC<ResponseHeadersEditorProps> = ({
  register,
  control,
  errors,
}) => {
  const { fields, append, remove } = useFieldArray({ control, name: "response_headers" });
  const rowErrors = errors.response_headers;

  return (
    <div className="flex flex-col gap-3">
      <datalist id={HEADER_NAME_LIST_ID}>
        {COMMON_HEADER_NAMES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {fields.length === 0 && (
        <p className="text-xs text-gray-500">
          No headers yet. This endpoint still answers with JSON, it just sends nothing extra.
        </p>
      )}

      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-col gap-1">
          <div className="grid grid-cols-1 gap-2 @min-[420px]:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto] @min-[420px]:items-end">
            <div className="flex min-w-0 flex-col gap-1">
              <DefaultInput
                className="w-full"
                label="Name"
                hideLabel={index > 0}
                register={register(`response_headers.${index}.name`)}
                type="text"
                id={`response_headers.${index}.name`}
                placeholder="X-Total-Count"
                list={HEADER_NAME_LIST_ID}
              />
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <DefaultInput
                className="w-full"
                label="Value"
                hideLabel={index > 0}
                register={register(`response_headers.${index}.value`)}
                type="text"
                id={`response_headers.${index}.value`}
                placeholder="42"
              />
            </div>

            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Remove header ${index + 1}`}
              className="h-[2.6rem] cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-600 transition hover:border-red-300 hover:text-red-600"
            >
              Remove
            </button>
          </div>

          {rowErrors?.[index]?.name && <ErrorText message={rowErrors[index].name.message} />}
          {rowErrors?.[index]?.value && <ErrorText message={rowErrors[index].value.message} />}
        </div>
      ))}

      {rowErrors?.root && <ErrorText message={rowErrors.root.message} />}
      {typeof rowErrors?.message === "string" && <ErrorText message={rowErrors.message} />}

      {fields.length < MAX_RESPONSE_HEADERS && (
        <button
          type="button"
          onClick={() => append({ name: "", value: "" })}
          className="self-start cursor-pointer rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 transition hover:border-blue-400 hover:text-blue-600"
        >
          Add header
        </button>
      )}
    </div>
  );
};
