export function ProjectItemSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm animate-pulse">
      <div className="flex-1 min-w-0">
        <div className="h-6 w-1/3 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
      </div>
      <div className="flex items-center gap-2 w-auto sm:w-60 justify-end">
        <div className="hidden sm:block h-4 w-32 rounded bg-gray-200" />
        <div className="h-8 w-8 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}
