import {
  Sparkles,
  Code2,
  SlidersHorizontal,
  Clock,
  FolderKanban,
  Link2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { getCurrentUser } from "@/app/libs/helpers/get_current_user.server";

const FEATURES = [
  {
    icon: Code2,
    title: "Any HTTP method",
    description: "Define GET, POST, PUT, PATCH, or DELETE endpoints, each with its own path.",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    icon: SlidersHorizontal,
    title: "Custom status & body",
    description: "Return the exact status code and JSON response body your app expects.",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    icon: Clock,
    title: "Simulated latency",
    description: "Add an artificial delay to an endpoint to test loading and timeout states.",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    icon: FolderKanban,
    title: "Projects & groups",
    description: "Keep endpoints organized by project and endpoint group as your mocks grow.",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    icon: Link2,
    title: "Instant public URL",
    description: "Every endpoint gets a shareable URL the moment you create it, no deploy step.",
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
  },
  {
    icon: ShieldCheck,
    title: "Private to your account",
    description: "Sign in and every project you create stays scoped to your own account.",
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-600",
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
  "text-lg bg-linear-to-r from-indigo-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.03] active:scale-[0.98]";

export default async function Home() {
  const user = await getCurrentUser();
  const DOMAIN = process.env["NEXT_PUBLIC_DOMAIN"];
  const docsUrl = process.env["NEXT_PUBLIC_DOCS_URL"] || "./";
  const ctaHref = user ? PAGE_ROUTES.PROJECT : PAGE_ROUTES.AUTH.LOGIN;

  return (
    <div className="relative font-sans flex flex-col items-center py-12 overflow-hidden">
      {/* Decorative background glow */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[-160px] -z-10 flex justify-center">
        <div className="size-[560px] rounded-full bg-blue-300/30 blur-3xl" />
        <div className="absolute left-[calc(50%+220px)] top-[80px] size-[280px] rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute right-[calc(50%+220px)] top-[40px] size-[240px] rounded-full bg-purple-200/30 blur-3xl" />
      </div>

      {/* Hero */}
      <section className="flex flex-col items-center px-4 sm:px-6 text-center">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 ring-1 ring-blue-200 rounded-full px-3 py-1 mb-6">
          <Sparkles size={14} />
          No backend required
        </span>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-black mb-5 max-w-3xl">
          Mock APIs in{" "}
          <span className="bg-linear-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
            seconds
          </span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mb-9 leading-relaxed">
          Define custom endpoints with your own HTTP methods, status codes, response bodies, and
          even simulated latency, so you can build and test your frontend without waiting on a
          real backend.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <NavigationButton className={PRIMARY_CTA_CLASSES} href={ctaHref}>
            <span className="flex items-center gap-1.5">
              Get started
              <ArrowRight size={18} />
            </span>
          </NavigationButton>
          <NavigationButton
            className="text-lg border-2 border-gray-300 hover:bg-gray-100 transition-all hover:scale-[1.03] active:scale-[0.98]"
            href={docsUrl}
            target="_blank"
          >
            View docs
          </NavigationButton>
        </div>
      </section>

      {/* Live example */}
      <section className="mt-16 w-full max-w-xl px-4 sm:px-6">
        <div className="rounded-xl shadow-2xl shadow-blue-900/10 overflow-hidden ring-1 ring-black/5">
          <div className="h-1 bg-linear-to-r from-indigo-600 via-blue-500 to-purple-500" />
          <div className="flex items-center gap-1.5 bg-gray-800 px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-red-400" />
            <span className="size-2.5 rounded-full bg-yellow-400" />
            <span className="size-2.5 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-gray-400">Example request</span>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-5 text-sm overflow-x-auto leading-relaxed">
            <span className="inline-block rounded bg-green-500/15 px-1.5 py-0.5 text-xs font-bold text-green-400 align-middle">
              GET
            </span>{" "}
            <span className="text-gray-300">{`${DOMAIN}/6V7sc4oUGQto/api/user/1`}</span>
            {`\n\n`}
            {`{\n    `}
            <span className="text-sky-400">&quot;id&quot;</span>
            {`: `}
            <span className="text-orange-300">&quot;1&quot;</span>
            {`,\n    `}
            <span className="text-sky-400">&quot;name&quot;</span>
            {`: `}
            <span className="text-orange-300">&quot;John Doe&quot;</span>
            {`,\n    `}
            <span className="text-sky-400">&quot;email&quot;</span>
            {`: `}
            <span className="text-orange-300">&quot;john@example.com&quot;</span>
            {`\n}`}
          </pre>
        </div>
      </section>

      {/* Features */}
      <section className="mt-24 w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
          Everything you need to fake a backend
        </h2>
        <p className="text-gray-500 text-center mb-12">
          Built for frontend developers who need realistic data, fast.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, description, iconBg, iconColor }) => (
            <div
              key={title}
              className="group bg-white/80 backdrop-blur border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-transparent transition-all"
            >
              <div
                className={`flex items-center justify-center size-11 rounded-lg mb-4 transition-transform group-hover:scale-110 ${iconBg} ${iconColor}`}
              >
                <Icon size={20} />
              </div>
              <h3 className="font-semibold mb-1.5">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-24 w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-10">
          <div
            aria-hidden
            className="hidden sm:block absolute top-6 left-[16.5%] right-[16.5%] h-0.5 bg-linear-to-r from-indigo-200 via-blue-300 to-indigo-200"
          />
          {STEPS.map(({ step, title, description }) => (
            <div key={step} className="relative flex flex-col items-center text-center">
              <div className="flex items-center justify-center size-12 rounded-full bg-linear-to-r from-indigo-600 to-blue-500 text-white font-bold mb-5 shadow-lg shadow-blue-500/30 ring-4 ring-white">
                {step}
              </div>
              <h3 className="font-semibold mb-1.5">{title}</h3>
              <p className="text-sm text-gray-600 max-w-xs leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mt-24 w-full max-w-5xl px-4 sm:px-6">
        <div className="relative flex flex-col items-center text-center overflow-hidden bg-linear-to-r from-indigo-600 to-blue-500 rounded-2xl px-6 py-14 shadow-2xl shadow-blue-500/30">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 -bottom-16 size-48 rounded-full bg-white/10"
          />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to mock your first API?
          </h2>
          <p className="text-blue-100 mb-7 max-w-xl">
            Create a project and get a working endpoint in under a minute.
          </p>
          <NavigationButton
            className="text-lg bg-white text-blue-700 hover:bg-blue-50 shadow-lg transition-all hover:scale-[1.03] active:scale-[0.98]"
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
