import Link from "next/link";
import { business, order } from "@/lib/config";
import { formatCurrency } from "@/lib/format";
import { Reveal } from "./Reveal";

export function FreeDeliveryCTA() {
  return (
    <section id="delivery" className="delivery-cta on-dark relative overflow-hidden text-white">
      <Reveal className="container-x grid gap-8 py-16 md:grid-cols-[1.3fr_1fr] md:items-center">
        <div>
          <h2 className="display text-[clamp(30px,5vw,52px)]">
            Free delivery on 8+ tyres.
            <br />
            Adelaide wide.
          </h2>
          <p className="mt-4 max-w-md text-white/78">
            Order any quantity. {formatCurrency(order.delivery.feeAud)} Adelaide-wide delivery for 1–
            {order.delivery.freeQualifyingTyres - 1} tyres.
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
      </Reveal>
    </section>
  );
}
