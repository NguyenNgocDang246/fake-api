"use client";
import { forwardRef, useImperativeHandle } from "react";
import Notify from "@/app/components/Notify";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ClientUpdateEndpointGroupByIdDTO,
  ClientUpdateEndpointGroupByIdSchema,
} from "@/models/endpoint_group.model";
import { FloatingInput } from "@/app/components/Input/FloatingInput";
import { ErrorText } from "@/app/components/Text/ErrorText";
import { API_ROUTES } from "@/app/libs/routes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import api from "@/app/libs/helpers/api_call";
import { QUERY_KEY } from "@/app/components/Wrapper/QueryClient/Constants";
import buildUrl from "@/app/libs/helpers/url_builder";
import { usePathname } from "next/navigation";

export interface UpdateEndpointGroupFormHandles {
  submit: () => Promise<boolean>;
}
export interface UpdateEndpointGroupFormProps {
  public_id: string;
  old_data: ClientUpdateEndpointGroupByIdDTO;
}

export const UpdateEndpointGroupForm = forwardRef<
  UpdateEndpointGroupFormHandles,
  UpdateEndpointGroupFormProps
>((props, ref) => {
  void props;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientUpdateEndpointGroupByIdDTO>({
    resolver: zodResolver(ClientUpdateEndpointGroupByIdSchema),
    defaultValues: props.old_data,
  });
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const pathnameSplit = pathname.split("/");
  const projectId = pathnameSplit[pathnameSplit.length - 1] ?? "";
  const updateEndpointGroupMutation = useMutation<
    ApiSuccessResponse,
    ApiErrorResponse,
    ClientUpdateEndpointGroupByIdDTO
  >({
    mutationFn: (data) =>
      api.put(
        buildUrl(API_ROUTES.ENDPOINT_GROUP.UPDATE_BY_ID, {
          projectId,
          endpointGroupId: props.public_id,
        }),
        data
      ),
    onSuccess() {
      reset();
      Notify.success("Updated endpoint group");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ENDPOINT_GROUP.ALL] });
    },
    onError: (error) => {
      Notify.error(error.message);
    },
  });
  const onSubmit = async (data: ClientUpdateEndpointGroupByIdDTO): Promise<boolean> => {
    try {
      await updateEndpointGroupMutation.mutateAsync(data);
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
    </div>
  );
});

UpdateEndpointGroupForm.displayName = "UpdateEndpointGroupForm";
