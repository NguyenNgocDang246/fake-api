import type { Metadata } from "next";
import { JsonLd } from "@/app/components/JsonLd";
import { Breadcrumb } from "@/app/components/Link/Breadcrumb";
import { TextLink } from "@/app/components/Link/TextLink";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { SITE, breadcrumbSchema, buildMetadata, type Crumb } from "@/app/libs/seo";
import { ROLE_LIMITS } from "@/server/core/role_limits";
import { GUEST_PROJECT_LIFETIME_IN_SECONDS } from "@/server/services/guest.constants";
import { MAX_DELAY_MS, MAX_RESPONSE_BODY_CHARS } from "@/models/endpoint/primitives.model";

const PATH = PAGE_ROUTES.TERMS;

const LAST_UPDATED = "12 September 2026";

const USER_LIMITS = ROLE_LIMITS.USER;
const GUEST_LIMITS = ROLE_LIMITS.GUEST;
const GUEST_LIFETIME_IN_HOURS = Math.round(GUEST_PROJECT_LIFETIME_IN_SECONDS / (60 * 60));

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description: `The terms for using ${SITE.name}: what the free account includes, which limits apply, and what mock endpoints may not be used for.`,
  path: PATH,
  noindex: true,
});

const BREADCRUMB: Crumb[] = [
  { label: "Home", href: PAGE_ROUTES.HOME },
  { label: "Terms of Service" },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [breadcrumbSchema(BREADCRUMB, PATH)],
};

export default function TermsPage() {
  return (
    <div className="relative font-sans flex flex-col items-center py-12">
      <JsonLd data={STRUCTURED_DATA} />

      <div className="w-full max-w-3xl px-4 sm:px-6 mb-4 mt-[-2rem]">
        <Breadcrumb items={BREADCRUMB} />
      </div>

      <article className="w-full max-w-3xl px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Terms of Service</h1>
        <p className="text-sm text-gray-500 mt-2">Last updated {LAST_UPDATED}</p>

        <p className="text-gray-600 leading-relaxed mt-8">
          Using {SITE.name} means accepting what is written here. If any of it does not work for
          you, the answer is to not use the service.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">What the service is</h2>
        <p className="text-gray-600 leading-relaxed">
          {SITE.name} lets you define mock REST endpoints in the browser and call them over HTTPS.
          It is a development and testing aid. It is not a backend, not a database, and not
          somewhere to run anything a real user depends on.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">No charge, and no guarantee</h2>
        <p className="text-gray-600 leading-relaxed">
          The service is free and is provided as is, with no warranty of any kind. There is no
          uptime commitment. It can be slow, it can be down, and it can change or stop entirely
          without notice. Do not build anything on it that would hurt to lose, and do not make it a
          dependency of a production system or of a test suite you need to be green tomorrow.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">Your endpoints are public</h2>
        <p className="text-gray-600 leading-relaxed">
          Anyone holding an endpoint&apos;s URL can call it, and for a trial endpoint can change it
          too. There is no access control on a mock, because a mock a client cannot reach is not
          worth having. So keep real personal data, credentials, API keys and anything confidential
          out of every response body, header and prompt. What you put in a mock, you have published.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">Limits</h2>
        <p className="text-gray-600 leading-relaxed">
          A free account includes {USER_LIMITS.maxProjects} projects,{" "}
          {USER_LIMITS.maxGroupsPerProject} endpoint groups per project,{" "}
          {USER_LIMITS.maxEndpointsPerGroup} endpoints per group, and{" "}
          {USER_LIMITS.maxAiPlansPerDay} AI generated designs per day. A response body is capped at{" "}
          {MAX_RESPONSE_BODY_CHARS.toLocaleString("en-US")} characters and an artificial delay at{" "}
          {MAX_DELAY_MS.toLocaleString("en-US")} ms.
        </p>
        <p className="text-gray-600 leading-relaxed mt-4">
          The trial box on the home page needs no account and allows{" "}
          {GUEST_LIMITS.maxEndpointsPerGroup} endpoints. Those are swept after{" "}
          {GUEST_LIFETIME_IN_HOURS} hours and do not transfer to an account you create later.
        </p>
        <p className="text-gray-600 leading-relaxed mt-4">
          Rate limits apply to the service as a whole and to trial sandboxes per address. All of
          these figures can change as the service is tuned.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">What you may not do</h2>
        <p className="text-gray-600 leading-relaxed">
          Do not use the service to host or serve malware, phishing pages, or anything illegal where
          you are. Do not use a mock endpoint to impersonate another service or organisation in a
          way meant to deceive. Do not store other people&apos;s personal data in it. Do not attempt
          to break, overload or work around the limits, whether by scripting account creation,
          scraping, or otherwise. Do not resell access to it.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">Suspension</h2>
        <p className="text-gray-600 leading-relaxed">
          An account or an endpoint that breaks the section above can be removed without warning,
          along with everything under it. Where there is a judgement call to make, we will make it.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">Your content</h2>
        <p className="text-gray-600 leading-relaxed">
          What you create stays yours. You grant only what is needed to store it and serve it back
          over HTTP, which is what the service does. Deleting it ends that.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">Liability</h2>
        <p className="text-gray-600 leading-relaxed">
          To the extent the law allows, the service is not liable for anything arising out of its
          use, including lost work, lost data and a test suite that failed because a mock did not
          answer. The service is free, and that is the trade.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">Privacy</h2>
        <p className="text-gray-600 leading-relaxed">
          What is stored about you and which cookies are set is covered in the{" "}
          <TextLink href={PAGE_ROUTES.PRIVACY} className="text-blue-600 hover:underline">
            privacy policy
          </TextLink>
          .
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">Changes and contact</h2>
        <p className="text-gray-600 leading-relaxed">
          These terms can change, and the date at the top is the one that counts. Continuing to use
          the service after a change means accepting it. Questions go to{" "}
          <TextLink href={`mailto:${SITE.contactEmail}`} className="text-blue-600 hover:underline">
            {SITE.contactEmail}
          </TextLink>
          .
        </p>
      </article>
    </div>
  );
}
