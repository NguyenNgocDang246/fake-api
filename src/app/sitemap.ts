import type { MetadataRoute } from "next";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { SITE } from "@/app/libs/seo";

type Entry = Pick<MetadataRoute.Sitemap[number], "changeFrequency" | "priority"> & {
  path: string;
};

const ENTRIES: Entry[] = [
  { path: PAGE_ROUTES.HOME, changeFrequency: "monthly", priority: 1 },
  { path: PAGE_ROUTES.DOCS, changeFrequency: "monthly", priority: 0.8 },
  { path: PAGE_ROUTES.MARKETING.MOCK_API_GENERATOR, changeFrequency: "monthly", priority: 0.8 },
  { path: PAGE_ROUTES.MARKETING.FAKE_JSON_API, changeFrequency: "monthly", priority: 0.8 },
  { path: PAGE_ROUTES.MARKETING.FREE_API_FOR_TESTING, changeFrequency: "monthly", priority: 0.8 },
  { path: PAGE_ROUTES.MARKETING.DUMMY_JSON_DATA, changeFrequency: "monthly", priority: 0.8 },
  { path: PAGE_ROUTES.MARKETING.JSON_TO_API, changeFrequency: "monthly", priority: 0.8 },
  { path: PAGE_ROUTES.MARKETING.FAQ, changeFrequency: "monthly", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return ENTRIES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE.url}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
