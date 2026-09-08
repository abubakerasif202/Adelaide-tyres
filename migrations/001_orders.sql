-- Order + Stripe event persistence for Adelaide Wholesale Tyres.
--
-- Correctness properties this schema is designed to provide:
--   * Exactly-once fulfilment per order, even under concurrent or duplicate
--     webhook delivery, using a guarded UPDATE (WHERE status = 'pending' /
--     notify_claimed_at IS NULL) rather than an application-level lock.
--   * Order status is never inferred from a client redirect — only from a
--     row this schema tracks, written by the webhook handler after verifying
--     the event's signature.
--   * stripe_events is an append-only audit trail of every event this app
--     has seen (for support/reconciliation), separate from the correctness
--     guard above.

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  checkout_session_id text not null unique,
  payment_intent_id text unique,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  amount_total_cents integer not null,
  currency text not null,
  customer_email text not null,
  customer_name text not null,
  customer_phone text not null,
  delivery_method text not null,
  delivery_address text not null,
  order_notes text not null default '',
  lines jsonb not null,
  notify_claimed_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_payment_intent_id_idx on orders (payment_intent_id);

create table if not exists stripe_events (
  event_id text primary key,
  event_type text not null,
  checkout_session_id text,
  received_at timestamptz not null default now()
);

create index if not exists stripe_events_checkout_session_id_idx on stripe_events (checkout_session_id);
