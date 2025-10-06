import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RegisterSchema, RegisterDTO } from "@/models/auth.model";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { PAGE_ROUTES, API_ROUTES } from "@/app/libs/routes";
import api from "@/app/libs/helpers/api_call";
import Notify from "@/app/components/Notify";

export function useRegisterViewModel() {
  const [message, setMessage] = useState<string>("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterDTO>({
    resolver: zodResolver(RegisterSchema),
  });
  const router = useRouter();

  const onSubmit = async (data: RegisterDTO) => {
    try {
      const res = (await api.post(API_ROUTES.AUTH.REGISTER, data)).data as ApiSuccessResponse;
      void res;
      router.push(PAGE_ROUTES.AUTH.LOGIN);
    } catch (error) {
      console.log(error);
      const data = error as ApiErrorResponse;
      setMessage(data.message);
      Notify.error(data.message);
    }
  };
  return { register, handleSubmit: handleSubmit(onSubmit), errors, message };
}
