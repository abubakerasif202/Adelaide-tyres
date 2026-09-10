export default function Loading() {
  return (
    <div className="bg-[var(--color-surface-muted)]">
      <div className="container-x grid gap-8 py-14 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <div className="skeleton skeleton--title w-64" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-[52px] w-full rounded-[10px]" />
          ))}
        </div>
        <div className="skeleton skeleton--card" />
      </div>
      <span className="sr-only" role="status">Loading contact form</span>
    </div>
  );
}
