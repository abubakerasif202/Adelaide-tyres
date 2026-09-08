import { test } from "node:test";
import assert from "node:assert/strict";
import { createCheckoutSession, createPaymentIntent, isPaymentConfigured } from "../../lib/payment.ts";

test("isPaymentConfigured reflects whether a Stripe secret key is present", () => {
  const previous = process.env.STRIPE_SECRET_KEY;
  try {
    delete process.env.STRIPE_SECRET_KEY;
    assert.equal(isPaymentConfigured(), false);
    process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
    assert.equal(isPaymentConfigured(), true);
  } finally {
    if (previous === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previous;
  }
});

test("the order-reference (invoice) flow never charges, regardless of Stripe config", async () => {
  const previous = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
  try {
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

test("createCheckoutSession refuses to run without a Stripe secret key", async () => {
  const previous = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  try {
    await assert.rejects(
      createCheckoutSession({
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
      }),
      /not configured/,
    );
  } finally {
    if (previous === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previous;
  }
});
