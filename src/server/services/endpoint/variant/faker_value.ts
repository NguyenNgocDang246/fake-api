import type { Faker } from "@faker-js/faker";
import { DateFormat, JsonLeaf } from "@/models/endpoint_plan/catalog.model";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const UNIT_MS: Record<string, number> = { minute: 60_000, hour: 3_600_000, day: DAY_MS };

export function shapeNumber(value: number, step?: number, fractionDigits?: number): number {
  let shaped = value;
  if (step && step > 0) shaped = Math.round(shaped / step) * step;
  // Without a round trip the float noise from the step multiply leaks into the response.
  const digits = fractionDigits ?? (Number.isInteger(shaped) ? 0 : 6);
  return Number(shaped.toFixed(digits));
}

export function formatDate(date: Date, format: DateFormat): JsonLeaf {
  const iso = date.toISOString();
  switch (format) {
    case "iso":
      return iso;
    case "date":
      return iso.slice(0, 10);
    case "datetime":
      return `${iso.slice(0, 10)} ${iso.slice(11, 19)}`;
    case "time":
      return iso.slice(11, 19);
    case "unix":
      return Math.floor(date.getTime() / 1000);
    case "unix_ms":
      return date.getTime();
  }
}

// Epoch milliseconds from whatever shape the referenced field holds, so `after` can offset a
// date it did not itself produce.
export function toEpochMs(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    // Seconds and milliseconds are told apart by magnitude: 1e11 seconds is the year 5138.
    return Math.abs(value) < 1e11 ? value * 1000 : value;
  }

  if (typeof value !== "string") return null;

  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export function pickWeighted<T>(f: Faker, values: T[], weights?: number[]): T {
  const usable =
    weights && weights.length === values.length && weights.some((weight) => weight > 0)
      ? weights
      : null;

  if (!usable) return f.helpers.arrayElement(values);

  return f.helpers.weightedArrayElement(
    values.map((value, index) => ({ value, weight: usable[index] ?? 0 }))
  );
}

// `#` a digit, `?` an uppercase letter, `*` alphanumeric, `\` escapes the next character.
// Hand-rolled rather than `helpers.replaceSymbols`, which has no escape and so cannot produce a
// literal `#` in a currency or issue code.
export function renderPattern(f: Faker, pattern: string): string {
  let out = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];

    if (char === "\\" && i + 1 < pattern.length) {
      out += pattern[i + 1];
      i += 1;
      continue;
    }

    if (char === "#") out += f.string.numeric(1);
    else if (char === "?") out += f.string.alpha({ casing: "upper" });
    else if (char === "*") out += f.string.alphanumeric({ length: 1, casing: "upper" });
    else out += char;
  }
  return out;
}
