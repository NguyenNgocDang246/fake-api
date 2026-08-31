import type { Metadata } from "next";
import {
  BookOpen,
  ArrowLeft,
  ArrowRight,
  UserPlus,
  LogIn,
  KeyRound,
  FolderKanban,
  Code2,
  Pencil,
  Link2,
  Clock,
  ShieldCheck,
  Sparkles,
  ListChecks,
  MessageSquareText,
  Eye,
  Ban,
  Check,
} from "lucide-react";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { TextLink } from "@/app/components/Link/TextLink";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";
import { ROLE_LIMITS } from "@/server/core/role_limits";
import { MAX_ARRAY_DEPTH } from "@/app/libs/helpers/json_path";
import {
  MAX_AI_FIELDS,
  MAX_AI_PROMPT_LENGTH,
  MAX_AI_VALUES,
} from "@/models/endpoint/ai_fields.model";
import {
  MAX_ARRAY_ITEMS,
  MAX_DELAY_MS,
  MAX_PATH_LENGTH,
  MAX_RESPONSE_BODY_CHARS,
  MAX_RESPONSE_BODY_DEPTH,
  MAX_STATUS_CODE,
  MIN_STATUS_CODE,
} from "@/models/endpoint/primitives.model";
import { JsonLd } from "@/app/components/JsonLd";
import { SITE, absoluteUrl, buildMetadata } from "@/app/libs/seo";
import { CodeBlock } from "@/app/components/Code/CodeBlock";
import { mockEndpointUrl } from "@/app/libs/helpers/mock_url";
import { WarningCallout } from "@/app/(pages)/docs/components/WarningCallout";
import { DocsToc } from "@/app/(pages)/docs/components/DocsToc";

export const metadata: Metadata = buildMetadata({
  title: "Docs",
  description:
    "Learn how to create projects, define mock endpoints with fixed or AI generated responses, and call your Fake API URLs from your app.",
  path: PAGE_ROUTES.DOCS,
});

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      headline: "Fake API docs",
      description:
        "Learn how to create projects, define mock endpoints with fixed or AI generated responses, and call your Fake API URLs from your app.",
      url: absoluteUrl(PAGE_ROUTES.DOCS),
      inLanguage: "en",
      publisher: {
        "@type": "Organization",
        name: SITE.name,
        url: SITE.url,
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl(PAGE_ROUTES.HOME) },
        { "@type": "ListItem", position: 2, name: "Docs", item: absoluteUrl(PAGE_ROUTES.DOCS) },
      ],
    },
  ],
};

const TOC = [
  { id: "introduction", label: "Introduction" },
  { id: "account", label: "Account & Login" },
  { id: "projects", label: "Create a Project" },
  { id: "endpoint-groups", label: "Endpoint Groups" },
  { id: "endpoints", label: "Create Endpoints" },
  { id: "manage-endpoints", label: "Edit, Delete & Copy URL" },
  { id: "ai-variants", label: "AI Response Variants" },
  { id: "call-api", label: "Call the Mock API" },
  { id: "tips", label: "Tips" },
];

const ACCOUNT_STEPS = [
  {
    icon: UserPlus,
    title: "Sign up",
    description:
      "Enter your name, email, and password. A verification email is sent, click Verify to activate your account.",
  },
  {
    icon: LogIn,
    title: "Log in",
    description: "Use your email and password, or sign in instantly with Login with Google.",
  },
  {
    icon: KeyRound,
    title: "Forgot password",
    description:
      "Select Forgot Password? on the login page and follow the email instructions to reset it.",
  },
];

const PROJECT_STEPS = [
  {
    step: "1",
    title: "Click Create new",
    description: "On the Project page, start a new project.",
  },
  {
    step: "2",
    title: "Name it",
    description: "Enter a Name (required) and an optional Description.",
  },
  {
    step: "3",
    title: "Save",
    description: "Your project appears in the list with its own public_id.",
  },
];

