"use client";
import { forwardRef, useImperativeHandle, useRef } from "react";
import Notify from "@/app/components/Notify";
import customResolver from "@/app/(pages)/project/[id]/components/EndpointForm/customResolver";
import { useFieldArray, useForm } from "react-hook-form";
import { ClientCreateEndpointDTO } from "@/models/endpoint/endpoint.model";
import { EndpointForm } from "@/app/(pages)/project/[id]/components/EndpointForm/EndpointForm";
import { applyAiQuota } from "@/app/(pages)/project/[id]/components/AiEndpointSection/AiEndpointSection";
import { useScenarioLimit } from "@/app/(pages)/project/[id]/components/EndpointForm/useScenarioLimit";
import {
  ScenarioDesigns,
  blankScenario,
  withScenarioPlans,
} from "@/app/(pages)/project/[id]/components/EndpointForm/scenarioPayload";
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
  // The trial box on the home page runs as a role allowed one scenario, so it passes 1 and the
  // pager never appears.
  maxScenarios?: number | undefined;
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
        method: "GET",
        scenarios: [blankScenario("Default")],
        active_scenario: 0,
      },
    });

    const scenarioLimit = useScenarioLimit();
    const { fields, append, remove } = useFieldArray({ control, name: "scenarios" });

    // Beside the form rather than in it: the blueprint carries `.default()`s, so its zod input and
    // output types differ and a `Resolver` cannot hold both. Keyed by the field array's row key,
    // because removing a page shifts every index after it.
    const designsRef = useRef<ScenarioDesigns>(new Map());

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
          withScenarioPlans(data, fields.map((field) => field.id), designsRef.current),
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
        maxScenarios={props.maxScenarios ?? scenarioLimit}
        defaults={{ delay_ms: "0" }}
        scenarioKeys={fields.map((field) => field.id)}
        onAddScenario={() => append(blankScenario(`Scenario ${fields.length + 1}`))}
        onRemoveScenario={remove}
        onDesign={(index, design) => {
          const key = fields[index]?.id;
          if (key) designsRef.current.set(key, design);
        }}
      />
    );
  },
);

CreateEndpointForm.displayName = "CreateEndpointForm";
