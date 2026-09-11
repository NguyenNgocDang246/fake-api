import type { Metadata } from "next";
import {
  ArrowLeftRight,
  BugOff,
  CheckCheck,
  Keyboard,
  Laptop,
  LoaderCircle,
  MessageCircleQuestion,
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

const PATH = PAGE_ROUTES.MARKETING.RACE_CONDITION;

const META_DESCRIPTION =
  "A frontend race condition is a response arriving after a newer one and winning the render. Why throttling cannot reproduce it, and how to force the inversion.";

const HERO_DESCRIPTION =
  "JavaScript is single threaded, so the race is not between threads. It is between requests already in flight, and the one that arrives last wins the render even when it was asked for first. Here is the timeline that causes it, why network throttling cannot reproduce it, and what each fix actually guarantees.";

export const metadata: Metadata = buildMetadata({
  title: "Race Condition - Why a Stale Response Wins the Render",
  description: META_DESCRIPTION,
  path: PATH,
});

const BREADCRUMB: Crumb[] = [
  { label: "Home", href: PAGE_ROUTES.HOME },
  { label: "Race condition" },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      headline: "A frontend race condition is the response that arrives last",
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

// Ordered by how far the delay reaches, nearest to the one browser first.
const REPRODUCTIONS = [
  {
    name: "DevTools throttling",
    cells: [
      "All of them, by the same factor",
      "No, it moves with the network",
      "No, one browser on one machine",
      "Seeing a slow app, which is a different bug",
    ],
  },
  {
    name: "A setTimeout in your own code",
    cells: [
      "Whichever call you edited",
      "Yes",
      "No, and it ships if you forget to remove it",
      "A one off check while you are already in the file",
    ],
  },
  {
    name: "A local mock server",
    cells: [
      "Any route you give a delay",
      "Yes",
      "Only whoever runs the process",
      "A team already keeping one running",
    ],
  },
  {
    name: "MSW",
    cells: [
      "Any handler you add a delay to",
      "Yes",
      "Whoever runs the project",
      "An inversion asserted inside the test suite",
    ],
  },
  {
    name: SITE.name,
    cells: [
      "Each endpoint carries its own",
      "Yes",
      "Yes, over HTTPS",
      "The same inversion from a browser, a CI job and a teammate",
    ],
  },
];

const WHY_HARD: Feature[] = [
  {
    icon: Laptop,
    title: "It cannot happen on your machine",
    description:
      "Localhost latency is a millisecond or two and it is the same for every route. The inversion needs one response to overtake another, and nothing on your desk is uneven enough to produce one.",
  },
  {
    icon: BugOff,
    title: "It raises nothing",
    description:
      "No exception, no rejected promise, no entry in any log. Both requests succeeded. The only evidence is a screen showing data that does not match what the user last asked for.",
  },
  {
    icon: MessageCircleQuestion,
    title: "The report is unusable",
    description:
      "It reaches you as sometimes the search shows the wrong results. Nobody can say which keystrokes produced it, because the cause is a difference in timing that the person never saw.",
  },
  {
    icon: LoaderCircle,
    title: "The loading flag lies",
    description:
      "With two requests in flight, whichever finishes first clears the spinner. The interface says it is done while the newer request is still running, so the later overwrite looks like a fresh render.",
  },
  {
    icon: Keyboard,
    title: "Typing multiplies it",
    description:
      "A request per keystroke means six in flight for a six letter query, and each one is a chance to land out of order. Debouncing narrows the window without ever closing it.",
  },
  {
    icon: CheckCheck,
    title: "The fix looks finished",
    description:
      "Cleanup written, review passed, ticket closed. Whether it actually runs on the path that matters is a question nobody can answer without making the slow response arrive last on purpose.",
  },
];

const TIMELINE = `useEffect(() => {
  fetch(\`/api/search?q=\${query}\`)
    .then((res) => res.json())
    .then(setResults)          // whichever lands last wins
}, [query])

// t=0     user types "ab"     request A is sent
// t=40    user types "abc"    request B is sent
// t=120   B lands             results for "abc" are rendered
// t=900   A lands             results for "ab" are rendered, and the
//                             search box still reads "abc"`;

const FIXES = `// stops the write. The request still runs to completion.
useEffect(() => {
  let cancelled = false
  fetch(url)
    .then((res) => res.json())
    .then((data) => { if (!cancelled) setResults(data) })
  return () => { cancelled = true }
}, [query])

// stops the request. Your catch now receives an AbortError that is not
// a failure and must not be rendered as one.
useEffect(() => {
  const controller = new AbortController()
  fetch(url, { signal: controller.signal })
    .then((res) => res.json())
    .then(setResults)
    .catch((err) => { if (err.name !== "AbortError") setError(err) })
  return () => controller.abort()
}, [query])`;

export default async function RaceConditionPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN;

  return (
    <div className="relative font-sans flex flex-col items-center py-12">
      <JsonLd data={STRUCTURED_DATA} />

      <div className="w-full max-w-5xl px-4 sm:px-6 mb-4 mt-[-2rem]">
        <Breadcrumb items={BREADCRUMB} />
      </div>

      <MarketingHero
        badge="Race condition"
        badgeIcon={ArrowLeftRight}
        heading={
          <>
            Race condition:{" "}
            <span className="bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              the response that arrives last wins
            </span>
          </>
        }
        description={HERO_DESCRIPTION}
      />

      <section className="mt-20 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">This is not a threading problem</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          JavaScript runs your code on one thread, which is the reason most frontend developers
          assume races belong to whoever writes the backend. Two callbacks never execute at the same
          instant, so nothing can be interrupted halfway through. All of that is true, and none of it
          helps.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          The race is not between threads. It is between requests that are already in flight. You
          started two, the network is under no obligation to answer them in the order you asked, and
          each answer runs its own handler when it arrives. The handler that runs last writes to
          state last, and that is the state the user sees. Ordering by when you sent the requests and
          ordering by when the answers come back are two different orderings, and only the second one
          decides what is on screen.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Nothing here is broken in a way a runtime can notice. Both requests were valid, both
          responses were correct answers to the questions they were given, and both handlers did
          exactly what they were written to do. The defect exists only in the relationship between
          them, which is why no tool watching either one on its own will ever point at it.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">The timeline that produces it</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          The shortest example is a search box that fetches on every change. Read the timestamps
          rather than the code, because the code is correct in isolation and wrong in sequence.
        </p>
        <CodeBlock lang="js">{TIMELINE}</CodeBlock>
        <p className="text-gray-600 leading-relaxed mt-6">
          Nine hundred milliseconds is not an exotic number. It is a cold serverless function, a
          query that missed an index, a corporate VPN, or a phone moving between cells. The second
          request being faster is not a freak event either, because the two requests are not the same
          work: a narrower query often has less to do. The bug is not that the network misbehaved, it
          is that the code assumed an order nobody promised.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Three shapes it takes</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          The search box is the one everybody recognises, and it is the least damaging of the three
          because the user is still looking at the field and can retype. The second shape is
          navigation. A request starts on one screen, the user moves to another before it lands, and
          the handler writes data belonging to a page nobody is on any more. In a list and detail
          layout this reads as clicking one row and being shown another.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          The third is a write followed by a read. You submit a change and refetch the list to pick
          it up, while a refetch triggered slightly earlier is still travelling. The older answer
          lands second, the change vanishes from the screen, and the user submits it again. This one
          is the most expensive, because the data really did save and the interface is arguing with
          the truth.
        </p>
        <p className="text-gray-600 leading-relaxed">
          All three are the same defect wearing different clothes, and all three are invisible in
          development for the same reason.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Why throttling does not reproduce it</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          The instinct is to open the network panel and pick a slow profile. It does not work, and
          the reason is worth stating plainly: throttling slows every request by roughly the same
          factor. If A took 900 ms and B took 120 ms, a profile that triples both leaves A at 2700
          and B at 360. B still wins. The relative order is exactly what throttling preserves, and
          the relative order is the entire bug.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          What you need is the opposite of uniform. One route has to be slow while another stays
          fast, on demand, the same way every run. That is a property of the thing answering the
          calls, not of the connection between you and it, and no setting in a browser can supply it.
        </p>
        <p className="text-gray-600 leading-relaxed">
          This is the quiet reason race conditions survive review. The fix is a few lines and every
          developer can write it. Confirming that the few lines run on the path that matters requires
          making the slow answer arrive last on purpose, and most teams have no way to do that, so
          the cleanup gets written, approved, and never once exercised.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          The fixes, and what each one guarantees
        </h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          Two of them look interchangeable and are not. One prevents the stale write. The other
          prevents the stale request. Knowing which you chose matters the moment something else
          depends on it.
        </p>
        <CodeBlock lang="js">{FIXES}</CodeBlock>
        <p className="text-gray-600 leading-relaxed mt-6 mb-4">
          The flag is the smaller change and it is enough to fix what the user sees. The request
          still travels, the server still does the work, and on a list where every keystroke fires
          one you are paying for answers you have already decided to throw away.{" "}
          <TextLink
            href="https://developer.mozilla.org/en-US/docs/Web/API/AbortController"
            className="text-blue-600 hover:underline"
            external
          >
            AbortController
          </TextLink>{" "}
          stops the request itself, which is the better default, at the cost of one trap: aborting
          rejects the promise, so an error handler that has not been taught to recognise AbortError
          will show a cancellation to the user as a failure.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Beyond those two, a sequence number compared on arrival does the same job when the requests
          are not tied to a component lifecycle, and a query library keyed by the query itself gives
          you the behaviour for free. Every one of these is easy. None of them tells you whether it
          worked.
        </p>
      </section>

      <section className="mt-16 w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Five ways to force the inversion</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          What all of these are trying to buy is one endpoint that answers slowly while another
          answers quickly, repeatably. They differ in how far that arrangement reaches beyond the
          machine it was set up on.
        </p>
        <ComparisonTable
          caption="Five ways to reproduce a frontend race condition, compared by what they slow down, whether the result repeats, who else can reach it, and what each is best at"
          columns={[
            "Approach",
            "What it slows",
            "Same result every run",
            "Reaches teammates and CI",
            "Best at",
          ]}
          rows={REPRODUCTIONS.map(({ name, cells }) => [name, ...cells])}
        />
        <p className="text-gray-600 leading-relaxed mt-6">
          The second column is the one that rules out the first row. Everything below it can make a
          single route slow while its neighbour stays fast, which is the condition the bug needs, and
          the rows then separate on who else can see it. A reproduction only you can run proves the
          fix to you. A reproduction a test runner can execute proves it tomorrow, when somebody
          refactors the hook and quietly removes the cleanup.
        </p>
        <p className="text-gray-600 leading-relaxed mt-4">
          Whatever you point the two calls at, the bodies behind them have to differ enough that you
          can see which one rendered.{" "}
          <TextLink href={PAGE_ROUTES.MARKETING.MOCK_DATA} className="text-blue-600 hover:underline">
            Mock data
          </TextLink>{" "}
          covers making test payloads distinguishable, and{" "}
          <TextLink href={PAGE_ROUTES.MARKETING.CORS_ERROR} className="text-blue-600 hover:underline">
            CORS errors
          </TextLink>{" "}
          are the other failure that gives your error handler nothing to work with.
        </p>
      </section>

      <FeatureGrid
        heading="Why this one survives review"
        subheading="Six reasons a defect this simple reaches production so reliably."
        items={WHY_HARD}
      />

      <CtaBanner
        heading="Make it happen on demand"
        description="Two endpoints, two delays, and the slow answer lands last every single run."
        href={ctaHref}
      />
    </div>
  );
}
