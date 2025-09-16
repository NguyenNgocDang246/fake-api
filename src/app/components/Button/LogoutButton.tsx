"use client";

import { useRouter } from "next/navigation";
import api from "@/app/libs/helpers/api_call";
import { API_ROUTES, PAGE_ROUTES } from "@/app/libs/routes";

export const LogoutButton: React.FC = () => {
  const router = useRouter();

  const handleLogout = async () => {
    await api.get(API_ROUTES.AUTH.LOGOUT);
    router.push(PAGE_ROUTES.AUTH.LOGIN);
  };

  return <div onClick={handleLogout}>Logout</div>;
};
