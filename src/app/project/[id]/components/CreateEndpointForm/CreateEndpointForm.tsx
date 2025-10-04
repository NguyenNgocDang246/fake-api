"use client";
import { forwardRef, useImperativeHandle } from "react";
import Notify from "@/app/components/Notify";
import customResolver from "./customResolver";
import { useForm } from "react-hook-form";
import { ClientCreateEndpointDTO } from "@/models/endpoint.model";
import { DefaultInput } from "@/app/components/Input/DefaultInput";
import { ErrorText } from "@/app/components/Text/ErrorText";
import { SelectInput } from "@/app/components/Input/SelectInput";
import { TextArea } from "@/app/components/Input/TextArea";
import { API_ROUTES } from "@/app/libs/routes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import api from "@/app/libs/helpers/api_call";
import { QUERY_KEY } from "@/app/components/Wrapper/QueryClient/Constants";
import buildUrl from "@/app/libs/helpers/url_builder";
import { usePathname } from "next/navigation";

export interface CreateEndpointFormHandles {
  submit: () => Promise<boolean>;
}

export interface CreateEndpointFormProps {
  endpointGroupId: string;
}

const httpMethods: { label: string; value: string }[] = [
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "PATCH", label: "PATCH" },
  { value: "DELETE", label: "DELETE" },
];

export const CreateEndpointForm = forwardRef<CreateEndpointFormHandles, CreateEndpointFormProps>(
  (props, ref) => {
    const {
      register,
      handleSubmit,
      reset,
      formState: { errors },
    } = useForm<ClientCreateEndpointDTO>({
      resolver: customResolver,
    });

    const queryClient = useQueryClient();
    const pathname = usePathname();
    const pathnameSplit = pathname.split("/");
    const projectId = pathnameSplit[pathnameSplit.length - 1];

    const createEndpointMutation = useMutation<
      ApiSuccessResponse,
      ApiErrorResponse,
      ClientCreateEndpointDTO
    >({
      mutationFn: (data) =>
        api.post(
          buildUrl(API_ROUTES.ENDPOINT.CREATE, {
            projectId,
            endpointGroupId: props.endpointGroupId,
          }),
          data
        ),
      onSuccess() {
        reset();
        Notify.success("Created endpoint");
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ENDPOINT.ALL] });
      },
      onError: (error) => {
        Notify.error(error.message);
      },
    });

    const onSubmit = async (data: ClientCreateEndpointDTO): Promise<boolean> => {
      try {
        await createEndpointMutation.mutateAsync(data);
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
        <div className="flex items-start gap-4">
          <div className="flex-1 flex flex-col gap-1">
            <SelectInput
              className="w-full"
              label="Method"
              id="method"
              options={httpMethods}
              register={register("method")}
            />
            {errors.method && <ErrorText message={errors.method.message} />}
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <DefaultInput
              className="w-full"
              label="Path"
              register={register("path")}
              type="text"
              id="path"
              placeholder="/api/user"
            />
            {errors.path && <ErrorText message={errors.path.message} />}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <TextArea
            label="Response body"
            register={register("response_body")}
            id="response_body"
            placeholder={`{ "message": "Success" }`}
          />
          {errors.response_body && <ErrorText message={errors.response_body.message} />}
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-1 flex flex-col gap-1">
            <DefaultInput
              className="w-full"
              label="Delay (ms)"
              register={register("delay_ms")}
              type="text"
              id="delay_ms"
              placeholder="100"
              defaultValue="0"
            />
            {errors.delay_ms && <ErrorText message={errors.delay_ms.message} />}
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <DefaultInput
              className="w-full"
              label="Status Code"
              register={register("status_code")}
              type="text"
              id="status_code"
              placeholder="200"
            />
            {errors.status_code && <ErrorText message={errors.status_code.message} />}
          </div>
        </div>
      </div>
    );
  }
);

CreateEndpointForm.displayName = "CreateEndpointForm";
