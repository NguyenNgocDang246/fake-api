import React, { useRef } from "react";
import { useModal } from "@/app/components/Wrapper/Modal/ModalWrapper";
import { ForgotPasswordForm, ForgotPasswordFormHandles } from "./ForgotPasswordForm";
export const useForgotPasswordViewModel = () => {
  const formRef = useRef<ForgotPasswordFormHandles>(null);
  const modal = useModal();
  const openForgotPasswordModal = () => {
    modal?.openModal({
      type: "form",
      props: {
        title: "Enter your email address",
        onSubmit: async () => {
          const result = await formRef.current?.submit?.();
          return result ?? false;
        },
        children: React.createElement(ForgotPasswordForm, { ref: formRef }),
      },
    });
  };
  return { openForgotPasswordModal };
};
