"use client";
import { SearchX, ArrowRight } from "lucide-react";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { PAGE_ROUTES } from "@/app/libs/routes";

export default function NotFound() {
  return (
    <div className="relative font-sans flex flex-col items-center py-12 overflow-hidden">
      {/* Decorative background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-160px] -z-10 flex justify-center"
      >
        <div className="size-[560px] rounded-full bg-blue-300/30 blur-3xl" />
        <div className="absolute left-[calc(50%+220px)] top-[80px] size-[280px] rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute right-[calc(50%+220px)] top-[40px] size-[240px] rounded-full bg-purple-200/30 blur-3xl" />
      </div>

      <section className="flex flex-col items-center px-4 sm:px-6 text-center">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 ring-1 ring-blue-200 rounded-full px-3 py-1 mb-6">
          <SearchX size={14} />
          Page not found
        </span>

        <h1 className="text-6xl sm:text-8xl font-extrabold tracking-tight mb-3">
          <span className="bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
            404
          </span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mb-9 leading-relaxed">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved
          or deleted.
        </p>

        <NavigationButton
          variant="primary"
          className="text-lg shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.03] active:scale-[0.98]"
          href={PAGE_ROUTES.HOME}
        >
          <span className="flex items-center gap-1.5">
            Back to Home
            <ArrowRight size={18} />
          </span>
        </NavigationButton>
      </section>
    </div>
  );
}
