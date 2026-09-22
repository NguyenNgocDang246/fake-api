import { serialize } from "cookie";
import { z } from "zod";
import { isIntegerInRange, toInteger } from "@/models/endpoint/primitives.model";

export const MAX_RESPONSE_COOKIES = 5;
export const MAX_COOKIE_NAME_LENGTH = 64;
export const MAX_COOKIE_VALUE_LENGTH = 1024;
export const MAX_COOKIE_PATH_LENGTH = 128;

// 400 days, which is what a browser clamps anything longer to, so a bigger number would be a lie.
export const MAX_COOKIE_MAX_AGE = 34_560_000;

export const SAME_SITE_MODES = ["none", "lax", "strict"] as const;
export type SameSiteMode = (typeof SAME_SITE_MODES)[number];

// An RFC 6265 cookie-name is an RFC 7230 token, the same set a header name is drawn from.
const COOKIE_NAME_REGEX = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;

// Printable ASCII, which is `\x20` through `\x7E`. CR and LF fall outside it, and that is what
// stops a value or a path from splitting the response and inventing a header of its own.
const PRINTABLE_ASCII_REGEX = /^[ -~]*$/;

// An RFC 6265 cookie-octet is printable ASCII minus these five. The comma earns its place twice
// over, because `Headers.get("set-cookie")` joins several cookies with one.
const COOKIE_VALUE_FORBIDDEN = /[ ",;\\]/;

function isCookieValue(value: string): boolean {
  return PRINTABLE_ASCII_REGEX.test(value) && !COOKIE_VALUE_FORBIDDEN.test(value);
}

// A path-value is any character except a control one and `;`. The leading slash is ours: a browser
// reads a relative path against the request URL, so an author who typed one would get a cookie
// scoped somewhere they never named.
function isCookiePath(path: string): boolean {
  return path.startsWith("/") && PRINTABLE_ASCII_REGEX.test(path) && !path.includes(";");
}

export type ResponseCookie = {
  name: string;
  value: string;
  path: string;
  // `null` is a session cookie, `0` deletes one.
  max_age: number | null;
  http_only: boolean;
  secure: boolean;
  same_site: SameSiteMode;
  partitioned: boolean;
};

export const EMPTY_RESPONSE_COOKIES = "[]";

export const TOO_MANY_RESPONSE_COOKIES = `You can set at most ${MAX_RESPONSE_COOKIES} cookies`;
const INVALID_COOKIES_MESSAGE = "response_cookies must be a JSON array of cookies";

// No name is blocked, deliberately. A mock cookie is host-only to the project's own subdomain and
// the app's own `access_token` is host-only to the apex, since `api/auth/**` passes no `domain`
// either, so a browser keying its jar by host never carries one to the other. Refusing
// `access_token` here would buy nothing and would turn away the very name an author rehearsing
// their own login reaches for first.

// A row carrying only defaults is one the author added and left alone, so it is dropped rather
// than refused, the way a blank header row is.
export function isBlankCookieRow({ name, value }: { name: string; value: string }): boolean {
  return name.trim() === "" && value.trim() === "";
}

// What `checkResponseCookieRow` is handed: the stored row, or the one the form holds, whose
// numbers are still the strings an input carries.
type CookieRowInput = Omit<ResponseCookie, "max_age" | "same_site"> & {
  max_age: number | string | null;
  same_site: string;
};

export type CookieRowProblem = {
  field: "name" | "value" | "path" | "max_age" | "secure" | "same_site";
  message: string;
};

// A browser drops a prefixed cookie that breaks its contract without a word, and silence is the
// worst answer a mock can give. We never send a Domain, so the other two terms are the ones an
// author can get wrong.
function checkNamePrefix(
  row: CookieRowInput,
  name: string,
  path: string
): CookieRowProblem | null {
  const secure = row.secure || row.same_site === "none";

  if (name.startsWith("__Host-")) {
    if (!secure) {
      return { field: "secure", message: 'A "__Host-" cookie is only kept when it is Secure' };
    }
    if (path !== "/") {
      return { field: "path", message: 'A "__Host-" cookie has to use the path /' };
    }
  }

  if (name.startsWith("__Secure-") && !secure) {
    return { field: "secure", message: 'A "__Secure-" cookie is only kept when it is Secure' };
  }

  return null;
}

// The one place the cookie rules live, so the form resolver and Zod never tell a user two
// different things about the same row. Returns the message for the offending field, or null.
export function checkResponseCookieRow(row: CookieRowInput): CookieRowProblem | null {
  const name = row.name.trim();
  // A row the author left alone carries no path, and that stands for the default rather than for
  // nothing. Resolved once here so every rule below, the `__Host-` contract included, reads the
  // path the cookie will actually be written with.
  const path = row.path === "" ? "/" : row.path;

  if (name === "") return { field: "name", message: "The cookie name cannot be empty" };
  if (name.length > MAX_COOKIE_NAME_LENGTH) {
    return {
      field: "name",
      message: `The cookie name cannot be longer than ${MAX_COOKIE_NAME_LENGTH} characters`,
    };
  }
  if (!COOKIE_NAME_REGEX.test(name)) {
    return { field: "name", message: `"${name}" is not a valid cookie name` };
  }
  if (row.value.length > MAX_COOKIE_VALUE_LENGTH) {
    return {
      field: "value",
      message: `The cookie value cannot be longer than ${MAX_COOKIE_VALUE_LENGTH} characters`,
    };
  }
  if (!isCookieValue(row.value)) {
    return {
      field: "value",
      message: "The cookie value can only contain plain ASCII, and no comma, semicolon or quote",
    };
  }
  if (path.length > MAX_COOKIE_PATH_LENGTH) {
    return {
      field: "path",
      message: `The path cannot be longer than ${MAX_COOKIE_PATH_LENGTH} characters`,
    };
  }
  if (!isCookiePath(path)) {
    return { field: "path", message: "The path has to start with / and cannot contain ;" };
  }
  if (row.max_age !== null && String(row.max_age).trim() !== "") {
    if (!isIntegerInRange(row.max_age, 0, MAX_COOKIE_MAX_AGE)) {
      return {
        field: "max_age",
        message: `The max age must be a whole number of seconds between 0 and ${MAX_COOKIE_MAX_AGE}`,
      };
    }
  }
  if (!SAME_SITE_MODES.includes(row.same_site as SameSiteMode)) {
    return { field: "same_site", message: `"${row.same_site}" is not a SameSite setting` };
  }

  return checkNamePrefix(row, name, path);
}

// Reports against the index it was given rather than a filtered one: the form renders these
// straight onto its rows, so an error on row three has to arrive as row three.
export function checkResponseCookieRows(rows: CookieRowInput[], ctx: z.RefinementCtx) {
  const seen = new Map<string, number>();

  rows.forEach((row, index) => {
    if (isBlankCookieRow(row)) return;

    const problem = checkResponseCookieRow(row);
    if (problem) {
      ctx.addIssue({ code: "custom", path: [index, problem.field], message: problem.message });
      return;
    }

    // A cookie name is case sensitive, unlike a header name, and one name at two paths is two
    // cookies a browser keeps apart, so the key is both of them together.
    const key = `${row.name.trim()}\u0000${row.path}`;
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

const COOKIE_ROW_SHAPE = {
  name: z.string(),
  value: z.string(),
  path: z.string(),
  http_only: z.boolean(),
  secure: z.boolean(),
  partitioned: z.boolean(),
};

// `.strict()` is what refuses a `domain` key on the way in, which is the one attribute this
// feature never lets an author reach.
export const ResponseCookieSchema = z
  .object({
    ...COOKIE_ROW_SHAPE,
    max_age: z.union([z.number(), z.string(), z.null()]),
    same_site: z.string(),
  })
  .strict();

export const ResponseCookieListSchema = z
  .array(ResponseCookieSchema)
  .max(MAX_RESPONSE_COOKIES, TOO_MANY_RESPONSE_COOKIES)
  .superRefine(checkResponseCookieRows);

// Reading carries none of the rules above on purpose. A row stored before a rule existed, or one
// written by hand, must not be able to fail the request that serves it or the list that shows it.
// The serving path re-checks each row before writing it out, for the same reason.
export const ResponseCookieReadSchema = z
  .object({
    ...COOKIE_ROW_SHAPE,
    max_age: z.number().nullable(),
    same_site: z.enum(SAME_SITE_MODES),
  })
  .strict();

export const ResponseCookieReadListSchema = z.array(ResponseCookieReadSchema);

// The form's own shape: `max_age` is the string an input holds, where empty means a session
// cookie, and nothing carries a `.default()`, because a default makes the zod input type optional
// while the output stays required and a `Resolver` needs one type for both.
export const ClientResponseCookieSchema = z
  .object({
    ...COOKIE_ROW_SHAPE,
    max_age: z.string(),
    same_site: z.string(),
  })
  .strict();

export const ClientResponseCookieListSchema = z
  .array(ClientResponseCookieSchema)
  .max(MAX_RESPONSE_COOKIES, TOO_MANY_RESPONSE_COOKIES)
  .superRefine(checkResponseCookieRows);

// Drops the rows an author left empty, and normalizes the rest so the stored row never disagrees
// with what gets emitted: `secure` follows SameSite None, and `max_age` becomes the number it
// will be read back as. The key order here is the column's canonical order.
export function compactResponseCookies(rows: CookieRowInput[]): ResponseCookie[] {
  return rows
    .filter((row) => !isBlankCookieRow(row))
    .map((row) => ({
      name: row.name.trim(),
      value: row.value,
      path: row.path || "/",
      max_age:
        row.max_age === null || String(row.max_age).trim() === "" ? null : toInteger(row.max_age),
      http_only: row.http_only,
      secure: row.secure || row.same_site === "none",
      same_site: row.same_site as SameSiteMode,
      partitioned: row.partitioned,
    }));
}

// Takes what the form sends (an array) or what the column holds (JSON text) and hands back the
// text Prisma stores, the way `ResponseHeadersFromInput` does.
export function ResponseCookiesFromInput() {
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

      ctx.addIssue({ code: "custom", message: INVALID_COOKIES_MESSAGE });
      return z.NEVER;
    })
    .pipe(ResponseCookieListSchema)
    .transform((rows) => JSON.stringify(compactResponseCookies(rows)));
}

// Used on the serving path and by the read DTO, both of which start from a stored row. Every row
// is rebuilt from the keys this knows about, which is also why a hand-written `domain` never
// reaches the serializer: the key is simply not read.
export function parseResponseCookies(text: unknown): ResponseCookie[] {
  let parsed: unknown = text;

  if (typeof text === "string") {
    try {
      parsed = JSON.parse(text);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((row): ResponseCookie[] => {
    if (typeof row !== "object" || row === null) return [];
    const { name, value } = row as Record<string, unknown>;
    if (typeof name !== "string" || typeof value !== "string") return [];

    const stored = row as Partial<Record<keyof ResponseCookie, unknown>>;
    const same_site = SAME_SITE_MODES.includes(stored.same_site as SameSiteMode)
      ? (stored.same_site as SameSiteMode)
      : "none";

    return [
      {
        name,
        value,
        path: typeof stored.path === "string" && stored.path !== "" ? stored.path : "/",
        max_age: typeof stored.max_age === "number" ? stored.max_age : null,
        http_only: stored.http_only === true,
        secure: stored.secure === true,
        same_site,
        partitioned: stored.partitioned === true,
      },
    ];
  });
}

// The one place a stored row becomes a header.
//
// `cookie`'s `serialize` rather than a hand-rolled join: it is already a dependency and already
// how every `Set-Cookie` in this repo is written, its name and value regexes are the RFC 6265
// ones and so act as a second gate, and attribute spelling gets written once. Three things it is
// not trusted with. `domain` is never passed, whatever a row holds, because that is the boundary
// this whole feature rests on. `encode` is the identity, because the default is
// `encodeURIComponent` and a mock's value is the author's bytes rather than a re-encoding of
// them. And it throws on anything it dislikes, so the call is wrapped and a row that cannot be
// written is skipped, never allowed to take down a live mock.
export function serializeResponseCookie(row: ResponseCookie): string | null {
  if (checkResponseCookieRow(row)) return null;

  try {
    return serialize(row.name, row.value, {
      encode: (value) => value,
      path: row.path || "/",
      // `!== null`, never a truthiness test: `Max-Age=0` is how a cookie is deleted.
      ...(row.max_age === null ? {} : { maxAge: row.max_age }),
      httpOnly: row.http_only,
      // SameSite=None without Secure is refused by every browser, so the tick is overridden
      // rather than obeyed: an author who asked for a cross-site cookie gets one that works.
      secure: row.secure || row.same_site === "none",
      sameSite: row.same_site,
      ...(row.partitioned ? { partitioned: true } : {}),
    });
  } catch {
    return null;
  }
}
