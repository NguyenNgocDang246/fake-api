import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { RegisterSchema, RegisterDTO } from "@/models/auth.model";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { API_ROUTES } from "@/app/libs/routes";
import api from "@/app/libs/helpers/api_call.client";
import Notify from "@/app/components/Notify";
import { armTour } from "@/app/components/Tour/tourStorage";

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

      // Registration starts no session, so the tour cannot run from here. The intent waits in
      // storage until the verified account first reaches the project page.
      armTour(data.email);

      Notify.success("Please check your email to verify your account.");
    } catch (error) {
      console.log(error);
      const data = error as ApiErrorResponse;
      setMessage(data.message);
      Notify.error(data.message);
    }
  };
  return { register, handleSubmit: handleSubmit(onSubmit), errors, message };
}
