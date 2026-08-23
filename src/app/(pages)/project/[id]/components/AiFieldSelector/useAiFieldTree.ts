"use client";

import { useMemo } from "react";
import {
  buildFieldTree,
  collectSelectablePaths,
  FieldNode,
} from "@/app/libs/helpers/json_path";
import { MAX_AI_ARRAY_ITEMS } from "@/models/endpoint.model";

export type AiFieldState = "invalid" | "empty" | "unselectable" | "ready";

export interface AiFieldTree {
  state: AiFieldState;
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

export function useAiFieldTree(bodyJson: string): AiFieldTree {
  return useMemo(() => {
    const parsed = parseObjectBody(bodyJson);
    if (!parsed) return { state: "invalid", tree: [], availablePaths: new Set<string>() };

    // Same element cap the generator applies, so the tree greys out exactly the fields a
    // generated batch would have dropped.
    const tree = buildFieldTree(parsed, MAX_AI_ARRAY_ITEMS);
    if (tree.length === 0) return { state: "empty", tree, availablePaths: new Set<string>() };

    const availablePaths = new Set(collectSelectablePaths(tree));
    return {
      state: availablePaths.size === 0 ? "unselectable" : "ready",
      tree,
      availablePaths,
    };
  }, [bodyJson]);
}
