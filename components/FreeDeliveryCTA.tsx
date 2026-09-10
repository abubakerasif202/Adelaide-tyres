import Link from "next/link";
import { business, order } from "@/lib/config";
import { formatCurrency } from "@/lib/format";
import { Reveal } from "./Reveal";

export function FreeDeliveryCTA() {
  return (
    <section id="delivery" className="delivery-cta on-dark relative overflow-hidden text-white">
      <Reveal className="container-x relative py-20 md:py-24">
        <p className="eyebrow text-[#7fd1b3]">Delivery &amp; pickup</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="delivery-tier delivery-tier--primary">
            <span className="delivery-tier__value display">
              {order.delivery.freeQualifyingTyres}+
            </span>
            <span className="delivery-tier__label">tyres → FREE Adelaide-wide</span>
          </div>
          <div className="delivery-tier">
            <span className="delivery-tier__value display">
              1–{order.delivery.freeQualifyingTyres - 1}
            </span>
            <span className="delivery-tier__label">tyres → {formatCurrency(order.delivery.feeAud)} delivery</span>
          </div>
          <div className="delivery-tier">
            <span className="delivery-tier__value display">Pickup</span>
            <span className="delivery-tier__label">Warehouse collection → FREE</span>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-8 border-t border-white/14 pt-8">
          <div>
            <h2 className="display text-[clamp(30px,4.4vw,48px)]">
              Free delivery on {order.delivery.freeQualifyingTyres}+ tyres. Adelaide wide.
            </h2>
            <p className="mt-3 text-[14px] font-semibold text-white/68">
              Warehouse / pickup: {business.address.oneLine}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/tyres" className="btn btn--red">
              Start bulk order
            </Link>
            <Link href="/contact" className="btn btn--outline-light">
              Contact wholesale team
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
