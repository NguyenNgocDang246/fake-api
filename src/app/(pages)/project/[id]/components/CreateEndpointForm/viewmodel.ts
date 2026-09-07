import React, { useRef } from "react";
import { useModal } from "@/app/components/Wrapper/Modal/ModalWrapper";
import { CreateEndpointForm, CreateEndpointFormHandles } from "./CreateEndpointForm";
export const useCreateEndpointViewModel = () => {
  const formRef = useRef<CreateEndpointFormHandles>(null);
  const modal = useModal();
  const openCreateEndpointModal = (endpointGroupId: string) => {
    modal?.openModal({
      type: "form",
      props: {
        title: "Create new endpoint",
        size: "xlarge",
        onSubmit: async () => {
          const result = await formRef.current?.submit?.();
          return result ?? false;
        },
        children: React.createElement(CreateEndpointForm, { endpointGroupId, ref: formRef }),
      },
    });
  };
  return { openCreateEndpointModal };
};
