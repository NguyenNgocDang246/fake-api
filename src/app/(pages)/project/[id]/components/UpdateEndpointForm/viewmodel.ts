import React, { useRef } from "react";
import { useModal } from "@/app/components/Wrapper/Modal/ModalWrapper";
import { EndpointRoutes } from "@/app/libs/routes";
import { UpdateEndpointForm, UpdateEndpointFormHandles } from "./UpdateEndpointForm";
import { ClientUpdateEndpointByIdDTO } from "@/models/endpoint/endpoint.model";

export interface OpenUpdateEndpointOptions {
  endpointGroupId: string;
  endpointId: string;
  old_data: ClientUpdateEndpointByIdDTO;
  hasStoredPlan: boolean;
  projectId?: string | undefined;
  endpointRoutes?: EndpointRoutes | undefined;
  aiAvailable?: boolean | undefined;
}

export const useUpdateEndpointViewModel = () => {
  const formRef = useRef<UpdateEndpointFormHandles>(null);
  const modal = useModal();
  const openUpdateEndpointModal = (options: OpenUpdateEndpointOptions) => {
    modal?.openModal({
      type: "form",
      props: {
        title: "Update endpoint",
        size: "xlarge",
        onSubmit: async () => {
          const result = await formRef.current?.submit?.();
          return result ?? false;
        },
        children: React.createElement(UpdateEndpointForm, { ...options, ref: formRef }),
      },
    });
  };
  return { openUpdateEndpointModal };
};
