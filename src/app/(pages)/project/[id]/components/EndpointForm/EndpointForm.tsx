"use client";

import React, { useEffect, useState } from "react";
import {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  useWatch,
} from "react-hook-form";
import { ClientCreateEndpointDTO } from "@/models/endpoint/endpoint.model";
import { MAX_DELAY_MS, MAX_STATUS_CODE } from "@/models/endpoint/primitives.model";
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
import { ResponseCookiesEditor } from "@/app/(pages)/project/[id]/components/ResponseCookiesEditor/ResponseCookiesEditor";
import { ScenarioList } from "@/app/(pages)/project/[id]/components/ScenarioList/ScenarioList";
import { ScenarioHeader } from "@/app/(pages)/project/[id]/components/ScenarioHeader/ScenarioHeader";

// How many digits the largest allowed value takes, so the inputs stop where the schema does rather
// than at a length written out by hand. The range itself is still the resolver's to refuse.
const DELAY_DIGITS = String(MAX_DELAY_MS).length;
const STATUS_DIGITS = String(MAX_STATUS_CODE).length;

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
  // One `useFieldArray` row key per scenario, in order. They are what a page is keyed by, and what
  // says how many there are: a watched array is a frame behind the row the wrapper just added or
  // took away, and a page keyed by its index hands a removed page's inputs to its neighbour.
  scenarioKeys: string[];
  // The list's add, remove and activate, which are `useFieldArray` calls the wrapper owns.
  onAddScenario: () => void;
  onRemoveScenario: (index: number) => void;
  // How many scenarios this role may hold. `1` hides the list entirely, which is what the trial
  // box on the home page gets.
  maxScenarios: number;
  // Create only: the update form opens on the values it is editing.
  defaults?: { delay_ms: string } | undefined;
  // Update only: whether each stored scenario already carries a blueprint, by its `public_id`.
  storedPlans?: Record<string, boolean> | undefined;
  // The trial box on the home page runs as a role with no AI at all, and `/api/ai/status` only
  // reports whether the server has AI configured, so the caller has to say.
  aiAvailable?: boolean | undefined;
  onDesign: (index: number, design: EndpointDesign | null) => void;
}

