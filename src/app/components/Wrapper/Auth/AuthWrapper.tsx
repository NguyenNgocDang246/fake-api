"use client";

import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { UserInfoDTO } from "@/models/user.model";
import api from "@/app/libs/helpers/api_call.client";
import { API_ROUTES, PAGE_ROUTES } from "@/app/libs/routes";
import { ApiSuccessResponse } from "@/models/api_response.model";
import { QUERY_KEY, STALETIME } from "@/app/components/Wrapper/QueryClient/Constants";

interface AuthContextType {
  user: UserInfoDTO | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

async function fetchUser(): Promise<UserInfoDTO | null> {
  try {
    const res = (await api.get(API_ROUTES.USER.GET)).data as ApiSuccessResponse<UserInfoDTO>;
    return res.data;
  } catch {
    return null;
  }
}

// The query itself, so anything rendered outside this provider can still read the signed-in user.
// A modal renders under `ModalWrapper`, which sits above this wrapper, so its context is empty
// there while the query client, which is above both, still answers.
export const useAuthUser = () => {
  const pathname = usePathname();

  return useQuery<UserInfoDTO | null>({
    queryKey: [QUERY_KEY.AUTH.CHECK],
    queryFn: fetchUser,
    staleTime: STALETIME,
    retry: 0,
    enabled: pathname !== PAGE_ROUTES.AUTH.LOGIN && pathname !== PAGE_ROUTES.AUTH.REGISTER,
  });
};

export const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const { data: user, isLoading } = useAuthUser();

  return (
    <AuthContext.Provider value={{ user: user ?? null, loading: isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
