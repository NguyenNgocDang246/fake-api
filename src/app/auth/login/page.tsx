"use client";

import { useLoginViewModel } from "@/app/auth/login/viewmodel";
import { FloatingInput } from "@/app/components/Input/FloatingInput";
import { SubmitButton } from "@/app/components/Button/SubmitButton";
import { TextLink } from "@/app/components/Link/TextLink";

export default function LoginPage() {
  const { register, handleSubmit, errors, message } = useLoginViewModel();
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-1/4 p-4 rounded-md shadow-[0_0_10px_rgba(0,0,0,0.5)] shadow-gray-600">
        <p className="text-3xl font-bold mb-4 text-center"> Login</p>
        <p className="text-red-500 text-center mt-1"> {message}</p>
        <form onSubmit={handleSubmit}>
          <div>
            <FloatingInput label="Email" register={register("email")} type="email" id="email" />
            {errors.email && <p className="text-red-500 text-end mt-1">{errors.email.message}</p>}
          </div>

          <div className="my-4">
            <FloatingInput
              label="Password"
              register={register("password")}
              type="password"
              id="password"
            />
            {errors.password && (
              <p className="text-red-500 text-end mt-1">{errors.password.message}</p>
            )}
          </div>
          <SubmitButton label="Login" />
        </form>
        <div className="flex justify-between my-4">
          <TextLink href="/auth/register">Forgot Password?</TextLink>
          <TextLink href="/auth/register">Sign Up</TextLink>
        </div>
      </div>
    </div>
  );
}
