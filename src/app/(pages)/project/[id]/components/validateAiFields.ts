import { FieldError } from "react-hook-form";
import { findMissingPaths } from "@/app/libs/helpers/json_path";
import { MAX_AI_FIELDS } from "@/models/endpoint.model";

/**
 * Validate the AI field list before saving. Shared by the create and update resolvers,
 * since both forms carry the same fields.
 *
 * It exists to stop dead paths from being saved: if the body is edited so a ticked field
 * disappears, say so now, rather than saving an endpoint that quietly generates nothing.
 */
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
    // A broken body already has its own error on the Response body input; no duplicate here.
    return undefined;
  }

  const missing = findMissingPaths(parsed, fields);
  if (missing.length > 0) {
    return {
      type: "manual",
      message: `These fields are no longer in the response body: ${missing.join(", ")}`,
    };
  }

  return undefined;
}
