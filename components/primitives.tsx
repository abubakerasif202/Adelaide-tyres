import { tyreFullName } from "@/lib/tyre";

export function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return <span className="pill pill--muted">Out of stock</span>;
  }
  const label = stock <= 10 ? "Low stock" : stock >= 40 ? "High stock" : "Current stock";
  return <span className="pill pill--green">{label} · {stock}</span>;
}

export function BadgePill({ label }: { label: string }) {
  return <span className="pill pill--muted">{label}</span>;
}

export function PriceDisplay({ price, per = "ea" }: { price: number; per?: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="display text-[20px] text-[var(--color-ink)]">
        {new Intl.NumberFormat("en-AU", {
          style: "currency",
          currency: "AUD",
          maximumFractionDigits: 0,
        }).format(price)}
      </span>{" "}
      <span className="text-[13px] font-semibold text-[var(--color-text-muted)]">{per}</span>
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  tone = "dark",
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  align?: "left" | "center";
  tone?: "dark" | "light";
}) {
  const muted = tone === "light" ? "text-white/72" : "text-[var(--color-text-muted)]";
  const accent = tone === "light" ? "text-[#7fd1b3]" : "text-[var(--color-green)]";
  const ink = tone === "light" ? "text-white" : "text-[var(--color-ink)]";
  return (
    <div className={align === "center" ? "text-center mx-auto max-w-2xl" : "max-w-2xl"}>
      {eyebrow && <p className={`eyebrow ${accent}`}>{eyebrow}</p>}
      <h2 className={`display mt-2 text-[clamp(28px,4vw,44px)] ${ink}`}>{title}</h2>
      {intro && <p className={`mt-3 text-[16px] ${muted}`}>{intro}</p>}
    </div>
  );
}

export const tyreTitle = tyreFullName;
