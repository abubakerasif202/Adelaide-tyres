"use client";

import Image from "next/image";
import { useId, useState } from "react";

type Props = {
  src: string | null;
  alt: string;
  /** Rendered pixel box (square). */
  size?: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
};

/**
 * Renders a real product photo when one is supplied, otherwise a clean neutral
 * tyre placeholder. No branded model photography is invented — when `src` is
 * null this is deliberately generic and swap-ready.
 */
export function TyreImage({ src, alt, size = 120, priority = false, className, sizes }: Props) {
  const gradientId = useId();
  const [failed, setFailed] = useState(false);
  const cls = ["shrink-0", className].filter(Boolean).join(" ");

  if (src && !failed) {
    return (
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        className={cls}
        style={{ objectFit: "contain", aspectRatio: "1 / 1" }}
        sizes={sizes ?? `${size}px`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <svg
      role="img"
      aria-label={`Illustration only — photo pending for ${alt}`}
      width={size}
      height={size}
      viewBox="0 0 120 132"
      className={cls}
    >
      <text x="60" y="128" textAnchor="middle" fontSize="9" fill="#68716d">Photo pending</text>
      <defs>
        <radialGradient id={gradientId} cx="42%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#2b3130" />
          <stop offset="60%" stopColor="#15191a" />
          <stop offset="100%" stopColor="#0a0d0d" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill={`url(#${gradientId})`} />
      <circle cx="60" cy="60" r="54" fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="2" />
      <circle cx="60" cy="60" r="30" fill="#f5f6f3" />
      <circle cx="60" cy="60" r="30" fill="none" stroke="#c2c8c3" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="12" fill="#d6dad7" />
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        // Rounded to 2dp: raw Math.sin/cos output can differ in the last bit
        // between Node's SSR and the browser's V8, which trips React hydration.
        const x1 = Math.round((60 + Math.cos(angle) * 40) * 100) / 100;
        const y1 = Math.round((60 + Math.sin(angle) * 40) * 100) / 100;
        const x2 = Math.round((60 + Math.cos(angle) * 52) * 100) / 100;
        const y2 = Math.round((60 + Math.sin(angle) * 52) * 100) / 100;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#000"
            strokeOpacity="0.4"
            strokeWidth="4"
          />
        );
      })}
    </svg>
  );
}
