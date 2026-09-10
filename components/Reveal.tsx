"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/**
 * A layout wrapper for staggered sections. Content deliberately stays visible:
 * scroll-observer opacity gates leave blank regions for slow scripts, crawlers
 * and full-page captures.
 */
export function Reveal({ children, className = "", delay = 0 }: RevealProps) {
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    revealRef.current?.classList.add("reveal--ready");
  }, []);

  return (
    <div
      ref={revealRef}
      className={`reveal ${className}`.trim()}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
