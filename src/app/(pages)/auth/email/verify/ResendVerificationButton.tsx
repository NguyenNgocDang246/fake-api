"use client";
import { ActionButton } from "@/app/components/Button/ActionButton";
import { useResendEmailViewModel } from "@/app/(pages)/auth/email/verify/components/ResendEmailForm/viewmodel";

export function ResendVerificationButton() {
  const { openResendEmailModal } = useResendEmailViewModel();
  return (
    <ActionButton
      onClick={() => openResendEmailModal()}
      className="bg-gray-900 text-white hover:bg-gray-800 hover:text-blue-400"
    >
      Resend Verification Email
    </ActionButton>
  );
}
