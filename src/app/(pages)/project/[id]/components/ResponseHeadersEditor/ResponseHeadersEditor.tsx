"use client";

import React from "react";
import {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { ClientCreateEndpointDTO } from "@/models/endpoint/endpoint.model";
import { MAX_RESPONSE_HEADERS } from "@/models/endpoint/response_headers.model";
import { DefaultInput } from "@/app/components/Input/DefaultInput";
import { ComboInput } from "@/app/components/Input/ComboInput";
import { RepeatableRowList } from "@/app/components/Input/RepeatableRowList";

// Suggestions only, never a whitelist: the common ones are one keystroke away, and anything else
// a mock needs is still typed in by hand.
const COMMON_HEADER_OPTIONS = [
  "Cache-Control",
  "Content-Type",
  "ETag",
  "Location",
  "Retry-After",
  "X-Request-Id",
  "X-Total-Count",
].map((name) => ({ label: name, value: name }));

interface ResponseHeadersEditorProps {
  register: UseFormRegister<ClientCreateEndpointDTO>;
  control: Control<ClientCreateEndpointDTO>;
  errors: FieldErrors<ClientCreateEndpointDTO>;
  setValue: UseFormSetValue<ClientCreateEndpointDTO>;
  submitCount: number;
}

export const ResponseHeadersEditor: React.FC<ResponseHeadersEditorProps> = ({
  register,
  control,
  errors,
  setValue,
  submitCount,
}) => {
  const { fields, append, remove } = useFieldArray({ control, name: "response_headers" });
  const rows = useWatch({ control, name: "response_headers" }) ?? [];
  const rowErrors = errors.response_headers;

  return (
    <RepeatableRowList
      itemKeys={fields.map((field) => field.id)}
      max={MAX_RESPONSE_HEADERS}
      addLabel="Add header"
      emptyHint="No headers yet. This endpoint still answers with JSON, it just sends nothing extra."
      onAdd={() => append({ name: "", value: "" })}
      onRemove={remove}
      removeLabel={(index) => `Remove header ${index + 1}`}
      rowError={(index) =>
        rowErrors?.[index]?.name?.message ?? rowErrors?.[index]?.value?.message
      }
      listError={
        rowErrors?.root?.message ??
        (typeof rowErrors?.message === "string" ? rowErrors.message : undefined)
      }
      renderRow={(index) => (
        <div className="flex min-w-0 gap-2">
          <div className="min-w-0 flex-1">
            <ComboInput
              className="w-full"
              id={`response_headers.${index}.name`}
              label="Name"
              hideLabel
              options={COMMON_HEADER_OPTIONS}
              value={rows[index]?.name ?? ""}
              onChange={(value) =>
                setValue(`response_headers.${index}.name`, value, {
                  shouldDirty: true,
                  shouldValidate: submitCount > 0,
                })
              }
              allowCreate
              placeholder="X-Total-Count"
            />
          </div>
          <div className="min-w-0 flex-1">
            <DefaultInput
              className="w-full"
              label="Value"
              hideLabel
              register={register(`response_headers.${index}.value`)}
              type="text"
              id={`response_headers.${index}.value`}
              placeholder="42"
            />
          </div>
        </div>
      )}
    />
  );
};
