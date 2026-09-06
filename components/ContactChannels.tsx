import { business } from "@/lib/config";

/**
 * Renders call/email affordances only when the details are configured.
 * Never shows placeholder contact data.
 */
export function ContactChannels() {
  const hasPhone = Boolean(business.phone);
  const hasEmail = Boolean(business.email);

  return (
    <div className="surface-card p-6">
      <h2 className="display text-[20px]">Contact</h2>
      <address className="mt-3 not-italic text-[14px] text-[var(--color-text-muted)]">
        {business.name}
        <br />
        {business.address.street}
        <br />
        {business.address.suburb} {business.address.state} {business.address.postcode}
      </address>

      <div className="mt-5 flex flex-wrap gap-3">
        {hasPhone && (
          <a href={`tel:${business.phone.replace(/\s/g, "")}`} className="btn btn--red">
            Call now
          </a>
        )}
        {hasEmail && (
          <a href={`mailto:${business.email}`} className="btn btn--outline">
            Email us
          </a>
        )}
        <a href="#enquiry" className="btn btn--green">
          Request a quote
        </a>
      </div>

      {!hasPhone && !hasEmail && (
        <p className="mt-4 text-[13px] text-[var(--color-text-muted)]">
          Phone and email are being finalised — use the enquiry form and we&apos;ll respond
          from there.
        </p>
      )}
    </div>
  );
}
