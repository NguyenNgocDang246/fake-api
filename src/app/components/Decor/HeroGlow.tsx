// Anchors to the nearest positioned ancestor and deliberately overflows it, so the page
// container must be `relative` and must not clip: an `overflow-hidden` there cuts the blur
// into a rectangle with a visible seam under the header.
export function HeroGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-[-160px] -z-10 flex justify-center"
    >
      <div className="size-[560px] rounded-full bg-blue-300/30 blur-3xl" />
      <div className="absolute left-[calc(50%+220px)] top-[80px] size-[280px] rounded-full bg-indigo-300/30 blur-3xl" />
      <div className="absolute right-[calc(50%+220px)] top-[40px] size-[240px] rounded-full bg-purple-200/30 blur-3xl" />
    </div>
  );
}
