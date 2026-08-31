import type { MetadataRoute } from "next";
import { SITE } from "@/app/libs/seo";
import { PAGE_ROUTES } from "@/app/libs/routes";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fake API, mock REST endpoints in seconds",
    short_name: SITE.name,
    description: SITE.description,
    start_url: PAGE_ROUTES.HOME,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: SITE.themeColor,
    icons: [
      {
        src: "/assets/logo.png",
        sizes: "1280x1280",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