export const EndpointForm: React.FC<EndpointFormProps> = ({
  register,
  control,
  errors,
  setValue,
  submitCount,
  projectId,
  endpointGroupId,
  scenarioKeys,
  onAddScenario,
  onRemoveScenario,
  maxScenarios,
  defaults,
  storedPlans,
  aiAvailable = true,
  onDesign,
}) => {
  const scenarios = useWatch({ control, name: "scenarios" }) ?? [];
  const activeScenario = useWatch({ control, name: "active_scenario" }) ?? 0;
  const method = useWatch({ control, name: "method" });

  const [page, setPage] = useState(activeScenario);

  const scenarioCount = scenarioKeys.length;

  // One scenario is the endpoint as it has always been, so the column would only be a list of one
  // row and a name nobody chose. It appears once there is something to switch between.
  const multiScenario = maxScenarios > 1;

  // The form opens on whichever page the mock is answering with, which is the one an author
  // came to look at. It only follows the active page while they have not moved off it.
  useEffect(() => {
    setPage((current) => (current < scenarioCount ? current : Math.max(scenarioCount - 1, 0)));
  }, [scenarioCount]);

  // The picker hands back a plain string; `method` is a string union in the DTO, so it is cast on
  // the way in. The schema still rejects anything outside the set on submit.
  const setMethod = (value: string) =>
    setValue("method", value as ClientCreateEndpointDTO["method"], {
      shouldDirty: true,
      shouldValidate: submitCount > 0,
    });

  const addScenario = () => {
    onAddScenario();
    setPage(scenarioCount);
  };

  const removeScenario = (index: number) => {
    onRemoveScenario(index);
    // The active page moves with the list rather than pointing past its end, and a removed active
    // page hands the job to the first one, which is what the server does too.
    if (index === activeScenario) setValue("active_scenario", 0, { shouldDirty: true });
    else if (index < activeScenario) setValue("active_scenario", activeScenario - 1, { shouldDirty: true });
    setPage((current) => Math.max(Math.min(current, scenarioCount - 2), 0));
  };

  // A failed submit opens the first broken page, then `FormTabs` opens the tab inside it. Without
  // this the author is told something is wrong on a page they cannot see.
  useEffect(() => {
    if (submitCount === 0) return;
    // `Array.isArray` because the field can also hold a `root` error for the list as a whole,
    // which names no page to open.
    if (!Array.isArray(errors.scenarios)) return;
    const broken = errors.scenarios.findIndex((row) => !!row);
    if (broken >= 0) setPage(broken);
  }, [submitCount, errors.scenarios]);

  const scenarioErrors = errors.scenarios?.[page];
  const basicsHasError = !!(
    errors.method ||
    errors.path ||
    scenarioErrors?.response_body ||
    scenarioErrors?.delay_ms ||
    scenarioErrors?.status_code
  );
  const headersHasError = !!scenarioErrors?.response_headers;
  const cookiesHasError = !!scenarioErrors?.response_cookies;
  const aiHasError = !!(scenarioErrors?.ai_fields || scenarioErrors?.ai_prompt);

  const address = (
    <div className="grid grid-cols-1 gap-3 @min-[420px]:grid-cols-[minmax(6.5rem,0.8fr)_2fr]">
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
    </div>
  );

  // Every page stays in the tree and the ones off screen are hidden, the same rule `FormTabs`
  // follows: `JsonEditor` measures its height once on mount and holds its undo stack in a ref, so
  // remounting a page would throw away a half-typed body.
  const pages = scenarioKeys.map((key, index) => {
    // A row the wrapper has just added is not in the watched array yet, so every read of it here
    // answers for a page that is about to arrive rather than throwing on the frame in between.
    const scenario = scenarios[index];
    const rowErrors = errors.scenarios?.[index];
    const enabled = scenario?.ai_enabled ?? false;
    const publicId = scenario?.public_id;
    const headerCount =
      scenario?.response_headers?.filter((row) => row.name.trim() !== "").length ?? 0;
    const cookieCount =
      scenario?.response_cookies?.filter((row) => row.name.trim() !== "").length ?? 0;

    const basics = (
      <>
        <div className="grid grid-cols-1 gap-3 @min-[420px]:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1">
            <DefaultInput
              className="w-full"
              label="Delay (ms)"
              register={register(`scenarios.${index}.delay_ms`)}
              type="text"
              id={`scenarios.${index}.delay_ms`}
              placeholder="100"
              inputMode="numeric"
              maxLength={DELAY_DIGITS}
              {...(defaults ? { defaultValue: defaults.delay_ms } : {})}
            />
            {rowErrors?.delay_ms && <ErrorText message={rowErrors.delay_ms.message} />}
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <DefaultInput
              className="w-full"
              label="Status Code"
              register={register(`scenarios.${index}.status_code`)}
              type="text"
              id={`scenarios.${index}.status_code`}
              placeholder="200"
              inputMode="numeric"
              maxLength={STATUS_DIGITS}
            />
            {rowErrors?.status_code && <ErrorText message={rowErrors.status_code.message} />}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <JsonEditor
            label="Response body"
            register={register(`scenarios.${index}.response_body`)}
            id={`scenarios.${index}.response_body`}
            placeholder={`{ "message": "Success" }`}
          />
          {rowErrors?.response_body && <ErrorText message={rowErrors.response_body.message} />}
        </div>
      </>
    );

    return (
      <div key={key} className={index === page ? "flex flex-col gap-4" : "hidden"}>
        {multiScenario && (
          <ScenarioHeader
            register={register}
            index={index}
            nameError={rowErrors?.name?.message}
            isActive={index === activeScenario}
            canRemove={scenarioCount > 1}
            onActivate={() => setValue("active_scenario", index, { shouldDirty: true })}
            onRemove={() => removeScenario(index)}
          />
        )}

        <FormTabs
          ariaLabel="Form sections"
          className="@container flex flex-col gap-4"
          submitCount={submitCount}
          tabs={[
            {
              id: "basics",
              label: "Basics",
              hasError: index === page && basicsHasError,
              description:
                "The response this scenario sends back, for as long as it is the one answering.",
              content: basics,
            },
            {
              id: "headers",
              label: "Headers",
              hasError: index === page && headersHasError,
              marked: headerCount > 0,
              description:
                "Extra headers this scenario sends back, such as a page count or a redirect target.",
              content: (
                <ResponseHeadersEditor
                  register={register}
                  control={control}
                  errors={errors}
                  setValue={setValue}
                  submitCount={submitCount}
                  index={index}
                />
              ),
            },
            {
              id: "cookies",
              label: "Cookies",
              hasError: index === page && cookiesHasError,
              marked: cookieCount > 0,
              description:
                "Cookies this scenario sets, on your project's own address and nowhere else.",
              content: (
                <ResponseCookiesEditor
                  register={register}
                  control={control}
                  errors={errors}
                  setValue={setValue}
                  submitCount={submitCount}
                  index={index}
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
                    hasError: index === page && aiHasError,
                    marked: !!enabled,
                    description:
                      "AI rewrites the fields you pick, so every call sends different data.",
                    content: (
                      <AiEndpointSection
                        control={control}
                        register={register}
                        projectId={projectId}
                        endpointGroupId={endpointGroupId}
                        fieldsError={rowErrors?.ai_fields?.message}
                        promptError={rowErrors?.ai_prompt?.message}
                        index={index}
                        {...(publicId ? { scenarioId: publicId } : {})}
                        hasStoredPlan={publicId ? storedPlans?.[publicId] : undefined}
                        onDesign={(design) => onDesign(index, design)}
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
    );
  });

  return (
    <div className="@container flex flex-col gap-4">
      {address}

      {multiScenario ? (
        <div className="grid grid-cols-1 gap-4 @min-[700px]:grid-cols-[11.5rem_minmax(0,1fr)]">
          <ScenarioList
            scenarioKeys={scenarioKeys}
            scenarios={scenarios}
            errors={errors}
            current={page}
            active={activeScenario}
            max={maxScenarios}
            onSelect={setPage}
            onAdd={addScenario}
          />

          <div className="flex min-w-0 flex-col">{pages}</div>
        </div>
      ) : (
        pages
      )}
    </div>
  );
};
