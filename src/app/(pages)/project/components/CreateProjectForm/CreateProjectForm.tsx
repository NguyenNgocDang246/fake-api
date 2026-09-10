"use client";
import { forwardRef, useImperativeHandle } from "react";
import Notify from "@/app/components/Notify";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ClientCreateProjectDTO, ClientCreateProjectSchema } from "@/models/project.model";
import { ProjectForm } from "@/app/(pages)/project/components/ProjectForm/ProjectForm";
import { API_ROUTES } from "@/app/libs/routes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import api from "@/app/libs/helpers/api_call.client";
import { QUERY_KEY } from "@/app/components/Wrapper/QueryClient/Constants";

export interface CreateProjectFormHandles {
  submit: () => Promise<boolean>;
}

export const CreateProjectForm = forwardRef<CreateProjectFormHandles>((props, ref) => {
  void props;
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, submitCount },
  } = useForm<ClientCreateProjectDTO>({
    resolver: zodResolver(ClientCreateProjectSchema),
    // A new project starts open to every origin, which is what the column defaults say too.
    defaultValues: { cors_enabled: true, cors_origins: [], cors_allow_credentials: false },
  });
  const queryClient = useQueryClient();
  const createProjectMutation = useMutation<
    ApiSuccessResponse,
    ApiErrorResponse,
    ClientCreateProjectDTO
  >({
    mutationFn: (data) => api.post(API_ROUTES.PROJECT.CREATE, data),
    onSuccess() {
      reset();
      Notify.success("Created project");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PROJECT.ALL] });
    },
    onError: (error) => {
      Notify.error(error.message);
    },
  });
  const onSubmit = async (data: ClientCreateProjectDTO): Promise<boolean> => {
    try {
      await createProjectMutation.mutateAsync(data);
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
    <ProjectForm
      register={register}
      control={control}
      errors={errors}
      setValue={setValue}
      submitCount={submitCount}
    />
  );
});

CreateProjectForm.displayName = "CreateProjectForm";
