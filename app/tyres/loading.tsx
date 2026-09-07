export default function Loading() {
  return (
    <div className="bg-[var(--color-surface-muted)]">
      <div className="container-x py-16">
        <div className="h-8 w-52 animate-pulse rounded bg-[var(--color-border)]" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="surface-card h-72 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
