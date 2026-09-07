import { FieldError } from "react-hook-form";
import { findMissingPaths } from "@/app/libs/helpers/json_path";
import {
  MAX_AI_FIELDS,
  TOO_MANY_AI_FIELDS,
  checkAiFieldSelection,
} from "@/models/endpoint/endpoint.model";

// The message a selection would be refused with, or `undefined` while it is fine. Used twice:
// by the resolver on submit, and by the AI panel to hold the preview button back rather than
// letting the server answer 400 for something the form already knows.
export function aiFieldsMessage(values: {
  ai_enabled?: boolean;
  ai_fields?: string[];
  response_body?: string;
}): string | undefined {
  if (!values.ai_enabled) return undefined;

  const fields = values.ai_fields ?? [];
  if (fields.length > MAX_AI_FIELDS) return TOO_MANY_AI_FIELDS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(values.response_body ?? "");
  } catch {
    // An unparseable body is the editor's own error to report, not this one's.
    return undefined;
  }

  const missing = findMissingPaths(parsed, fields);
  if (missing.length > 0) {
    return `These fields are no longer in the response body: ${missing.join(", ")}`;
  }

  return checkAiFieldSelection(parsed, fields) ?? undefined;
}

export function validateAiFields(values: {
  ai_enabled?: boolean;
  ai_fields?: string[];
  response_body?: string;
}): FieldError | undefined {
  const message = aiFieldsMessage(values);
  return message ? { type: "manual", message } : undefined;
}