const ENDPOINT_FIELDS = [
  { field: "Method", detail: "GET, POST, PUT, PATCH, or DELETE" },
  {
    field: "Path",
    detail: `Must start with /, at most ${MAX_PATH_LENGTH} characters, e.g. /api/users, /api/users/1`,
  },
  {
    field: "Response body",
    detail: `A valid JSON object returned to the client exactly as you wrote it, key order, spacing and long numbers included. Up to ${MAX_RESPONSE_BODY_CHARS} characters, nested at most ${MAX_RESPONSE_BODY_DEPTH} levels deep, with at most ${MAX_ARRAY_ITEMS} items in any one list`,
  },
  { field: "Delay (ms)", detail: `Simulated latency from 0 to ${MAX_DELAY_MS}, default 0` },
  {
    field: "Status Code",
    detail: `Any code from ${MIN_STATUS_CODE} to ${MAX_STATUS_CODE}, default 200. At 204 the body is empty`,
  },
  {
    field: "AI response variants",
    detail: "Off by default. When on, the ticked fields are regenerated on every call",
  },
];

const AI_STEPS = [
  {
    icon: Sparkles,
    title: "Turn it on",
    description:
      "Tick Enable on the AI response variants card in the endpoint form. If you don't see the card, AI isn't switched on for this server.",
  },
  {
    icon: ListChecks,
    title: "Pick the values",
    description:
      "The list of fields comes straight from your response body. Tick the ones you want to change, anything you leave unticked comes back exactly as you wrote it. On a list you can also tick vary count, so the list is a different length each call.",
  },
  {
    icon: MessageSquareText,
    title: "Add a hint",
    description:
      "Optional, one line, for example id should be a uuid, prices from 10000 to 500000. A hint is read once and then holds for every call, so being specific pays off.",
  },
  {
    icon: Eye,
    title: "Preview",
    description:
      "Preview shows you 3 sample responses before you save, plus a plain summary of where each field's data comes from. New samples costs nothing, so press it as often as you like.",
  },
];

const AI_COHERENCE = [
  "An email, username and phone belong to the name beside them, and a city sits in the right country.",
  "Fields that describe one thing move together: change a product's category and its name, brand and price band change with it.",
  "Totals add up to the lines above them, and a delivery date always falls after the order date.",
  "A value that only makes sense sometimes stays empty the rest of the time, such as a shipping date on an order that hasn't shipped.",
];

const AI_UNSUPPORTED = [
  "Fields in a list whose items don't match, for example one item has a price and another doesn't. The list's length can still vary.",
  "Empty lists. There is no item to build more from, so put one sample item in and the rest follows.",
  "Lists nested more than three deep.",
  "Adding or removing keys. A field that is sometimes absent should be written into your body as an empty value.",
];

const AI_SUPPORTED = [
  "Lists inside lists, to any of the three levels. Tick the values, or the length of the inner lists, or both.",
  "A whole object at once. Ticking it ticks every field inside, and you can untick the ones you want left alone.",
  "Fields written as null. Because null says nothing about what belongs there, this is the one field that can come back as a different kind of value, and it can still be empty some of the time.",
  "Field names holding a dot, square brackets, or nothing at all.",
];

const AI_LIMITS = [
  { limit: "Fields per endpoint", detail: `Up to ${MAX_AI_FIELDS} ticked fields` },
  {
    limit: "Values at a time",
    detail: `Up to ${MAX_AI_VALUES}. A field inside a list counts once per item, and once per item of every inner list when the lists are nested, so this is what a deeply nested pick runs into first`,
  },
  {
    limit: "List length",
    detail: `Up to ${MAX_ARRAY_ITEMS} items, which is the limit on your response body too`,
  },
  { limit: "List nesting", detail: `Lists inside lists, up to ${MAX_ARRAY_DEPTH} deep` },
  { limit: "Hint length", detail: `Up to ${MAX_AI_PROMPT_LENGTH} characters` },
];

// The account limits, which are the ones that differ between plans. GUEST is not an account
// anyone signs up as, so it is not a column here.
const PLAN_COLUMNS = [
  { role: "USER" as const, label: "Standard" },
  { role: "USER_VIP" as const, label: "VIP" },
];

