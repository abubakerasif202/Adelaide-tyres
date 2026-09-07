"use client";

import { useState } from "react";
import { FormField } from "./FormField";

type Variant = "contact" | "quote";

const HEADINGS: Record<Variant, { submit: string; success: string }> = {
  contact: { submit: "Send enquiry", success: "Thanks — we'll be in touch shortly." },
  quote: { submit: "Request wholesale pricing", success: "Quote request received. We'll respond with pricing." },
};

export function EnquiryForm({ variant = "contact" }: { variant?: Variant }) {
  const [startedAt] = useState(() => Date.now());
  const [values, setValues] = useState({
    name: "",
    business: "",
    phone: "",
    email: "",
    product: "",
    quantity: "",
    message: "",
  });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const set = (k: keyof typeof values, v: string) => setValues((s) => ({ ...s, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setFormError(null);
    setErrors({});
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          type: variant,
          consent,
          company_website: "",
          startedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        setFormError(data.error ?? "Please check the form and try again.");
        setStatus("error");
        return;
      }
      if (data.delivered !== true) {
        setFormError("Your enquiry could not be delivered. Please try again later. Your details are still here.");
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setFormError("Network error. Please try again, or call us directly.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="surface-card p-8 text-center" role="status">
        <span className="pill pill--green">Received</span>
        <p className="mt-4 text-[16px] font-semibold">{HEADINGS[variant].success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface-card grid gap-4 p-6 sm:grid-cols-2" noValidate>
      <FormField label="Name" name="name" value={values.name} onChange={(v) => set("name", v)} required error={errors.name} autoComplete="name" />
      <FormField label="Business" name="business" value={values.business} onChange={(v) => set("business", v)} optional autoComplete="organization" />
      <FormField label="Phone" name="phone" value={values.phone} onChange={(v) => set("phone", v)} optional inputMode="tel" autoComplete="tel" />
      <FormField label="Email" name="email" type="email" value={values.email} onChange={(v) => set("email", v)} required error={errors.email} inputMode="email" autoComplete="email" />
      <FormField label="Tyre size / product" name="product" value={values.product} onChange={(v) => set("product", v)} placeholder="e.g. 11R22.5 drive" optional />
      <FormField label="Quantity" name="quantity" value={values.quantity} onChange={(v) => set("quantity", v)} placeholder="e.g. 20" optional inputMode="numeric" />
      <div className="sm:col-span-2">
        <FormField label="Message" name="message" value={values.message} onChange={(v) => set("message", v)} textarea error={errors.message} />
      </div>

      {/* Honeypot */}
      <div aria-hidden className="hidden">
        <label>
          Company website
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="sm:col-span-2 flex items-start gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
          aria-invalid={errors.consent ? true : undefined}
        />
        <span>
          I agree to Adelaide Wholesale Tyres contacting me about this enquiry.
          {errors.consent && <span className="field-error"> {errors.consent}</span>}
        </span>
      </label>

      {formError && (
        <p className="sm:col-span-2 field-error" role="alert">
          {formError}
        </p>
      )}

      <div className="sm:col-span-2">
        <button type="submit" className="btn btn--red w-full sm:w-auto" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : HEADINGS[variant].submit}
        </button>
      </div>
    </form>
  );
}
