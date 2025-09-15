"use client";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { PAGE_ROUTES } from "@/app/libs/routes";
export function GuestHeader() {
  return (
    <div className="flex justify-between px-[6rem] py-4">
      <div className="font-bold text-4xl">Fake API</div>
      <div className="flex justify-between items-center gap-4">
        <NavigationButton href="./" label="Docs" />
        <NavigationButton href={PAGE_ROUTES.AUTH.LOGIN} label="Login" className="border-2" />
      </div>
    </div>
  );
}
