"use client";

import { useEffect, useState } from "react";
import { Controller, Control, UseFormRegister, useWatch } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Checkbox } from "@/app/components/Input/Checkbox";
import { ErrorText } from "@/app/components/Text/ErrorText";
import { Spinner } from "@/app/components/Loading/Spinner";
import Notify from "@/app/components/Notify";
import api from "@/app/libs/helpers/api_call.client";
import buildUrl from "@/app/libs/helpers/url_builder";
import { API_ROUTES } from "@/app/libs/routes";
import { QUERY_KEY, STALETIME } from "@/app/components/Wrapper/QueryClient/Constants";
import { ApiErrorResponse, ApiSuccessResponse } from "@/models/api_response.model";
import { ClientCreateEndpointDTO } from "@/models/endpoint.model";
import { AiFieldSelector } from "@/app/(pages)/project/[id]/components/AiFieldSelector/AiFieldSelector";
import { useAiFieldTree } from "@/app/(pages)/project/[id]/components/AiFieldSelector/useAiFieldTree";

/**
 * The AI options block, shared by the create and update forms.
 *
 * This has to be a client component, and not only because of the hooks: it takes react-hook-form's
 * `control` and `register`, which carry methods and refs and so cannot cross the server
 * boundary. The `"use client"` directive above is really just documentation, since both
 * parent forms already carry it and everything a client component imports is client code.
 *
 * `ClientUpdateEndpointByIdDTO` is an alias of `ClientCreateEndpointDTO`, so one control
 * type serves both forms.
 */
interface AiEndpointSectionProps {
  control: Control<ClientCreateEndpointDTO>;
  register: UseFormRegister<ClientCreateEndpointDTO>;
  projectId: string;
  endpointGroupId: string;
  errorMessage?: string | undefined;
}

async function fetchAiConfigured(): Promise<boolean> {
  const res = (await api.get(API_ROUTES.AI.STATUS)).data as ApiSuccessResponse;
  return (res.data as { configured: boolean }).configured;
}

/**
 * Seconds the Preview button stays locked after a request settles.
 *
 * Every click is a real model call that is charged but never counted against the daily quota,
 * since a preview writes no `endpoint_ai_variants` row and that table is what the quota counts.
 * The cooldown turns an idle habit of clicking into a deliberate one.
 */
const PREVIEW_COOLDOWN_SECONDS = 10;

/**
 * Pretty print a variant, falling back to the raw text.
 *
 * The variants come back from a model, so a reply that is not valid JSON is a possibility rather
 * than a bug to assume away, and an uncaught `JSON.parse` here would throw during render and take
 * the whole endpoint form down with it.
 */
