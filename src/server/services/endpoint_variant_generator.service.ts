import {
  AI_CONTEXT_ARRAY_SAMPLE,
  AI_CONTEXT_FULL_CHARS,
  AI_CONTEXT_MAX_CHARS,
  AI_CONTEXT_MAX_DEPTH,
  AI_CONTEXT_STRING_CHARS,
  AI_MAX_OUTPUT_TOKENS,
  AI_MESSAGES,
  AI_TOKENS_PER_VALUE,
  STATUS_CODE,
} from "@/server/core/constants";
import { AppError } from "@/server/core/errors";
import { MAX_AI_ARRAY_ITEMS } from "@/models/endpoint.model";
import { getAtPath, isArrayPath, setAtPath } from "@/app/libs/helpers/json_path";
import aiRouter from "@/server/services/ai/ai_router.service";
import {
  buildVariantContextBlock,
  buildVariantJsonSchema,
  buildVariantUserMessage,
  EditableField,
  VARIANT_SYSTEM_PROMPT,
} from "@/server/services/endpoint_variant_prompt";

/**
 * Generates response variants for one endpoint.
 *
 * The safety rule: the model never returns a whole body. It only returns
 * `path -> new value` pairs for the fields the user allowed, and the server clones the base
 * body and overwrites exactly those paths. Even if the model returns garbage, a field that
 * was not allowed is structurally incapable of changing.
 */

const ELLIPSIS = "…";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonTypeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/** Every prefix of the editable paths, so we know which branches must not be shrunk. */
function buildProtectedPrefixes(paths: string[]): Set<string> {
  const prefixes = new Set<string>();

  for (const path of paths) {
    let current = "";
    for (const segment of path.split(".")) {
      current = current ? `${current}.${segment}` : segment;
      prefixes.add(current);
      // `items[].price` needs both `items` and `items[]` in the protected set.
      if (segment.endsWith("[]")) prefixes.add(current.slice(0, -2));
    }
  }

  return prefixes;
}

export interface ContextBody {
  /** The shrunk JSON, already stringified for the prompt. */
  text: string;
  truncated: boolean;
}

/**
 * Build the shrunk copy of the body that travels with the prompt as context.
 *
 * Sending the whole body matters: the model has to see `user.email` sitting next to
 * `user.name` to produce an email that matches the name. But sending 5000 near-identical
 * array elements just burns tokens, so long arrays, long strings and deep branches are all
 * abbreviated, except along the branches that lead to an editable field, which are always
 * kept intact.
 */
export function buildContextBody(base: unknown, allowedPaths: string[]): ContextBody {
  const full = JSON.stringify(base, null, 2);
  if (full !== undefined && full.length <= AI_CONTEXT_FULL_CHARS) {
    return { text: full, truncated: false };
  }

  const protectedPrefixes = buildProtectedPrefixes(allowedPaths);
  let truncated = false;

  const shrink = (value: unknown, path: string, depth: number): unknown => {
    const isProtected = protectedPrefixes.has(path);

    if (typeof value === "string") {
      // A string at an editable field is kept whole: the model needs the original length
      // to produce something comparable.
      if (isProtected || value.length <= AI_CONTEXT_STRING_CHARS) return value;
      truncated = true;
      return value.slice(0, AI_CONTEXT_STRING_CHARS) + ELLIPSIS;
    }

    if (Array.isArray(value)) {
      if (value.length <= AI_CONTEXT_ARRAY_SAMPLE) {
        return value.map((item) => shrink(item, `${path}[]`, depth + 1));
      }

      truncated = true;
      const sample = value
        .slice(0, AI_CONTEXT_ARRAY_SAMPLE)
        .map((item) => shrink(item, `${path}[]`, depth + 1));
      return [...sample, `${ELLIPSIS} ${value.length - AI_CONTEXT_ARRAY_SAMPLE} similar elements`];
    }

    if (isPlainObject(value)) {
      if (depth >= AI_CONTEXT_MAX_DEPTH && !isProtected) {
        truncated = true;
        return "{...}";
      }

      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [
          key,
          shrink(child, path ? `${path}.${key}` : key, depth + 1),
        ])
      );
    }

    return value;
  };

  const text = JSON.stringify(shrink(base, "", 0), null, 2) ?? "{}";
  if (text.length <= AI_CONTEXT_MAX_CHARS) return { text, truncated };

  // Last resort for an enormous body. The cut is no longer valid JSON, but the prompt says
  // the body may be abbreviated, so the model still reads the structure it does get.
  return { text: text.slice(0, AI_CONTEXT_MAX_CHARS) + `\n${ELLIPSIS} (body truncated)`, truncated: true };
}

/** Describe the editable fields, applying the upper bound to array paths. */
export function buildEditableFields(base: unknown, allowedPaths: string[]): EditableField[] {
  return allowedPaths.flatMap((path) => {
    if (!isArrayPath(path)) {
      const currentValue = getAtPath(base, path);
      if (currentValue === undefined) return [];
      return [{ path, type: jsonTypeOf(currentValue), currentValue }];
    }

    const wholeArray = getAtPath(base, path);
    if (!Array.isArray(wholeArray) || wholeArray.length === 0) return [];

    const currentValue = wholeArray.slice(0, MAX_AI_ARRAY_ITEMS);
    return [
      {
        path,
        type: jsonTypeOf(currentValue[0]),
        currentValue,
        arrayLength: currentValue.length,
        totalArrayLength: wholeArray.length,
      },
    ];
  });
}

