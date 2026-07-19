import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClientResetPasswordDTO, ClientResetPasswordSchema } from "@/models/user.model";
import { API_ROUTES, PAGE_ROUTES } from "@/app/libs/routes";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import api from "@/app/libs/helpers/api_call.client";
import Notify from "@/app/components/Notify";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";

const ClientResetPasswordExtendSchema = ClientResetPasswordSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ClientResetPasswordExtendDTO = z.infer<typeof ClientResetPasswordExtendSchema>;

export const useForgotPasswordViewModel = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ClientResetPasswordExtendDTO>({
    resolver: zodResolver(ClientResetPasswordExtendSchema),
    defaultValues: { token: "" },
  });

  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const value = searchParams.get("token");
    if (value) setValue("token", value);
  }, [searchParams, setValue]);

  const ResetPasswordMutation = useMutation<
    ApiSuccessResponse,
    ApiErrorResponse,
    ClientResetPasswordDTO
  >({
    mutationFn: (data) => api.post(API_ROUTES.AUTH.PASSWORD.RESET, data),
    onSuccess: () => {
      Notify.success("Password reset successfully. Please login now.");
      router.replace(PAGE_ROUTES.AUTH.LOGIN);
    },
    onError: (error) => {
      const data = error as ApiErrorResponse;
      Notify.error(data.message);
    },
  });
  const onSubmit = async (data: ClientResetPasswordExtendDTO) => {
    try {
      const payload: ClientResetPasswordDTO = { password: data.password, token: data.token };
      await ResetPasswordMutation.mutateAsync(payload);
    } catch (error) {
      void error;
    }
  };

  return {
    register,
    handleSubmit: handleSubmit(onSubmit),
    errors,
  };
};
