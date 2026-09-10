"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Tyre } from "@/lib/catalogue";
import { APPLICATION_LABELS } from "@/lib/catalogue";
import {
  activeFilterCount,
  filterTyres,
  filtersFromParams,
  paramsFromFilters,
  type TyreFilters,
} from "@/lib/filter";
import { MobileSheet } from "./MobileSheet";
import { ProductCard } from "./ProductCard";

/** Pause after the last keystroke before the URL (and results) update. */
const SEARCH_DEBOUNCE_MS = 250;

type Props = {
  tyres: Tyre[];
  sizes: string[];
  brands: string[];
  applications: string[];
};

type FilterControlsProps = {
  filters: TyreFilters;
  sizes: string[];
  brands: string[];
  applications: string[];
  onPatch: (partial: Partial<TyreFilters>) => void;
  onClear: () => void;
};

export function CatalogueBrowser({ tyres, sizes, brands, applications }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const railRef = useRef<HTMLElement>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filters = useMemo(
    () => filtersFromParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setFilters = useCallback(
    (next: TyreFilters) => {
      const params = paramsFromFilters(next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const patch = useCallback(
    (partial: Partial<TyreFilters>) => setFilters({ ...filters, ...partial }),
    [filters, setFilters],
  );

  // The search box drives a router.replace. Navigating on every keystroke
  // drops characters on mid-range Android, so the input is locally controlled
  // and the URL catches up after the user pauses.
  const [queryDraft, setQueryDraft] = useState(filters.query);
  const querySyncedFromUrl = useRef(filters.query);
  useEffect(() => {
    if (filters.query !== querySyncedFromUrl.current) {
      querySyncedFromUrl.current = filters.query;
      setQueryDraft(filters.query);
    }
  }, [filters.query]);
  useEffect(() => {
    if (queryDraft === filters.query) return;
    const timer = setTimeout(() => {
      querySyncedFromUrl.current = queryDraft;
      patch({ query: queryDraft });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [queryDraft, filters.query, patch]);

  const clearFilters = useCallback(() => {
    setQueryDraft("");
    setFilters({
      query: "",
      size: null,
      brand: null,
      application: null,
      inStockOnly: false,
      sort: filters.sort,
    });
  }, [filters.sort, setFilters]);

  // True across the debounce window, i.e. while the visible results are known
  // to be stale relative to what has been typed. Drives a dim on the results
  // grid so the pause reads as "working", not as "the search is ignoring me".
  const searchPending = queryDraft !== filters.query;

  const results = useMemo(() => filterTyres(tyres, filters), [tyres, filters]);
  const activeCount = activeFilterCount(filters);

  return (
    <>
      <div className="catalogue-shell">
        <aside ref={railRef} aria-label="Tyre filters" tabIndex={-1} className="catalogue-filter-rail surface-card">
          <FilterControls
            filters={filters}
            sizes={sizes}
            brands={brands}
            applications={applications}
            onPatch={patch}
            onClear={clearFilters}
          />
        </aside>

        <section aria-label="Tyre catalogue results" className="min-w-0">
          {/* One search field for every viewport. Rendering a second copy inside
              the rail/sheet would put a duplicate "Search tyres" control in the
              accessibility tree and break existing placeholder-based coverage. */}
          <label className="catalogue-search block relative">
            <span className="sr-only">Search tyres</span>
            <svg
              aria-hidden="true"
              className="catalogue-search__icon"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="9" cy="9" r="6.25" stroke="currentColor" strokeWidth="1.75" />
              <path d="M18 18L13.6 13.6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              className="field-input catalogue-search__input"
              placeholder="Search tyre size, pattern or brand"
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
            />
          </label>

          <div className="catalogue-mobile-toolbar">
            <button
              type="button"
              className="catalogue-filter-trigger btn btn--outline"
              aria-expanded={mobileFiltersOpen}
              aria-haspopup="dialog"
              onClick={() => setMobileFiltersOpen(true)}
            >
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>
            <p
              aria-live="polite"
              aria-atomic="true"
              className="text-[14px] font-semibold text-[var(--color-text-muted)]"
            >
              {results.length} {results.length === 1 ? "result" : "results"}
            </p>
          </div>

          {/* The rail's "Reset" (colocated with the active-filter count) already
              covers this action on lg+, where the rail is visible — render this
              copy only below lg so there is exactly one clear affordance per
              viewport (B-4). */}
          {activeCount > 0 && (
            <div className="catalogue-results-clear lg:hidden">
              <button
                type="button"
                className="catalogue-results-clear__btn link-underline text-[13px] font-bold uppercase tracking-wide"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          )}

          {results.length === 0 ? (
            <div className="surface-card mt-6 p-10 text-center">
              <h3 className="display text-[22px]">No tyres match those filters</h3>
              <p className="mx-auto mt-2 max-w-md text-[var(--color-text-muted)]">
                Try a broader size or brand, or send us the size you need and we&apos;ll
                check what&apos;s inbound.
              </p>
              <a href="/contact?type=quote" className="btn btn--green mt-5">
                Request a size
              </a>
            </div>
          ) : (
            <div
              className="catalogue-results mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
              data-pending={searchPending ? "true" : undefined}
            >
              {results.map((tyre) => (
                <ProductCard key={tyre.id} tyre={tyre} />
              ))}
            </div>
          )}
        </section>
      </div>

      {mobileFiltersOpen && (
        <MobileSheet
          label="Tyre filters"
          title="Filters"
          closeLabel="Close filters"
          onClose={() => setMobileFiltersOpen(false)}
          restoreFocusTo={railRef}
          describedById="mobile-filter-result-count"
          footer={
            <button type="button" className="btn btn--red w-full" onClick={() => setMobileFiltersOpen(false)}>
              Show {results.length} {results.length === 1 ? "result" : "results"}
            </button>
          }
        >
          <FilterControls
            filters={filters}
            sizes={sizes}
            brands={brands}
            applications={applications}
            onPatch={patch}
            onClear={clearFilters}
          />
          <p id="mobile-filter-result-count" className="sr-only" aria-live="polite" aria-atomic="true">
            {results.length} {results.length === 1 ? "result" : "results"}
          </p>
        </MobileSheet>
      )}
    </>
  );
}

function FilterControls({
  filters,
  sizes,
  brands,
  applications,
  onPatch,
  onClear,
}: FilterControlsProps) {
  const activeCount = activeFilterCount(filters);
  const [showAllSizes, setShowAllSizes] = useState(false);
  const visibleSizes = showAllSizes ? sizes : sizes.slice(0, 6);
  const hasMoreSizes = sizes.length > 6;

  return (
    <div className="filter-rail">
      <div className="filter-rail__head">
        <p className="filter-rail__eyebrow">
          Refine
          {activeCount > 0 && (
            <span className="filter-rail__count">{activeCount}</span>
          )}
        </p>
        {activeCount > 0 && (
          <button
            type="button"
            className="link-underline text-[12px] font-bold uppercase tracking-wide"
            onClick={onClear}
          >
            Reset
          </button>
        )}
      </div>

      {/* Size is a 6-value facet — chips alone are more scannable than a
          duplicate select doing the same job, and it keeps Sort above the
          fold in the rail. The group carries the accessible name "Size" so
          it survives even though there is no <select> here. */}
      <div className="filter-rail__group" role="group" aria-label="Size">
        <span className="field-label" aria-hidden="true">Size</span>
        <div className="filter-rail__chips">
          <FilterChip
            active={!filters.size}
            onClick={() => onPatch({ size: null })}
          >
            All sizes
          </FilterChip>
          {visibleSizes.map((size) => (
            <FilterChip
              key={size}
              active={filters.size === size}
              onClick={() => onPatch({ size: filters.size === size ? null : size })}
            >
              {size}
            </FilterChip>
          ))}
          {hasMoreSizes && (
            <FilterChip active={false} onClick={() => setShowAllSizes((v) => !v)}>
              {showAllSizes ? "Fewer sizes" : `+${sizes.length - 6} more`}
            </FilterChip>
          )}
        </div>
      </div>

      <div className="filter-rail__group">
        <span className="field-label">Brand</span>
        <SelectField
          label="Brand"
          value={filters.brand ?? ""}
          onChange={(v) => onPatch({ brand: v || null })}
          options={brands}
          allLabel="All brands"
        />
      </div>

      <div className="filter-rail__group">
        <span className="field-label">Application</span>
        <SelectField
          label="Application"
          value={filters.application ?? ""}
          onChange={(v) =>
            onPatch({ application: (v || null) as TyreFilters["application"] })
          }
          options={applications}
          optionLabel={(v) => APPLICATION_LABELS[v as keyof typeof APPLICATION_LABELS] ?? v}
          allLabel="Any application"
        />
      </div>

      <div className="filter-rail__group">
        <span className="field-label">Availability</span>
        <label className="filter-rail__toggle">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => onPatch({ inStockOnly: e.target.checked })}
          />
          In stock only
        </label>
      </div>

      <div className="filter-rail__group">
        <span className="field-label">Sort</span>
        <select
          aria-label="Sort results"
          className="field-input"
          value={filters.sort}
          onChange={(e) => onPatch({ sort: e.target.value as TyreFilters["sort"] })}
        >
          <option value="featured">Sort: Featured</option>
          <option value="price-asc">Price: Low to high</option>
          <option value="price-desc">Price: High to low</option>
          <option value="stock-desc">Most in stock</option>
        </select>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  allLabel,
  optionLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
  optionLabel?: (v: string) => string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        className="field-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        <option value="">{allLabel}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {optionLabel ? optionLabel(opt) : opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`filter-rail__chip ${active ? "is-active" : ""}`}
    >
      {children}
    </button>
  );
}
