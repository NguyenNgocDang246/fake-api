"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/app/libs/helpers/api_call.client";
import buildUrl from "@/app/libs/helpers/url_builder";
import { API_ROUTES } from "@/app/libs/routes";
import { ApiErrorResponse, ApiSuccessResponse } from "@/models/api_response.model";
import { ERROR_MESSAGES } from "@/server/core/constants";
import { EndpointInfoDTO } from "@/models/endpoint/endpoint.model";
import {
  GUEST_SANDBOX_STORAGE_KEY,
  QUERY_KEY,
  STALETIME,
} from "@/app/components/Wrapper/QueryClient/Constants";
import Notify from "@/app/components/Notify";
import { useCreateEndpointViewModel } from "@/app/(pages)/project/[id]/components/CreateEndpointForm/viewmodel";

export interface GuestSandbox {
  project_id: string;
  endpoint_group_id: string;
}

function readStoredSandbox(): GuestSandbox | null {
  try {
    const raw = window.localStorage.getItem(GUEST_SANDBOX_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestSandbox>;
    if (!parsed.project_id || !parsed.endpoint_group_id) return null;
    return { project_id: parsed.project_id, endpoint_group_id: parsed.endpoint_group_id };
  } catch {
    return null;
  }
}

export function useGuestPlaygroundViewModel() {
  const queryClient = useQueryClient();
  const [sandbox, setSandbox] = useState<GuestSandbox | null>(null);
  const [creating, setCreating] = useState(false);

  // Read after mount, never during render: the server has no localStorage and the markup would
  // not match.
  useEffect(() => {
    setSandbox(readStoredSandbox());
  }, []);

  const store = useCallback((next: GuestSandbox | null) => {
    setSandbox(next);
    try {
      if (next) window.localStorage.setItem(GUEST_SANDBOX_STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(GUEST_SANDBOX_STORAGE_KEY);
    } catch {
      // A browser refusing storage still gets a working sandbox for this page view.
    }
  }, []);

  const endpointsState = useQuery<EndpointInfoDTO[], ApiErrorResponse>({
    queryKey: [QUERY_KEY.ENDPOINT.ALL, sandbox?.project_id, sandbox?.endpoint_group_id],
    queryFn: async () => {
      const res = (
        await api.get(
          buildUrl(API_ROUTES.GUEST.ENDPOINT.GET_ALL, {
            projectId: sandbox?.project_id ?? "",
            endpointGroupId: sandbox?.endpoint_group_id ?? "",
          })
        )
      ).data as ApiSuccessResponse;
      return (res.data as EndpointInfoDTO[]) ?? [];
    },
    enabled: !!sandbox,
    staleTime: STALETIME,
    retry: 0,
  });

  // A sandbox that expired was deleted outright, so the stored ids now point at nothing. Drop
  // them and let the visitor start over rather than showing an error they cannot act on. The
  // client rejects with the response body, which carries the message but not the status.
  useEffect(() => {
    if (!endpointsState.isError) return;
    const message = endpointsState.error?.message;
    if (message === ERROR_MESSAGES.FORBIDDEN || message === ERROR_MESSAGES.NOT_FOUND) store(null);
  }, [endpointsState.isError, endpointsState.error, store]);

  const ensureSandbox = useCallback(async (): Promise<GuestSandbox | null> => {
    if (sandbox) return sandbox;
    setCreating(true);
    try {
      const res = (await api.post(API_ROUTES.GUEST.SANDBOX)).data as ApiSuccessResponse;
      const next = res.data as GuestSandbox;
      store(next);
      return next;
    } catch (error) {
      Notify.error((error as ApiErrorResponse).message);
      return null;
    } finally {
      setCreating(false);
    }
  }, [sandbox, store]);

  const { openCreateEndpointModal } = useCreateEndpointViewModel();

  const openCreateModal = useCallback(async () => {
    const target = await ensureSandbox();
    if (!target) return;

    // A brand new sandbox has no cached list yet, and the create mutation invalidates the key
    // it does not know about, so seed the query before the modal can succeed.
    queryClient.setQueryData(
      [QUERY_KEY.ENDPOINT.ALL, target.project_id, target.endpoint_group_id],
      (existing: EndpointInfoDTO[] | undefined) => existing ?? []
    );

    openCreateEndpointModal({
      endpointGroupId: target.endpoint_group_id,
      projectId: target.project_id,
      endpointRoutes: API_ROUTES.GUEST.ENDPOINT,
      aiAvailable: false,
    });
  }, [ensureSandbox, openCreateEndpointModal, queryClient]);

  const endpoints = endpointsState.data ?? [];

  return {
    sandbox,
    endpoints,
    isLoading: !!sandbox && !endpointsState.isFetched,
    creating,
    openCreateModal,
  };
}
