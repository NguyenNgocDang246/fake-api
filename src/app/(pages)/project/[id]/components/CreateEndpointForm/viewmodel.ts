import React, { useRef } from "react";
import { useModal } from "@/app/components/Wrapper/Modal/ModalWrapper";
import { EndpointRoutes } from "@/app/libs/routes";
import { CreateEndpointForm, CreateEndpointFormHandles } from "./CreateEndpointForm";

export interface OpenCreateEndpointOptions {
  endpointGroupId: string;
  projectId?: string | undefined;
  endpointRoutes?: EndpointRoutes | undefined;
  aiAvailable?: boolean | undefined;
  onCreated?: (() => void) | undefined;
}

export const useCreateEndpointViewModel = () => {
  const formRef = useRef<CreateEndpointFormHandles>(null);
  const modal = useModal();
  const openCreateEndpointModal = (options: OpenCreateEndpointOptions) => {
    modal?.openModal({
      type: "form",
      props: {
        title: "Create new endpoint",
        size: "xlarge",
        onSubmit: async () => {
          const result = await formRef.current?.submit?.();
          return result ?? false;
        },
        children: React.createElement(CreateEndpointForm, { ...options, ref: formRef }),
      },
    });
  };
  return { openCreateEndpointModal };
};
