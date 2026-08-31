"use client";

import React from "react";
import { Controller, Control, UseFormRegister } from "react-hook-form";
import { Dice5, Sparkles } from "lucide-react";
import { Switch } from "@/app/components/Input/Switch";
import { ErrorText } from "@/app/components/Text/ErrorText";
import { Spinner } from "@/app/components/Loading/Spinner";
import { ClientCreateEndpointDTO, MAX_AI_PROMPT_LENGTH } from "@/models/endpoint/endpoint.model";
import { AiFieldSelector } from "@/app/(pages)/project/[id]/components/AiFieldSelector/AiFieldSelector";
import { AiNotice } from "@/app/(pages)/project/[id]/components/AiEndpointSection/AiNotice";
import { AiPlanSummary } from "@/app/(pages)/project/[id]/components/AiEndpointSection/AiPlanSummary";
import { AiPreviewPanel } from "@/app/(pages)/project/[id]/components/AiEndpointSection/AiPreviewPanel";
import {
  EndpointDesign,
  SUPPORTED_LANGUAGES,
  useAiEndpointSection,
} from "@/app/(pages)/project/[id]/components/AiEndpointSection/viewmodel";

// Both endpoint forms import these from here, so they stay re-exported after the move.
export { planEnvelopeOf } from "@/app/(pages)/project/[id]/components/AiEndpointSection/viewmodel";
export type { EndpointDesign };

interface AiEndpointSectionProps {
  control: Control<ClientCreateEndpointDTO>;
  register: UseFormRegister<ClientCreateEndpointDTO>;
  projectId: string;
  endpointGroupId: string;
  fieldsError?: string | undefined;
  promptError?: string | undefined;
  // Set by the update form only: the endpoint being edited, and whether it already stores a
  // blueprint. Together they let the first reroll be free instead of designing what exists.
  endpointId?: string | undefined;
  hasStoredPlan?: boolean | undefined;
  // The blueprint the last preview designed, or `null` once the inputs stop matching it. The form
  // sends it with the endpoint so the server adopts it instead of paying for the same design.
  onDesign?: (design: EndpointDesign | null) => void;
}

