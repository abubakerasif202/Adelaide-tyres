import Image from "next/image";
import Link from "next/link";
import { business } from "@/lib/config";
import { deliveryRuleSummary } from "@/lib/format";
import { Logo } from "./Logo";
import { Reveal } from "./Reveal";

const columns = [
  {
    heading: "Shop",
    links: [
      { label: "All tyres", href: "/tyres" },
      { label: "Truck tyres", href: "/tyres?application=truck" },
      { label: "Commercial tyres", href: "/tyres?application=commercial" },
    ],
  },
  {
    heading: "Delivery",
    links: [
      { label: "Adelaide delivery rates", href: "/delivery" },
      { label: "No minimum order", href: "/delivery" },
      { label: "Regency Park warehouse", href: "/delivery#pickup" },
    ],
  },
  {
    heading: "Company & legal",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Commercial", href: "/commercial" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function Footer() {
  const companyColumns = business.phone
    ? columns.map((col) =>
        col.heading === "Company & legal"
          ? { ...col, links: [{ label: `Call ${business.phone}`, href: `tel:${business.phone.replace(/\s/g, "")}` }, ...col.links] }
          : col,
      )
    : columns;

  return (
    <footer className="on-dark bg-[var(--color-ink)] text-white/80">
      <div className="homepage-container grid gap-6 py-12 md:grid-cols-4">
        <Reveal>
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-xs text-[14px]">
            Wholesale tyre supply for Adelaide fleets, workshops, transport operators and
            bulk buyers.
          </p>
          <p className="mt-4 text-[13px] text-white/60">
            {business.address.oneLine}
            <br />
            {business.domain}
          </p>
        </div>
        </Reveal>
        {companyColumns.map((col, index) => (
          <Reveal key={col.heading} delay={index * 60}>
          <div>
            <h3 className="eyebrow text-[#7fd1b3]">{col.heading}</h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-[14px]">
              {col.links.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <Link href={link.href} className="inline-block transition-all duration-200 hover:text-white hover:translate-x-1">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          </Reveal>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="homepage-container flex flex-col gap-4 py-4 text-[12px] text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span>© {new Date().getFullYear()} {business.name}</span>
            <span>No minimum order · {deliveryRuleSummary("long")}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 sm:items-end">
            <span className="text-[11px] uppercase tracking-wide text-white/60">Website by</span>
            <a
              href="https://www.abwebstudio.com.au/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Website designed and developed by AB Digital Solutions"
              className="inline-block opacity-90 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-100"
            >
              <Image
                src="/images/branding/ab-digital-solutions.webp"
                alt="AB Digital Solutions"
                width={672}
                height={309}
                loading="lazy"
                className="h-auto w-[130px] sm:w-[150px] md:w-[170px]"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
