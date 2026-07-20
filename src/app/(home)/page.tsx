import {
  Sparkles,
  Code2,
  SlidersHorizontal,
  Clock,
  FolderKanban,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";

const FEATURES = [
  {
    icon: Code2,
    title: "Any HTTP method",
    description: "Define GET, POST, PUT, PATCH, or DELETE endpoints, each with its own path.",
  },
  {
    icon: SlidersHorizontal,
    title: "Custom status & body",
    description: "Return the exact status code and JSON response body your app expects.",
  },
  {
    icon: Clock,
    title: "Simulated latency",
    description: "Add an artificial delay to an endpoint to test loading and timeout states.",
  },
  {
    icon: FolderKanban,
    title: "Projects & groups",
    description: "Keep endpoints organized by project and endpoint group as your mocks grow.",
  },
  {
    icon: Link2,
    title: "Instant public URL",
    description: "Every endpoint gets a shareable URL the moment you create it - no deploy step.",
  },
  {
    icon: ShieldCheck,
    title: "Private to your account",
    description: "Sign in and every project you create stays scoped to your own account.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Create a project",
    description: "Sign up and spin up a project to hold your mock endpoints.",
  },
  {
    step: "2",
    title: "Add endpoints",
    description: "Group endpoints, then set the method, path, status code, and response body.",
  },
  {
    step: "3",
    title: "Call your API",
    description: "Use the generated URL straight from your app, tests, or Postman.",
  },
];

const PRIMARY_CTA_CLASSES =
  "text-lg bg-linear-to-r from-indigo-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25";

export default async function Home() {
  const user = await getCurrentUser();
  const DOMAIN = process.env["NEXT_PUBLIC_DOMAIN"];
  const docsUrl = process.env["NEXT_PUBLIC_DOCS_URL"] || "./";
  const ctaHref = user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN;

  return (
    <div className="font-sans flex flex-col items-center py-12">
      {/* Hero */}
      <section className="flex flex-col items-center px-4 sm:px-6 text-center">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full px-3 py-1 mb-5">
          <Sparkles size={14} />
          No backend required
        </span>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-black mb-4 max-w-3xl">
          Mock APIs in seconds
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mb-8">
          Define custom endpoints with your own HTTP methods, status codes, response bodies, and
          even simulated latency - so you can build and test your frontend without waiting on a real
          backend.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <NavigationButton className={PRIMARY_CTA_CLASSES} href={ctaHref}>
            Get started
          </NavigationButton>
          <NavigationButton
            className="text-lg border-2 border-gray-300 hover:bg-gray-100"
            href={docsUrl}
            target="_blank"
          >
            View docs
          </NavigationButton>
        </div>
      </section>

      {/* Live example */}
      <section className="mt-14 w-full max-w-xl px-4 sm:px-6">
        <div className="rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="flex items-center gap-1.5 bg-gray-800 px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-red-400" />
            <span className="size-2.5 rounded-full bg-yellow-400" />
            <span className="size-2.5 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-gray-400">Example request</span>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-4 text-sm overflow-x-auto">
            <span className="text-green-400 font-semibold">GET</span>{" "}
            {`${DOMAIN}/6V7sc4oUGQto/api/user/1`}
            {`\n\n`}
            {`{\n    "id": "1",\n    "name": "John Doe",\n    "email": "john@example.com"\n}`}
          </pre>
        </div>
      </section>

      {/* Features */}
      <section className="mt-20 w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
          Everything you need to fake a backend
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-center size-10 rounded-lg bg-blue-100 text-blue-700 mb-4">
                <Icon size={20} />
              </div>
              <h3 className="font-semibold mb-1.5">{title}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-20 w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {STEPS.map(({ step, title, description }) => (
            <div key={step} className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center size-10 rounded-full bg-linear-to-r from-indigo-600 to-blue-500 text-white font-bold mb-4">
                {step}
              </div>
              <h3 className="font-semibold mb-1.5">{title}</h3>
              <p className="text-sm text-gray-600 max-w-xs">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mt-20 w-full max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center bg-linear-to-r from-indigo-600 to-blue-500 rounded-2xl px-6 py-12 shadow-lg">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to mock your first API?
          </h2>
          <p className="text-blue-100 mb-6 max-w-xl">
            Create a project and get a working endpoint in under a minute.
          </p>
          <NavigationButton
            className="text-lg bg-white text-blue-700 hover:bg-blue-50"
            href={ctaHref}
          >
            Get started
          </NavigationButton>
        </div>
      </section>
    </div>
  );
}
