export function EndpointItemSkeleton() {
  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm animate-pulse">
      <div className="flex items-center min-w-0 w-full sm:w-auto gap-3">
        <div className="h-6 w-14 rounded bg-gray-200" />
        <div className="h-4 w-1/2 rounded bg-gray-200" />
      </div>
      <div className="flex items-center gap-3 mt-3 sm:mt-0">
        <div className="h-6 w-10 rounded bg-gray-200" />
        <div className="h-4 w-10 rounded bg-gray-200" />
        <div className="h-9 w-9 rounded-full bg-gray-200" />
        <div className="h-9 w-9 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}
