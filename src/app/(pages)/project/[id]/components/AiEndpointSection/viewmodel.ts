"use client";

import { useEffect, useRef, useState } from "react";
import { Control, useWatch } from "react-hook-form";
import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Notify from "@/app/components/Notify";
import api from "@/app/libs/helpers/api_call.client";
import buildUrl from "@/app/libs/helpers/url_builder";
import { API_ROUTES } from "@/app/libs/routes";
import { QUERY_KEY, STALETIME } from "@/app/components/Wrapper/QueryClient/Constants";
import { ApiErrorResponse, ApiSuccessResponse } from "@/models/api_response.model";
import { ClientCreateEndpointDTO } from "@/models/endpoint/endpoint.model";
import { UserUsageDTO } from "@/models/user.model";
import { aiFieldsMessage } from "@/app/(pages)/project/[id]/components/EndpointForm/validateAiFields";
import { LOCALE_LABELS, SUPPORTED_LOCALES, VariantPlanDTO } from "@/models/endpoint_plan/endpoint_plan.model";
import { describePlan, describePlanCatalogs } from "@/app/libs/helpers/plan_summary";
import { useAiFieldTree } from "@/app/(pages)/project/[id]/components/AiFieldSelector/useAiFieldTree";

export interface EndpointDesign {
  plan: VariantPlanDTO;
  hash: string;
}

// What a create or update sends alongside the endpoint. Both keys always travel, so the server
// never has to tell "no blueprint" apart from "field missing".
export function planEnvelopeOf(design: EndpointDesign | null) {
  return { plan: design?.plan ?? null, plan_hash: design?.hash ?? null };
}

async function fetchAiConfigured(): Promise<boolean> {
  const res = (await api.get(API_ROUTES.AI.STATUS)).data as ApiSuccessResponse;
  return (res.data as { configured: boolean }).configured;
}

async function fetchUserUsage(): Promise<UserUsageDTO> {
  const res = (await api.get(API_ROUTES.USER.USAGE)).data as ApiSuccessResponse;
  return res.data as UserUsageDTO;
}

// Only a redesign is a real model call, so only a redesign waits.
const DESIGN_COOLDOWN_SECONDS = 10;

// Only shown once a hint has asked for a language off the list, which is the moment the author
// needs it. Anything outside it comes back flagged, not silently English.
export const SUPPORTED_LANGUAGES = SUPPORTED_LOCALES.map((locale) => LOCALE_LABELS[locale]).join(", ");

interface AiQuota {
  limit: number;
  spent: number;
}

interface PreviewResult {
  variants: string[];
  plan: VariantPlanDTO;
  plan_hash: string;
  unapplied_hints: string[];
  quota: AiQuota;
}

function isAiQuota(value: unknown): value is AiQuota {
  if (typeof value !== "object" || value === null) return false;

  const { limit, spent } = value as Partial<AiQuota>;
  return typeof limit === "number" && typeof spent === "number";
}

// Writes what the server just counted straight into the cache. Nothing is invented when the cache
// is empty: the query's own fetch is what fills it. Both endpoint forms use this too, since a
// save refused for want of a design carries the same shape back.
export function applyAiQuota(queryClient: QueryClient, source: unknown) {
  if (!isAiQuota(source)) return;

  queryClient.setQueryData<UserUsageDTO>([QUERY_KEY.USER.USAGE], (old) =>
    old ? { ...old, used: { ...old.used, ai_plans_today: source.spent } } : old
  );
}

// What a blueprint was designed for, compared here only to label the buttons honestly. The body
// is normalized the way `planHash` normalizes it, or whitespace alone would drop a usable
// blueprint and push the user onto the metered button.
function inputSignature(body: string, fields: string[], prompt: string | null): string {
  let normalizedBody = body;
  try {
    normalizedBody = JSON.stringify(JSON.parse(body));
  } catch {
    // Matches the server, which hashes an unparseable body as its raw text.
  }

  return JSON.stringify([normalizedBody, [...fields].sort(), prompt?.trim() || null]);
}

// The half of a blueprint's identity the client can reason about without holding the blueprint. A
// blueprint varies the fields it was designed for and answers the hint it was designed under, so
// a change to either needs a new design however the body reads. Normalized the way `planHash`
// normalizes them, so reordering checkboxes is not a change.
function selectionSignature(fields: string[], prompt: string | null): string {
  return JSON.stringify([[...fields].sort(), prompt?.trim() || null]);
}

