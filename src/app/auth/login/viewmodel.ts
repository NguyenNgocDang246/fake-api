import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginSchema, LoginDTO } from "@/models/auth.model";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { AUTH_MESSAGES } from "./constants";
import { PAGE_ROUTES, API_ROUTES } from "@/app/libs/routes";
import api from "@/app/libs/helpers/api_call";

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

  const onSubmit = async (data: LoginDTO) => {
    try {
      const res = (await api.post(API_ROUTES.AUTH.LOGIN, data)).data as ApiSuccessResponse;
      void res;
      setMessage(AUTH_MESSAGES.SUCCESS);
      router.replace(PAGE_ROUTES.HOME);
    } catch (error) {
      const data = (error as { data: ApiErrorResponse }).data;
      console.log(data.message);
      setMessage(data.message);
    }
  };

  return { register, handleSubmit: handleSubmit(onSubmit), errors, message };
}
