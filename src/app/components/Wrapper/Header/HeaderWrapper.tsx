"use client";

import { useAuth } from "@/app/components/Wrapper/Auth/AuthWrapper";
import { GuestHeader } from "@/app/components/Wrapper/Header/GuestHeader";
import { UserHeader } from "@/app/components/Wrapper/Header/UserHeader";

export function HeaderWrapper() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return <UserHeader />;
  }

  return <GuestHeader />;
}
