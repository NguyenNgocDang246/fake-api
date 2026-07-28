import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClientChangePasswordDTO, ClientChangePasswordSchema } from "@/models/user.model";
import { API_ROUTES, PAGE_ROUTES } from "@/app/libs/routes";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import api from "@/app/libs/helpers/api_call.client";
import Notify from "@/app/components/Notify";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";

const ClientChangePasswordExtendSchema = ClientChangePasswordSchema.extend({
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords do not match",
  path: ["confirmNewPassword"],
});

type ClientChangePasswordExtendDTO = z.infer<typeof ClientChangePasswordExtendSchema>;

export const useChangePasswordViewModel = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientChangePasswordExtendDTO>({
    resolver: zodResolver(ClientChangePasswordExtendSchema),
  });

  const router = useRouter();

  const ChangePasswordMutation = useMutation<
    ApiSuccessResponse,
    ApiErrorResponse,
    ClientChangePasswordDTO
  >({
    mutationFn: (data) => api.post(API_ROUTES.AUTH.PASSWORD.CHANGE, data),
    onSuccess: () => {
      Notify.success("Password changed successfully.");
      router.replace(PAGE_ROUTES.PROJECT);
    },
    onError: (error) => {
      const data = error as ApiErrorResponse;
      Notify.error(data.message);
    },
  });

  const onSubmit = async (data: ClientChangePasswordExtendDTO) => {
    try {
      const payload: ClientChangePasswordDTO = {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      };
      await ChangePasswordMutation.mutateAsync(payload);
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
