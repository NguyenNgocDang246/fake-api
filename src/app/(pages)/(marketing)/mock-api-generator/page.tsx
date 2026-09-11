import type { Metadata } from "next";
import { Rocket, Terminal, GitBranch, Users, Timer, Wrench, ServerCog } from "lucide-react";
import { JsonLd } from "@/app/components/JsonLd";
import { ComparisonTable } from "@/app/components/Marketing/ComparisonTable";
import { CtaBanner } from "@/app/components/Marketing/CtaBanner";
import { FeatureGrid, type Feature } from "@/app/components/Marketing/FeatureGrid";
import { MarketingHero } from "@/app/components/Marketing/MarketingHero";
import { StepsRow, type Step } from "@/app/components/Marketing/StepsRow";
import { CodeBlock } from "@/app/components/Code/CodeBlock";
import { Breadcrumb } from "@/app/components/Link/Breadcrumb";
import { TextLink } from "@/app/components/Link/TextLink";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { SITE, absoluteUrl, breadcrumbSchema, buildMetadata, type Crumb } from "@/app/libs/seo";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";
import { ROLE_LIMITS } from "@/server/core/role_limits";
import { MAX_DELAY_MS, MAX_PATH_LENGTH } from "@/models/endpoint/primitives.model";

const PATH = PAGE_ROUTES.MARKETING.MOCK_API_GENERATOR;

const META_DESCRIPTION =
  "A mock API generator for frontend developers. Define REST endpoints in the browser, set the status code and delay, and get a public HTTPS URL straight back.";

const HERO_DESCRIPTION =
  "A mock API generator for frontend developers. Define REST endpoints in the browser, get a public URL immediately, and skip writing an Express server just to unblock the UI.";

export const metadata: Metadata = buildMetadata({
  title: "Mock API Generator - Create Free REST API Endpoints",
  description: META_DESCRIPTION,
  path: PATH,
});

const USER_LIMITS = ROLE_LIMITS.USER;

const BREADCRUMB: Crumb[] = [
  { label: "Home", href: PAGE_ROUTES.HOME },
  { label: "Mock API generator" },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Mock API Generator",
      description: META_DESCRIPTION,
      url: absoluteUrl(PATH),
      inLanguage: "en",
      isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
    },
    breadcrumbSchema(BREADCRUMB, PATH),
  ],
};

const AGAINST_A_REAL_SERVER: Feature[] = [
  {
    icon: Terminal,
    title: "No project to scaffold",
    description:
      "No npm init, no framework choice, no dependency tree to keep patched. The generator is a form, and the endpoint exists the moment you save it.",
  },
  {
    icon: ServerCog,
    title: "No host to pay for",
    description:
      "A throwaway mock server still needs somewhere to run. Endpoints here answer from the same URL whether you are on your laptop or in CI.",
  },
  {
    icon: GitBranch,
    title: "Nothing to merge",
    description:
      "Mock handlers committed into the app tend to outlive the sprint and drift from the real contract. Nothing here touches your repository.",
  },
  {
    icon: Users,
    title: "Shareable with the team",
    description:
      "A local server on port 3001 helps one person. A generated URL can be pasted into a ticket, a Postman collection, or a designer's browser.",
  },
  {
    icon: Timer,
    title: "Latency you can dial in",
    description: `Set a delay per endpoint, anywhere from 0 to ${MAX_DELAY_MS.toLocaleString("en-US")} ms, and your spinners and timeout branches finally get exercised.`,
  },
  {
    icon: Wrench,
    title: "Failure states on demand",
    description:
      "Give an endpoint a 401, a 429, or a 500 and leave it that way. Reproducing an error path stops being a code change.",
  },
];

const GENERATOR_STEPS: Step[] = [
  {
    step: "1",
    title: "Describe the endpoint",
    description: `Pick a method, type a path up to ${MAX_PATH_LENGTH} characters, and paste the JSON body you want back.`,
  },
  {
    step: "2",
    title: "Set the edge cases",
    description: "Choose the status code and a delay, so the slow path and the error path exist too.",
  },
  {
    step: "3",
    title: "Copy the URL",
    description: "Every endpoint carries a public URL. Point fetch, axios, or your test suite at it.",
  },
];

// Ordered so the two in-repo approaches sit together, then the two hosted ones.
const STRATEGIES = [
  {
    name: "MSW",
    cells: [
      "In your repo, as code",
      "Whoever runs the project",
      "No, it intercepts in the app",
      "Mocks versioned with the code, and per test overrides",
    ],
  },
  {
    name: "json-server",
    cells: [
      "In your repo, as a JSON file",
      "Your machine only",
      "Yes, a local process",
      "A full REST shape with writes that stick for the session",
    ],
  },
  {
    name: "Postman mock server",
    cells: [
      "In a Postman collection",
      "Your Postman team",
      "No, it is hosted",
      "Teams already running their contracts through Postman",
    ],
  },
  {
    name: "A generated endpoint",
    cells: [
      "Outside the repo, behind a URL",
      "Anyone holding the URL",
      "No, it is hosted",
      "Sharing a state with a designer, a tester or a CI job",
    ],
  },
];

const EXAMPLE = `GET  /api/orders          200   list of 20 orders
GET  /api/orders/1        200   one order
POST /api/orders          201   the created order
GET  /api/orders/9999     404   { "message": "Not found" }
GET  /api/orders/slow     200   same list, 3000 ms delay`;

