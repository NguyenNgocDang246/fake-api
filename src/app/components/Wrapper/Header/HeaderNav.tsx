"use client";

import { Menu } from "lucide-react";
import { NavigationButton } from "@/app/components/Button/NavigationButton";
import { DropdownButton } from "@/app/components/Button/DropdownButton";
import { GuidesMenu, GUIDE_LINKS } from "@/app/components/Wrapper/Header/GuidesMenu";
import { TextLink } from "@/app/components/Link/TextLink";
import { PAGE_ROUTES } from "@/app/libs/routes";

export function HeaderNav() {
  return (
    <>
      <div className="hidden sm:flex items-center gap-6">
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
      </div>

      <DropdownButton
        className="sm:hidden"
        position="left"
        variant="outline"
        btnClassName="p-0 size-9 flex items-center justify-center rounded-full"
        // Anchored to the screen, not to the button: the account control sits between the two,
        // and its width is what a `100vw` clamp cannot see. `bottom-auto mt-2` cancels the
        // dropUp flip, whose `bottom-full` would resolve against the screen once this is fixed.
        boxClassName="fixed inset-x-4 ml-auto w-auto max-w-64 bottom-auto mt-2 max-h-[calc(100vh-5rem)] overflow-y-auto"
        // The guides keep their own mock/bug line, then Docs and FAQ sit under one more.
        dividerAfter={[2, 5]}
        options={[
          ...GUIDE_LINKS.map(({ href, label }) => (
            <TextLink key={href} href={href} className="w-full">
              {label}
            </TextLink>
          )),
          <TextLink key="docs" href={PAGE_ROUTES.DOCS} external className="w-full">
            Docs
          </TextLink>,
          <TextLink key="faq" href={PAGE_ROUTES.MARKETING.FAQ} className="w-full">
            FAQ
          </TextLink>,
        ]}
      >
        <Menu size={18} />
      </DropdownButton>
    </>
  );
}
