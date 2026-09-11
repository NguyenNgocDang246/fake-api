"use client";
import { forwardRef, useImperativeHandle } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ClientUpdateProjectDTO, ClientUpdateProjectSchema } from "@/models/project.model";
import { ProjectForm } from "@/app/(pages)/project/components/ProjectForm/ProjectForm";
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
        // The project page reads this key for its own CORS switch, so a save here has to reach it.
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PROJECT.ONE, props.public_id] });
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
            isValid = await onSubmit(data); // onSubmit resolves true or false
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
      <ProjectForm
        register={register}
        control={control}
        errors={errors}
        setValue={setValue}
        submitCount={submitCount}
        openOriginsInitially={(props.old_data.cors_origins ?? []).length > 0}
      />
    );
  },
);

UpdateProjectForm.displayName = "UpdateProjectForm";
