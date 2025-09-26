import React, { useRef } from "react";
import { useModal } from "@/app/components/Wrapper/Modal/ModalWrapper";
import { CreateProjectForm, CreateProjectFormHandles } from "./CreateProjectForm";
export const useCreateProjectViewModel = () => {
  const formRef = useRef<CreateProjectFormHandles>(null);
  const modal = useModal();
  const openCreateProjectModal = () => {
    modal?.openModal({
      type: "form",
      props: {
        title: "Create new project",
        onSubmit: async () => {
          const result = await formRef.current?.submit?.();
          return result ?? false;
        },
        children: React.createElement(CreateProjectForm, { ref: formRef }),
      },
    });
  };
  return { openCreateProjectModal };
};
