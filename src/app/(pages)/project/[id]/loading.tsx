import { EndpointGroupItemSkeleton } from "@/app/(pages)/project/[id]/components/EndpointGroupItem/EndpointGroupItemSkeleton";
import { EndpointItemSkeleton } from "@/app/(pages)/project/[id]/components/EndpointItem/EndpointItemSkeleton";

export default function Loading() {
  return (
    <div>
      <div className="flex flex-col mt-4 gap-4 xl:flex-row xl:gap-8">
        <div className="xl:w-1/4">
          <div className="rounded-2xl border border-gray-300 bg-white shadow-sm animate-pulse">
            <div className="h-11 rounded-t-2xl bg-gray-200" />
            <div className="mt-1 p-4 space-y-1">
              <div className="h-9 w-full rounded-lg bg-gray-200 mb-4" />
              <EndpointGroupItemSkeleton />
              <EndpointGroupItemSkeleton />
              <EndpointGroupItemSkeleton />
            </div>
          </div>
        </div>

        <div className="grow flex flex-col">
          <div className="flex flex-col w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm animate-pulse">
            <div className="h-5 w-32 rounded bg-gray-200" />
            <div className="mt-2 h-8 w-full max-w-md rounded bg-gray-200" />
            <div className="flex flex-row gap-2 justify-end mt-3">
              <div className="h-9 w-28 rounded-lg bg-gray-200" />
              <div className="h-9 w-24 rounded-lg bg-gray-200" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <EndpointItemSkeleton />
            <EndpointItemSkeleton />
            <EndpointItemSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
