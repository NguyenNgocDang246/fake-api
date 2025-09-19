"use client";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import Image from "next/image";
import { DropdownButton } from "@/app/components/Button/DropdownButton";
import { LogoutButton } from "@/app/components/Button/LogoutButton";
import { TextLink } from "@/app/components/Link/TextLink";
import { useAuth } from "@/app/components/Wrapper/Auth/AuthWrapper";
import { PAGE_ROUTES } from "@/app/libs/routes";

export function UserHeader() {
  const { user } = useAuth();
  return (
    <div className="flex justify-between px-[6rem] py-4">
      <TextLink href={PAGE_ROUTES.HOME} className="font-bold text-4xl">
        Fake API
      </TextLink>
      <div className="flex justify-between items-center gap-4">
        <NavigationButton href="" label="Docs" />
        <DropdownButton
          label={
            <Image
              src="/assets/user_icon.png"
              alt="avatar"
              width={24}
              height={24}
              className="rounded-full"
            />
          }
          position="right"
          boxClassName="w-52 bg-gray-200"
          title={`Hello, ${user?.name}`}
          options={[<LogoutButton key="logout" />]}
          onSelect={() => {}}
        />
      </div>
    </div>
  );
}
