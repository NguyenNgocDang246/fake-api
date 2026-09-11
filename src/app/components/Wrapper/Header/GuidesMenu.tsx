"use client";

import { ChevronDown } from "lucide-react";
import { DropdownButton } from "@/app/components/Button/DropdownButton";
import { TextLink } from "@/app/components/Link/TextLink";
import { PAGE_ROUTES } from "@/app/libs/routes";

// The mock group first, then the bug group, which is how the landing pages themselves are grouped.
const GUIDE_LINKS = [
  { href: PAGE_ROUTES.MARKETING.MOCK_DATA, label: "Building mock data" },
  { href: PAGE_ROUTES.MARKETING.FREE_API_FOR_TESTING, label: "Free APIs for testing" },
  { href: PAGE_ROUTES.MARKETING.MOCK_API_TOOLS, label: "Choosing a mock API tool" },
  { href: PAGE_ROUTES.MARKETING.CORS_ERROR, label: "Fixing a CORS error" },
  { href: PAGE_ROUTES.MARKETING.RACE_CONDITION, label: "Catching a race condition" },
  { href: PAGE_ROUTES.MARKETING.API_ERROR_HANDLING, label: "Handling API errors" },
];

export function GuidesMenu() {
  return (
    <DropdownButton
      position="left"
      btnClassName="p-0 bg-transparent hover:bg-transparent text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1"
      boxClassName="w-64"
      dividerAfter={[2]}
      options={GUIDE_LINKS.map(({ href, label }) => (
        <TextLink key={href} href={href} className="w-full">
          {label}
        </TextLink>
      ))}
    >
      Guides
      <ChevronDown size={16} />
    </DropdownButton>
  );
}
