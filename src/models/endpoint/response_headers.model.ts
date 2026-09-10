import { z } from "zod";

export const MAX_RESPONSE_HEADERS = 20;
export const MAX_HEADER_NAME_LENGTH = 64;
export const MAX_HEADER_VALUE_LENGTH = 1024;

// A header name is an RFC 7230 token, and a value is printable ASCII. Refusing CR and LF in the
// value is what stops an author from splitting the response and inventing headers of their own.
const HEADER_NAME_REGEX = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;
const HEADER_VALUE_REGEX = /^[\x20-\x7E]*$/;

// `set-cookie` is the one that matters: a mock answers on the same origin as the app itself, so
// a cookie an author sets here would land on the app's own `access_token`. The rest are either
// framework owned or, for `access-control-*`, owned by the project's CORS settings.
const BLOCKED_HEADERS = new Set([
  "set-cookie",
  "set-cookie2",
  "content-length",
  "content-encoding",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "host",
  "trailer",
  "te",
  "proxy-authenticate",
]);

export function isBlockedHeader(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return BLOCKED_HEADERS.has(lower) || lower.startsWith("access-control-");
}

export type ResponseHeader = { name: string; value: string };

export const TOO_MANY_RESPONSE_HEADERS = `You can set at most ${MAX_RESPONSE_HEADERS} headers`;
const INVALID_HEADERS_MESSAGE = "response_headers must be a JSON array of headers";

export function isBlankHeaderRow({ name, value }: ResponseHeader): boolean {
  return name.trim() === "" && value.trim() === "";
}

// The one place the header rules live, so the form resolver and Zod never tell a user two
// different things about the same row. Returns the message for the offending field, or null.
export function checkResponseHeaderRow(
  row: ResponseHeader
): { field: "name" | "value"; message: string } | null {
  const name = row.name.trim();

  if (name === "") return { field: "name", message: "The header name cannot be empty" };
  if (name.length > MAX_HEADER_NAME_LENGTH) {
    return {
      field: "name",
      message: `The header name cannot be longer than ${MAX_HEADER_NAME_LENGTH} characters`,
    };
  }
  if (!HEADER_NAME_REGEX.test(name)) {
    return { field: "name", message: `"${name}" is not a valid header name` };
  }
  if (isBlockedHeader(name)) {
    return { field: "name", message: `"${name}" is set by Fake API and cannot be overridden` };
  }
  if (row.value.length > MAX_HEADER_VALUE_LENGTH) {
    return {
      field: "value",
      message: `The header value cannot be longer than ${MAX_HEADER_VALUE_LENGTH} characters`,
    };
  }
  if (!HEADER_VALUE_REGEX.test(row.value)) {
    return { field: "value", message: "The header value can only contain plain ASCII characters" };
  }

  return null;
}

// Reports against the index it was given rather than a filtered one: the form renders these
// straight onto its rows, so an error on row three has to arrive as row three.
export function checkResponseHeaderRows(rows: ResponseHeader[], ctx: z.RefinementCtx) {
  const seen = new Map<string, number>();

  rows.forEach((row, index) => {
    if (isBlankHeaderRow(row)) return;

    const problem = checkResponseHeaderRow(row);
    if (problem) {
      ctx.addIssue({ code: "custom", path: [index, problem.field], message: problem.message });
      return;
    }

    const key = row.name.trim().toLowerCase();
    const first = seen.get(key);
    if (first !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: [index, "name"],
        message: `"${row.name.trim()}" is already set on row ${first + 1}`,
      });
      return;
    }
    seen.set(key, index);
  });
}

export const ResponseHeaderSchema = z
  .object({ name: z.string(), value: z.string() })
  .strict();

export const ResponseHeaderListSchema = z
  .array(ResponseHeaderSchema)
  .max(MAX_RESPONSE_HEADERS, TOO_MANY_RESPONSE_HEADERS)
  .superRefine(checkResponseHeaderRows);

// Reading carries none of the rules above on purpose. A row stored before a rule existed, or one
// written by hand, must not be able to fail the request that serves it or the list that shows it.
// The serving path filters `isBlockedHeader` again for the same reason.
export const ResponseHeaderReadListSchema = z.array(ResponseHeaderSchema);

// A row the author added and left empty is dropped rather than refused, and every stored name is
// trimmed so the serving path never has to trim again.
export function compactResponseHeaders(rows: ResponseHeader[]): ResponseHeader[] {
  return rows
    .filter((row) => !isBlankHeaderRow(row))
    .map((row) => ({ name: row.name.trim(), value: row.value }));
}

// Takes what the form sends (an array) or what the column holds (JSON text) and hands back the
// text Prisma stores. Unlike `response_body` the exact bytes carry nothing, so re-serializing
// here is what keeps the column canonical.
export function ResponseHeadersFromInput() {
  return z
    .union([z.string(), z.array(z.unknown())])
    .transform((value, ctx) => {
      if (typeof value !== "string") return value;

      try {
        const parsed: unknown = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // falls through to the same issue as a non-array
      }

      ctx.addIssue({ code: "custom", message: INVALID_HEADERS_MESSAGE });
      return z.NEVER;
    })
    .pipe(ResponseHeaderListSchema)
    .transform((rows) => JSON.stringify(compactResponseHeaders(rows)));
}

export const EMPTY_RESPONSE_HEADERS = "[]";

// Used on the serving path and by the read DTO, both of which start from a stored row: a row
// written before these rules existed must not be able to fail a request.
export function parseResponseHeaders(text: unknown): ResponseHeader[] {
  if (Array.isArray(text)) return text as ResponseHeader[];
  if (typeof text !== "string") return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(
    (row): row is ResponseHeader =>
      typeof row === "object" &&
      row !== null &&
      typeof (row as ResponseHeader).name === "string" &&
      typeof (row as ResponseHeader).value === "string"
  );
}