export default async function MockApiGeneratorPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN;

  return (
    <div className="relative font-sans flex flex-col items-center py-12">
      <JsonLd data={STRUCTURED_DATA} />

      <div className="w-full max-w-5xl px-4 sm:px-6 mb-4 mt-[-2rem]">
        <Breadcrumb items={BREADCRUMB} />
      </div>

      <MarketingHero
        badge="Mock API generator"
        badgeIcon={Rocket}
        heading={
          <>
            A mock API generator for{" "}
            <span className="bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              the backend that does not exist yet
            </span>
          </>
        }
        description={HERO_DESCRIPTION}
        primaryHref={ctaHref}
        secondaryHref={PAGE_ROUTES.DOCS}
        secondaryLabel="Read the docs"
      />

      <section className="mt-20 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          The problem with mocking inside the app
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Most frontend teams reach for one of three things while the API is still being written.
          They hardcode a fixture into the component, they stand up a small Express or json-server
          process, or they intercept requests in the client with a library. Each one works, and each
          one has the same problem: the mock lives inside the codebase, so it has to be written,
          reviewed, merged, and eventually removed.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          That cost is paid again every time the shape of the response changes. It is also paid by
          the next person, who finds a fixture file and cannot tell whether it still matches
          production. Mocks that live in the repository tend to rot quietly, and the rot only shows
          up when someone trusts them.
        </p>
        <p className="text-gray-600 leading-relaxed">
          A generated API moves the mock out of the codebase. The app only ever knows a base URL.
          The response, the status code, and the delay are edited in a form and take effect on the
          next request, with no rebuild and no redeploy on either side.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">A realistic set of endpoints</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          A screen usually needs more than one happy path. Grouping the endpoints for one feature
          means you can build the empty state, the error state, and the slow state without touching
          the component under test.
        </p>
        <CodeBlock lang="endpoints">{EXAMPLE}</CodeBlock>
        <p className="text-gray-600 leading-relaxed mt-6">
          On a free account you can keep {USER_LIMITS.maxProjects} projects, each holding{" "}
          {USER_LIMITS.maxGroupsPerProject} endpoint groups of up to{" "}
          {USER_LIMITS.maxEndpointsPerGroup} endpoints, which is room for several features at once
          without any of them colliding. Every one of those responses is a body you write yourself,
          covered in more detail on the{" "}
          <TextLink
            href={PAGE_ROUTES.MARKETING.FAKE_JSON_API}
            className="text-blue-600 hover:underline"
          >
            fake JSON API
          </TextLink>{" "}
          page.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          An online mock server with nothing to install
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          The generator runs in the browser, so there is no CLI to install, no SDK to add to your
          package.json, and no process sitting on a port while you work. You fill in a form and the
          endpoint answers over HTTPS before you have switched back to your editor.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          That is also what makes it shareable. An online mock server has one address, so the same
          URL works for the person building the screen, the designer checking a state, and the CI
          job running the suite. Nobody clones anything, and nobody has to be told which port you
          used.
        </p>
        <p className="text-gray-600 leading-relaxed">
          What it deliberately does not do is keep state. A POST does not change what a later GET
          returns, because the point is a predictable response, not a second database. The{" "}
          <TextLink href={PAGE_ROUTES.MARKETING.FAQ} className="text-blue-600 hover:underline">
            FAQ
          </TextLink>{" "}
          goes through the rest of the limits.
        </p>
      </section>

      <section className="mt-16 w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          MSW, json-server, Postman, or a hosted URL
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          These are the four options most teams weigh, and a generated endpoint is not the right
          answer to all of them.{" "}
          <TextLink href="https://mswjs.io" className="text-blue-600 hover:underline" external>
            Mock Service Worker
          </TextLink>{" "}
          is the strongest choice when the mock belongs to the test suite. It intercepts at the
          network layer, so your app code is untouched, and because the handlers are code you can
          override one response inside a single test, run the whole thing offline, and review changes
          to the mock in the same pull request as the feature. Nothing hosted can match that.
        </p>
        <p className="text-gray-600 leading-relaxed mb-6">
          The trade is that the mock is now code in your repository, with everything that implies:
          it has to be written, reviewed, merged, kept in step with the real contract, and eventually
          deleted. And it only exists where the project runs, so a designer checking a state or a
          product manager reproducing a bug is out of reach.
        </p>
        <ComparisonTable
          caption="Four mocking approaches compared by where the mock lives, who can call it, whether a process must run, and what each is best at"
          columns={["Approach", "Where the mock lives", "Who can call it", "Needs a process", "Best at"]}
          rows={STRATEGIES.map(({ name, cells }) => [name, ...cells])}
        />
        <p className="text-gray-600 leading-relaxed mt-6">
          They are also not exclusive. A common split is MSW for unit and component tests, where
          determinism and per test control matter most, and a hosted endpoint for the shared states
          everyone else needs to look at. If you are still deciding whether you need a mock at all,{" "}
          <TextLink
            href={PAGE_ROUTES.MARKETING.FREE_API_FOR_TESTING}
            className="text-blue-600 hover:underline"
          >
            free APIs for testing
          </TextLink>{" "}
          compares the public services that need no setup whatsoever.
        </p>
      </section>

      <StepsRow heading="How the generator works" items={GENERATOR_STEPS} />

      <FeatureGrid
        heading="Compared with running your own mock server"
        subheading="The same job, minus the parts that outlive the sprint."
        items={AGAINST_A_REAL_SERVER}
      />

      <CtaBanner
        heading="Generate your first endpoint"
        description="Create a project, define one endpoint, and call it from your app in under a minute."
        href={ctaHref}
      />
    </div>
  );
}
