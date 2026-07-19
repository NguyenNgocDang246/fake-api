import type { MetadataRoute } from "next";
import { PAGE_ROUTES } from "@/app/libs/routes";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env["NEXT_PUBLIC_DOMAIN"];

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [`${PAGE_ROUTES.PROJECT}`, `${PAGE_ROUTES.PROJECT}/*`, "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
