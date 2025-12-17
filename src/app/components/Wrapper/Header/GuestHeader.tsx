"use client";
import Image from "next/image";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { TextLink } from "@/app/components/Link/TextLink";
import { PAGE_ROUTES } from "@/app/libs/routes";
export function GuestHeader() {
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
      <div className="flex justify-between items-center gap-4">
        <NavigationButton href={docs_url} label="Docs" target="_blank" />
        <NavigationButton href={PAGE_ROUTES.AUTH.LOGIN} label="Login" className="border-2" />
      </div>
    </div>
  );
}
