import type { MetadataRoute } from "next";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { SITE } from "@/app/libs/seo";

// /auth is intentionally absent: those pages carry a noindex tag instead, and a bot
// blocked here would never read it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [`${PAGE_ROUTES.PROJECT}`, `${PAGE_ROUTES.PROJECT}/*`, "/api/"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
