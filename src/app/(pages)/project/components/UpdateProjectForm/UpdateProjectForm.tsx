"use client";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import {
  ClientUpdateProjectDTO,
  ClientUpdateProjectSchema,
  MAX_CORS_ORIGINS,
} from "@/models/project.model";
import { FloatingInput } from "@/app/components/Input/FloatingInput";
import { DefaultInput } from "@/app/components/Input/DefaultInput";
import { Switch } from "@/app/components/Input/Switch";
import { PillTabs } from "@/app/components/Tabs/PillTabs";
import { ErrorText } from "@/app/components/Text/ErrorText";
import { API_ROUTES } from "@/app/libs/routes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import api from "@/app/libs/helpers/api_call.client";
import { QUERY_KEY } from "@/app/components/Wrapper/QueryClient/Constants";
import buildUrl from "@/app/libs/helpers/url_builder";
import Notify from "@/app/components/Notify";

export interface UpdateProjectFormHandles {
  submit: () => Promise<boolean>;
}
export interface UpdateProjectFormProps {
  public_id: string;
  old_data: ClientUpdateProjectDTO;
}

export const UpdateProjectForm = forwardRef<UpdateProjectFormHandles, UpdateProjectFormProps>(
  (props, ref) => {
    const {
      register,
      handleSubmit,
      reset,
      control,
      setValue,
      formState: { errors, submitCount },
    } = useForm<ClientUpdateProjectDTO>({
      resolver: zodResolver(ClientUpdateProjectSchema),
      defaultValues: props.old_data,
    });

    const [tab, setTab] = useState<"details" | "cors">("details");
    const corsEnabled = useWatch({ control, name: "cors_enabled" });
    const origins = useWatch({ control, name: "cors_origins" }) ?? [];

    const detailsHasError = !!(errors.name || errors.description);
    const corsHasError = !!(
      errors.cors_enabled ||
      errors.cors_origins ||
      errors.cors_allow_credentials
    );

    // A message on the hidden panel is a message nobody reads, so a failed submit opens the
    // panel carrying it. Details wins when both are wrong: its fields come first.
    useEffect(() => {
      if (submitCount === 0) return;

      if (detailsHasError) setTab("details");
      else if (corsHasError) setTab("cors");
    }, [submitCount, detailsHasError, corsHasError]);

    // `useFieldArray` wants objects, and this list is plain strings, so the two buttons write
    // the whole array back rather than going through it.
    const setOrigins = (next: string[]) =>
      setValue("cors_origins", next, { shouldDirty: true, shouldValidate: submitCount > 0 });
    const queryClient = useQueryClient();
    const updateProjectMutation = useMutation<
      ApiSuccessResponse,
      ApiErrorResponse,
      ClientUpdateProjectDTO
    >({
      mutationFn: (data) =>
        api.put(buildUrl(API_ROUTES.PROJECT.UPDATE_BY_ID, { projectId: props.public_id }), data),
      onSuccess() {
        reset();
        Notify.success("Updated project");
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PROJECT.ALL] });
      },
      onError: (error) => {
        Notify.error(error.message);
      },
    });
    const onSubmit = async (data: ClientUpdateProjectDTO): Promise<boolean> => {
      try {
        await updateProjectMutation.mutateAsync(data);
        return true;
      } catch (error) {
        const data = (error as { data: ApiErrorResponse }).data;
        void data;
        return false;
      }
    };

    useImperativeHandle(ref, () => ({
      submit: async () => {
        let isValid = false;

        await handleSubmit(
          async (data) => {
            isValid = await onSubmit(data); // onSubmit trả về true/false
          },
          (errors) => {
            void errors;
            isValid = false;
          },
        )();

        return isValid;
      },
    }));
    return (
      <div className="flex flex-col gap-4">
        <PillTabs
          ariaLabel="Project settings"
          value={tab}
          onChange={(id) => setTab(id as "details" | "cors")}
          tabs={[
            { id: "details", label: "Details", ...(detailsHasError ? { dot: "error" as const } : {}) },
            {
              id: "cors",
              label: "CORS",
              ...(corsHasError
                ? { dot: "error" as const }
                : !corsEnabled || origins.length > 0
                  ? { dot: "accent" as const }
                  : {}),
            },
          ]}
        />

        <div className={tab === "details" ? "flex flex-col gap-4" : "hidden"}>
          <div>
            <FloatingInput label="Name" register={register("name")} type="text" id="name" />
            {errors.name && <ErrorText message={errors.name.message} />}
          </div>
          <div>
            <FloatingInput
              label="Description"
              register={register("description")}
              type="text"
              id="description"
            />
            {errors.description && <ErrorText message={errors.description.message} />}
          </div>
        </div>

        <div className={tab === "cors" ? "flex flex-col gap-4" : "hidden"}>
          <p className="text-xs text-gray-500">
            Who may call this project&apos;s mock endpoints from a browser. Out of the box any page
            can, so there is nothing here you have to set.
          </p>

          <div>
            <Switch
              id="cors_enabled"
              label="Allow browsers to call this project"
              register={register("cors_enabled")}
            />
            {!corsEnabled && (
              <p className="mt-1 text-xs text-gray-500">
                Turned off, a browser blocks every call to this project. Handy for checking how your
                app behaves when that happens. Tools like curl still get an answer.
              </p>
            )}
            {errors.cors_enabled && <ErrorText message={errors.cors_enabled.message} />}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-800">Allowed origins</p>
            <p className="text-xs text-gray-500">
              Leave this empty and any origin can call. Add one to let only those through.
            </p>

            {origins.map((_, index) => (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex items-end gap-2">
                  <DefaultInput
                    className="w-full"
                    label="Origin"
                    hideLabel
                    register={register(`cors_origins.${index}`)}
                    type="text"
                    id={`cors_origins.${index}`}
                    placeholder="http://localhost:3000"
                  />
                  <button
                    type="button"
                    onClick={() => setOrigins(origins.filter((_, i) => i !== index))}
                    aria-label={`Remove origin ${index + 1}`}
                    className="h-[2.6rem] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-600 transition hover:border-red-300 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
                {errors.cors_origins?.[index] && (
                  <ErrorText message={errors.cors_origins[index]?.message} />
                )}
              </div>
            ))}

            {typeof errors.cors_origins?.message === "string" && (
              <ErrorText message={errors.cors_origins.message} />
            )}

            {origins.length < MAX_CORS_ORIGINS && (
              <button
                type="button"
                onClick={() => setOrigins([...origins, ""])}
                className="self-start rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 transition hover:border-blue-400 hover:text-blue-600"
              >
                Add origin
              </button>
            )}
          </div>

          <div>
            <Switch
              id="cors_allow_credentials"
              label="Send cookies and auth headers with the call"
              register={register("cors_allow_credentials")}
              disabled={origins.length === 0}
            />
            {origins.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">
                Add an origin first. A browser refuses credentials when any origin is allowed.
              </p>
            )}
            {errors.cors_allow_credentials && (
              <ErrorText message={errors.cors_allow_credentials.message} />
            )}
          </div>
        </div>
      </div>
    );
  },
);

UpdateProjectForm.displayName = "UpdateProjectForm";
