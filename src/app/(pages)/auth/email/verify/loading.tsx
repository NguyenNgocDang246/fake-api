export default function Loading() {
  return (
    <div className="flex flex-col items-center gap-4 max-w-[32rem] mx-auto text-center mt-10 animate-pulse">
      <div className="h-20 w-20 rounded-full bg-gray-200" />
      <div className="h-8 w-64 rounded bg-gray-200" />
      <div className="h-4 w-full rounded bg-gray-200" />
      <div className="flex flex-col w-full mt-10 gap-2">
        <div className="h-10 w-full rounded bg-gray-200" />
        <div className="flex gap-2 w-full">
          <div className="h-10 flex-1 rounded bg-gray-200" />
          <div className="h-10 flex-1 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
