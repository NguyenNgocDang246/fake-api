"use client";
import { forwardRef, useImperativeHandle } from "react";
import Notify from "@/app/components/Notify";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ClientCreateProjectDTO, ClientCreateProjectSchema } from "@/models/project.model";
import { FloatingInput } from "@/app/components/Input/FloatingInput";
import { ErrorText } from "@/app/components/Text/ErrorText";
import { API_ROUTES } from "@/app/libs/routes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import api from "@/app/libs/helpers/api_call";
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
    formState: { errors },
  } = useForm<ClientCreateProjectDTO>({
    resolver: zodResolver(ClientCreateProjectSchema),
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
          console.log("Validation failed:", errors);
          isValid = false;
        }
      )();

      return isValid;
    },
  }));
  return (
    <div className="flex flex-col gap-4">
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
  );
});

CreateProjectForm.displayName = "CreateProjectForm";
