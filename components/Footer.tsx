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
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Commercial", href: "/commercial" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="on-dark bg-[var(--color-ink)] text-white/80">
      <div className="container-x grid gap-10 py-16 md:grid-cols-[1.4fr_repeat(4,1fr)]">
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
        {columns.map((col, index) => (
          <Reveal key={col.heading} delay={index * 60}>
          <div>
            <h3 className="eyebrow text-[#7fd1b3]">{col.heading}</h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-[14px]">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white">
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
        <div className="container-x flex flex-col gap-1 py-6 text-[12px] text-white/55 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} {business.name}</span>
          <span>No minimum order · {deliveryRuleSummary("long")}</span>
        </div>
      </div>
    </footer>
  );
}
