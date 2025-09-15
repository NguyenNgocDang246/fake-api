"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/app/components/Wrapper/Auth/AuthWrapper";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { GuestHeader } from "@/app/components/Wrapper/Header/GuestHeader";
import { UserHeader } from "@/app/components/Wrapper/Header/UserHeader";

export function HeaderWrapper() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (pathname === PAGE_ROUTES.AUTH.LOGIN || pathname === PAGE_ROUTES.AUTH.REGISTER) {
    return null;
  }

  if (user) {
    return <UserHeader />;
  }

  return <GuestHeader />;
}
