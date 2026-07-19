import { cache } from "react";
import api from "@/app/libs/helpers/api_call.server";
import { API_ROUTES } from "@/app/libs/routes";
import { UserInfoDTO } from "@/models/user.model";
import { ApiSuccessResponse } from "@/models/api_response.model";

export const getCurrentUser = cache(async (): Promise<UserInfoDTO | null> => {
  try {
    const res = (await api.get(API_ROUTES.USER.GET)) as ApiSuccessResponse<UserInfoDTO>;
    return res.data;
  } catch {
    return null;
  }
});
