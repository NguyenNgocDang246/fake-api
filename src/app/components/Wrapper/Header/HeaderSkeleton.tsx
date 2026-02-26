export function HeaderSkeleton() {
  return (
    <div className="flex justify-between lg:px-24 md:px-16 sm:px-8 px-4 py-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-[60px] h-[60px] rounded-full bg-gray-200" />
        <div className="w-24 h-8 rounded bg-gray-200" />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-16 h-9 rounded-lg bg-gray-200" />
        <div className="w-16 h-9 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}
