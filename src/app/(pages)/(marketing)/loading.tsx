// Every guide page is laid out the same way, so the six of them share this skeleton.
// `faq/` keeps its own next to its page, because its hero carries buttons.
export default function Loading() {
  return (
    <div className="relative font-sans flex flex-col items-center py-12 animate-pulse">
      <div className="w-full max-w-5xl px-4 sm:px-6 mb-4 mt-[-2rem]">
        <div className="h-5 w-40 rounded bg-gray-200" />
      </div>

      <section className="flex flex-col items-center px-4 sm:px-6 w-full">
        <div className="h-6 w-32 rounded-full bg-gray-200 mb-6" />
        <div className="h-11 w-[34rem] max-w-full rounded bg-gray-200 mb-3" />
        <div className="h-11 w-80 max-w-full rounded bg-gray-200 mb-5" />
        <div className="flex flex-col items-center gap-2 w-full max-w-2xl">
          <div className="h-5 w-full rounded bg-gray-200" />
          <div className="h-5 w-3/4 rounded bg-gray-200" />
        </div>
      </section>

      <section className="mt-20 w-full max-w-3xl px-4 sm:px-6">
        <div className="h-8 w-2/3 rounded bg-gray-200 mb-5" />
        <div className="flex flex-col gap-2.5">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-11/12 rounded bg-gray-200" />
          <div className="h-4 w-2/3 rounded bg-gray-200" />
        </div>
      </section>

      <section className="mt-16 w-full max-w-5xl px-4 sm:px-6">
        <div className="h-8 w-1/2 rounded bg-gray-200 mb-5" />
        <div className="flex flex-col gap-2.5 mb-6">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-5/6 rounded bg-gray-200" />
        </div>
        <div className="h-64 w-full rounded-xl bg-gray-200" />
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <div className="h-8 w-3/5 rounded bg-gray-200 mb-5" />
        <div className="flex flex-col gap-2.5 mb-6">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
        </div>
        <div className="h-40 w-full rounded-xl bg-gray-200" />
      </section>

      <section className="mt-16 w-full max-w-3xl px-4 sm:px-6">
        <div className="h-8 w-1/2 rounded bg-gray-200 mb-5" />
        <div className="flex flex-col gap-2.5">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-4/5 rounded bg-gray-200" />
        </div>
      </section>

      <section className="mt-24 w-full max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center mb-12">
          <div className="h-8 w-72 max-w-full rounded bg-gray-200 mb-3" />
          <div className="h-5 w-96 max-w-full rounded bg-gray-200" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-36 rounded-xl bg-gray-200" />
          ))}
        </div>
      </section>

      <section className="mt-24 w-full max-w-5xl px-4 sm:px-6">
        <div className="h-72 w-full rounded-2xl bg-gray-200" />
      </section>
    </div>
  );
}
