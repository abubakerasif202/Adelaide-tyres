export default function Loading() {
  return (
    <div className="bg-[var(--color-surface-muted)]">
      <div className="container-x py-16">
        <div className="skeleton skeleton--title w-52" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton skeleton--card" />
          ))}
        </div>
      </div>
      <span className="sr-only" role="status">Loading tyres</span>
    </div>
  );
}
