"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/** Progressive enhancement: content is visible until the observer is installed. */
export function Reveal({ children, className = "", delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches || !("IntersectionObserver" in window)) {
      element.classList.add("is-visible");
      return;
    }

    const bounds = element.getBoundingClientRect();
    if (bounds.top < window.innerHeight && bounds.bottom > 0) {
      element.classList.add("is-visible");
      return;
    }

    element.dataset.revealReady = "true";
    const reveal = () => element.classList.add("is-visible");
    const revealForFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && element.contains(event.target)) reveal();
    };
    const revealForMotionPreference = (event: MediaQueryListEvent) => {
      if (event.matches) reveal();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        element.classList.add("is-visible");
        observer.disconnect();
      },
      { threshold: 0.14 },
    );

    element.addEventListener("focusin", revealForFocus);
    motionPreference.addEventListener("change", revealForMotionPreference);
    observer.observe(element);
    return () => {
      observer.disconnect();
      element.removeEventListener("focusin", revealForFocus);
      motionPreference.removeEventListener("change", revealForMotionPreference);
      delete element.dataset.revealReady;
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`.trim()}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
