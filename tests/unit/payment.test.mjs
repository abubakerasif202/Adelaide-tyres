import { test } from "node:test";
import assert from "node:assert/strict";
import { createPaymentIntent, isPaymentConfigured } from "../../lib/payment.ts";

test("an unused Stripe secret cannot enable the unwired live path", async () => {
  const previous = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "test-placeholder";
  try {
    assert.equal(isPaymentConfigured(), false);
    const result = await createPaymentIntent({
      details: {
        name: "Test business",
        phone: "0400000000",
        email: "test@example.invalid",
        suburb: "",
        postcode: "",
        address: "",
        deliveryMethod: "pickup",
      },
      lines: [],
      totalTyres: 0,
      subtotal: 0,
      freeDelivery: true,
      deliveryFee: 0,
    });
    assert.equal(result.mode, "test");
    assert.equal(result.requiresPayment, false);
  } finally {
    if (previous === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previous;
  }
});
