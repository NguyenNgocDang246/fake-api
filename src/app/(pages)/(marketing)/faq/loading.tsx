export default function Loading() {
  return (
    <div className="relative font-sans flex flex-col items-center py-12 animate-pulse">
      <div className="w-full max-w-5xl px-4 sm:px-6 mb-4 mt-[-2rem]">
        <div className="h-5 w-32 rounded bg-gray-200" />
      </div>

      <section className="flex flex-col items-center px-4 sm:px-6 w-full">
        <div className="h-6 w-52 rounded-full bg-gray-200 mb-6" />
        <div className="h-11 w-[28rem] max-w-full rounded bg-gray-200 mb-5" />
        <div className="flex flex-col items-center gap-2 w-full max-w-2xl mb-9">
          <div className="h-5 w-full rounded bg-gray-200" />
          <div className="h-5 w-2/3 rounded bg-gray-200" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="h-12 w-40 rounded-lg bg-gray-200" />
          <div className="h-12 w-36 rounded-lg bg-gray-200" />
        </div>
      </section>

      <section className="mt-20 w-full max-w-3xl px-4 sm:px-6">
        <div className="flex flex-col gap-8">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="border-b border-gray-200 pb-8 last:border-b-0">
              <div className="h-6 w-3/4 rounded bg-gray-200 mb-4" />
              <div className="flex flex-col gap-2.5">
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-4 w-2/3 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5 mt-10">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-4/5 rounded bg-gray-200" />
        </div>
      </section>

      <section className="mt-24 w-full max-w-5xl px-4 sm:px-6">
        <div className="h-72 w-full rounded-2xl bg-gray-200" />
      </section>
    </div>
  );
}
