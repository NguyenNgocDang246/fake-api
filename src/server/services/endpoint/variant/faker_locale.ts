// One subpath per locale rather than the package root: the root entry statically pulls in all
// ninety-odd locale datasets, and it is ESM-only, which the CommonJS test runner cannot load.
import type { Faker } from "@faker-js/faker";
import { faker as fakerDe } from "@faker-js/faker/locale/de";
import { faker as fakerEn } from "@faker-js/faker/locale/en";
import { faker as fakerEs } from "@faker-js/faker/locale/es";
import { faker as fakerFr } from "@faker-js/faker/locale/fr";
import { faker as fakerJa } from "@faker-js/faker/locale/ja";
import { faker as fakerKo } from "@faker-js/faker/locale/ko";
import { faker as fakerVi } from "@faker-js/faker/locale/vi";
import { faker as fakerZhCn } from "@faker-js/faker/locale/zh_CN";
import { SupportedLocale } from "@/models/endpoint_plan/catalog.model";

// Never seeded. A seeded instance would make two requests, or two processes, return the same
// body, which is the exact failure the pool used to have.
const INSTANCES: Record<SupportedLocale, Faker> = {
  en: fakerEn,
  vi: fakerVi,
  ja: fakerJa,
  ko: fakerKo,
  zh_CN: fakerZhCn,
  fr: fakerFr,
  de: fakerDe,
  es: fakerEs,
};

export function fakerFor(locale: SupportedLocale): Faker {
  return INSTANCES[locale] ?? fakerEn;
}

// `location.country()` ignores the locale and draws from the world list, so a Vietnamese city
// would sit under a random country. The locale is the country here.
export const LOCALE_COUNTRY: Record<SupportedLocale, { name: string; code: string }> = {
  en: { name: "United States", code: "US" },
  vi: { name: "Việt Nam", code: "VN" },
  ja: { name: "日本", code: "JP" },
  ko: { name: "대한민국", code: "KR" },
  zh_CN: { name: "中国", code: "CN" },
  fr: { name: "France", code: "FR" },
  de: { name: "Deutschland", code: "DE" },
  es: { name: "España", code: "ES" },
};

// Hand-written because faker has no language generator, and `location.country()` was standing in
// for one, so a field named `language` came back holding "Brazil".
export const LANGUAGE_NAMES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Dutch",
  "Russian",
  "Arabic",
  "Hindi",
  "Bengali",
  "Chinese",
  "Japanese",
  "Korean",
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Turkish",
  "Polish",
  "Swedish",
];
