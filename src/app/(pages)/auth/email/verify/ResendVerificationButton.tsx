"use client";
import { useResendEmailViewModel } from "@/app/(pages)/auth/email/verify/components/ResendEmailForm/viewmodel";

export function ResendVerificationButton() {
  const { openResendEmailModal } = useResendEmailViewModel();
  return (
    <button
      type="button"
      onClick={() => openResendEmailModal()}
      className="rounded-lg px-4 py-2 font-medium transition-colors outline-0 cursor-pointer disabled:opacity-50 truncate bg-gray-900 text-white hover:bg-gray-800 hover:text-blue-400"
    >
      Resend Verification Email
    </button>
  );
}
