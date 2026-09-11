import type { Metadata } from "next";
import { Database, Braces, Blocks, ListOrdered, Wand2, CircleSlash } from "lucide-react";
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
import { ROLE_LIMITS } from "@/server/core/role_limits";
import { MAX_AI_FIELDS, MAX_AI_VALUES } from "@/models/endpoint/ai_fields.model";
import { MAX_ARRAY_ITEMS } from "@/models/endpoint/primitives.model";

const PATH = PAGE_ROUTES.MARKETING.DUMMY_JSON_DATA;

const META_DESCRIPTION =
  "Dummy JSON data that finds layout bugs instead of hiding them: the values that break a UI, three ways to generate mock data, and how many rows you need.";

const HERO_DESCRIPTION =
  "Most dummy JSON data is too tidy to be useful. Every name is the same length, every price ends in .00, every list has three items. Here is what realistic mock data looks like, which values actually break a UI, and the three ways to produce it.";

export const metadata: Metadata = buildMetadata({
  title: "Dummy JSON Data - Generate Realistic Mock Data",
  description: META_DESCRIPTION,
  path: PATH,
});

const BREADCRUMB: Crumb[] = [
  { label: "Home", href: PAGE_ROUTES.HOME },
  { label: "Dummy JSON data" },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      headline: "Dummy JSON data that actually finds bugs",
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

const USER_LIMITS = ROLE_LIMITS.USER;

const TIDY = `[
  { "id": 1, "name": "John Doe",   "email": "john@example.com",  "total": 100.00 },
  { "id": 2, "name": "Jane Roe",   "email": "jane@example.com",  "total": 200.00 },
  { "id": 3, "name": "Bob Smith",  "email": "bob@example.com",   "total": 300.00 }
]`;

const HOSTILE = `[
  {
    "id": 9007199254740993,
    "name": "Bartholomew Featherstonehaugh-Wetherby III",
    "email": "b.featherstonehaugh@a-rather-long-company-name.co.uk",
    "nickname": "",
    "avatar_url": null,
    "tags": [],
    "total": 1299.5,
    "note": "実験用のデータ 🎉"
  },
  { "id": 2, "name": "Bo Ng", "email": "bo@x.io", "nickname": "Bo",
    "avatar_url": "https://example.com/a.png", "tags": ["vip"], "total": 8, "note": "" }
]`;

const HOSTILE_CASES = [
  "A name long enough to wrap onto a second line, and one short enough to leave the row looking empty",
  "An empty string, which is not the same thing as a missing key and renders differently from both",
  "An explicit null where your type says string, because the API will send one eventually",
  "An empty array, so the nested list renders its own empty state rather than nothing at all",
  "An integer past 2^53, which JavaScript silently rounds and your id comparison then fails on",
  "A price with one decimal place, or none, so your formatter is doing the formatting",
  "CJK characters, accented Latin and an emoji, which change line height and break naive truncation",
];

const APPROACHES = [
  {
    name: "Hand written fixture",
    cells: [
      "A file in your repo",
      "Never, it is the same every run",
      "Only to people with the repo",
      "Free, and it rots quietly once the real contract moves",
    ],
  },
  {
    name: "Faker in your test setup",
    cells: [
      "Your build or test process",
      "Every run, unless you pin a seed",
      "Only to people with the repo",
      "Free, but unseeded randomness makes a failure hard to reproduce",
    ],
  },
  {
    name: "Hosted generator",
    cells: [
      "Behind an HTTPS URL",
      "Every request, if you ask it to",
      "Anyone holding the URL",
      "Nothing to install, and one more service in the loop",
    ],
  },
];

const COHERENCE: Feature[] = [
  {
    icon: Braces,
    title: "Your shape, not a stock shape",
    description:
      "The body is the one you pasted. Keys, nesting and the fields you did not tick come back exactly as written, so a list of invoices stays a list of invoices.",
  },
  {
    icon: Wand2,
    title: "Values that belong together",
    description:
      "An email, username and phone match the name beside them, and a city sits in the right country. Independently random fields read as noise, not as data.",
  },
  {
    icon: ListOrdered,
    title: "Totals that add up",
    description:
      "A sum matches the lines above it and a delivery date falls after the order date, so a screen that does its own arithmetic does not disagree with the payload.",
  },
  {
    icon: Blocks,
    title: "Lists of a different length",
    description: `Tick vary count and the list is a different size on every call, up to ${MAX_ARRAY_ITEMS} items, which is how a table's pagination and overflow get exercised.`,
  },
  {
    icon: CircleSlash,
    title: "Empty where empty is correct",
    description:
      "A value that only makes sense sometimes stays empty the rest of the time, such as a shipping date on an order that has not shipped.",
  },
  {
    icon: Database,
    title: "Off by default",
    description:
      "Variation is opt in. Leave it off and the endpoint answers identically every time, which is what a snapshot test wants and what a demo script needs.",
  },
];

export default async function DummyJsonDataPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN;

  return (
    <div className="relative font-sans flex flex-col items-center py-12">
      <JsonLd data={STRUCTURED_DATA} />

      <div className="w-full max-w-5xl px-4 sm:px-6 mb-4 mt-[-2rem]">
        <Breadcrumb items={BREADCRUMB} />
      </div>

      <MarketingHero
        badge="Dummy JSON data"
        badgeIcon={Database}
        heading={
          <>
            Dummy JSON data that{" "}
            <span className="bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              actually finds bugs
            </span>
          </>
        }
        description={HERO_DESCRIPTION}
        primaryHref={ctaHref}
        secondaryHref={PAGE_ROUTES.DOCS}
        secondaryLabel="Read the docs"
      />

      <section className="mt-20 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Tidy data hides the bugs</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          Here is the mock data almost everyone writes first. It is not wrong, and it will get a
          table onto the screen. It will also pass every visual check you make, right up until the
          first real row arrives.
        </p>
        <CodeBlock lang="json">{TIDY}</CodeBlock>
        <p className="text-gray-600 leading-relaxed mt-6 mb-4">
          Look at what it quietly guarantees. Every name is about the same width, so no cell ever
          wraps. Every total has two decimal places, so you never notice the formatter is missing.
          Every field is present and non null, so the optional chaining you forgot never throws.
          Every list has exactly three items, so pagination, overflow and the empty state are all
          untested. The ids are small, so the rounding bug stays asleep.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Placeholder data is uniform in a way real data never is, and a UI built against it is
          tested against the one dataset guaranteed not to break it. The fix is not more rows. It is
          rows that disagree with each other.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">The values that break a UI</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          This is the same list, written to be difficult. Two rows is enough, because the point is
          the contrast between them rather than the volume.
        </p>
        <CodeBlock lang="json">{HOSTILE}</CodeBlock>
        <ul className="mt-6 flex flex-col gap-3">
          {HOSTILE_CASES.map((item) => (
            <li key={item} className="text-gray-600 leading-relaxed flex gap-3">
              <span className="mt-2 size-1.5 rounded-full bg-blue-500 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <p className="text-gray-600 leading-relaxed mt-6">
          None of these are exotic. Every one of them is a value a production API will send you
          eventually, and each one has a matching bug that is cheap to fix now and expensive to find
          later.
        </p>
      </section>

      <section className="mt-16 w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Three ways to generate it</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          These are not ranked. A fixture is the right answer for a snapshot test, and{" "}
          <TextLink href="https://fakerjs.dev" className="text-blue-600 hover:underline" external>
            Faker
          </TextLink>{" "}
          is the right answer when the data has to be generated inside a test run. What separates
          them is where the data comes from and who else can see it.
        </p>
        <ComparisonTable
          caption="Three ways to produce dummy JSON data, compared by where they run, how much they vary, who can reach them and what they cost"
          columns={["Approach", "Where it runs", "Varies per call", "Who can use it", "What it costs"]}
          rows={APPROACHES.map(({ name, cells }) => [name, ...cells])}
        />
        <p className="text-gray-600 leading-relaxed mt-6">
          The third row is the one worth thinking about, because it changes who the data is for. A
          fixture and a Faker call both live inside the repo, so a designer checking a state, a QA
          engineer reproducing a bug, or a CI job on another machine cannot reach them without
          running your project. A URL can be pasted into a ticket.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">How many rows you actually need</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          A list of three proves a fetch works and nothing else. The interesting counts are zero, one
          and more than fits. Zero is the empty state, which is usually the least designed screen in
          any product. One is the layout that looks broken because a grid built for a dozen cards is
          holding a single one. More than fits is where pagination, virtualisation, sticky headers
          and overflow all get their first real test.
        </p>
        <p className="text-gray-600 leading-relaxed">
          The practical move is to keep all three at once rather than editing one dataset back and
          forth. Point three endpoints at the same shape with different contents, and switching
          between them is a base URL change instead of a code change.{" "}
          <TextLink
            href={PAGE_ROUTES.MARKETING.FREE_API_FOR_TESTING}
            className="text-blue-600 hover:underline"
          >
            Public test APIs
          </TextLink>{" "}
          cannot do this, because their datasets are fixed and shared.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Varied without being incoherent</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          There is a failure mode on the other side of tidy data. Randomise every field
          independently and you get a customer named Xq Zzt whose email belongs to someone else,
          living in a city that is not in the country beside it, with an order total that has no
          relationship to the lines above it. That data is varied and still useless, because nobody
          can tell a rendering bug from the noise.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          On this site the way around that is to write the body once and tick the fields that are
          allowed to move, up to {MAX_AI_FIELDS} fields and {MAX_AI_VALUES} values at a time. The
          shape stays fixed and the ticked values are regenerated on every call, with the
          relationships between them preserved.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Two details are easy to get wrong. Variation is off unless you turn it on, so an endpoint
          you want stable stays stable. And calling the endpoint costs nothing from your daily quota,
          because only designing the variation spends one, at{" "}
          {USER_LIMITS.maxAiPlansPerDay} designs per day on a free account. A screen paging through a
          hundred records shows a hundred different records at no extra cost.
        </p>
      </section>

      <FeatureGrid
        heading="What varied data has to keep"
        subheading="Variety is only useful while the payload still makes sense."
        items={COHERENCE}
      />

      <CtaBanner
        heading="Serve data worth testing against"
        description="Paste a body, tick what should move, and call the URL from your app."
        href={ctaHref}
      />
    </div>
  );
}
