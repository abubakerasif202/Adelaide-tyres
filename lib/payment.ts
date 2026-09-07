/**
 * Payment integration boundary.
 *
 * No card details are ever collected or stored by this application. Payment
 * provider configuration must remain inert until its complete server-side
 * payment integration is implemented.
 * The current order-reference checkout takes no charge and exposes no PCI
 * surface.
 */

import { randomUUID } from "node:crypto";
import type { CheckoutDetails } from "./checkout-validation";

export type OrderIntentInput = {
  details: CheckoutDetails;
  lines: {
    id: string;
    brand: string;
    pattern: string;
    size: string;
    quantity: number;
    price: number;
  }[];
  totalTyres: number;
  subtotal: number;
  freeDelivery: boolean;
  deliveryFee: number;
};

export type OrderIntentResult = {
  reference: string;
  mode: "test" | "live";
  requiresPayment: boolean;
  /** Present only in live mode once a provider is wired. */
  clientSecret?: string;
};

export function isPaymentConfigured(): boolean {
  // A secret alone must never switch checkout into an unwired live path.
  return false;
}

export async function createPaymentIntent(
  input: OrderIntentInput,
): Promise<OrderIntentResult> {
  void input; // reserved for the live provider integration below
  const reference = `AWT-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;

  // Order-reference checkout — no charge taken and no card data collected.
  return { reference, mode: "test", requiresPayment: false };
}
