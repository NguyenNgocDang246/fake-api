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
  // Which page of the pager these headers belong to. The rows are a field array inside a field
  // array, so every name carries the scenario's index.
  index: number;
}

export const ResponseHeadersEditor: React.FC<ResponseHeadersEditorProps> = ({
  register,
  control,
  errors,
  setValue,
  submitCount,
  index: scenarioIndex,
}) => {
  const name = `scenarios.${scenarioIndex}.response_headers` as const;
  const { fields, append, remove } = useFieldArray({ control, name });
  const rows = useWatch({ control, name }) ?? [];
  const rowErrors = errors.scenarios?.[scenarioIndex]?.response_headers;

  return (
    <div className="flex flex-col gap-3">
      {/* Named by the label the project form carries, so the reader is looking for the same
          words there. curl and anything server-side read these either way. */}
      <p className="text-xs leading-relaxed text-gray-500">
        A browser reads these only when the project allows the origin you call from.
      </p>

      <RepeatableRowList
        itemKeys={fields.map((field) => field.id)}
        max={MAX_RESPONSE_HEADERS}
        minRows={1}
        addLabel="Add header"
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
                id={`${name}.${index}.name`}
                label="Name"
                hideLabel
                options={COMMON_HEADER_OPTIONS}
                value={rows[index]?.name ?? ""}
                onChange={(value) =>
                  setValue(`${name}.${index}.name`, value, {
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
                register={register(`${name}.${index}.value`)}
                type="text"
                id={`${name}.${index}.value`}
                placeholder="42"
              />
            </div>
          </div>
        )}
      />
    </div>
  );
};
