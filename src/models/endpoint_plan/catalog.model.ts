export type JsonLeaf = string | number | boolean | null;
export type JsonLeafType = "string" | "number" | "boolean" | "null";

export const ENTITY_ATTRIBUTES = {
  person: {
    first_name: "string",
    last_name: "string",
    full_name: "string",
    email: "string",
    username: "string",
    phone: "string",
    avatar_url: "string",
    gender: "string",
    birth_date: "string",
    age: "number",
  },
  address: {
    street: "string",
    city: "string",
    state: "string",
    country: "string",
    country_code: "string",
    zip: "string",
    full_address: "string",
    latitude: "number",
    longitude: "number",
  },
  company: {
    name: "string",
    slogan: "string",
    domain: "string",
    email: "string",
    url: "string",
    industry: "string",
  },
  product: {
    name: "string",
    description: "string",
    sku: "string",
    category: "string",
    material: "string",
    image_url: "string",
    price: "number",
  },
} as const satisfies Record<string, Record<string, JsonLeafType>>;

export type EntityKind = keyof typeof ENTITY_ATTRIBUTES;

export const ENTITY_KINDS = Object.keys(ENTITY_ATTRIBUTES) as [EntityKind, ...EntityKind[]];

export function entityAttributeType(kind: EntityKind, attr: string): JsonLeafType | undefined {
  return (ENTITY_ATTRIBUTES[kind] as Record<string, JsonLeafType>)[attr];
}

type EntityAttributeTable = typeof ENTITY_ATTRIBUTES;

type LeafOf<T> = T extends "string"
  ? string
  : T extends "number"
    ? number
    : T extends "boolean"
      ? boolean
      : null;

// Each `draw*` in the executor declares this as its return type, so a missing attribute and a
// wrong type are both compile errors rather than a field that silently never changes.
export type EntityDrawOf<K extends EntityKind> = {
  [A in keyof EntityAttributeTable[K]]: LeafOf<EntityAttributeTable[K][A]>;
};

export const SEMANTIC_TYPES = {
  uuid: "string",
  short_id: "string",
  email: "string",
  username: "string",
  password: "string",
  phone: "string",
  url: "string",
  domain: "string",
  image_url: "string",
  avatar_url: "string",
  slug: "string",
  hex_color: "string",
  color_name: "string",
  ipv4: "string",
  ipv6: "string",
  mac_address: "string",
  user_agent: "string",
  mime_type: "string",
  file_name: "string",
  file_extension: "string",
  first_name: "string",
  last_name: "string",
  full_name: "string",
  job_title: "string",
  department: "string",
  company_name: "string",
  product_name: "string",
  product_category: "string",
  product_description: "string",
  currency_code: "string",
  currency_name: "string",
  currency_symbol: "string",
  country: "string",
  country_code: "string",
  city: "string",
  street_address: "string",
  zip_code: "string",
  timezone: "string",
  locale_code: "string",
  language: "string",
  lorem_word: "string",
  lorem_words: "string",
  lorem_sentence: "string",
  lorem_paragraph: "string",
  emoji: "string",
  latitude: "number",
  longitude: "number",
} as const satisfies Record<string, JsonLeafType>;

export type SemanticName = keyof typeof SEMANTIC_TYPES;

export const SEMANTIC_NAMES = Object.keys(SEMANTIC_TYPES) as [SemanticName, ...SemanticName[]];

// The format decides the JSON type, which `validatePlan` checks against the base value.
export const DATE_FORMAT_TYPES = {
  iso: "string",
  date: "string",
  datetime: "string",
  time: "string",
  unix: "number",
  unix_ms: "number",
} as const satisfies Record<string, JsonLeafType>;

export type DateFormat = keyof typeof DATE_FORMAT_TYPES;

// A number cannot say for itself whether it means a moment, and a small one reads as epoch
// seconds, so a body's year, page or total lands in the first weeks of 1970. A numeric date is
// held to the window a real one falls in; a string says what it is and only has to parse.
export const MIN_DATE_BOUND_MS = Date.UTC(1980, 0, 1);
export const MAX_DATE_BOUND_MS = Date.UTC(2200, 0, 1);

export const DATE_FORMATS = Object.keys(DATE_FORMAT_TYPES) as [DateFormat, ...DateFormat[]];

export const DELTA_UNITS = ["minute", "hour", "day", "number"] as const;
export type DeltaUnit = (typeof DELTA_UNITS)[number];

// `count` measures an array, the rest read the values inside one, which is why the executor
// splits them before its lookup table.
export const AGGREGATE_OPS = ["avg", "min", "max", "count"] as const;
export type AggregateOp = (typeof AGGREGATE_OPS)[number];

// Arithmetic and comparison between two fields already drawn, each an axis inside one kind so a
// seventh op is a row in the executor's lookup table and nothing else.
export const COMPUTE_OPS = ["add", "subtract", "multiply", "divide", "ceil_divide"] as const;
export type ComputeOp = (typeof COMPUTE_OPS)[number];

export const COMPARE_OPS = ["lt", "lte", "gt", "gte", "eq", "neq"] as const;
export type CompareOp = (typeof COMPARE_OPS)[number];

// The two that ask whether the sides are the same rather than which ranks first. They take any
// leaf the body holds, where the other four need a value that can be ranked at all.
export const EQUALITY_OPS = ["eq", "neq"] as const;
export type EqualityOp = (typeof EQUALITY_OPS)[number];

export function isEqualityOp(op: CompareOp): op is EqualityOp {
  return EQUALITY_OPS.includes(op as EqualityOp);
}

export const SORT_DIRECTIONS = ["asc", "desc"] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

// Only locales the executor actually builds a Faker instance for.
export const SUPPORTED_LOCALES = ["en", "vi", "ja", "ko", "zh_CN", "fr", "de", "es"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  vi: "Tiếng Việt",
  ja: "日本語",
  ko: "한국어",
  zh_CN: "中文",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
};
