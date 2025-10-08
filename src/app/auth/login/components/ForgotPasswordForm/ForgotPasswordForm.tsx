"use client";
import { forwardRef, useImperativeHandle } from "react";
import Notify from "@/app/components/Notify";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { GetUserByEmailDTO, GetUserByEmailSchema } from "@/models/user.model";
import { FloatingInput } from "@/app/components/Input/FloatingInput";
import { ErrorText } from "@/app/components/Text/ErrorText";
import { API_ROUTES } from "@/app/libs/routes";
import { useMutation } from "@tanstack/react-query";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import api from "@/app/libs/helpers/api_call";

export interface ForgotPasswordFormHandles {
  submit: () => Promise<boolean>;
}

export const ForgotPasswordForm = forwardRef<ForgotPasswordFormHandles>((props, ref) => {
  void props;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GetUserByEmailDTO>({
    resolver: zodResolver(GetUserByEmailSchema),
  });
  const ForgotPasswordMutation = useMutation<
    ApiSuccessResponse,
    ApiErrorResponse,
    GetUserByEmailDTO
  >({
    mutationFn: (data) => api.post(API_ROUTES.AUTH.PASSWORD.FORGOT, data),
    onSuccess() {
      reset();
      Notify.success("Please check your email to reset your password.");
    },
    onError: (error) => {
      Notify.error(error.message);
    },
  });
  const onSubmit = async (data: GetUserByEmailDTO): Promise<boolean> => {
    try {
      await ForgotPasswordMutation.mutateAsync(data);
      return true;
    } catch (error) {
      const data = (error as { data: ApiErrorResponse }).data;
      void data;
      return false;
    }
  };

  useImperativeHandle(ref, () => ({
    submit: async () => {
      let isValid = false;

      await handleSubmit(
        async (data) => {
          isValid = await onSubmit(data); // onSubmit trả về true/false
        },
        (errors) => {
          void errors;
          isValid = false;
        }
      )();

      return isValid;
    },
  }));
  return (
    <div className="flex flex-col gap-4">
      <div>
        <FloatingInput label="Email" register={register("email")} type="email" id="email" />
        {errors.email && <ErrorText message={errors.email.message} />}
      </div>
    </div>
  );
});

ForgotPasswordForm.displayName = "ForgotPasswordForm";
