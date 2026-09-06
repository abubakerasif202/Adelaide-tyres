"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-[var(--color-surface-muted)]">
      <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <span className="pill pill--red">Something broke</span>
        <h1 className="display mt-4 text-[clamp(30px,5vw,48px)]">This page hit an error</h1>
        <p className="mt-3 max-w-md text-[var(--color-text-muted)]">
          Try again in a moment. If it keeps happening, contact the wholesale team and
          we&apos;ll take your order directly.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn--green">
            Try again
          </button>
          <Link href="/" className="btn btn--outline">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
