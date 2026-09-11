import type { Metadata } from "next";
import {
  Boxes,
  CalendarClock,
  Database,
  Pencil,
  Share2,
  ShieldAlert,
  Timer,
} from "lucide-react";
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

const PATH = PAGE_ROUTES.MARKETING.MOCK_API_TOOLS;

const META_DESCRIPTION =
  "Six mock API tools compared by where they run, whether writes persist and what each is best at, plus the one question that decides which kind you need.";

const HERO_DESCRIPTION =
  "Six mock API tools compared by where they run, what it takes to start, and whether a write survives the next request. The choice turns on one question most comparisons skip: does your mock need to remember anything, or does it only need to answer.";

export const metadata: Metadata = buildMetadata({
  title: "Mock API Tools - Six Compared and How to Choose",
  description: META_DESCRIPTION,
  path: PATH,
});

const BREADCRUMB: Crumb[] = [
  { label: "Home", href: PAGE_ROUTES.HOME },
  { label: "Mock API tools" },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      headline: "Mock API tools, and the question that picks one",
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

// Ordered by how much state each one keeps, most first, so the column that actually splits the
// table reads top to bottom. `href` is empty for the last row, which is this site.
const TOOLS: { name: string; href: string; cells: string[] }[] = [
  {
    name: "MockAPI",
    href: "https://mockapi.io",
    cells: [
      "A hosted service",
      "Yes",
      "Yes, into a real data store",
      "A CRUD backend generated from a schema",
    ],
  },
  {
    name: "Beeceptor",
    href: "https://beeceptor.com",
    cells: [
      "Hosted, and as a proxy in front of your own backend",
      "Not to create one, yes to keep it",
      "Yes, a small object store",
      "Watching live traffic and rewriting it",
    ],
  },
  {
    name: "Mockoon",
    href: "https://mockoon.com",
    cells: [
      "Your own machine, as a desktop app or a CLI",
      "No",
      "Yes, until the process stops",
      "Working offline, and running a mock inside CI",
    ],
  },
  {
    name: "Postman mock server",
    href: "https://learning.postman.com/docs/design-apis/mock-apis/set-up-mock-servers/",
    cells: [
      "Hosted, inside a Postman workspace",
      "Yes",
      "No, it replays saved examples",
      "Teams already running their contracts through Postman",
    ],
  },
  {
    name: "Mocky",
    href: "https://designer.mocky.io",
    cells: [
      "A hosted service",
      "No",
      "No, the body is fixed to the URL",
      "One response, written once and linked forever",
    ],
  },
  {
    name: SITE.name,
    href: "",
    cells: [
      "A hosted service",
      "No, a trial sandbox runs without one",
      "No, every call sees the body you wrote",
      "Several endpoints answering one shape differently",
    ],
  },
];

const CHECKLIST: Feature[] = [
  {
    icon: Database,
    title: "Whether a write has to stick",
    description:
      "This is the first question and it decides most of the rest. A cart, a signup wizard or an optimistic update followed by a refetch needs state. A list, a detail page and an error banner do not.",
  },
  {
    icon: ShieldAlert,
    title: "Whether you choose the status code",
    description:
      "An error branch is only tested when something returns an error on demand, repeatably, on the route your screen actually calls. Some tools treat this as a rule to configure, others do not offer it at all.",
  },
  {
    icon: Timer,
    title: "Whether you choose the delay",
    description:
      "Skeletons, spinners and timeout branches run only when a response is slow. A mock that answers in four milliseconds hides every one of them until someone on a train finds them for you.",
  },
  {
    icon: Share2,
    title: "Who else can reach the URL",
    description:
      "A mock on your laptop cannot be opened by a designer checking a state, a tester reproducing a bug, or a CI runner on another machine. A hosted URL can be pasted into a ticket. That is a different job.",
  },
  {
    icon: CalendarClock,
    title: "How long the URL survives",
    description:
      "Free tiers sweep. Some expire an unclaimed endpoint within days, some expire it after months, and some keep it until you delete it. Find out before the URL is in a ticket rather than after.",
  },
  {
    icon: Pencil,
    title: "What it costs to change the response",
    description:
      "Some mocks are edited in place, so the URL in your app never moves. Others are immutable, so a changed body means a new URL and a code change every time the shape shifts.",
  },
];

const DRIFT = `# first run: the fixture has three orders
curl -s https://your-mock.example/orders | jq length
3

# the test under way posts one
curl -s -X POST https://your-mock.example/orders -d '{"total": 10}'

# second run, same test, same assertion, different answer
curl -s https://your-mock.example/orders | jq length
4`;

export default async function MockApiToolsPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN;

  return (
    <div className="relative font-sans flex flex-col items-center py-12">
      <JsonLd data={STRUCTURED_DATA} />

      <div className="w-full max-w-5xl px-4 sm:px-6 mb-4 mt-[-2rem]">
        <Breadcrumb items={BREADCRUMB} />
      </div>

      <MarketingHero
        badge="Mock API tools"
        badgeIcon={Boxes}
        heading={
          <>
            Mock API tools, and{" "}
            <span className="bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              the question that picks one
            </span>
          </>
        }
        description={HERO_DESCRIPTION}
      />

      <section className="mt-20 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          Does your mock need to remember anything?
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Every comparison of these tools opens with features and prices, and both are the wrong
          place to start. The axis that actually separates them is whether a request can change what
          the next request sees. A mock with state has a database behind it. A mock without state has
          a body you wrote, returned as often as you ask for it.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          You need state when the flow you are building is about the change itself. A cart that has
          to hold what you added to it, a signup wizard whose second step depends on the first, an
          optimistic update that has to survive the refetch behind it. Nothing stateless will show
          you whether those work, and no amount of careful fixture writing substitutes.
        </p>
        <p className="text-gray-600 leading-relaxed">
          You do not need state for most of the rest, and most of the rest is most of the work. A
          list, a detail view, an empty state, a permission error, a slow response, a row long enough
          to wrap. Each of those is one request with one answer, and a tool that keeps a database for
          them is charging you for a feature that is going to get in your way.
        </p>
      </section>

      <section className="mt-16 w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Six mock API tools, side by side</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          Ordered by how much each one remembers, most at the top. They are not ranked, because the
          top half and the bottom half are not doing the same job. Free tiers and feature lists move,
          so check the service before you depend on it.
        </p>
        <ComparisonTable
          caption="Six mock API tools, compared by where they run, whether an account is needed to start, whether writes persist and what each is best at"
          columns={["Tool", "Where it runs", "Account to start", "Writes that stick", "Best at"]}
          rows={TOOLS.map(({ name, href, cells }) => [
            href ? (
              <TextLink key={name} href={href} className="text-blue-600 hover:underline" external>
                {name}
              </TextLink>
            ) : (
              name
            ),
            ...cells,
          ])}
        />
        <p className="text-gray-600 leading-relaxed mt-6">
          The fourth column is the one to read first, and the bottom three rows all answer it the
          same way. None of them keep a write, which sounds like a missing feature until you notice
          what it buys: the endpoint returns exactly what you wrote, on the tenth call and on the
          thousandth, no matter what ran against it in between.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">What a stateful mock costs</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          A generated CRUD backend is genuinely impressive the first afternoon. You describe a
          resource, pick a generator for each field, and a full set of REST routes appears with a
          hundred rows behind them. The cost arrives on the second day, and it arrives as drift.
        </p>
        <CodeBlock lang="bash">{DRIFT}</CodeBlock>
        <p className="text-gray-600 leading-relaxed mt-6 mb-4">
          A test that writes has changed the data the next test reads. That is the same problem a
          real database gives you, which is fair, because you are now running one. The fix is the
          same too: a reset step before each run, seed data kept somewhere it can be restored from,
          and an agreement that nobody edits the shared mock by hand while a suite is running.
        </p>
        <p className="text-gray-600 leading-relaxed">
          There is a smaller cost beside it. A schema has to be described before it can serve
          anything, so the shape lives in the tool rather than in your repository, and it has to be
          updated in both places every time the API changes. When your flow needs state, all of that
          is worth paying. When it does not, you have bought a database to render a table.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">What a stateless mock buys</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          A stateless endpoint is a written down fact. It does not drift, so a screenshot taken today
          and a test run next month disagree only if somebody edited it on purpose. Nothing has to be
          reset between runs, because nothing changed.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          It also changes how you handle the awkward states. Instead of one endpoint you keep editing
          to reproduce an empty list, then a 500, then a slow response, you point three paths at the
          same shape and leave all three alive. Switching between them costs a base URL change rather
          than a code change, and the 500 is still sitting there next week when somebody asks whether
          the error banner still works.
        </p>
        <p className="text-gray-600 leading-relaxed">
          What you put in those bodies decides whether any of this is worth doing.{" "}
          <TextLink href={PAGE_ROUTES.MARKETING.MOCK_DATA} className="text-blue-600 hover:underline">
            Mock data
          </TextLink>{" "}
          covers the values that find bugs rather than hiding them, which is the difference between a
          mock that proves a fetch worked and one that proves a screen works.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">The column nobody checks</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Free tiers sweep, and the retention rule is usually a line on a pricing page rather than
          anything the product tells you while you work. Beeceptor keeps an unclaimed endpoint for
          seven days and a claimed one for ninety on its free plan. Mockoon lives exactly as long as
          the process you started. A mock URL you pasted into a ticket in March is a link somebody
          will click in June, and a dead one sends them to you instead of to the answer.
        </p>
        <p className="text-gray-600 leading-relaxed">
          The related question is what it costs to change a response once the URL exists. An
          immutable mock means a new URL and a code change every time the shape shifts, which is fine
          for a one off and painful for a screen still being designed. Before you reach for any tool
          on this page,{" "}
          <TextLink
            href={PAGE_ROUTES.MARKETING.FREE_API_FOR_TESTING}
            className="text-blue-600 hover:underline"
          >
            free APIs for testing
          </TextLink>{" "}
          covers the public datasets that need no setup at all, and how far they take you.
        </p>
      </section>

      <FeatureGrid
        heading="What to check before you commit to one"
        subheading="Six questions, in the order they usually start to matter."
        items={CHECKLIST}
      />

      <CtaBanner
        heading="Write the response, take the URL"
        description="No schema to describe and no process to keep running. Paste a body and call it over HTTPS."
        href={ctaHref}
      />
    </div>
  );
}
