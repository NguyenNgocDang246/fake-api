export default function Loading() {
  return (
    <div className="font-sans flex flex-col items-center justify-center sm:px-6 py-12 bg-gray-50 animate-pulse">
      <div className="h-10 w-80 max-w-full rounded bg-gray-200 mb-4" />
      <div className="flex flex-col items-center gap-2 mb-8 w-full max-w-2xl">
        <div className="h-5 w-full rounded bg-gray-200" />
        <div className="h-5 w-2/3 rounded bg-gray-200" />
      </div>

      <div className="h-12 w-40 rounded-lg bg-gray-200" />

      <div className="mt-12 w-full max-w-xl bg-white shadow rounded-xl p-6">
        <div className="h-6 w-40 rounded bg-gray-200 mb-3" />
        <div className="h-32 w-full rounded-md bg-gray-100" />
      </div>
    </div>
  );
}
