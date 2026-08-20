"use client";

import { useMemo } from "react";
import {
  buildFieldTree,
  collectSelectablePaths,
  FieldNode,
} from "@/app/libs/helpers/json_path";

/**
 * What the Response body currently offers the AI.
 *
 * - `invalid`: the body is not a JSON object (half typed, an array, a scalar).
 * - `empty`: a JSON object with no fields at all, which is what an empty Response body becomes
 *   once the resolver rewrites it to `{}`.
 * - `unselectable`: there are fields, but not one of them can be varied, e.g. keys containing
 *   `.` or `[ ]`, or arrays nested inside arrays.
 * - `ready`: at least one field can be ticked.
 */
export type AiFieldState = "invalid" | "empty" | "unselectable" | "ready";

export interface AiFieldTree {
  state: AiFieldState;
  /** Empty unless there is something to draw, so `unselectable` still renders its rows. */
  tree: FieldNode[];
  availablePaths: Set<string>;
}

function parseObjectBody(bodyJson: string): Record<string, unknown> | null {
  try {
    const result: unknown = JSON.parse(bodyJson);
    if (typeof result !== "object" || result === null || Array.isArray(result)) return null;
    return result as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Derive the field tree from the Response body text.
 *
 * The selector draws this tree and the section around it decides what to say and whether Preview
 * can run, so both read the same answer from here rather than each parsing the body themselves.
 */
export function useAiFieldTree(bodyJson: string): AiFieldTree {
  return useMemo(() => {
    const parsed = parseObjectBody(bodyJson);
    if (!parsed) return { state: "invalid", tree: [], availablePaths: new Set<string>() };

    const tree = buildFieldTree(parsed);
    if (tree.length === 0) return { state: "empty", tree, availablePaths: new Set<string>() };

    const availablePaths = new Set(collectSelectablePaths(tree));
    return {
      state: availablePaths.size === 0 ? "unselectable" : "ready",
      tree,
      availablePaths,
    };
  }, [bodyJson]);
}
