"use client";
import { forwardRef, useImperativeHandle, useRef } from "react";
import Notify from "@/app/components/Notify";
import customResolver from "@/app/(pages)/project/[id]/components/EndpointForm/customResolver";
import { useForm } from "react-hook-form";
import { ClientCreateEndpointDTO } from "@/models/endpoint/endpoint.model";
import { EndpointForm } from "@/app/(pages)/project/[id]/components/EndpointForm/EndpointForm";
import {
  EndpointDesign,
  applyAiQuota,
  planEnvelopeOf,
} from "@/app/(pages)/project/[id]/components/AiEndpointSection/AiEndpointSection";
import { API_ROUTES, EndpointRoutes } from "@/app/libs/routes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import api from "@/app/libs/helpers/api_call.client";
import { QUERY_KEY } from "@/app/components/Wrapper/QueryClient/Constants";
import buildUrl from "@/app/libs/helpers/url_builder";
import { usePathname } from "next/navigation";

export interface CreateEndpointFormHandles {
  submit: () => Promise<boolean>;
}

export interface CreateEndpointFormProps {
  endpointGroupId: string;
  // Both default to how the project page has always worked. The trial box on the home page
  // has no project id in its URL and talks to the guest prefix instead.
  projectId?: string | undefined;
  endpointRoutes?: EndpointRoutes | undefined;
  aiAvailable?: boolean | undefined;
  // Runs once the endpoint exists. The home page's trial box uses it to report the one
  // conversion it cares about, which the project page must not report as well.
  onCreated?: (() => void) | undefined;
}

export const CreateEndpointForm = forwardRef<CreateEndpointFormHandles, CreateEndpointFormProps>(
  (props, ref) => {
    const {
      register,
      handleSubmit,
      reset,
      control,
      setValue,
      formState: { errors, submitCount },
    } = useForm<ClientCreateEndpointDTO>({
      resolver: customResolver,
      defaultValues: {
        ai_enabled: false,
        ai_fields: [],
        ai_prompt: null,
        response_headers: [],
        method: "GET",
        status_code: "200",
      },
    });

    // Beside the form rather than in it: the blueprint carries `.default()`s, so its zod input and
    // output types differ and a `Resolver` cannot hold both.
    const designRef = useRef<EndpointDesign | null>(null);

    const queryClient = useQueryClient();
    const pathname = usePathname();
    const pathnameSplit = pathname.split("/");
    const projectId = props.projectId ?? pathnameSplit[pathnameSplit.length - 1] ?? "";
    const endpointRoutes = props.endpointRoutes ?? API_ROUTES.ENDPOINT;

    const createEndpointMutation = useMutation<
      ApiSuccessResponse,
      ApiErrorResponse,
      ClientCreateEndpointDTO
    >({
      mutationFn: (data) =>
        api.post(
          buildUrl(endpointRoutes.CREATE, {
            projectId,
            endpointGroupId: props.endpointGroupId,
          }),
          { ...data, ...planEnvelopeOf(designRef.current) },
        ),
      onSuccess() {
        reset();
        Notify.success("Created endpoint");
        props.onCreated?.();
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ENDPOINT.ALL] });
        // An AI endpoint saved without a preview designs its blueprint on the server, which
        // spends one of the day's calls.
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.USER.USAGE] });
      },
      onError: (error) => {
        // A save refused for want of a design carries the count that refused it, so the AI card
        // shows why without waiting on a refetch.
        applyAiQuota(queryClient, error.errors);
        Notify.error(error.message);
      },
    });

    const onSubmit = async (data: ClientCreateEndpointDTO): Promise<boolean> => {
      try {
        await createEndpointMutation.mutateAsync(data);
        return true;
      } catch {
        return false;
      }
    };

    useImperativeHandle(ref, () => ({
      submit: async () => {
        let isValid = false;

        await handleSubmit(
          async (data) => {
            isValid = await onSubmit(data);
          },
          () => {
            isValid = false;
          },
        )();

        return isValid;
      },
    }));

    return (
      <EndpointForm
        register={register}
        control={control}
        errors={errors}
        setValue={setValue}
        submitCount={submitCount}
        projectId={projectId}
        endpointGroupId={props.endpointGroupId}
        aiAvailable={props.aiAvailable ?? true}
        defaults={{ delay_ms: "0" }}
        onDesign={(design) => {
          designRef.current = design;
        }}
      />
    );
  },
);

CreateEndpointForm.displayName = "CreateEndpointForm";
