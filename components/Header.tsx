"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { announcement, nav } from "@/lib/config";
import { deliveryRuleSummary } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { Logo } from "./Logo";

function CartLink({ onNavigate }: { onNavigate?: () => void }) {
  const { totalTyres, hydrated } = useCart();
  return (
    <Link
      href="/cart"
      onClick={onNavigate}
      className="header-cart btn btn--green min-h-[44px] px-4 py-2"
      aria-label={`Cart, ${hydrated ? totalTyres : 0} tyres`}
    >
      Cart <span key={totalTyres} className="cart-count" aria-hidden="true">{hydrated ? totalTyres : 0}</span>
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", open);
    const pageRegions = [document.querySelector("main#main"), document.querySelector("footer")];
    for (const region of pageRegions) {
      if (region instanceof HTMLElement) region.inert = open;
    }
    if (open) menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.body.classList.remove("no-scroll");
      for (const region of pageRegions) {
        if (region instanceof HTMLElement) region.inert = false;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = menuRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeAtDesktop);
    return () => desktop.removeEventListener("change", closeAtDesktop);
  }, []);

  return (
    <header className="site-header sticky top-0 z-50" data-compact={compact || undefined}>
      <div className="bg-[var(--color-ink)] text-white">
        <div className="container-x flex h-[38px] items-center justify-between text-[11px] font-bold uppercase tracking-[0.08em]">
          <span className="announcement-copy"><span className="sm:hidden">No minimum · {deliveryRuleSummary("short")}</span><span className="hidden sm:inline">{deliveryRuleSummary("announcement")}</span></span>
          <span className="hidden md:block text-white/70">{announcement.address}</span>
        </div>
      </div>

      <div
        className={`header-main border-b border-[var(--color-border)] bg-white/96 backdrop-blur-md ${
          compact ? "py-2" : "py-3.5"
        }`}
      >
        <div className="container-x flex items-center justify-between gap-4">
          <Link href="/" aria-label="AWT — Adelaide Wholesale Tyres home" className="header-logo rounded-sm" onClick={() => setOpen(false)}>
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
            <CartLink onNavigate={() => setOpen(false)} />
            <button
              ref={menuButtonRef}
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
          ref={menuRef}
          id="mobile-nav"
          className="mobile-menu lg:hidden fixed inset-x-0 bottom-0 z-40 overflow-y-auto bg-white"
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
