"use client";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { IconButton } from "@/app/components/Button/IconButton";
export function UserHeader() {
  return (
    <div className="flex justify-between px-[6rem] py-4">
      <div className="font-bold text-4xl">Fake API</div>
      <div className="flex justify-between items-center gap-4">
        <NavigationButton href="./" label="Docs" />
        <IconButton
          icon={{ src: "/assets/user_icon.png", alt: "Login", width: 32, height: 32 }}
          onClick={() => {}}
        />
      </div>
    </div>
  );
}
