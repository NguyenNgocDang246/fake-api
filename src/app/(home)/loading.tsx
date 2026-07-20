export default function Loading() {
  return (
    <div className="font-sans flex flex-col items-center py-12 animate-pulse">
      {/* Hero */}
      <div className="flex flex-col items-center px-4 sm:px-6">
        <div className="h-6 w-40 rounded-full bg-gray-200 mb-5" />
        <div className="h-10 w-80 max-w-full rounded bg-gray-200 mb-4" />
        <div className="flex flex-col items-center gap-2 mb-8 w-full max-w-2xl">
          <div className="h-5 w-full rounded bg-gray-200" />
          <div className="h-5 w-2/3 rounded bg-gray-200" />
        </div>
        <div className="flex gap-3">
          <div className="h-12 w-40 rounded-lg bg-gray-200" />
          <div className="h-12 w-32 rounded-lg bg-gray-200" />
        </div>
      </div>

      {/* Example card */}
      <div className="mt-14 w-full max-w-xl px-4 sm:px-6">
        <div className="h-48 w-full rounded-xl bg-gray-200" />
      </div>

      {/* Feature cards */}
      <div className="mt-20 w-full max-w-5xl px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 rounded-xl bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
