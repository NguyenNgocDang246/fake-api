import { z } from "zod";

export const MAX_PATH_LENGTH = 255;

export const MIN_STATUS_CODE = 100;
export const MAX_STATUS_CODE = 599;
export const MAX_DELAY_MS = 60_000;

// Sized for a mock: `MAX_ARRAY_ITEMS` elements of a dozen fields is around 24k characters, and
// nothing an endpoint answers with is bigger than its longest list. The body is also the largest
// piece of author-written text a blueprint design puts in front of the model.
export const MAX_RESPONSE_BODY_CHARS = 30_000;
export const MAX_RESPONSE_BODY_DEPTH = 12;

// An invariant of every stored body, not a truncation point: no field can be half varied and no
// length recipe can silently shorten a list. Rows saved before this rule can still exceed it.
export const MAX_ARRAY_ITEMS = 50;

const INVALID_BODY_MESSAGE = "response_body must be a valid JSON object";

export type ResponseBodyCheck =
  | { ok: true; parsed: Record<string, unknown> }
  | { ok: false; message: string };

// Iterative with an explicit stack, not recursion: the walk exists to refuse a body deep enough to
// blow the stack, so it must not be able to blow the stack itself.
function checkShape(root: Record<string, unknown>): string | undefined {
  const stack: { value: unknown; depth: number; path: string }[] = Object.entries(root).map(
    ([key, value]) => ({ value, depth: 1, path: key })
  );

  while (stack.length > 0) {
    const { value, depth, path } = stack.pop()!;

    if (depth > MAX_RESPONSE_BODY_DEPTH) {
      return `The response body cannot be nested more than ${MAX_RESPONSE_BODY_DEPTH} levels deep, "${path}" goes deeper`;
    }

    if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_ITEMS) {
        return `The array at "${path}" has ${value.length} elements, and an array cannot hold more than ${MAX_ARRAY_ITEMS}`;
      }
      for (const [index, item] of value.entries()) {
        stack.push({ value: item, depth: depth + 1, path: `${path}[${index}]` });
      }
      continue;
    }

    if (typeof value === "object" && value !== null) {
      for (const [key, child] of Object.entries(value)) {
        stack.push({ value: child, depth: depth + 1, path: `${path}.${key}` });
      }
    }
  }

  return undefined;
}

// Shared by `JsonSchema` and the two form resolvers, so the editor and the server never disagree
// about which bodies are allowed.
export function checkResponseBody(text: string): ResponseBodyCheck {
  if (text.length > MAX_RESPONSE_BODY_CHARS) {
    return {
      ok: false,
      message: `The response body cannot be longer than ${MAX_RESPONSE_BODY_CHARS} characters`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: INVALID_BODY_MESSAGE };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, message: INVALID_BODY_MESSAGE };
  }

  const problem = checkShape(parsed as Record<string, unknown>);
  return problem ? { ok: false, message: problem } : { ok: true, parsed: parsed as Record<string, unknown> };
}

// Hands back the author's own text once it is proven to be an object within the limits, never a
// re-stringified parse: that reorders integer-like keys, drops precision past 2^53 and turns
// 1e999 into null. The fake route only strips the whitespace outside its string literals.
export const JsonSchema = z.string().transform((val, ctx) => {
  const check = checkResponseBody(val);
  if (!check.ok) {
    ctx.addIssue({ code: "custom", message: check.message });
    return z.NEVER;
  }

  return val;
});

export const JsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValue),
    z.record(z.string(), JsonValue),
  ])
);

export function toInteger(value: number | string): number {
  if (typeof value === "number") return value;
  return value.trim() === "" ? NaN : Number(value);
}

export function isIntegerInRange(value: number | string, min: number, max: number): boolean {
  const parsed = toInteger(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

export function IntegerFromInput({
  min,
  max,
  message,
}: {
  min: number;
  max: number;
  message: string;
}) {
  return z.union([z.number(), z.string()]).transform((value, ctx) => {
    if (!isIntegerInRange(value, min, max)) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return toInteger(value);
  });
}
