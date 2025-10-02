"use client";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { PAGE_ROUTES } from "@/app/libs/routes";
export default function Home() {
  return (
    <div className="font-sans flex flex-col items-center min-h-screen px-6 py-12 bg-gray-50">
      <h1 className="text-6xl font-medium text-black mb-4">404</h1>
      <p className="text-lg text-gray-600 max-w-2xl text-center mb-8">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. The page might have been
        moved or deleted.
      </p>

      <NavigationButton className="text-lg bg-blue-400" href={PAGE_ROUTES.HOME}>
        Back to Home
      </NavigationButton>
    </div>
  );
}
