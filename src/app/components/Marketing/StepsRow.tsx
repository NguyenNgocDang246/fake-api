export interface Step {
  step: string;
  title: string;
  description: string;
}

interface StepsRowProps {
  heading: string;
  items: Step[];
}

export function StepsRow({ heading, items }: StepsRowProps) {
  return (
    <section className="mt-24 w-full max-w-5xl px-4 sm:px-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">{heading}</h2>
      <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-10">
        <div
          aria-hidden
          className="hidden sm:block absolute top-6 left-[16.5%] right-[16.5%] h-0.5 bg-linear-to-r from-indigo-200 via-blue-300 to-indigo-200"
        />
        {items.map(({ step, title, description }) => (
          <div key={step} className="relative flex flex-col items-center text-center">
            <div className="flex items-center justify-center size-12 rounded-full bg-linear-to-r from-indigo-600 to-blue-500 text-white font-bold mb-5 shadow-lg shadow-blue-500/30 ring-4 ring-white">
              {step}
            </div>
            <h3 className="font-semibold mb-1.5">{title}</h3>
            <p className="text-sm text-gray-600 max-w-xs leading-relaxed">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
