import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_CHECKOUT_DETAILS,
  hasErrors,
  normalisePhone,
  validateCheckoutDetails,
} from "../../lib/checkout-validation.ts";

const valid = {
  name: "Northline Transport",
  phone: "0412 345 678",
  email: "orders@northline.com.au",
  suburb: "Wingfield",
  postcode: "5013",
  address: "12 Cormack Rd, Wingfield SA 5013",
  abn: "",
  notes: "",
  deliveryMethod: "delivery",
};

test("a complete delivery order passes validation", () => {
  assert.equal(hasErrors(validateCheckoutDetails(valid)), false);
});

test("empty details fail on the required fields", () => {
  const errors = validateCheckoutDetails(EMPTY_CHECKOUT_DETAILS);
  assert.ok(errors.name && errors.phone && errors.email);
});

test("invalid email is rejected", () => {
  assert.ok(validateCheckoutDetails({ ...valid, email: "not-an-email" }).email);
});

test("postcode must be four digits", () => {
  assert.ok(validateCheckoutDetails({ ...valid, postcode: "50" }).postcode);
  assert.ok(validateCheckoutDetails({ ...valid, postcode: "50133" }).postcode);
});

test("pickup orders skip the address fields", () => {
  const pickup = { ...EMPTY_CHECKOUT_DETAILS, deliveryMethod: "pickup", name: "Ada", phone: "0812345678", email: "a@b.com" };
  const errors = validateCheckoutDetails(pickup);
  assert.equal(errors.address, undefined);
  assert.equal(errors.postcode, undefined);
  assert.equal(hasErrors(errors), false);
});

test("ABN is optional but must be 11 digits when present", () => {
  assert.equal(validateCheckoutDetails({ ...valid, abn: "" }).abn, undefined);
  assert.ok(validateCheckoutDetails({ ...valid, abn: "123" }).abn);
  assert.equal(validateCheckoutDetails({ ...valid, abn: "51824753556" }).abn, undefined);
});

test("normalisePhone strips spaces, brackets and dashes", () => {
  assert.equal(normalisePhone("(08) 8241-1234"), "0882411234");
  assert.equal(normalisePhone("+61 412 345 678"), "61412345678");
});