export function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

interface UseAiEndpointSectionArgs {
  control: Control<ClientCreateEndpointDTO>;
  projectId: string;
  endpointGroupId: string;
  // Both absent on create: there is no endpoint yet, so there is nothing stored to reuse.
  endpointId?: string | undefined;
  hasStoredPlan?: boolean | undefined;
  onDesign?: ((design: EndpointDesign | null) => void) | undefined;
}

// A blueprint the section can reroll from. `plan` is null when the server holds it and the client
// has only been told it exists, which is how an endpoint opened for editing starts out.
interface Design {
  plan: VariantPlanDTO | null;
  hash: string | null;
  signature: string;
  unappliedHints: string[];
  unsupportedLanguage: string | null;
}

export function useAiEndpointSection({
  control,
  projectId,
  endpointGroupId,
  endpointId,
  hasStoredPlan,
  onDesign,
}: UseAiEndpointSectionArgs) {
  const [preview, setPreview] = useState<string[]>([]);
  const [cooldown, setCooldown] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  // Held in a ref so a parent passing an inline callback does not re-fire the effect below.
  const onDesignRef = useRef(onDesign);
  onDesignRef.current = onDesign;

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(() => setCooldown((left) => Math.max(left - 1, 0)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const queryClient = useQueryClient();

  const aiStatus = useQuery<boolean, ApiErrorResponse>({
    queryKey: [QUERY_KEY.AI.STATUS],
    queryFn: fetchAiConfigured,
    staleTime: STALETIME,
  });

  // Not aged by `STALETIME` like the rest: saving an endpoint spends a design in a background
  // task the response cannot report, so opening the card is the moment to ask again.
  const usage = useQuery<UserUsageDTO, ApiErrorResponse>({
    queryKey: [QUERY_KEY.USER.USAGE],
    queryFn: fetchUserUsage,
    staleTime: 0,
  });

  const enabled = useWatch({ control, name: "ai_enabled" });
  const bodyJson = useWatch({ control, name: "response_body" }) ?? "";
  const aiFields = useWatch({ control, name: "ai_fields" }) ?? [];
  const aiPrompt = useWatch({ control, name: "ai_prompt" });
  const method = useWatch({ control, name: "method" });
  const path = useWatch({ control, name: "path" });

  // Declared after the watches so the seed can read the form's initial values, which are the
  // inputs the stored blueprint was built for as long as nothing has been edited yet.
  const [design, setDesign] = useState<Design | null>(() =>
    hasStoredPlan
      ? {
          plan: null,
          hash: null,
          signature: inputSignature(bodyJson, aiFields, aiPrompt ?? null),
          unappliedHints: [],
          unsupportedLanguage: null,
        }
      : null
  );

  // Seeded beside `design`, and for the same reason: on the first render these are the values the
  // endpoint was saved with, which is what the stored blueprint was designed for.
  const [savedSelection] = useState(() => selectionSignature(aiFields, aiPrompt ?? null));
  const selectionMoved = selectionSignature(aiFields, aiPrompt ?? null) !== savedSelection;

  const { state: fieldState, availablePaths } = useAiFieldTree(bodyJson);
  const hasFields = fieldState === "ready";

  const signature = inputSignature(bodyJson, aiFields, aiPrompt ?? null);
  const reusable = design?.signature === signature ? design : null;

  // The samples were rendered from the body, fields and hint the blueprint was designed for, so
  // they stop describing this endpoint the moment any of those change. The buttons already fall
  // back to a plain Preview there, and the samples have to go with them or they read as the
  // answer the edited body would give. Derived, not cleared: undoing the edit brings back
  // samples that are accurate again.
  const visiblePreview = reusable ? preview : [];

  const previewMutation = useMutation<PreviewResult, ApiErrorResponse, boolean>({
    mutationFn: async (reuse) => {
      const res = (
        await api.post(buildUrl(API_ROUTES.ENDPOINT.AI_PREVIEW, { projectId, endpointGroupId }), {
          method,
          path: path || "/",
          response_body: bodyJson,
          ai_fields: aiFields,
          ai_prompt: aiPrompt ?? null,
          count: 3,
          // Handing the blueprint back is what makes a reroll free: the server renders from it
          // instead of designing a new one. A seeded design carries none, so the endpoint id is
          // what lets the server find the one it already stored.
          endpoint_id: reuse ? (endpointId ?? null) : null,
          plan: reuse ? (reusable?.plan ?? null) : null,
          plan_hash: reuse ? (reusable?.hash ?? null) : null,
        })
      ).data as ApiSuccessResponse;
      return res.data as PreviewResult;
    },
    onSuccess: (result) => {
      applyAiQuota(queryClient, result.quota);
      setPreview(result.variants);
      setDesign({
        plan: result.plan,
        hash: result.plan_hash,
        signature,
        unappliedHints: result.unapplied_hints,
        unsupportedLanguage: result.plan.unsupported_language,
      });
    },
    onError: (error) => {
      // A refusal carries the quota that refused it, which is what turns the card's warning on
      // in the same tick rather than a refetch later.
      applyAiQuota(queryClient, error.errors);
      Notify.error(error.message);
    },
    onSettled: (data, error, reuse) => {
      // Only a redesign spends a call, which is the same condition the cooldown runs on.
      if (!reuse) setCooldown(DESIGN_COOLDOWN_SECONDS);

      // Every answer carries the count, so this covers the one that never arrived. The quota was
      // claimed before the model call, so a failed design still has to be reconciled.
      if (!data && !isAiQuota(error?.errors)) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.USER.USAGE] });
      }
    },
  });

  // Only a blueprint this session designed travels with the save. A seeded one is already the
  // server's own, and an update that leaves the AI inputs alone keeps it.
  useEffect(() => {
    onDesignRef.current?.(
      reusable?.plan && reusable.hash ? { plan: reusable.plan, hash: reusable.hash } : null
    );
  }, [reusable]);

  const summary = reusable?.plan ? describePlan(reusable.plan) : [];
  const catalogNote = reusable?.plan ? describePlanCatalogs(reusable.plan) : null;

  // The same rules the resolver applies on submit, so a selection the server would answer 400 to
  // never gets as far as spending a design.
  const selectionMessage = aiFieldsMessage({
    ai_enabled: enabled,
    ai_fields: aiFields,
    response_body: bodyJson,
  });
  const blocked = !hasFields || !!selectionMessage || previewMutation.isPending;

  const configured = aiStatus.data === true;

  // Null while it loads or when the request failed, so the card says nothing rather than guess.
  // A role with no AI at all gets nothing either: the card is already hidden for them.
  const quota =
    usage.data && usage.data.limits.max_ai_plans_per_day > 0
      ? {
          limit: usage.data.limits.max_ai_plans_per_day,
          spent: usage.data.used.ai_plans_today,
        }
      : null;

  const spentOut = !!quota && quota.spent >= quota.limit;

  // Only the metered button, never the free reroll: a blueprint that already exists still renders
  // new samples once the day's designs are gone.
  const designBlocked = blocked || spentOut;

  // Mirrors the `wouldDesign` check the write routes refuse a save on, as far as the client can
  // answer it. Two cases it can: there is no stored blueprint at all, or the selection or hint
  // moved, which no blueprint survives since it varies the fields it was designed for and
  // answers the hint it was designed under. A body edit alone is the case it cannot, since that
  // needs the blueprint and `validatePlan`, so there the server answers.
  const saveBlocked =
    spentOut &&
    !!enabled &&
    aiFields.length > 0 &&
    !reusable &&
    (!hasStoredPlan || selectionMoved);

  // Says nothing about the day being spent: that is a warning, and the card raises it as one.
  const previewNote = (() => {
    if (fieldState === "invalid") return "Enter a valid JSON object in Response body first.";
    if (!hasFields) return "This response body has no field AI can vary.";
    if (selectionMessage) return selectionMessage;
    if (spentOut) return null;
    if (reusable) return "New samples are free. Redesign only if a field is read wrong.";
    if (cooldown > 0) return `Designing is a real AI call. You can run another in ${cooldown}s.`;
    return null;
  })();

  return {
    enabled,
    bodyJson,
    selectedCount: aiFields.length,
    fieldCount: availablePaths.size,
    configured,
    quota,
    spentOut,
    preview: visiblePreview,
    clearPreview: () => setPreview([]),
    reusable,
    cooldown,
    blocked,
    designBlocked,
    saveBlocked,
    previewNote,
    summary,
    catalogNote,
    showSummary,
    toggleSummary: () => setShowSummary((open) => !open),
    isPending: previewMutation.isPending,
    runPreview: (reuse: boolean) => previewMutation.mutate(reuse),
  };
}
