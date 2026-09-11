import type { Metadata } from "next";
import {
  CircleHelp,
  Hand,
  MapPin,
  RotateCw,
  Save,
  TriangleAlert,
  Undo2,
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
import { MAX_STATUS_CODE, MIN_STATUS_CODE } from "@/models/endpoint/primitives.model";

const PATH = PAGE_ROUTES.MARKETING.API_ERROR_HANDLING;

const META_DESCRIPTION =
  "Error is not one state. What 401, 403, 404, 429, 500 and a timeout each ask of a screen, why fetch does not reject on any of them, and how to test every branch.";

const HERO_DESCRIPTION =
  "Most applications have one error screen and six or seven failures that reach it. A 403 and a 500 are not the same event, a timeout may mean the request succeeded, and collapsing all of them into one banner is the bug rather than the handling. Here is what each failure asks of a screen, and how to make each one happen on demand.";

export const metadata: Metadata = buildMetadata({
  title: "API Error Handling - A Different Screen for Every Failure",
  description: META_DESCRIPTION,
  path: PATH,
});

const BREADCRUMB: Crumb[] = [
  { label: "Home", href: PAGE_ROUTES.HOME },
  { label: "API error handling" },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      headline: "Every API failure is a different screen",
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

// Ordered by how much of the real failure each one can stand in for, least first.
const WAYS = [
  {
    name: "Stopping the server",
    cells: [
      "A network failure, and nothing else",
      "No, there is no response",
      "Awkward, and it takes the whole API with it",
      "Checking the offline branch once",
    ],
  },
  {
    name: "Breaking the request",
    cells: [
      "Whatever a bad token or a missing id happens to return",
      "Whatever the real API sends",
      "Fragile, it breaks when the backend changes",
      "A quick look while pointed at a real backend",
    ],
  },
  {
    name: "Blocking it in DevTools",
    cells: [
      "A blocked request, which arrives as a network failure",
      "No",
      "No, one browser",
      "Proving the offline path separately from the server",
    ],
  },
  {
    name: "An interceptor in your client",
    cells: [
      "Any status, written in code",
      "Yes, you compose them",
      "Only where that code is shipped",
      "A unit test that stubs the transport",
    ],
  },
  {
    name: "MSW",
    cells: [
      "Any status",
      "Yes",
      "Yes, it runs in the suite",
      "Assertions living beside the component",
    ],
  },
  {
    name: SITE.name,
    cells: [
      `Any code from ${MIN_STATUS_CODE} to ${MAX_STATUS_CODE}`,
      "Yes, body and response headers",
      "Yes, over HTTPS",
      "One URL per failure, shared with a tester and a CI job",
    ],
  },
];

const QUESTIONS: Feature[] = [
  {
    icon: Hand,
    title: "Can the user do anything",
    description:
      "A 403 is final and a 500 is not. One should stop offering the action at all, the other should offer to try again. A screen that responds to both with the same button teaches people to press it forever.",
  },
  {
    icon: RotateCw,
    title: "Is retrying safe",
    description:
      "GET and PUT can be repeated without consequence. POST cannot. Automatic retry on a method that is not idempotent is how one click becomes two orders, and it is usually added as a reliability improvement.",
  },
  {
    icon: CircleHelp,
    title: "Might it have succeeded",
    description:
      "A timeout tells you the answer never arrived, not that the work never happened. This is the only failure where doing nothing and retrying are both capable of being the wrong move.",
  },
  {
    icon: MapPin,
    title: "Where does the message belong",
    description:
      "A validation failure belongs next to the field that caused it, an expired session belongs over the whole screen, and a background refresh that failed belongs somewhere it will not interrupt anyone.",
  },
  {
    icon: Save,
    title: "What happens to what they typed",
    description:
      "Losing twenty minutes of form input to a failed submit is worse than the failure. The draft has to survive the error, the re-authentication, and the retry that follows both.",
  },
  {
    icon: Undo2,
    title: "Does the message say anything",
    description:
      "Something went wrong tells a user nothing and tells support less. What the user needed, what to do next, and something identifying the request are the parts that turn a report into a fix.",
  },
];

const FETCH_GOTCHA = `// fetch resolves for 404, 403 and 500. Only a network level failure
// rejects, which is why this parses an error body as if it were data.
const res = await fetch(url)
const data = await res.json()

// res.ok is the line between "the server answered" and
// "the server answered badly", and nothing else draws it for you
const res = await fetch(url)
if (!res.ok) {
  throw new HttpError(res.status, await res.text())
}`;

const TIMEOUT = `POST /api/orders               request leaves the browser
                               server creates order 8821
                               the response never arrives
client gives up after 10s      the user is shown a failure

// retrying blind creates a second order
POST /api/orders

// retrying with a key the server remembers does not
POST /api/orders
Idempotency-Key: 4f2c1a9e-...`;

export default async function ApiErrorHandlingPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN;

  return (
    <div className="relative font-sans flex flex-col items-center py-12">
      <JsonLd data={STRUCTURED_DATA} />

      <div className="w-full max-w-5xl px-4 sm:px-6 mb-4 mt-[-2rem]">
        <Breadcrumb items={BREADCRUMB} />
      </div>

      <MarketingHero
        badge="API error handling"
        badgeIcon={TriangleAlert}
        heading={
          <>
            API error handling:{" "}
            <span className="bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              every failure is a different screen
            </span>
          </>
        }
        description={HERO_DESCRIPTION}
      />

      <section className="mt-20 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Error is not one state</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Almost every codebase has a line that reads roughly as: if there is an error, render the
          error component. It is the tidiest part of the file and it is where the handling stops. The
          trouble is that the success branch has one outcome and the failure branch has six or seven,
          and they do not want the same screen, the same words, or the same button.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          The pair that gets confused most often is 401 and 403, and the names are actively
          unhelpful. A 401 means the server does not know who you are, despite being called
          Unauthorized, so signing in again is exactly the right move. A 403 means the server knows
          precisely who you are and the answer is still no, so signing in again changes nothing and
          offering it wastes the time of somebody who is already blocked. Treating them alike
          produces the login loop every large application eventually ships.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          The rest divide just as cleanly. A 404 is usually not an error at all but an absence, and
          it wants a screen explaining what is gone and a way back, not a red banner. A 409 or a 422
          describes something the user can fix, which means the message belongs beside the field
          rather than over the page. A 429 carries{" "}
          <TextLink
            href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After"
            className="text-blue-600 hover:underline"
            external
          >
            Retry-After
          </TextLink>{" "}
          and is the one failure that tells you exactly how long to wait, which almost no client
          reads. A 500 is not the fault of the person looking at it, so it is the one place an offer
          to try again is genuinely useful.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Written down like that it is obvious. It is also a list of six screens nobody has drawn,
          which is how they all end up sharing the one that says something went wrong.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          Your client is probably not catching these
        </h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          Before any of that branching can run, the failure has to reach it, and the most common HTTP
          client in the browser does not deliver it the way people expect.
        </p>
        <CodeBlock lang="js">{FETCH_GOTCHA}</CodeBlock>
        <p className="text-gray-600 leading-relaxed mt-6 mb-4">
          A promise from fetch rejects for a network failure, a blocked request or a bad URL. It
          resolves quite happily for a 500. So a try and catch wrapped around a fetch call catches
          the network being down and nothing whatsoever about the server saying no, and the error
          body gets parsed into the variable the component renders. The symptom is a screen showing
          undefined rather than an error state, which sends you looking at the component.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Libraries differ here, and the difference is worth knowing rather than assuming. A wrapper
          that throws on a non-2xx status is doing you a favour, but it is a choice that library made
          and not a property of HTTP. Whatever you use, the branch that separates a server answering
          badly from a server not answering has to exist somewhere, and it has to come before every
          decision described above.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">The failure that may have succeeded</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          One failure is different in kind from the rest, and it is the one most likely to be handled
          by a retry someone added to make the app feel more reliable.
        </p>
        <CodeBlock lang="http">{TIMEOUT}</CodeBlock>
        <p className="text-gray-600 leading-relaxed mt-6 mb-4">
          A timeout says the answer did not arrive. It says nothing at all about whether the work
          happened. The request may have been lost on the way out, or it may have been processed
          perfectly and the response dropped on the way back, and from inside the browser those two
          are identical. Retrying is a coin flip between fixing the problem and doing the thing
          twice.
        </p>
        <p className="text-gray-600 leading-relaxed">
          That is why a retry policy has to care about the method. Repeating a GET costs a round
          trip. Repeating a POST can charge a card twice, and the only real defence is a key the
          client generates once and the server remembers, so the second attempt is recognised as the
          same intent rather than a new one. If your backend offers that, your frontend has to send
          it. If it does not, an automatic retry on a submit is a bug waiting for a slow day.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Why none of it is ever exercised</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Every branch above is cheap to write and almost impossible to try. A development backend
          answers 200 to everything, which is the entire point of it. You cannot ask a real API for a
          403 on the route you are building, and you certainly cannot ask it for a 429 with a
          Retry-After you chose. Stopping the server gives you a network failure, which is one of the
          seven and not the interesting one.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          So the error branch is written from imagination, reviewed by someone reading the same
          imagination, and shipped. It runs for the first time in front of a user, on the worst day
          the service has had that quarter, which is precisely when a login loop or a duplicated
          order costs the most. The handling is not usually wrong because it was written carelessly.
          It is wrong because nobody has ever seen it run.
        </p>
        <p className="text-gray-600 leading-relaxed">
          This is the same shape as{" "}
          <TextLink
            href={PAGE_ROUTES.MARKETING.RACE_CONDITION}
            className="text-blue-600 hover:underline"
          >
            a race condition
          </TextLink>
          , where the fix is four lines and confirming it needs a response that arrives late on
          purpose. It is also why{" "}
          <TextLink href={PAGE_ROUTES.MARKETING.CORS_ERROR} className="text-blue-600 hover:underline">
            a CORS refusal
          </TextLink>{" "}
          is so unpleasant: it reaches your handler with no status at all, so the branch you wrote
          for a 403 never runs.
        </p>
      </section>

      <section className="mt-16 w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          Six ways to produce a failure on demand
        </h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          Ordered by how much of a real failure each one can stand in for. The first three give you a
          broken connection, which is one branch out of seven, and the ones below them let you name
          the status.
        </p>
        <ComparisonTable
          caption="Six ways to reproduce an API failure, compared by which failures each can produce, whether the body and headers come with it, whether it repeats in CI, and what each is best at"
          columns={[
            "Approach",
            "Which failures it produces",
            "Body and headers too",
            "Repeats in CI",
            "Best at",
          ]}
          rows={WAYS.map(({ name, cells }) => [name, ...cells])}
        />
        <p className="text-gray-600 leading-relaxed mt-6">
          The second column is where most of them fall away. A 429 without a Retry-After does not
          test the code that reads it, and a 422 without a body naming the field cannot drive a field
          level message, so an approach that produces a bare status is only ever testing half of the
          branch. The third column decides whether the branch stays tested after the person who wrote
          it moves on.
        </p>
        <p className="text-gray-600 leading-relaxed mt-4">
          The practical arrangement is one address per failure rather than one you keep editing. Six
          endpoints answering the same path shape with six different statuses means switching from
          the 403 screen to the 500 screen is a base URL away, and the 429 is still sitting there in
          two months when somebody asks whether the backoff still works. What goes in those bodies
          matters too, and{" "}
          <TextLink href={PAGE_ROUTES.MARKETING.MOCK_DATA} className="text-blue-600 hover:underline">
            mock data
          </TextLink>{" "}
          covers making them realistic enough to be worth rendering.
        </p>
      </section>

      <FeatureGrid
        heading="Questions your error branch has to answer"
        subheading="Six of them, and a single error component answers none."
        items={QUESTIONS}
      />

      <CtaBanner
        heading="Give every failure an address"
        description="One endpoint per status, with the body and headers the branch actually reads."
        href={ctaHref}
      />
    </div>
  );
}
