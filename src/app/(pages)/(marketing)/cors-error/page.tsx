import type { Metadata } from "next";
import { EyeOff, KeyRound, Repeat2, ScanSearch, Server, ShieldAlert, Target } from "lucide-react";
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

const PATH = PAGE_ROUTES.MARKETING.CORS_ERROR;

const META_DESCRIPTION =
  "A CORS error is the browser refusing to give your script a response, not a bug in your code. What the message means, what triggers preflight, where to fix it.";

const HERO_DESCRIPTION =
  "A browser sends your cross origin request and then refuses to let your JavaScript read the answer. That is the default, and CORS is how a server opts out of it. Here is what each message means, what makes a request get sent twice, and why the fix is almost never in your frontend.";

export const metadata: Metadata = buildMetadata({
  title: "CORS Error - What It Means and Where to Fix It",
  description: META_DESCRIPTION,
  path: PATH,
});

const BREADCRUMB: Crumb[] = [{ label: "Home", href: PAGE_ROUTES.HOME }, { label: "CORS error" }];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      headline: "A CORS error means the server never said yes",
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

// Ordered by how far the fix travels, nearest to the browser first, which is also roughly the
// order people try them in.
const FIXES = [
  {
    name: "Dev server proxy",
    cells: [
      "Your frontend config",
      "Only whoever runs the project",
      "No, it removes the cross origin entirely",
      "Getting unblocked in development this afternoon",
    ],
  },
  {
    name: "Disabling browser security",
    cells: [
      "One browser on one machine",
      "No",
      "No, it hides the rule rather than answering it",
      "A one off check that the server really is the problem",
    ],
  },
  {
    name: "Changing the backend",
    cells: [
      "The server that holds the data",
      "Yes",
      "Only by breaking a service other people are using",
      "The actual fix, when the server is yours to change",
    ],
  },
  {
    name: SITE.name,
    cells: [
      "The endpoint your app is calling",
      "Yes, over HTTPS",
      "Yes, on demand and without breaking anything",
      "Testing the allowed path and the blocked one against the same screen",
    ],
  },
];

const CHECKS: Feature[] = [
  {
    icon: ScanSearch,
    title: "Whether it is CORS at all",
    description:
      "The console names it explicitly and says blocked by CORS policy. A failed DNS lookup, a refused connection and a 500 all break a fetch too, and none of them are fixed by anything on this page.",
  },
  {
    icon: Server,
    title: "Whether the request arrived",
    description:
      "Check the server log, not the network tab. A simple request is delivered and executed even when the response is withheld, so a POST you never saw succeed may have inserted the row anyway.",
  },
  {
    icon: Repeat2,
    title: "Whether the preflight is the part failing",
    description:
      "The OPTIONS is a separate row in the network tab from the request you wrote. When it fails, your real request is never sent at all, so looking for it and not finding it is the expected symptom.",
  },
  {
    icon: Target,
    title: "Whether the origin matches exactly",
    description:
      "Scheme, host and port are all part of an origin, so http and https differ, and so do port 3000 and port 3001. A value with a trailing slash or a path in it is not an origin and will never match.",
  },
  {
    icon: KeyRound,
    title: "Whether credentials are involved",
    description:
      "The moment a request carries cookies or an Authorization header, the wildcard stops being legal and the server has to name your origin outright. Half of the confusing cases are this one.",
  },
  {
    icon: EyeOff,
    title: "Whether the header is readable",
    description:
      "A response header that is not on the safelist reaches the browser and still reads as null from JavaScript. It looks like the server forgot to send it, which is the wrong thing to go and check.",
  },
];

const MESSAGES = `// the server sent no CORS headers at all
Access to fetch at 'https://api.example.com/orders' from origin
'http://localhost:3000' has been blocked by CORS policy: No
'Access-Control-Allow-Origin' header is present on the requested resource.

// the server allows someone, just not you
... blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a
value 'https://app.example.com' that is not equal to the supplied origin.

// the OPTIONS failed, so the request you wrote was never sent
... blocked by CORS policy: Response to preflight request doesn't pass
access control check.`;

