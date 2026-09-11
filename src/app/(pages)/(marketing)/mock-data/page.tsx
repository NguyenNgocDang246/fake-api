import type { Metadata } from "next";
import { Database, Wand2, ListOrdered, CircleSlash, Blocks, Ruler, Shuffle } from "lucide-react";
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

const PATH = PAGE_ROUTES.MARKETING.MOCK_DATA;

const META_DESCRIPTION =
  "Mock data that finds bugs instead of hiding them: where a mock belongs, which values actually break a UI, and the four JSON pitfalls nobody warns you about.";

const HERO_DESCRIPTION =
  "Generating the endpoint takes a minute. Deciding what it returns is what determines whether your screen survives its first real row. Here is where a mock belongs, what to put in it, and the values that find bugs instead of hiding them.";

export const metadata: Metadata = buildMetadata({
  title: "Mock Data - Build Test Data That Finds Bugs",
  description: META_DESCRIPTION,
  path: PATH,
});

const BREADCRUMB: Crumb[] = [{ label: "Home", href: PAGE_ROUTES.HOME }, { label: "Mock data" }];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      headline: "Mock data that finds bugs instead of hiding them",
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

// Ordered so the four that live in the repo sit together, then the two behind a URL.
const MOCK_APPROACHES = [
  {
    name: "Hand written fixture",
    cells: [
      "A file in your repo",
      "Only people with the repo",
      "Never, it is the same every run",
      "A snapshot test that must not move",
    ],
  },
  {
    name: "Faker in your test setup",
    cells: [
      "Your build or test process",
      "Only people with the repo",
      "Every run, unless you pin a seed",
      "Generating data inside a test run",
    ],
  },
  {
    name: "MSW",
    cells: [
      "In your repo, as code",
      "Whoever runs the project",
      "Only if your handler makes it",
      "Mocks versioned with the code, and per test overrides",
    ],
  },
  {
    name: "json-server",
    cells: [
      "In your repo, as a JSON file",
      "Your machine only",
      "No, it serves the file",
      "A full REST shape with writes that stick for the session",
    ],
  },
  {
    name: "Postman mock server",
    cells: [
      "In a Postman collection",
      "Your Postman team",
      "Only from saved examples",
      "Teams already running their contracts through Postman",
    ],
  },
  {
    name: SITE.name,
    cells: [
      "Behind an HTTPS URL",
      "Anyone holding the URL",
      "Every request, if you ask it to",
      "Sharing one state with a designer, a tester or a CI job",
    ],
  },
];

const PRINCIPLES: Feature[] = [
  {
    icon: Wand2,
    title: "Values that belong together",
    description:
      "An email, username and phone that match the name beside them, and a city that sits in the right country. Independently random fields read as noise, and nobody can tell a rendering bug from noise.",
  },
  {
    icon: ListOrdered,
    title: "Totals that add up",
    description:
      "A sum that matches the lines above it, and a delivery date that falls after the order date. A screen doing its own arithmetic should never disagree with the payload it was handed.",
  },
  {
    icon: Shuffle,
    title: "Widths that disagree",
    description:
      "Names of different lengths, emails that are not all the same domain, prices that are not all round. A column only wraps when something in it is long enough to wrap.",
  },
  {
    icon: Blocks,
    title: "Lists of a different length",
    description:
      "A count that moves between calls is what exercises a table's pagination, its overflow and its sticky header. A list fixed at three items exercises none of them.",
  },
  {
    icon: CircleSlash,
    title: "Empty where empty is correct",
    description:
      "A value that only makes sense sometimes should be absent the rest of the time, such as a shipping date on an order that has not shipped. That is the branch your optional chaining is for.",
  },
  {
    icon: Ruler,
    title: "Enough of it to fill a screen",
    description:
      "A sample of one row proves the fetch worked. A page of results is what shows you the layout, and the two tell you completely different things about the same component.",
  },
];

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

const ROUNDING = `// the id you put in the mock
{ "id": 9007199254740993 }

// the id your component compares against, after JSON.parse
{ "id": 9007199254740992 }`;

const MAX_SAFE_INTEGER_LABEL = Number.MAX_SAFE_INTEGER.toLocaleString("en-US");

