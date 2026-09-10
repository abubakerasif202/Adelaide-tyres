import Link from "next/link";
import { business, order } from "@/lib/config";
import { deliveryRuleSummary, formatCurrency } from "@/lib/format";
import { Reveal } from "./Reveal";

export function FreeDeliveryCTA() {
  return (
    <>
    <section id="delivery" className="homepage-delivery">
      <Reveal className="homepage-container grid items-stretch gap-8 py-[72px] lg:grid-cols-12">
        <div className="delivery-facility-card lg:col-span-5">
          <p className="eyebrow text-[var(--color-green)]">Central depot distribution</p>
          <h2 className="display mt-1 text-[28px] text-[var(--color-green-deep)]">Regency Park facility</h2>
          <p className="mt-2 text-[13px] font-semibold text-[var(--color-text-muted)]">{deliveryRuleSummary("card")}</p>
          <dl className="delivery-facts">
            <div><dt>Physical warehouse</dt><dd>{business.address.oneLine}, {business.address.country}</dd></div>
            <div><dt>Adelaide-wide delivery</dt><dd>1–{order.delivery.freeQualifyingTyres - 1} tyres: {formatCurrency(order.delivery.feeAud)}</dd></div>
            <div><dt>Wholesale delivery tier</dt><dd>{order.delivery.freeQualifyingTyres}+ tyres: free</dd></div>
            <div><dt>Warehouse collection</dt><dd>Free pickup</dd></div>
          </dl>
          <Link href="/delivery" className="btn btn--green mt-8">View delivery details</Link>
          <h2 className="sr-only">Free delivery on {order.delivery.freeQualifyingTyres}+ tyres.</h2>
        </div>
        <div className="delivery-zone-panel lg:col-span-7">
          <div className="delivery-zone-panel__head"><span>Regency Park central delivery hub</span><span>Adelaide-wide</span></div>
          <div className="delivery-zone-panel__map" aria-label="Adelaide delivery tiers centred on the Regency Park warehouse">
            <span className="delivery-zone delivery-zone--outer"/><span className="delivery-zone delivery-zone--middle"/><span className="delivery-zone delivery-zone--inner"/>
            <div className="delivery-zone-panel__hub"><strong>Regency Park</strong><span>4 Birralee Rd · SA 5010</span></div>
          </div>
          <div className="delivery-zone-panel__tiers"><span>1–{order.delivery.freeQualifyingTyres - 1} tyres<br/><strong>{formatCurrency(order.delivery.feeAud)}</strong></span><span>{order.delivery.freeQualifyingTyres}+ tyres<br/><strong>Free delivery</strong></span><span>Warehouse pickup<br/><strong>Free</strong></span></div>
        </div>
      </Reveal>
    </section>
    <section className="homepage-final-cta on-dark">
      <div className="homepage-container flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center">
          <div>
            <p className="eyebrow text-[#7fd1b3]">Immediate commercial supply</p>
            <h2 className="display mt-1 text-[28px]">Find the right tyres for your next order.</h2>
            <p className="mt-1 text-[14px] text-white/70">Order from verified catalogue stock or request a wholesale quote.</p>
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
    </section>
    </>
  );
}
