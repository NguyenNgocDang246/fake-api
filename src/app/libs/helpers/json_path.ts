// Path syntax: `.` separates object keys (`user.name`), `[]` means every element of an array
// (`items[].price`). One `[]` per path, so arrays inside arrays cannot be expressed, and nor
// can a key containing `.` or `[`.

export type JsonLeafType = "string" | "number" | "boolean" | "null";

export interface FieldNode {
  path: string;
  label: string;
  kind: "leaf" | "object" | "array";
  type?: JsonLeafType;
  sample?: unknown;
  arrayLength?: number;
  selectable: boolean;
  disabledReason?: string;
  children?: FieldNode[];
}

const UNSUPPORTED_KEY = /[.[\]]/;

const NESTED_ARRAY_REASON = "Arrays inside arrays are not supported yet";
const EMPTY_ARRAY_REASON = "An empty array has no values to vary";
const RAGGED_ARRAY_REASON = "The elements of this array do not all have the same type";
const RAGGED_FIELD_REASON =
  "The elements of this array do not all carry this field with the same type";

function leafTypeOf(value: unknown): JsonLeafType | undefined {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function joinPath(parent: string, key: string): string {
  return parent ? `${parent}.${key}` : key;
}

// A `[]` path describes one element type, so a ragged array describes a field no reply can
// satisfy and must not be offered. `null` counts as its own type, matching
// `uniformElementType` in the generator, or one side would accept what the other drops.
function uniformLeafType(elements: unknown[], tail: string[]): JsonLeafType | undefined {
  const [first, ...rest] = elements;
  if (first === undefined) return undefined;

  const type = leafTypeOf(readKeys(first, tail));
  if (!type) return undefined;

  return rest.every((element) => leafTypeOf(readKeys(element, tail)) === type) ? type : undefined;
}

// The array a `[]` was opened on, carried down so the leaves below are judged against every
// element rather than against the first one.
interface ArrayContext {
  elements: unknown[];
  tail: string[];
}

// `limit` is how many array elements are inspected when deciding an element type. It has to
// match the generator's `MAX_AI_ARRAY_ITEMS`, or a path is refused over an element no call
// would ever have seen. Passed in because `@/models/endpoint.model` already imports this file.
function buildNodes(
  value: unknown,
  parentPath: string,
  limit: number | undefined,
  arrayCtx?: ArrayContext
): FieldNode[] {
  if (!isPlainObject(value)) return [];

  return Object.entries(value).map(([key, child]) => {
    const path = joinPath(parentPath, key);
    const unsupportedKey = UNSUPPORTED_KEY.test(key);

    const base = {
      path,
      label: key,
      selectable: !unsupportedKey,
      ...(unsupportedKey
        ? { disabledReason: "Field names containing . or [ ] are not supported yet" }
        : {}),
    };

    const ownType = leafTypeOf(child);
    if (ownType) {
      const sharedType = arrayCtx
        ? uniformLeafType(arrayCtx.elements, [...arrayCtx.tail, key])
        : ownType;
      if (!sharedType) {
        return {
          ...base,
          kind: "leaf" as const,
          selectable: false,
          sample: child,
          disabledReason: RAGGED_FIELD_REASON,
        };
      }

      return { ...base, kind: "leaf" as const, type: sharedType, sample: child };
    }

    if (Array.isArray(child)) {
      if (arrayCtx) {
        return {
          ...base,
          kind: "array" as const,
          selectable: false,
          disabledReason: NESTED_ARRAY_REASON,
          arrayLength: child.length,
        };
      }

      const elements = typeof limit === "number" ? child.slice(0, limit) : child;
      const elementLeafType = uniformLeafType(elements, []);

      if (elementLeafType) {
        return {
          ...base,
          path: `${path}[]`,
          kind: "leaf" as const,
          type: elementLeafType,
          sample: elements[0],
          arrayLength: child.length,
        };
      }

      const first = elements[0];

      if (isPlainObject(first)) {
        return {
          ...base,
          kind: "array" as const,
          selectable: false,
          arrayLength: child.length,
          children: buildNodes(first, `${path}[]`, limit, { elements, tail: [] }),
        };
      }

      return {
        ...base,
        kind: "array" as const,
        selectable: false,
        arrayLength: child.length,
        disabledReason: Array.isArray(first)
          ? NESTED_ARRAY_REASON
          : first === undefined
            ? EMPTY_ARRAY_REASON
            : RAGGED_ARRAY_REASON,
      };
    }

    if (isPlainObject(child)) {
      return {
        ...base,
        kind: "object" as const,
        selectable: false,
        children: buildNodes(
          child,
          path,
          limit,
          arrayCtx ? { ...arrayCtx, tail: [...arrayCtx.tail, key] } : undefined
        ),
      };
    }

    return {
      ...base,
      kind: "leaf" as const,
      selectable: false,
      disabledReason: "Not a valid JSON value",
    };
  });
}

export function buildFieldTree(value: unknown, limit?: number): FieldNode[] {
  return buildNodes(value, "", limit);
}

export function collectSelectablePaths(nodes: FieldNode[]): string[] {
  return nodes.flatMap((node) => [
    ...(node.selectable && node.kind === "leaf" ? [node.path] : []),
    ...(node.children ? collectSelectablePaths(node.children) : []),
  ]);
}

interface ParsedPath {
  // Keys before the `[]`. Without a `[]` this is the whole path.
  head: string[];
  // Keys after the `[]`. `undefined` means the path has no `[]`.
  tail?: string[];
}

export function parsePath(path: string): ParsedPath {
  const markerIndex = path.indexOf("[]");
  if (markerIndex === -1) return { head: path.split(".").filter(Boolean) };

  const head = path.slice(0, markerIndex).split(".").filter(Boolean);
  const tail = path
    .slice(markerIndex + 2)
    .split(".")
    .filter(Boolean);
  return { head, tail };
}

export function isArrayPath(path: string): boolean {
  return path.includes("[]");
}

function readKeys(source: unknown, keys: string[]): unknown {
  return keys.reduce<unknown>(
    (acc, key) => (isPlainObject(acc) ? acc[key] : undefined),
    source
  );
}

// A `[]` path returns the array of values from each element, capped to `limit`. `undefined`
// when the path does not exist.
export function getAtPath(source: unknown, path: string, limit?: number): unknown {
  const { head, tail } = parsePath(path);

  if (!tail) return readKeys(source, head);

  const array = readKeys(source, head);
  if (!Array.isArray(array)) return undefined;

  const slice = typeof limit === "number" ? array.slice(0, limit) : array;
  return slice.map((item) => (tail.length === 0 ? item : readKeys(item, tail)));
}

export function findMissingPaths(value: unknown, paths: string[]): string[] {
  return paths.filter((path) => getAtPath(value, path) === undefined);
}

function writeKeys(target: unknown, keys: string[], value: unknown): boolean {
  if (keys.length === 0) return false;

  const parent = readKeys(target, keys.slice(0, -1));
  const lastKey = keys[keys.length - 1]!;
  if (!isPlainObject(parent) || !(lastKey in parent)) return false;

  parent[lastKey] = value;
  return true;
}

// Mutates `target` in place, and a `[]` path can be partially written before a mismatch is
// found, so callers work on a clone and discard the whole clone when this returns `false`.
// A `value` shorter than the target array leaves the remainder untouched, which is the cap.
export function setAtPath(target: unknown, path: string, value: unknown): boolean {
  const { head, tail } = parsePath(path);

  if (!tail) return writeKeys(target, head, value);

  const array = readKeys(target, head);
  if (!Array.isArray(array) || !Array.isArray(value)) return false;
  if (value.length > array.length) return false;

  for (const [index, item] of value.entries()) {
    if (tail.length === 0) {
      array[index] = item;
      continue;
    }
    if (!writeKeys(array[index], tail, item)) return false;
  }

  return true;
}
