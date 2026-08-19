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
} from "lucide-react";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { TextLink } from "@/app/components/Link/TextLink";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";
import { CodeBlock } from "@/app/(pages)/docs/components/CodeBlock";
import { mockEndpointUrl } from "@/app/libs/helpers/mock_url";
import { WarningCallout } from "@/app/(pages)/docs/components/WarningCallout";
import { DocsToc } from "@/app/(pages)/docs/components/DocsToc";

export const metadata: Metadata = {
  title: "Fake API Docs",
  description:
    "Learn how to create projects, define mock endpoints, and call your Fake API URLs from your app.",
};

const TOC = [
  { id: "introduction", label: "Introduction" },
  { id: "account", label: "Account & Login" },
  { id: "projects", label: "Create a Project" },
  { id: "endpoint-groups", label: "Endpoint Groups" },
  { id: "endpoints", label: "Create Endpoints" },
  { id: "manage-endpoints", label: "Edit, Delete & Copy URL" },
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
    description: "Select Forgot Password? on the login page and follow the email instructions to reset it.",
  },
];

const PROJECT_STEPS = [
  { step: "1", title: "Click Create new", description: "On the Project page, start a new project." },
  { step: "2", title: "Name it", description: "Enter a Name (required) and an optional Description." },
  { step: "3", title: "Save", description: "Your project appears in the list with its own public_id." },
];

const ENDPOINT_FIELDS = [
  { field: "Method", detail: "GET, POST, PUT, PATCH, or DELETE" },
  { field: "Path", detail: "Must start with /, e.g. /api/users, /api/users/1" },
  { field: "Response body", detail: "Valid JSON returned to the client" },
  { field: "Delay (ms)", detail: "Simulated latency, default 0" },
  { field: "Status Code", detail: "Default 200. If set to 204, the body is empty" },
];

const ERROR_CODES = [
  { code: "404", title: "Not Found", detail: "No endpoint matches the requested path." },
  { code: "405", title: "Method Not Allowed", detail: "The path is correct but the method doesn't match." },
];

const TIPS = [
  "Follow RESTful naming: plural resources (/api/users), details (/api/users/123), sub-resources (/api/users/123/orders).",
  "Group related endpoints into the same Endpoint Group so they're easy to find and manage.",
  "Keep response JSON concise, only include fields you actually need, with realistic sample data.",
  "Create multiple endpoints for different data states, e.g. an active user and an inactive user.",
  "Use status_code and response_body together to simulate success, validation errors, and server errors.",
  "Use delay_ms to test loading states (1000-2000ms), timeouts (a high delay), or retry logic (delay plus an error status).",
  "Back up your projectId somewhere safe, e.g. a .env file, since it's the key clients use to call your mock API and can't be recovered if lost.",
];

export default async function DocsPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN;

  return (
    <div className="flex flex-col items-center pb-20">
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
        <TextLink href={PAGE_ROUTES.HOME} variant="muted" className="flex items-center gap-1 text-sm">
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
              Each project you create gets a unique public <code className="text-sm bg-gray-100 rounded px-1.5 py-0.5">projectId</code>.
              You attach this to a path and define the JSON body, HTTP status code, and delay for each
              endpoint. The final URL format is:
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
              After logging in, you&apos;ll land on the Project management page, this is where all your
              mock APIs are organized.
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
              <strong>public_id</strong>, that&apos;s the <code className="text-sm bg-gray-100 rounded px-1.5 py-0.5">projectId</code>{" "}
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
              page, on mobile, use the dropdown menu instead. Select a group to view and configure its
              endpoints.
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
                  <strong>Edit or delete:</strong> use the ⋮ menu on a group to rename it, or delete it
                  along with all endpoints inside.
                </span>
              </li>
            </ul>
          </section>

          {/* Create Endpoints */}
          <section id="endpoints" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-3">Create endpoints</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Endpoints define how the mock API responds when it&apos;s called. Select an Endpoint Group,
              click Create new, and fill in:
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
  "status_code": 200
}`}</CodeBlock>
            <p className="text-gray-600 leading-relaxed mt-4 mb-6">
              Click Save, the endpoint list updates right away with the new endpoint.
            </p>

            <h3 className="text-lg font-semibold mb-2">Dynamic routes</h3>
            <p className="text-gray-600 leading-relaxed mb-3">
              Prefix a path segment with <code className="text-sm bg-gray-100 rounded px-1.5 py-0.5">:</code>{" "}
              to turn it into a dynamic parameter that matches any value, for example{" "}
              <code className="text-sm bg-gray-100 rounded px-1.5 py-0.5">/api/users/:id</code>. That
              single endpoint responds to <code className="text-sm bg-gray-100 rounded px-1.5 py-0.5">/api/users/1</code>,{" "}
              <code className="text-sm bg-gray-100 rounded px-1.5 py-0.5">/api/users/42</code>, and any
              other value in that position, so you don&apos;t need a separate endpoint per id.
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
              <li>Return the response_body with the configured status_code</li>
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
