import type { LucideIcon } from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FeatureGridProps {
  heading: string;
  subheading?: string;
  items: Feature[];
}

export function FeatureGrid({ heading, subheading, items }: FeatureGridProps) {
  return (
    <section className="mt-24 w-full max-w-5xl px-4 sm:px-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">{heading}</h2>
      {subheading && <p className="text-gray-500 text-center mb-12">{subheading}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="group bg-white/80 border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-transparent transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center size-9 shrink-0 rounded-lg bg-blue-100 text-blue-700 transition-transform group-hover:scale-110">
                <Icon size={18} />
              </div>
              <h3 className="font-semibold">{title}</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
