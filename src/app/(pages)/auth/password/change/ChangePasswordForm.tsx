"use client";

import { useChangePasswordViewModel } from "@/app/(pages)/auth/password/change/viewmodel";
import { PasswordInput } from "@/app/components/Input/PasswordInput";
import { SubmitButton } from "@/app/components/Button/SubmitButton";
import { ErrorText } from "@/app/components/Text/ErrorText";

export function ChangePasswordForm() {
  const { register, handleSubmit, errors } = useChangePasswordViewModel();

  return (
    <div className="flex justify-center mt-16">
      <div className="w-[20rem] h-fit p-4 rounded-md shadow-[0_0_10px_rgba(0,0,0,0.5)] shadow-gray-600">
        <p className="text-3xl font-bold mb-4 text-center"> Change Password</p>
        <form onSubmit={handleSubmit}>
          <div>
            <PasswordInput
              label="Current Password"
              register={register("oldPassword")}
              id="old-password"
              required
            />
            {errors.oldPassword && (
              <ErrorText className="text-end mt-1" message={errors.oldPassword.message} />
            )}
          </div>

          <div className="my-4">
            <PasswordInput
              label="New Password"
              register={register("newPassword")}
              id="new-password"
              required
            />
            {errors.newPassword && (
              <ErrorText className="text-end mt-1" message={errors.newPassword.message} />
            )}
          </div>

          <div className="my-4">
            <PasswordInput
              label="Confirm New Password"
              register={register("confirmNewPassword")}
              id="confirm-new-password"
              required
            />
            {errors.confirmNewPassword && (
              <ErrorText className="text-end mt-1" message={errors.confirmNewPassword.message} />
            )}
          </div>
          <SubmitButton label="Submit" className="w-full mt-8" />
        </form>
      </div>
    </div>
  );
}
