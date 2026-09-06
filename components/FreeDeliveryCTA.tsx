import Link from "next/link";
import { business } from "@/lib/config";

export function FreeDeliveryCTA() {
  return (
    <section className="on-dark bg-[var(--color-green-dark)] text-white">
      <div className="container-x grid gap-8 py-14 md:grid-cols-[1.3fr_1fr] md:items-center">
        <div>
          <h2 className="display text-[clamp(30px,5vw,52px)]">
            Free delivery.
            <br />
            Adelaide wide.
          </h2>
          <p className="mt-4 max-w-md text-white/78">
            Order 4 or more tyres and choose free Adelaide-wide delivery at checkout.
          </p>
          <p className="mt-2 text-[14px] font-semibold text-white/70">
            Warehouse / pickup: {business.address.oneLine}
          </p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <Link href="/tyres" className="btn btn--red w-full md:w-auto">
            Start bulk order
          </Link>
          <Link href="/contact" className="btn btn--outline-light w-full md:w-auto">
            Contact wholesale team
          </Link>
        </div>
      </div>
    </section>
  );
}
