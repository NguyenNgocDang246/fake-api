import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginSchema, LoginDTO, LoginWithGoogleResponseDTO } from "@/models/auth.model";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { PAGE_ROUTES, API_ROUTES } from "@/app/libs/routes";
import api from "@/app/libs/helpers/api_call.client";
import { useQueryClient } from "@tanstack/react-query";
import Notify from "@/app/components/Notify";

export function useLoginViewModel() {
  const [message, setMessage] = useState<string>("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDTO>({
    resolver: zodResolver(LoginSchema),
  });
  const router = useRouter();
  const queryClient = useQueryClient();

  const onSubmit = async (data: LoginDTO) => {
    try {
      const res = (await api.post(API_ROUTES.AUTH.LOGIN, data)).data as ApiSuccessResponse;
      void res;
      queryClient.clear();
      router.replace(PAGE_ROUTES.PROJECT);
    } catch (error) {
      const data = error as ApiErrorResponse;
      setMessage(data.message);
      Notify.error(data.message);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const res = (await api.get(API_ROUTES.AUTH.GOOGLE.LOGIN))
        .data as ApiSuccessResponse<LoginWithGoogleResponseDTO>;
      const url = res.data?.url;
      if (url) {
        router.push(url);
      }
    } catch (error) {
      const data = error as ApiErrorResponse;
      setMessage(data.message);
      Notify.error(data.message);
    }
  };

  return { register, handleSubmit: handleSubmit(onSubmit), loginWithGoogle, errors, message };
}
