import type { Metadata } from "next";
import { FlaskConical, Gauge, Lock, ShieldAlert, Shuffle, Timer, Wrench } from "lucide-react";
import { JsonLd } from "@/app/components/JsonLd";
import { CodeBlock } from "@/app/components/Code/CodeBlock";
import { ComparisonTable } from "@/app/components/Marketing/ComparisonTable";
import { CtaBanner } from "@/app/components/Marketing/CtaBanner";
import { FeatureGrid, type Feature } from "@/app/components/Marketing/FeatureGrid";
import { MarketingHero } from "@/app/components/Marketing/MarketingHero";
import { Breadcrumb } from "@/app/components/Link/Breadcrumb";
import { TextLink } from "@/app/components/Link/TextLink";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { SITE, absoluteUrl, breadcrumbSchema, buildMetadata, type Crumb } from "@/app/libs/seo";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";
import {
  MAX_DELAY_MS,
  MAX_STATUS_CODE,
  MIN_STATUS_CODE,
} from "@/models/endpoint/primitives.model";

const PATH = PAGE_ROUTES.MARKETING.FREE_API_FOR_TESTING;

const META_DESCRIPTION =
  "Seven free APIs for testing compared by the data they serve, write support, rate limits and what each is best at, plus what to do when none of them fit.";

const HERO_DESCRIPTION =
  "Seven free APIs for testing, compared by the data they serve, whether writes stick, and the limits they document. Then the harder question: what to do when a shared public API cannot give you the shape, the status code or the delay your screen actually needs.";

export const metadata: Metadata = buildMetadata({
  title: "Free APIs for Testing - Compared and Explained",
  description: META_DESCRIPTION,
  path: PATH,
});

const BREADCRUMB: Crumb[] = [
  { label: "Home", href: PAGE_ROUTES.HOME },
  { label: "Free APIs for testing" },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      headline: "Free APIs for testing, and how to pick one",
      description: META_DESCRIPTION,
      url: absoluteUrl(PATH),
      inLanguage: "en",
      publisher: {
        "@type": "Organization",
        name: SITE.name,
        url: SITE.url,
      },
    },
    breadcrumbSchema(BREADCRUMB, PATH),
  ],
};

// Every row links out, which is the point of the page: these are the services a reader is
// choosing between before they ever consider defining an endpoint themselves.
const PUBLIC_APIS: { name: string; href: string; cells: string[] }[] = [
  {
    name: "JSONPlaceholder",
    href: "https://jsonplaceholder.typicode.com",
    cells: [
      "Posts, comments, albums, photos, todos, users",
      "Accepted, nothing persists",
      "None documented",
      "The first fetch in a tutorial",
    ],
  },
  {
    name: "DummyJSON",
    href: "https://dummyjson.com",
    cells: [
      "Products, carts, users, recipes, quotes, posts",
      "Simulated, nothing persists",
      "None documented",
      "A realistic ecommerce shape",
    ],
  },
  {
    name: "ReqRes",
    href: "https://reqres.in",
    cells: [
      "Users, plus login and register routes",
      "Simulated, nothing persists",
      "250 a day, per IP",
      "Auth flows and paged lists",
    ],
  },
  {
    name: "Fake Store API",
    href: "https://fakestoreapi.com",
    cells: [
      "Products, categories, carts, users",
      "Simulated, nothing persists",
      "None documented",
      "A storefront grid",
    ],
  },
  {
    name: "PokeAPI",
    href: "https://pokeapi.co",
    cells: [
      "Deeply nested reference data",
      "Read only",
      "Fair use, caching requested",
      "Large nested payloads",
    ],
  },
  {
    name: "httpbin",
    href: "https://httpbin.org",
    cells: [
      "Whatever you ask it to echo",
      "Echoes your request back",
      "None documented",
      "Status codes, headers, delays",
    ],
  },
  {
    name: "RandomUser",
    href: "https://randomuser.me",
    cells: [
      "Generated user profiles with photos",
      "Read only",
      "Fair use",
      "Avatars and varied names",
    ],
  },
];

