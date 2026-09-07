"use client";

import { useRegisterViewModel } from "@/app/(pages)/auth/register/viewmodel";
import { FloatingInput } from "@/app/components/Input/FloatingInput";
import { PasswordInput } from "@/app/components/Input/PasswordInput";
import { SubmitButton } from "@/app/components/Button/SubmitButton";
import { TextLink } from "@/app/components/Link/TextLink";
import { ErrorText } from "@/app/components/Text/ErrorText";
import { PAGE_ROUTES } from "@/app/libs/routes";

export function RegisterForm() {
  const { register, handleSubmit, errors, message } = useRegisterViewModel();
  return (
    <div className="flex justify-center">
      <div className="w-[20rem] h-fit p-4 rounded-md bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] shadow-gray-600">
        <p className="text-3xl font-bold mb-4 text-center"> Register</p>
        <div className="text-center mt-1">{message && <ErrorText message={message} />}</div>

        <form onSubmit={handleSubmit}>
          <div className="my-4">
            <FloatingInput
              label="Name"
              register={register("name")}
              type="text"
              id="name"
              required
            />

            {errors.name && <ErrorText className="text-end mt-1" message={errors.name.message} />}
          </div>

          <div className="my-4">
            <FloatingInput
              label="Email"
              register={register("email")}
              type="email"
              id="email"
              required
            />
            {errors.email && <ErrorText className="text-end mt-1" message={errors.email.message} />}
          </div>

          <div className="my-4">
            <PasswordInput
              label="Password"
              register={register("password")}
              id="password"
              required
            />
            {errors.password && (
              <ErrorText className="text-end mt-1" message={errors.password.message} />
            )}
          </div>

          <SubmitButton className="mt-8 w-full" label="Sign Up" />
        </form>
        <div className="text-center my-4">
          <span>
            Already have an account?{" "}
            <TextLink variant="muted" href={PAGE_ROUTES.AUTH.LOGIN}>
              Login
            </TextLink>
          </span>
        </div>
      </div>
    </div>
  );
}
