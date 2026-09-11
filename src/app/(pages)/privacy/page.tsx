import type { Metadata } from "next";
import { JsonLd } from "@/app/components/JsonLd";
import { Breadcrumb } from "@/app/components/Link/Breadcrumb";
import { TextLink } from "@/app/components/Link/TextLink";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { SITE, breadcrumbSchema, buildMetadata, type Crumb } from "@/app/libs/seo";
import { GUEST_PROJECT_LIFETIME_IN_SECONDS } from "@/server/services/guest.constants";

const PATH = PAGE_ROUTES.PRIVACY;

const LAST_UPDATED = "12 September 2026";

const GUEST_LIFETIME_IN_HOURS = Math.round(GUEST_PROJECT_LIFETIME_IN_SECONDS / (60 * 60));

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: `How ${SITE.name} handles your data: what the account stores, which cookies are set, and how analytics is turned on and off.`,
  path: PATH,
  noindex: true,
});

const BREADCRUMB: Crumb[] = [{ label: "Home", href: PAGE_ROUTES.HOME }, { label: "Privacy Policy" }];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [breadcrumbSchema(BREADCRUMB, PATH)],
};

export default function PrivacyPage() {
  return (
    <div className="relative font-sans flex flex-col items-center py-12">
      <JsonLd data={STRUCTURED_DATA} />

      <div className="w-full max-w-3xl px-4 sm:px-6 mb-4 mt-[-2rem]">
        <Breadcrumb items={BREADCRUMB} />
      </div>

      <article className="w-full max-w-3xl px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mt-2">Last updated {LAST_UPDATED}</p>

        <p className="text-gray-600 leading-relaxed mt-8">
          {SITE.name} is a tool for building mock REST endpoints. This page says what it stores,
          what it hands to anyone else, and what you can switch off.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">What your account stores</h2>
        <p className="text-gray-600 leading-relaxed">
          An account holds your email address, your display name and a hashed password. Signing in
          with Google gives us the same two fields from your Google profile and nothing further.
          Alongside that sit the projects, endpoint groups and endpoints you create, which are the
          product itself.
        </p>
        <p className="text-gray-600 leading-relaxed mt-4">
          Trial endpoints built on the home page without an account are not tied to you. They belong
          to a shared sandbox remembered in your browser, and they are deleted after{" "}
          {GUEST_LIFETIME_IN_HOURS} hours.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">Cookies that are always set</h2>
        <p className="text-gray-600 leading-relaxed">
          Signing in sets cookies that carry your session. Without them there is no way to stay
          signed in between page loads, so they are not optional and are not covered by the consent
          choice below. They are removed when you sign out.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">Analytics, and how to turn it off</h2>
        <p className="text-gray-600 leading-relaxed">
          We use Google Analytics 4 to see which pages people read and which of them lead anywhere.
          It is loaded only after you accept, and until then nothing is requested from Google at
          all. Accepting sets the <code className="text-gray-900">_ga</code> and{" "}
          <code className="text-gray-900">_ga_*</code> cookies, which give this browser an
          identifier so repeat visits are not counted as new people.
        </p>
        <p className="text-gray-600 leading-relaxed mt-4">
          Google receives the pages you view, a rough location no finer than a city, and basic
          device and browser information. It does not receive your email address, your endpoints or
          anything you type into them. There is no advertising on this site, no advertising tags,
          and nothing is sold to anyone.
        </p>
        <p className="text-gray-600 leading-relaxed mt-4">
          Use Cookie preferences at the foot of any page to change your mind. Withdrawing consent
          deletes those cookies and reloads the page without the script, and it does not sign you
          out. You can also block the script with the{" "}
          <TextLink
            href="https://tools.google.com/dlpage/gaoptout"
            external
            className="text-blue-600 hover:underline"
          >
            Google Analytics opt-out add-on
          </TextLink>{" "}
          or with your browser&apos;s cookie settings.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">Who else sees your data</h2>
        <p className="text-gray-600 leading-relaxed">
          The site runs on Vercel and stores data in a Postgres database, both of which necessarily
          process it to serve the app. Verification and password reset emails are delivered through
          Resend. An AI generated response is designed by a model provider from the prompt and field
          names you supply. Beyond those and Google Analytics, no third party receives anything.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">Your mock endpoints are public</h2>
        <p className="text-gray-600 leading-relaxed">
          An endpoint answers over HTTPS to anyone holding its URL, which is what makes it useful.
          Treat anything you put in a response body as published, and keep real personal data out of
          it.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">Deleting your data</h2>
        <p className="text-gray-600 leading-relaxed">
          Deleting a project deletes its endpoint groups and endpoints with it. To have an account
          and everything under it removed, write to{" "}
          <TextLink href={`mailto:${SITE.contactEmail}`} className="text-blue-600 hover:underline">
            {SITE.contactEmail}
          </TextLink>
          .
        </p>

        <h2 className="text-xl font-bold mt-10 mb-2">Changes</h2>
        <p className="text-gray-600 leading-relaxed">
          This policy can change. The date at the top is the one that counts, and a change that
          affects what is collected will ask for your consent again.
        </p>
      </article>
    </div>
  );
}
