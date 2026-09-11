"use client";

import React from "react";
import {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  useWatch,
} from "react-hook-form";
import { ClientCreateEndpointDTO } from "@/models/endpoint/endpoint.model";
import { DefaultInput } from "@/app/components/Input/DefaultInput";
import { ComboInput } from "@/app/components/Input/ComboInput";
import { JsonEditor } from "@/app/components/Input/JsonEditor";
import { ErrorText } from "@/app/components/Text/ErrorText";
import { FormTabs } from "@/app/components/Tabs/FormTabs";
import { httpMethods } from "@/app/(pages)/project/[id]/components/EndpointForm/httpMethods";
import {
  AiEndpointSection,
  EndpointDesign,
} from "@/app/(pages)/project/[id]/components/AiEndpointSection/AiEndpointSection";
import { ResponseHeadersEditor } from "@/app/(pages)/project/[id]/components/ResponseHeadersEditor/ResponseHeadersEditor";

interface EndpointFormProps {
  register: UseFormRegister<ClientCreateEndpointDTO>;
  control: Control<ClientCreateEndpointDTO>;
  errors: FieldErrors<ClientCreateEndpointDTO>;
  // The method picker writes through `setValue` rather than `register`, the way `ProjectForm`
  // drives its origin list.
  setValue: UseFormSetValue<ClientCreateEndpointDTO>;
  // `FormTabs` needs the attempts, not the errors alone: an error already on screen must not yank
  // the tab while the user types.
  submitCount: number;
  projectId: string;
  endpointGroupId: string;
  // Create only: the update form opens on the values it is editing.
  defaults?: { delay_ms: string } | undefined;
  // Update only: the endpoint being edited, and whether it already stores a blueprint.
  endpointId?: string | undefined;
  hasStoredPlan?: boolean | undefined;
  // The trial box on the home page runs as a role with no AI at all, and `/api/ai/status` only
  // reports whether the server has AI configured, so the caller has to say.
  aiAvailable?: boolean | undefined;
  onDesign: (design: EndpointDesign | null) => void;
}

export const EndpointForm: React.FC<EndpointFormProps> = ({
  register,
  control,
  errors,
  setValue,
  submitCount,
  projectId,
  endpointGroupId,
  defaults,
  endpointId,
  hasStoredPlan,
  aiAvailable = true,
  onDesign,
}) => {
  const aiEnabled = useWatch({ control, name: "ai_enabled" });
  const responseHeaders = useWatch({ control, name: "response_headers" });
  const method = useWatch({ control, name: "method" });

  // The picker hands back a plain string; `method` is a string union in the DTO, so it is cast on
  // the way in. The schema still rejects anything outside the set on submit.
  const setMethod = (value: string) =>
    setValue("method", value as ClientCreateEndpointDTO["method"], {
      shouldDirty: true,
      shouldValidate: submitCount > 0,
    });

  const basicsHasError = !!(
    errors.method ||
    errors.path ||
    errors.response_body ||
    errors.delay_ms ||
    errors.status_code
  );
  const headersHasError = !!errors.response_headers;
  const aiHasError = !!(errors.ai_fields || errors.ai_prompt);

  const headerCount = responseHeaders?.filter((row) => row.name.trim() !== "").length ?? 0;

  const basics = (
    <>
      <div className="grid grid-cols-1 gap-3 @min-[420px]:grid-cols-2 @min-[660px]:grid-cols-[minmax(6.5rem,0.8fr)_2fr_minmax(5.5rem,0.7fr)_minmax(5.5rem,0.7fr)]">
        <div className="flex min-w-0 flex-col gap-1">
          <ComboInput
            className="w-full"
            id="method"
            label="Method"
            options={httpMethods}
            value={method ?? ""}
            onChange={setMethod}
            placeholder="GET"
          />
          {errors.method && <ErrorText message={errors.method.message} />}
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <DefaultInput
            className="w-full"
            label="Path"
            register={register("path")}
            type="text"
            id="path"
            placeholder="/api/user/:id"
          />
          {errors.path && <ErrorText message={errors.path.message} />}
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <DefaultInput
            className="w-full"
            label="Delay (ms)"
            register={register("delay_ms")}
            type="text"
            id="delay_ms"
            placeholder="100"
            {...(defaults ? { defaultValue: defaults.delay_ms } : {})}
          />
          {errors.delay_ms && <ErrorText message={errors.delay_ms.message} />}
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <DefaultInput
            className="w-full"
            label="Status Code"
            register={register("status_code")}
            type="text"
            id="status_code"
            placeholder="200"
          />
          {errors.status_code && <ErrorText message={errors.status_code.message} />}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <JsonEditor
          label="Response body"
          register={register("response_body")}
          id="response_body"
          placeholder={`{ "message": "Success" }`}
        />
        {errors.response_body && <ErrorText message={errors.response_body.message} />}
      </div>
    </>
  );

  return (
    <FormTabs
      ariaLabel="Form sections"
      className="@container flex flex-col gap-4"
      submitCount={submitCount}
      tabs={[
        {
          id: "basics",
          label: "Basics",
          hasError: basicsHasError,
          description:
            "The address this endpoint answers on, and the response it sends back every time.",
          content: basics,
        },
        {
          id: "headers",
          label: "Headers",
          hasError: headersHasError,
          marked: headerCount > 0,
          description:
            "Extra headers this endpoint sends back. Every response already carries a JSON content type and is never cached, so this is for the rest: a page count, an ETag, a redirect target.",
          content: (
            <ResponseHeadersEditor
              register={register}
              control={control}
              errors={errors}
              setValue={setValue}
              submitCount={submitCount}
            />
          ),
        },
        // The AI tab is left out rather than hidden when AI is off: the section fetches its own
        // status and quota, and a panel nobody can open must not spend requests on that.
        ...(aiAvailable
          ? [
              {
                id: "ai",
                label: "AI variants",
                hasError: aiHasError,
                marked: !!aiEnabled,
                description:
                  "Turn this on and AI rewrites the fields you pick, so every call to this endpoint answers with different data instead of the same body twice. Everything else stays exactly as you wrote it.",
                content: (
                  <AiEndpointSection
                    control={control}
                    register={register}
                    projectId={projectId}
                    endpointGroupId={endpointGroupId}
                    fieldsError={errors.ai_fields?.message}
                    promptError={errors.ai_prompt?.message}
                    endpointId={endpointId}
                    hasStoredPlan={hasStoredPlan}
                    onDesign={onDesign}
                  />
                ),
              },
            ]
          : []),
      ]}
    />
  );
};
