"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { announcement, nav } from "@/lib/config";
import { useCart } from "@/lib/cart-context";
import { Logo } from "./Logo";

function CartLink({ onNavigate }: { onNavigate?: () => void }) {
  const { totalTyres, hydrated } = useCart();
  return (
    <Link
      href="/cart"
      onClick={onNavigate}
      className="btn btn--green min-h-[44px] px-4 py-2"
      aria-label={`Cart, ${hydrated ? totalTyres : 0} tyres`}
    >
      Cart {hydrated ? totalTyres : 0}
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", open);
    return () => document.body.classList.remove("no-scroll");
  }, [open]);

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-[var(--color-ink)] text-white">
        <div className="container-x flex h-[38px] items-center justify-between text-[11px] font-bold uppercase tracking-[0.08em]">
          <span>{announcement.message}</span>
          <span className="hidden md:block text-white/70">{announcement.address}</span>
        </div>
      </div>

      <div
        className={`border-b border-[var(--color-border)] bg-white transition-[padding] ${
          compact ? "py-2" : "py-3.5"
        }`}
      >
        <div className="container-x flex items-center justify-between gap-4">
          <Link href="/" aria-label="Adelaide Wholesale Tyres home">
            <Logo tone="dark" />
          </Link>

          <nav aria-label="Main" className="hidden lg:flex items-center gap-7">
            {nav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`text-[13px] font-bold uppercase tracking-[0.06em] transition-colors ${
                    active
                      ? "text-[var(--color-green)]"
                      : "text-[var(--color-text)] hover:text-[var(--color-green)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5">
            <CartLink />
            <button
              type="button"
              className="btn btn--outline min-h-[44px] px-4 py-2 lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Close" : "Menu"}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="lg:hidden fixed inset-x-0 bottom-0 top-[calc(38px+69px)] z-40 overflow-y-auto bg-white"
        >
          <nav aria-label="Mobile" className="container-x flex flex-col py-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-b border-[var(--color-border)] py-4 text-[18px] font-bold uppercase tracking-wide"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-6">
              <CartLink onNavigate={() => setOpen(false)} />
            </div>
            <p className="mt-6 text-[13px] text-[var(--color-text-muted)]">
              {announcement.address}
            </p>
          </nav>
        </div>
      )}
    </header>
  );
}
