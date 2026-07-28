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
import { ToastContainer, Slide } from "react-toastify";

export const baloo2 = Baloo_2({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "800"],
});

export const metadata: Metadata = {
  title: "Fake API",
  description:
    "Create your own fake API instantly without a backend. Perfect for frontend developers who need mock data for testing and prototyping.",
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

          <footer className="flex mb-4 mt-4 justify-center text-sm text-gray-500">
            <p>© 2025 Fake API. All rights reserved.</p>
          </footer>
        </MinWidthGuard>
      </body>
    </html>
  );
}
