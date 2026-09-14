import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import type { Tyre } from "@/lib/catalogue";

type HeroTyre = Pick<Tyre, "slug" | "brand" | "pattern" | "size" | "price">;

/**
 * Greforce G-PILOT X1 295/80R22.5 — the genuine supplier product shot
 * (docs/image-audit.md), cut out onto transparency and cropped to the tyre so
 * the bay can light it. 560x816 is the trimmed source; the declared size is
 * what holds CLS at zero, so update it if the asset changes.
 */
const HERO_TYRE_IMAGE = {
  src: "/images/hero/greforce-g-pilot-x1-cutout.webp",
  width: 560,
  height: 816,
} as const;

export function HeroArtwork({ tyre }: { tyre: HeroTyre }) {
  const name = `${tyre.brand} ${tyre.pattern} ${tyre.size}`;

  return (
    <div className="hero__visual">
      <Link href={`/tyres/${tyre.slug}`} className="hero__bay group" aria-label={`${name} — view wholesale price`}>
        <span className="hero__bay-seam" aria-hidden />
        <span className="hero__bay-light" aria-hidden />

        <span className="hero__bay-tag">Featured stock</span>

        <div className="hero__bay-stage">
          <Image
            src={HERO_TYRE_IMAGE.src}
            alt={`${name} commercial steer tyre`}
            width={HERO_TYRE_IMAGE.width}
            height={HERO_TYRE_IMAGE.height}
            loading="eager"
            fetchPriority="high"
            sizes="(max-width: 639px) 46vw, (max-width: 1023px) 34vw, 300px"
            className="hero__bay-tyre"
          />
          <span className="hero__bay-floor" aria-hidden />
        </div>

        <div className="hero__bay-footer">
          <span className="hero__bay-name">{name}</span>
          <span className="hero__bay-price">
            {formatCurrency(tyre.price)} <span className="hero__bay-price-note">ea</span>
          </span>
        </div>
      </Link>
    </div>
  );
}
