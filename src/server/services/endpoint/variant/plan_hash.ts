import { createHash } from "node:crypto";

// Identifies the inputs a blueprint was built from. The body is normalized through a parse so
// whitespace does not count, and the field list is sorted so reordering checkboxes does not
// throw a good blueprint away.
export function planHash(input: {
  responseBody: string;
  aiFields: string[];
  aiPrompt?: string | null;
}): string {
  let normalizedBody = input.responseBody;
  try {
    normalizedBody = JSON.stringify(JSON.parse(input.responseBody));
  } catch {
    // An unparseable body cannot produce a plan anyway; hash the raw text so it stays stable.
  }

  const payload = JSON.stringify([
    normalizedBody,
    [...input.aiFields].sort(),
    input.aiPrompt?.trim() || null,
  ]);

  return createHash("sha256").update(payload).digest("hex");
}