function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export const AiEndpointSection: React.FC<AiEndpointSectionProps> = ({
  control,
  register,
  projectId,
  endpointGroupId,
  errorMessage,
}) => {
  const [preview, setPreview] = useState<string[]>([]);
  const [cooldown, setCooldown] = useState(0);

  // One timeout per tick rather than one interval for the whole countdown: the effect already
  // reruns on every change of `cooldown`, so an interval would need clearing on the same
  // schedule anyway, and a stale interval firing after unmount is the usual bug here.
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(() => setCooldown((left) => Math.max(left - 1, 0)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // The project page seeds this from the server, so the first render already knows the
  // answer. The query stays as the fallback for a cache that was never seeded.
  const aiStatus = useQuery<boolean, ApiErrorResponse>({
    queryKey: [QUERY_KEY.AI.STATUS],
    queryFn: fetchAiConfigured,
    staleTime: STALETIME,
  });

  // Read straight from the form so the field tree tracks what is being typed in the body.
  const enabled = useWatch({ control, name: "ai_enabled" });
  const bodyJson = useWatch({ control, name: "response_body" }) ?? "";
  const aiFields = useWatch({ control, name: "ai_fields" }) ?? [];
  const aiPrompt = useWatch({ control, name: "ai_prompt" });
  const method = useWatch({ control, name: "method" });
  const path = useWatch({ control, name: "path" });

  // The same reading of the body the selector draws from, so the footnote and the Preview button
  // cannot claim fields are pickable while the selector shows an empty state.
  const { state: fieldState } = useAiFieldTree(bodyJson);
  const hasFields = fieldState === "ready";

  const previewMutation = useMutation<string[], ApiErrorResponse>({
    mutationFn: async () => {
      const res = (
        await api.post(buildUrl(API_ROUTES.ENDPOINT.AI_PREVIEW, { projectId, endpointGroupId }), {
          method,
          path: path || "/",
          response_body: bodyJson,
          ai_fields: aiFields,
          ai_prompt: aiPrompt ?? null,
          count: 3,
        })
      ).data as ApiSuccessResponse;
      return (res.data as { variants: string[] }).variants;
    },
    onSuccess: setPreview,
    onError: (error) => Notify.error(error.message),
    // `onSettled`, not `onSuccess`: a failed call costs the same as a successful one, and a
    // provider that just rate limited us is the last thing to hammer.
    onSettled: () => setCooldown(PREVIEW_COOLDOWN_SECONDS),
  });

  // Hide the whole block when the server has no AI configured, rather than letting someone
  // click through to an error.
  if (!aiStatus.data) return null;

  /** One line under the hint row, answering why Preview is locked, or what a preview costs. */
  const previewNote = (() => {
    if (fieldState === "invalid") return "Enter a valid JSON object in Response body first.";
    if (!hasFields) return "This response body has no field AI can vary.";
    if (aiFields.length === 0) return "Pick at least one field to preview.";
    if (cooldown > 0) return `Each preview is a real AI call. You can run another in ${cooldown}s.`;
    return null;
  })();

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/*
        `items-center`, so the icon and the checkbox stay centred against the text column however
        many lines the subtitle wraps to. Top aligning them leaves the row lopsided as soon as the
        modal is narrow enough for a second line.
      */}
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
          <Sparkles size={18} />
        </span>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold text-gray-800">AI response variants</span>
          <span className="text-xs text-gray-500">Only the fields you tick get varied.</span>
        </div>

        {/* `shrink-0`, so "Enable" never wraps under its own box on a narrow modal. */}
        <div className="shrink-0">
          <Controller
            control={control}
            name="ai_enabled"
            render={({ field }) => (
              <Checkbox
                id="ai_enabled"
                label="Enable"
                // The update form opens on an endpoint that may already have AI on, and the box
                // has to show that. `field.value` is the only place that state lives, so it has
                // to be handed over explicitly; the register object below carries no value.
                checked={!!field.value}
                register={{
                  name: field.name,
                  ref: field.ref,
                  // Checkbox forwards the raw event, so unwrap `checked` before it reaches
                  // the form: `value` on a checkbox input is the string "on", not a boolean.
                  onChange: async (event) => field.onChange(event.target.checked),
                  onBlur: async () => field.onBlur(),
                }}
              />
            )}
          />
        </div>
      </div>

      {enabled && (
        <div className="flex flex-col gap-4 border-t border-gray-100 pt-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-700">Fields the AI may change</span>
              {aiFields.length > 0 && (
                <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                  {aiFields.length} selected
                </span>
              )}
            </div>

            <Controller
              control={control}
              name="ai_fields"
              render={({ field }) => (
                <AiFieldSelector
                  bodyJson={bodyJson}
                  value={field.value ?? []}
                  onChange={field.onChange}
                />
              )}
            />
            {errorMessage && <ErrorText message={errorMessage} />}
          </div>

          {/*
            The label sits above its own row so the input and the button are siblings in a
            plain flex row. Both carry `h-10`, which is what actually lines them up: matching
            an input's height by eye fails as soon as padding or font size changes.
          */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ai_prompt" className="text-sm text-gray-700">
              Hint for the AI (optional)
            </label>

            <div className="flex gap-2">
              {/* `min-w-0` lets the input shrink below its placeholder instead of pushing
                  the button off the row, which is what truncated the placeholder before. */}
              <input
                id="ai_prompt"
                type="text"
                placeholder="e.g. use uuid for id field"
                {...register("ai_prompt")}
                className="h-10 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/*
                Below `sm` the button is a square icon: the hint input needs the whole row on a
                phone, and a label that only ever reads "Preview" is the first thing that can
                go. `aria-label` carries the same words for a screen reader either way, and the
                countdown is still spelled out in the line under the row.
              */}
              <button
                type="button"
                aria-label={cooldown > 0 ? `Wait ${cooldown} seconds` : "Preview"}
                title={cooldown > 0 ? `Wait ${cooldown}s` : "Preview"}
                disabled={
                  !hasFields || aiFields.length === 0 || previewMutation.isPending || cooldown > 0
                }
                onClick={() => previewMutation.mutate()}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-0 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-32 sm:px-4"
              >
                {previewMutation.isPending ? <Spinner size={16} /> : <Sparkles size={16} />}
                {/* Fixed width from `sm` up so the countdown does not resize the button every second. */}
                <span className="hidden sm:inline">
                  {cooldown > 0 ? `Wait ${cooldown}s` : "Preview"}
                </span>
              </button>
            </div>

            {previewNote && <span className="text-xs text-gray-400">{previewNote}</span>}
          </div>

          {preview.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {preview.length} sample variants
                </span>
                <button
                  type="button"
                  onClick={() => setPreview([])}
                  className="cursor-pointer text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 hover:underline"
                >
                  Clear
                </button>
              </div>

              {preview.map((variant, index) => (
                <div
                  key={index}
                  className="relative overflow-hidden rounded-lg border border-gray-800 bg-gray-900"
                >
                  <span className="absolute right-2 top-2 rounded bg-gray-800 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
                    {index + 1}
                  </span>
                  <pre className="max-h-40 overflow-auto p-3 pr-10 font-mono text-xs leading-relaxed text-gray-100">
                    {formatJson(variant)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
