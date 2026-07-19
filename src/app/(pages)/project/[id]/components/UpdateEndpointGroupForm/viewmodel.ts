import React, { useRef } from "react";
import { useModal } from "@/app/components/Wrapper/Modal/ModalWrapper";
import { UpdateEndpointGroupForm, UpdateEndpointGroupFormHandles } from "./UpdateEndpointGroupForm";
import { ClientUpdateEndpointGroupByIdDTO } from "@/models/endpoint_group.model";
export const useUpdateEndpointGroupViewModel = ({
  public_id,
  old_data,
}: {
  public_id: string;
  old_data: ClientUpdateEndpointGroupByIdDTO;
}) => {
  const formRef = useRef<UpdateEndpointGroupFormHandles>(null);
  const modal = useModal();
  const openUpdateEndpointGroupModal = () => {
    modal?.openModal({
      type: "form",
      props: {
        title: "Update endpoint group",
        onSubmit: async () => {
          const result = await formRef.current?.submit?.();
          return result ?? false;
        },
        children: React.createElement(UpdateEndpointGroupForm, {
          ref: formRef,
          public_id,
          old_data,
        }),
      },
    });
  };
  return { openUpdateEndpointGroupModal };
};
