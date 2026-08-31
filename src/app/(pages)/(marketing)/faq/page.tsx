import type { Metadata } from "next";
import { HelpCircle } from "lucide-react";
import { JsonLd } from "@/app/components/JsonLd";
import { CtaBanner } from "@/app/components/Marketing/CtaBanner";
import { MarketingHero } from "@/app/components/Marketing/MarketingHero";
import { Breadcrumb } from "@/app/components/Link/Breadcrumb";
import { TextLink } from "@/app/components/Link/TextLink";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { SITE, absoluteUrl, breadcrumbSchema, buildMetadata, type Crumb } from "@/app/libs/seo";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";
import { ROLE_LIMITS } from "@/server/core/role_limits";
import {
  MAX_ARRAY_ITEMS,
  MAX_DELAY_MS,
  MAX_RESPONSE_BODY_CHARS,
  MAX_STATUS_CODE,
  MIN_STATUS_CODE,
} from "@/models/endpoint/primitives.model";

const PATH = PAGE_ROUTES.MARKETING.FAQ;

const META_DESCRIPTION =
  "Answers about Fake API: what it costs, how long mock endpoints live, which limits apply, and how AI generated responses work.";

const HERO_DESCRIPTION =
  "Answers about Fake API: what it costs, how long your mock endpoints live, which limits apply, whether you can call them from CI, and how AI generated responses work.";

export const metadata: Metadata = buildMetadata({
  title: "FAQ",
  description: META_DESCRIPTION,
  path: PATH,
});

const BREADCRUMB: Crumb[] = [{ label: "Home", href: PAGE_ROUTES.HOME }, { label: "FAQ" }];

const USER_LIMITS = ROLE_LIMITS.USER;

// Google requires the answer in the FAQPage schema to match the answer on the page, so both
// are rendered from this one array.
const FAQ = [
  {
    question: "Is Fake API free?",
    answer: `Yes. Creating an account costs nothing and includes ${USER_LIMITS.maxProjects} projects, ${USER_LIMITS.maxGroupsPerProject} endpoint groups per project, and ${USER_LIMITS.maxEndpointsPerGroup} endpoints per group. AI generated responses are included as well, at ${USER_LIMITS.maxAiPlansPerDay} designs per day.`,
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No. Endpoints are created in the browser and answer over HTTPS straight away. There is no CLI, no SDK, and nothing to add to your project. Your app only needs the URL.",
  },
  {
    question: "How long do my mock endpoints stay up?",
    answer:
      "An endpoint stays exactly as you left it until you change or delete it. Nothing expires on a timer, so a URL pasted into a ticket last month still answers today.",
  },
  {
    question: "Can I call the endpoints from CI or a test suite?",
    answer:
      "Yes. The URLs are ordinary public HTTPS endpoints with no authentication, so curl, fetch, Postman, Playwright, and any CI runner can call them the same way your app does.",
  },
  {
    question: "Can I return error responses like 404 or 500?",
    answer: `Yes. Every endpoint has its own status code, anywhere from ${MIN_STATUS_CODE} to ${MAX_STATUS_CODE}. Point one endpoint at a 500 and leave it there, and reproducing an error path no longer means editing code. At 204 the body is sent empty, as the spec requires.`,
  },
  {
    question: "Can I simulate a slow network?",
    answer: `Yes. Each endpoint carries its own delay, from 0 up to ${MAX_DELAY_MS.toLocaleString("en-US")} ms, which is how you get your loading states and timeout branches actually exercised.`,
  },
  {
    question: "How large can a response body be?",
    answer: `Up to ${MAX_RESPONSE_BODY_CHARS.toLocaleString("en-US")} characters, with at most ${MAX_ARRAY_ITEMS} items in any single list. That is enough for a full page of results rather than one sample row.`,
  },
  {
    question: "What do the AI response variants actually do?",
    answer:
      "You write the JSON body once and tick the fields that should change. The shape of the response stays fixed, and only the ticked values are regenerated on each call, so your UI meets varied data instead of the same placeholder row every time. The feature is off by default.",
  },
  {
    question: "Are my projects visible to anyone else?",
    answer:
      "Your projects and their definitions are scoped to your account and are not listed publicly. The generated endpoint URLs themselves are public and unauthenticated by design, so treat them as shareable and do not put anything sensitive in a response body.",
  },
  {
    question: "Is this a replacement for a real backend?",
    answer:
      "No, and it is not meant to be. There is no persistence between calls, so a POST does not change what a later GET returns. It exists to unblock frontend work while the real API is being built.",
  },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FAQPage",
      url: absoluteUrl(PATH),
      inLanguage: "en",
      mainEntity: FAQ.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
    breadcrumbSchema(BREADCRUMB, PATH),
  ],
};

export default async function FaqPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN;

  return (
    <div className="relative font-sans flex flex-col items-center py-12">
      <JsonLd data={STRUCTURED_DATA} />

      <div className="w-full max-w-5xl px-4 sm:px-6 mb-4">
        <Breadcrumb items={BREADCRUMB} />
      </div>

      <MarketingHero
        badge="Frequently asked questions"
        badgeIcon={HelpCircle}
        heading={
          <>
            Questions about{" "}
            <span className="bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              {SITE.name}
            </span>
          </>
        }
        description={HERO_DESCRIPTION}
        primaryHref={ctaHref}
        secondaryHref={PAGE_ROUTES.DOCS}
        secondaryLabel="Read the docs"
      />

      <section className="mt-20 w-full max-w-3xl px-4 sm:px-6">
        <div className="flex flex-col gap-8">
          {FAQ.map(({ question, answer }) => (
            <div key={question} className="border-b border-gray-200 pb-8 last:border-b-0">
              <h2 className="text-xl font-bold mb-2">{question}</h2>
              <p className="text-gray-600 leading-relaxed">{answer}</p>
            </div>
          ))}
        </div>

        <p className="text-gray-600 leading-relaxed mt-10">
          Looking for step by step instructions instead? The{" "}
          <TextLink href={PAGE_ROUTES.DOCS} className="text-blue-600 hover:underline">
            documentation
          </TextLink>{" "}
          walks through creating a project, defining endpoints, and calling them from your app. For
          the wider picture, the{" "}
          <TextLink
            href={PAGE_ROUTES.MARKETING.MOCK_API_GENERATOR}
            className="text-blue-600 hover:underline"
          >
            mock API generator
          </TextLink>{" "}
          page covers how endpoints are defined, and the{" "}
          <TextLink
            href={PAGE_ROUTES.MARKETING.FAKE_JSON_API}
            className="text-blue-600 hover:underline"
          >
            fake JSON API
          </TextLink>{" "}
          page covers what they can return.
        </p>
      </section>

      <CtaBanner
        heading="Still curious? Try it."
        description="An account takes a moment and the first endpoint takes a minute."
        href={ctaHref}
      />
    </div>
  );
}
