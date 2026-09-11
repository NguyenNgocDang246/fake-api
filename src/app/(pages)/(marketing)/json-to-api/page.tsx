import type { Metadata } from "next";
import { FileJson2, Globe, Server, Ghost, ShieldCheck, Hash } from "lucide-react";
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
import { MAX_RESPONSE_HEADERS } from "@/models/endpoint/response_headers.model";
import { MAX_STATUS_CODE, MIN_STATUS_CODE } from "@/models/endpoint/primitives.model";

const PATH = PAGE_ROUTES.MARKETING.JSON_TO_API;

const META_DESCRIPTION =
  "Turn a JSON file into a real HTTP API: four ways to host one compared, why myjson.com is gone, and how JSON:API the spec differs from a plain JSON API.";

const HERO_DESCRIPTION =
  "You already have the JSON. What you need is a URL that serves it with the right content type, a status code you choose, and headers a browser is allowed to read. Here are the four ways to get one, and what each of them costs you.";

export const metadata: Metadata = buildMetadata({
  title: "JSON to API - Serve a JSON File Over HTTP",
  description: META_DESCRIPTION,
  path: PATH,
});

const BREADCRUMB: Crumb[] = [{ label: "Home", href: PAGE_ROUTES.HOME }, { label: "JSON to API" }];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      headline: "Turn a JSON file into a real HTTP API",
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

const HOSTING = [
  {
    name: "Raw GitHub or Gist URL",
    cells: [
      "Commit a file",
      "Always 200",
      "text/plain, not JSON",
      "Yes",
      "Cached hard, and you control nothing about the response",
    ],
  },
  {
    name: "json-server locally",
    cells: [
      "Install and keep a process running",
      "Configurable",
      "Correct",
      "No, it is on your localhost",
      "It stops when your laptop closes",
    ],
  },
  {
    name: "myjson.com",
    cells: ["Paste and go", "n/a", "n/a", "Was yes", "Shut down, the links are dead"],
  },
  {
    name: "A hosted endpoint",
    cells: [
      "Paste into a form",
      `Any code from ${MIN_STATUS_CODE} to ${MAX_STATUS_CODE}`,
      "Correct, and overridable",
      "Yes, over HTTPS",
      "Nothing persists between calls",
    ],
  },
];

const SERVING: Feature[] = [
  {
    icon: Hash,
    title: "Long numbers survive",
    description:
      "Only whitespace outside string literals is stripped, so the bytes you typed are the bytes the client reads. An id like 9007199254740993 does not come back rounded, and integer-like keys keep their order.",
  },
  {
    icon: FileJson2,
    title: "The right content type",
    description:
      "Responses go out as application/json with a utf-8 charset, so a client parses them without being told to and an emoji in a string arrives intact.",
  },
  {
    icon: Ghost,
    title: "Never stale",
    description:
      "cache-control is no-store by default, so an edit to a body shows up on the very next call rather than after a cache you cannot reach expires.",
  },
  {
    icon: Server,
    title: "Headers you choose",
    description: `Add up to ${MAX_RESPONSE_HEADERS} response headers per endpoint. A page count beside a list is the common one, and setting Content-Type or Cache-Control replaces the default.`,
  },
  {
    icon: ShieldCheck,
    title: "Browser access, decided per project",
    description:
      "Preflight is answered from project settings, and exposed headers are computed so a custom header is actually readable from JavaScript. Turning it off is how you reproduce a browser blocking a call.",
  },
  {
    icon: Globe,
    title: "A real URL, not a localhost port",
    description:
      "The same address answers from your laptop, a teammate's browser, Postman and a CI runner, which a process on port 3001 cannot do.",
  },
];

const JSONAPI_BODY = `{
  "data": {
    "type": "articles",
    "id": "1",
    "attributes": {
      "title": "JSON:API paints my bikeshed!",
      "created": "2025-04-11T10:00:00Z"
    },
    "relationships": {
      "author": { "data": { "type": "people", "id": "9" } }
    }
  },
  "included": [
    { "type": "people", "id": "9", "attributes": { "name": "Dan" } }
  ]
}`;

const PLAIN_BODY = `{
  "id": 1,
  "title": "JSON:API paints my bikeshed!",
  "created": "2025-04-11T10:00:00Z",
  "author": { "id": 9, "name": "Dan" }
}`;

