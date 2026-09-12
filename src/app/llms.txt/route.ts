import { PAGE_ROUTES } from "@/app/libs/routes";
import { SITE, absoluteUrl } from "@/app/libs/seo";
import { mockEndpointUrl } from "@/app/libs/helpers/mock_url";

// Built at build time like the sitemap: every URL here resolves against NEXT_PUBLIC_DOMAIN,
// which is substituted then and never changes per request.
export const dynamic = "force-static";

interface Link {
  label: string;
  path: string;
  hash?: string;
  blurb: string;
}

interface Section {
  heading: string;
  links: Link[];
}

const EXAMPLE_URL = mockEndpointUrl("{projectId}", "/api/users/1");

const INTRO = [
  `Create a project, add an endpoint group, then add endpoints to it. Every endpoint answers at ${EXAMPLE_URL}, over HTTPS, with no server to deploy.`,
  "An endpoint owns its HTTP method, status code, response body, response headers, allowed CORS origins and an artificial delay. The body is either fixed JSON or a set of AI generated variants that return different values on every call.",
  "The home page carries a sandbox that works without an account, so an endpoint can be built and called before signing up.",
].join("\n\n");

const SECTIONS: Section[] = [
  {
    heading: "Docs",
    links: [
      {
        label: "Documentation",
        path: PAGE_ROUTES.DOCS,
        blurb:
          "Projects, endpoint groups, endpoints, AI variants, headers and CORS, end to end.",
      },
      {
        label: "Create endpoints",
        path: PAGE_ROUTES.DOCS,
        hash: "endpoints",
        blurb:
          "Method, path, status code and response body, including dynamic route segments.",
      },
      {
        label: "AI response variants",
        path: PAGE_ROUTES.DOCS,
        hash: "ai-variants",
        blurb:
          "Which fields can be generated, how values stay consistent, and the quota per account.",
      },
      {
        label: "Call the mock API",
        path: PAGE_ROUTES.DOCS,
        hash: "call-api",
        blurb:
          "The URL shape of a mock endpoint and how to call it from an app or from curl.",
      },
      {
        label: "Headers and CORS",
        path: PAGE_ROUTES.DOCS,
        hash: "headers-cors",
        blurb:
          "Custom response headers, allowed origins, and making a call get blocked on purpose.",
      },
    ],
  },
  {
    heading: "Guides",
    links: [
      {
        label: "Mock Data - Build Test Data That Finds Bugs",
        path: PAGE_ROUTES.MARKETING.MOCK_DATA,
        blurb:
          "Where a mock belongs, which values break a UI, and four JSON pitfalls.",
      },
      {
        label: "Mock API Tools - Six Compared and How to Choose",
        path: PAGE_ROUTES.MARKETING.MOCK_API_TOOLS,
        blurb:
          "Six tools compared by where they run and whether a write survives the next request.",
      },
      {
        label: "Free APIs for Testing - Compared and Explained",
        path: PAGE_ROUTES.MARKETING.FREE_API_FOR_TESTING,
        blurb:
          "Seven public APIs compared by the data they serve, write support and rate limits.",
      },
      {
        label: "CORS Error - What It Means and Where to Fix It",
        path: PAGE_ROUTES.MARKETING.CORS_ERROR,
        blurb:
          "What each message means, what triggers preflight, and why the fix is on the server.",
      },
      {
        label: "Race Condition - Why a Stale Response Wins the Render",
        path: PAGE_ROUTES.MARKETING.RACE_CONDITION,
        blurb:
          "The timeline behind an out of order response, and how to force it on demand.",
      },
      {
        label: "API Error Handling - A Different Screen for Every Failure",
        path: PAGE_ROUTES.MARKETING.API_ERROR_HANDLING,
        blurb:
          "What 401, 403, 404, 429, 500 and a timeout each ask of a screen, and how to test them.",
      },
    ],
  },
  {
    heading: "FAQ",
    links: [
      {
        label: "FAQ",
        path: PAGE_ROUTES.MARKETING.FAQ,
        blurb:
          "Pricing, how long endpoints live, account limits, and how AI variants work.",
      },
    ],
  },
  {
    heading: "Optional",
    links: [
      {
        label: "Privacy Policy",
        path: PAGE_ROUTES.PRIVACY,
        blurb: "What the service stores and for how long.",
      },
      {
        label: "Terms of Service",
        path: PAGE_ROUTES.TERMS,
        blurb: "The terms that cover using the service.",
      },
    ],
  },
];

function renderLink({ label, path, hash, blurb }: Link): string {
  const url = absoluteUrl(path) + (hash ? `#${hash}` : "");
  return `- [${label}](${url}): ${blurb}`;
}

function renderSection({ heading, links }: Section): string {
  return [`## ${heading}`, "", ...links.map(renderLink)].join("\n");
}

function body(): string {
  return [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    INTRO,
    "",
    ...SECTIONS.map((section) => `${renderSection(section)}\n`),
  ].join("\n");
}

export function GET(): Response {
  return new Response(body(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
