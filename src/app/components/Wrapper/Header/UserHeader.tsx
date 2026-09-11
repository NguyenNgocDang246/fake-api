"use client";
import Image from "next/image";
import { User, KeyRound } from "lucide-react";
import { DropdownButton } from "@/app/components/Button/DropdownButton";
import { HeaderNav } from "@/app/components/Wrapper/Header/HeaderNav";
import { LogoutButton } from "@/app/components/Button/LogoutButton";
import { TextLink } from "@/app/components/Link/TextLink";
import { useAuth } from "@/app/components/Wrapper/Auth/AuthWrapper";
import { PAGE_ROUTES } from "@/app/libs/routes";

export function UserHeader() {
  const { user } = useAuth();
  return (
    <div className="sticky top-0 z-20 flex justify-between items-center lg:px-24 md:px-16 sm:px-8 px-4 py-4 bg-white border-b border-gray-200">
      <TextLink
        href={PAGE_ROUTES.HOME}
        className="flex items-center gap-3 font-extrabold sm:text-[1.75rem] text-xl text-center text-gray-900"
      >
        <Image
          src="/assets/logo.ico"
          alt="Fake API"
          width={40}
          height={40}
          className="cursor-pointer"
        />
        Fake API
      </TextLink>

      <div className="flex items-center sm:gap-6 gap-3">
        <HeaderNav />
        <DropdownButton
          position="left"
          variant="outline"
          btnClassName="p-0 size-9 flex items-center justify-center rounded-full"
          boxClassName="w-52"
          title={`Hello, ${user?.name}`}
          options={[
            <TextLink
              key="change-password"
              href={PAGE_ROUTES.AUTH.PASSWORD.CHANGE}
              className="flex items-center gap-2"
            >
              <KeyRound size={16} />
              Change Password
            </TextLink>,
            <LogoutButton key="logout" />,
          ]}
          onSelect={() => {}}
        >
          <User size={18} />
        </DropdownButton>
      </div>
    </div>
  );
}
