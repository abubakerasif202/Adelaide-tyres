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
import { ProductCard } from "./ProductCard";

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

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CatalogueBrowser({ tyres, sizes, brands, applications }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const clearFilters = useCallback(() => {
    setFilters({
      query: "",
      size: null,
      brand: null,
      application: null,
      inStockOnly: false,
      sort: filters.sort,
    });
  }, [filters.sort, setFilters]);

  const results = useMemo(() => filterTyres(tyres, filters), [tyres, filters]);
  const activeCount = activeFilterCount(filters);

  return (
    <>
      <div className="catalogue-shell">
        <aside aria-label="Tyre filters" className="catalogue-filter-rail surface-card">
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
          <label className="catalogue-search block">
            <span className="sr-only">Search tyres</span>
            <input
              type="search"
              className="field-input"
              placeholder="Search tyre size, pattern or brand"
              value={filters.query}
              onChange={(e) => patch({ query: e.target.value })}
            />
          </label>

          <div className="catalogue-mobile-toolbar">
            <button
              type="button"
              className="catalogue-filter-trigger btn btn--outline"
              aria-expanded={mobileFiltersOpen}
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

          {activeCount > 0 && (
            <div className="catalogue-results-clear">
              <button
                type="button"
                className="link-underline text-[13px] font-bold uppercase tracking-wide"
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
            <div className="catalogue-results mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((tyre) => (
                <ProductCard key={tyre.id} tyre={tyre} />
              ))}
            </div>
          )}
        </section>
      </div>

      {mobileFiltersOpen && (
        <MobileFilterSheet onClose={() => setMobileFiltersOpen(false)}>
          <FilterControls
            filters={filters}
            sizes={sizes}
            brands={brands}
            applications={applications}
            onPatch={patch}
            onClear={clearFilters}
          />
        </MobileFilterSheet>
      )}
    </>
  );
}

/**
 * The sheet is a real modal dialog, so it owns focus while it is open:
 * focus moves in on open, Tab is trapped inside it, Escape closes it, and
 * focus returns to the trigger on close. None of this touches filter state —
 * filters stay derived from the URL.
 */
function MobileFilterSheet({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    dialog.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    // A viewport that grows past the desktop breakpoint hides the sheet in CSS;
    // close it so focus and scroll lock cannot be stranded behind the rail.
    const desktop = window.matchMedia("(min-width: 1024px)");
    function onBreakpointChange(event: MediaQueryListEvent) {
      if (event.matches) closeRef.current();
    }

    document.addEventListener("keydown", onKeyDown, true);
    desktop.addEventListener("change", onBreakpointChange);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      desktop.removeEventListener("change", onBreakpointChange);
      body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div className="catalogue-filter-sheet lg:hidden">
      <button
        type="button"
        className="catalogue-filter-backdrop"
        aria-label="Close filters"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Tyre filters"
        tabIndex={-1}
        className="catalogue-filter-dialog"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="display text-[28px]">Filters</h2>
          <button
            type="button"
            className="btn btn--outline min-h-[44px] px-4 py-2"
            onClick={onClose}
          >
            Close filters
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
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
  const sizeChips = useMemo(() => sizes.slice(0, 6), [sizes]);

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

      <div className="filter-rail__group">
        <span className="field-label">Size</span>
        <SelectField
          label="Size"
          value={filters.size ?? ""}
          onChange={(v) => onPatch({ size: v || null })}
          options={sizes}
          allLabel="All sizes"
        />
        <div className="filter-rail__chips">
          <FilterChip
            active={!filters.size && !filters.application && !filters.brand}
            onClick={() => onPatch({ size: null, application: null, brand: null })}
          >
            All stock
          </FilterChip>
          {sizeChips.map((size) => (
            <FilterChip
              key={size}
              active={filters.size === size}
              onClick={() => onPatch({ size: filters.size === size ? null : size })}
            >
              {size}
            </FilterChip>
          ))}
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
