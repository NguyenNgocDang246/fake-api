import {
  Sparkles,
  Code2,
  SlidersHorizontal,
  Clock,
  FolderKanban,
  Link2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { JsonLd } from "@/app/components/JsonLd";
import { CtaBanner } from "@/app/components/Marketing/CtaBanner";
import { FeatureGrid, type Feature } from "@/app/components/Marketing/FeatureGrid";
import { StepsRow, type Step } from "@/app/components/Marketing/StepsRow";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { SITE, absoluteUrl } from "@/app/libs/seo";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";
import { mockEndpointUrl } from "@/app/libs/helpers/mock_url";

const FEATURES: Feature[] = [
  {
    icon: Code2,
    title: "Any HTTP method",
    description: "Define GET, POST, PUT, PATCH, or DELETE endpoints, each with its own path.",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    icon: SlidersHorizontal,
    title: "Custom status & body",
    description: "Return the exact status code and JSON response body your app expects.",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    icon: Clock,
    title: "Simulated latency",
    description: "Add an artificial delay to an endpoint to test loading and timeout states.",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    icon: FolderKanban,
    title: "Projects & groups",
    description: "Keep endpoints organized by project and endpoint group as your mocks grow.",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    icon: Link2,
    title: "Instant public URL",
    description: "Every endpoint gets a shareable URL the moment you create it, no deploy step.",
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
  },
  {
    icon: ShieldCheck,
    title: "Private to your account",
    description: "Sign in and every project you create stays scoped to your own account.",
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-600",
  },
];

const STEPS: Step[] = [
  {
    step: "1",
    title: "Create a project",
    description: "Sign up and spin up a project to hold your mock endpoints.",
  },
  {
    step: "2",
    title: "Add endpoints",
    description: "Group endpoints, then set the method, path, status code, and response body.",
  },
  {
    step: "3",
    title: "Call your API",
    description: "Use the generated URL straight from your app, tests, or Postman.",
  },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: SITE.name,
      url: SITE.url,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      description: SITE.description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
      logo: absoluteUrl("/assets/logo.png"),
    },
  ],
};

export default async function Home() {
  const user = await getCurrentUser();
  const ctaHref = user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN;

  return (
    <div className="relative font-sans flex flex-col items-center py-12 overflow-hidden">
      <JsonLd data={STRUCTURED_DATA} />

      {/* Decorative background glow */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[-160px] -z-10 flex justify-center">
        <div className="size-[560px] rounded-full bg-blue-300/30 blur-3xl" />
        <div className="absolute left-[calc(50%+220px)] top-[80px] size-[280px] rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute right-[calc(50%+220px)] top-[40px] size-[240px] rounded-full bg-purple-200/30 blur-3xl" />
      </div>

      {/* Hero */}
      <section className="flex flex-col items-center px-4 sm:px-6 text-center">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 ring-1 ring-blue-200 rounded-full px-3 py-1 mb-6">
          <Sparkles size={14} />
          No backend required
        </span>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-black mb-5 max-w-3xl">
          Mock APIs in{" "}
          <span className="bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
            seconds
          </span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mb-9 leading-relaxed">
          Define custom endpoints with your own HTTP methods, status codes, response bodies, and
          even simulated latency, so you can build and test your frontend without waiting on a
          real backend.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <NavigationButton
            variant="primary"
            className="text-lg shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.03] active:scale-[0.98]"
            href={ctaHref}
          >
            <span className="flex items-center gap-1.5">
              Get started
              <ArrowRight size={18} />
            </span>
          </NavigationButton>
          <NavigationButton
            variant="outline"
            className="text-lg transition-all hover:scale-[1.03] active:scale-[0.98]"
            href={PAGE_ROUTES.DOCS}
            target="_blank"
          >
            View docs
          </NavigationButton>
        </div>
      </section>

      {/* Live example */}
      <section className="mt-16 w-full max-w-xl px-4 sm:px-6">
        <div className="rounded-xl shadow-2xl shadow-blue-900/10 overflow-hidden ring-1 ring-black/5">
          <div className="h-1 bg-linear-to-r from-indigo-600 via-blue-500 to-purple-500" />
          <div className="flex items-center gap-1.5 bg-gray-800 px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-red-400" />
            <span className="size-2.5 rounded-full bg-yellow-400" />
            <span className="size-2.5 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-gray-400">Example request</span>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-5 text-sm overflow-x-auto leading-relaxed">
            <span className="inline-block rounded bg-green-500/15 px-1.5 py-0.5 text-xs font-bold text-green-400 align-middle">
              GET
            </span>{" "}
            <span className="text-gray-300">{mockEndpointUrl("6V7sc4oUGQto", "/api/user/1")}</span>
            {`\n\n`}
            {`{\n    `}
            <span className="text-sky-400">&quot;id&quot;</span>
            {`: `}
            <span className="text-orange-300">&quot;1&quot;</span>
            {`,\n    `}
            <span className="text-sky-400">&quot;name&quot;</span>
            {`: `}
            <span className="text-orange-300">&quot;John Doe&quot;</span>
            {`,\n    `}
            <span className="text-sky-400">&quot;email&quot;</span>
            {`: `}
            <span className="text-orange-300">&quot;john@example.com&quot;</span>
            {`\n}`}
          </pre>
        </div>
      </section>

      <FeatureGrid
        heading="Everything you need to fake a backend"
        subheading="Built for frontend developers who need realistic data, fast."
        items={FEATURES}
      />

      <StepsRow heading="How it works" items={STEPS} />

      <CtaBanner
        heading="Ready to mock your first API?"
        description="Create a project and get a working endpoint in under a minute."
        href={ctaHref}
      />
    </div>
  );
}
