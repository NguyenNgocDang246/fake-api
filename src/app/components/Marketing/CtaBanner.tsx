import { ArrowRight } from "lucide-react";
import { NavigationButton } from "@/app/components/Button/NavigationButton";

interface CtaBannerProps {
  heading: string;
  description: string;
  href: string;
  label?: string;
}

export function CtaBanner({ heading, description, href, label = "Get started" }: CtaBannerProps) {
  return (
    <section className="mt-24 w-full max-w-5xl px-4 sm:px-6">
      <div className="relative flex flex-col items-center text-center overflow-hidden bg-linear-to-r from-indigo-600 to-blue-500 rounded-2xl px-6 py-14 shadow-2xl shadow-blue-500/30">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 -bottom-16 size-48 rounded-full bg-white/10"
        />
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">{heading}</h2>
        <p className="text-blue-100 mb-7 max-w-xl">{description}</p>
        <NavigationButton
          variant="inverse"
          className="text-lg transition-all hover:scale-[1.03] active:scale-[0.98]"
          href={href}
        >
          <span className="flex items-center gap-1.5">
            {label}
            <ArrowRight size={18} />
          </span>
        </NavigationButton>
      </div>
    </section>
  );
}
