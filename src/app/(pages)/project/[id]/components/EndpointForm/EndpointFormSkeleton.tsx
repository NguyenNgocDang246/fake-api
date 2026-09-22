interface EndpointFormSkeletonProps {
  // The same two answers `EndpointForm` takes, so the shape standing in is the shape arriving.
  multiScenario: boolean;
  aiAvailable: boolean;
}

// Laid out on the real form's own classes rather than on a block of its own, so the panel it
// stands in for lands where it was drawn instead of pushing the modal around as it arrives.
export function EndpointFormSkeleton({ multiScenario, aiAvailable }: EndpointFormSkeletonProps) {
  const field = (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="h-4 w-20 rounded bg-gray-200" />
      <div className="h-10 w-full rounded-lg bg-gray-200" />
    </div>
  );

  const panel = (
    <div className="flex min-w-0 flex-col gap-4">
      {multiScenario && (
        <div className="flex items-center gap-2">
          <div className="h-8 flex-1 rounded-lg bg-gray-200" />
          <div className="h-7 w-28 rounded-lg bg-gray-200" />
          <div className="h-7 w-7 rounded-lg bg-gray-200" />
        </div>
      )}

      <div className="grid w-full grid-flow-col auto-cols-fr gap-1 rounded-xl bg-gray-100 p-1">
        <div className="h-9 rounded-[9px] bg-gray-200" />
        <div className="h-9 rounded-[9px] bg-gray-200" />
        {aiAvailable && <div className="h-9 rounded-[9px] bg-gray-200" />}
      </div>

      <div className="h-3 w-3/4 rounded bg-gray-200" />

      <div className="grid grid-cols-1 gap-3 @min-[420px]:grid-cols-2">
        {field}
        {field}
      </div>

      <div className="flex flex-col gap-1">
        <div className="h-4 w-28 rounded bg-gray-200" />
        <div className="h-32 w-full rounded-lg bg-gray-200" />
      </div>
    </div>
  );

  return (
    <div className="@container flex animate-pulse flex-col gap-4" aria-hidden="true">
      <div className="grid grid-cols-1 gap-3 @min-[420px]:grid-cols-[minmax(6.5rem,0.8fr)_2fr]">
        {field}
        {field}
      </div>

      {multiScenario ? (
        <div className="grid grid-cols-1 gap-4 @min-[700px]:grid-cols-[11.5rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            {/* Narrow enough and the list is one button, the way the real column folds. */}
            <div className="h-10 rounded-xl border border-gray-200 @min-[700px]:hidden" />

            <div className="hidden flex-col gap-2 @min-[700px]:flex">
              <div className="flex items-baseline justify-between gap-2 px-1">
                <div className="h-3 w-20 rounded bg-gray-200" />
                <div className="h-3 w-10 rounded bg-gray-200" />
              </div>

              {[0, 1].map((row) => (
                <div key={row} className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3">
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                </div>
              ))}

              <div className="h-9 rounded-xl border border-dashed border-gray-300" />
            </div>
          </div>

          {panel}
        </div>
      ) : (
        panel
      )}
    </div>
  );
}
