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
        // The clamp keeps the panel inside the viewport at the 300px floor MinWidthGuard allows.
        boxClassName="w-64 max-w-[calc(100vw-2.5rem)]"
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
