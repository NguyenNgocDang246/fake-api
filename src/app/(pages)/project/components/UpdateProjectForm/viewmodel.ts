import React, { useRef } from "react";
import { useModal } from "@/app/components/Wrapper/Modal/ModalWrapper";
import { UpdateProjectForm, UpdateProjectFormHandles } from "./UpdateProjectForm";
import { ClientUpdateProjectDTO } from "@/models/project.model";
export const useUpdateProjectViewModel = ({
  public_id,
  old_data,
}: {
  public_id: string;
  old_data: ClientUpdateProjectDTO;
}) => {
  const formRef = useRef<UpdateProjectFormHandles>(null);
  const modal = useModal();
  const openUpdateProjectModal = () => {
    modal?.openModal({
      type: "form",
      props: {
        title: "Update project",
        onSubmit: async () => {
          const result = await formRef.current?.submit?.();
          return result ?? false;
        },
        children: React.createElement(UpdateProjectForm, { ref: formRef, public_id, old_data }),
      },
    });
  };
  return { openUpdateProjectModal };
};
