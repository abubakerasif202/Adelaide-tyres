import Link from "next/link";
import { business } from "@/lib/config";
import { catalogueStats } from "@/lib/catalogue";
import { HeroArtwork } from "./HeroArtwork";

export function Hero() {
  return (
    <section className="hero on-dark relative isolate overflow-hidden bg-[var(--color-green)] text-white">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        style={{
          background:
            "radial-gradient(1100px 520px at 78% 12%, rgba(255,255,255,0.10), transparent 60%), linear-gradient(160deg, #063b2c 0%, #05271e 62%, #04211a 100%)",
        }}
      />
      <div className="container-x relative grid gap-12 pb-28 pt-14 md:pb-32 md:pt-22 lg:min-h-[650px] lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div className="relative z-10">
          <p className="hero__eyebrow eyebrow inline-flex rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[#bfe8d8]">
            Adelaide&apos;s wholesale tyre store
          </p>
          <h1 className="hero__title display mt-5 max-w-[820px] text-[clamp(48px,7vw,88px)]">
            Buy tyres in bulk.
            <br />
            Pay <span className="text-[#7fd1b3]">wholesale.</span>
          </h1>
          <p className="hero__copy mt-5 max-w-xl text-[17px] leading-relaxed text-white/82 md:text-[18px]">
            No minimum order. $50 Adelaide-wide delivery for 1–7 tyres. Free Adelaide-wide delivery from 8 tyres. Commercial truck
            tyres listed online for Adelaide workshops, fleets and transport operators.
          </p>
          <div className="hero__actions mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/tyres" className="btn btn--red">
              Shop available stock
            </Link>
            <Link href="/contact?type=quote" className="btn btn--outline-light">
              Get a wholesale quote
            </Link>
          </div>
          <p className="hero__meta mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-white/75">
            <span className="font-semibold text-white">✓ No minimum order</span>
            <span aria-hidden>·</span>
            <span>{business.address.oneLine}</span>
          </p>
        </div>

        <HeroArtwork units={catalogueStats.unitsListed} skuLines={catalogueStats.skuLines} />
      </div>
    </section>
  );
}
