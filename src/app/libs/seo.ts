import type { Metadata } from "next";

const domain = process.env["NEXT_PUBLIC_DOMAIN"];

// Canonical URLs, the sitemap and the OG image all resolve against this, and a wrong
// value only surfaces once the site is already indexed. Fail the build instead.
if (!domain && process.env["NODE_ENV"] === "production") {
  throw new Error(
    "NEXT_PUBLIC_DOMAIN is required for a production build: canonical URLs, the sitemap and the OG image all resolve against it."
  );
}

export const SITE = {
  name: "Fake API",
  url: domain ?? "http://localhost:3000",
  description:
    "Fake API is a free mock REST API you build in the browser and call over a real HTTPS URL. Set the JSON body, status code, headers and latency, no backend.",
  locale: "en_US",
  themeColor: "#4f46e5",
  // Not an env var: it is the same in every environment and is printed on a public page, so
  // it is site identity like the name above.
  contactEmail: "ngocdang.dev@gmail.com",
} as const;

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

interface BuildMetadataInput {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

export function absoluteUrl(path: string): string {
  return new URL(path, SITE.url).toString();
}

// A page that declares its own `openGraph` block stops inheriting the root opengraph-image,
// so the image is named here explicitly. Give a page its own image by overriding this result.
export function buildMetadata({
  title,
  description,
  path,
  noindex = false,
}: BuildMetadataInput): Metadata {
  const images = [
    {
      url: absoluteUrl("/opengraph-image"),
      width: OG_IMAGE_SIZE.width,
      height: OG_IMAGE_SIZE.height,
      alt: `${SITE.name}, mock REST endpoints in seconds`,
    },
  ];

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      locale: SITE.locale,
      url: absoluteUrl(path),
      title,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

// Same shape the `Breadcrumb` component takes, so one array feeds both the visible trail
// and the schema and the two cannot drift.
export interface Crumb {
  label: string;
  href?: string;
}

export function breadcrumbSchema(items: Crumb[], path: string) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map(({ label, href }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: label,
      item: absoluteUrl(href ?? path),
    })),
  };
}
