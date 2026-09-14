export default function Loading() {
  return (
    <div className="relative font-sans flex flex-col items-center pt-12 pb-20 animate-pulse">
      <div className="w-full max-w-5xl px-4 sm:px-6 mb-4 mt-[-2rem]">
        <div className="h-5 w-28 rounded bg-gray-200" />
      </div>

      <section className="flex flex-col items-center px-4 sm:px-6 pb-4 w-full">
        <div className="h-6 w-36 rounded-full bg-gray-200 mb-6" />
        <div className="h-10 sm:h-12 w-72 max-w-full rounded bg-gray-200 mb-4" />
        <div className="flex flex-col items-center gap-2 w-full max-w-2xl mb-6">
          <div className="h-5 w-full rounded bg-gray-200" />
          <div className="h-5 w-3/5 rounded bg-gray-200" />
        </div>
      </section>

      <div className="w-full max-w-5xl px-4 sm:px-6 mt-10 lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
        <nav className="hidden lg:block sticky top-24 self-start">
          <div className="h-4 w-24 rounded bg-gray-200 mb-3" />
          <div className="flex flex-col gap-2 border-l border-gray-200">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="pl-3">
                <div className="h-4 w-32 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </nav>

        <div className="max-w-3xl flex flex-col gap-16">
          <section>
            <div className="h-7 w-1/2 rounded bg-gray-200 mb-4" />
            <div className="flex flex-col gap-2.5 mb-6">
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-3/4 rounded bg-gray-200" />
            </div>
            <div className="h-24 w-full rounded-xl bg-gray-200" />
          </section>

          <section>
            <div className="h-7 w-2/3 rounded bg-gray-200 mb-4" />
            <div className="h-4 w-5/6 rounded bg-gray-200 mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-40 rounded-xl bg-gray-200" />
              ))}
            </div>
          </section>

          <section>
            <div className="h-7 w-1/2 rounded bg-gray-200 mb-4" />
            <div className="flex flex-col gap-2.5 mb-6">
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-4/5 rounded bg-gray-200" />
            </div>
            <div className="h-40 w-full rounded-xl bg-gray-200" />
          </section>

          <section>
            <div className="h-7 w-3/5 rounded bg-gray-200 mb-4" />
            <div className="flex flex-col gap-2.5">
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-2/3 rounded bg-gray-200" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
