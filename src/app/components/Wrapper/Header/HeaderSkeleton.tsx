export function HeaderSkeleton() {
  return (
    <div className="sticky top-0 z-20 flex justify-between items-center lg:px-24 md:px-16 sm:px-8 px-4 py-4 bg-white border-b border-gray-200 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-gray-200" />
        <div className="w-24 h-6 rounded bg-gray-200" />
      </div>
      <div className="flex items-center gap-6">
        <div className="w-10 h-5 rounded bg-gray-200" />
        <div className="size-9 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}
