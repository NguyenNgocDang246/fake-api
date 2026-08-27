import { z } from "zod";
import { MAX_ARRAY_ITEMS } from "@/models/endpoint/primitives.model";
import { arrayDepthOf, flattenPathValues } from "@/app/libs/helpers/json_path";
import { buildFieldTree, collectSelectablePaths } from "@/app/libs/helpers/json_field_tree";
import { collapseUntrusted } from "@/app/libs/helpers/untrusted_text";

export const MAX_AI_FIELDS = 50;
export const MAX_AI_PROMPT_LENGTH = 300;
export const MAX_AI_VALUES = 150;

// The hint is author-written text handed to a model, so it is cleaned before anything reads it.
// The input is one line and capped by the browser, so a newline can only come from a hand-written
// request, and folding it away costs a real author nothing.
export function normalizeAiPrompt(raw: string): string {
  return collapseUntrusted(raw);
}

// Capped before the clean, not after: the field counts characters the same way the input does,
// so a hint the browser accepted is never refused over characters the server took out.
export const AiPromptSchema = z
  .string()
  .max(MAX_AI_PROMPT_LENGTH, `The hint cannot be longer than ${MAX_AI_PROMPT_LENGTH} characters`)
  .transform(normalizeAiPrompt);

// A path crossing arrays asks for one value per element, and crossing two multiplies, which is
// what makes this the real ceiling on a nested selection rather than the field count.
export function countAiValues(body: unknown, paths: string[]): number {
  return paths.reduce((total, path) => {
    if (arrayDepthOf(path) === 0) return total + 1;
    return total + (flattenPathValues(body, path, MAX_ARRAY_ITEMS)?.length ?? 0);
  }, 0);
}

export const TOO_MANY_AI_FIELDS = `You can select at most ${MAX_AI_FIELDS} fields`;

// The one place the selection rules live. The form runs it before a preview and again in its
// resolver, Zod runs it on the way in, and a second copy of these strings would let the two
// drift into telling a user different things about the same selection.
export function checkAiFieldSelection(body: unknown, fields: string[]): string | null {
  if (fields.length === 0) return "Select at least one field for the AI to vary";

  // The element cap has to match the generator's, or a path is refused over an element the
  // model would never have been asked to produce.
  const selectable = new Set(collectSelectablePaths(buildFieldTree(body, MAX_ARRAY_ITEMS)));
  const unusable = fields.filter((path) => !selectable.has(path));
  if (unusable.length > 0) {
    return `These fields cannot be varied by the AI: ${unusable.join(", ")}`;
  }

  if (countAiValues(body, fields) > MAX_AI_VALUES) {
    return `This selection asks the AI for more than ${MAX_AI_VALUES} values at once. Select fewer fields, or a field over a shorter array.`;
  }

  return null;
}

export function checkAiFieldList(
  values: { ai_fields: string[]; response_body: string },
  ctx: z.RefinementCtx
) {
  // `response_body` has already been through `JsonSchema`, so it parses to an object here.
  const body: unknown = JSON.parse(values.response_body);

  const message = checkAiFieldSelection(body, values.ai_fields);
  if (message) ctx.addIssue({ code: "custom", path: ["ai_fields"], message });
}

export function checkAiFields(
  values: { ai_enabled: boolean; ai_fields: string[]; response_body: string },
  ctx: z.RefinementCtx
) {
  if (!values.ai_enabled) return;
  checkAiFieldList(values, ctx);
}
