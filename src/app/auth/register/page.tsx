"use client";

import { useRegisterViewModel } from "@/app/auth/register/viewmodel";
import { FloatingInput } from "@/app/components/Input/FloatingInput";
import { SubmitButton } from "@/app/components/Button/SubmitButton";
import { TextLink } from "@/app/components/Link/TextLink";
import { ErrorText } from "@/app/components/Text/ErrorText";
import { PAGE_ROUTES } from "@/app/libs/routes";

export default function RegisterPage() {
  const { register, handleSubmit, errors, message } = useRegisterViewModel();
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-1/4 h-fit p-4 rounded-md shadow-[0_0_10px_rgba(0,0,0,0.5)] shadow-gray-600">
        <p className="text-3xl font-bold mb-4 text-center"> Register</p>
        <div className="text-center mt-1">{message && <ErrorText message={message} />}</div>

        <form onSubmit={handleSubmit}>
          <div className="my-4">
            <FloatingInput label="Name" register={register("name")} type="text" id="name" />

            {errors.password && (
              <ErrorText className="text-end mt-1" message={errors.password.message} />
            )}
          </div>

          <div className="my-4">
            <FloatingInput label="Email" register={register("email")} type="email" id="email" />
            {errors.email && <ErrorText className="text-end mt-1" message={errors.email.message} />}
          </div>

          <div className="my-4">
            <FloatingInput
              label="Password"
              register={register("password")}
              type="password"
              id="password"
            />
            {errors.password && (
              <ErrorText className="text-end mt-1" message={errors.password.message} />
            )}
          </div>

          <SubmitButton className="mt-8" label="Sign Up" />
        </form>
        <div className="text-center my-4">
          <span>
            Already have an account?{" "}
            <TextLink className="text-red-500 hover:underline" href={PAGE_ROUTES.AUTH.LOGIN}>
              Login
            </TextLink>
          </span>
        </div>
      </div>
    </div>
  );
}
