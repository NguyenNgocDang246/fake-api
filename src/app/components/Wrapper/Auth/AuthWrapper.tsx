"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UserInfoDTO } from "@/models/user.model";
import api from "@/app/libs/helpers/api_call";
import { API_ROUTES } from "@/app/libs/routes";
import { ApiSuccessResponse } from "@/models/api_response.model";
import { Spinner } from "@/app/components/Loading/Spinner";
import { LoadingDots } from "@/app/components/Loading/LoadingDots";
import { PAGE_ROUTES } from "@/app/libs/routes";

interface AuthContextType {
  user: UserInfoDTO | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserInfoDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = (await api.get(API_ROUTES.USER.GET)).data as ApiSuccessResponse<UserInfoDTO>;
        setUser(res.data);
      } catch (err) {
        void err;
        setUser(null);
      } finally {
        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
        await sleep(150);
        setLoading(false);
      }
    };
    const currentPath = pathname;
    if (currentPath !== PAGE_ROUTES.AUTH.LOGIN && currentPath !== PAGE_ROUTES.AUTH.REGISTER)
      checkAuth();
    else {
      setLoading(false);
    }
  }, [pathname]);
  useEffect(() => {
    const currentPath = pathname;
    if (
      currentPath === PAGE_ROUTES.AUTH.LOGIN ||
      currentPath === PAGE_ROUTES.AUTH.REGISTER ||
      currentPath === PAGE_ROUTES.HOME
    )
      return;
    if (!loading && !user) {
      router.push(PAGE_ROUTES.AUTH.LOGIN);
    }
  }, [loading, user, router, pathname]);
  if (loading)
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-8">
        <Spinner size={60} />
        <LoadingDots text="Please wait" />
      </div>
    );
  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
