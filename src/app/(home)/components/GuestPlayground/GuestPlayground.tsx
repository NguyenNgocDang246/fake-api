"use client";

import { ActionButton } from "@/app/components/Button/ActionButton";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { Spinner } from "@/app/components/Loading/Spinner";
import { EndpointItem } from "@/app/(pages)/project/[id]/components/EndpointItem/EndpointItem";
import { ROLE_LIMITS } from "@/server/core/role_limits";
import { GUEST_PROJECT_LIFETIME_IN_SECONDS } from "@/server/services/guest.constants";
import { API_ROUTES, PAGE_ROUTES } from "@/app/libs/routes";
import { mockBaseUrl } from "@/app/libs/helpers/mock_url";
import { useGuestPlaygroundViewModel } from "./viewmodel";

const MAX_ENDPOINTS = ROLE_LIMITS.GUEST.maxEndpointsPerGroup;
const LIFETIME_IN_HOURS = Math.round(GUEST_PROJECT_LIFETIME_IN_SECONDS / (60 * 60));

export function GuestPlayground() {
  const { sandbox, endpoints, isLoading, creating, openCreateModal } =
    useGuestPlaygroundViewModel();

  const isFull = endpoints.length >= MAX_ENDPOINTS;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 mt-24">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-extrabold text-gray-900">Try it right here</h2>
        <p className="mt-2 text-gray-600">
          Build a mock endpoint without an account and call it for real. Up to {MAX_ENDPOINTS}{" "}
          endpoints, no sign up needed.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="font-semibold text-lg">Your endpoints answer on:</div>
        <div className="text-blue-800 py-2 flex flex-nowrap items-center gap-1 whitespace-nowrap overflow-x-auto">
          <span>{mockBaseUrl()}/</span>
          <span className="mx-0.5 px-2 font-medium rounded-md bg-blue-100">
            {sandbox?.project_id ?? ":id"}
          </span>
          <span>/</span>
          <span className="mx-0.5 px-2 font-medium rounded-md bg-blue-100">:path</span>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-gray-500">
            {endpoints.length} of {MAX_ENDPOINTS} endpoints used
          </span>
          {isFull ? (
            <NavigationButton
              href={PAGE_ROUTES.AUTH.REGISTER}
              label="Sign up for more"
              variant="primary"
              className="w-full sm:w-auto"
            />
          ) : (
            <ActionButton
              label={creating ? "Preparing..." : "New Endpoint"}
              variant="create"
              className="w-full sm:w-auto"
              disabled={creating}
              onClick={() => {
                void openCreateModal();
              }}
            />
          )}
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size={40} />
          </div>
        ) : (
          endpoints.map((endpoint) => (
            <div key={endpoint.public_id} className="mb-2">
              <EndpointItem
                {...{
                  public_id: endpoint.public_id,
                  path: endpoint.path,
                  delay_ms: endpoint.delay_ms,
                  method: endpoint.method,
                  status_code: endpoint.status_code,
                  response_body: JSON.stringify(endpoint.response_body),
                  response_headers: endpoint.response_headers,
                  endpoint_groups_id: endpoint.endpoint_groups_id,
                  project_id: sandbox?.project_id ?? "",
                  ai_enabled: endpoint.ai_enabled,
                  ai_fields: endpoint.ai_fields,
                  ai_prompt: endpoint.ai_prompt,
                  ai_unsupported_language: endpoint.ai_unsupported_language,
                  ai_unapplied_hints: endpoint.ai_unapplied_hints,
                  ai_has_plan: endpoint.ai_has_plan,
                  endpointRoutes: API_ROUTES.GUEST.ENDPOINT,
                  aiAvailable: false,
                }}
              />
            </div>
          ))
        )}
      </div>

      <p className="mt-4 text-center text-sm text-gray-500">
        This is a place to try the product, not to build on. Endpoints here are deleted after{" "}
        {LIFETIME_IN_HOURS} hours, anyone holding the URL above can edit or delete them, and they do
        not move to a new account.{" "}
        <a href={PAGE_ROUTES.AUTH.REGISTER} className="font-medium text-blue-700 hover:underline">
          Sign in
        </a>{" "}
        to get your own projects, AI response variants, and mocks nobody else can touch.
      </p>
    </section>
  );
}
