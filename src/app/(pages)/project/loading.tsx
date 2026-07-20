import { ProjectItemSkeleton } from "@/app/(pages)/project/components/ProjectItem/ProjectItemSkeleton";

export default function Loading() {
  return (
    <div>
      <div className="mt-4 flex flex-col justify-center">
        <div className="mb-4 flex items-center justify-end gap-4 animate-pulse">
          <div className="h-9 w-28 rounded-lg bg-gray-200" />
          <div className="h-9 w-24 rounded-lg bg-gray-200" />
        </div>
        <div className="flex flex-col gap-4">
          <ProjectItemSkeleton />
          <ProjectItemSkeleton />
          <ProjectItemSkeleton />
        </div>
      </div>
    </div>
  );
}
