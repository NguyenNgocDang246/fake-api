import React, { useRef } from "react";
import { useModal } from "@/app/components/Wrapper/Modal/ModalWrapper";
import { UpdateEndpointForm, UpdateEndpointFormHandles } from "./UpdateEndpointForm";
import { ClientUpdateEndpointByIdDTO } from "@/models/endpoint.model";
export const useUpdateEndpointViewModel = () => {
  const formRef = useRef<UpdateEndpointFormHandles>(null);
  const modal = useModal();
  const openUpdateEndpointModal = ({
    endpointGroupId,
    endpointId,
    old_data,
  }: {
    endpointGroupId: string;
    endpointId: string;
    old_data: ClientUpdateEndpointByIdDTO;
  }) => {
    modal?.openModal({
      type: "form",
      props: {
        title: "Update new endpoint",
        size: "wide",
        onSubmit: async () => {
          const result = await formRef.current?.submit?.();
          return result ?? false;
        },
        children: React.createElement(UpdateEndpointForm, {
          old_data,
          endpointGroupId,
          endpointId,
          ref: formRef,
        }),
      },
    });
  };
  return { openUpdateEndpointModal };
};
