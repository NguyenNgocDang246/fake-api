/**
 * JSON paths shared by the AI variant feature. The UI builds its checkbox tree from the
 * same path set the service uses to read and write values, so the two sides cannot drift.
 *
 * Syntax:
 * - `.` separates object keys: `user.name`
 * - `[]` means "every element of the array": `items[].price`
 *
 * For a path containing `[]`, `getAtPath` returns the array of current values and
 * `setAtPath` takes an array of the same length and writes element-wise, so every element
 * gets its own distinct value.
 *
 * v1 limits:
 * - A key containing `.` or `[` cannot be expressed, so it is not selectable.
 * - Arrays inside arrays (`a[].b[].c`) are unsupported: one `[]` per path.
 */

export type JsonLeafType = "string" | "number" | "boolean" | "null";

export interface FieldNode {
  /** Full path from the root, e.g. `user.name` or `items[].price`. */
  path: string;
  /** Label shown at one level of the tree, e.g. `name`. */
  label: string;
  /** Only leaves are selectable; `object` and `array` are parents for grouping. */
  kind: "leaf" | "object" | "array";
  type?: JsonLeafType;
  /** Current value, to help identify the field. For a `[]` path, the first element. */
  sample?: unknown;
  /** Length of the owning array; present only on nodes under a `[]`. */
  arrayLength?: number;
  selectable: boolean;
  /** Why it cannot be selected, shown as a tooltip. */
  disabledReason?: string;
  children?: FieldNode[];
}

const UNSUPPORTED_KEY = /[.[\]]/;

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

/**
 * Build the field tree the checkbox UI renders.
 *
 * @param insideArray once a `[]` has been crossed, no further array is opened, since arrays
 * inside arrays are unsupported.
 */
function buildNodes(value: unknown, parentPath: string, insideArray: boolean): FieldNode[] {
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

    const leafType = leafTypeOf(child);
    if (leafType) {
      return { ...base, kind: "leaf" as const, type: leafType, sample: child };
    }

    if (Array.isArray(child)) {
      if (insideArray) {
        return {
          ...base,
          kind: "array" as const,
          selectable: false,
          disabledReason: "Arrays inside arrays are not supported yet",
          arrayLength: child.length,
        };
      }

      const first = child[0];
      const elementLeafType = leafTypeOf(first);

      // An array of scalars (["a", "b"]) is itself a leaf, addressed as `tags[]`.
      if (elementLeafType) {
        return {
          ...base,
          path: `${path}[]`,
          kind: "leaf" as const,
          type: elementLeafType,
          sample: first,
          arrayLength: child.length,
        };
      }

      // An array of objects opens its inner fields as `items[].price`.
      return {
        ...base,
        kind: "array" as const,
        selectable: false,
        arrayLength: child.length,
        children: buildNodes(first, `${path}[]`, true),
      };
    }

    if (isPlainObject(child)) {
      return {
        ...base,
        kind: "object" as const,
        selectable: false,
        children: buildNodes(child, path, insideArray),
      };
    }

    // undefined or a non-JSON type: mark it unselectable rather than dropping it silently.
    return {
      ...base,
      kind: "leaf" as const,
      selectable: false,
      disabledReason: "Not a valid JSON value",
    };
  });
}

export function buildFieldTree(value: unknown): FieldNode[] {
  return buildNodes(value, "", false);
}

/** Flatten every selectable path in a tree, or in one branch of it. */
export function collectSelectablePaths(nodes: FieldNode[]): string[] {
  return nodes.flatMap((node) => [
    ...(node.selectable && node.kind === "leaf" ? [node.path] : []),
    ...(node.children ? collectSelectablePaths(node.children) : []),
  ]);
}

interface ParsedPath {
  /** Keys before the `[]`. Without a `[]` this is the whole path. */
  head: string[];
  /** Keys after the `[]`. `undefined` means the path has no `[]`. */
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

/**
 * Read the value at `path`.
 *
 * A plain path returns that value. A path containing `[]` returns the **array** of values
 * from each element, capped to the first `limit` elements when `limit` is given.
 * Returns `undefined` when the path does not exist.
 */
export function getAtPath(source: unknown, path: string, limit?: number): unknown {
  const { head, tail } = parsePath(path);

  if (!tail) return readKeys(source, head);

  const array = readKeys(source, head);
  if (!Array.isArray(array)) return undefined;

  const slice = typeof limit === "number" ? array.slice(0, limit) : array;
  return slice.map((item) => (tail.length === 0 ? item : readKeys(item, tail)));
}

/**
 * Paths that no longer exist in `value`. Used to stop dead paths from being saved after the
 * body is edited in a way that removes a ticked field.
 */
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

/**
 * Write `value` at `path`, mutating `target` in place.
 *
 * A path containing `[]` requires `value` to be an array and writes element-wise: element i
 * of `value` into element i of the target array. A `value` shorter than the target leaves
 * the remainder untouched, which is exactly how the array upper bound works.
 *
 * Returns `false` when the path does not exist or the type does not match. For a `[]` path
 * the write may have partially happened before the mismatch was found, so callers always
 * work on a clone and discard that whole clone when this returns `false`.
 */
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
