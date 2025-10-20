"use client";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { ActionButton } from "@/app/components/Button/ActionButton";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { CircleCheck, AlertCircle } from "lucide-react";
import { Spinner } from "@/app/components/Loading/Spinner";
import { useVerifyEmailViewModel } from "@/app/auth/email/verify/viewmodel";
import { useResendEmailViewModel } from "@/app/auth/email/verify/components/ResendEmailForm/viewmodel";

export default function VerifyEmailPage() {
  const { isLoading, message, error } = useVerifyEmailViewModel();
  const { openResendEmailModal } = useResendEmailViewModel();
  return (
    <div>
      {isLoading ? (
        <div className="flex justify-center items-center mt-24">
          <Spinner size={60} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 max-w-[32rem] mx-auto text-center mt-10">
          <AlertCircle className="text-red-500" size={80} />
          <div className="text-4xl font-semibold">Email Verification Failed!</div>
          <div>{message}</div>
          <div className="flex flex-col w-full mt-10 gap-2">
            <ActionButton
              onClick={() => {
                openResendEmailModal();
              }}
              className="bg-gray-900 text-white hover:bg-gray-800 hover:text-blue-400"
            >
              Resend Verification Email
            </ActionButton>
            <div className="flex gap-2 w-full">
              <NavigationButton href={PAGE_ROUTES.AUTH.LOGIN} className="flex-1 border">
                Continue to Login
              </NavigationButton>
              <NavigationButton href={PAGE_ROUTES.HOME} className="flex-1 border">
                Back to Home
              </NavigationButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 max-w-[32rem] mx-auto text-center mt-10">
          <CircleCheck className="text-green-500" size={80} />
          <div className="text-4xl font-semibold">Email Verified!</div>
          <div>{message}</div>
          <div className="flex flex-col gap-2 w-full mt-10">
            <NavigationButton
              href={PAGE_ROUTES.AUTH.LOGIN}
              className="bg-blue-800 text-white hover:bg-gray-800 hover:text-blue-400"
            >
              Continue to Login
            </NavigationButton>
            <NavigationButton href={PAGE_ROUTES.HOME} className="border">
              Back to Home
            </NavigationButton>
          </div>
        </div>
      )}
    </div>
  );
}
