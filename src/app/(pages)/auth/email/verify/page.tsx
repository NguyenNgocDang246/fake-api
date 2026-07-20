import { CircleCheck, AlertCircle } from "lucide-react";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { PAGE_ROUTES, API_ROUTES } from "@/app/libs/routes";
import api from "@/app/libs/helpers/api_call.server";
import { ApiErrorResponse } from "@/models/api_response.model";
import { ResendVerificationButton } from "@/app/(pages)/auth/email/verify/ResendVerificationButton";

async function verifyEmail(
  token: string | undefined,
): Promise<{ success: boolean; message: string }> {
  if (!token) {
    return { success: false, message: "Verification token is missing." };
  }
  try {
    await api.post(API_ROUTES.AUTH.EMAIL.VERIFY, { token });
    return {
      success: true,
      message: "Your email has been successfully verified. You are all set to get started",
    };
  } catch (err) {
    const error = err as ApiErrorResponse;
    return { success: false, message: error.message ?? "Email verification failed." };
  }
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const { success, message } = await verifyEmail(token);

  if (!success) {
    return (
      <div className="flex flex-col items-center gap-4 max-w-[32rem] mx-auto text-center mt-10">
        <AlertCircle className="text-red-500" size={80} />
        <div className="text-4xl font-semibold">Email Verification Failed!</div>
        <div>{message}</div>
        <div className="flex flex-col w-full mt-10 gap-2">
          <ResendVerificationButton />
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
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 max-w-[32rem] mx-auto text-center mt-10">
      <CircleCheck className="text-green-500" size={80} />
      <div className="text-4xl font-semibold">Email Verified!</div>
      <div>{message}</div>
      <div className="flex flex-col gap-2 w-full mt-10">
        <NavigationButton href={PAGE_ROUTES.AUTH.LOGIN} variant="primary">
          Continue to Login
        </NavigationButton>
        <NavigationButton href={PAGE_ROUTES.HOME} className="border">
          Back to Home
        </NavigationButton>
      </div>
    </div>
  );
}