const PREFLIGHT = `OPTIONS /orders HTTP/1.1
Origin: http://localhost:3000
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: content-type
Access-Control-Max-Age: 600`;

const TRIGGERS = `// no preflight: with no Content-Type set, the browser sends text/plain,
// which is on the safelist
fetch(url, { method: "POST", body: data })

// preflight: application/json is not on the safelist, so this same call
// becomes two round trips
fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
})`;

const EXPOSED = `// the server sends it
X-Total-Count: 148

// JavaScript still reads nothing
res.headers.get("X-Total-Count")   // null

// until the server also sends this
Access-Control-Expose-Headers: X-Total-Count`;

export default async function CorsErrorPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN;

  return (
    <div className="relative font-sans flex flex-col items-center py-12">
      <JsonLd data={STRUCTURED_DATA} />

      <div className="w-full max-w-5xl px-4 sm:px-6 mb-4 mt-[-2rem]">
        <Breadcrumb items={BREADCRUMB} />
      </div>

      <MarketingHero
        badge="CORS error"
        badgeIcon={ShieldAlert}
        heading={
          <>
            CORS error:{" "}
            <span className="bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              the server never said yes
            </span>
          </>
        }
        description={HERO_DESCRIPTION}
      />

      <section className="mt-20 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          The browser is not blocking your code
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          A browser will happily send your request to another origin. What it will not do is hand the
          response to your JavaScript. That is the default every page starts from, and it is the
          whole of the{" "}
          <TextLink
            href="https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy"
            className="text-blue-600 hover:underline"
            external
          >
            same origin policy
          </TextLink>
          : script running on one origin may read data from that origin and from nowhere else. An
          origin is a scheme, a host and a port together, so http and https are different origins,
          and so are two ports on the same machine.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          CORS is how a server opts out of that default. The response carries headers naming which
          origins are allowed to read it, and the browser enforces whatever the server said. The
          permission is a whitelist, and it belongs to the server. That is the part most people have
          backwards: there is nothing to configure on your side, because your side is not the one
          granting anything.
        </p>
        <p className="text-gray-600 leading-relaxed">
          It is worth being precise about what is withheld, because it changes where you look. For a
          request simple enough to skip the preflight, the call is delivered, the server runs it, and
          only the reading of the response is refused. The row really was inserted. CORS is not
          protecting that server from your page. It is protecting a signed in user from a page that
          has no business reading their data.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          What the message is actually telling you
        </h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          Three messages cover almost every case, and they point at three different servers doing
          three different things. Reading which one you have is most of the diagnosis.
        </p>
        <CodeBlock lang="console">{MESSAGES}</CodeBlock>
        <p className="text-gray-600 leading-relaxed mt-6">
          The first means the server has no CORS configuration at all, or none that applies to this
          route. The second means it does have one and your origin is not on the list, which is the
          one that catches people moving between localhost ports. The third is not about your request
          at all, it is about the OPTIONS the browser sent ahead of it, and it is the reason the
          request you were debugging never appears in the server log.
        </p>
        <p className="text-gray-600 leading-relaxed mt-4">
          One thing none of these give you is a status code. A blocked response is opaque, so the
          fetch rejects with a bare TypeError and your error handler cannot tell a CORS refusal from
          a dead network. That opacity is what makes this failure so slow to trace, and it is
          deliberate: telling the page why it was refused would leak the thing being protected.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">The request that gets sent twice</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Some cross origin requests are sent straight away. Others are announced first, with an
          OPTIONS request asking whether the real one would be allowed. That announcement is the
          preflight, and the browser decides on its own whether to send it.
        </p>
        <CodeBlock lang="http">{PREFLIGHT}</CodeBlock>
        <p className="text-gray-600 leading-relaxed mt-6 mb-4">
          A request skips the preflight only when the method is GET, HEAD or POST, every header on it
          is CORS safelisted, and the content type is one of three values: a form encoding, multipart
          form data, or text/plain. Anything else and the browser asks first.
        </p>
        <CodeBlock lang="js">{TRIGGERS}</CodeBlock>
        <p className="text-gray-600 leading-relaxed mt-6">
          This catches almost everyone, because sending JSON is the most ordinary thing an
          application does and it is enough on its own to turn one request into two. An Authorization
          header or any custom header starting with X does the same. When the preflight is what fails,
          the fix belongs on the OPTIONS response rather than on the one you were watching, and
          Access-Control-Max-Age is what stops the browser asking again on every call.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          The wildcard stops working the moment credentials appear
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          An open server answers with Access-Control-Allow-Origin set to an asterisk, which means any
          origin may read this. That works right up until the request starts carrying cookies or an
          Authorization header, and then no browser will accept it. A credentialed request requires
          the server to name the calling origin outright and to send
          Access-Control-Allow-Credentials alongside it.
        </p>
        <p className="text-gray-600 leading-relaxed">
          The rule exists so that a public resource cannot be turned into a private one by accident.
          The asterisk is a statement that the response holds nothing worth protecting, and a
          response assembled from the cookies a browser attached is not that. The consequence is that the
          moment you add authentication to a call that already worked, the CORS setup that was fine
          yesterday has to become an explicit list, and the error you get says nothing about
          credentials at all.
        </p>
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          The header arrives and JavaScript still reads null
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          This one does not produce an error, which is why it costs an afternoon. A cross origin
          response only exposes a small safelist of headers to script: cache-control,
          content-language, content-length, content-type, expires, last-modified and pragma.
          Everything else is present on the wire, visible in the network tab, and unreadable from
          code.
        </p>
        <CodeBlock lang="js">{EXPOSED}</CodeBlock>
        <p className="text-gray-600 leading-relaxed mt-6">
          So a pagination count, an ETag or a Location you set yourself is invisible until the server
          names it in Access-Control-Expose-Headers. The symptom looks exactly like a server that
          forgot to send the header, which sends you off to check the wrong side of the connection.
          Open the network tab, find the header sitting in the response, and you know which of the
          two problems you have.
        </p>
      </section>

      <section className="mt-16 w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Four places people try to fix it</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          Ordered by how close the fix sits to your browser. The first two make the symptom go away
          on your machine, which is useful and is not the same thing as the call being allowed.
        </p>
        <ComparisonTable
          caption="Four ways to deal with a CORS error, compared by where the fix lives, whether it reaches other people, whether it can reproduce the failure, and what each is best at"
          columns={[
            "Approach",
            "Where the fix lives",
            "Reaches teammates and CI",
            "Can reproduce the failure",
            "Best at",
          ]}
          rows={FIXES.map(({ name, cells }) => [name, ...cells])}
        />
        <p className="text-gray-600 leading-relaxed mt-6">
          The third row is the real answer whenever the server is yours. The first two are worth
          knowing for what they cost: a proxy makes the request same origin, so it is not testing the
          thing that broke, and code that works behind it can fail the first time it is deployed
          somewhere the proxy does not exist. Turning off browser security proves the server is the
          problem and fixes nothing for anyone else.
        </p>
        <p className="text-gray-600 leading-relaxed mt-4">
          The column worth a second look is the fourth. Every approach here is aimed at making the
          error stop, and none of them help you answer the other question: when a call really is
          refused in production, does your screen do something sensible, or does it show a spinner
          forever. That branch needs a refusal you can summon on purpose.
        </p>
      </section>

      <FeatureGrid
        heading="What to check before you call it a CORS problem"
        subheading="In the order that rules out the most for the least effort."
        items={CHECKS}
      />

      <CtaBanner
        heading="Reproduce it on purpose"
        description="Point your app at an endpoint whose answer is yours to set, and test the allowed path and the blocked one."
        href={ctaHref}
      />
    </div>
  );
}
