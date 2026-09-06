import Link from "next/link";
import { business } from "@/lib/config";
import { catalogueStats } from "@/lib/catalogue";
import { TyreImage } from "./TyreImage";

export function Hero() {
  return (
    <section className="on-dark relative isolate bg-[var(--color-green)] text-white">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        style={{
          background:
            "radial-gradient(1100px 520px at 78% 12%, rgba(255,255,255,0.10), transparent 60%), linear-gradient(160deg, #063b2c 0%, #05271e 62%, #04211a 100%)",
        }}
      />
      <div className="container-x relative grid gap-10 pt-14 pb-24 md:pt-24 md:pb-32 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="eyebrow inline-flex rounded-full bg-white/10 px-3 py-1.5 text-[#bfe8d8]">
            Adelaide&apos;s wholesale tyre store
          </p>
          <h1 className="display mt-5 text-[clamp(44px,7vw,84px)]">
            Buy tyres in bulk.
            <br />
            Pay wholesale.
          </h1>
          <p className="mt-5 max-w-xl text-[17px] text-white/82">
            Minimum order 4 tyres. Free Adelaide-wide delivery. Commercial, truck,
            light-commercial and passenger tyres available from current stock.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/tyres" className="btn btn--red">
              Shop available stock
            </Link>
            <Link href="/contact?type=quote" className="btn btn--outline-light">
              Get a wholesale quote
            </Link>
          </div>
          <p className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-white/75">
            <span className="font-semibold text-white">✓ Free Adelaide-wide delivery</span>
            <span aria-hidden>·</span>
            <span>{business.address.oneLine}</span>
          </p>
        </div>

        <div className="relative">
          <div className="mx-auto flex max-w-sm items-center justify-center rounded-[var(--radius-lg)] bg-white/5 p-10 ring-1 ring-white/10">
            <TyreImage src={null} alt="Wholesale truck tyre" size={260} priority />
          </div>
          <div className="surface-card absolute -bottom-5 left-1/2 -translate-x-1/2 px-5 py-3 text-center text-[var(--color-ink)]">
            <span className="display block text-[26px] leading-none">
              {catalogueStats.unitsListed}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
              units in supplied stock list
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
