import { Breadcrumbs } from "./Breadcrumbs";

export function PageHeader({
  title,
  intro,
  eyebrow,
  crumbs,
}: {
  title: string;
  intro?: string;
  eyebrow?: string;
  crumbs: { name: string; path: string }[];
}) {
  return (
    <div className="on-dark bg-[var(--color-green)] text-white">
      <div className="container-x py-12">
        <Breadcrumbs items={crumbs} tone="light" />
        {eyebrow && <p className="eyebrow mt-4 text-[#7fd1b3]">{eyebrow}</p>}
        <h1 className="display mt-2 text-[clamp(34px,6vw,60px)]">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-[17px] text-white/82">{intro}</p>}
      </div>
    </div>
  );
}
