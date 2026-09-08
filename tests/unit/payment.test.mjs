import { test } from "node:test";
import assert from "node:assert/strict";
import { createCheckoutSession, createPaymentIntent, isPaymentConfigured } from "../../lib/payment.ts";

const STRIPE_VARS = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "DATABASE_URL"];

function withEnv(overrides, fn) {
  const previous = Object.fromEntries(STRIPE_VARS.map((k) => [k, process.env[k]]));
  for (const key of STRIPE_VARS) delete process.env[key];
  for (const [key, value] of Object.entries(overrides)) process.env[key] = value;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of STRIPE_VARS) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    });
}

test("isPaymentConfigured requires the Stripe secret, webhook secret, AND a durable order store", async () => {
  await withEnv({}, () => {
    assert.equal(isPaymentConfigured(), false);
  });
  // Each piece alone must not be sufficient — a secret key alone must never
  // switch checkout into a live path with no way to safely fulfil orders.
  await withEnv({ STRIPE_SECRET_KEY: "sk_test_placeholder" }, () => {
    assert.equal(isPaymentConfigured(), false);
  });
  await withEnv({ STRIPE_SECRET_KEY: "sk_test_placeholder", STRIPE_WEBHOOK_SECRET: "whsec_placeholder" }, () => {
    assert.equal(isPaymentConfigured(), false);
  });
  await withEnv({ STRIPE_SECRET_KEY: "sk_test_placeholder", DATABASE_URL: "postgres://placeholder" }, () => {
    assert.equal(isPaymentConfigured(), false);
  });
  await withEnv(
    { STRIPE_SECRET_KEY: "sk_test_placeholder", STRIPE_WEBHOOK_SECRET: "whsec_placeholder", DATABASE_URL: "postgres://placeholder" },
    () => {
      assert.equal(isPaymentConfigured(), true);
    },
  );
});

test("the order-reference (invoice) flow never charges, regardless of Stripe config", async () => {
  await withEnv(
    { STRIPE_SECRET_KEY: "sk_test_placeholder", STRIPE_WEBHOOK_SECRET: "whsec_placeholder", DATABASE_URL: "postgres://placeholder" },
    async () => {
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
    },
  );
});

test("createCheckoutSession refuses to run unless fully configured", async () => {
  await withEnv({ STRIPE_SECRET_KEY: "sk_test_placeholder" }, () =>
    assert.rejects(
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
      /not fully configured/,
    ),
  );
});