export default async function MockDataPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN;

  return (
    <div className="relative font-sans flex flex-col items-center py-12">
      <JsonLd data={STRUCTURED_DATA} />

      <div className="w-full max-w-5xl px-4 sm:px-6 mb-4 mt-[-2rem]">
        <Breadcrumb items={BREADCRUMB} />
      </div>

      <MarketingHero
        badge="Mock data"
        badgeIcon={Database}
        heading={
          <>
            Mock data that{" "}
            <span className="bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              finds bugs instead of hiding them
            </span>
          </>
        }
        description={HERO_DESCRIPTION}
      />

      <section className="mt-20 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Why a mock has to be a server</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Most frontend teams reach for one of three things while the API is still being written.
          They hardcode a fixture into the component, they stand up a small Express or json-server
          process, or they intercept requests in the client with a library. Each one works, and each
          one carries the same cost: the mock lives inside the codebase, so it has to be written,
          reviewed, merged, and eventually removed.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          That cost is paid again every time the shape of the response changes. It is also paid by
          the next person, who finds a fixture file and cannot tell whether it still matches
          production. Mocks that live in the repository tend to rot quietly, and the rot only shows
          up when someone trusts them.
        </p>
        <p className="text-gray-600 leading-relaxed">
          The fixture carries a second problem that is easier to miss. Importing a JSON file into a
          component gets data on the screen, but it skips everything that makes a network call a
          network call. There is no loading state, because the data is already there. There is no
          error branch, because an import cannot fail at runtime. There is no race, no abort, no
          stale response arriving after the user has navigated away. Those are precisely the paths
          that break in production, and a mock served over HTTP puts every one of them back in play.
        </p>
      </section>

      <section className="mt-16 w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Where the mock lives</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          These are the six places a mock usually ends up, and they are not ranked. A fixture is the
          right answer for a snapshot test,{" "}
          <TextLink href="https://fakerjs.dev" className="text-blue-600 hover:underline" external>
            Faker
          </TextLink>{" "}
          is the right answer when the data has to be generated inside a test run, and{" "}
          <TextLink href="https://mswjs.io" className="text-blue-600 hover:underline" external>
            Mock Service Worker
          </TextLink>{" "}
          is the strongest choice when the mock belongs to the test suite, because the handlers are
          code you can override inside a single test and review in the same pull request as the
          feature. What separates them is where the data comes from and who else can see it.
        </p>
        <ComparisonTable
          caption="Six ways to mock an API, compared by where the mock lives, who can reach it, whether it varies per call and what each is best at"
          columns={["Approach", "Where it lives", "Who can reach it", "Varies per call", "Best at"]}
          rows={MOCK_APPROACHES.map(({ name, cells }) => [name, ...cells])}
        />
        <p className="text-gray-600 leading-relaxed mt-6">
          The bottom row is the one that changes who the data is for. Everything above it lives
          inside the project, so a designer checking a state, a QA engineer reproducing a bug, or a
          CI job on another machine cannot reach it without running your code. A URL can be pasted
          into a ticket. That is the whole of the difference, and it is why the two halves of this
          table are not really competing.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Tidy mock data hides the bugs</h2>
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

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          The JSON pitfalls nobody warns you about
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Four things go wrong when JSON travels over HTTP, and all four are invisible until they are
          expensive. The first is the long id from the list above. JavaScript holds numbers as
          doubles, so any integer past {MAX_SAFE_INTEGER_LABEL} loses precision the moment it passes
          through{" "}
          <TextLink
            href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse"
            className="text-blue-600 hover:underline"
            external
          >
            JSON.parse
          </TextLink>
          . Snowflake ids and database bigints land squarely in that range, and the symptom is not an
          error, it is two different records comparing as equal.
        </p>
        <CodeBlock lang="json">{ROUNDING}</CodeBlock>
        <p className="text-gray-600 leading-relaxed mt-6 mb-4">
          The second is key order. It carries no meaning in the JSON spec, but a JavaScript object
          reorders integer-like keys ahead of the rest, so a body keyed by id can come back in an
          order nobody wrote. If anything downstream hashes or diffs the raw response, that
          reordering is a silent mismatch. Any tool that round-trips your mock through a parser
          before sending it will do this to you.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          The third is null against absent. A key holding null and a key that is not there at all are
          different states, and they reach your component differently: one overwrites a default, the
          other lets it stand. Mock data that never sends an explicit null cannot tell you which
          branch you wrote.
        </p>
        <p className="text-gray-600 leading-relaxed">
          The fourth is the charset. A response served without a utf-8 charset can mangle accented
          characters and emoji on the way to a client that guesses wrong, which is why the Japanese
          string in the sample above is worth keeping in your test data. All four are decided on the
          wire rather than in your component, so whatever serves your mock has to get them right
          before your test data can mean anything.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          How many rows, and how many endpoints
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          A list of three proves a fetch works and nothing else. The interesting counts are zero, one
          and more than fits. Zero is the empty state, which is usually the least designed screen in
          any product. One is the layout that looks broken because a grid built for a dozen cards is
          holding a single one. More than fits is where pagination, virtualisation, sticky headers
          and overflow all get their first real test.
        </p>
        <p className="text-gray-600 leading-relaxed">
          The practical move is to keep all three alive at once rather than editing one dataset back
          and forth, and that is really a question about endpoints rather than rows. Point three
          paths at the same shape with different contents and switching between them costs a base URL
          change instead of a code change. Do the same for the unhappy paths and a 404, a 500 and a
          deliberately slow response stop being things you simulate by hand.
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
          What separates useful variation from noise is that the relationships survive it. The shape
          stays fixed. The fields that move are the ones whose value genuinely differs row to row,
          and the ones that depend on each other move together: the email follows the name, the city
          follows the country, the total follows the lines.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Variation is also not always what you want. A snapshot test and a demo script both need the
          same answer every time, so whatever produces your data should be able to sit still on
          request. Data that changes when you did not ask it to is its own kind of bug.
        </p>
      </section>

      <FeatureGrid
        heading="What mock data has to get right"
        subheading="Variety is only useful while the payload still makes sense."
        items={PRINCIPLES}
      />

      <CtaBanner
        heading="Put it behind a URL"
        description="Write the response you actually want and call it over HTTPS a minute later."
        href={ctaHref}
      />
    </div>
  );
}
