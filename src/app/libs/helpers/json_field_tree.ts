import {
  JsonLeafType,
  MAX_ARRAY_DEPTH,
  escapeKey,
  isPlainObject,
  readKeys,
} from "@/app/libs/helpers/json_path";

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

const EMPTY_ARRAY_REASON = "An empty array has no values to vary";
const RAGGED_ARRAY_REASON = "The elements of this array do not all have the same type";
const RAGGED_FIELD_REASON =
  "The elements of this array do not all carry this field with the same type";
const DEEP_ARRAY_REASON = `Arrays nested more than ${MAX_ARRAY_DEPTH} deep are not supported`;

// Label for the single child standing in for the values of an array of scalars.
export const ELEMENT_LABEL = "each item";

export function leafTypeOf(value: unknown): JsonLeafType | undefined {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return undefined;
}

function joinPath(parent: string, key: string): string {
  return parent ? `${parent}.${escapeKey(key)}` : escapeKey(key);
}

// A `[]` path describes one element type, so a ragged array describes a field no reply can
// satisfy and must not be offered. `null` counts as its own type, matching the validator.
function uniformLeafType(elements: unknown[], tail: string[]): JsonLeafType | undefined {
  const [first, ...rest] = elements;
  if (first === undefined) return undefined;

  const type = leafTypeOf(readKeys(first, tail));
  if (!type) return undefined;

  return rest.every((element) => leafTypeOf(readKeys(element, tail)) === type) ? type : undefined;
}

// The elements of the innermost array this node sits in, carried down so the leaves below are
// judged against every one of them rather than against the first.
interface ArrayContext {
  elements: unknown[];
  tail: string[];
}

type NodeBase = Pick<FieldNode, "path" | "label" | "selectable" | "disabledReason">;

function blockNode(base: NodeBase, reason: string): NodeBase {
  return { ...base, selectable: false, disabledReason: base.disabledReason ?? reason };
}

// A stand-in element carrying every key any element has, so a key only some of them hold is
// shown greyed with a reason rather than being invisible. The first element that holds a key
// supplies its sample value; `uniformLeafType` still judges the key against all of them.
function unionOfKeys(elements: unknown[]): Record<string, unknown> {
  const union: Record<string, unknown> = {};

  for (const element of elements) {
    if (!isPlainObject(element)) continue;
    for (const [key, value] of Object.entries(element)) {
      if (!(key in union)) union[key] = value;
    }
  }

  return union;
}

// Every value this node resolves to: one per element of the innermost array it sits in, or just
// the value itself outside any array.
function valuesAt(arrayCtx: ArrayContext | undefined, key: string, child: unknown): unknown[] {
  if (!arrayCtx) return [child];
  return arrayCtx.elements.map((element) => readKeys(element, [...arrayCtx.tail, key]));
}

function buildLeafNode(
  base: NodeBase,
  child: unknown,
  key: string,
  ownType: JsonLeafType,
  arrayCtx?: ArrayContext
): FieldNode {
  const sharedType = arrayCtx ? uniformLeafType(arrayCtx.elements, [...arrayCtx.tail, key]) : ownType;

  if (!sharedType) {
    return { ...blockNode(base, RAGGED_FIELD_REASON), kind: "leaf", sample: child };
  }

  return { ...base, kind: "leaf", type: sharedType, sample: child };
}

// `values` is every value this path resolves to, and all of them have to be arrays: the node
// stands for one length that a single `array_length` recipe sets everywhere it applies.
function buildArrayNode(
  base: NodeBase,
  values: unknown[],
  path: string,
  limit: number | undefined,
  depth: number
): FieldNode {
  const first = values[0];
  const arrayLength = Array.isArray(first) ? first.length : 0;
  const container: FieldNode = { ...base, kind: "array", arrayLength };

  if (!values.every((value) => Array.isArray(value))) {
    return { ...container, ...blockNode(base, RAGGED_FIELD_REASON) };
  }

  if (depth + 1 > MAX_ARRAY_DEPTH) {
    return { ...container, ...blockNode(base, DEEP_ARRAY_REASON) };
  }

  const elements = (values as unknown[][]).flatMap((array) =>
    typeof limit === "number" ? array.slice(0, limit) : array
  );

  const elementPath = `${path}[]`;
  const elementBase: NodeBase = { ...base, path: elementPath, label: ELEMENT_LABEL };

  const elementLeafType = uniformLeafType(elements, []);
  if (elementLeafType) {
    return {
      ...container,
      children: [
        {
          ...elementBase,
          kind: "leaf",
          type: elementLeafType,
          sample: elements[0],
          arrayLength,
        },
      ],
    };
  }

  const firstElement = elements[0];

  if (isPlainObject(firstElement)) {
    return {
      ...container,
      children: buildNodes(unionOfKeys(elements), elementPath, limit, { elements, tail: [] }, depth + 1),
    };
  }

  if (Array.isArray(firstElement)) {
    return {
      ...container,
      children: [buildArrayNode(elementBase, elements, elementPath, limit, depth + 1)],
    };
  }

  return {
    ...container,
    ...blockNode(base, firstElement === undefined ? EMPTY_ARRAY_REASON : RAGGED_ARRAY_REASON),
  };
}

// `limit` is how many array elements are inspected when deciding an element type. Callers pass
// `MAX_ARRAY_ITEMS`, which a stored body cannot exceed, so it only bites on a grandfathered row.
function buildNodes(
  value: unknown,
  parentPath: string,
  limit: number | undefined,
  arrayCtx: ArrayContext | undefined,
  depth: number
): FieldNode[] {
  if (!isPlainObject(value)) return [];

  return Object.entries(value).map(([key, child]) => {
    const path = joinPath(parentPath, key);
    const base: NodeBase = { path, label: key, selectable: true };

    const ownType = leafTypeOf(child);
    if (ownType) return buildLeafNode(base, child, key, ownType, arrayCtx);

    if (Array.isArray(child)) {
      return buildArrayNode(base, valuesAt(arrayCtx, key, child), path, limit, depth);
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
          arrayCtx ? { ...arrayCtx, tail: [...arrayCtx.tail, key] } : undefined,
          depth
        ),
      };
    }

    return { ...blockNode(base, "Not a valid JSON value"), kind: "leaf" as const };
  });
}

export function buildFieldTree(value: unknown, limit?: number): FieldNode[] {
  return buildNodes(value, "", limit, undefined, 0);
}

// An array container counts too: its path is how "vary the number of elements" is expressed.
export function collectSelectablePaths(nodes: FieldNode[]): string[] {
  return nodes.flatMap((node) => [
    ...(node.selectable && (node.kind === "leaf" || node.kind === "array") ? [node.path] : []),
    ...(node.children ? collectSelectablePaths(node.children) : []),
  ]);
}