const LIMITS: Feature[] = [
  {
    icon: Lock,
    title: "The shape is not yours",
    description:
      "Your screen renders an invoice with a tax breakdown. The public API serves posts and todos. You end up writing a mapping layer that exists only in the mock, and testing that layer instead of your UI.",
  },
  {
    icon: ShieldAlert,
    title: "It almost always returns 200",
    description:
      "A shared service is built to demonstrate success. Getting a 500 out of it on demand, repeatably, for one specific route, is not something it offers, so the error branch stays untested.",
  },
  {
    icon: Timer,
    title: "It answers too fast",
    description:
      "Skeletons, spinners and timeout branches only run when a response is slow. A snappy public API hides every one of them until a user on a train finds them for you.",
  },
  {
    icon: Shuffle,
    title: "Writes do not stick",
    description:
      "Every service in the table above accepts a POST and returns something that looks created. None of them keep it. Optimistic updates and refetch after mutate cannot be exercised against that.",
  },
  {
    icon: Gauge,
    title: "Shared capacity, shared fate",
    description:
      "A free endpoint used by every tutorial reader on the internet is a dependency you do not control. When it is slow or down, your test suite is red for reasons that have nothing to do with your code.",
  },
  {
    icon: Wrench,
    title: "No place to put an edge case",
    description:
      "An empty list, a single result, a name long enough to wrap, a null where you expected a string. These are the states that break layouts, and a fixed public dataset has no room for them.",
  },
];

const HTTPBIN_EXAMPLE = `# a 503, on demand
curl -i https://httpbin.org/status/503

# a response that takes 3 seconds
curl -i https://httpbin.org/delay/3

# whatever headers you want echoed back
curl -i https://httpbin.org/response-headers?X-Total-Count=42`;