const PLAN_ROWS = [
  { label: "Projects", read: (limits: (typeof ROLE_LIMITS)["USER"]) => limits.maxProjects },
  {
    label: "Endpoint groups per project",
    read: (limits: (typeof ROLE_LIMITS)["USER"]) => limits.maxGroupsPerProject,
  },
  {
    label: "Endpoints per group",
    read: (limits: (typeof ROLE_LIMITS)["USER"]) => limits.maxEndpointsPerGroup,
  },
  {
    label: "AI designs per day",
    read: (limits: (typeof ROLE_LIMITS)["USER"]) => limits.maxAiPlansPerDay,
  },
];

const ERROR_CODES = [
  { code: "404", title: "Not Found", detail: "No endpoint matches the requested path." },
  {
    code: "405",
    title: "Method Not Allowed",
    detail: "The path is correct but the method doesn't match.",
  },
];

const TIPS = [
  "Follow RESTful naming: plural resources (/api/users), details (/api/users/123), sub-resources (/api/users/123/orders).",
  "Group related endpoints into the same Endpoint Group so they're easy to find and manage.",
  "Keep response JSON concise, only include fields you actually need, with realistic sample data.",
  "Create multiple endpoints for different data states, e.g. an active user and an inactive user.",
  "Use status_code and response_body together to simulate success, validation errors, and server errors.",
  "Tick only the fields that genuinely differ between records, ids, names, prices, timestamps. Leaving the rest fixed keeps a list looking realistic and spends far less of your daily allowance.",
  "Use delay_ms to test loading states (1000-2000ms), timeouts (a high delay), or retry logic (delay plus an error status).",
  "Back up your projectId somewhere safe, e.g. a .env file, since it's the key clients use to call your mock API and can't be recovered if lost.",
];

