import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { LoginSchema, LoginDTO } from "@/models/auth.model";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { AUTH_MESSAGES } from "./constants";
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

  const onSubmit = async (data: LoginDTO) => {
    try {
      const res = (await api.post("/api/auth/login", data)).data as ApiSuccessResponse;
      void res;
      setMessage(AUTH_MESSAGES.SUCCESS);
      window.location.href = "/";
    } catch (error) {
      const data = (error as { data: ApiErrorResponse }).data;
      console.log(data.message);
      setMessage(data.message);
    }
  };

  return { register, handleSubmit: handleSubmit(onSubmit), errors, message };
}
