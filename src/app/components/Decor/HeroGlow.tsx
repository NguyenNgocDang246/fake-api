export function HeroGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -z-10 flex justify-center overflow-x-clip [--glow:50vw] top-[calc(var(--glow)*-0.3)]"
    >
      <div className="size-[var(--glow)] rounded-full bg-blue-300/30 blur-3xl" />
      <div className="absolute left-[calc(50%_+_var(--glow)*0.4)] top-[calc(var(--glow)*0.15)] size-[calc(var(--glow)*0.5)] rounded-full bg-indigo-300/30 blur-3xl" />
      <div className="absolute right-[calc(50%_+_var(--glow)*0.4)] top-[calc(var(--glow)*0.07)] size-[calc(var(--glow)*0.43)] rounded-full bg-purple-200/30 blur-3xl" />
    </div>
  );
}
