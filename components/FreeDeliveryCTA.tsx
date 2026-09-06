import Link from "next/link";
import { business, order } from "@/lib/config";
import { formatCurrency } from "@/lib/format";

export function FreeDeliveryCTA() {
  return (
    <section className="on-dark bg-[var(--color-green-dark)] text-white">
      <div className="container-x grid gap-8 py-14 md:grid-cols-[1.3fr_1fr] md:items-center">
        <div>
          <h2 className="display text-[clamp(30px,5vw,52px)]">
            No minimum order.
            <br />
            Adelaide wide.
          </h2>
          <p className="mt-4 max-w-md text-white/78">
            {formatCurrency(order.delivery.feeAud)} Adelaide-wide delivery for 1–
            {order.delivery.freeQualifyingTyres - 1} tyres, free from {order.delivery.freeQualifyingTyres}{" "}
            tyres up.
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
