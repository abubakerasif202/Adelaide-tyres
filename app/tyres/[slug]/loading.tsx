export default function Loading() {
  return (
    <div className="bg-[var(--color-surface-muted)]">
      <div className="container-x grid gap-10 py-14 lg:grid-cols-2">
        <div className="skeleton skeleton--media" />
        <div className="flex flex-col gap-4">
          <div className="skeleton skeleton--text w-28" />
          <div className="skeleton skeleton--title w-3/4" />
          <div className="skeleton skeleton--text w-1/2" />
          <div className="skeleton mt-4 h-[52px] w-40 rounded-[10px]" />
          <div className="skeleton mt-2 h-[52px] w-full rounded-[10px]" />
        </div>
      </div>
      <span className="sr-only" role="status">Loading tyre details</span>
    </div>
  );
}