export default async function JsonToApiPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN;

  return (
    <div className="relative font-sans flex flex-col items-center py-12">
      <JsonLd data={STRUCTURED_DATA} />

      <div className="w-full max-w-5xl px-4 sm:px-6 mb-4 mt-[-2rem]">
        <Breadcrumb items={BREADCRUMB} />
      </div>

      <MarketingHero
        badge="JSON to API"
        badgeIcon={FileJson2}
        heading={
          <>
            Turn a JSON file into a{" "}
            <span className="bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              real HTTP API
            </span>
          </>
        }
        description={HERO_DESCRIPTION}
        primaryHref={ctaHref}
        secondaryHref={PAGE_ROUTES.DOCS}
        secondaryLabel="Read the docs"
      />

      <section className="mt-20 w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Four ways to put JSON behind a URL</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          The task sounds trivial and the options are not equivalent. Each one fails in a different
          place, and the place it fails is usually discovered halfway through wiring up a screen.
        </p>
        <ComparisonTable
          caption="Four ways to serve a JSON file over HTTP, compared by setup, status code control, content type, shareability and their main catch"
          columns={[
            "Approach",
            "Setup",
            "Status codes",
            "Content-Type",
            "Shareable",
            "The catch",
          ]}
          rows={HOSTING.map(({ name, cells }) => [name, ...cells])}
        />
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Why the raw file trick disappoints</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Committing a JSON file and pointing fetch at the raw URL is the first idea most people
          have, and it works for about an hour. The file is served as plain text rather than
          application/json, so anything relying on the content type has to be told to parse it
          anyway. It is cached aggressively by a CDN you have no control over, so the edit you just
          pushed is not the response your app receives. And the status is always 200, so the entire
          error branch of your screen remains theoretical.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Running{" "}
          <TextLink
            href="https://github.com/typicode/json-server"
            className="text-blue-600 hover:underline"
            external
          >
            json-server
          </TextLink>{" "}
          fixes all three, and introduces a different problem: it is a process on your machine. It
          answers your browser and nothing else. A teammate cannot open it, a designer cannot check a
          state against it, and a CI job on another host certainly cannot reach it. For a solo
          afternoon it is the right tool. For anything a second person needs to see, it is not.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">What happened to myjson</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          myjson.com did exactly this job. You pasted a JSON blob, it gave you back a URL, and that
          URL served the blob. It is gone, and the links in every tutorial and Stack Overflow answer
          that referenced it are dead. The same has happened to several small paste-and-host services
          over the years, which is a reasonable argument against putting anything you care about
          behind one.
        </p>
        <p className="text-gray-600 leading-relaxed">
          It is worth being clear eyed about that risk here too. A hosted mock endpoint is a
          dependency, and the safe way to hold one is the way you would hold any other: keep the JSON
          body in your repo as the source of truth, and treat the URL as a convenience for serving it
          rather than as the only copy. On this site your project id is the key clients call, so it
          is worth saving somewhere durable such as an .env file.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">JSON API, or JSON:API</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          These are two different things and the search results for them are hopelessly mixed. A
          JSON API, lowercase and generic, is any HTTP API whose responses happen to be JSON. That is
          what most people mean and what the rest of this page is about.
        </p>
        <p className="text-gray-600 leading-relaxed mb-6">
          <TextLink href="https://jsonapi.org" className="text-blue-600 hover:underline" external>
            JSON:API
          </TextLink>{" "}
          is a specification. It fixes the envelope: resources live under a top level data key,
          carry a type and an id, put their fields inside attributes, express links to other
          resources under relationships, and side load those resources into included. It also
          specifies media types, pagination, sparse fieldsets and error objects. Adopting it is a
          decision about your whole API, not a formatting choice.
        </p>
        <CodeBlock lang="json">{JSONAPI_BODY}</CodeBlock>
        <p className="text-gray-600 leading-relaxed mt-6 mb-6">
          The equivalent plain JSON body is the one most teams actually ship, and the difference is
          the reason the two terms are worth keeping apart.
        </p>
        <CodeBlock lang="json">{PLAIN_BODY}</CodeBlock>
        <p className="text-gray-600 leading-relaxed mt-6">
          Either body works as a response here, because an endpoint serves whatever valid JSON object
          you paste. That is the honest framing: if your real API speaks JSON:API, you can hand write
          a JSON:API shaped envelope and your client will parse it correctly. What this site does not
          do is implement the specification. There is no content negotiation on the JSON:API media
          type, no sparse fieldset handling, and no relationship traversal. It serves your bytes.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">A sample REST API in one paste</h2>
        <p className="text-gray-600 leading-relaxed">
          The practical shape of this is short. You create a project, paste the body, pick a method
          and a path, and the endpoint answers over HTTPS immediately. Point one path at your full
          list, another at the same shape with an empty array, and a third at a 500, and you have a
          sample REST API covering the three states your screen actually has to handle. The{" "}
          <TextLink href={PAGE_ROUTES.DOCS} className="text-blue-600 hover:underline">
            docs
          </TextLink>{" "}
          walk through it, and{" "}
          <TextLink
            href={PAGE_ROUTES.MARKETING.FAKE_JSON_API}
            className="text-blue-600 hover:underline"
          >
            fake JSON API
          </TextLink>{" "}
          covers what a response body can hold.
        </p>
      </section>

      <FeatureGrid
        heading="The parts that go wrong when you serve JSON"
        subheading="Most of these only surface once a browser, a cache or a large integer gets involved."
        items={SERVING}
      />

      <CtaBanner
        heading="Give your JSON a URL"
        description="Paste a body, save, and call it from your app. No process to keep running."
        href={ctaHref}
      />
    </div>
  );
}
