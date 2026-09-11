import {
  Sparkles,
  Code2,
  SlidersHorizontal,
  Clock,
  FolderKanban,
  Link2,
  ArrowRight,
  Check,
} from "lucide-react";
import type { ReactNode } from "react";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { JsonLd } from "@/app/components/JsonLd";
import { CtaBanner } from "@/app/components/Marketing/CtaBanner";
import { FeatureGrid, type Feature } from "@/app/components/Marketing/FeatureGrid";
import { StepsRow, type Step } from "@/app/components/Marketing/StepsRow";
import { TextLink } from "@/app/components/Link/TextLink";
import { GuestPlayground } from "@/app/(home)/components/GuestPlayground/GuestPlayground";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { SITE, absoluteUrl } from "@/app/libs/seo";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";
import { MAX_STATUS_CODE, MIN_STATUS_CODE } from "@/models/endpoint/primitives.model";

// The grid is three across, so the first three are the top row. Order is by how much each one
// sets the product apart, not by how the app is built.
const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: "AI response variants",
    description:
      "Tick the fields that may change. Every call answers with fresh values, the rest stays as written.",
  },
  {
    icon: Link2,
    title: "Instant public URL",
    description: "Every endpoint gets a shareable URL the moment you create it, no deploy step.",
  },
  {
    icon: SlidersHorizontal,
    title: "Custom status & body",
    description: "Return the exact status code and JSON response body your app expects.",
  },
  {
    icon: Code2,
    title: "Any HTTP method",
    description: "Define GET, POST, PUT, PATCH, or DELETE endpoints, each with its own path.",
  },
  {
    icon: Clock,
    title: "Simulated latency",
    description: "Add an artificial delay to an endpoint to test loading and timeout states.",
  },
  {
    icon: FolderKanban,
    title: "Projects & groups",
    description: "Keep endpoints organized by project and endpoint group as your mocks grow.",
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

const SIGNALS = [
  "Fresh AI data on every call",
  "Any status code, any delay",
  "Hosted URL, no server to run",
];

const PURPOSE: { title: string; body: ReactNode }[] = [
  {
    title: "Your app makes a real network call",
    body: "So the loading state, the error branch, the retry and the abort on unmount all run the way they will in production. Importing a JSON fixture skips every one of them.",
  },
  {
    title: "The states nobody plans for become reachable",
    body: (
      <>
        Give one endpoint a 500, another a three second delay, and a third an empty list. Any status
        from {MIN_STATUS_CODE} to {MAX_STATUS_CODE} works, and{" "}
        <TextLink
          href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status"
          className="text-blue-600 hover:underline"
          external
        >
          the MDN status code reference
        </TextLink>{" "}
        spells out what each one tells a client.
      </>
    ),
  },
  {
    title: "It is not a backend, on purpose",
    body: "Nothing persists between calls, so a POST does not change what a later GET returns. When the real endpoint lands, you change a base URL and delete the project.",
  },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: SITE.name,
      url: SITE.url,
      description: SITE.description,
      inLanguage: "en",
    },
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
    <div className="relative font-sans flex flex-col items-center py-12">
      <JsonLd data={STRUCTURED_DATA} />

      <section className="flex flex-col items-center px-4 sm:px-6 text-center">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 ring-1 ring-blue-200 rounded-full px-3 py-1 mb-6">
          <Sparkles size={14} />
          No backend required
        </span>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-black mb-5 max-w-3xl">
          Build a fake API in{" "}
          <span className="bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
            seconds
          </span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mb-9 leading-relaxed">
          Create custom endpoints with your own methods, status codes, responses, and latency. Test
          your frontend with AI-generated data that changes on every call.
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

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
          {SIGNALS.map((signal) => (
            <span key={signal} className="flex items-center gap-1.5">
              <Check size={16} className="text-blue-600" />
              {signal}
            </span>
          ))}
        </div>
      </section>

      {!user && <GuestPlayground />}

      <section className="mt-24 w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">What a fake API is for</h2>
        <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">
          A real HTTP endpoint that answers with data you decided on, rather than data a database
          produced. You point your app at it while the real service is still being written.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {PURPOSE.map(({ title, body }) => (
            <div
              key={title}
              className="bg-white/80 border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-transparent transition-all"
            >
              <h3 className="font-semibold mb-1.5">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
            </div>
          ))}
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
