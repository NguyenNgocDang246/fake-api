"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import api from "@/app/libs/helpers/api_call.client";
import { API_ROUTES, PAGE_ROUTES } from "@/app/libs/routes";

export const LogoutButton: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await api.get(API_ROUTES.AUTH.LOGOUT);
    queryClient.clear();
    router.push(PAGE_ROUTES.AUTH.LOGIN);
  };

  return (
    <div onClick={handleLogout} className="flex items-center gap-2 text-red-600">
      <LogOut size={16} />
      Logout
    </div>
  );
};