export default async function FreeApiForTestingPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN;

  return (
    <div className="relative font-sans flex flex-col items-center py-12">
      <JsonLd data={STRUCTURED_DATA} />

      <div className="w-full max-w-5xl px-4 sm:px-6 mb-4 mt-[-2rem]">
        <Breadcrumb items={BREADCRUMB} />
      </div>

      <MarketingHero
        badge="Free API for testing"
        badgeIcon={FlaskConical}
        heading={
          <>
            Free APIs for testing, and{" "}
            <span className="bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              how to pick one
            </span>
          </>
        }
        description={HERO_DESCRIPTION}
      />

      <section className="mt-20 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          What a public test API is actually for
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Every free public API in this article exists to answer one question: does my HTTP client
          work. You are learning a framework, evaluating a data fetching library, or checking that a
          proxy config is right, and you need a URL that returns valid JSON without an API key or a
          signup form. For that job these services are excellent, and the right one is usually
          whichever you can remember the hostname of.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          They start to strain the moment the question changes from does my client work to does my
          screen work. A screen has states. It has a loading state, an empty state, a single result
          layout, a hundred result layout, a permission error, a network timeout, and a row whose
          title is long enough to push the price off the card. A shared dataset that always returns
          the same twenty posts in the same order can prove exactly one of those.
        </p>
        <p className="text-gray-600 leading-relaxed">
          So the useful way to read the table below is not which API is best, it is which of these
          matches the shape I need, and how far can it take me before I have to do something else.
        </p>
      </section>

      <section className="mt-16 w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Seven free REST APIs to test against</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          All seven are free, need no API key for the routes described, and answer a browser
          directly. Details change, so treat this as a starting point and check the service before
          you depend on it.
        </p>
        <ComparisonTable
          caption="Free public APIs for testing, compared by data served, write support and documented rate limits"
          columns={["API", "What it serves", "Write requests", "Documented limit", "Best for"]}
          rows={PUBLIC_APIS.map(({ name, href, cells }) => [
            <TextLink key={href} href={href} className="text-blue-600 hover:underline" external>
              {name}
            </TextLink>,
            ...cells,
          ])}
        />
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          Testing the paths that never return 200
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          One entry in that table is doing a different job from the rest.{" "}
          <TextLink href="https://httpbin.org" className="text-blue-600 hover:underline" external>
            httpbin
          </TextLink>{" "}
          serves no dataset at all. It echoes, and in doing so it lets you ask for the responses the
          other services will not give you: a specific status code, a deliberate delay, a chosen set
          of response headers.
        </p>
        <CodeBlock lang="bash">{HTTPBIN_EXAMPLE}</CodeBlock>
        <p className="text-gray-600 leading-relaxed mt-6">
          This is genuinely the fastest way to check that your error handler fires and your spinner
          appears. What it cannot do is combine the two halves. You can have a 503, or you can have
          your data shape, but you cannot have a 503 on the endpoint that serves your invoice list,
          and you cannot have that same list come back empty on the next route your screen calls.
          Wiring your app to two unrelated hosts to test one feature is where this approach stops
          paying.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">The one that serves your own JSON</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          A second entry does something the others do not.{" "}
          <TextLink
            href="https://dummyjson.com/custom-response"
            className="text-blue-600 hover:underline"
            external
          >
            DummyJSON
          </TextLink>{" "}
          has a custom response tool. You paste a JSON body, pick a method, and it hands back a
          hosted URL that serves it, with no account and no signup. If a fixed shape behind a URL is
          the whole of what you need, that is the shortest path there is and you should take it.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          Knowing where it stops matters before you build on it. The URL expires after 90 days. The
          body is fixed to the URL it was created with, so changing a response means generating a new
          one and updating your app. The payload caps at 300 KB. And the tool takes a body and a
          method and nothing else, so the status code and the delay are not yours to choose.
        </p>
        <p className="text-gray-600 leading-relaxed">
          That last limit is the same wall httpbin hits from the opposite side. httpbin gives you the
          status code and the delay but not your data. A pasted body gives you your data but not the
          status code or the delay. A screen needs both at once, on the same endpoint.
        </p>
      </section>

      <FeatureGrid
        heading="Where a shared public API runs out"
        subheading="None of these are flaws. They are the cost of a dataset that belongs to everybody."
        items={LIMITS}
      />

      <section className="mt-24 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">When to define the endpoint yourself</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          The moment you find yourself writing a mapping layer to turn todos from a public dataset
          into your invoices, the shared API has stopped saving you time. The alternative is not standing up a
          backend. It is writing down the response you already know you need and putting it behind a
          URL.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          That is what this site does. You paste the JSON body your screen expects, choose a status
          anywhere from {MIN_STATUS_CODE} to {MAX_STATUS_CODE}, set a delay up to{" "}
          {MAX_DELAY_MS.toLocaleString("en-US")} ms, and get a public HTTPS URL back. The same
          feature can have one endpoint returning the full list, one returning an empty list, and one
          returning a 500 after two seconds, which is the combination httpbin cannot give you and a
          fixed dataset has no room for.
        </p>
        <p className="text-gray-600 leading-relaxed">
          It has its own limit, and it is the same one the services above have: nothing persists
          between calls, so a POST does not change what a later GET returns. If your test needs a
          write to stick, you need a real backend or one of the stateful services compared on{" "}
          <TextLink
            href={PAGE_ROUTES.MARKETING.MOCK_API_TOOLS}
            className="text-blue-600 hover:underline"
          >
            mock API tools
          </TextLink>
          , and no public dataset on this page is going to substitute for one. For everything short
          of that,{" "}
          <TextLink href={PAGE_ROUTES.MARKETING.MOCK_DATA} className="text-blue-600 hover:underline">
            mock data
          </TextLink>{" "}
          covers where a mock belongs and how to make the values realistic enough to be worth testing
          against.
        </p>
      </section>

      <CtaBanner
        heading="Need a shape none of them serve?"
        description="Write the response you actually want and call it over HTTPS a minute later."
        href={ctaHref}
      />
    </div>
  );
}
