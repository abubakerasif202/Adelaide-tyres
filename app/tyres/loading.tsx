/**
 * Mirrors the real `/tyres` structure so the fallback -> page swap is not a
 * layout jump. The live page is `py-10` with breadcrumbs, a clamped h1 + lede,
 * a stats pill, and a `.catalogue-shell` grid that grows a 280px sticky filter
 * rail at lg+. The earlier skeleton was `py-16` with a single title bar and a
 * full-width 3-col grid, which shifted the cards ~308px sideways on hydration.
 */
export default function Loading() {
  return (
    <div className="bg-[var(--color-surface-muted)]">
      <div className="container-x py-10">
        {/* Breadcrumbs row */}
        <div className="skeleton skeleton--text w-40" />

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {/* h1: display text-[clamp(36px,5vw,56px)] */}
            <div className="skeleton w-[min(420px,80vw)] h-[clamp(36px,5vw,56px)] rounded-md" />
            <div className="skeleton skeleton--text mt-3 w-[min(360px,70vw)]" />
          </div>
          {/* stats pill */}
          <div className="skeleton h-8 w-56 max-w-full rounded-full" />
        </div>

        <div className="mt-8">
          <div className="catalogue-shell">
            {/* Filter rail — display:none below lg, exactly like the real one */}
            <div className="catalogue-filter-rail surface-card">
              <div className="skeleton skeleton--text w-24" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="mt-6">
                  <div className="skeleton skeleton--text w-20" />
                  <div className="skeleton mt-3 h-10 w-full rounded-md" />
                </div>
              ))}
            </div>

            <div className="min-w-0">
              {/* Search field — rendered at every breakpoint by the real
                  results column. `.catalogue-search` supplies the 14px bottom
                  margin; `.catalogue-search .field-input` is min-height:56px. */}
              <div className="catalogue-search">
                <div className="skeleton h-14 w-full rounded-md" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="skeleton h-11 w-32 rounded-md lg:hidden" />
                <div className="skeleton skeleton--text w-24" />
              </div>
              <div className="catalogue-results mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton skeleton--card" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only" role="status">Loading tyres</span>
    </div>
  );
}
