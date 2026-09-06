"use client";

import { useCallback, useMemo } from "react";
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

export function CatalogueBrowser({ tyres, sizes, brands, applications }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const results = useMemo(() => filterTyres(tyres, filters), [tyres, filters]);
  const activeCount = activeFilterCount(filters);

  const sizeChips = useMemo(() => sizes.slice(0, 8), [sizes]);

  return (
    <div>
      <div className="surface-card p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <label className="block">
            <span className="sr-only">Search tyres</span>
            <input
              type="search"
              className="field-input"
              placeholder="Search tyre size, pattern or brand"
              value={filters.query}
              onChange={(e) => patch({ query: e.target.value })}
            />
          </label>

          <SelectField
            label="Size"
            value={filters.size ?? ""}
            onChange={(v) => patch({ size: v || null })}
            options={sizes}
            allLabel="All sizes"
          />
          <SelectField
            label="Brand"
            value={filters.brand ?? ""}
            onChange={(v) => patch({ brand: v || null })}
            options={brands}
            allLabel="All brands"
          />
          <SelectField
            label="Application"
            value={filters.application ?? ""}
            onChange={(v) => patch({ application: (v || null) as TyreFilters["application"] })}
            options={applications}
            optionLabel={(v) => APPLICATION_LABELS[v as keyof typeof APPLICATION_LABELS] ?? v}
            allLabel="Any application"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <FilterChip
            active={!filters.size && !filters.application && !filters.brand}
            onClick={() =>
              patch({ size: null, application: null, brand: null })
            }
          >
            All stock
          </FilterChip>
          {sizeChips.map((size) => (
            <FilterChip
              key={size}
              active={filters.size === size}
              onClick={() => patch({ size: filters.size === size ? null : size })}
            >
              {size}
            </FilterChip>
          ))}
          <label className="ml-auto flex items-center gap-2 text-[13px] font-semibold">
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={(e) => patch({ inStockOnly: e.target.checked })}
            />
            In stock only
          </label>
          <select
            aria-label="Sort results"
            className="field-input h-10 min-h-0 w-auto py-1 text-[13px]"
            value={filters.sort}
            onChange={(e) => patch({ sort: e.target.value as TyreFilters["sort"] })}
          >
            <option value="featured">Sort: Featured</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
            <option value="stock-desc">Most in stock</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-[14px] font-semibold text-[var(--color-text-muted)]">
          {results.length} {results.length === 1 ? "result" : "results"}
          {activeCount > 0 && ` · ${activeCount} filter${activeCount === 1 ? "" : "s"} active`}
        </p>
        {activeCount > 0 && (
          <button
            type="button"
            className="link-underline text-[13px] font-bold uppercase tracking-wide"
            onClick={() =>
              setFilters({
                query: "",
                size: null,
                brand: null,
                application: null,
                inStockOnly: false,
                sort: filters.sort,
              })
            }
          >
            Clear filters
          </button>
        )}
      </div>

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
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((tyre, i) => (
            <ProductCard key={tyre.id} tyre={tyre} priority={i < 3} />
          ))}
        </div>
      )}
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
      className={`rounded-full border px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-wide transition-colors ${
        active
          ? "border-transparent bg-[var(--color-green)] text-white"
          : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-[var(--color-ink)]"
      }`}
    >
      {children}
    </button>
  );
}
