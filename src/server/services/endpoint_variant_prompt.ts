import { isArrayPath } from "@/app/libs/helpers/json_path";

/**
 * The prompt used to generate response variants. Kept apart from the logic so the wording
 * can be tuned without touching path extraction or patch validation.
 */

export const VARIANT_SYSTEM_PROMPT = `You generate realistic variants of a mock HTTP API response body.

You will receive:
- the endpoint's method and path
- the full response body, for context only
- the list of editable field paths, with the type and current value of each
- how many variants to produce

Return ONLY JSON matching:
{"variants":[{"<field path>": <new value>, ...}, ...]}

Rules:
1. Return a value for every editable path listed, and for no other path. Never
   return the whole body. Never invent new paths. The body is shown to you for
   context only; every field not listed as editable must be left alone.
2. Keep the exact JSON type of the original value. A string stays a string, a
   number stays a number, null stays null. For a path ending in [], return an
   array of exactly the requested length, element types unchanged.
3. Every variant must be internally coherent. Values inside one variant must make
   sense together and together with the unchanged fields around them: an email
   must plausibly belong to the name in the same object, a city must match its
   country, a total must match its line items, an end date must fall after its
   start date, a status must fit the other fields' state.
4. Follow the conventions of the current value: same language and script, same
   date and time format, same id or code shape, same currency and unit, same
   casing, and a similar length. If the sample reads as Vietnamese data, produce
   Vietnamese data.
5. Vary meaningfully across variants. Do not repeat a value already used in an
   earlier variant of this batch, and do not merely tweak one character. Where a
   field is enum-like, spread the variants across the plausible values rather
   than repeating one.
6. Use plausible everyday data, not placeholders. No "string", no "foo", no lorem
   ipsum, no test@test.com.
7. Output raw JSON only. No markdown fences, no commentary.

The body may be abbreviated to save space: long arrays keep only their first few
elements followed by a note, long strings are cut with an ellipsis, and deeply
nested objects may show as "{...}". Treat those as elisions, not as real data.`;

export interface EditableField {
  path: string;
  /** JSON type of the original value, or of the element type for an array path. */
  type: string;
  currentValue: unknown;
  /** How many elements the model must return; array paths only, already capped. */
  arrayLength?: number;
  /** The array's real length, so the prompt can say the rest keeps its values. */
  totalArrayLength?: number;
}

function describeField(field: EditableField): string {
  const shape = isArrayPath(field.path)
    ? `array of ${field.arrayLength} ${field.type}` +
      (field.totalArrayLength && field.totalArrayLength > (field.arrayLength ?? 0)
        ? ` (the array really has ${field.totalArrayLength} elements; only the first ` +
          `${field.arrayLength} are regenerated, the rest keep their current values)`
        : "")
    : field.type;

  return `- ${field.path} (${shape})\n  current: ${JSON.stringify(field.currentValue)}`;
}

/**
 * An endpoint's stable context block. It is byte-identical across refills of the same
 * endpoint, which makes it the right place for the prompt caching breakpoint.
 */
export function buildVariantContextBlock({
  method,
  path,
  contextBody,
  contextTruncated,
}: {
  method: string;
  path: string;
  contextBody: string;
  contextTruncated: boolean;
}): string {
  return `Endpoint: ${method} ${path}\nResponse body${
    contextTruncated ? " (abbreviated)" : ""
  }:\n${contextBody}`;
}

/**
 * The varying part of a call. The body is deliberately not repeated here: it already sits
 * in the context block above, and restating it pays for the same tokens twice.
 */
export function buildVariantUserMessage({
  fields,
  variantCount,
  authorInstructions,
}: {
  fields: EditableField[];
  variantCount: number;
  authorInstructions?: string | null | undefined;
}): string {
  const sections = [
    `Editable fields:\n${fields.map(describeField).join("\n")}`,
    `Produce ${variantCount} variants.`,
  ];

  if (authorInstructions?.trim()) {
    // The API author's hint is user input, not a system instruction: label it clearly so
    // it cannot override the rules in the system prompt.
    sections.unshift(
      `Additional instructions from the API author:\n${authorInstructions.trim()}`
    );
  }

  return sections.join("\n\n");
}

const JSON_TYPE_SCHEMA: Record<string, Record<string, unknown>> = {
  string: { type: "string" },
  number: { type: "number" },
  boolean: { type: "boolean" },
  null: { type: "null" },
};

/**
 * Structured output schema, tightening things model-side for providers that support it.
 * Not the real gate: that is `validateVariantPatch`.
 */
export function buildVariantJsonSchema(fields: EditableField[]): Record<string, unknown> {
  const properties = Object.fromEntries(
    fields.map((field) => {
      const valueSchema = JSON_TYPE_SCHEMA[field.type] ?? {};
      return [
        field.path,
        isArrayPath(field.path)
          ? {
              type: "array",
              items: valueSchema,
              minItems: field.arrayLength,
              maxItems: field.arrayLength,
            }
          : valueSchema,
      ];
    })
  );

  return {
    type: "object",
    properties: {
      variants: {
        type: "array",
        items: {
          type: "object",
          properties,
          required: fields.map((field) => field.path),
          additionalProperties: false,
        },
      },
    },
    required: ["variants"],
    additionalProperties: false,
  };
}
