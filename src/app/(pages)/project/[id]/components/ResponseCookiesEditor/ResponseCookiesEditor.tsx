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
import { MAX_RESPONSE_COOKIES } from "@/models/endpoint/response_cookies.model";
import { RepeatableRowList } from "@/app/components/Input/RepeatableRowList";
import { CookieRow } from "@/app/(pages)/project/[id]/components/ResponseCookiesEditor/CookieRow";
import { blankCookie } from "@/app/(pages)/project/[id]/components/EndpointForm/scenarioPayload";

// The fields a row error can land on, in the order the row draws them, so the message shown is
// the one belonging to the control nearest the top.
const ROW_FIELDS = ["name", "value", "path", "max_age", "same_site", "secure"] as const;

interface ResponseCookiesEditorProps {
  register: UseFormRegister<ClientCreateEndpointDTO>;
  control: Control<ClientCreateEndpointDTO>;
  errors: FieldErrors<ClientCreateEndpointDTO>;
  setValue: UseFormSetValue<ClientCreateEndpointDTO>;
  submitCount: number;
  // Which page of the pager these cookies belong to. The rows are a field array inside a field
  // array, so every name carries the scenario's index.
  index: number;
}

export const ResponseCookiesEditor: React.FC<ResponseCookiesEditorProps> = ({
  register,
  control,
  errors,
  setValue,
  submitCount,
  index: scenarioIndex,
}) => {
  const name = `scenarios.${scenarioIndex}.response_cookies` as const;
  const { fields, append, remove } = useFieldArray({ control, name });
  const rows = useWatch({ control, name }) ?? [];
  const rowErrors = errors.scenarios?.[scenarioIndex]?.response_cookies;

  const write = (field: string, value: string) =>
    setValue(field as never, value as never, {
      shouldDirty: true,
      shouldValidate: submitCount > 0,
    });

  const errorOf = (index: number) =>
    ROW_FIELDS.map((field) => rowErrors?.[index]?.[field]?.message).find(
      (message) => message !== undefined
    );

  return (
    <div className="flex flex-col gap-3">
      {/* Named by the label the project form carries, so the reader is looking for the same
          words there. curl and anything server-side keep these either way. */}
      <p className="text-xs leading-relaxed text-gray-500">
        A browser keeps these only when the project has Send cookies and auth headers on.
      </p>

      <RepeatableRowList
        itemKeys={fields.map((field) => field.id)}
        max={MAX_RESPONSE_COOKIES}
        minRows={1}
        addLabel="Add cookie"
        onAdd={() => append(blankCookie())}
        onRemove={remove}
        removeControl="row"
        rowError={errorOf}
        listError={
          rowErrors?.root?.message ??
          (typeof rowErrors?.message === "string" ? rowErrors.message : undefined)
        }
        renderRow={(index, removeRow) => (
          <CookieRow
            register={register}
            fieldName={`${name}.${index}`}
            sameSite={rows[index]?.same_site ?? "none"}
            onSameSiteChange={(value) => write(`${name}.${index}.same_site`, value)}
            onRemove={removeRow}
            removeLabel={`Remove cookie ${index + 1}`}
            hasError={errorOf(index) !== undefined}
          />
        )}
      />
    </div>
  );
};
