"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/components/Wrapper/Auth/AuthWrapper";
import { GuestHeader } from "@/app/components/Wrapper/Header/GuestHeader";
import { UserHeader } from "@/app/components/Wrapper/Header/UserHeader";
import { HeaderSkeleton } from "./HeaderSkeleton";

export function HeaderWrapper() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return <HeaderSkeleton />;
  }

  if (user) {
    return <UserHeader />;
  }

  return <GuestHeader />;
}
