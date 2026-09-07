export function BreadcrumbSkeleton() {
  return (
    <div className="flex items-center text-sm animate-pulse">
      <div className="h-4 w-10 rounded bg-gray-200" />
      <span className="mx-2 text-gray-300">/</span>
      <div className="h-4 w-14 rounded bg-gray-200" />
      <span className="mx-2 text-gray-300">/</span>
      <div className="h-4 w-24 rounded bg-gray-200" />
    </div>
  );
}
