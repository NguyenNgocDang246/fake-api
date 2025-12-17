"use client";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import Image from "next/image";
import { User } from "lucide-react";
import { DropdownButton } from "@/app/components/Button/DropdownButton";
import { LogoutButton } from "@/app/components/Button/LogoutButton";
import { TextLink } from "@/app/components/Link/TextLink";
import { useAuth } from "@/app/components/Wrapper/Auth/AuthWrapper";
import { PAGE_ROUTES } from "@/app/libs/routes";

export function UserHeader() {
  const { user } = useAuth();
  const docs_url = process.env["NEXT_PUBLIC_DOCS_URL"] || "./";
  return (
    <div className="flex justify-between lg:px-24 md:px-16 sm:px-8 px-4 py-4">
      <TextLink
        href={PAGE_ROUTES.HOME}
        className="flex items-center font-bold sm:text-[2rem] text-2xl text-center"
      >
        <Image
          src="/assets/logo.ico"
          alt="Fake API"
          width={60}
          height={60}
          className="cursor-pointer mr-4"
        />
        Fake API
      </TextLink>

      <div className="flex justify-between items-center gap-2">
        <NavigationButton href={docs_url} label="Docs" target="_blank" />
        <DropdownButton
          position="left"
          btnClassName="py-3"
          boxClassName="w-52"
          title={`Hello, ${user?.name}`}
          options={[<LogoutButton key="logout" />]}
          onSelect={() => {}}
        >
          <User size={20} />
        </DropdownButton>
      </div>
    </div>
  );
}
