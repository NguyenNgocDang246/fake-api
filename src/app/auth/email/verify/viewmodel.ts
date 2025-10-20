import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import api from "@/app/libs/helpers/api_call";
import { ApiSuccessResponse, ApiErrorResponse } from "@/models/api_response.model";
import { API_ROUTES } from "@/app/libs/routes";
import { useEffect, useState, useRef } from "react";

export const useVerifyEmailViewModel = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<boolean>(false);

  const verifyEmailMutation = useMutation<ApiSuccessResponse, ApiErrorResponse, string>({
    mutationFn: (data) => api.post(API_ROUTES.AUTH.EMAIL.VERIFY, { token: data }),
    onSuccess: () => {
      setMessage("Your email has been successfully verified. You are all set to get started");
    },
    onError: (error) => {
      const data = error as ApiErrorResponse;
      setMessage(data.message);
      setError(true);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const effectRan = useRef(false);
  useEffect(() => {
    if (effectRan.current) return;
    effectRan.current = true;
    if (token) {
      setIsLoading(true);
      verifyEmailMutation.mutate(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isLoading, message, error };
};
