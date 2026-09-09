import type { Metadata } from "next";
import { Braces, Shuffle, Layers, Ruler, FileJson, Sparkles, Repeat } from "lucide-react";
import { JsonLd } from "@/app/components/JsonLd";
import { CodeBlock } from "@/app/components/Code/CodeBlock";
import { CtaBanner } from "@/app/components/Marketing/CtaBanner";
import { FeatureGrid, type Feature } from "@/app/components/Marketing/FeatureGrid";
import { MarketingHero } from "@/app/components/Marketing/MarketingHero";
import { Breadcrumb } from "@/app/components/Link/Breadcrumb";
import { TextLink } from "@/app/components/Link/TextLink";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { SITE, absoluteUrl, breadcrumbSchema, buildMetadata, type Crumb } from "@/app/libs/seo";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";
import { MAX_AI_FIELDS, MAX_AI_VALUES } from "@/models/endpoint/ai_fields.model";
import {
  MAX_ARRAY_ITEMS,
  MAX_RESPONSE_BODY_CHARS,
  MAX_RESPONSE_BODY_DEPTH,
} from "@/models/endpoint/primitives.model";

const PATH = PAGE_ROUTES.MARKETING.FAKE_JSON_API;

const META_DESCRIPTION =
  "Serve fake JSON data over a real HTTP URL. Paste the exact response body you want, or let AI vary chosen fields on every call.";

const HERO_DESCRIPTION =
  "Serve fake JSON data over a real HTTP URL. Paste the exact response body you want, or let AI vary chosen fields on every call so your UI is never tested against the same row twice.";

export const metadata: Metadata = buildMetadata({
  title: "Fake JSON API",
  description: META_DESCRIPTION,
  path: PATH,
});

const BREADCRUMB: Crumb[] = [{ label: "Home", href: PAGE_ROUTES.HOME }, { label: "Fake JSON API" }];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Fake JSON API",
      description: META_DESCRIPTION,
      url: absoluteUrl(PATH),
      inLanguage: "en",
      isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
    },
    breadcrumbSchema(BREADCRUMB, PATH),
  ],
};

const JSON_FEATURES: Feature[] = [
  {
    icon: FileJson,
    title: "What you wrote, on one line",
    description:
      "Key order and long numbers survive intact, so a 19-digit id does not come back rounded. Only your spacing goes, which is what makes every endpoint answer in the same compact line. Turn on AI and the same holds: the fields you ticked change on each call, the rest stay exactly as you typed them.",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    icon: Layers,
    title: "Nested objects and lists",
    description: `Nest up to ${MAX_RESPONSE_BODY_DEPTH} levels deep with up to ${MAX_ARRAY_ITEMS} items in any one list, which covers the shape of most real payloads.`,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    icon: Sparkles,
    title: "AI generated field values",
    description: `Tick the fields that should change and each call regenerates them, up to ${MAX_AI_FIELDS} fields and ${MAX_AI_VALUES} values at a time. Everything else stays exactly as written.`,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    icon: Shuffle,
    title: "Data that is not all John Doe",
    description:
      "Names of different lengths, emails that are not all the same domain, prices that are not all round. Layout bugs show up under varied data, not under placeholder data.",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    icon: Ruler,
    title: "Sized for a real screen",
    description: `A body can run to ${MAX_RESPONSE_BODY_CHARS.toLocaleString("en-US")} characters, enough for a full page of results rather than a single token row.`,
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
  },
  {
    icon: Repeat,
    title: "Stable when you need it",
    description:
      "AI variation is off by default. Leave it off and the endpoint answers identically every time, which is what a snapshot test wants.",
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-600",
  },
];

const FIXED_BODY = `{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "orders": [
    { "id": "A-1001", "total": 42.5, "status": "shipped" }
  ]
}`;

const VARIED_RESPONSE = `// first call
{ "id": 1, "name": "Marguerite Ellsworth", "email": "m.ellsworth@northwind.co" }

// second call, same endpoint
{ "id": 1, "name": "Bo Tran", "email": "bo.tran@lumen.io" }`;

export default async function FakeJsonApiPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN;

  return (
    <div className="relative font-sans flex flex-col items-center py-12">
      <JsonLd data={STRUCTURED_DATA} />

      <div className="w-full max-w-5xl px-4 sm:px-6 mb-4 mt-[-2rem]">
        <Breadcrumb items={BREADCRUMB} />
      </div>

      <MarketingHero
        badge="Fake JSON API"
        badgeIcon={Braces}
        heading={
          <>
            A fake JSON API, served over a{" "}
            <span className="bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              real HTTP URL
            </span>
          </>
        }
        description={HERO_DESCRIPTION}
        primaryHref={ctaHref}
        secondaryHref={PAGE_ROUTES.DOCS}
        secondaryLabel="Read the docs"
      />

      <section className="mt-20 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">A fixture file is not an API</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Importing a JSON file into a component gets data on the screen, but it skips everything
          that makes a network call a network call. There is no loading state, because the data is
          already there. There is no error branch, because an import cannot fail at runtime. There
          is no race, no abort, no stale response arriving after the user has navigated away.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Those are precisely the paths that break in production. Serving the same JSON over HTTP
          costs nothing extra and puts every one of them back in play, and the{" "}
          <TextLink
            href={PAGE_ROUTES.MARKETING.MOCK_API_GENERATOR}
            className="text-blue-600 hover:underline"
          >
            mock API generator
          </TextLink>{" "}
          is where you define the endpoint that serves it.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Write the body, get the body</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          Paste any valid JSON object and the endpoint answers with it, unchanged. This matters more
          than it sounds: many tools round-trip your JSON through a parser before sending it, which
          reorders integer-like keys and quietly destroys any number past 2^53. An id like
          9007199254740993 has to survive, and here it does.
        </p>
        <CodeBlock lang="json">{FIXED_BODY}</CodeBlock>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Or let the values move</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          Placeholder data is uniform in a way real data never is. Every name is the same length,
          every price ends in .00, every list has three items. UIs built against that data look fine
          until the first real row arrives and a card overflows.
        </p>
        <p className="text-gray-600 leading-relaxed mb-6">
          Turn on AI variants, tick the fields that should change, and the endpoint keeps its shape
          while those values are regenerated on every call. The keys, the nesting, and the fields
          you did not tick stay exactly as you wrote them.
        </p>
        <CodeBlock lang="responses">{VARIED_RESPONSE}</CodeBlock>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          Dummy JSON data for a full screen, not one row
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Most dummy JSON data you find lying around is a single object or a list of three. That is
          enough to prove a fetch works, and not enough to find out what your table does at row
          forty. A body here holds up to {MAX_ARRAY_ITEMS} items in one list and runs to{" "}
          {MAX_RESPONSE_BODY_CHARS.toLocaleString("en-US")} characters, which is a screen of results
          rather than a sample of one.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Size is also how you reach the states nobody tests. Give one endpoint the full list, a
          second the same shape with an empty array, and a third a single item, and the empty state
          and the one-result layout stop being things you find out about after release.
        </p>
      </section>

      <FeatureGrid
        heading="What the JSON layer gives you"
        subheading="Precise when you want it, varied when you need it."
        items={JSON_FEATURES}
      />

      <CtaBanner
        heading="Serve your first JSON response"
        description="Paste a body, save, and call the URL. No backend, no deploy."
        href={ctaHref}
      />
    </div>
  );
}
