"use client";

import React, { useEffect, useState } from "react";
import { Control, FieldErrors, UseFormRegister, useWatch } from "react-hook-form";
import { ClientCreateEndpointDTO } from "@/models/endpoint/endpoint.model";
import { DefaultInput } from "@/app/components/Input/DefaultInput";
import { SelectInput } from "@/app/components/Input/SelectInput";
import { JsonEditor } from "@/app/components/Input/JsonEditor";
import { ErrorText } from "@/app/components/Text/ErrorText";
import { PillTabs } from "@/app/components/Tabs/PillTabs";
import { httpMethods } from "@/app/(pages)/project/[id]/components/EndpointForm/httpMethods";
import {
  AiEndpointSection,
  EndpointDesign,
} from "@/app/(pages)/project/[id]/components/AiEndpointSection/AiEndpointSection";

type Tab = "basics" | "ai";

interface EndpointFormProps {
  register: UseFormRegister<ClientCreateEndpointDTO>;
  control: Control<ClientCreateEndpointDTO>;
  errors: FieldErrors<ClientCreateEndpointDTO>;
  // Only a submit attempt moves the tab, so the effect below needs to see the attempts, not the
  // errors alone: an error that is already on screen must not yank the tab while the user types.
  submitCount: number;
  projectId: string;
  endpointGroupId: string;
  // Create only: the update form opens on the values it is editing.
  defaults?: { delay_ms: string; status_code: string } | undefined;
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
  submitCount,
  projectId,
  endpointGroupId,
  defaults,
  endpointId,
  hasStoredPlan,
  aiAvailable = true,
  onDesign,
}) => {
  const [tab, setTab] = useState<Tab>("basics");
  const aiEnabled = useWatch({ control, name: "ai_enabled" });

  const basicsHasError = !!(
    errors.method ||
    errors.path ||
    errors.response_body ||
    errors.delay_ms ||
    errors.status_code
  );
  const aiHasError = !!(errors.ai_fields || errors.ai_prompt);

  // A message under a control on the hidden panel is a message nobody reads, so a failed submit
  // opens the panel that carries it. Basics wins when both are wrong: its fields come first.
  useEffect(() => {
    if (submitCount === 0) return;

    if (basicsHasError) setTab("basics");
    else if (aiHasError) setTab("ai");
  }, [submitCount, basicsHasError, aiHasError]);

  const aiDot = aiHasError ? "error" : aiEnabled ? "accent" : undefined;

  // Both panels stay mounted. `JsonEditor` measures its own height once on mount and holds the
  // undo stack in a ref, so unmounting the Basics panel would lose a half-typed body.
  return (
    <div className="@container flex flex-col gap-4">
      {aiAvailable && (
        <PillTabs
          ariaLabel="Form sections"
          value={tab}
          onChange={(id) => setTab(id as Tab)}
          tabs={[
            { id: "basics", label: "Basics", ...(basicsHasError ? { dot: "error" as const } : {}) },
            { id: "ai", label: "AI variants", ...(aiDot ? { dot: aiDot } : {}) },
          ]}
        />
      )}

      <div className={tab === "basics" ? "flex flex-col gap-4" : "hidden"}>
        <p className="text-xs text-gray-500">
          The address this endpoint answers on, and the response it sends back every time.
        </p>

        <div className="grid grid-cols-1 gap-3 @min-[420px]:grid-cols-2 @min-[660px]:grid-cols-[minmax(6.5rem,0.8fr)_2fr_minmax(5.5rem,0.7fr)_minmax(5.5rem,0.7fr)]">
          <div className="flex min-w-0 flex-col gap-1">
            <SelectInput
              className="w-full"
              label="Method"
              id="method"
              options={httpMethods}
              register={register("method")}
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
              {...(defaults ? { defaultValue: defaults.status_code } : {})}
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
      </div>

      {/* Unmounted rather than hidden when AI is off: the section fetches its own status and
          quota, and a panel nobody can open must not spend requests on that. */}
      {aiAvailable && (
        <div className={tab === "ai" ? "flex flex-col gap-4" : "hidden"}>
          <p className="text-xs text-gray-500">
            Turn this on and AI rewrites the fields you pick, so every call to this endpoint answers
            with different data instead of the same body twice. Everything else stays exactly as you
            wrote it.
          </p>

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
        </div>
      )}
    </div>
  );
};