export const AiEndpointSection: React.FC<AiEndpointSectionProps> = ({
  control,
  register,
  projectId,
  endpointGroupId,
  fieldsError,
  promptError,
  endpointId,
  hasStoredPlan,
  onDesign,
}) => {
  const vm = useAiEndpointSection({
    control,
    projectId,
    endpointGroupId,
    endpointId,
    hasStoredPlan,
    onDesign,
  });

  // An endpoint saved while AI was configured keeps its flag after the keys go away, and the
  // only `ai_enabled` switch lives in here, so hiding the whole card would leave the author
  // no way to turn it back off.
  if (!vm.configured && !vm.enabled) return null;

  const active = vm.enabled && vm.configured;

  // `min-w-40` on the title column is what makes the switch drop to its own line on a narrow
  // card, instead of the title shrinking into a three-line column beside it. Below 600px of
  // card width the preview buttons drop under the prompt input, each on an 8rem basis.

  // Two preview buttons, not one, because they cost different things: new samples are rendered
  // locally and free, designing spends one of the day's AI calls.
  return (
    // The `@container` sits outside the card rather than on it: an element that opens a query
    // context cannot be sized by its own query, so the card's own `@min-[600px]:` classes would
    // otherwise measure whatever container lies further up.
    <div className="@container">
      <div
        className={`flex flex-col gap-4 rounded-xl border bg-white p-3 transition-[border-color,box-shadow] duration-150 @min-[600px]:p-4 ${
          active
            ? "border-blue-200 shadow-[0_1px_2px_0_rgb(0_0_0/0.05),0_0_0_3px_var(--color-blue-50)]"
            : "border-gray-200 shadow-sm"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <Sparkles size={18} />
          </span>

          <div className="flex min-w-40 flex-1 flex-col">
            <span className="text-sm font-semibold text-gray-800">AI response variants</span>
            <span className="text-xs text-gray-500">Only the fields you tick get varied.</span>
          </div>

          {active && vm.quota && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                vm.spentOut ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
              }`}
            >
              {vm.quota.spent} of {vm.quota.limit} designs today
            </span>
          )}

          <div className="ml-auto shrink-0">
            <Controller
              control={control}
              name="ai_enabled"
              render={({ field }) => (
                <Switch
                  id="ai_enabled"
                  label="Enable"
                  checked={!!field.value}
                  register={{
                    name: field.name,
                    ref: field.ref,
                    // Unwrap `checked`: `value` on a checkbox input is the string "on".
                    onChange: async (event) => field.onChange(event.target.checked),
                    onBlur: async () => field.onBlur(),
                  }}
                />
              )}
            />
          </div>
        </div>

        {vm.enabled && !vm.configured && (
          <AiNotice>
            <span>
              AI is switched off for this server, so this endpoint answers with the response body
              exactly as written. Switch Enable off to clear the flag.
            </span>
          </AiNotice>
        )}

        {active && (
          <div className="flex flex-col gap-4 border-t border-gray-100 pt-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-800">Fields the AI may change</span>
                <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-blue-700">
                  {vm.selectedCount} of {vm.fieldCount}
                </span>
              </div>

              <Controller
                control={control}
                name="ai_fields"
                render={({ field }) => (
                  <AiFieldSelector
                    bodyJson={vm.bodyJson}
                    value={field.value ?? []}
                    onChange={field.onChange}
                  />
                )}
              />
              {fieldsError && <ErrorText message={fieldsError} />}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ai_prompt" className="text-sm text-gray-800">
                Hint for the AI (optional)
              </label>

              <div className="flex flex-col gap-2 @min-[600px]:flex-row @min-[600px]:items-center">
                <input
                  id="ai_prompt"
                  type="text"
                  maxLength={MAX_AI_PROMPT_LENGTH}
                  placeholder="e.g. use uuid for id field"
                  {...register("ai_prompt")}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none @min-[600px]:min-w-0 @min-[600px]:flex-1"
                />

                <div className="flex flex-wrap gap-2 @min-[600px]:shrink-0">
                  {vm.reusable && (
                    <button
                      type="button"
                      title="New samples, free"
                      disabled={vm.blocked}
                      onClick={() => vm.runPreview(true)}
                      className="flex h-10 grow basis-32 cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-medium whitespace-nowrap text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 @min-[600px]:grow-0 @min-[600px]:basis-auto"
                    >
                      {vm.isPending ? <Spinner size={16} /> : <Dice5 size={16} />}
                      New samples
                    </button>
                  )}

                  <button
                    type="button"
                    title={
                      vm.cooldown > 0
                        ? `Wait ${vm.cooldown}s`
                        : vm.reusable
                          ? "Redesign, one AI call"
                          : "Preview"
                    }
                    disabled={vm.blocked || vm.cooldown > 0}
                    onClick={() => vm.runPreview(false)}
                    className={`flex h-10 grow basis-32 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 @min-[600px]:grow-0 @min-[600px]:basis-auto ${
                      vm.reusable
                        ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    {vm.isPending ? <Spinner size={16} /> : <Sparkles size={16} />}
                    {vm.cooldown > 0 ? `Wait ${vm.cooldown}s` : vm.reusable ? "Redesign" : "Preview"}
                  </button>
                </div>
              </div>

              {promptError && <ErrorText message={promptError} />}

              {vm.previewNote && <span className="text-xs text-gray-400">{vm.previewNote}</span>}

              <span className="text-xs text-gray-400">
                Names and addresses can come back in: {SUPPORTED_LANGUAGES}.
              </span>

              {vm.reusable?.unsupportedLanguage && (
                <AiNotice>
                  <span>
                    <span className="font-medium">{vm.reusable.unsupportedLanguage}</span> is not
                    supported yet. Names and addresses will come back in the closest language on the
                    list above.
                  </span>
                </AiNotice>
              )}

              {vm.reusable && vm.reusable.unappliedHints.length > 0 && (
                <AiNotice title="Part of your hint could not be applied:">
                  <ul className="list-inside list-disc">
                    {vm.reusable.unappliedHints.map((hint) => (
                      <li key={hint}>{hint}</li>
                    ))}
                  </ul>
                </AiNotice>
              )}
            </div>

            <AiPlanSummary
              rows={vm.summary}
              catalogNote={vm.catalogNote}
              open={vm.showSummary}
              onToggle={vm.toggleSummary}
            />

            <AiPreviewPanel variants={vm.preview} pending={vm.isPending} onClear={vm.clearPreview} />
          </div>
        )}
      </div>
    </div>
  );
};
