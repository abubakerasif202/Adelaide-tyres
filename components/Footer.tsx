import Link from "next/link";
import { business } from "@/lib/config";
import { Logo } from "./Logo";

const columns = [
  {
    heading: "Shop",
    links: [
      { label: "All tyres", href: "/tyres" },
      { label: "Truck & commercial", href: "/tyres?application=truck" },
      { label: "Passenger", href: "/tyres?application=passenger" },
      { label: "Light commercial", href: "/tyres?application=light-commercial" },
    ],
  },
  {
    heading: "Delivery",
    links: [
      { label: "Free Adelaide delivery", href: "/delivery" },
      { label: "Minimum order 4 tyres", href: "/delivery#minimum" },
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
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(4,1fr)]">
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
        {columns.map((col) => (
          <div key={col.heading}>
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
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-1 py-6 text-[12px] text-white/55 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} {business.name}</span>
          <span>Bulk orders · Free Adelaide-wide delivery · 4 tyre minimum</span>
        </div>
      </div>
    </footer>
  );
}
