"use client";
import { useForgotPasswordViewModel } from "./viemwodel";
import { ErrorText } from "@/app/components/Text/ErrorText";
import { FloatingInput } from "@/app/components/Input/FloatingInput";
import { SubmitButton } from "@/app/components/Button/SubmitButton";
export default function ResetPasswordPage() {
  const { register, handleSubmit, errors } = useForgotPasswordViewModel();

  return (
    <div className="flex justify-center mt-16 h-screen">
      <div className="w-[20rem] h-fit p-4 rounded-md shadow-[0_0_10px_rgba(0,0,0,0.5)] shadow-gray-600">
        <p className="text-3xl font-bold mb-4 text-center"> Reset Password</p>
        <form onSubmit={handleSubmit}>
          <div>
            <FloatingInput
              label="New Password"
              register={register("password")}
              type="password"
              id="password"
              required
            />
            {errors.password && (
              <ErrorText className="text-end mt-1" message={errors.password.message} />
            )}
          </div>

          <div className="my-4">
            <FloatingInput
              label="Confirm Password"
              register={register("confirmPassword")}
              type="password"
              id="confirm-password"
              required
            />

            {errors.confirmPassword && (
              <ErrorText className="text-end mt-1" message={errors.confirmPassword.message} />
            )}
          </div>
          <SubmitButton label="Submit" className="w-full mt-8" />
        </form>
      </div>
    </div>
  );
}
