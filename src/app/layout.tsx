import type { Metadata } from "next";
import { Baloo_2 } from "next/font/google";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import "@/app/styles/globals.css";
import { HeaderWrapper } from "@/app/components/Wrapper/Header/HeaderWrapper";
import { HeroGlow } from "@/app/components/Decor/HeroGlow";
import { AuthWrapper } from "@/app/components/Wrapper/Auth/AuthWrapper";
import { ModalWrapper } from "@/app/components/Wrapper/Modal/ModalWrapper";
import { QueryWrapper } from "@/app/components/Wrapper/QueryClient/QueryWrapper";
import { MinWidthGuard } from "@/app/components/Wrapper/MinWidth/MinWidthGuard";
import { QUERY_KEY } from "@/app/components/Wrapper/QueryClient/Constants";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";
import { TextLink } from "@/app/components/Link/TextLink";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { SITE, absoluteUrl, OG_IMAGE_SIZE } from "@/app/libs/seo";
import { ToastContainer, Slide } from "react-toastify";

// 600 is loaded so `font-semibold` has a face of its own. With only 500 and 800 present, CSS
// resolves a desired 600 or 700 upward to 800, which left every sub-heading as heavy as the title.
export const baloo2 = Baloo_2({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "800"],
});

// The home page declares no metadata of its own, so this default is its title verbatim.
const HOME_TITLE = SITE.name;

// Declaring `openGraph` here stops the root `opengraph-image` file convention applying, so the
// image is named explicitly, the same way `buildMetadata` does it for every other page.
const OG_IMAGES = [
  {
    url: absoluteUrl("/opengraph-image"),
    width: OG_IMAGE_SIZE.width,
    height: OG_IMAGE_SIZE.height,
    alt: `${SITE.name}, mock REST endpoints in seconds`,
  },
];

// The landing pages live in the header's Guides menu instead, so the footer holds only the two
// pages a reader looks for by name.
const FOOTER_LINKS = [
  { href: PAGE_ROUTES.DOCS, label: "Docs" },
  { href: PAGE_ROUTES.MARKETING.FAQ, label: "FAQ" },
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: HOME_TITLE,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "fake API",
    "mock API",
    "REST API generator",
    "API testing tool",
    "frontend development",
    "mock data",
    "JSON API",
    "API prototyping",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: SITE.url,
    title: HOME_TITLE,
    description: SITE.description,
    images: OG_IMAGES,
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: SITE.description,
    images: OG_IMAGES,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const queryClient = new QueryClient();
  queryClient.setQueryData([QUERY_KEY.AUTH.CHECK], user);

  return (
    <html lang="en">
      <body
        className={`${baloo2.className} antialiased relative flex flex-col min-h-screen overflow-x-clip`}
      >
        <HeroGlow />

        <MinWidthGuard>
          <div className="flex-1">
            <QueryWrapper>
              <HydrationBoundary state={dehydrate(queryClient)}>
                <ModalWrapper>
                  <AuthWrapper>
                    <HeaderWrapper />
                    <div className="lg:px-32 md:px-24 sm:px-12 px-8 mt-4">{children}</div>
                  </AuthWrapper>
                </ModalWrapper>
              </HydrationBoundary>
            </QueryWrapper>
            <ToastContainer
              position="bottom-right"
              autoClose={4000}
              newestOnTop
              closeOnClick
              pauseOnHover
              theme="dark"
              transition={Slide}
            />
          </div>

          <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 mt-4 lg:px-24 md:px-16 sm:px-8 px-4 text-sm text-gray-500">
            <p>© {new Date().getFullYear()} Fake API. All rights reserved.</p>
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {FOOTER_LINKS.map(({ href, label }) => (
                <TextLink key={href} href={href} variant="muted">
                  {label}
                </TextLink>
              ))}
            </nav>
          </footer>
        </MinWidthGuard>
      </body>
    </html>
  );
}
