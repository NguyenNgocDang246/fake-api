"use client";
import { useForgotPasswordViewModel } from "./viemwodel";
import { ErrorText } from "@/app/components/Text/ErrorText";
import { PasswordInput } from "@/app/components/Input/PasswordInput";
import { SubmitButton } from "@/app/components/Button/SubmitButton";
export default function ResetPasswordPage() {
  const { register, handleSubmit, errors } = useForgotPasswordViewModel();

  return (
    <div className="flex justify-center mt-16">
      <div className="w-[20rem] h-fit p-4 rounded-md bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] shadow-gray-600">
        <p className="text-3xl font-bold mb-4 text-center"> Reset Password</p>
        <form onSubmit={handleSubmit}>
          <div>
            <PasswordInput
              label="New Password"
              register={register("password")}
              id="password"
              required
            />
            {errors.password && (
              <ErrorText className="text-end mt-1" message={errors.password.message} />
            )}
          </div>

          <div className="my-4">
            <PasswordInput
              label="Confirm Password"
              register={register("confirmPassword")}
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
