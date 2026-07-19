export function BreadcrumbSkeleton() {
  return (
    <div className="flex items-center animate-pulse">
      <div className="h-4 w-10 rounded bg-gray-200" />
      <span className="mx-2 text-gray-400">/</span>
      <div className="h-4 w-14 rounded bg-gray-200" />
      <span className="mx-2 text-gray-400">/</span>
      <div className="h-4 w-24 rounded bg-gray-200" />
    </div>
  );
}
