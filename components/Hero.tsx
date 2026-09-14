import Link from "next/link";
import { getTyreBySlug } from "@/lib/catalogue";
import { HeroArtwork } from "./HeroArtwork";

/** The one product the hero bay features. A real, verified catalogue SKU. */
export const HERO_TYRE_SLUG = "greforce-g-pilot-x1-295-80r22-5";

/**
 * Category strip. Only `truck` and `commercial` are published catalogue
 * applications (see the footer test), so the other two are plain labels
 * rather than links that would land on an empty listing.
 */
const CATEGORIES = [
  { label: "Truck", href: "/tyres?application=truck" },
  { label: "Commercial", href: "/tyres?application=commercial" },
  { label: "4WD" },
  { label: "Passenger" },
] as const satisfies readonly { label: string; href?: string }[];

export function Hero() {
  const tyre = getTyreBySlug(HERO_TYRE_SLUG);

  return (
    <section className="hero on-dark relative isolate overflow-hidden text-white" aria-labelledby="hero-heading">
      <div className="hero__wash pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <div className="homepage-container hero__grid">
        <div className="hero__content">
          <p className="hero__eyebrow">
            <span className="hero__eyebrow-mark" aria-hidden />
            Wholesale tyres · Adelaide
          </p>

          <h1 id="hero-heading" className="hero__title display">
            Tyres at{" "}
            <br />
            <span className="hero__title-accent">wholesale prices.</span>
          </h1>

          <p className="hero__copy">
            Truck, commercial, 4WD and passenger tyres direct from our Adelaide warehouse.
          </p>

          <div className="hero__actions">
            <Link href="/tyres" className="btn hero__cta hero__cta--primary group">
              <span>View tyres</span>
              <span className="hero__cta-arrow" aria-hidden="true">→</span>
            </Link>
            <Link href="/contact?type=quote" className="btn hero__cta hero__cta--secondary">
              Get a quote
            </Link>
          </div>
        </div>

        {tyre && <HeroArtwork tyre={tyre} />}
      </div>

      <nav className="hero__strip" aria-label="Tyre categories">
        <ul className="homepage-container hero__strip-list">
          {CATEGORIES.map((category) => (
            <li key={category.label} className="hero__strip-item">
              {"href" in category ? (
                <Link href={category.href} className="hero__strip-link">
                  {category.label}
                </Link>
              ) : (
                <span className="hero__strip-label">{category.label}</span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
