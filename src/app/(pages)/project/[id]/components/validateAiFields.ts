import { FieldError } from "react-hook-form";
import {
  buildFieldTree,
  collectSelectablePaths,
  findMissingPaths,
} from "@/app/libs/helpers/json_path";
import {
  countAiValues,
  MAX_AI_ARRAY_ITEMS,
  MAX_AI_FIELDS,
  MAX_AI_VALUES,
} from "@/models/endpoint.model";

export function validateAiFields(values: {
  ai_enabled?: boolean;
  ai_fields?: string[];
  response_body?: string;
}): FieldError | undefined {
  if (!values.ai_enabled) return undefined;

  const fields = values.ai_fields ?? [];
  if (fields.length === 0) {
    return { type: "manual", message: "Select at least one field for the AI to vary" };
  }

  if (fields.length > MAX_AI_FIELDS) {
    return { type: "manual", message: `You can select at most ${MAX_AI_FIELDS} fields` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(values.response_body ?? "");
  } catch {
    return undefined;
  }

  const missing = findMissingPaths(parsed, fields);
  if (missing.length > 0) {
    return {
      type: "manual",
      message: `These fields are no longer in the response body: ${missing.join(", ")}`,
    };
  }

  // The element cap has to match the generator's, or a path is refused over an element the
  // model would never have been asked to produce.
  const selectable = new Set(collectSelectablePaths(buildFieldTree(parsed, MAX_AI_ARRAY_ITEMS)));
  const unusable = fields.filter((path) => !selectable.has(path));
  if (unusable.length > 0) {
    return {
      type: "manual",
      message: `These fields cannot be varied by the AI: ${unusable.join(", ")}`,
    };
  }

  if (countAiValues(parsed, fields) > MAX_AI_VALUES) {
    return {
      type: "manual",
      message: `This selection asks the AI for more than ${MAX_AI_VALUES} values at once. Select fewer fields, or a field over a shorter array.`,
    };
  }

  return undefined;
}
