import React, { useRef } from "react";
import { useModal } from "@/app/components/Wrapper/Modal/ModalWrapper";
import { CreateEndpointGroupForm, CreateEndpointGroupFormHandles } from "./CreateEndpointGroupForm";
export const useCreateEndpointGroupViewModel = () => {
  const formRef = useRef<CreateEndpointGroupFormHandles>(null);
  const modal = useModal();
  const openCreateEndpointGroupModal = () => {
    modal?.openModal({
      type: "form",
      props: {
        title: "Create new endpoint group",
        onSubmit: async () => {
          const result = await formRef.current?.submit?.();
          return result ?? false;
        },
        children: React.createElement(CreateEndpointGroupForm, { ref: formRef }),
      },
    });
  };
  return { openCreateEndpointGroupModal };
};
