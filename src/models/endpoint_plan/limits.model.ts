import { MAX_ARRAY_ITEMS } from "@/models/endpoint/primitives.model";

export const PLAN_VERSION = 1;

// Re-exported rather than declared: how many elements a plan may ever touch is decided by what a
// body is allowed to hold, and two constants that must stay equal are one constant too many.
export { MAX_ARRAY_ITEMS };

// One recipe per selected path, so this has to stay at or above `MAX_AI_FIELDS`. A test asserts
// that, because a plan holding more fields than a caller can ever select is only ever an attack.
export const MAX_PLAN_FIELDS = 50;

export const MAX_PLAN_ENTITIES = 12;
export const MAX_CATALOGS = 6;
export const MAX_CATALOG_ROWS = 40;
export const MAX_CATALOG_COLUMNS = 10;
export const MAX_PICK_VALUES = 40;
export const MAX_BRANCH_CASES = 12;
export const MAX_TEMPLATE_SLOTS = 8;
export const MAX_SLOT_VALUES = 24;
export const MAX_TEMPLATE_LENGTH = 400;
export const MAX_PATTERN_LENGTH = 60;
export const MAX_STRING_VALUE_LENGTH = 400;
export const MAX_PLAN_BYTES = 32_000;
export const MAX_UNAPPLIED_HINTS = 8;

// How many times a `unique` recipe is redrawn before it gives up and keeps the duplicate.
export const MAX_UNIQUE_RETRIES = 24;
