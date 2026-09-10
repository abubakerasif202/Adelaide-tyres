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
  // Bump only when the count actually grows, so the header reacts to an
  // add-to-cart but stays still on hydration, removals and route changes.
  const [bumped, setBumped] = useState(false);
  const previousTotal = useRef(totalTyres);

  useEffect(() => {
    if (!hydrated) {
      previousTotal.current = totalTyres;
      return;
    }
    if (totalTyres <= previousTotal.current) {
      previousTotal.current = totalTyres;
      return;
    }
    previousTotal.current = totalTyres;
    setBumped(true);
    const timer = setTimeout(() => setBumped(false), 460);
    return () => clearTimeout(timer);
  }, [totalTyres, hydrated]);

  return (
    <Link
      href="/cart"
      onClick={onNavigate}
      data-bumped={bumped || undefined}
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
        <div className="header-container flex h-9 items-center justify-between text-[11px] font-bold uppercase tracking-[0.08em]">
          <span className="announcement-copy"><span className="sm:hidden">No minimum · {deliveryRuleSummary("short")}</span><span className="hidden sm:inline">{deliveryRuleSummary("announcement")}</span></span>
          <span className="hidden md:block text-white/70">{announcement.address}</span>
        </div>
      </div>

      <div className="header-main border-b border-[var(--color-border)] bg-white/96 backdrop-blur-md">
        <div className="header-container flex h-20 items-center justify-between gap-4">
          <Link href="/" aria-label="AWT — Adelaide Wholesale Tyres home" className="header-logo rounded-sm" onClick={() => setOpen(false)}>
            <Logo tone="dark" />
          </Link>

          <form action="/tyres" className="header-search hidden lg:block">
            <label className="relative block">
              <span className="sr-only">Search stock from header</span>
              <span className="header-search__icon" aria-hidden>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input name="q" type="search" placeholder="Search stock by size or brand" />
            </label>
          </form>

          <nav aria-label="Main" className="hidden xl:flex items-center gap-6">
            {nav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`header-nav-link text-[13px] font-bold uppercase tracking-[0.06em] transition-colors ${
                    active
                      ? "is-active text-[var(--color-green)]"
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
              className="btn btn--outline min-h-[44px] px-3.5 py-2 xl:hidden flex items-center gap-2"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="relative w-3.5 h-3.5 flex flex-col justify-center items-center gap-1" aria-hidden="true">
                <span className={`h-0.5 w-3.5 bg-current rounded-full transition-transform duration-200 ${open ? "rotate-45 translate-y-[3px]" : ""}`} />
                <span className={`h-0.5 w-3.5 bg-current rounded-full transition-transform duration-200 ${open ? "-rotate-45 -translate-y-[3px]" : ""}`} />
              </span>
              <span>{open ? "Close" : "Menu"}</span>
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div
          ref={menuRef}
          id="mobile-nav"
          className="mobile-menu xl:hidden fixed inset-x-0 bottom-0 top-[calc(36px+80px)] z-40 overflow-y-auto bg-white/98 backdrop-blur-lg border-t border-[var(--color-border)] shadow-2xl"
        >
          <nav aria-label="Mobile" className="header-container flex flex-col py-6">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between border-b border-[var(--color-border)] py-4 text-[18px] font-bold uppercase tracking-wide text-[var(--color-ink)] hover:text-[var(--color-green)] transition-colors"
                onClick={() => setOpen(false)}
              >
                <span>{item.label}</span>
                <span className="text-sm text-[var(--color-text-muted)] group-hover:text-[var(--color-green)] group-hover:translate-x-1 transition-all" aria-hidden>→</span>
              </Link>
            ))}
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/contact?type=quote"
                onClick={() => setOpen(false)}
                className="btn btn--red w-full"
              >
                Get a wholesale quote
              </Link>
              <Link
                href="/tyres"
                onClick={() => setOpen(false)}
                className="btn btn--outline w-full"
              >
                Browse catalogue
              </Link>
            </div>
            <p className="mt-8 border-t border-[var(--color-border)] pt-4 text-[13px] text-[var(--color-text-muted)]">
              <span className="font-semibold text-[var(--color-ink)]">{announcement.address}</span>
              <br />
              Regency Park warehouse depot · Adelaide SA
            </p>
          </nav>
        </div>
      )}
    </header>
  );
}
