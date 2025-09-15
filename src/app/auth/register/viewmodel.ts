import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { RegisterSchema, RegisterDTO } from "@/models/auth.model";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { AUTH_MESSAGES } from "./constants";
import { PAGE_ROUTES, API_ROUTES } from "@/app/libs/routes";
import api from "@/app/libs/helpers/api_call";

export function useRegisterViewModel() {
  const [message, setMessage] = useState<string>("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterDTO>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = async (data: RegisterDTO) => {
    try {
      const res = (await api.post(API_ROUTES.AUTH.REGISTER, data)).data as ApiSuccessResponse;
      void res;
      setMessage(AUTH_MESSAGES.SUCCESS);
      window.location.href = PAGE_ROUTES.AUTH.LOGIN;
    } catch (error) {
      const data = (error as { data: ApiErrorResponse }).data;
      setMessage(data.message);
    }
  };
  return { register, handleSubmit: handleSubmit(onSubmit), errors, message };
}
