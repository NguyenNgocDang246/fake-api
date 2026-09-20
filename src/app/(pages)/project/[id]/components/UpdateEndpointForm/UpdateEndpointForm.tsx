"use client";
import { forwardRef, useImperativeHandle, useRef } from "react";
import Notify from "@/app/components/Notify";
import customResolver from "@/app/(pages)/project/[id]/components/EndpointForm/customResolver";
import { useFieldArray, useForm } from "react-hook-form";
import {
  ClientUpdateEndpointByIdDTO,
  EndpointInfoDTO,
} from "@/models/endpoint/endpoint.model";
import { EndpointForm } from "@/app/(pages)/project/[id]/components/EndpointForm/EndpointForm";
import { applyAiQuota } from "@/app/(pages)/project/[id]/components/AiEndpointSection/AiEndpointSection";
import { useScenarioLimit } from "@/app/(pages)/project/[id]/components/EndpointForm/useScenarioLimit";
import {
  ScenarioDesigns,
  blankScenario,
  storedPlansOf,
  toClientEndpoint,
  withScenarioPlans,
} from "@/app/(pages)/project/[id]/components/EndpointForm/scenarioPayload";
import { API_ROUTES, EndpointRoutes } from "@/app/libs/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import api from "@/app/libs/helpers/api_call.client";
import { QUERY_KEY, STALETIME } from "@/app/components/Wrapper/QueryClient/Constants";
import { Spinner } from "@/app/components/Loading/Spinner";
import buildUrl from "@/app/libs/helpers/url_builder";
import { usePathname } from "next/navigation";

export interface UpdateEndpointFormHandles {
  submit: () => Promise<boolean>;
}

export interface UpdateEndpointFormProps {
  endpointGroupId: string;
  endpointId: string;
  // All three default to how the project page has always worked. The trial box on the home
  // page has no project id in its URL and talks to the guest prefix instead.
  projectId?: string | undefined;
  endpointRoutes?: EndpointRoutes | undefined;
  aiAvailable?: boolean | undefined;
  maxScenarios?: number | undefined;
}

// The list ships one scenario per endpoint, the one answering, so the pager's other pages are
// fetched here. Rendering the body only once they arrive is what lets `useForm` mount on the real
// values: `JsonEditor` measures itself once and a later `reset` would not move it.
export const UpdateEndpointForm = forwardRef<UpdateEndpointFormHandles, UpdateEndpointFormProps>(
  (props, ref) => {
    const pathname = usePathname();
    const pathnameSplit = pathname.split("/");
    const projectId = props.projectId ?? pathnameSplit[pathnameSplit.length - 1] ?? "";
    const endpointRoutes = props.endpointRoutes ?? API_ROUTES.ENDPOINT;

    const endpointState = useQuery<EndpointInfoDTO, ApiErrorResponse>({
      queryKey: [QUERY_KEY.ENDPOINT.ONE, props.endpointId],
      queryFn: async () => {
        const res = (
          await api.get(
            buildUrl(endpointRoutes.GET_BY_ID, {
              projectId,
              endpointGroupId: props.endpointGroupId,
              endpointId: props.endpointId,
            })
          )
        ).data as ApiSuccessResponse;
        return res.data as EndpointInfoDTO;
      },
      staleTime: STALETIME,
    });

    if (!endpointState.data) {
      return (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      );
    }

    return (
      <UpdateEndpointFormBody
        {...props}
        ref={ref}
        projectId={projectId}
        endpointRoutes={endpointRoutes}
        endpoint={endpointState.data}
      />
    );
  }
);

UpdateEndpointForm.displayName = "UpdateEndpointForm";

interface UpdateEndpointFormBodyProps extends UpdateEndpointFormProps {
  projectId: string;
  endpointRoutes: EndpointRoutes;
  endpoint: EndpointInfoDTO;
}

const UpdateEndpointFormBody = forwardRef<
  UpdateEndpointFormHandles,
  UpdateEndpointFormBodyProps
>((props, ref) => {
    const {
      register,
      handleSubmit,
      control,
      setValue,
      formState: { errors, submitCount },
    } = useForm<ClientUpdateEndpointByIdDTO>({
      resolver: customResolver,
      defaultValues: toClientEndpoint(props.endpoint),
    });

    const queryClient = useQueryClient();
    const { projectId, endpointRoutes } = props;

    const scenarioLimit = useScenarioLimit();
    const { fields, append, remove } = useFieldArray({ control, name: "scenarios" });

    // Beside the form rather than in it: the blueprint carries `.default()`s, so its zod input and
    // output types differ and a `Resolver` cannot hold both. Keyed by the field array's row key,
    // because removing a page shifts every index after it.
    const designsRef = useRef<ScenarioDesigns>(new Map());

    const updateEndpointMutation = useMutation<
      ApiSuccessResponse,
      ApiErrorResponse,
      ClientUpdateEndpointByIdDTO
    >({
      mutationFn: (data) =>
        api.put(
          buildUrl(endpointRoutes.UPDATE_BY_ID, {
            projectId,
            endpointGroupId: props.endpointGroupId,
            endpointId: props.endpointId,
          }),
          withScenarioPlans(data, fields.map((field) => field.id), designsRef.current),
        ),
      onSuccess() {
        Notify.success("Updated endpoint");
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ENDPOINT.ALL] });
        // An edit that leaves the blueprint stale has the server redesign it, which spends one
        // of the day's calls.
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.USER.USAGE] });
      },
      onError: (error) => {
        // A save refused for want of a design carries the count that refused it, so the AI card
        // shows why without waiting on a refetch.
        applyAiQuota(queryClient, error.errors);
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
        setValue={setValue}
        submitCount={submitCount}
        projectId={projectId}
        endpointGroupId={props.endpointGroupId}
        storedPlans={storedPlansOf(props.endpoint)}
        aiAvailable={props.aiAvailable ?? true}
        maxScenarios={props.maxScenarios ?? scenarioLimit}
        scenarioKeys={fields.map((field) => field.id)}
        onAddScenario={() => append(blankScenario(`Scenario ${fields.length + 1}`))}
        onRemoveScenario={remove}
        onDesign={(index, design) => {
          const key = fields[index]?.id;
          if (key) designsRef.current.set(key, design);
        }}
      />
    );
});

UpdateEndpointFormBody.displayName = "UpdateEndpointFormBody";
