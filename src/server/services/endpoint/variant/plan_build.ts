import { AppError } from "@/server/core/errors";
import { STATUS_CODE } from "@/server/core/constants";
import { AI_MESSAGES } from "@/server/services/ai/ai.constants";
import {
  AI_PLAN_MAX_OUTPUT_TOKENS,
  ENDPOINT_AI_MESSAGES,
} from "@/server/services/endpoint/endpoint.constants";
import { VariantPlanDTO, VariantPlanSchema } from "@/models/endpoint_plan/endpoint_plan.model";
import { flattenPathValues } from "@/app/libs/helpers/json_path";
import { MAX_ARRAY_ITEMS, MAX_PLAN_BYTES } from "@/models/endpoint_plan/limits.model";
import aiRouter from "@/server/services/ai/ai_router.service";
import { buildContextBody, buildEditableFields } from "@/server/services/endpoint/variant/fields";
import {
  PLAN_SYSTEM_PROMPT,
  buildPlanContextBlock,
  buildPlanUserMessage,
  planFenceNonce,
} from "@/server/services/endpoint/variant/plan_prompt";
import { validatePlan } from "@/server/services/endpoint/variant/validate";

export interface BuildPlanInput {
  method: string;
  path: string;
  responseBody: string;
  aiFields: string[];
  aiPrompt?: string | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBaseBody(responseBody: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseBody);
  } catch {
    throw new AppError({
      message: ENDPOINT_AI_MESSAGES.INVALID_BASE_BODY,
      statusCode: STATUS_CODE.BAD_REQUEST,
    });
  }

  if (!isPlainObject(parsed)) {
    throw new AppError({
      message: ENDPOINT_AI_MESSAGES.INVALID_BASE_BODY,
      statusCode: STATUS_CODE.BAD_REQUEST,
    });
  }

  return parsed;
}

// Splits the selection into the value fields and the array containers whose length may vary.
// A path is a length when everything it resolves to is an array, which covers `items` and the
// inner arrays of `rows[].cells` alike.
export function splitSelection(base: unknown, aiFields: string[]) {
  const valueFields = buildEditableFields(base, aiFields);

  const arrayPaths = aiFields.filter((path) => {
    const values = flattenPathValues(base, path, MAX_ARRAY_ITEMS);
    return values !== null && values.length > 0 && values.every((value) => Array.isArray(value));
  });

  return { valueFields, arrayPaths };
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? text).trim();

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

interface PlanAttempt {
  plan: VariantPlanDTO | null;
  errors: string[];
}

function readPlan(raw: unknown, base: Record<string, unknown>, allowedPaths: string[]): PlanAttempt {
  const parsed = VariantPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      plan: null,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`
      ),
    };
  }

  // `storePlan` holds a blueprint to this too, so checking it here is what stops a preview from
  // showing one that can only fail when the user saves it.
  const size = JSON.stringify(parsed.data).length;
  if (size > MAX_PLAN_BYTES) {
    return {
      plan: null,
      errors: [`(root): the blueprint is ${size} bytes, over the ${MAX_PLAN_BYTES} byte limit`],
    };
  }

  const check = validatePlan(parsed.data, base, allowedPaths);
  return check.ok ? { plan: parsed.data, errors: [] } : { plan: null, errors: check.errors };
}

// No structured output schema: the DSL is a deep discriminated union that providers refuse as
// often as they accept, and the real gate is Zod plus `validatePlan` either way. A rejected
// blueprint gets exactly one repair attempt, carrying the reasons back.
export async function buildPlan({
  method,
  path,
  responseBody,
  aiFields,
  aiPrompt,
}: BuildPlanInput): Promise<VariantPlanDTO> {
  const base = parseBaseBody(responseBody);
  const { valueFields, arrayPaths } = splitSelection(base, aiFields);

  if (valueFields.length === 0 && arrayPaths.length === 0) {
    throw new AppError({
      message:
        aiFields.length === 0
          ? ENDPOINT_AI_MESSAGES.NO_FIELDS_SELECTED
          : ENDPOINT_AI_MESSAGES.FIELDS_NOT_PATCHABLE,
      statusCode: STATUS_CODE.BAD_REQUEST,
    });
  }

  const context = buildContextBody(base, aiFields);
  const covered = [...valueFields.map((field) => field.path), ...arrayPaths];

  // The system turn holds only text this repo wrote. That is what makes the boundary real, and
  // it is also what makes the turn worth caching: identical for every endpoint and every user,
  // where a turn carrying the body would differ on every request.
  const system = [{ text: PLAN_SYSTEM_PROMPT, cacheable: true }];

  const nonce = planFenceNonce();
  const userMessage = buildPlanUserMessage({
    fields: valueFields,
    arrayPaths,
    authorInstructions: aiPrompt,
    contextBlock: buildPlanContextBlock({
      method,
      path,
      contextBody: context.text,
      contextTruncated: context.truncated,
      nonce,
    }),
    nonce,
  });

  const first = await aiRouter.chat({
    system,
    messages: [{ role: "user", content: userMessage }],
    maxTokens: AI_PLAN_MAX_OUTPUT_TOKENS,
    effort: "medium",
  });

  const firstAttempt = readPlan(extractJson(first.text), base, covered);
  if (firstAttempt.plan) return firstAttempt.plan;

  // Running out of tokens is not a bad answer, it is an answer that did not fit, and the repair
  // call carries the whole first exchange under the same ceiling so it fits even less. Retrying
  // only spends a second call on a failure already known, and the fix belongs to the caller.
  if (first.stopReason === "max_tokens") {
    console.error("[ai] blueprint truncated", { path, maxTokens: AI_PLAN_MAX_OUTPUT_TOKENS });
    throw new AppError({
      message: ENDPOINT_AI_MESSAGES.PLAN_TOO_LARGE,
      statusCode: STATUS_CODE.BAD_REQUEST,
    });
  }

  const repair = await aiRouter.chat({
    system,
    messages: [
      { role: "user", content: userMessage },
      { role: "assistant", content: first.text },
      {
        role: "user",
        content:
          `That blueprint was rejected:\n${firstAttempt.errors.slice(0, 12).join("\n")}\n\n` +
          `Return a corrected blueprint. Same format, raw JSON only.`,
      },
    ],
    maxTokens: AI_PLAN_MAX_OUTPUT_TOKENS,
    effort: "medium",
  });

  const second = readPlan(extractJson(repair.text), base, covered);
  if (second.plan) return second.plan;

  if (repair.stopReason === "max_tokens") {
    console.error("[ai] blueprint truncated on repair", {
      path,
      maxTokens: AI_PLAN_MAX_OUTPUT_TOKENS,
    });
    throw new AppError({
      message: ENDPOINT_AI_MESSAGES.PLAN_TOO_LARGE,
      statusCode: STATUS_CODE.BAD_REQUEST,
    });
  }

  console.error("[ai] blueprint rejected twice", { path, errors: second.errors.slice(0, 12) });
  throw new AppError({
    message: AI_MESSAGES.PROVIDER_FAILED,
    statusCode: STATUS_CODE.BAD_GATEWAY,
  });
}
