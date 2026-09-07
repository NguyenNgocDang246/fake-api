import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { NavigationButton } from "@/app/components/Button/NavigationButton";

interface MarketingHeroProps {
  badge: string;
  badgeIcon: LucideIcon;
  heading: React.ReactNode;
  description: string;
  primaryHref: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function MarketingHero({
  badge,
  badgeIcon: BadgeIcon,
  heading,
  description,
  primaryHref,
  primaryLabel = "Get started",
  secondaryHref,
  secondaryLabel,
}: MarketingHeroProps) {
  return (
    <>
      <section className="flex flex-col items-center px-4 sm:px-6 text-center">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 ring-1 ring-blue-200 rounded-full px-3 py-1 mb-6">
          <BadgeIcon size={14} />
          {badge}
        </span>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-black mb-5 max-w-3xl">
          {heading}
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mb-9 leading-relaxed">{description}</p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <NavigationButton
            variant="primary"
            className="text-lg shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.03] active:scale-[0.98]"
            href={primaryHref}
          >
            <span className="flex items-center gap-1.5">
              {primaryLabel}
              <ArrowRight size={18} />
            </span>
          </NavigationButton>
          {secondaryHref && secondaryLabel && (
            <NavigationButton
              variant="outline"
              className="text-lg transition-all hover:scale-[1.03] active:scale-[0.98]"
              href={secondaryHref}
            >
              {secondaryLabel}
            </NavigationButton>
          )}
        </div>
      </section>
    </>
  );
}
