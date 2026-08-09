import type { MetadataRoute } from "next";
import { PAGE_ROUTES } from "@/app/libs/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env["NEXT_PUBLIC_DOMAIN"];

  return [
    {
      url: `${baseUrl}${PAGE_ROUTES.HOME}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}${PAGE_ROUTES.AUTH.LOGIN}`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}${PAGE_ROUTES.AUTH.REGISTER}`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}${PAGE_ROUTES.DOCS}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
