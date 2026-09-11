"use client";
import Image from "next/image";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { GuidesMenu } from "@/app/components/Wrapper/Header/GuidesMenu";
import { TextLink } from "@/app/components/Link/TextLink";
import { PAGE_ROUTES } from "@/app/libs/routes";
export function GuestHeader() {
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
      <div className="flex justify-between items-center gap-6">
        <GuidesMenu />
        <NavigationButton
          href={PAGE_ROUTES.DOCS}
          label="Docs"
          target="_blank"
          variant="ghost"
          className="p-0"
        />
        <NavigationButton
          href={PAGE_ROUTES.MARKETING.FAQ}
          label="FAQ"
          variant="ghost"
          className="p-0"
        />
        <NavigationButton href={PAGE_ROUTES.AUTH.LOGIN} label="Login" variant="primary" />
      </div>
    </div>
  );
}
