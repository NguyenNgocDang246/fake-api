import { EditableField } from "@/server/services/endpoint/variant/fields";
import { arrayDepthOf } from "@/app/libs/helpers/json_path";

export { PLAN_SYSTEM_PROMPT } from "@/server/services/endpoint/variant/plan_system_prompt";

function describeField(field: EditableField): string {
  const depth = arrayDepthOf(field.path);
  const across = depth > 1 ? ` across ${depth} levels of nesting` : "";
  const shape =
    depth === 0
      ? field.type
      : `${field.type}, one per element of an array of ${field.arrayLength}${across}`;

  return `- ${field.path} (${shape})\n  current: ${JSON.stringify(field.currentValue)}`;
}

export function buildPlanContextBlock({
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

export function buildPlanUserMessage({
  fields,
  arrayPaths,
  authorInstructions,
}: {
  fields: EditableField[];
  arrayPaths: string[];
  authorInstructions?: string | null | undefined;
}): string {
  const sections = [`Value fields you control:\n${fields.map(describeField).join("\n")}`];

  if (arrayPaths.length > 0) {
    sections.push(
      `Array paths whose length you may vary with array_length:\n${arrayPaths
        .map((path) => `- ${path}`)
        .join("\n")}`
    );
  }

  if (authorInstructions?.trim()) {
    sections.unshift(
      `Instructions from the API author, which outrank your own inference:\n${authorInstructions.trim()}`
    );
  }

  sections.push("Return the blueprint.");
  return sections.join("\n\n");
}
