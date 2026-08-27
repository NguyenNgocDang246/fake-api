import {
  AI_CONTEXT_ARRAY_SAMPLE,
  AI_CONTEXT_FULL_CHARS,
  AI_CONTEXT_MAX_CHARS,
  AI_CONTEXT_MAX_DEPTH,
  AI_CONTEXT_STRING_CHARS,
} from "@/server/services/endpoint/endpoint.constants";
import { MAX_ARRAY_ITEMS } from "@/models/endpoint_plan/limits.model";
import {
  arrayDepthOf,
  flattenPathValues,
  getAtPath,
  parsePath,
} from "@/app/libs/helpers/json_path";

// What the model is told about the body when it designs a blueprint: a shrunk copy of the body
// for context, and the current type and value of every path it may control. Kept apart from the
// prompt text so the wording can be tuned without touching path extraction.

const ELLIPSIS = "…";

export interface EditableField {
  path: string;
  type: string;
  currentValue: unknown;
  arrayLength?: number;
  totalArrayLength?: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonTypeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

// Keyed by the shrink walk's own path, which is built from raw keys and a `[]` per array level,
// so it is compared against the same shape rather than against the escaped path text.
function buildProtectedPrefixes(paths: string[]): Set<string> {
  const prefixes = new Set<string>();

  for (const path of paths) {
    let current = "";
    for (const step of parsePath(path)) {
      current = step.kind === "array" ? `${current}[]` : current ? `${current}.${step.key}` : step.key;
      prefixes.add(current);
    }
  }

  return prefixes;
}

export interface ContextBody {
  text: string;
  truncated: boolean;
}

// A copy of the body small enough to send as context. Paths the model may control are never
// abbreviated, since their shape is exactly what it has to imitate.
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

  return {
    text: text.slice(0, AI_CONTEXT_MAX_CHARS) + `\n${ELLIPSIS} (body truncated)`,
    truncated: true,
  };
}

function uniformElementType(elements: unknown[]): string | null {
  const [first, ...rest] = elements;
  if (first === undefined) return null;

  const type = jsonTypeOf(first);
  return rest.every((element) => element !== undefined && jsonTypeOf(element) === type)
    ? type
    : null;
}

const PATCHABLE_TYPES: ReadonlySet<string> = new Set(["string", "number", "boolean", "null"]);

// The paths that hold a single JSON leaf and so can be given a recipe. A path whose values are
// themselves arrays lands in neither list: it is a length, not a value, and `splitSelection`
// picks it up.
export function buildEditableFields(base: unknown, allowedPaths: string[]): EditableField[] {
  return allowedPaths.flatMap((path) => {
    const depth = arrayDepthOf(path);

    if (depth === 0) {
      const currentValue = getAtPath(base, path);
      if (currentValue === undefined) return [];

      const type = jsonTypeOf(currentValue);
      if (!PATCHABLE_TYPES.has(type)) return [];
      return [{ path, type, currentValue }];
    }

    const capped = flattenPathValues(base, path, MAX_ARRAY_ITEMS);
    if (capped === null || capped.length === 0) return [];

    const type = uniformElementType(capped);
    if (type === null || !PATCHABLE_TYPES.has(type)) return [];

    const whole = flattenPathValues(base, path);

    return [
      {
        path,
        type,
        currentValue: capped,
        arrayLength: capped.length,
        totalArrayLength: whole?.length ?? capped.length,
      },
    ];
  });
}
