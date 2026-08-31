import type { Metadata } from "next";
import { Baloo_2 } from "next/font/google";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import "@/app/styles/globals.css";
import { HeaderWrapper } from "@/app/components/Wrapper/Header/HeaderWrapper";
import { AuthWrapper } from "@/app/components/Wrapper/Auth/AuthWrapper";
import { ModalWrapper } from "@/app/components/Wrapper/Modal/ModalWrapper";
import { QueryWrapper } from "@/app/components/Wrapper/QueryClient/QueryWrapper";
import { MinWidthGuard } from "@/app/components/Wrapper/MinWidth/MinWidthGuard";
import { QUERY_KEY } from "@/app/components/Wrapper/QueryClient/Constants";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";
import { TextLink } from "@/app/components/Link/TextLink";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { SITE } from "@/app/libs/seo";
import { ToastContainer, Slide } from "react-toastify";

export const baloo2 = Baloo_2({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Fake API, mock REST endpoints in seconds",
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
    title: "Fake API, mock REST endpoints in seconds",
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Fake API, mock REST endpoints in seconds",
    description: SITE.description,
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
      <body className={`${baloo2.className} antialiased flex flex-col min-h-screen`}>
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
              theme="light"
              transition={Slide}
            />
          </div>

          <footer className="flex flex-col items-center gap-3 mb-4 mt-4 text-sm text-gray-500">
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <TextLink href={PAGE_ROUTES.DOCS} variant="muted">
                Docs
              </TextLink>
              <TextLink href={PAGE_ROUTES.MARKETING.MOCK_API_GENERATOR} variant="muted">
                Mock API generator
              </TextLink>
              <TextLink href={PAGE_ROUTES.MARKETING.FAKE_JSON_API} variant="muted">
                Fake JSON API
              </TextLink>
              <TextLink href={PAGE_ROUTES.MARKETING.FAQ} variant="muted">
                FAQ
              </TextLink>
            </nav>
            <p>© 2025 Fake API. All rights reserved.</p>
          </footer>
        </MinWidthGuard>
      </body>
    </html>
  );
}
