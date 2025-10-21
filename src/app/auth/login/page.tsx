"use client";

import { useLoginViewModel } from "@/app/auth/login/viewmodel";
import { FloatingInput } from "@/app/components/Input/FloatingInput";
import { SubmitButton } from "@/app/components/Button/SubmitButton";
import { TextLink } from "@/app/components/Link/TextLink";
import { ErrorText } from "@/app/components/Text/ErrorText";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { IconButton } from "@/app/components/Button/IconButton";
import { useForgotPasswordViewModel } from "./components/ForgotPasswordForm/viewmodel";

export default function LoginPage() {
  const { register, handleSubmit, loginWithGoogle, errors, message } = useLoginViewModel();
  const { openForgotPasswordModal } = useForgotPasswordViewModel();
  return (
    <div className="flex justify-center">
      <div className="w-[20rem] h-fit p-4 rounded-md shadow-[0_0_10px_rgba(0,0,0,0.5)] shadow-gray-600">
        <p className="text-3xl font-bold mb-4 text-center"> Login</p>
        <div className="text-center mt-1">{message && <ErrorText message={message} />}</div>
        <form onSubmit={handleSubmit}>
          <div>
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
            <FloatingInput
              label="Password"
              register={register("password")}
              type="password"
              id="password"
              required
            />

            {errors.password && (
              <ErrorText className="text-end mt-1" message={errors.password.message} />
            )}
          </div>
          <SubmitButton label="Login" className="w-full mt-8" />
        </form>
        <IconButton
          icon={{ src: "/assets/google-icon.svg", alt: "google", width: 20, height: 20 }}
          label="Login with Google"
          className="w-full mt-4"
          onClick={() => {
            loginWithGoogle();
          }}
        />
        <div className="flex justify-between my-4">
          <TextLink className="underline hover:text-blue-700" href={PAGE_ROUTES.AUTH.REGISTER}>
            Sign Up
          </TextLink>
          <div
            className="text-red-500 cursor-pointer hover:underline"
            onClick={openForgotPasswordModal}
          >
            Forgot Password?
          </div>
        </div>
      </div>
    </div>
  );
}
