"use client";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { TextLink } from "@/app/components/Link/TextLink";
import { PAGE_ROUTES } from "@/app/libs/routes";
export function GuestHeader() {
  return (
    <div className="flex justify-between px-[6rem] py-4">
      <TextLink href={PAGE_ROUTES.HOME} className="font-bold text-4xl">
        Fake API
      </TextLink>
      <div className="flex justify-between items-center gap-4">
        <NavigationButton href="./" label="Docs" />
        <NavigationButton href={PAGE_ROUTES.AUTH.LOGIN} label="Login" className="border-2" />
      </div>
    </div>
  );
}
