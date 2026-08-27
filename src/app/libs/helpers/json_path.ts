// Path syntax: `.` separates object keys (`user.name`), `[]` means every element of an array
// (`items[].price`). A path may cross any number of arrays (`rows[].cells[]`), and `\` escapes a
// `.`, `[`, `]` or `\` inside a key, so every JSON key is expressible.

export type JsonLeafType = "string" | "number" | "boolean" | "null";

export type PathStep = { kind: "key"; key: string } | { kind: "array" };

// How many arrays one path may cross. A guard rather than a design limit: each level multiplies
// the values a single recipe writes, and `MAX_AI_VALUES` is what really bounds a selection.
export const MAX_ARRAY_DEPTH = 3;

const SPECIAL = /[\\.[\]]/g;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function escapeKey(key: string): string {
  return key.replace(SPECIAL, (char) => `\\${char}`);
}

// One segment per unescaped `.`, each segment being a key followed by any number of `[]`.
export function parsePath(path: string): PathStep[] {
  const steps: PathStep[] = [];
  let key = "";
  let markers = 0;
  let escaped = false;

  const flush = () => {
    steps.push({ kind: "key", key });
    for (let marker = 0; marker < markers; marker += 1) steps.push({ kind: "array" });
    key = "";
    markers = 0;
  };

  for (let index = 0; index < path.length; index += 1) {
    const char = path[index]!;

    if (escaped) {
      key += char;
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === ".") {
      flush();
    } else if (char === "[" && path[index + 1] === "]") {
      markers += 1;
      index += 1;
    } else {
      key += char;
    }
  }

  flush();
  return steps;
}

export function formatPath(steps: PathStep[]): string {
  return steps.reduce((path, step, index) => {
    if (step.kind === "array") return `${path}[]`;
    return index === 0 ? escapeKey(step.key) : `${path}.${escapeKey(step.key)}`;
  }, "");
}

export function isArrayPath(path: string): boolean {
  return parsePath(path).some((step) => step.kind === "array");
}

export function arrayDepthOf(path: string): number {
  return parsePath(path).filter((step) => step.kind === "array").length;
}

// The innermost array a path sits in, written as a path of its own. `""` for a path that crosses
// no array. Two fields are drawn once per element of the same array when these match.
export function scopePathOf(path: string): string {
  const steps = parsePath(path);
  const last = steps.map((step) => step.kind).lastIndexOf("array");
  return last === -1 ? "" : formatPath(steps.slice(0, last + 1));
}

// Scopes are canonical, and every non-root one ends in `[]`, so an outer scope is exactly a
// string prefix of an inner one.
export function isOuterScope(outer: string, inner: string): boolean {
  return outer === "" || outer === inner || inner.startsWith(outer);
}

export function readKeys(source: unknown, keys: string[]): unknown {
  return keys.reduce<unknown>((acc, key) => (isPlainObject(acc) ? acc[key] : undefined), source);
}

function readSteps(value: unknown, steps: PathStep[], limit: number | undefined): unknown {
  const [step, ...rest] = steps;
  if (!step) return value;

  if (step.kind === "key") {
    return isPlainObject(value) ? readSteps(value[step.key], rest, limit) : undefined;
  }

  if (!Array.isArray(value)) return undefined;
  const slice = typeof limit === "number" ? value.slice(0, limit) : value;
  return slice.map((item) => readSteps(item, rest, limit));
}

// A path crossing N arrays returns a value nested N arrays deep, each level capped to `limit`.
// `undefined` when the path does not exist.
export function getAtPath(source: unknown, path: string, limit?: number): unknown {
  return readSteps(source, parsePath(path), limit);
}

export function findMissingPaths(value: unknown, paths: string[]): string[] {
  return paths.filter((path) => getAtPath(value, path) === undefined);
}

// The values a path controls, flattened across every array it crosses. `null` when some level is
// not an array, which is what tells a caller the path does not describe one uniform thing.
export function flattenAtDepth(value: unknown, depth: number): unknown[] | null {
  if (depth === 0) return [value];
  if (!Array.isArray(value)) return null;

  const flattened: unknown[] = [];
  for (const item of value) {
    const inner = flattenAtDepth(item, depth - 1);
    if (inner === null) return null;
    flattened.push(...inner);
  }
  return flattened;
}

export function flattenPathValues(
  source: unknown,
  path: string,
  limit?: number
): unknown[] | null {
  return flattenAtDepth(getAtPath(source, path, limit), arrayDepthOf(path));
}

// Own properties only. `"__proto__" in target` is true for any object, so `in` would let a write
// through a path that reaches the prototype instead of the body.
function hasOwnKey(target: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function writeSteps(target: unknown, steps: PathStep[], value: unknown): boolean {
  const [step, ...rest] = steps;
  if (!step) return false;

  if (step.kind === "array") {
    if (!Array.isArray(target) || !Array.isArray(value)) return false;
    if (value.length > target.length) return false;

    for (const [index, item] of value.entries()) {
      if (rest.length === 0) {
        target[index] = item;
        continue;
      }
      if (!writeSteps(target[index], rest, item)) return false;
    }
    return true;
  }

  if (!isPlainObject(target) || !hasOwnKey(target, step.key)) return false;
  if (rest.length === 0) {
    target[step.key] = value;
    return true;
  }
  return writeSteps(target[step.key], rest, value);
}

// Mutates `target` in place, and a path crossing an array can be partially written before a
// mismatch is found, so callers work on a clone and discard the whole clone on `false`.
// A `value` shorter than the target array leaves the remainder untouched, which is the cap.
export function setAtPath(target: unknown, path: string, value: unknown): boolean {
  return writeSteps(target, parsePath(path), value);
}