/** Values the model must produce per variant, used to size the output token budget. */
function valuesPerVariant(fields: EditableField[]): number {
  return fields.reduce((total, field) => total + (field.arrayLength ?? 1), 0);
}

/**
 * How many variants one call can ask for without blowing the output token ceiling.
 * A long array makes each variant cost many values, so the variant count drops to match.
 */
export function planBatch(fields: EditableField[], requested: number) {
  const perVariant = Math.max(valuesPerVariant(fields), 1);
  const affordable = Math.floor(AI_MAX_OUTPUT_TOKENS / (perVariant * AI_TOKENS_PER_VALUE));
  const variantCount = Math.max(1, Math.min(requested, affordable));

  return {
    variantCount,
    maxTokens: Math.min(
      AI_MAX_OUTPUT_TOKENS,
      variantCount * perVariant * AI_TOKENS_PER_VALUE + 512
    ),
  };
}

/** Pull the JSON out of the model's text, tolerating a markdown fence around it. */
function parseVariantsPayload(text: string): unknown[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? text).trim();

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return [];

  try {
    const parsed: unknown = JSON.parse(candidate.slice(start, end + 1));
    if (isPlainObject(parsed) && Array.isArray(parsed["variants"])) return parsed["variants"];
    return [];
  } catch {
    return [];
  }
}

function matchesType(value: unknown, expected: unknown): boolean {
  return jsonTypeOf(value) === jsonTypeOf(expected);
}

/**
 * Check one patch before anything is allowed to be written.
 *
 * Returns `null` when the patch is unusable. Extra keys are dropped; a missing key, a wrong
 * type, or an array of the wrong length discards the whole patch.
 */
export function validateVariantPatch(
  patch: unknown,
  fields: EditableField[]
): Record<string, unknown> | null {
  if (!isPlainObject(patch)) return null;

  const clean: Record<string, unknown> = {};

  for (const field of fields) {
    const value = patch[field.path];
    if (value === undefined) return null;

    if (isArrayPath(field.path)) {
      const expected = field.currentValue as unknown[];
      if (!Array.isArray(value) || value.length !== expected.length) return null;
      if (!value.every((item, index) => matchesType(item, expected[index]))) return null;
    } else if (!matchesType(value, field.currentValue)) {
      return null;
    }

    clean[field.path] = value;
  }

  return clean;
}

/** Apply a validated patch onto a clone of the base body. */
export function applyPatch(base: unknown, patch: Record<string, unknown>): string | null {
  const draft = structuredClone(base);

  for (const [path, value] of Object.entries(patch)) {
    if (!setAtPath(draft, path, value)) return null;
  }

  if (!isPlainObject(draft)) return null;

  const body = JSON.stringify(draft);
  // A variant identical to the base adds nothing, so it does not deserve a pool row.
  return body === JSON.stringify(base) ? null : body;
}

export interface GenerateVariantsInput {
  method: string;
  path: string;
  responseBody: string;
  aiFields: string[];
  aiPrompt?: string | null;
  count: number;
}

export interface GenerateVariantsResult {
  bodies: string[];
  usage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
}

/**
 * Generate at most `count` variants. A broken or garbage model response yields an empty
 * array rather than an error: the pool stays as it was and the fake API still has the base
 * body to serve.
 */
export async function generateVariants({
  method,
  path,
  responseBody,
  aiFields,
  aiPrompt,
  count,
}: GenerateVariantsInput): Promise<GenerateVariantsResult> {
  let base: unknown;
  try {
    base = JSON.parse(responseBody);
  } catch {
    throw new AppError({
      message: AI_MESSAGES.INVALID_BASE_BODY,
      statusCode: STATUS_CODE.BAD_REQUEST,
    });
  }

  if (!isPlainObject(base)) {
    throw new AppError({
      message: AI_MESSAGES.INVALID_BASE_BODY,
      statusCode: STATUS_CODE.BAD_REQUEST,
    });
  }

  const fields = buildEditableFields(base, aiFields);
  if (fields.length === 0) {
    throw new AppError({
      message: AI_MESSAGES.NO_FIELDS_SELECTED,
      statusCode: STATUS_CODE.BAD_REQUEST,
    });
  }

  const context = buildContextBody(base, aiFields);
  const { variantCount, maxTokens } = planBatch(fields, count);

  const result = await aiRouter.chat({
    // The system prompt and the context block are identical across refills of the same
    // endpoint, so they carry the cache breakpoint; the varying part sits in the message.
    system: [
      { text: VARIANT_SYSTEM_PROMPT },
      {
        text: buildVariantContextBlock({
          method,
          path,
          contextBody: context.text,
          contextTruncated: context.truncated,
        }),
        cacheable: true,
      },
    ],
    messages: [
      {
        role: "user",
        content: buildVariantUserMessage({
          fields,
          variantCount,
          authorInstructions: aiPrompt,
        }),
      },
    ],
    maxTokens,
    effort: "low",
    jsonSchema: buildVariantJsonSchema(fields),
  });

  const bodies = parseVariantsPayload(result.text)
    .map((patch) => validateVariantPatch(patch, fields))
    .flatMap((patch) => (patch ? [applyPatch(base, patch)] : []))
    .filter((body): body is string => body !== null);

  return {
    bodies: [...new Set(bodies)].slice(0, variantCount),
    ...(result.usage
      ? {
          usage: {
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
            cacheReadTokens: result.usage.cacheReadTokens,
          },
        }
      : {}),
  };
}

const endpointVariantGeneratorService = {
  generateVariants,
  buildContextBody,
  buildEditableFields,
  planBatch,
  validateVariantPatch,
  applyPatch,
};
export default endpointVariantGeneratorService;
