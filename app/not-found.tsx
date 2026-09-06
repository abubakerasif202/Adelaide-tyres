import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-[var(--color-surface-muted)]">
      <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <span className="pill pill--muted">404</span>
        <h1 className="display mt-4 text-[clamp(32px,6vw,56px)]">Page not found</h1>
        <p className="mt-3 max-w-md text-[var(--color-text-muted)]">
          That page has moved or never existed. Head back to current stock or get in
          touch with the wholesale team.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/tyres" className="btn btn--green">
            Shop available stock
          </Link>
          <Link href="/contact" className="btn btn--outline">
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
