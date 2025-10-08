"use client";

import { createContext, useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { UserInfoDTO } from "@/models/user.model";
import api from "@/app/libs/helpers/api_call";
import { API_ROUTES, PAGE_ROUTES } from "@/app/libs/routes";
import { ApiSuccessResponse } from "@/models/api_response.model";
import { Spinner } from "@/app/components/Loading/Spinner";
import { LoadingDots } from "@/app/components/Loading/LoadingDots";
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

export const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();

  const { data: user, isLoading } = useQuery<UserInfoDTO | null>({
    queryKey: [QUERY_KEY.AUTH.CHECK],
    queryFn: fetchUser,
    staleTime: STALETIME,
    retry: 0,
    enabled: pathname !== PAGE_ROUTES.AUTH.LOGIN && pathname !== PAGE_ROUTES.AUTH.REGISTER,
  });

  // Kiểm tra auth khi pathname thay đổi
  useEffect(() => {
    const currentPath = pathname;
    if (
      !isLoading &&
      !user &&
      currentPath !== PAGE_ROUTES.AUTH.LOGIN &&
      currentPath !== PAGE_ROUTES.AUTH.REGISTER &&
      currentPath !== PAGE_ROUTES.HOME &&
      currentPath !== PAGE_ROUTES.AUTH.PASSWORD.RESET
    ) {
      router.push(PAGE_ROUTES.AUTH.LOGIN);
    }
  }, [isLoading, user, pathname, router]);

  if (
    isLoading ||
    (!user &&
      pathname !== PAGE_ROUTES.AUTH.LOGIN &&
      pathname !== PAGE_ROUTES.AUTH.REGISTER &&
      pathname !== PAGE_ROUTES.HOME &&
      pathname !== PAGE_ROUTES.AUTH.PASSWORD.RESET)
  ) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-8">
        <Spinner size={60} />
        <LoadingDots text="Please wait" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user: user ?? null, loading: isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