export default async function DocsPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN;

  return (
    <div className="flex flex-col items-center pb-20">
      <JsonLd data={STRUCTURED_DATA} />

      {/* Hero */}
      <section className="flex flex-col items-center px-4 sm:px-6 pt-8 pb-4 text-center">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 ring-1 ring-blue-200 rounded-full px-3 py-1 mb-6">
          <BookOpen size={14} />
          Documentation
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-black mb-4 max-w-2xl">
          Fake API docs
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mb-6 leading-relaxed">
          Everything you need to create mock endpoints and call them from your app, no real backend
          required.
        </p>
        <TextLink
          href={PAGE_ROUTES.HOME}
          variant="muted"
          className="flex items-center gap-1 text-sm"
        >
          <ArrowLeft size={14} />
          Back to home
        </TextLink>
      </section>

      <div className="w-full max-w-5xl px-4 sm:px-6 mt-10 lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
        <DocsToc items={TOC} />

        {/* Content */}
        <div className="max-w-3xl flex flex-col gap-16">
          {/* Introduction */}
          <section id="introduction" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-3">Introduction</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              Fake API helps you quickly create mock APIs for developing and testing applications
              without needing a real backend. It&apos;s useful when you want to develop the frontend
              independently, test different scenarios (success, error, delay), demo an app with
              simulated data, or quickly experiment with an idea without setting up a server.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Each project you create gets a unique public{" "}
              <code className="text-sm bg-gray-100 rounded px-1.5 py-0.5">projectId</code>. You
              attach this to a path and define the JSON body, HTTP status code, and delay for each
              endpoint, and decide whether that body is served exactly as written or regenerated by
              AI on every call. The final URL format is:
            </p>
            <CodeBlock lang="url">{mockEndpointUrl("{projectId}", "{your_created_path}")}</CodeBlock>
          </section>

          {/* Account & Login */}
          <section id="account" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-3">Getting started: account & login</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              You need an account before you can create projects and endpoints.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ACCOUNT_STEPS.map(({ icon: Icon, title, description }) => (
                <div key={title} className="border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center justify-center size-9 rounded-lg bg-blue-100 text-blue-600 mb-3">
                    <Icon size={18} />
                  </div>
                  <h3 className="font-semibold mb-1.5">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              You need to verify your email before you can use all features.
            </p>
          </section>

          {/* Create a Project */}
          <section id="projects" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-3">Create a project</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              After logging in, you&apos;ll land on the Project management page, this is where all
              your mock APIs are organized.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
              {PROJECT_STEPS.map(({ step, title, description }) => (
                <div key={step} className="flex flex-col items-start">
                  <div className="flex items-center justify-center size-9 rounded-full bg-linear-to-r from-indigo-600 to-blue-500 text-white font-bold mb-3 text-sm">
                    {step}
                  </div>
                  <h3 className="font-semibold mb-1">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-600 leading-relaxed mb-4">
              The project list shows each project&apos;s <strong>Name</strong> and its{" "}
              <strong>public_id</strong>, that&apos;s the{" "}
              <code className="text-sm bg-gray-100 rounded px-1.5 py-0.5">projectId</code>{" "}
              you&apos;ll use in mock API URLs.
            </p>
            <WarningCallout>
              The Delete all button removes every project you own and cannot be undone. Use with
              caution.
            </WarningCallout>
          </section>

          {/* Endpoint Groups */}
          <section id="endpoint-groups" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-3">Endpoint groups</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Endpoint groups help you organize endpoints by functionality or module, for example
              users, orders, or products. On desktop, groups appear in the left panel of the project
              page, on mobile, use the dropdown menu instead. Select a group to view and configure
              its endpoints.
            </p>
            <ul className="flex flex-col gap-2 text-gray-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <FolderKanban size={16} className="mt-1 shrink-0 text-gray-400" />
                <span>
                  <strong>Create:</strong> click Create new in the Endpoint Group section, enter a
                  name, and Save.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Pencil size={16} className="mt-1 shrink-0 text-gray-400" />
                <span>
                  <strong>Edit or delete:</strong> use the ⋮ menu on a group to rename it, or delete
                  it along with all endpoints inside.
                </span>
              </li>
            </ul>
          </section>

          {/* Create Endpoints */}
          <section id="endpoints" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-3">Create endpoints</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Endpoints define how the mock API responds when it&apos;s called. Select an Endpoint
              Group, click Create new, and fill in:
            </p>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <tbody>
                  {ENDPOINT_FIELDS.map(({ field, detail }, i) => (
                    <tr key={field} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap align-top">
                        {field}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 leading-relaxed mb-3">Example endpoint configuration:</p>
            <CodeBlock lang="json">{`{
  "method": "GET",
  "path": "/api/users/1",
  "response_body": {
    "id": 1,
    "name": "John Doe",
    "email": "johndoe@example.com"
  },
  "delay_ms": 500,
  "status_code": 200,
  "ai_enabled": true,
  "ai_fields": ["name", "email"],
  "ai_prompt": "keep the email domain example.com"
}`}</CodeBlock>
            <p className="text-gray-600 leading-relaxed mt-4 mb-6">
              Click Save, the endpoint list updates right away with the new endpoint.
            </p>

            <h3 className="text-lg font-semibold mb-2">Dynamic routes</h3>
            <p className="text-gray-600 leading-relaxed mb-3">
              Prefix a path segment with{" "}
              <code className="text-sm bg-gray-100 rounded px-1.5 py-0.5">:</code> to turn it into a
              dynamic parameter that matches any value, for example{" "}
              <code className="text-sm bg-gray-100 rounded px-1.5 py-0.5">/api/users/:id</code>.
              That single endpoint responds to{" "}
              <code className="text-sm bg-gray-100 rounded px-1.5 py-0.5">/api/users/1</code>,{" "}
              <code className="text-sm bg-gray-100 rounded px-1.5 py-0.5">/api/users/42</code>, and
              any other value in that position, so you don&apos;t need a separate endpoint per id.
            </p>
            <p className="text-gray-600 leading-relaxed">
              If both a literal path and a dynamic path could match the same request, the literal
              (exact) match always wins, the dynamic route is only used as a fallback when no exact
              match is found.
            </p>
          </section>

          {/* Edit, Delete, Copy URL */}
          <section id="manage-endpoints" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-3">Edit, delete, and copy URL</h2>
            <ul className="flex flex-col gap-2 text-gray-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <Pencil size={16} className="mt-1 shrink-0 text-gray-400" />
                <span>
                  <strong>Edit:</strong> click an endpoint to open the edit form, change the method,
                  path, body, delay, or status, then Save.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Code2 size={16} className="mt-1 shrink-0 text-gray-400" />
                <span>
                  <strong>Delete:</strong> use the trash icon on an endpoint, or Delete all to clear
                  every endpoint in the group.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Link2 size={16} className="mt-1 shrink-0 text-gray-400" />
                <span>
                  <strong>Copy URL:</strong> click the copy icon to copy the full{" "}
                  <code className="text-sm bg-gray-100 rounded px-1.5 py-0.5">
                    {mockEndpointUrl("{projectId}", "{path}")}
                  </code>{" "}
                  URL, ready to paste into your code.
                </span>
              </li>
            </ul>
          </section>

          {/* AI Response Variants */}
          <section id="ai-variants" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-3">AI response variants</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              An endpoint can answer with the same JSON every time, or with different values on
              every call. Tick Enable, choose which values are allowed to change, and each request
              comes back with a fresh version of your body. The shape stays put, only the values you
              picked move, so a list of users is still a list of users and your app keeps working
              against the same structure. Every call is different, so a screen that pages through a
              hundred records shows a hundred different records.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {AI_STEPS.map(({ icon: Icon, title, description }) => (
                <div key={title} className="border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center justify-center size-9 rounded-lg bg-violet-100 text-violet-600 mb-3">
                    <Icon size={18} />
                  </div>
                  <h3 className="font-semibold mb-1.5">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-semibold mb-2">Which values you can pick</h3>
            <p className="text-gray-600 leading-relaxed mb-3">
              You tick individual values, a piece of text, a number, a yes/no, or an empty value.
              Whatever shape your body has, there is a box for it:
            </p>
            <ul className="flex flex-col gap-2 mb-5">
              {AI_SUPPORTED.map((line) => (
                <li key={line} className="flex items-start gap-2 text-gray-600 leading-relaxed">
                  <Check size={16} className="mt-1 shrink-0 text-emerald-500" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-600 leading-relaxed mb-3">
              A few boxes are greyed out. Hover one to see why, the reasons are:
            </p>
            <ul className="flex flex-col gap-2 mb-6">
              {AI_UNSUPPORTED.map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-gray-600 leading-relaxed">
                  <Ban size={16} className="mt-1 shrink-0 text-gray-400" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>

            <h3 className="text-lg font-semibold mb-2">Values that fit together</h3>
            <p className="text-gray-600 leading-relaxed mb-3">
              Fields are not filled in one at a time and left to clash. Related values are worked
              out together, so a response reads like something a real API would have sent:
            </p>
            <ul className="flex flex-col gap-2 mb-6">
              {AI_COHERENCE.map((line) => (
                <li key={line} className="flex items-start gap-2 text-gray-600 leading-relaxed">
                  <Check size={16} className="mt-1 shrink-0 text-emerald-500" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <h3 className="text-lg font-semibold mb-2">What your app sees</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Calling the endpoint is just as fast with variants on as with them off. The first call
              after you enable it, or after you change the body, answers with your own response body
              while the endpoint works out how to vary it, and calls after that come back varied.
              You also get your own body back if AI cannot be reached at all, so your app never sees
              an error it did not ask for.
            </p>
            <WarningCallout>
              If a field is being filled with the wrong sort of data, open the summary under Preview
              to see how it was read, add a line to the hint, then press Redesign. The hint always
              wins over what was guessed from your field names.
            </WarningCallout>

            <h3 className="text-lg font-semibold mt-6 mb-2">Limits</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <tbody>
                  {AI_LIMITS.map(({ limit, detail }, i) => (
                    <tr key={limit} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap align-top">
                        {limit}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold mt-6 mb-2">What your account allows</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Only designing costs one of your daily AI designs, which happens when you press
              Preview or Redesign, or when you change the body, the ticked fields, or the hint.
              Calling your endpoint and pressing New samples cost nothing.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-800">Limit</th>
                    {PLAN_COLUMNS.map(({ role, label }) => (
                      <th
                        key={role}
                        className={`px-4 py-2.5 text-left font-semibold whitespace-nowrap ${
                          role === user?.role ? "text-blue-700" : "text-gray-800"
                        }`}
                      >
                        {label}
                        {role === user?.role && (
                          <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            Your plan
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PLAN_ROWS.map(({ label, read }, i) => (
                    <tr key={label} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{label}</td>
                      {PLAN_COLUMNS.map(({ role }) => (
                        <td
                          key={role}
                          className={`px-4 py-2.5 ${
                            role === user?.role ? "font-semibold text-blue-700" : "text-gray-600"
                          }`}
                        >
                          {read(ROLE_LIMITS[role])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Call the Mock API */}
          <section id="call-api" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-3">Call the mock API</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Use the <code className="text-sm bg-gray-100 rounded px-1.5 py-0.5">projectId</code>{" "}
              shown in the API Endpoint card on your project&apos;s detail page:
            </p>
            <div className="flex flex-col gap-4 mb-6">
              <CodeBlock lang="bash">{`curl -X GET ${mockEndpointUrl("QGONEwKEqJg", "/api/user/1")}`}</CodeBlock>
              <CodeBlock lang="fetch">{`fetch('${mockEndpointUrl("QGONEwKEqJg", "/api/users/1")}')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`}</CodeBlock>
              <CodeBlock lang="axios">{`axios.get('${mockEndpointUrl("QGONEwKEqJg", "/api/users/1")}')
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error));`}</CodeBlock>
            </div>
            <p className="text-gray-600 leading-relaxed mb-2">When you call the API, it will:</p>
            <ol className="list-decimal list-inside text-gray-600 leading-relaxed mb-6 flex flex-col gap-1">
              <li>Find the endpoint matching the method and path</li>
              <li>Apply the configured delay_ms, if any</li>
              <li>
                Return the response_body with the configured status_code, or a varied version of it
                if AI variants are on
              </li>
            </ol>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ERROR_CODES.map(({ code, title, detail }) => (
                <div key={code} className="border border-gray-200 rounded-xl p-4">
                  <p className="font-mono text-sm font-bold text-red-500 mb-1">
                    {code} {title}
                  </p>
                  <p className="text-sm text-gray-600">{detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Tips */}
          <section id="tips" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-3">Tips for using Fake API</h2>
            <ul className="flex flex-col gap-2.5">
              {TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-gray-600 leading-relaxed">
                  <ShieldCheck size={16} className="mt-1 shrink-0 text-emerald-500" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Closing CTA */}
      <section className="mt-20 w-full max-w-5xl px-4 sm:px-6">
        <div className="relative flex flex-col items-center text-center overflow-hidden bg-linear-to-r from-indigo-600 to-blue-500 rounded-2xl px-6 py-14 shadow-2xl shadow-blue-500/30">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 -bottom-16 size-48 rounded-full bg-white/10"
          />
          <Clock aria-hidden className="text-blue-100 mb-4" size={28} />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to mock your first API?
          </h2>
          <p className="text-blue-100 mb-7 max-w-xl">
            Create a project and get a working endpoint in under a minute.
          </p>
          <NavigationButton
            variant="inverse"
            className="text-lg transition-all hover:scale-[1.03] active:scale-[0.98]"
            href={ctaHref}
          >
            <span className="flex items-center gap-1.5">
              Get started
              <ArrowRight size={18} />
            </span>
          </NavigationButton>
        </div>
      </section>
    </div>
  );
}
