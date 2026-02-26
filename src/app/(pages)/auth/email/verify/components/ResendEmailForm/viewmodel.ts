import React, { useRef } from "react";
import { useModal } from "@/app/components/Wrapper/Modal/ModalWrapper";
import { ResendEmailForm, ResendEmailFormHandles } from "./ResendEmailForm";
export const useResendEmailViewModel = () => {
  const formRef = useRef<ResendEmailFormHandles>(null);
  const modal = useModal();
  const openResendEmailModal = () => {
    modal?.openModal({
      type: "form",
      props: {
        title: "Enter your email address",
        onSubmit: async () => {
          const result = await formRef.current?.submit?.();
          return result ?? false;
        },
        children: React.createElement(ResendEmailForm, { ref: formRef }),
      },
    });
  };
  return { openResendEmailModal };
};
