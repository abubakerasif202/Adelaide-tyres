import type { DeliveryMethod } from "./cart";

export type CheckoutDetails = {
  name: string;
  phone: string;
  email: string;
  suburb: string;
  postcode: string;
  address: string;
  abn?: string;
  notes?: string;
  deliveryMethod: DeliveryMethod;
};

export type CheckoutErrors = Partial<Record<keyof CheckoutDetails, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Australian phone: 8-15 digits after stripping spaces, brackets, dashes, +.
const PHONE_RE = /^[0-9]{8,15}$/;
const POSTCODE_RE = /^[0-9]{4}$/;
// ABN: 11 digits.
const ABN_RE = /^[0-9]{11}$/;

export function normalisePhone(value: string): string {
  return value.replace(/[\s()+-]/g, "");
}

export function validateCheckoutDetails(details: CheckoutDetails): CheckoutErrors {
  const errors: CheckoutErrors = {};

  if (!details.name.trim() || details.name.trim().length < 2) {
    errors.name = "Enter a business or contact name.";
  }
  if (!PHONE_RE.test(normalisePhone(details.phone))) {
    errors.phone = "Enter a valid contact phone number.";
  }
  if (!EMAIL_RE.test(details.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (details.deliveryMethod === "delivery") {
    if (!details.suburb.trim()) {
      errors.suburb = "Enter the delivery suburb.";
    }
    if (!POSTCODE_RE.test(details.postcode.trim())) {
      errors.postcode = "Enter a 4-digit postcode.";
    }
    if (!details.address.trim() || details.address.trim().length < 6) {
      errors.address = "Enter the full delivery address.";
    }
  }

  if (details.abn && details.abn.trim() && !ABN_RE.test(details.abn.replace(/\s/g, ""))) {
    errors.abn = "ABN must be 11 digits, or leave it blank.";
  }

  if (details.notes && details.notes.length > 1000) {
    errors.notes = "Order notes are too long.";
  }

  return errors;
}

export function hasErrors(errors: CheckoutErrors): boolean {
  return Object.keys(errors).length > 0;
}

export const EMPTY_CHECKOUT_DETAILS: CheckoutDetails = {
  name: "",
  phone: "",
  email: "",
  suburb: "",
  postcode: "",
  address: "",
  abn: "",
  notes: "",
  deliveryMethod: "delivery",
};
