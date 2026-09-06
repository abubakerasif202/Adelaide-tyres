import Link from "next/link";

export function Breadcrumbs({
  items,
  tone = "dark",
}: {
  items: { name: string; path: string }[];
  tone?: "dark" | "light";
}) {
  const base =
    tone === "light" ? "text-white/70" : "text-[var(--color-text-muted)]";
  const current = tone === "light" ? "text-white" : "text-[var(--color-text)]";
  const hover =
    tone === "light" ? "hover:text-white" : "hover:text-[var(--color-green)]";

  return (
    <nav aria-label="Breadcrumb">
      <ol className={`flex flex-wrap items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide ${base}`}>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className={current}>
                  {item.name}
                </span>
              ) : (
                <Link href={item.path} className={hover}>
                  {item.name}
                </Link>
              )}
              {!last && <span aria-hidden>/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
