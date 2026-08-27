import { MAX_ARRAY_ITEMS } from "@/models/endpoint/primitives.model";

export const PLAN_VERSION = 1;

// Re-exported rather than declared: how many elements a plan may ever touch is decided by what a
// body is allowed to hold, and two constants that must stay equal are one constant too many.
export { MAX_ARRAY_ITEMS };

// One recipe per selected path, so this has to stay at or above `MAX_AI_FIELDS`. A test asserts
// that, because a plan holding more fields than a caller can ever select is only ever an attack.
export const MAX_PLAN_FIELDS = 50;

export const MAX_PLAN_ENTITIES = 8;
export const MAX_CATALOGS = 4;
export const MAX_CATALOG_ROWS = 24;
export const MAX_CATALOG_COLUMNS = 8;
export const MAX_PICK_VALUES = 24;
export const MAX_BRANCH_CASES = 12;
export const MAX_TEMPLATE_SLOTS = 8;
export const MAX_SLOT_VALUES = 16;
export const MAX_TEMPLATE_LENGTH = 240;
export const MAX_PATTERN_LENGTH = 60;

// A catalog cell, a `pick` value and a `const` are domain values: a product name, a status code,
// a street. Room for a paragraph here is room a prompt injection can carry text out through, and
// no mock field needs it.
export const MAX_STRING_VALUE_LENGTH = 160;

// The ceiling on a whole blueprint, and the size of the only channel a model controls freely.
// It follows the number of fields rather than the number of responses, so it is one flat number.
export const MAX_PLAN_BYTES = 16_000;

// A dropped instruction is quoted back on one line in the UI, so three short ones say everything
// a longer list would. The language name is a name, not a sentence.
export const MAX_UNAPPLIED_HINTS = 3;
export const MAX_UNAPPLIED_HINT_CHARS = 120;
export const MAX_LANGUAGE_NAME_CHARS = 20;

// How many times a `unique` recipe is redrawn before it gives up and keeps the duplicate.
export const MAX_UNIQUE_RETRIES = 24;
