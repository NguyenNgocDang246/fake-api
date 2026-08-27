"use client";
import { forwardRef, useImperativeHandle, useRef } from "react";
import Notify from "@/app/components/Notify";
import customResolver from "@/app/(pages)/project/[id]/components/EndpointForm/customResolver";
import { useForm } from "react-hook-form";
import { ClientUpdateEndpointByIdDTO } from "@/models/endpoint/endpoint.model";
import { EndpointForm } from "@/app/(pages)/project/[id]/components/EndpointForm/EndpointForm";
import {
  EndpointDesign,
  planEnvelopeOf,
} from "@/app/(pages)/project/[id]/components/AiEndpointSection/AiEndpointSection";
import { API_ROUTES } from "@/app/libs/routes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import api from "@/app/libs/helpers/api_call.client";
import { QUERY_KEY } from "@/app/components/Wrapper/QueryClient/Constants";
import buildUrl from "@/app/libs/helpers/url_builder";
import { usePathname } from "next/navigation";

export interface UpdateEndpointFormHandles {
  submit: () => Promise<boolean>;
}

export interface UpdateEndpointFormProps {
  endpointGroupId: string;
  endpointId: string;
  old_data: ClientUpdateEndpointByIdDTO;
  // Beside `old_data` rather than in it: that DTO is `.strict()` and feeds the form.
  hasStoredPlan: boolean;
}

export const UpdateEndpointForm = forwardRef<UpdateEndpointFormHandles, UpdateEndpointFormProps>(
  (props, ref) => {
    const {
      register,
      handleSubmit,
      control,
      formState: { errors, submitCount },
    } = useForm<ClientUpdateEndpointByIdDTO>({
      resolver: customResolver,
      defaultValues: props.old_data,
    });

    const queryClient = useQueryClient();
    const pathname = usePathname();
    const pathnameSplit = pathname.split("/");
    const projectId = pathnameSplit[pathnameSplit.length - 1] ?? "";

    // Beside the form rather than in it: the blueprint carries `.default()`s, so its zod input and
    // output types differ and a `Resolver` cannot hold both.
    const designRef = useRef<EndpointDesign | null>(null);

    const updateEndpointMutation = useMutation<
      ApiSuccessResponse,
      ApiErrorResponse,
      ClientUpdateEndpointByIdDTO
    >({
      mutationFn: (data) =>
        api.put(
          buildUrl(API_ROUTES.ENDPOINT.UPDATE_BY_ID, {
            projectId,
            endpointGroupId: props.endpointGroupId,
            endpointId: props.endpointId,
          }),
          { ...data, ...planEnvelopeOf(designRef.current) },
        ),
      onSuccess() {
        Notify.success("Updated endpoint");
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ENDPOINT.ALL] });
      },
      onError: (error) => {
        Notify.error(error.message);
      },
    });

    const onSubmit = async (data: ClientUpdateEndpointByIdDTO): Promise<boolean> => {
      try {
        await updateEndpointMutation.mutateAsync(data);
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
        submitCount={submitCount}
        projectId={projectId}
        endpointGroupId={props.endpointGroupId}
        endpointId={props.endpointId}
        hasStoredPlan={props.hasStoredPlan}
        onDesign={(design) => {
          designRef.current = design;
        }}
      />
    );
  },
);

UpdateEndpointForm.displayName = "UpdateEndpointForm";
